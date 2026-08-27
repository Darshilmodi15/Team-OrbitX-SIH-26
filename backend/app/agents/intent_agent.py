"""
Intent classification and Entity Extraction agent for ORCA Marine AI.
Classifies user operational marine queries and extracts locations, temporal hints,
and simulation parameters.
"""
import json
import os
import re
from typing import Any, Dict, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are an intent classification assistant for ORCA Marine AI.
Classify the user's question into one of the following intent types:
- "combined_pfz_safety": User wants to find PFZ AND check safety / route (e.g., 'Find nearest PFZ and tell me if it is safe tomorrow morning')
- "safe_route": User asks for safe navigation route to a zone or PFZ considering weather and sea-state conditions
- "what_if_simulation": Counterfactual scenario (e.g., 'What if wave height increases by 1m?')
- "hazard_alerts": Proactive hazard, lightning, storm surge, high wave, or cyclone warnings
- "chlorophyll_sst_analytics": Inquiry into high chlorophyll-a blooms, favorable Sea Surface Temperature (SST), and thermal front sectors
- "fish_productivity_decline": Ecological reasoning into why fish catch or productivity has declined in a coastal region
- "zone_avoidance": Inquiry into which fishing zones or sectors to avoid due to hazardous sea conditions or geofencing / boundary restrictions
- "geofence_check": Maritime boundary, IMBL, or MPA proximity
- "marine_boundary": Maritime boundary, EEZ limit, international waters check
- "safety_check": Pure marine safety evaluation (e.g., 'Is it safe to venture into the sea tomorrow morning?')
- "nearest_pfz": Pure PFZ fishing spot discovery (e.g., 'Where is the nearest Potential Fishing Zone today?')
- "weather_conditions": Marine meteorological, tide, wave, wind, swell, or sea state inquiry
- "general": General informational query or greeting

Extract:
- "location_hint": Mentioned port / place / region name (e.g., 'Dahanu', 'Mumbai', 'Veraval', 'Kochi', 'Gujarat', 'Maharashtra', 'Palk Bay') or null
- "time_hint": Temporal reference (e.g., 'tomorrow morning', 'afternoon', 'today') or null
- "simulation_delta_wave": Float meters or null
- "simulation_delta_wind": Float km/h or null

