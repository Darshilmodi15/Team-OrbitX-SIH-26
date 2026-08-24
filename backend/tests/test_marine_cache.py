"""Unit tests for the MarineWeatherCache geospatial and temporal caching layer."""
import time
import pytest
from app.data.weather.cache import MarineWeatherCache


def test_cache_miss():
    cache = MarineWeatherCache(fresh_ttl_seconds=60, max_stale_seconds=300)
    data, status = cache.get(18.92, 72.83)
    assert data is None
    assert status == "miss"
    assert cache.size() == 0


def test_cache_set_and_hit():
    cache = MarineWeatherCache(fresh_ttl_seconds=60, max_stale_seconds=300)
    payload = {
        "wave_height_m": 0.85,
        "wind_speed_ms": 6.2,
        "wind_speed_kmh": 22.3,
        "wind_direction_cardinal": "WSW",
        "forecast": "calm / clear",
    }
    cache.set(18.9220, 72.8347, payload, forecast_time="2026-08-24T15:00:00Z", source="INCOIS_OSF_WW3")
    
    assert cache.size() == 1
    cached_data, status = cache.get(18.9220, 72.8347)
    assert status == "fresh"
    assert cached_data is not None
    assert cached_data["wave_height_m"] == 0.85
    assert cached_data["wind_speed_ms"] == 6.2
    assert cached_data["cache_status"] == "cached"
    assert cached_data["is_stale"] is False
    assert "retrieval_time" in cached_data


def test_nearby_geographic_grid_reuse():
    """Nearby coastal coordinates within 0.05 deg (~5.5 km) should map to the exact same cache cell."""
    cache = MarineWeatherCache(grid_resolution_deg=0.05, fresh_ttl_seconds=60)
    payload = {"wave_height_m": 1.12, "wind_speed_ms": 5.4, "wind_speed_kmh": 19.4}
    
    # Set for Vessel A at 18.918, 72.832
    cache.set(18.918, 72.832, payload, forecast_time="2026-08-24T15:00:00Z")
    
    # Query for Vessel B at 18.921, 72.834 (very close)
    cached_data, status = cache.get(18.921, 72.834)
    assert status == "fresh"
    assert cached_data is not None
    assert cached_data["wave_height_m"] == 1.12
    assert cache.size() == 1  # Only 1 unique grid bucket


def test_cache_staleness_and_expiry():
    # Cache with 0.1s fresh TTL and 0.5s max stale
    cache = MarineWeatherCache(fresh_ttl_seconds=0.1, max_stale_seconds=0.4)
    payload = {"wave_height_m": 0.9}
    cache.set(19.0, 72.0, payload)

    # Immediately fresh
    d1, s1 = cache.get(19.0, 72.0)
    assert s1 == "fresh"

    # Wait 0.15s -> should become stale
    time.sleep(0.15)
    d2, s2 = cache.get(19.0, 72.0, allow_stale=True)
    assert s2 == "stale"
    assert d2 is not None
    assert d2["is_stale"] is True
    assert d2["cache_status"] == "stale"

    # Without allow_stale -> miss
    d3, s3 = cache.get(19.0, 72.0, allow_stale=False)
    assert s3 == "miss"
    assert d3 is None

    # Wait past max_stale (0.4s) -> complete miss
    time.sleep(0.35)
    d4, s4 = cache.get(19.0, 72.0, allow_stale=True)
    assert s4 == "miss"
    assert d4 is None
