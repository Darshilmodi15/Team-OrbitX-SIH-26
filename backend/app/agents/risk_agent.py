"""Evidence-aware marine safety risk assessment."""
from typing import Any, Dict, List, Optional, Union

from app.models.agent_models import (
    MarineRiskProfile,
    RiskComponentItem,
    RiskEvidence,
    WeatherEvidence,
)


def _value(data: Union[WeatherEvidence, Dict[str, Any]], name: str) -> Any:
    return getattr(data, name, None) if isinstance(data, WeatherEvidence) else data.get(name)


def assess_risk(weather_input: Union[WeatherEvidence, Dict[str, Any]]) -> RiskEvidence:
    """Apply ORCA thresholds only to measurements supplied by the provider."""
    wave = _value(weather_input, "wave_height_m")
    wind = _value(weather_input, "wind_speed_kmh")
    period = _value(weather_input, "wave_period_s")
    gust = _value(weather_input, "wind_gust_kmh")
    forecast_value = _value(weather_input, "forecast")
    forecast = forecast_value.strip().lower() if isinstance(forecast_value, str) else None
    horizon = _value(weather_input, "forecast_horizon") or []
    cache_status = _value(weather_input, "cache_status") or "unavailable"

    available: List[str] = []
    missing: List[str] = []
    for label, value in (
        ("wave height", wave),
        ("sustained wind", wind),
        ("wave period", period),
        ("wind gusts", gust),
        ("storm/precipitation forecast", forecast),
    ):
        (available if value is not None else missing).append(label)

    cache_label = {
        "live": "LIVE",
        "cached": "CACHED",
        "stale": "STALE",
        "unavailable": "UNAVAILABLE",
    }.get(str(cache_status), "UNKNOWN")

    if wave is None or wind is None:
        profile = MarineRiskProfile(
            overall="UNKNOWN",
            status_label="INSUFFICIENT DATA",
            wave_risk=RiskComponentItem(level="UNKNOWN", description="Wave evidence unavailable"),
            wind_risk=RiskComponentItem(level="UNKNOWN", description="Wind evidence unavailable"),
            storm_risk=RiskComponentItem(
                level="UNKNOWN" if forecast is None else "LOW",
                description="Storm evidence unavailable" if forecast is None else "No storm trigger in supplied forecast",
            ),
            gust_risk=RiskComponentItem(
                level="UNKNOWN" if gust is None else ("HIGH" if gust > 60 else "MODERATE" if gust > 40 else "LOW"),
                description="Gust evidence unavailable" if gust is None else "Measured gust threshold evaluation",
            ),
            forecast_trend="unknown",
            recommendations=["Do not treat this response as clearance to sail; obtain a verified marine forecast."],
            warnings=["Essential wave or wind evidence is missing."],
        )
        return RiskEvidence(
            level="unknown",
            reason="Insufficient marine evidence for an ORCA risk classification.",
            factors=[],
            safety_label="INSUFFICIENT DATA",
            confidence="INSUFFICIENT_EVIDENCE",
            risk_score=None,
            freshness_status=cache_label,
            wave_status="Unavailable",
            wind_status="Unavailable",
            profile=profile,
            available_evidence=available,
            missing_evidence=missing,
            evidence_completeness="insufficient",
        )

    severe: List[str] = []
    caution: List[str] = []
    warnings: List[str] = []
    if wave > 2.5:
        severe.append(f"wave height {wave:.2f}m exceeds the ORCA severe threshold")
        warnings.append(f"Severe wave height ({wave:.2f}m)")
    elif wave > 1.5:
        caution.append(f"wave height {wave:.2f}m exceeds the ORCA caution threshold")
        warnings.append(f"Elevated wave height ({wave:.2f}m)")
    if wind > 50:
        severe.append(f"wind speed {wind:.1f} km/h exceeds the ORCA severe threshold")
        warnings.append(f"Severe wind speed ({wind:.1f} km/h)")
    elif wind > 40:
        caution.append(f"wind speed {wind:.1f} km/h exceeds the ORCA caution threshold")
        warnings.append(f"Strong wind speed ({wind:.1f} km/h)")
    if period is not None and period < 5.5 and wave > 1.2:
        caution.append(f"short wave period {period:.1f}s indicates steep chop")
        warnings.append(f"Short-period waves ({period:.1f}s)")
    if gust is not None and gust > 60:
        severe.append(f"wind gust {gust:.1f} km/h exceeds the ORCA severe threshold")
    elif gust is not None and gust > 40:
        caution.append(f"wind gust {gust:.1f} km/h exceeds the ORCA caution threshold")
    if forecast == "stormy":
        severe.append("provider forecast indicates storm conditions")
    elif forecast == "rainy":
        caution.append("provider forecast indicates rain or squall risk")

    trend = "unknown"
    if len(horizon) >= 2 and horizon[-1].get("wave_height_m") is not None:
        last_wave = horizon[-1]["wave_height_m"]
        trend = "deteriorating" if last_wave > wave + 0.5 else "improving" if last_wave < wave - 0.5 else "stable"

    wave_level = "HIGH" if wave > 2.5 else "MODERATE" if wave > 1.5 or (period is not None and period < 5.5 and wave > 1.2) else "LOW"
    wind_level = "HIGH" if wind > 50 else "MODERATE" if wind > 35 else "LOW"
    storm_level = "HIGH" if forecast == "stormy" else "MODERATE" if forecast == "rainy" else "UNKNOWN"
    gust_level = "UNKNOWN" if gust is None else "HIGH" if gust > 60 else "MODERATE" if gust > 40 else "LOW"
    completeness = "complete" if not missing else "partial"
    confidence = "ORCA_HEURISTIC_COMPLETE" if completeness == "complete" else "ORCA_HEURISTIC_PARTIAL"

    if trend == "deteriorating" and not severe:
        caution.append("forecast horizon indicates deteriorating conditions")
        warnings.append("Forecast horizon is deteriorating")
    if severe:
        level, overall, label = "unsafe", "HIGH", "UNSAFE"
        recommendation = "Suspend departures and consult official marine safety broadcasts."
        score: Optional[float] = 0.85
    elif caution:
        level, overall, label = "caution", "MODERATE", "CAUTION"
        recommendation = "Use heightened caution and consult official marine safety broadcasts."
        score = 0.55
    else:
        level, overall, label = "safe", "LOW", "SAFE"
        recommendation = "No ORCA threshold was exceeded; this is not a safety clearance."
        score = round(min(1.0, (wave / 1.5) * 0.3), 2)

    profile = MarineRiskProfile(
        overall=overall,
        status_label=label,
        wave_risk=RiskComponentItem(level=wave_level, score=score, description="Measured wave threshold evaluation"),
        wind_risk=RiskComponentItem(level=wind_level, score=score, description="Measured wind threshold evaluation"),
        storm_risk=RiskComponentItem(level=storm_level, score=None, description="Provider forecast evidence" if forecast else "Storm evidence unavailable"),
        gust_risk=RiskComponentItem(level=gust_level, score=None, description="Provider gust evidence" if gust is not None else "Gust evidence unavailable"),
        forecast_trend=trend,
        recommendations=[recommendation],
        warnings=warnings,
    )
    return RiskEvidence(
        level=level,
        reason=f"ORCA heuristic assessment: {'; '.join(severe or caution) or 'no configured threshold exceeded'}." ,
        factors=severe or caution,
        safety_label=label,
        confidence=confidence,
        risk_score=score,
        freshness_status=cache_label,
        wave_status=f"{wave:.2f}m",
        wind_status=f"{wind:.1f} km/h",
        profile=profile,
        available_evidence=available,
        missing_evidence=missing,
        evidence_completeness=completeness,
    )
