"""Marine safety risk assessment agent."""
from typing import Any, Dict, List, Union
from app.models.agent_models import (
    MarineRiskProfile,
    RiskComponentItem,
    RiskEvidence,
    WeatherEvidence,
)


def assess_risk(weather_input: Union[WeatherEvidence, Dict[str, Any]]) -> RiskEvidence:
    """
    Assesses maritime safety risk based on WeatherEvidence.
    
    Returns a structured RiskEvidence object with:
    - 'level': "safe", "caution", or "unsafe"
    - 'reason': detailed rationale for the safety classification
    - 'factors': list of specific parameters and thresholds triggered
    - 'profile': MarineRiskProfile with decomposed risks and trends
    - 'source': "risk_assessment_agent"
    """
    if isinstance(weather_input, WeatherEvidence):
        wave_height = weather_input.wave_height_m
        wind_speed = weather_input.wind_speed_kmh
        wave_period = weather_input.wave_period_s or 7.0
        wind_gust = weather_input.wind_gust_kmh or (wind_speed * 1.3)
        forecast = weather_input.forecast.strip().lower()
        horizon = weather_input.forecast_horizon or []
        cache_status = weather_input.cache_status or "live"
    else:
        wave_height = float(weather_input.get("wave_height_m", 0.0))
        wind_speed = float(weather_input.get("wind_speed_kmh", 0.0))
        wave_period = float(weather_input.get("wave_period_s", 7.0))
        wind_gust = float(weather_input.get("wind_gust_kmh", wind_speed * 1.3))
        forecast = str(weather_input.get("forecast", "")).strip().lower()
        horizon = weather_input.get("forecast_horizon", [])
        cache_status = str(weather_input.get("cache_status", "live"))

    severe_triggers: List[str] = []
    caution_triggers: List[str] = []
    warnings: List[str] = []
    recommendations: List[str] = []

    # Check forecast horizon trend
    forecast_trend = "stable"
    if horizon and len(horizon) >= 2:
        last_wave = horizon[-1].get("wave_height_m", wave_height)
        if last_wave > wave_height + 0.5 or last_wave >= 2.0:
            forecast_trend = "deteriorating"
            caution_triggers.append("6-hour forecast shows deteriorating sea conditions")
            warnings.append("Deteriorating forecast trend over the next 4-6 hours")
        elif last_wave < wave_height - 0.5:
            forecast_trend = "improving"

    # Check steep chop / wave period penalty
    is_steep_chop = (wave_period < 5.5) and (wave_height >= 1.2)
    if is_steep_chop:
        caution_triggers.append(f"short wave period ({wave_period:.1f}s) indicates steep chop")
        warnings.append(f"Steep chop detected due to short wave period ({wave_period:.1f}s)")

    # Check unsafe thresholds
    if wave_height > 2.5:
        severe_triggers.append(f"wave height of {wave_height:.2f}m exceeds severe limit (>2.5m)")
        warnings.append(f"Severe wave height ({wave_height:.2f}m) exceeds craft limit")
    if wind_speed > 50.0:
        severe_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds severe limit (>50 km/h)")
        warnings.append(f"Gale wind speed ({wind_speed:.1f} km/h)")
    if wind_gust > 60.0:
        severe_triggers.append(f"wind gusts of {wind_gust:.1f} km/h exceed safe limits (>60 km/h)")
        warnings.append(f"Dangerous wind gusts ({wind_gust:.1f} km/h)")
    if forecast == "stormy":
        severe_triggers.append("forecast indicates severe storm conditions")
        warnings.append("Storm forecast in coastal sector")

    # Component evaluations
    wave_risk_level = "HIGH" if wave_height > 2.5 else ("MODERATE" if (wave_height > 1.5 or is_steep_chop) else "LOW")
    wind_risk_level = "HIGH" if wind_speed > 50.0 else ("MODERATE" if wind_speed > 35.0 else "LOW")
    storm_risk_level = "HIGH" if forecast == "stormy" else ("MODERATE" if forecast == "rainy" else "LOW")
    gust_risk_level = "HIGH" if wind_gust > 60.0 else ("MODERATE" if wind_gust > 40.0 else "LOW")

    cache_stat = "LIVE" if cache_status == "live" else ("CACHED" if cache_status == "cached" else "STALE")
    wave_status = "High Wave Danger (>2.5m)" if wave_height > 2.5 else ("Moderate Swell (1.5-2.5m)" if wave_height > 1.5 else "Calm / Safe (<=1.5m)")
    wind_status = "Gale Wind Hazard (>50 km/h)" if wind_speed > 50.0 else ("Breezy / Elevated (40-50 km/h)" if wind_speed > 40.0 else "Gentle / Moderate (<=40 km/h)")

    if severe_triggers:
        score = min(1.0, 0.75 + (max(0, wave_height - 2.5) * 0.1) + (max(0, wind_speed - 50.0) * 0.005))
        recommendations.append("Suspend all departures; return to harbor immediately.")
        profile = MarineRiskProfile(
            overall="HIGH",
            status_label="UNSAFE",
            wave_risk=RiskComponentItem(level=wave_risk_level, score=0.85, description="Dangerous wave action"),
            wind_risk=RiskComponentItem(level=wind_risk_level, score=0.85, description="Severe gale winds"),
            storm_risk=RiskComponentItem(level=storm_risk_level, score=0.90, description="Squall / storm activity"),
            gust_risk=RiskComponentItem(level=gust_risk_level, score=0.85, description="High peak gusts"),
            forecast_trend=forecast_trend,
            recommendations=recommendations,
            warnings=warnings,
        )
        return RiskEvidence(
            level="unsafe",
            reason=f"UNSAFE FOR SAILING: {'; '.join(severe_triggers)}. Sea venturing is strictly discouraged.",
            factors=severe_triggers,
            safety_label="UNSAFE — SEVERE HAZARD",
            confidence="HIGH (Authoritative INCOIS Model Coverage)",
            risk_score=round(score, 2),
            freshness_status=cache_stat,
            wave_status=wave_status,
            wind_status=wind_status,
            profile=profile,
            source="risk_assessment_agent",
        )

    # Check caution thresholds (wave_height_m > 1.5 or wind_speed_kmh > 40 or rainy or steep chop)
    if wave_height > 1.5:
        caution_triggers.append(f"wave height of {wave_height:.2f}m exceeds safety threshold (>1.5m)")
        warnings.append(f"Elevated wave height of {wave_height:.2f}m")
    if wind_speed > 40.0:
        caution_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds safety threshold (>40 km/h)")
        warnings.append(f"Strong winds of {wind_speed:.1f} km/h")
    if forecast == "rainy":
        caution_triggers.append("reduced visibility and squall risks due to rain")
        warnings.append("Rain and localized squall risks")

    if caution_triggers:
        score = 0.40 + (max(0, wave_height - 1.5) * 0.25)
        recommendations.append("Remain within 5 nautical miles of coastline and monitor VHF Channel 16.")
        profile = MarineRiskProfile(
            overall="MODERATE",
            status_label="CAUTION",
            wave_risk=RiskComponentItem(level=wave_risk_level, score=0.55, description="Moderate swell/chop"),
            wind_risk=RiskComponentItem(level=wind_risk_level, score=0.50, description="Fresh to strong breeze"),
            storm_risk=RiskComponentItem(level=storm_risk_level, score=0.40, description="Squall possibility"),
            gust_risk=RiskComponentItem(level=gust_risk_level, score=0.45, description="Moderate gusts"),
            forecast_trend=forecast_trend,
            recommendations=recommendations,
            warnings=warnings,
        )
        return RiskEvidence(
            level="caution",
            reason=f"CAUTION ADVISED: {'; '.join(caution_triggers)}. Small crafts should exercise heightened vigilance.",
            factors=caution_triggers,
            safety_label="CAUTION ADVISED",
            confidence="HIGH (Authoritative INCOIS Model Coverage)",
            risk_score=round(min(0.74, score), 2),
            freshness_status=cache_stat,
            wave_status=wave_status,
            wind_status=wind_status,
            profile=profile,
            source="risk_assessment_agent",
        )

    # Safe conditions
    score = round(max(0.05, (wave_height / 1.5) * 0.30), 2)
    recommendations.append("Conditions are optimal for fishing operations.")
    profile = MarineRiskProfile(
        overall="LOW",
        status_label="SAFE",
        wave_risk=RiskComponentItem(level="LOW", score=0.2, description="Calm sea state"),
        wind_risk=RiskComponentItem(level="LOW", score=0.2, description="Gentle breeze"),
        storm_risk=RiskComponentItem(level="LOW", score=0.1, description="Clear sky"),
        gust_risk=RiskComponentItem(level="LOW", score=0.2, description="Light gusts"),
        forecast_trend=forecast_trend,
        recommendations=recommendations,
        warnings=[],
    )
    return RiskEvidence(
        level="safe",
        reason=f"SAFE TO SAIL: Wave height is {wave_height:.2f}m (<=1.5m), wind speed is {wind_speed:.1f} km/h (<=40 km/h), with {forecast} forecast. Normal marine and fishing activities may proceed.",
        factors=[
            f"wave_height={wave_height:.2f}m (<=1.5m)",
            f"wind_speed={wind_speed:.1f} km/h (<=40 km/h)",
            f"forecast='{forecast}'",
        ],
        safety_label="SAFE TO VENTURE",
        confidence="HIGH (Authoritative INCOIS Model Coverage)",
        risk_score=score,
        freshness_status=cache_stat,
        wave_status=wave_status,
        wind_status=wind_status,
        profile=profile,
        source="risk_assessment_agent",
    )
