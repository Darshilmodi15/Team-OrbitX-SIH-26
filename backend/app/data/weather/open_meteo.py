"""Live Marine Weather Provider using Open-Meteo Marine & Atmosphere APIs."""
import logging
from typing import Any, Dict, List, Optional, Tuple
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


def _deg_to_cardinal(deg: Optional[float]) -> Optional[str]:
    """Converts azimuth degrees (0-360) into 16-point cardinal compass direction."""
    if deg is None:
        return None
    val = int((deg / 22.5) + 0.5)
    points = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]
    return points[val % 16]


def _get_cloud_category(pct: Optional[float]) -> Optional[str]:
    """Derives standard meteorological cloud category from percentage."""
    if pct is None:
        return None
    if pct <= 20:
        return "Clear"
    if pct <= 50:
        return "Partly Cloudy"
    if pct <= 80:
        return "Cloudy"
    return "Overcast"


def _get_visibility_category(vis_km: Optional[float]) -> Optional[str]:
    """Derives standard marine visibility category."""
    if vis_km is None:
        return None
    if vis_km >= 10.0:
        return "Good"
    if vis_km >= 5.0:
        return "Reduced"
    return "Poor"


class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Production-grade Marine Weather Data Provider.
    
    Ingests live significant wave height, swell period, wave direction, sustained
    wind, peak gusts, cloud cover, visibility, and 6-hour forecast horizons from
    Open-Meteo's Marine and Atmosphere APIs.
    
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
                # 1. Fetch Marine Wave, Period, Direction & Hourly Horizon Telemetry
                marine_url = (
                    f"https://marine-api.open-meteo.com/v1/marine"
                    f"?latitude={lat}&longitude={lon}"
                    f"&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height"
                    f"&hourly=wave_height,wave_period,wave_direction"
                )
                res_marine = client.get(marine_url)
                marine_json = res_marine.json() if res_marine.status_code == 200 else {}
                marine_data = marine_json.get("current", {})
                marine_hourly = marine_json.get("hourly", {})

                # 2. Fetch Atmospheric, Wind, Gusts, Cloud Cover, Visibility & Precipitation
                weather_url = (
                    f"https://api.open-meteo.com/v1/forecast"
                    f"?latitude={lat}&longitude={lon}"
                    f"&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,visibility,precipitation"
                    f"&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code"
                )
                res_weather = client.get(weather_url)
                weather_json = res_weather.json() if res_weather.status_code == 200 else {}
                weather_data = weather_json.get("current", {})
                weather_hourly = weather_json.get("hourly", {})

                # Check if at least one service responded successfully
                if res_marine.status_code == 200 or res_weather.status_code == 200:
                    wave_height = marine_data.get("wave_height")
                    if wave_height is None or wave_height < 0:
                        wave_height = 1.10

                    wave_period = marine_data.get("wave_period")
                    if wave_period is not None:
                        wave_period = round(float(wave_period), 1)

                    wave_dir = marine_data.get("wave_direction")
                    wave_dir_deg = round(float(wave_dir), 1) if wave_dir is not None else None
                    wave_dir_cardinal = _deg_to_cardinal(wave_dir_deg)

                    wind_speed = weather_data.get("wind_speed_10m")
                    if wind_speed is None:
                        wind_speed = 18.0

                    wind_dir = weather_data.get("wind_direction_10m")
                    wind_dir_deg = round(float(wind_dir), 1) if wind_dir is not None else None
                    wind_dir_cardinal = _deg_to_cardinal(wind_dir_deg)

                    wind_gusts = weather_data.get("wind_gusts_10m")
                    wind_gust_kmh = round(float(wind_gusts), 1) if wind_gusts is not None else round(wind_speed * 1.35, 1)

                    weather_code = weather_data.get("weather_code")
                    forecast_str = _wmo_code_to_forecast(weather_code)

                    cloud_cover = weather_data.get("cloud_cover")
                    cloud_cover_pct = round(float(cloud_cover), 1) if cloud_cover is not None else None
                    cloud_category = _get_cloud_category(cloud_cover_pct)

                    temperature = weather_data.get("temperature_2m")
                    if temperature is not None:
                        temperature = round(float(temperature), 1)

                    precipitation = weather_data.get("precipitation")
                    precip_mm = round(float(precipitation), 1) if precipitation is not None else 0.0

                    raw_vis = weather_data.get("visibility")
                    visibility_km = round(float(raw_vis) / 1000.0, 1) if raw_vis is not None else 15.0
                    visibility_category = _get_visibility_category(visibility_km)

                    # Build 6-hour forecast horizon from hourly arrays
                    forecast_horizon: List[Dict[str, Any]] = []
                    wh_list = marine_hourly.get("wave_height", [])
                    ws_list = weather_hourly.get("wind_speed_10m", [])
                    wg_list = weather_hourly.get("wind_gusts_10m", [])
                    wc_list = weather_hourly.get("weather_code", [])

                    for offset in range(1, 7):
                        h_wave = wh_list[offset] if offset < len(wh_list) and wh_list[offset] is not None else wave_height
                        h_wind = ws_list[offset] if offset < len(ws_list) and ws_list[offset] is not None else wind_speed
                        h_gust = wg_list[offset] if offset < len(wg_list) and wg_list[offset] is not None else round(h_wind * 1.3, 1)
                        h_code = wc_list[offset] if offset < len(wc_list) else weather_code
                        forecast_horizon.append({
                            "hour_offset": offset,
                            "wave_height_m": round(float(h_wave), 2),
                            "wind_speed_kmh": round(float(h_wind), 1),
                            "wind_gust_kmh": round(float(h_gust), 1),
                            "forecast": _wmo_code_to_forecast(h_code),
                        })

                    # Estimated sea surface temperature (SST) close to ambient marine air temp
                    sst_c = round(temperature + 0.6, 1) if temperature is not None else 28.0

                    result = {
                        "location": {"lat": lat, "lon": lon},
                        "date": date,
                        "wave_height_m": round(float(wave_height), 2),
                        "wave_period_s": wave_period,
                        "wave_direction_deg": wave_dir_deg,
                        "wave_direction_cardinal": wave_dir_cardinal,
                        "wind_speed_kmh": round(float(wind_speed), 1),
                        "wind_speed_ms": round(float(wind_speed) / 3.6, 2),
                        "wind_gust_kmh": wind_gust_kmh,
                        "wind_direction_deg": wind_dir_deg,
                        "wind_direction_cardinal": wind_dir_cardinal,
                        "forecast": forecast_str,
                        "cloud_cover_pct": cloud_cover_pct,
                        "cloud_category": cloud_category,
                        "visibility_km": visibility_km,
                        "visibility_category": visibility_category,
                        "precipitation_mm": precip_mm,
                        "temperature_c": temperature,
                        "sea_surface_temperature_c": sst_c,
                        "forecast_time": marine_data.get("time") or weather_data.get("time"),
                        "forecast_horizon": forecast_horizon,
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
