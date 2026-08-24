"""Marine safety risk assessment agent."""
from typing import Any, Dict, List, Union
from app.models.agent_models import RiskEvidence, WeatherEvidence


def assess_risk(weather_input: Union[WeatherEvidence, Dict[str, Any]]) -> RiskEvidence:
    """
    Assesses maritime safety risk based on WeatherEvidence.
    
    Returns a structured RiskEvidence object with:
    - 'level': "safe", "caution", or "unsafe"
    - 'reason': detailed rationale for the safety classification
    - 'factors': list of specific parameters and thresholds triggered
    - 'source': "risk_assessment_agent"
    
    Decision rules:
    - 'unsafe': wave_height_m > 2.5 or wind_speed_kmh > 50 or stormy weather
    - 'caution': wave_height_m > 1.5 or wind_speed_kmh > 40 or rainy weather
    - 'safe': wave_height_m <= 1.5 and wind_speed_kmh <= 40 with calm/clear weather
    """
    if isinstance(weather_input, WeatherEvidence):
        wave_height = weather_input.wave_height_m
        wind_speed = weather_input.wind_speed_kmh
        forecast = weather_input.forecast.strip().lower()
    else:
        wave_height = float(weather_input.get("wave_height_m", 0.0))
        wind_speed = float(weather_input.get("wind_speed_kmh", 0.0))
        forecast = str(weather_input.get("forecast", "")).strip().lower()

    severe_triggers: List[str] = []
    caution_triggers: List[str] = []
    safe_factors: List[str] = [
        f"wave_height={wave_height:.2f}m (<=1.5m)",
        f"wind_speed={wind_speed:.1f} km/h (<=40 km/h)",
        f"forecast='{forecast}'",
    ]

    # Check unsafe thresholds
    if wave_height > 2.5:
        severe_triggers.append(f"wave height of {wave_height:.2f}m exceeds severe limit (>2.5m)")
    if wind_speed > 50.0:
        severe_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds severe limit (>50 km/h)")
    if forecast == "stormy":
        severe_triggers.append("forecast indicates severe storm conditions")

    if severe_triggers:
        return RiskEvidence(
            level="unsafe",
            reason=(
                f"UNSAFE FOR NAVIGATION: {'; '.join(severe_triggers)}. "
                "Sea venturing is strictly discouraged."
            ),
            factors=severe_triggers,
            source="risk_assessment_agent",
        )

    # Check caution thresholds (wave_height_m > 1.5 or wind_speed_kmh > 40)
    if wave_height > 1.5:
        caution_triggers.append(f"wave height of {wave_height:.2f}m exceeds safety threshold (>1.5m)")
    if wind_speed > 40.0:
        caution_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds safety threshold (>40 km/h)")
    if forecast == "rainy":
        caution_triggers.append("reduced visibility and squall risks due to rain")

    if caution_triggers:
        return RiskEvidence(
            level="caution",
            reason=(
                f"CAUTION ADVISED: {'; '.join(caution_triggers)}. "
                "Small crafts and artisanal fishing vessels should remain near coast or delay departure."
            ),
            factors=caution_triggers,
            source="risk_assessment_agent",
        )

    # Safe conditions
    return RiskEvidence(
        level="safe",
        reason=(
            f"SAFE CONDITIONS: Wave height is {wave_height:.2f}m (<=1.5m), "
            f"wind speed is {wind_speed:.1f} km/h (<=40 km/h), with {forecast} forecast. "
            "Normal marine and fishing activities may proceed."
        ),
        factors=safe_factors,
        source="risk_assessment_agent",
    )
