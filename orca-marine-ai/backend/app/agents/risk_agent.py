"""Marine safety risk assessment agent."""
from typing import Any, Dict, Tuple


def assess_risk(weather_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Assesses maritime safety risk based on weather parameters.
    
    Returns a dictionary with:
    - 'level': "safe", "caution", or "unsafe"
    - 'reason': detailed rationale for the safety classification
    
    Decision rules:
    - 'unsafe': wave_height_m > 2.5 or wind_speed_kmh > 50 or stormy weather
    - 'caution': wave_height_m > 1.5 or wind_speed_kmh > 40 or rainy weather
    - 'safe': wave_height_m <= 1.5 and wind_speed_kmh <= 40 with calm/clear weather
    """
    wave_height = float(weather_data.get("wave_height_m", 0.0))
    wind_speed = float(weather_data.get("wind_speed_kmh", 0.0))
    forecast = str(weather_data.get("forecast", "")).strip().lower()

    severe_triggers = []
    caution_triggers = []

    # Check unsafe thresholds
    if wave_height > 2.5:
        severe_triggers.append(f"wave height of {wave_height:.2f}m exceeds severe limit (>2.5m)")
    if wind_speed > 50.0:
        severe_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds severe limit (>50 km/h)")
    if forecast == "stormy":
        severe_triggers.append("forecast indicates severe storm conditions")

    if severe_triggers:
        return {
            "level": "unsafe",
            "reason": (
                f"UNSAFE FOR NAVIGATION: {'; '.join(severe_triggers)}. "
                "Sea venturing is strictly discouraged."
            ),
        }

    # Check caution thresholds (wave_height_m > 1.5 or wind_speed_kmh > 40)
    if wave_height > 1.5:
        caution_triggers.append(f"wave height of {wave_height:.2f}m exceeds safety threshold (>1.5m)")
    if wind_speed > 40.0:
        caution_triggers.append(f"wind speed of {wind_speed:.1f} km/h exceeds safety threshold (>40 km/h)")
    if forecast == "rainy":
        caution_triggers.append("reduced visibility and squall risks due to rain")

    if caution_triggers:
        return {
            "level": "caution",
            "reason": (
                f"CAUTION ADVISED: {'; '.join(caution_triggers)}. "
                "Small crafts and artisanal fishing vessels should remain near coast or delay departure."
            ),
        }

    # Safe conditions
    return {
        "level": "safe",
        "reason": (
            f"SAFE CONDITIONS: Wave height is {wave_height:.2f}m (<=1.5m), "
            f"wind speed is {wind_speed:.1f} km/h (<=40 km/h), with {forecast} forecast. "
            "Normal marine and fishing activities may proceed."
        ),
    }
