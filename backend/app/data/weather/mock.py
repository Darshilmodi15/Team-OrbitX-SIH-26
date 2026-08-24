"""Mock marine weather data provider implementing the WeatherProvider interface."""
import hashlib
import random
from typing import Any, Dict, List

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
        """
        seed_str = f"{round(lat, 2)}_{round(lon, 2)}_{date}"
        seed = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest(), 16) % (10**8)
        rng = random.Random(seed)

        forecast_choices = ["clear", "clear", "rainy", "stormy"]
        forecast = rng.choice(forecast_choices)

        wave_dir_deg = round(rng.uniform(220.0, 290.0), 1)
        wind_dir_deg = round(rng.uniform(210.0, 300.0), 1)

        if forecast == "stormy":
            wave_height = round(rng.uniform(2.6, 4.2), 2)
            wave_period = round(rng.uniform(4.5, 6.5), 1)  # short steep waves
            wind_speed = round(rng.uniform(42.0, 70.0), 1)
            wind_gusts = round(wind_speed * rng.uniform(1.3, 1.6), 1)
            temp_c = round(rng.uniform(22.0, 26.0), 1)
            visibility_km = round(rng.uniform(2.0, 4.5), 1)
            cloud_pct = round(rng.uniform(85.0, 100.0), 1)
            precip_mm = round(rng.uniform(15.0, 45.0), 1)
        elif forecast == "rainy":
            wave_height = round(rng.uniform(1.6, 2.4), 2)
            wave_period = round(rng.uniform(6.0, 8.0), 1)
            wind_speed = round(rng.uniform(32.0, 46.0), 1)
            wind_gusts = round(wind_speed * rng.uniform(1.2, 1.4), 1)
            temp_c = round(rng.uniform(24.0, 27.5), 1)
            visibility_km = round(rng.uniform(5.5, 9.0), 1)
            cloud_pct = round(rng.uniform(60.0, 85.0), 1)
            precip_mm = round(rng.uniform(2.0, 12.0), 1)
        else:  # clear
            wave_height = round(rng.uniform(0.6, 1.4), 2)
            wave_period = round(rng.uniform(7.5, 10.5), 1)
            wind_speed = round(rng.uniform(12.0, 28.0), 1)
            wind_gusts = round(wind_speed * rng.uniform(1.15, 1.3), 1)
            temp_c = round(rng.uniform(27.0, 31.5), 1)
            visibility_km = round(rng.uniform(12.0, 18.0), 1)
            cloud_pct = round(rng.uniform(5.0, 25.0), 1)
            precip_mm = 0.0

        # Forecast horizon for trend
        forecast_horizon: List[Dict[str, Any]] = []
        for offset in range(1, 7):
            forecast_horizon.append({
                "hour_offset": offset,
                "wave_height_m": round(max(0.4, wave_height + rng.uniform(-0.2, 0.3)), 2),
                "wind_speed_kmh": round(max(5.0, wind_speed + rng.uniform(-4.0, 6.0)), 1),
                "wind_gust_kmh": round(max(10.0, wind_gusts + rng.uniform(-5.0, 8.0)), 1),
                "forecast": forecast,
            })

        cloud_category = "Clear" if cloud_pct <= 20 else "Partly Cloudy" if cloud_pct <= 50 else "Cloudy" if cloud_pct <= 80 else "Overcast"
        visibility_category = "Good" if visibility_km >= 10.0 else "Reduced" if visibility_km >= 5.0 else "Poor"

        return {
            "location": {"lat": lat, "lon": lon},
            "date": date,
            "wave_height_m": wave_height,
            "wave_period_s": wave_period,
            "wave_direction_deg": wave_dir_deg,
            "wave_direction_cardinal": "WSW",
            "wind_speed_kmh": wind_speed,
            "wind_speed_ms": round(wind_speed / 3.6, 2),
            "wind_gust_kmh": wind_gusts,
            "wind_direction_deg": wind_dir_deg,
            "wind_direction_cardinal": "W",
            "cloud_cover_pct": cloud_pct,
            "cloud_category": cloud_category,
            "visibility_km": visibility_km,
            "visibility_category": visibility_category,
            "precipitation_mm": precip_mm,
            "temperature_c": temp_c,
            "sea_surface_temperature_c": round(temp_c + 0.8, 1),
            "forecast": forecast,
            "forecast_horizon": forecast_horizon,
            "source": "mock_marine_weather",
            "is_mock": True,
        }
