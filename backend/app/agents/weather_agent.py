"""Marine weather agent responsible for retrieving and structuring meteorological evidence."""
from typing import Any, Dict
from app.data.weather.base import WeatherProvider
from app.models.agent_models import WeatherEvidence


def get_marine_weather(
    provider: WeatherProvider,
    lat: float,
    lon: float,
    date: str,
) -> WeatherEvidence:
    """
    Fetches marine weather from the underlying provider and formats it into a WeatherEvidence contract.
    Preserves data provenance, source timestamps, wave periods, gusts, cloud cover, visibility, and forecast horizons.
    """
    raw: Dict[str, Any] = provider.get_weather(lat=lat, lon=lon, date=date)
    is_mock = bool(raw.get("is_mock", True))
    source = str(raw.get("source", "mock_marine_weather" if is_mock else "open_meteo_marine_api"))
    
    return WeatherEvidence(
        forecast=str(raw.get("forecast", "clear")),
        wave_height_m=float(raw.get("wave_height_m", 0.0)),
        wave_period_s=float(raw["wave_period_s"]) if raw.get("wave_period_s") is not None else None,
        wave_direction_deg=float(raw["wave_direction_deg"]) if raw.get("wave_direction_deg") is not None else None,
        wave_direction_cardinal=str(raw["wave_direction_cardinal"]) if raw.get("wave_direction_cardinal") is not None else None,
        
        wind_speed_kmh=float(raw.get("wind_speed_kmh", 0.0)),
        wind_speed_ms=float(raw["wind_speed_ms"]) if raw.get("wind_speed_ms") is not None else None,
        wind_gust_kmh=float(raw["wind_gust_kmh"]) if raw.get("wind_gust_kmh") is not None else None,
        wind_direction_deg=float(raw["wind_direction_deg"]) if raw.get("wind_direction_deg") is not None else None,
        wind_direction_cardinal=str(raw["wind_direction_cardinal"]) if raw.get("wind_direction_cardinal") is not None else None,
        
        cloud_cover_pct=float(raw["cloud_cover_pct"]) if raw.get("cloud_cover_pct") is not None else None,
        cloud_category=str(raw["cloud_category"]) if raw.get("cloud_category") is not None else None,
        
        visibility_km=float(raw["visibility_km"]) if raw.get("visibility_km") is not None else None,
        visibility_category=str(raw["visibility_category"]) if raw.get("visibility_category") is not None else None,
        precipitation_mm=float(raw["precipitation_mm"]) if raw.get("precipitation_mm") is not None else None,
        
        temperature_c=float(raw["temperature_c"]) if raw.get("temperature_c") is not None else None,
        sea_surface_temperature_c=float(raw["sea_surface_temperature_c"]) if raw.get("sea_surface_temperature_c") is not None else None,
        
        forecast_time=str(raw["forecast_time"]) if raw.get("forecast_time") is not None else None,
        retrieval_time=str(raw["retrieval_time"]) if raw.get("retrieval_time") is not None else None,
        cache_status=str(raw["cache_status"]) if raw.get("cache_status") is not None else None,
        grid_lat=float(raw["grid_lat"]) if raw.get("grid_lat") is not None else None,
        grid_lon=float(raw["grid_lon"]) if raw.get("grid_lon") is not None else None,
        resolution_method=str(raw["resolution_method"]) if raw.get("resolution_method") is not None else None,
        data_age_sec=int(raw["data_age_sec"]) if raw.get("data_age_sec") is not None else None,
        
        forecast_horizon=raw.get("forecast_horizon"),
        source=source,
        is_mock=is_mock,
    )
