"""ORCA heuristic assessment: missing evidence is never a safety clearance."""
import math
from typing import Any, Dict, Optional, Tuple, Union
from app.models.agent_models import WeatherEvidence, RiskEvidence, RiskComponentItem, MarineRiskProfile

# Threshold tuples: (caution_gt, high_gt) except visibility (caution_lt, high_lt)
VESSEL_RISK_PROFILES: Dict[str, Dict[str, Tuple[float, float]]] = {
    "standard": {
        "wave": (1.5, 2.5),
        "wind": (40.0, 50.0),
        "swell": (1.5, 2.5),
        "gust": (40.0, 60.0),
        "current": (2.5, 5.0),
        "visibility": (5.0, 2.0),
    },
    "traditional_canoe": {
        "wave": (0.8, 1.4),
        "wind": (22.0, 32.0),
        "swell": (0.9, 1.5),
        "gust": (28.0, 40.0),
        "current": (1.5, 3.0),
        "visibility": (5.0, 2.5),
    },
    "motorized_gillnetter": {
        "wave": (1.2, 2.0),
        "wind": (32.0, 44.0),
        "swell": (1.2, 2.0),
        "gust": (36.0, 50.0),
        "current": (2.0, 4.0),
        "visibility": (5.0, 2.0),
    },
    "mechanized_trawler": {
        "wave": (1.8, 2.8),
        "wind": (42.0, 55.0),
        "swell": (1.8, 2.8),
        "gust": (45.0, 65.0),
        "current": (3.0, 5.5),
        "visibility": (4.5, 2.0),
    },
}


def assess_risk(
    weather_input: Union[WeatherEvidence, Dict[str, Any]],
    vessel_class: Optional[str] = None,
) -> RiskEvidence:
    raw = weather_input.model_dump() if isinstance(weather_input, WeatherEvidence) else weather_input
    fields = ("wave_height_m", "wind_speed_kmh", "wave_period_s", "wind_gust_kmh", "visibility_km", "weather_code", "swell_wave_height_m", "ocean_current_speed_kmh")
    available = {}
    for key in fields:
        value = raw.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0:
            available[key] = value
    missing = [key for key in fields if key not in available]
    status = raw.get("cache_status") or "unavailable"
    simulation = raw.get("is_mock", False) and str(raw.get("source", "")).endswith("[SIMULATION]")
    usable = status in {"live", "fresh", "cached"} and (not raw.get("is_mock", False) or simulation)
    if not usable or simulation:
        missing.append("current_verified_source")
    completeness = "complete" if not missing else "partial" if available else "unavailable"

    normalized_class = vessel_class.strip().lower() if isinstance(vessel_class, str) and vessel_class.strip().lower() in VESSEL_RISK_PROFILES else None
    thresholds = VESSEL_RISK_PROFILES[normalized_class or "standard"]

    def component(key: str, caution: float, high: float):
        value = available.get(key)
        if value is None or not usable:
            return RiskComponentItem(level="UNKNOWN", score=None, description="Current evidence unavailable")
        tier = "HIGH" if value > high else "MODERATE" if value > caution else "LOW"
        return RiskComponentItem(level=tier, score=None, description=f"ORCA threshold assessment of {key}={value}; not a safety clearance")

    wave = component("wave_height_m", *thresholds["wave"])
    if usable and available.get("wave_period_s") is not None and available["wave_period_s"] < 5.5 and available.get("wave_height_m", -1) >= 1.2 and wave.level == "LOW":
        wave = RiskComponentItem(level="MODERATE", score=None, description="ORCA heuristic: measured short-period waves")
    wind = component("wind_speed_kmh", *thresholds["wind"])
    swell = component("swell_wave_height_m", *thresholds["swell"])
    gust = component("wind_gust_kmh", *thresholds["gust"])
    curr_risk = component("ocean_current_speed_kmh", *thresholds["current"])
    vis_val = available.get("visibility_km")
    if vis_val is None or not usable:
        vis_risk = RiskComponentItem(level="UNKNOWN", score=None, description="Visibility evidence unavailable")
    else:
        vis_caution, vis_high = thresholds["visibility"]
        vis_tier = "HIGH" if vis_val < vis_high else "MODERATE" if vis_val < vis_caution else "LOW"
        vis_risk = RiskComponentItem(level=vis_tier, score=None, description=f"ORCA threshold assessment of visibility_km={vis_val}; not a safety clearance")
    code = available.get("weather_code")
    storm = RiskComponentItem(level="UNKNOWN", score=None, description="Storm evidence unavailable")
    if usable and code is not None:
        storm = RiskComponentItem(level="HIGH" if code >= 95 else "MODERATE" if code >= 50 else "LOW",
            score=None, description=f"ORCA interpretation of provider weather code {code}")
    tiers = [wave.level, wind.level, gust.level, storm.level, swell.level, vis_risk.level, curr_risk.level]
    # Wave + wind + period are the minimum for a low-risk assessment. Optional
    # missing dimensions remain explicit; any observed high risk still wins.
    enough = usable and all(key in available for key in ("wave_height_m", "wind_speed_kmh", "wave_period_s"))
    level = "unsafe" if "HIGH" in tiers else "caution" if "MODERATE" in tiers else "low" if enough else "unknown"
    trend = "unknown"
    horizon = raw.get("forecast_horizon") or []
    if usable and "wave_height_m" in available and len(horizon) >= 2:
        waves = [step.get("wave_height_m") for step in horizon]
        if all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0 for v in waves):
            peak_wave = max(waves)
            if peak_wave > available["wave_height_m"] + .5 or peak_wave >= 2:
                trend = "deteriorating"
            elif waves[-1] < available["wave_height_m"] - .5:
                trend = "improving"
            else:
                trend = "stable"
            if trend == "deteriorating" and level != "unsafe":
                level = "caution"
    warnings = [item.description for item in (wave, wind, gust, storm, swell, vis_risk, curr_risk) if item.level in {"HIGH", "MODERATE"}]
    if trend == "deteriorating":
        warnings.append("Measured forecast horizon is deteriorating")
    reason = "ORCA heuristic assessment of available evidence only; this is not navigational clearance."
    if normalized_class and normalized_class != "standard":
        reason += f" Evaluated using {normalized_class} vessel operating thresholds."
    if missing:
        reason += " Insufficient evidence for a complete current assessment."
    return RiskEvidence(level=level, reason=reason, available_evidence=available, missing_evidence=missing,
        evidence_completeness=completeness, confidence=None, risk_score=None, factors=warnings,
        vessel_class=normalized_class,
        assessment_type="ORCA_SIMULATION" if simulation else "ORCA_HEURISTIC",
        safety_label="INSUFFICIENT EVIDENCE" if level == "unknown" else "ORCA HEURISTIC: " + level.upper(),
        freshness_status="SIMULATED" if simulation else {"live":"FRESH", "fresh":"FRESH", "cached":"CACHED", "stale":"STALE"}.get(status, "UNAVAILABLE"),
        profile=MarineRiskProfile(overall={"unsafe": "HIGH", "caution": "MODERATE", "low": "LOW"}.get(level, "UNKNOWN"), status_label=level.upper(), wave_risk=wave,
            wind_risk=wind, gust_risk=gust, storm_risk=storm, forecast_trend=trend,
            warnings=warnings + (["Missing: " + ", ".join(missing)] if missing else []),
            recommendations=["Consult current official marine advisories before making navigation decisions."]))
