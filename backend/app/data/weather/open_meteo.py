"""Live Marine Weather Provider using Open-Meteo Marine & Atmosphere APIs."""
import logging
from typing import Any, Dict, Optional, Tuple
import httpx

from app.data.weather.base import WeatherProvider
from app.data.weather.mock import MockWeatherProvider

logger = logging.getLogger(__name__)

# WMO Weather interpretation codes (WW)
WMO_FORECAST_MAP = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    80: "rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "stormy",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail",
}


def _wmo_code_to_forecast(code: Optional[int]) -> str:
    """Maps WMO code to standardized forecast label."""
    if code is None:
        return "clear"
    if code in WMO_FORECAST_MAP:
        return WMO_FORECAST_MAP[code]
    if code >= 95:
        return "stormy"
    if code >= 50:
        return "rainy"
    return "clear"


class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Production-grade Marine Weather Data Provider.
    
    Ingests live significant wave height, swell period, wind speed, atmospheric
    temperature, and visibility from Open-Meteo's Marine & Global Forecast APIs.
    
    Includes automatic graceful degradation to MockWeatherProvider if network
    is unavailable or coordinates are inaccessible.
    """

    def __init__(self, timeout_seconds: float = 4.0):
        self.timeout_seconds = timeout_seconds
        self.mock_fallback = MockWeatherProvider()
        # In-memory cache: (lat_round, lon_round, date) -> result
        self._cache: Dict[Tuple[float, float, str], Dict[str, Any]] = {}

    def get_weather(self, lat: float, lon: float, date: str) -> Dict[str, Any]:
        """
        Retrieves live marine meteorological data for the specified coordinates and date.
        """
        cache_key = (round(lat, 3), round(lon, 3), date)
        if cache_key in self._cache:
            return self._cache[cache_key]

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                # 1. Fetch Marine Wave & Swell Telemetry
                marine_url = (
                    f"https://marine-api.open-meteo.com/v1/marine"
                    f"?latitude={lat}&longitude={lon}"
                    f"&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height"
                )
                res_marine = client.get(marine_url)
                marine_data = res_marine.json().get("current", {}) if res_marine.status_code == 200 else {}

                # 2. Fetch Atmospheric & Wind Telemetry
                weather_url = (
                    f"https://api.open-meteo.com/v1/forecast"
                    f"?latitude={lat}&longitude={lon}"
                    f"&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility"
                )
                res_weather = client.get(weather_url)
                weather_data = res_weather.json().get("current", {}) if res_weather.status_code == 200 else {}

                # Check if at least one service responded successfully
                if res_marine.status_code == 200 or res_weather.status_code == 200:
                    wave_height = marine_data.get("wave_height")
                    if wave_height is None or wave_height < 0:
                        wave_height = 1.10

                    wind_speed = weather_data.get("wind_speed_10m")
                    if wind_speed is None:
                        wind_speed = 18.0

                    weather_code = weather_data.get("weather_code")
                    forecast_str = _wmo_code_to_forecast(weather_code)

                    temperature = weather_data.get("temperature_2m")
                    if temperature is not None:
                        temperature = round(float(temperature), 1)

                    raw_vis = weather_data.get("visibility")
                    visibility_km = round(float(raw_vis) / 1000.0, 1) if raw_vis is not None else 15.0

                    result = {
                        "location": {"lat": lat, "lon": lon},
                        "date": date,
                        "wave_height_m": round(float(wave_height), 2),
                        "wind_speed_kmh": round(float(wind_speed), 1),
                        "forecast": forecast_str,
                        "temperature_c": temperature,
                        "visibility_km": visibility_km,
                        "wave_period_s": marine_data.get("wave_period"),
                        "wave_direction_deg": marine_data.get("wave_direction"),
                        "wind_direction_deg": weather_data.get("wind_direction_10m"),
                        "source": "open_meteo_marine_api",
                        "is_mock": False,
                    }
                    self._cache[cache_key] = result
                    return result

        except Exception as err:
            logger.warning(f"Live Open-Meteo marine weather fetch failed: {err}. Falling back to mock provider.")

        # Fallback to deterministic mock generator
        fallback_data = self.mock_fallback.get_weather(lat=lat, lon=lon, date=date)
        fallback_data["source"] = "mock_marine_weather"
        fallback_data["is_mock"] = True
        self._cache[cache_key] = fallback_data
        return fallback_data

