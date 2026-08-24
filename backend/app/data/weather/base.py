"""Abstract base class for marine weather data providers."""
from abc import ABC, abstractmethod
from typing import Any, Dict


class WeatherProvider(ABC):
    """
    Abstract interface for marine weather data providers.
    
    Designed to allow real marine datasets and meteorological APIs (such as INCOIS,
    Open-Meteo Marine, Copernicus Marine Service, or NOAA) to seamlessly replace
    mock implementations without modifying consuming agents or application pipelines.
    """

    @abstractmethod
    def get_weather(self, lat: float, lon: float, date: str) -> Dict[str, Any]:
        """
        Retrieves marine weather data for a specified geographic coordinate and date.

        Args:
            lat (float): Latitude coordinate in decimal degrees.
            lon (float): Longitude coordinate in decimal degrees.
            date (str): Date string in 'YYYY-MM-DD' format.

        Returns:
            Dict[str, Any]: Dictionary containing marine weather metrics:
                - 'location': {'lat': float, 'lon': float}
                - 'date': str
                - 'wave_height_m': float (significant wave height in meters)
                - 'wind_speed_kmh': float (wind speed in km/h)
                - 'forecast': str ('clear', 'rainy', 'stormy', etc.)
                - 'temperature_c': float (sea surface / ambient temperature)
                - 'visibility_km': float (visibility in kilometers)
        """
        pass
