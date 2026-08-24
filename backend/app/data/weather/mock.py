"""Mock marine weather data provider implementing the WeatherProvider interface."""
import hashlib
import random
from typing import Any, Dict

from app.data.weather.base import WeatherProvider


class MockWeatherProvider(WeatherProvider):
    """
    Mock marine weather data provider.
    
    Generates realistic, deterministic mock marine weather data based on geographic
    coordinates and date hashes. Implements the WeatherProvider interface to allow
    future replacement by real marine meteorological services (e.g. INCOIS).
    """

    def get_weather(self, lat: float, lon: float, date: str) -> Dict[str, Any]:
        """
        Returns realistic mock marine weather data for a given latitude, longitude, and date.
        
        Args:
            lat (float): Latitude coordinate.
            lon (float): Longitude coordinate.
            date (str): Date of forecast / inquiry ('YYYY-MM-DD').

        Returns:
            Dict[str, Any]: Marine weather metrics dictionary.
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
