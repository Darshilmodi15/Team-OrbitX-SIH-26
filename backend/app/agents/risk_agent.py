"""ORCA heuristic assessment: missing evidence is never a safety clearance."""
import math
from typing import Any, Dict, Union
from app.models.agent_models import WeatherEvidence, RiskEvidence, RiskComponentItem, MarineRiskProfile


def assess_risk(weather_input: Union[WeatherEvidence, Dict[str, Any]]) -> RiskEvidence:
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
    def component(key, caution, high):
        value = available.get(key)
        if value is None or not usable:
            return RiskComponentItem(level="UNKNOWN", score=None, description="Current evidence unavailable")
        tier = "HIGH" if value > high else "MODERATE" if value > caution else "LOW"
        return RiskComponentItem(level=tier, score=None, description=f"ORCA threshold assessment of {key}={value}; not a safety clearance")
    wave = component("wave_height_m", 1.5, 2.5)
    if usable and available.get("wave_period_s") is not None and available["wave_period_s"] < 5.5 and available.get("wave_height_m", -1) >= 1.2 and wave.level == "LOW":
        wave = RiskComponentItem(level="MODERATE", score=None, description="ORCA heuristic: measured short-period waves")
    wind = component("wind_speed_kmh", 40, 50)
    swell = component("swell_wave_height_m", 1.5, 2.5)
    gust = component("wind_gust_kmh", 40, 60)
    code = available.get("weather_code")
    storm = RiskComponentItem(level="UNKNOWN", score=None, description="Storm evidence unavailable")
    if usable and code is not None:
        storm = RiskComponentItem(level="HIGH" if code >= 95 else "MODERATE" if code >= 50 else "LOW",
            score=None, description=f"ORCA interpretation of provider weather code {code}")
    tiers = [wave.level, wind.level, gust.level, storm.level, swell.level]
    # Wave + wind + period are the minimum for a low-risk assessment. Optional
    # missing dimensions remain explicit; any observed high risk still wins.
    enough = usable and all(key in available for key in ("wave_height_m", "wind_speed_kmh", "wave_period_s"))
    level = "unsafe" if "HIGH" in tiers else "caution" if "MODERATE" in tiers else "low" if enough else "unknown"
    trend = "unknown"
    horizon = raw.get("forecast_horizon") or []
    if usable and "wave_height_m" in available and len(horizon) >= 2:
        waves = [step.get("wave_height_m") for step in horizon]
        if all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0 for v in waves):
            trend = "deteriorating" if waves[-1] > available["wave_height_m"] + .5 or waves[-1] >= 2 else "improving" if waves[-1] < available["wave_height_m"] - .5 else "stable"
            if trend == "deteriorating" and level != "unsafe":
                level = "caution"
    warnings = [item.description for item in (wave, wind, gust, storm, swell) if item.level in {"HIGH", "MODERATE"}]
    if trend == "deteriorating":
        warnings.append("Measured forecast horizon is deteriorating")
    reason = "ORCA heuristic assessment of available evidence only; this is not navigational clearance."
    if missing:
        reason += " Insufficient evidence for a complete current assessment."
    return RiskEvidence(level=level, reason=reason, available_evidence=available, missing_evidence=missing,
        evidence_completeness=completeness, confidence=None, risk_score=None, factors=warnings,
        assessment_type="ORCA_SIMULATION" if simulation else "ORCA_HEURISTIC",
        safety_label="INSUFFICIENT EVIDENCE" if level == "unknown" else "ORCA HEURISTIC: " + level.upper(),
        freshness_status="SIMULATED" if simulation else {"live":"FRESH", "fresh":"FRESH", "cached":"CACHED", "stale":"STALE"}.get(status, "UNAVAILABLE"),
        profile=MarineRiskProfile(overall={"unsafe": "HIGH", "caution": "MODERATE", "low": "LOW"}.get(level, "UNKNOWN"), status_label=level.upper(), wave_risk=wave,
            wind_risk=wind, gust_risk=gust, storm_risk=storm, forecast_trend=trend,
            warnings=warnings + (["Missing: " + ", ".join(missing)] if missing else []),
            recommendations=["Consult current official marine advisories before making navigation decisions."]))
