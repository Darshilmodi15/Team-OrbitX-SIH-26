"""Mock data providers for marine conditions and fishing zones."""
from app.data.mock_weather import get_weather
from app.data.mock_pfz import get_pfz_zones

__all__ = ["get_weather", "get_pfz_zones"]
