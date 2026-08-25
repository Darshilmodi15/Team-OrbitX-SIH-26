"""
Tests for ORCA Marine Weather Resilient Regional Caching & Data Freshness Engine.
Tests multi-tier cache hits, misses, staleness fallback, expiration, and provider resilience.
"""
from datetime import datetime, timezone
import time
import unittest
from unittest.mock import MagicMock, patch

from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import IncoisWeatherProvider


class TestResilientRegionalCache(unittest.TestCase):
    def setUp(self):
        # 0.05° grid, 1.0 sec fresh TTL for fast unit testing, 3.0 sec max stale TTL
        self.cache = MarineWeatherCache(
            grid_resolution_deg=0.05,
            fresh_ttl_seconds=1.0,
            max_stale_seconds=3.0,
        )

    def test_grid_cell_normalization_and_region_labeling(self):
        """Tests that nearby GPS coordinates map to the same grid cell and regional tag."""
        # Mumbai Harbor: 18.9220, 72.8347
        # Nearby vessel: 18.9245, 72.8310
        key1 = self.cache.get_grid_key(18.9220, 72.8347)
        key2 = self.cache.get_grid_key(18.9245, 72.8310)
        self.assertEqual(key1, key2)

        reg_cell = self.cache.get_region_cell(18.9220, 72.8347)
        self.assertTrue(reg_cell.startswith("MH-MUM"))

        # Veraval Harbor: 20.9000, 70.3600
        veraval_cell = self.cache.get_region_cell(20.9000, 70.3600)
        self.assertTrue(veraval_cell.startswith("GJ-VER"))

    def test_cache_miss_then_set_then_fresh_hit(self):
        """Verifies cache miss -> store -> fresh cache hit with GOOD freshness tag."""
        lat, lon = 18.9220, 72.8347

        # 1. Initial lookup -> miss
        data, status = self.cache.get(lat, lon)
        self.assertIsNone(data)
        self.assertEqual(status, "miss")

        # 2. Store live response
        payload = {
            "wave_height_m": 1.45,
            "wind_speed_kmh": 18.0,
            "forecast": "moderate",
            "source": "INCOIS_OSF_WW3",
        }
        self.cache.set(lat, lon, payload, forecast_time="2026-08-25T10:00:00Z")

        # 3. Retrieve fresh hit
        cached_res, status = self.cache.get(lat, lon)
        self.assertIsNotNone(cached_res)
        self.assertEqual(status, "fresh")
        self.assertEqual(cached_res["cache_status"], "cached")
        self.assertEqual(cached_res["freshness"], "GOOD")
        self.assertFalse(cached_res["is_stale"])
        self.assertEqual(cached_res["wave_height_m"], 1.45)
        self.assertIn("region_cell", cached_res)

    def test_cache_staleness_fallback_and_warning(self):
        """Verifies that after fresh TTL expires, stale cache is served with explicit warning."""
        lat, lon = 18.9220, 72.8347
        payload = {
            "wave_height_m": 1.20,
            "wind_speed_kmh": 15.0,
            "forecast": "calm",
        }
        self.cache.set(lat, lon, payload)

        # Wait for fresh TTL (1.0 sec) to expire, but within max_stale (3.0 sec)
        time.sleep(1.1)

        cached_res, status = self.cache.get(lat, lon, allow_stale=True)
        self.assertIsNotNone(cached_res)
        self.assertEqual(status, "stale")
        self.assertEqual(cached_res["cache_status"], "stale")
        self.assertEqual(cached_res["freshness"], "ACCEPTABLE_STALE")
        self.assertTrue(cached_res["is_stale"])
        self.assertIn("warning", cached_res)
        self.assertIn("cached forecast", cached_res["warning"])

    def test_cache_expiration_beyond_max_stale(self):
        """Verifies that past max_stale, data is discarded and returned as miss."""
        lat, lon = 18.9220, 72.8347
        self.cache.set(lat, lon, {"wave_height_m": 1.0})

        # Wait past max_stale (3.0 sec)
        time.sleep(3.1)

        cached_res, status = self.cache.get(lat, lon, allow_stale=True)
        self.assertIsNone(cached_res)
        self.assertEqual(status, "miss")

    def test_hit_rate_telemetry(self):
        """Tests calculation of hit rate percentages."""
        lat, lon = 18.9220, 72.8347
        self.cache.get(lat, lon)  # miss
        self.cache.set(lat, lon, {"wave_height_m": 1.0})
        self.cache.get(lat, lon)  # hit
        self.cache.get(lat, lon)  # hit

        self.assertEqual(self.cache.hits_count, 2)
        self.assertEqual(self.cache.misses_count, 1)
        self.assertEqual(self.cache.get_hit_rate_pct(), 66.7)

    def test_provider_resilience_live_to_stale_fallback(self):
        """
        Tests end-to-end provider fallback:
        1. Live fetch succeeds and is cached.
        2. External provider fails on subsequent call -> provider returns stale cache with warning.
        """
        provider = IncoisWeatherProvider(cache=self.cache, timeout_sec=1.0)

        # 1. Successful initial fetch
        mock_csv = (
            "time,station,latitude,longitude,HS,UWND,VWND\n"
            "2026-08-25T10:00:00Z,Mumbai[18.920N_72.830E],18.900,72.800,1.35,4.0,2.0\n"
        )
        mock_resp = MagicMock(status_code=200, text=mock_csv)

        with patch("httpx.Client.get", return_value=mock_resp):
            live_res = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-25")

        self.assertEqual(live_res["cache_status"], "live")
        self.assertEqual(live_res["wave_height_m"], 1.35)

        # 2. Wait for fresh TTL to expire
        time.sleep(1.1)

        # 3. Simulate external INCOIS failure (network down / 500 error)
        fail_resp = MagicMock(status_code=503, text="Service Unavailable")
        with patch("httpx.Client.get", return_value=fail_resp):
            fallback_res = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-25")

        self.assertEqual(fallback_res["cache_status"], "stale")
        self.assertTrue(fallback_res["is_stale"])
        self.assertEqual(fallback_res["freshness"], "ACCEPTABLE_STALE")
        self.assertEqual(fallback_res["wave_height_m"], 1.35)
        self.assertIn("warning", fallback_res)

    def test_provider_resilience_when_no_cache_exists(self):
        """Verifies graceful unavailable response when provider fails and no cached record exists."""
        clean_cache = MarineWeatherCache()
        provider = IncoisWeatherProvider(cache=clean_cache, timeout_sec=1.0)

        fail_resp = MagicMock(status_code=500, text="Internal Error")
        with patch("httpx.Client.get", return_value=fail_resp):
            res = provider.get_weather(lat=20.0, lon=70.0, date="2026-08-25")

        self.assertEqual(res["cache_status"], "unavailable")
        self.assertEqual(res["forecast"], "data_unavailable")
        self.assertEqual(res["wave_height_m"], 0.0)


if __name__ == "__main__":
    unittest.main()
