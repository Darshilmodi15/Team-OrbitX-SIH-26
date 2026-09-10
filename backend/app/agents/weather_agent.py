"""Marine weather agent responsible for retrieving and structuring meteorological evidence."""
from typing import Any, Dict, Optional
import math
from app.data.weather.base import WeatherProvider
from app.models.agent_models import WeatherEvidence


def get_marine_weather(
    provider: WeatherProvider,
    lat: float,
    lon: float,
    date: str,
    time_hint: Optional[str] = None,
    temporal_res: Optional[Any] = None,
) -> WeatherEvidence:
    """
    Fetches marine weather from the underlying provider and formats it into a WeatherEvidence contract.
    Preserves data provenance, three distinct timestamps (issued_at, forecast_valid_at, retrieved_at),
    wave periods, gusts, cloud cover, visibility, and forecast horizons.
    """
    raw: Dict[str, Any] = provider.get_weather(
        lat=lat,
        lon=lon,
        date=date,
        time_hint=time_hint,
        temporal_res=temporal_res,
    )
    is_mock = bool(raw.get("is_mock", True))
    source = str(raw.get("source", "mock_marine_weather" if is_mock else "open_meteo_marine_api"))
    
    def number(key):
        value = raw.get(key)
        if value is None or isinstance(value, bool):
            return None
        try:
            value = float(value)
            return value if math.isfinite(value) and (value >= 0 or key in {"temperature_c", "sea_surface_temperature_c", "grid_lat", "grid_lon"}) else None
        except (ValueError, TypeError):
            return None

    f_valid = raw.get("forecast_valid_at") or raw.get("forecast_time")
    r_time = raw.get("retrieved_at") or raw.get("retrieval_time")

    return WeatherEvidence(
        forecast=str(raw.get("forecast") or "unavailable"),
        weather_code=raw.get("weather_code"),
        wave_height_m=number("wave_height_m"),
        wave_period_s=number("wave_period_s"),
        wave_direction_deg=number("wave_direction_deg"),
        wave_direction_cardinal=str(raw["wave_direction_cardinal"]) if raw.get("wave_direction_cardinal") is not None else None,
        
        wind_speed_kmh=number("wind_speed_kmh"),
        wind_speed_ms=number("wind_speed_ms"),
        wind_gust_kmh=number("wind_gust_kmh"),
        wind_direction_deg=number("wind_direction_deg"),
        wind_direction_cardinal=str(raw["wind_direction_cardinal"]) if raw.get("wind_direction_cardinal") is not None else None,
        
        cloud_cover_pct=number("cloud_cover_pct"),
        cloud_category=str(raw["cloud_category"]) if raw.get("cloud_category") is not None else None,
        
        visibility_km=number("visibility_km"),
        visibility_category=str(raw["visibility_category"]) if raw.get("visibility_category") is not None else None,
        precipitation_mm=number("precipitation_mm"),

        temperature_c=number("temperature_c"),
        sea_surface_temperature_c=number("sea_surface_temperature_c"),
        
        issued_at=str(raw["issued_at"]) if raw.get("issued_at") is not None else None,
        forecast_valid_at=str(f_valid) if f_valid is not None else None,
        retrieved_at=str(r_time) if r_time is not None else None,
        target_period=str(raw["target_period"]) if raw.get("target_period") is not None else None,
        
        forecast_time=str(f_valid) if f_valid is not None else None,
        retrieval_time=str(r_time) if r_time is not None else None,
        cache_status=str(raw["cache_status"]) if raw.get("cache_status") is not None else None,
        grid_lat=number("grid_lat"),
        grid_lon=number("grid_lon"),
        resolution_method=str(raw["resolution_method"]) if raw.get("resolution_method") is not None else None,
        data_age_sec=int(raw["data_age_sec"]) if raw.get("data_age_sec") is not None else None,
        
        forecast_horizon=raw.get("forecast_horizon"),
        source=source,
        is_mock=is_mock,
    )
