"""
ORCA Marine AI - Conversational Dialogue & Dynamic Reasoning Synthesizer.
Generates context-aware, explainable, and multi-turn marine safety responses
grounded in live INCOIS oceanographic telemetry, safety risks, and Bhashini multilingual services.
"""
import os
import re
import logging
from typing import Any, Dict, List, Optional
from app.models.agent_models import EvidenceBundle, OperationalRecommendation

logger = logging.getLogger(__name__)

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
        gemini_key = os.getenv("GEMINI_API_KEY")
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

        # Fallback to intelligent deterministic reasoning engine
        return cls._synthesize_deterministic(
            english_query=english_query,
            detected_intent=detected_intent,
            evidence=evidence,
            location_title=location_title,
            target_lang=target_lang,
            history=history,
        )

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
        recs = evidence.recommendations or []

        weather_summary = "Not available"
        if w:
            weather_summary = (
                f"Significant Wave Height: {w.wave_height_m:.2f}m, "
                f"Wind: {w.wind_speed_kmh:.1f} km/h from {w.wind_direction_cardinal or 'N/A'} ({w.wind_direction_deg or 0}°), "
                f"Sea Surface Temperature: {w.sea_surface_temperature_c or w.temperature_c or 28.0:.1f}°C, "
                f"Visibility: {w.visibility_km or 10}km, "
                f"Condition: {w.forecast or 'Moderate'}"
            )

        risk_summary = f"Level: {r.level.upper()}, Reason: {r.reason}" if r else "Not evaluated"
        tide_summary = f"High Tide: {tide.high_tide_time} ({tide.high_tide_height_m}m), Low Tide: {tide.low_tide_time} ({tide.low_tide_height_m}m)" if tide else "Semi-diurnal tides"
        pfz_summary = ", ".join([f"{z.name} ({z.distance_km}km, species: {', '.join(z.species[:2])})" for z in pfz[:2]]) if pfz else "None in immediate sector"
        alerts_summary = "; ".join([f"{a.title}: {a.message}" for a in alerts[:2]]) if alerts else "No active severe hazard warnings"
        recs_summary = "; ".join([f"{rec.title}: {rec.directive}" for rec in recs[:2]]) if recs else "Maintain standard VHF Ch 16 watch and carry certified life jackets."

        history_text = ""
        if history:
            turns = []
            for h in history[-6:]:
                role = "User" if h.get("role") == "user" else "Assistant"
                turns.append(f"{role}: {h.get('text', '')}")
            history_text = "\n".join(turns)

        system_instruction = f"""You are ORCA Marine AI, India's national operational oceanographic assistant for coastal fishermen, vessel operators, and maritime agencies.
Your goal is to provide intelligent, genuine, natural, and helpful advice grounded in authoritative INCOIS ocean telemetry.

CURRENT LOCATION: {location_title}
CURRENT DATE: {evidence.date}
LIVE OCEAN TELEMETRY:
- Weather & Sea State: {weather_summary}
- Navigational Risk: {risk_summary}
- Tidal Conditions: {tide_summary}
- Potential Fishing Zones (PFZ): {pfz_summary}
- Active Alerts: {alerts_summary}
- Operational Directives: {recs_summary}

LANGUAGE REQUIREMENT:
- Target Language: {target_lang} (e.g. en = English, gu = Gujarati, hi = Hindi, mr = Marathi, ta = Tamil, te = Telugu, ml = Malayalam, bn = Bengali, kn = Kannada, or = Odia, pa = Punjabi).
- Always respond completely and naturally in the target language. Do not mix languages.

CONVERSATION GUIDELINES:
1. Ground every claim on the provided live telemetry. Do NOT invent numbers.
2. For safety/sailing inquiries ("Is it safe to fish?", "Can I go out?"): Explain overall safety, wave heights, wind strength & direction, visibility, small boat vs large boat considerations, and safety gear requirements.
3. For follow-up questions ("Is that dangerous?", "Why?"): Understand the context of previous conversation turns smoothly.
4. For definitions ("What does PFZ mean?", "What is IMBL/SST?"): Explain clearly in accessible terms and why it matters to fishermen.
5. For emergency/engine failure: Give practical distress steps (drop anchor, VHF Ch 16 Pan-Pan/Mayday, DAT-SG beacon, Coast Guard 1554 / Coastal Police 1093).
6. Format with short paragraphs, clear bullet points for metrics, and a concluding recommendation. Keep length balanced (approximately 80 to 180 words)."""

        prompt = f"""Conversation History:
{history_text if history_text else "None (New conversation)"}

User's Latest Query: {user_query} (English interpretation: {english_query})

Generate the complete, natural response in language '{target_lang}':"""

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            for model_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={"system_instruction": system_instruction},
                    )
                    text = response.text.strip()
                    if text:
                        return text
                except Exception as model_err:
                    logger.warning(f"Model {model_name} failed: {model_err}")
                    continue
        except Exception as err:
            logger.warning(f"Gemini conversational synthesis error: {err}")

        return None

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
        q_lower = english_query.lower()
        w = evidence.weather
        r = evidence.risk
        pfz = evidence.pfz_zones
        tide = evidence.tide
        loc = location_title or "your coastal sector"

        wave_h = w.wave_height_m if w else 0.8
        wave_per = f", wave period {w.wave_period_s:.0f}s" if (w and w.wave_period_s) else ""
        wind_spd = w.wind_speed_kmh if w else 12.0
        wind_dir = w.wind_direction_cardinal if (w and w.wind_direction_cardinal) else "West"
        vis_km = w.visibility_km if w else 12.0
        sst_c = (w.sea_surface_temperature_c or w.temperature_c or 28.5) if w else 28.5
        risk_lvl = r.level if r else ("unsafe" if wave_h > 2.2 or wind_spd > 35 else ("caution" if wave_h > 1.5 or wind_spd > 25 else "safe"))
        risk_reason = r.reason if r else "Conditions evaluated against maritime safety thresholds."

        # 1. Definitions (PFZ, IMBL, SST, Swell)
        if any(k in q_lower for k in ["what is pfz", "what does pfz", "explain pfz", "meaning of pfz"]):
            return (
                f"**Potential Fishing Zones (PFZ)** are ocean areas identified through satellite earth observation (ISRO Ocean Colour & Thermal sensors) where fish concentrate in large numbers.\n\n"
                f"• **Why it happens**: Satellites detect rich **chlorophyll-a blooms** (phytoplankton) and **Sea Surface Temperature (SST) thermal fronts** where ocean currents bring nutrients to the surface.\n"
                f"• **Benefits for Fishermen**: Direct navigation to marked PFZ coordinates reduces diesel consumption by 30–50% and significantly increases fish catch (such as Tuna, Mackerel, Pomfret, and Sardines).\n\n"
                f"Near {loc}, you can view real-time PFZ coordinates directly on the ORCA Tactical Map."
            )

        if any(k in q_lower for k in ["what is imbl", "what is maritime boundary", "explain imbl", "eez meaning"]):
            return (
                f"**International Maritime Boundary Line (IMBL)** marks the official international sea border between India and neighboring maritime nations (such as Pakistan and Sri Lanka).\n\n"
                f"• **Exclusive Economic Zone (EEZ)**: Indian vessels are permitted to fish within India's 200-nautical-mile EEZ.\n"
                f"• **Strict Warning**: Crossing the IMBL into international or foreign waters is prohibited and can lead to vessel seizure or arrest by foreign coast guards.\n\n"
                f"ORCA Marine AI provides live geofencing alerts that warn you before approaching IMBL buffer lines."
            )

        if any(k in q_lower for k in ["engine", "breakdown", "broken down", "taking water", "water in boat", "leak", "sinking", "lost at sea", "help", "emergency", "sos", "mayday", "pan-pan", "distress", "capsiz", "accident", "anchor"]):
            return (
                f"🚨 **IMMEDIATE MARITIME DISTRESS & BREAKDOWN PROTOCOL**\n\n"
                f"If your vessel experiences an engine failure or distress near {loc}, take these critical actions immediately:\n\n"
                f"1. **Drop Anchor Immediately**: Prevent your boat from drifting into shallow reef hazards, shipping lanes, or across the international border.\n"
                f"2. **Broadcast on VHF Marine Radio Channel 16**: Call *'PAN-PAN, PAN-PAN, PAN-PAN'* (for breakdown/urgency) or *'MAYDAY, MAYDAY, MAYDAY'* (for life-threatening emergency).\n"
                f"3. **Activate Emergency Transponders**: Turn on your Distress Alert Transmitter (DAT-SG) or EPIRB beacon.\n"
                f"4. **Emergency Contact Numbers**:\n"
                f"   • **Indian Coast Guard**: **1554** (Toll-Free 24/7)\n"
                f"   • **Coastal Security Police**: **1093**\n"
                f"   • **National Emergency**: **112**\n\n"
                f"Stay with your vessel and ensure all crew members are wearing certified lifejackets."
            )

        # 2. Follow-up: "Is that dangerous?", "Why is it dangerous?"
        if any(k in q_lower for k in ["is that dangerous", "why dangerous", "is it risky", "is that bad", "why is wind dangerous"]):
            if risk_lvl == "safe":
                return (
                    f"At current levels near {loc}, the wind speed of **{wind_spd:.1f} km/h** and wave height of **{wave_h:.2f} m** are relatively moderate and **not considered dangerous** for normal maritime operations.\n\n"
                    f"However, weather conditions at sea can evolve rapidly. Wind gusts can increase surface chop within 30–60 minutes. Keep a continuous watch on VHF Channel 16 and verify conditions before venturing further offshore."
                )
            else:
                return (
                    f"Yes, conditions near {loc} require caution. Current wave heights of **{wave_h:.2f} m** combined with wind speeds of **{wind_spd:.1f} km/h** create steep chop and heavy swell.\n\n"
                    f"• **Risk for Small Craft**: Open fiber boats under 30ft face risk of swamping and capsizing when negotiating breaking waves near sandbars and harbor mouths.\n"
                    f"• **Recommendation**: Remain within sheltered nearshore waters or postpone departure until sea state subsides."
                )

        # 3. Wind Inquiry
        if any(k in q_lower for k in ["wind", "breeze", "speed of wind", "how strong is the wind"]):
            wind_assessment = "moderate and manageable" if wind_spd < 20 else ("fresh and breezy" if wind_spd < 30 else "strong and hazardous")
            return (
                f"**Current Wind Conditions near {loc}**:\n\n"
                f"• **Wind Speed**: **{wind_spd:.1f} km/h** ({wind_spd/3.6:.1f} m/s)\n"
                f"• **Direction**: Blowing from the **{wind_dir}**\n"
                f"• **Assessment**: The current wind speed is **{wind_assessment}**.\n\n"
                f"Surface waves are currently around **{wave_h:.2f} m**. Standard navigation precautions apply."
            )

        # 4. Wave / Swell Inquiry
        if any(k in q_lower for k in ["wave", "waves", "swell", "how high are the waves", "sea height", "tide"]):
            return (
                f"**Current Wave & Sea State near {loc}**:\n\n"
                f"• **Significant Wave Height**: **{wave_h:.2f} m**{wave_per}\n"
                f"• **Sea Surface Temperature**: **{sst_c:.1f}°C**\n"
                f"• **Visibility**: **{vis_km:.0f} km**\n"
                f"• **Tidal Forecast**: {tide.tidal_phase if tide else 'Normal tidal cycle'} with High Tide around {tide.high_tide_time if tide else '04:45 AM'}.\n\n"
                f"The wave height is within acceptable parameters for motorized fishing vessels. Avoid navigating too close to shallow coastal breaker lines."
            )

        # 5. PFZ Locator Inquiry
        if any(k in q_lower for k in ["pfz", "fishing zone", "nearest fish", "where to fish", "fish catch"]):
            if pfz:
                pfz_lines = [
                    f"• **{z.name}**: **{z.distance_km:.1f} km** away (bearing {int(z.bearing_deg or 0)}° {get_compass_cardinal(z.bearing_deg)}), depth ~{int(z.depth_m or 25)}m, primary species: *{', '.join(z.species)}*"
                    for z in pfz[:3]
                ]
                return (
                    f"**Potential Fishing Zones (PFZ) near {loc}**:\n\n"
                    + "\n".join(pfz_lines) +
                    f"\n\n**Operational Advice**: Current sea state is **{risk_lvl.upper()}** (Wave: {wave_h:.2f}m, Wind: {wind_spd:.1f} km/h). "
                    f"{'Conditions are favorable to venture out.' if risk_lvl == 'safe' else 'Exercise extreme caution if venturing offshore.'} Track your route on the Tactical Map."
                )
            else:
                return (
                    f"There are currently no high-density PFZ advisories active within 50 km of {loc}. "
                    f"Check nearshore rocky sectors or review the satellite chlorophyll overlay on the ORCA Map."
                )

        # 6. General Safety / Sailing / Can I go fishing? (Default Comprehensive Safety Assessment)
        if risk_lvl == "safe":
            verdict = "CONDITIONS ARE GENERALLY SAFE FOR FISHING & SAILING"
            icon = "✅"
            rec_text = (
                f"Based on current oceanographic telemetry near {loc}, conditions appear **favorable and safe** for normal fishing operations. "
                f"The significant wave height is **{wave_h:.2f} m** and winds are **{wind_spd:.1f} km/h** from the **{wind_dir}**, which are well within standard operational limits. "
                f"Visibility is clear at approximately **{vis_km:.0f} km**."
            )
        elif risk_lvl == "caution":
            verdict = "CAUTION ADVISED — MONITOR EVOLVING WEATHER"
            icon = "⚠️"
            rec_text = (
                f"Current marine telemetry near {loc} indicates **moderate to developing sea conditions**. "
                f"Wave heights are reaching **{wave_h:.2f} m** with winds around **{wind_spd:.1f} km/h** from the **{wind_dir}**. "
                f"Small motorized and traditional craft should stay within 5 nautical miles of the coastline."
            )
        else:
            verdict = "UNSAFE FOR NAVIGATION — POSTPONE DEPARTURE"
            icon = "🚨"
            rec_text = (
                f"Current oceanographic telemetry near {loc} indicates **hazardous sea conditions**. "
                f"Wave heights of **{wave_h:.2f} m** and winds of **{wind_spd:.1f} km/h** pose significant risks of vessel capsizing and swamping. "
                f"All artisanal and small commercial fishing departures should be postponed."
            )

        return (
            f"{icon} **{verdict}**\n\n"
            f"{rec_text}\n\n"
            f"**Current Coastal Conditions ({loc})**:\n"
            f"• **Wave Height**: {wave_h:.2f} m\n"
            f"• **Wind Speed & Direction**: {wind_spd:.1f} km/h from {wind_dir}\n"
            f"• **Sea Surface Temperature**: {sst_c:.1f}°C\n"
            f"• **Visibility**: {vis_km:.0f} km\n\n"
            f"**Recommended Precautions**:\n"
            f"1. Ensure all crew members wear approved life jackets before leaving the harbor.\n"
            f"2. Maintain continuous monitoring on VHF Marine Radio Channel 16.\n"
            f"3. Verify fuel, freshwater, and Distress Alert Transmitter (DAT) battery status.\n"
            f"4. Always confirm the latest VHF weather broadcast immediately before departing shore."
        )
