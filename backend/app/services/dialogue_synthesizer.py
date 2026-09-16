from app.services.provider_health import record, ProviderUnavailable, failure_reason
from app.services.planner import is_emergency_contact_lookup
"""
ORCA Marine AI - Conversational Dialogue & Dynamic Reasoning Synthesizer.
Generates context-aware, explainable, and multi-turn marine safety responses
grounded in live INCOIS oceanographic telemetry, safety risks, and Bhashini multilingual services.
"""
import os
import json
import re
import logging
import time
import threading
from typing import Any, Dict, List, Optional
from app.models.agent_models import EvidenceBundle, OperationalRecommendation

logger = logging.getLogger(__name__)

_model_cooldowns = {}
_model_lock = threading.Lock()

class SynthesisText(str):
    def __new__(cls, text, model, fallback_used):
        value = super().__new__(cls, text)
        value.model = model
        value.fallback_used = fallback_used
        return value


# Compass directions in 11 languages
COMPASS_NAMES = {
    "en": ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"],
    "hi": ["उत्तर", "उत्तर-पूर्व", "पूर्व", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"],
    "gu": ["ઉત્તર", "ઉત્તર-પૂર્વ", "પૂર્વ", "દક્ષિણ-પૂર્વ", "દક્ષિણ", "દક્ષિણ-પશ્ચિમ", "પશ્ચિમ", "ઉત્તર-પશ્ચિમ"],
    "mr": ["उत्तर", "ईशान्य", "पूर्व", "आग्नेय", "दक्षिण", "नैऋत्य", "पश्चिम", "वायव्य"],
    "ta": ["வடக்கு", "வடகிழக்கு", "கிழக்கு", "தென்கிழக்கு", "தெற்கு", "தென்மேற்கு", "மேற்கு", "வடமேற்கு"],
    "te": ["ఉత్తరం", "ఈశాన్యం", "తూర్పు", "ఆగ్నేయం", "దక్షిణం", "నైరుతి", "పడమర", "వాయువ్యం"],
    "ml": ["വടക്ക്", "വടക്കുകിഴക്ക്", "കിഴക്ക്", "തെക്കുകിഴക്ക്", "തെക്ക്", "തെക്കുപടിഞ്ഞാറ്", "പടിഞ്ഞാറ്", "വടക്കുപടിഞ്ഞാറ്"],
    "bn": ["উত্তর", "উত্তর-পূর্ব", "পূর্ব", "দক্ষিণ-পূর্ব", "দক্ষিণ", "দক্ষিণ-পশ্চিম", "পশ্চিম", "উত্তর-পশ্চিম"],
    "kn": ["ಉತ್ತರ", "ಈಶಾನ್ಯ", "ಪೂರ್ವ", "ಆಗ್ನೇಯ", "ದಕ್ಷಿಣ", "ನೈಋತ್ಯ", "ಪಶ್ಚಿಮ", "ವಾಯುವ್ಯ"],
    "or": ["ଉତ୍ତର", "ଉତ୍ତର-ପୂର୍ବ", "ପୂର୍ବ", "ଦକ୍ଷିଣ-ପୂର୍ବ", "ଦକ୍ଷିଣ", "ଦକ୍ଷିଣ-ପଶ୍ଚିମ", "ପଶ୍ଚିମ", "ଉତ୍ତର-ପଶ୍ଚିମ"],
    "pa": ["ਉੱਤਰ", "ਉੱਤਰ-ਪੂਰਬ", "ਪੂਰਬ", "ਦੱਖਣ-ਪੂਰਬ", "ਦੱਖਣ", "ਦੱਖਣ-ਪੱਛਮ", "ਪੱਛਮ", "ਉੱਤਰ-ਪੱਛਮ"],
}

def get_compass_cardinal(deg: Optional[float], lang: str = "en") -> str:
    if deg is None:
        return "variable direction"
    idx = int((((deg % 360) + 22.5) % 360) // 45)
    names = COMPASS_NAMES.get(lang, COMPASS_NAMES["en"])
    return names[idx % 8]


class DialogueSynthesizer:
    """
    Intelligent conversational synthesis engine for ORCA Marine AI.
    Combines live multi-agent evidence with Google Gemini / Bhashini / Rule-Based Maritime reasoning.
    """

    @classmethod
    def synthesize_response(
        cls,
        user_query: str,
        english_query: str,
        detected_intent: str,
        evidence: EvidenceBundle,
        location_title: str,
        target_lang: str = "en",
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Synthesizes a detailed, natural, explainable conversational response.
        """
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            llm_reply = cls._synthesize_with_gemini(
                user_query=user_query,
                english_query=english_query,
                detected_intent=detected_intent,
                evidence=evidence,
                location_title=location_title,
                target_lang=target_lang,
                history=history,
                api_key=gemini_key,
            )
            if llm_reply:
                return llm_reply

        if not gemini_key:
            record("gemini", success=False, reason="NOT_CONFIGURED")
        raise ProviderUnavailable("NOT_CONFIGURED" if not gemini_key else "EMPTY_RESPONSE")

    @classmethod
    def _synthesize_with_gemini(
        cls,
        user_query: str,
        english_query: str,
        detected_intent: str,
        evidence: EvidenceBundle,
        location_title: str,
        target_lang: str,
        history: Optional[List[Dict[str, str]]],
        api_key: str,
    ) -> Optional[str]:
        """Calls Google Gemini model to produce natural conversational response."""
        w = evidence.weather
        r = evidence.risk
        pfz = evidence.pfz_zones
        tide = evidence.tide
        alerts = evidence.alerts
        boundary = evidence.boundary
        recs = evidence.recommendations or []

        weather_summary = w.model_dump_json(exclude_none=True) if w else "Unavailable"
        if evidence.marine_snapshot:
            # Do not expose the legacy WeatherEvidence aliases alongside the
            # canonical field names: the model otherwise cites the wrong schema.
            weather_summary = json.dumps(evidence.marine_snapshot["weather"], ensure_ascii=False)

        risk_summary = f"Level: {r.level.upper()}, Reason: {r.reason}" if r else "Not evaluated"
        tide_summary = f"High Tide: {tide.high_tide_time} ({tide.high_tide_height_m}m), Low Tide: {tide.low_tide_time} ({tide.low_tide_height_m}m)" if tide else "Unavailable; no authoritative tide feed is configured"
        pfz_summary = ", ".join([f"{z.name} ({z.distance_km}km, species: {', '.join(z.species[:2])})" for z in pfz[:2]]) if pfz else "Unavailable: no current verified PFZ feed. Do not infer that no advisories exist."
        alerts_summary = "; ".join([f"{a.title}: {a.message}" for a in alerts[:2]]) if alerts else "No verified alert evidence supplied. Do not infer absence of hazards."
        boundary_summary = boundary.model_dump_json() if boundary else "Unavailable"
        recs_summary = "; ".join([f"{rec.title}: {rec.directive}" for rec in recs[:2]]) if recs else "Maintain standard VHF Ch 16 watch and carry certified life jackets."
        if evidence.marine_snapshot:
            recs_summary = "Maintain VHF [[radio.distress_channel]] watch and carry certified life jackets."

        history_text = ""
        if history:
            turns = []
            for h in history[-6:]:
                role = "User" if h.get("role") == "user" else "Assistant"
                turns.append(f"{role}: {h.get('text', '')}")
            history_text = "\n".join(turns)

        system_instruction = f"""You are ORCA Marine AI, a prototype marine decision-support assistant for coastal fishermen, vessel operators, and maritime agencies.
Your goal is to provide intelligent, genuine, natural, and helpful advice grounded in the supplied evidence and its actual source.

CURRENT LOCATION: {location_title}
CURRENT DATE: {evidence.date}
AVAILABLE EVIDENCE (may be cached or unavailable):
- Weather & Sea State: {weather_summary}
- Navigational Risk: {risk_summary}
- Tidal Conditions: {tide_summary}
- Potential Fishing Zones (PFZ): {pfz_summary}
- Maritime Boundary: {boundary_summary}
- Active Alerts: {alerts_summary}
- Operational Directives: {recs_summary}

LANGUAGE REQUIREMENT:
- Target Language: {target_lang} (e.g. en = English, gu = Gujarati, hi = Hindi, mr = Marathi, ta = Tamil, te = Telugu, ml = Malayalam, bn = Bengali, kn = Kannada, or = Odia, pa = Punjabi).
- Always respond completely and naturally in the target language. Preserve native script (Devanagari for Hindi/Marathi, Gujarati script, etc.). Do not mix Latin characters for Indian responses unless technical terms are required.

CONVERSATION GUIDELINES:
1. Ground local claims on the supplied evidence. Do NOT invent numbers or quantitative benefit claims. Missing evidence means unavailable, never safe, zero, or no active advisories. Identify forecast or cached data as such.
2. For safety/sailing inquiries ("Is it safe to fish?", "Can I go out?"): Explain overall safety, wave heights, wind strength & direction, visibility, small boat vs large boat considerations, and safety gear requirements.
3. For follow-up questions ("Is that dangerous?", "Why?"): Understand the context of previous conversation turns smoothly.
4. For definitions ("What does PFZ mean?", "What is IMBL/SST?"): Explain clearly in accessible terms and why it matters to fishermen.
5. For emergency/engine failure: Give practical distress steps (drop anchor, VHF Ch 16 Pan-Pan/Mayday, DAT-SG beacon, Coast Guard 1554 / Coastal Police 1093).
6. Answer the exact question first. For a contact-number lookup, give only the requested numbers and their labels, in at most 50 words. Do not add a distress procedure unless asked. For other questions, use short paragraphs and concise bullets as needed.
7. The current target language overrides the language of previous conversation turns."""

        if evidence.marine_snapshot:
            prompt_snapshot = {**evidence.marine_snapshot, "boundary": {k:v for k,v in evidence.marine_snapshot["boundary"].items() if k != "geometry"}}
            system_instruction += "\nCANONICAL MARINE SNAPSHOT (sole authority for environmental facts):\n" + json.dumps(prompt_snapshot, ensure_ascii=False)
            system_instruction += """
Use only this snapshot for local conditions. Ignore measurements in user text and
history when stating current facts. The risk.level verdict is deterministic and
must not be upgraded to safe or a departure clearance. Explain missing coverage.
For every numerical environmental measurement, emit a reference token instead of
writing digits, e.g. [[weather.wave_height_m]] m or [[ocean.sst_c]] °C.
Only reference non-null numeric fields. Do not write other digits, numbered lists,
coordinates, invented dates or ranges. The application renders the exact values
and source times. For emergency contacts use [[contacts.emergency]],
[[contacts.coast_guard]], [[contacts.coastal_police]], or VHF [[radio.distress_channel]].
Do not claim live sensor readings, satellite rasters, rescue dispatch or verified
PFZ availability when the snapshot does not support them.
"""

        prompt = f"""Conversation History:
{history_text if history_text else "None (New conversation)"}

User's Latest Query: {user_query} (English interpretation: {english_query})

Generate the complete, natural response in language '{target_lang}':"""

        api_key = api_key.strip()
        try:
            from google import genai
            client = genai.Client(api_key=api_key, http_options={"timeout": 20000})
            preferred_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
            candidate_models = [preferred_model, *os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash-lite").split(",")]
            seen_models = set()
            models_to_try = []
            for m in candidate_models:
                m = m.strip()
                if m and m not in seen_models:
                    seen_models.add(m)
                    models_to_try.append(m)

            last_err = None
            for model_name in models_to_try:
                with _model_lock:
                    cooling = _model_cooldowns.get(model_name, 0) > time.monotonic()
                if cooling:
                    continue
                try:
                    config = {"system_instruction": system_instruction, "automatic_function_calling": {"disable": True}}
                    if "3.7" in model_name and is_emergency_contact_lookup(english_query):
                        config["thinking_config"] = {"thinking_level": "low"}
                    response = client.models.generate_content(
                        model=model_name, contents=prompt, config=config,
                    )
                    text = (response.text or "").strip()
                    if text:
                        if evidence.marine_snapshot:
                            try:
                                text = cls._resolve_measurements(text, evidence.marine_snapshot)
                            except ProviderUnavailable:
                                # One bounded regeneration with explicit schema
                                # feedback. Never show the invalid draft or replace
                                # it with a scripted answer.
                                logger.warning("Gemini response rejected category=EVIDENCE_VALIDATION_FAILED model=%s; regenerating once", model_name)
                                allowed = [f"[[{section}.{field}]]" for section in ("weather", "ocean")
                                           for field, value in evidence.marine_snapshot[section].items()
                                           if isinstance(value, (int, float)) and not isinstance(value, bool)]
                                correction = ("\nYour previous draft failed the application's evidence validator. Generate a new concise answer. "
                                    "Do not write ANY digits, dates, coordinates, source model identifiers, or numbered lists. "
                                    "For environmental measurements use ONLY these exact tokens: " + ", ".join(allowed) +
                                    ". Missing fields must be described as unavailable. Use [[radio.distress_channel]] for VHF, "
                                    "and [[contacts.emergency]] or [[contacts.coast_guard]] for emergency numbers. "
                                    "Do not use other reference tokens. Keep the required response language.")
                                repaired = client.models.generate_content(model=model_name, contents=prompt + correction, config=config)
                                text = cls._resolve_measurements((repaired.text or "").strip(), evidence.marine_snapshot)
                                if not text:
                                    raise ProviderUnavailable("EMPTY_RESPONSE")
                        fallback = model_name != preferred_model
                        record("gemini", success=True, http_status=200, model=model_name, mode="fallback" if fallback else "live")
                        return SynthesisText(text, model_name, fallback)
                except ProviderUnavailable:
                    raise
                except Exception as model_err:
                    last_err = model_err
                    status = getattr(model_err, "code", None)
                    logger.warning(
                        "[ORCA AI Diagnostic] model=%s status=%s error=%s category=%s",
                        model_name,
                        status,
                        type(model_err).__name__,
                        "QUOTA_EXHAUSTED" if status == 429 else "AUTH_FAILED" if status in (401, 403) else "MODEL_FAILED"
                    )
                    reason = failure_reason(model_err)
                    record("gemini", success=False, http_status=status, reason=reason, model=model_name)
                    if status == 429:
                        with _model_lock:
                            _model_cooldowns[model_name] = time.monotonic() + 300
                    if status not in (404, 429):
                        break
                    # A configured alternate model still generates a real answer.
                    continue

            reason = failure_reason(last_err) if last_err else "MODELS_COOLING_DOWN"
            status = getattr(last_err, "code", None)
            record("gemini", success=False, http_status=status, reason=reason)
            raise ProviderUnavailable(reason, status)
        except ProviderUnavailable:
            raise
        except Exception as err:
            reason = failure_reason(err)
            status = getattr(err, "code", None)
            record("gemini", success=False, http_status=status if isinstance(status, int) else None, reason=reason)
            logger.warning("Gemini synthesis failed category=%s", reason)
            raise ProviderUnavailable(reason, status) from err

    @classmethod
    def _resolve_measurements(cls, text, snapshot):
        # The model cannot write uncited environmental numbers. Substitution is
        # deterministic and fails closed on missing fields or invented values.
        token = re.compile(r"\[\[([a-z_]+(?:\.[a-z_]+)?)\]\]")
        without_tokens = token.sub("", text)
        # Verified provider identifiers can contain digits (e.g. INCOIS OSF
        # WW3). Exempt only complete source labels, never arbitrary numbers.
        for source in snapshot.get("provenance", {}).get("source", []):
            for label in (source, source.replace("_", " ")):
                without_tokens = re.sub(r"(?<!\w)" + re.escape(label) + r"(?!\w)", "", without_tokens, flags=re.I)
        # A channel explicitly labeled VHF is not an environmental measurement.
        # Accept its native-script digits too, without allowing a bare '16'.
        vhf_channel = r"\bVHF\s+(?:(?:Ch\.?|Channel|ચેનલ|चैनल|चॅनेल|சேனல்|ఛానల్|ചാനൽ|চ্যানেল|ಚಾನೆಲ್|ଚ୍ୟାନେଲ|ਚੈਨਲ)\s+)?[1१૧௧౧൧১೧୧੧][6६૬௬౬൬৬೬୬੬](?!\d)"
        without_tokens = re.sub(vhf_channel, "", without_tokens, flags=re.I)
        location = snapshot.get("location", {})
        if location.get("lat") is not None and location.get("lon") is not None:
            # Only the exact selected coordinate pair, never isolated numbers.
            pair = re.escape(str(location["lat"])) + r"\s*,\s*" + re.escape(str(location["lon"]))
            without_tokens = re.sub(r"(?<![\d.])" + pair + r"(?![\d.])", "", without_tokens)
        numbers = re.findall(r"\d+(?:[.,]\d+)?", without_tokens)
        if numbers:
            raise ProviderUnavailable("EVIDENCE_VALIDATION_FAILED")
        def replace(match):
            path = match.group(1)
            contact_numbers = {"contacts.emergency": "112", "contacts.coast_guard": "1554",
                               "contacts.coastal_police": "1093", "radio.distress_channel": "16"}
            if path in contact_numbers:
                return contact_numbers[path]
            if "." in path:
                section, field = path.split(".")
            else:
                sections = [name for name in ("weather", "ocean") if path in snapshot.get(name, {})]
                if len(sections) != 1:
                    raise ProviderUnavailable("EVIDENCE_VALIDATION_FAILED")
                section, field = sections[0], path
            if section not in {"weather", "ocean"}:
                raise ProviderUnavailable("EVIDENCE_VALIDATION_FAILED")
            if section == "weather":
                field = {"ocean_current_speed_kmh":"current_speed", "ocean_current_direction_deg":"current_direction",
                         "swell_wave_height_m":"swell_height_m", "swell_wave_direction_deg":"swell_direction_deg",
                         "swell_wave_period_s":"swell_period_s"}.get(field, field)
            value = snapshot.get(section, {}).get(field)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ProviderUnavailable("EVIDENCE_VALIDATION_FAILED")
            return str(value)
        rendered = token.sub(replace, text)
        if "[[" in rendered or "]]" in rendered:
            raise ProviderUnavailable("EVIDENCE_VALIDATION_FAILED")
        return rendered

    @classmethod
    def _synthesize_deterministic(
        cls,
        english_query: str,
        detected_intent: str,
        evidence: EvidenceBundle,
        location_title: str,
        target_lang: str,
        history: Optional[List[Dict[str, str]]],
    ) -> str:
        """
        High-fidelity deterministic natural reasoning generator.
        Produces structured, articulate, multi-paragraph advisories tailored to query intent.
        """
        raise ProviderUnavailable("LEGACY_SYNTHETIC_TEMPLATE_DISABLED")