Respond ONLY with valid JSON in the form:
{"intent": "<type>", "location_hint": "<location or null>", "time_hint": "<time or null>", "simulation_delta_wave": null, "simulation_delta_wind": null}"""

VALID_INTENTS = {
    "combined_pfz_safety",
    "safe_route",
    "what_if_simulation",
    "hazard_alerts",
    "chlorophyll_sst_analytics",
    "fish_productivity_decline",
    "zone_avoidance",
    "geofence_check",
    "marine_boundary",
    "safety_check",
    "nearest_pfz",
    "weather_conditions",
    "general",
}

COASTAL_PORT_COORDS: Dict[str, Dict[str, Any]] = {
    "dahanu": {"lat": 19.9700, "lon": 72.7300, "name": "Dahanu Port"},
    "satpati": {"lat": 19.7242, "lon": 72.0794, "name": "Satpati / Palghar"},
    "palghar": {"lat": 19.7242, "lon": 72.0794, "name": "Satpati / Palghar"},
    "mumbai": {"lat": 18.9220, "lon": 72.8347, "name": "Mumbai Port"},
    "sassoon": {"lat": 18.9220, "lon": 72.8347, "name": "Mumbai Sassoon Dock"},
    "ratnagiri": {"lat": 16.9902, "lon": 73.3120, "name": "Ratnagiri Harbor"},
    "malvan": {"lat": 16.0500, "lon": 73.4600, "name": "Malvan Coastal Harbor"},
    "veraval": {"lat": 20.9000, "lon": 70.3667, "name": "Veraval Port"},
    "porbandar": {"lat": 21.6417, "lon": 69.6093, "name": "Porbandar Jetty"},
    "okha": {"lat": 22.4667, "lon": 69.0667, "name": "Okha Port"},
    "gujarat": {"lat": 20.9000, "lon": 70.3667, "name": "Gujarat Coastal Sector"},
    "maharashtra": {"lat": 18.9220, "lon": 72.8347, "name": "Maharashtra Coastal Sector"},
    "goa": {"lat": 15.4989, "lon": 73.8278, "name": "Goa Coastal Sector"},
    "panaji": {"lat": 15.4989, "lon": 73.8278, "name": "Panaji Port"},
    "kochi": {"lat": 9.9312, "lon": 76.2673, "name": "Kochi Harbor"},
    "cochin": {"lat": 9.9312, "lon": 76.2673, "name": "Kochi Harbor"},
    "kerala": {"lat": 9.9312, "lon": 76.2673, "name": "Kerala Coastal Sector"},
    "mangaluru": {"lat": 12.8596, "lon": 74.8364, "name": "Mangaluru Old Port"},
    "karnataka": {"lat": 12.8596, "lon": 74.8364, "name": "Karnataka Coastal Sector"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai Port"},
    "rameswaram": {"lat": 9.2876, "lon": 79.3129, "name": "Rameswaram Port"},
    "pamban": {"lat": 9.2876, "lon": 79.3129, "name": "Rameswaram Pamban"},
    "tamil nadu": {"lat": 9.2876, "lon": 79.3129, "name": "Tamil Nadu Coastal Sector"},
    "tamilnadu": {"lat": 9.2876, "lon": 79.3129, "name": "Tamil Nadu Coastal Sector"},
    "palk bay": {"lat": 9.5000, "lon": 79.2000, "name": "Palk Bay Sector"},
    "mannar": {"lat": 9.1000, "lon": 79.1000, "name": "Gulf of Mannar"},
    "vizag": {"lat": 17.6868, "lon": 83.2185, "name": "Visakhapatnam Port"},
    "visakhapatnam": {"lat": 17.6868, "lon": 83.2185, "name": "Visakhapatnam Port"},
    "andhra": {"lat": 17.6868, "lon": 83.2185, "name": "Andhra Pradesh Coast"},
    "paradip": {"lat": 20.2644, "lon": 86.6710, "name": "Paradip Marine Harbor"},
    "odisha": {"lat": 20.2644, "lon": 86.6710, "name": "Odisha Coastal Sector"},
    "gahirmatha": {"lat": 20.7500, "lon": 86.9500, "name": "Gahirmatha Sector"},
    "sundarbans": {"lat": 21.6000, "lon": 88.8000, "name": "Sundarbans Marine Buffer"},
    "bengal": {"lat": 21.6000, "lon": 88.8000, "name": "West Bengal Coast"},
    "port blair": {"lat": 11.6234, "lon": 92.7265, "name": "Port Blair Harbor"},
    "andaman": {"lat": 11.6234, "lon": 92.7265, "name": "Andaman & Nicobar Islands"},
    "lakshadweep": {"lat": 10.5667, "lon": 72.6333, "name": "Lakshadweep Waters"},
}


def _extract_entities_heuristically(question: str) -> Dict[str, Any]:
    """Extracts location hints, coordinates, simulation deltas, and time hints."""
    q_lower = question.lower()
    location_hint = None
    resolved_coords = None

    for port_key, info in COASTAL_PORT_COORDS.items():
        if re.search(rf"\b{re.escape(port_key)}\b", q_lower):
            location_hint = info["name"]
            resolved_coords = {"lat": info["lat"], "lon": info["lon"]}
            break

    # Time hint
    time_hint = None
    if "tomorrow morning" in q_lower:
        time_hint = "tomorrow morning"
    elif "tomorrow" in q_lower:
        time_hint = "tomorrow"
    elif "this afternoon" in q_lower or "afternoon" in q_lower:
        time_hint = "afternoon"
    elif "tonight" in q_lower:
        time_hint = "tonight"
    elif "today" in q_lower:
        time_hint = "today"

    # Simulation delta extraction
    sim_delta_wave = None
    sim_delta_wind = None

    wave_match = re.search(r"(?:wave|swell).*?(?:increase|higher|rise|by|to)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meter|metre)", q_lower)
    if wave_match:
        sim_delta_wave = float(wave_match.group(1))

    wind_match = re.search(r"(?:wind).*?(?:increase|higher|become|by|to)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:km/h|kmh|knots|m/s)?", q_lower)
    if wind_match:
        sim_delta_wind = float(wind_match.group(1))

    return {
        "location_hint": location_hint,
        "resolved_coords": resolved_coords,
        "time_hint": time_hint,
        "simulation_delta_wave": sim_delta_wave,
        "simulation_delta_wind": sim_delta_wind,
    }


def _fallback_intent(question: str) -> Dict[str, Any]:
    """Heuristic fallback for intent classification."""
    q_lower = question.lower()
    entities = _extract_entities_heuristically(question)

    # 1. What-If Simulation
    if any(k in q_lower for k in ["what if", "what happens if", "if wave", "if wind", "simulate", "scenario"]):
        return {
            "intent": "what_if_simulation",
            **entities,
        }

    # 2. Fish Productivity Decline Analysis (Ecology)
    if any(k in q_lower for k in [
        "productivity declined", "fish declined", "productivity decline", "decline in fish", "declined in",
        "why has fish", "why fish catch", "fish catch down", "fish catch reduced", "why fish declined",
        "fish productivity", "depletion of fish", "fish catch decline"
    ]):
        return {
            "intent": "fish_productivity_decline",
            **entities,
        }

    # 3. Zone Avoidance (Hazards / Geofencing Avoidance)
    if any(k in q_lower for k in [
        "avoided", "should be avoided", "zones to avoid", "avoid fishing", "avoid due to",
        "hazardous marine conditions or geofencing", "geofencing restrictions", "prohibited zone",
        "where not to fish", "dangerous zones"
    ]):
        return {
            "intent": "zone_avoidance",
            **entities,
        }

    # 4. Chlorophyll and SST Analytics
    if any(k in q_lower for k in [
        "chlorophyll", "chlorophyll concentration", "sea surface temperature", "favourable sea surface",
        "favorable sea surface", "favorable sst", "favourable sst", "thermal front", "thermal fronts",
        "ocean color", "chlorophyll-a", "sst and chlorophyll", "chlorophyll and sst"
    ]):
        return {
            "intent": "chlorophyll_sst_analytics",
            **entities,
        }

    # 5. Combined PFZ + Safety / Killer demo intent
    has_pfz = any(k in q_lower for k in ["pfz", "fishing zone", "fish zone", "fishing spot", "fishing spots", "fish"])
    has_safety_or_route = any(k in q_lower for k in ["safe", "safety", "route", "tomorrow", "weather", "suitable"])
    has_explicit_route = any(k in q_lower for k in ["route", "safest route", "navigation corridor", "how to reach", "path"])

    if has_pfz and has_safety_or_route and has_explicit_route:
        return {
            "intent": "combined_pfz_safety",
            **entities,
        }
    if has_pfz and ("safe" in q_lower or "safety" in q_lower or "tomorrow" in q_lower or "suitable" in q_lower):
        return {
            "intent": "combined_pfz_safety",
            **entities,
        }

    # 6. Safe Route
    if has_explicit_route:
        return {
            "intent": "safe_route",
            **entities,
        }

    # 7. Proactive Hazard & Lightning / Cyclone Alerts
    if any(k in q_lower for k in [
        "lightning", "cyclone", "cyclones", "hazard", "hazards", "alert", "alerts",
        "warning", "cyclone alert", "high wave alert", "lightning alert", "storm alert",
        "thunderstorm", "depression alert"
    ]):
        return {
            "intent": "hazard_alerts",
            **entities,
        }

    # 8. Marine Boundary / EEZ Check
    if any(k in q_lower for k in ["eez", "exclusive economic zone", "maritime boundary", "territorial water", "territorial waters", "international waters"]):
        return {
            "intent": "marine_boundary",
            **entities,
        }

    # 9. Geofence Check
    if any(k in q_lower for k in ["geofence", "imbl", "border", "boundary", "restricted waters", "mpa", "protected area"]):
        return {
            "intent": "geofence_check",
            **entities,
        }

    # 10. Safety Check
    if any(k in q_lower for k in ["safe", "safety", "risk", "danger", "can i sail", "can i fish", "ok to go", "advisory"]):
        return {
            "intent": "safety_check",
            **entities,
        }

    # 11. Nearest PFZ
    if any(k in q_lower for k in ["pfz", "fishing zone", "fish zone", "nearest fish", "catch fish", "tuna", "mackerel", "pomfret"]):
        return {
            "intent": "nearest_pfz",
            **entities,
        }

    # 12. Weather & Tide Conditions
    if any(k in q_lower for k in [
        "weather", "wind", "winds", "wave", "waves", "wave height", "wind speed", "wind direction",
        "forecast", "temp", "temperature", "rain", "storm", "sea condition", "swell", "sea state",
        "tide", "tides", "high tide", "low tide", "tidal"
    ]):
        return {
            "intent": "weather_conditions",
            **entities,
        }

    # 13. General fallback
    return {
        "intent": "general",
        **entities,
    }


def _clean_json_text(raw_text: str) -> str:
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[len("```json"):].strip()
    if raw_text.startswith("```"):
        raw_text = raw_text[len("```"):].strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()
    return raw_text


def parse_intent(question: str) -> Dict[str, Any]:
    """
    Classifies user question into structured intent and extracts marine entities.
    """
    entities = _extract_entities_heuristically(question)
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            for model_name in ["gemini-2.0-flash", "gemini-1.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=question,
                        config={"system_instruction": SYSTEM_PROMPT},
                    )
                    raw_text = _clean_json_text(response.text)
                    data = json.loads(raw_text)
                    intent = data.get("intent", "general")
                    if intent not in VALID_INTENTS:
                        intent = "general"
                    return {
                        "intent": intent,
                        "location_hint": data.get("location_hint") or entities["location_hint"],
                        "resolved_coords": entities["resolved_coords"],
                        "time_hint": data.get("time_hint") or entities["time_hint"],
                        "simulation_delta_wave": data.get("simulation_delta_wave") or entities["simulation_delta_wave"],
                        "simulation_delta_wind": data.get("simulation_delta_wind") or entities["simulation_delta_wind"],
                    }
                except Exception:
                    continue
        except Exception:
            pass

    return _fallback_intent(question)

