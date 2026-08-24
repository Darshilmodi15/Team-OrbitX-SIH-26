"""Unit and integration tests for IncoisWeatherProvider."""
from datetime import datetime, timezone
import math
from unittest.mock import MagicMock, patch
import httpx
import pytest

from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import (
    IncoisWeatherProvider,
    derive_forecast_condition,
    uv_to_speed_and_direction,
)


def test_uv_to_speed_and_direction_calm():
    speed, deg, cardinal = uv_to_speed_and_direction(0.0, 0.0)
    assert speed == 0.0
    assert deg == 0.0
    assert cardinal == "Calm"


def test_uv_to_speed_and_direction_westerly():
    # Eastward wind (u=10, v=0) means wind blows FROM the west (270 degrees, W)
    speed, deg, cardinal = uv_to_speed_and_direction(10.0, 0.0)
    assert speed == 10.0
    assert deg == 270.0
    assert cardinal == "W"


def test_uv_to_speed_and_direction_south_westerly():
    # u=5, v=5 means wind blowing towards NE, so FROM SW (225 degrees)
    speed, deg, cardinal = uv_to_speed_and_direction(5.0, 5.0)
    assert math.isclose(speed, 7.07, rel_tol=1e-2)
    assert deg == 225.0
    assert cardinal == "SW"


def test_derive_forecast_condition():
    assert derive_forecast_condition(wave_height_m=3.2, wind_speed_kmh=40.0) == "stormy"
    assert derive_forecast_condition(wave_height_m=1.0, wind_speed_kmh=55.0) == "stormy"
    assert derive_forecast_condition(wave_height_m=2.0, wind_speed_kmh=30.0) == "choppy / moderate"
    assert derive_forecast_condition(wave_height_m=0.8, wind_speed_kmh=15.0) == "calm / clear"


def test_incois_provider_mocked_ncss_success():
    """Verifies NCSS CSV response parsing and evidence normalization."""
    mock_csv = (
        "time,station,latitude[unit=\"degrees_north\"],longitude[unit=\"degrees_east\"],HS[unit=\"\"],UWND[unit=\"\"],VWND[unit=\"\"]\n"
        "2026-08-24T15:00:00Z,GridPointRequestedAt[18.920N_72.830E],18.900,72.800,0.75,5.0,2.5\n"
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv

    cache = MarineWeatherCache()
    provider = IncoisWeatherProvider(cache=cache, timeout_sec=2.0)

    with patch("httpx.Client.get", return_value=mock_resp):
        res = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-24")

    assert res["is_mock"] is False
    assert res["source"] == "INCOIS_OSF_WW3"
    assert res["wave_height_m"] == 0.75
    assert res["wind_speed_ms"] == round(math.hypot(5.0, 2.5), 2)
    assert res["wind_speed_kmh"] == round(res["wind_speed_ms"] * 3.6, 1)
    assert res["forecast_time"] == "2026-08-24T15:00:00Z"
    assert res["cache_status"] == "live"
    assert res["resolution_method"] == "exact"
    assert res["grid_lat"] == 18.900
    assert res["grid_lon"] == 72.800

    # Second call should be served from cache
    cached_res = provider.get_weather(lat=18.9220, lon=72.8347, date="2026-08-24")
    assert cached_res["cache_status"] == "cached"
    assert cached_res["wave_height_m"] == 0.75


def test_incois_provider_timeout_fallback_to_stale():
    """When live fetch times out, provider returns stale cached record if available."""
    cache = MarineWeatherCache(fresh_ttl_seconds=0.01, max_stale_seconds=3600)
    provider = IncoisWeatherProvider(cache=cache, timeout_sec=1.0)

    # Populate cache
    cache.set(
        18.92, 72.83,
        {
            "location": {"lat": 18.92, "lon": 72.83},
            "wave_height_m": 1.25,
            "wind_speed_ms": 7.0,
            "wind_speed_kmh": 25.2,
            "wind_direction_cardinal": "WSW",
            "forecast": "moderate",
            "source": "INCOIS_OSF_WW3",
            "is_mock": False,
        },
        forecast_time="2026-08-24T12:00:00Z",
    )

    import time
    time.sleep(0.02)

    # Force live fetch to raise timeout
    with patch("httpx.Client.get", side_effect=httpx.ConnectTimeout("INCOIS server timeout")):
        res = provider.get_weather(lat=18.92, lon=72.83, date="2026-08-24")

    assert res["is_mock"] is False
    assert res["wave_height_m"] == 1.25
    assert res["cache_status"] == "stale"
    assert res["is_stale"] is True


def test_incois_provider_timeout_no_cache_returns_unavailable():
    """When live fetch times out and no cache exists, return explicit data_unavailable (never fake values)."""
    cache = MarineWeatherCache()
    provider = IncoisWeatherProvider(cache=cache, timeout_sec=1.0)

    with patch("httpx.Client.get", side_effect=httpx.ConnectTimeout("INCOIS server timeout")):
        res = provider.get_weather(lat=18.92, lon=72.83, date="2026-08-24")

    assert res["is_mock"] is False
    assert res["source"] == "INCOIS_OSF_WW3"
    assert res["cache_status"] == "unavailable"
    assert res["forecast"] == "data_unavailable"
    assert res["wave_height_m"] == 0.0
    assert res["wind_speed_ms"] == 0.0


def test_incois_provider_landmask_radial_search():
    """When exact coordinate is on land (NaN), provider radial searches nearest ocean cell."""
    nan_csv = "time,latitude,longitude,HS,UWND,VWND\n2026-08-24T15:00:00Z,20.900,70.360,NaN,NaN,NaN\n"
    ocean_csv = "time,latitude,longitude,HS,UWND,VWND\n2026-08-24T15:00:00Z,20.900,70.300,1.65,5.2,1.1\n"

    def side_effect(url, params=None, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if params and "70.360" in params.get("longitude", ""):
            resp.text = nan_csv
        else:
            resp.text = ocean_csv
        return resp

    cache = MarineWeatherCache()
    provider = IncoisWeatherProvider(cache=cache, timeout_sec=2.0)

    with patch("httpx.Client.get", side_effect=side_effect):
        res = provider.get_weather(lat=20.90, lon=70.36, date="2026-08-24")

    assert res["is_mock"] is False
    assert res["wave_height_m"] == 1.65
    assert "nearest_marine_cell" in res["resolution_method"]
