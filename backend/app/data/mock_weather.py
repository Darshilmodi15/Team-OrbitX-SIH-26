"""Mock marine weather data provider."""
import hashlib
import random
from typing import Any, Dict


def get_weather(lat: float, lon: float, date: str) -> Dict[str, Any]:
    """
    Returns realistic mock marine weather data for a given latitude, longitude, and date.
    
    Returns a dictionary containing:
    - wave_height_m (float): Wave height in meters
    - wind_speed_kmh (float): Wind speed in km/h
    - forecast (str): Weather state ('clear', 'rainy', or 'stormy')
    - temperature_c (float): Sea surface/ambient temperature in Celsius
    - visibility_km (float): Visibility in kilometers
    """
    # Deterministic seed using coordinates and date for consistent mock results
    seed_str = f"{round(lat, 2)}_{round(lon, 2)}_{date}"
    seed = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest(), 16) % (10**8)
    rng = random.Random(seed)

    forecast_choices = ["clear", "clear", "rainy", "stormy"]
    forecast = rng.choice(forecast_choices)

    if forecast == "stormy":
        wave_height = round(rng.uniform(2.6, 4.2), 2)
        wind_speed = round(rng.uniform(42.0, 70.0), 1)
        temp_c = round(rng.uniform(22.0, 26.0), 1)
        visibility_km = round(rng.uniform(2.0, 5.0), 1)
    elif forecast == "rainy":
        wave_height = round(rng.uniform(1.6, 2.4), 2)
        wind_speed = round(rng.uniform(32.0, 46.0), 1)
        temp_c = round(rng.uniform(24.0, 27.5), 1)
        visibility_km = round(rng.uniform(5.5, 9.0), 1)
    else:  # clear
        wave_height = round(rng.uniform(0.6, 1.4), 2)
        wind_speed = round(rng.uniform(12.0, 32.0), 1)
        temp_c = round(rng.uniform(27.0, 31.5), 1)
        visibility_km = round(rng.uniform(12.0, 18.0), 1)

    return {
        "location": {"lat": lat, "lon": lon},
        "date": date,
        "wave_height_m": wave_height,
        "wind_speed_kmh": wind_speed,
        "forecast": forecast,
        "temperature_c": temp_c,
        "visibility_km": visibility_km,
    }
