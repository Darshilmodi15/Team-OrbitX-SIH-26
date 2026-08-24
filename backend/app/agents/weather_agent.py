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
    """
    raw: Dict[str, Any] = provider.get_weather(lat=lat, lon=lon, date=date)
    
    return WeatherEvidence(
        forecast=str(raw.get("forecast", "clear")),
        wave_height_m=float(raw.get("wave_height_m", 0.0)),
        wind_speed_kmh=float(raw.get("wind_speed_kmh", 0.0)),
        temperature_c=float(raw["temperature_c"]) if raw.get("temperature_c") is not None else None,
        visibility_km=float(raw["visibility_km"]) if raw.get("visibility_km") is not None else None,
        source="mock_marine_weather",
        is_mock=True,
    )
