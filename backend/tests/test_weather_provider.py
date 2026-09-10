"""Unit and integration tests for Open-Meteo live marine weather provider."""
import unittest
from unittest.mock import patch
import httpx

from app.data.weather.open_meteo import (
    OpenMeteoWeatherProvider,
    _wmo_code_to_forecast,
)
from app.agents.weather_agent import get_marine_weather
from app.models.agent_models import WeatherEvidence


class TestOpenMeteoWeatherProvider(unittest.TestCase):
    """Test suite for OpenMeteo live marine weather provider."""

    def test_wmo_code_mapping(self):
        """Validates meteorological code conversions."""
        self.assertEqual(_wmo_code_to_forecast(0), "clear")
        self.assertEqual(_wmo_code_to_forecast(2), "partly cloudy")
        self.assertEqual(_wmo_code_to_forecast(51), "light drizzle")
        self.assertEqual(_wmo_code_to_forecast(63), "moderate rain")
        self.assertEqual(_wmo_code_to_forecast(95), "stormy")
        self.assertEqual(_wmo_code_to_forecast(None), "unavailable")

    def test_open_meteo_live_or_fallback_structure(self):
        """Validates that get_weather returns compliant dictionary structure."""
        provider = OpenMeteoWeatherProvider(timeout_seconds=4.0)
        data = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-24")

        self.assertIn("wave_height_m", data)
        self.assertTrue(data["wave_height_m"] is None or isinstance(data["wave_height_m"], (int, float)))
        self.assertIn("wind_speed_kmh", data)
        self.assertTrue(data["wind_speed_kmh"] is None or isinstance(data["wind_speed_kmh"], (int, float)))
        self.assertIn("forecast", data)
        self.assertIsInstance(data["forecast"], str)
        self.assertIn("source", data)
        self.assertIn(data["source"], ["open_meteo_marine_api"])

    def test_open_meteo_graceful_fallback_on_network_error(self):
        """Validates unavailable values when network fails."""
        provider = OpenMeteoWeatherProvider(timeout_seconds=1.0)

        with patch("httpx.Client.get", side_effect=httpx.ConnectTimeout("Network unreachable")):
            data = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-24")

            self.assertFalse(data.get("is_mock"))
            self.assertEqual(data.get("cache_status"), "unavailable")
            self.assertIsNone(data["wave_height_m"])
            self.assertIsNone(data["wind_speed_kmh"])
            self.assertIn("wave_height_m", data)
            self.assertIn("wind_speed_kmh", data)

    def test_weather_agent_integration_with_open_meteo(self):
        """Validates that WeatherAgent correctly packages live data into WeatherEvidence."""
        provider = OpenMeteoWeatherProvider(timeout_seconds=4.0)
        evidence = get_marine_weather(provider=provider, lat=18.9220, lon=72.8347, date="2026-08-24")

        self.assertIsInstance(evidence, WeatherEvidence)
        self.assertTrue(evidence.wave_height_m is None or evidence.wave_height_m >= 0)
        self.assertTrue(evidence.wind_speed_kmh is None or evidence.wind_speed_kmh >= 0)
        self.assertIn(evidence.source, ["open_meteo_marine_api"])

    def test_failure_is_not_cached_as_success(self):
        provider = OpenMeteoWeatherProvider()
        with patch("httpx.Client.get", side_effect=httpx.ConnectError("offline")) as request:
            provider.get_weather(19, 72, "2026-09-09")
            provider.get_weather(19, 72, "2026-09-09")
        self.assertEqual(request.call_count, 4)
