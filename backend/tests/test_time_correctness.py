"""Unit tests for time correctness, future-date selection, timestamp separation, and cache isolation."""
from datetime import datetime, date, time, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest

from app.services.temporal import (
    resolve_query_time,
    verify_forecast_timestamp,
    TemporalResolution,
    IST,
    UTC,
)
from app.models.agent_models import WeatherEvidence
from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import IncoisWeatherProvider
from app.data.weather.open_meteo import OpenMeteoWeatherProvider


def test_resolve_query_time_tomorrow_morning():
    """Natural language query 'tomorrow morning near Veraval' resolves to tomorrow 06:00-12:00 IST."""
    base = datetime(2026, 9, 9, 14, 0, 0, tzinfo=IST)
    res = resolve_query_time("tomorrow morning near Veraval", base_time=base)
    
    assert res.target_date == "2026-09-10"
    assert res.period == "morning"
    assert res.is_future is True
    assert res.is_explicit_future is True
    
    # 06:00 to 12:00 IST is 00:30 to 06:30 UTC
    assert res.start_utc == datetime(2026, 9, 10, 0, 30, tzinfo=UTC)
    assert res.end_utc == datetime(2026, 9, 10, 6, 30, tzinfo=UTC)


def test_resolve_query_time_multilingual_indic():
    """Resolves Indic language terms: 'kale savare' (Gujarati), 'kal subah' (Hindi), 'naalai kaalai' (Tamil)."""
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    
    # Gujarati: kale savare
    res_gu = resolve_query_time("kale savare Veraval javanu che", base_time=base)
    assert res_gu.target_date == "2026-09-10"
    assert res_gu.period == "morning"
    assert res_gu.is_explicit_future is True
    
    # Hindi: kal subah
    res_hi = resolve_query_time("kal subah mausam kaisa rahega", base_time=base)
    assert res_hi.target_date == "2026-09-10"
    assert res_hi.period == "morning"
    assert res_hi.is_explicit_future is True
    
    # Tamil: naalai kaalai
    res_ta = resolve_query_time("naalai kaalai meen pidikka mudiyuma", base_time=base)
    assert res_ta.target_date == "2026-09-10"
    assert res_ta.period == "morning"
    assert res_ta.is_explicit_future is True


def test_verify_forecast_timestamp_match_and_mismatch():
    """Strict verification between temporal resolution and forecast timestamp."""
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    temporal = resolve_query_time("tomorrow morning", base_time=base)
    
    # Exact match within window: 2026-09-10 03:00 UTC (08:30 IST)
    valid_ts = "2026-09-10T03:00:00Z"
    is_valid, reason = verify_forecast_timestamp(valid_ts, temporal)
    assert is_valid is True
    assert reason == "OK"
    
    # Mismatch: today's data masquerading as tomorrow
    today_ts = "2026-09-09T03:00:00Z"
    is_valid_today, reason_today = verify_forecast_timestamp(today_ts, temporal)
    assert is_valid_today is False
    assert "does not match requested target date" in reason_today


def test_weather_evidence_three_timestamp_separation():
    """WeatherEvidence cleanly separates issued_at, forecast_valid_at, and retrieved_at."""
    w = WeatherEvidence(
        forecast="moderate",
        wave_height_m=1.2,
        wind_speed_kmh=22.0,
        source="INCOIS_OSF_WW3",
        is_mock=False,
        cache_status="fresh",
        issued_at="2026-09-09T00:00:00Z",
        forecast_valid_at="2026-09-10T06:00:00Z",
        retrieved_at="2026-09-09T18:00:00Z",
        target_period="morning",
    )
    
    assert w.issued_at == "2026-09-09T00:00:00Z"
    assert w.forecast_valid_at == "2026-09-10T06:00:00Z"
    assert w.retrieved_at == "2026-09-09T18:00:00Z"
    # Legacy alias sync check
    assert w.forecast_time == "2026-09-10T06:00:00Z"
    assert w.retrieval_time == "2026-09-09T18:00:00Z"


def test_incois_multi_row_timestep_selection():
    """INCOIS NCSS parser selects the matching future timestep when available."""
    cache = MarineWeatherCache()
    provider = IncoisWeatherProvider(cache=cache)
    
    # Mock NCSS CSV with multiple timesteps: today 00:00, today 12:00, tomorrow 06:00, tomorrow 12:00
    mock_csv = (
        "time,latitude,longitude,swh,mwd,u,v,sst\n"
        "2026-09-09T00:00:00Z,20.9,70.36,1.1,210,5.0,4.0,28.5\n"
        "2026-09-09T12:00:00Z,20.9,70.36,1.3,215,6.0,4.5,28.4\n"
        "2026-09-10T06:00:00Z,20.9,70.36,1.8,220,7.5,5.0,28.2\n"
        "2026-09-10T12:00:00Z,20.9,70.36,2.1,225,8.0,6.0,28.1\n"
    )
    
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    temporal = resolve_query_time("tomorrow morning", base_time=base)
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv
    
    with patch("httpx.Client.get", return_value=mock_resp):
        res = provider._query_ncss_point(
            "mock/dataset", 20.9, 70.36, temporal_res=temporal
        )
    
    assert res is not None
    assert res["forecast_valid_at"] == "2026-09-10T06:00:00Z"
    assert res["hs"] == 1.8


def test_incois_rejects_past_data_for_future_request():
    """INCOIS provider strictly rejects today's data when tomorrow was requested and unavailable in CSV."""
    cache = MarineWeatherCache()
    provider = IncoisWeatherProvider(cache=cache)
    
    # Mock CSV that only has today's timesteps
    mock_csv = (
        "time,latitude,longitude,swh,mwd,u,v,sst\n"
        "2026-09-09T00:00:00Z,20.9,70.36,1.1,210,5.0,4.0,28.5\n"
        "2026-09-09T12:00:00Z,20.9,70.36,1.3,215,6.0,4.5,28.4\n"
    )
    
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    temporal = resolve_query_time("tomorrow morning", base_time=base)
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv
    
    with patch("httpx.Client.get", return_value=mock_resp):
        res = provider._query_ncss_point(
            "mock/dataset", 20.9, 70.36, temporal_res=temporal
        )
    
    # Must be rejected because none of the timesteps match tomorrow
    assert res is None or res.get("verified") is False


def test_cache_key_isolation_by_date():
    """Verifies that queries for different dates use distinct cache slots."""
    cache = MarineWeatherCache()
    
    today_iso = datetime.now(timezone.utc).date().isoformat()
    tomorrow_iso = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    k_today = cache.get_grid_key(20.9, 70.36, target_date=today_iso)
    k_tomorrow = cache.get_grid_key(20.9, 70.36, target_date=tomorrow_iso)
    
    assert k_today != k_tomorrow
    assert today_iso in k_today
    assert tomorrow_iso in k_tomorrow
    
    # Setting today's entry must not produce a cache hit for tomorrow
    cache.set(20.9, 70.36, {"wave_height_m": 1.5, "forecast_valid_at": now_iso}, target_date=today_iso)
    
    hit_today, status_today = cache.get(20.9, 70.36, target_date=today_iso)
    assert hit_today is not None
    assert status_today == "fresh"
    
    hit_tomorrow, status_tomorrow = cache.get(20.9, 70.36, target_date=tomorrow_iso)
    assert hit_tomorrow is None
    assert status_tomorrow == "miss"


def test_open_meteo_future_hourly_selection():
    """Open-Meteo provider selects the exact hourly future timestep matching the requested period."""
    provider = OpenMeteoWeatherProvider()
    
    mock_marine = {
        "current": {"time": "2026-09-09T12:00:00Z", "wave_height": 1.1, "wave_period": 6.5, "wave_direction": 210},
        "hourly": {
            "time": ["2026-09-09T12:00:00Z", "2026-09-10T06:00:00Z", "2026-09-10T12:00:00Z"],
            "wave_height": [1.1, 1.8, 2.0],
            "wave_period": [6.5, 7.0, 7.5],
            "wave_direction": [210, 220, 225],
        },
    }
    mock_weather = {
        "current": {"time": "2026-09-09T12:00:00Z", "temperature_2m": 28.0, "wind_speed_10m": 15.0, "wind_direction_10m": 200, "weather_code": 1},
        "hourly": {
            "time": ["2026-09-09T12:00:00Z", "2026-09-10T06:00:00Z", "2026-09-10T12:00:00Z"],
            "temperature_2m": [28.0, 29.5, 30.0],
            "wind_speed_10m": [15.0, 22.0, 25.0],
            "wind_direction_10m": [200, 210, 215],
            "wind_gusts_10m": [20.0, 28.0, 32.0],
            "weather_code": [1, 2, 2],
            "visibility": [10000, 10000, 10000],
            "cloud_cover": [20, 30, 40],
            "precipitation": [0, 0, 0],
        },
    }
    
    def mock_get(url, params=None, **kwargs):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        if "marine" in url:
            resp.json = MagicMock(return_value=mock_marine)
        else:
            resp.json = MagicMock(return_value=mock_weather)
        return resp
    
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    temporal = resolve_query_time("tomorrow morning", base_time=base)
    
    with patch("httpx.Client.get", side_effect=mock_get):
        res = provider.get_weather(
            lat=20.9, lon=70.36, date=temporal.target_date, temporal_res=temporal
        )
    
    assert res["forecast_valid_at"] == "2026-09-10T06:00:00Z"
    assert res["wave_height_m"] == 1.8
    assert res["wind_speed_kmh"] == 22.0
    assert res["issued_at"] is None  # API valid time does not establish model issuance.
    assert res["retrieved_at"] is not None


def test_open_meteo_rejects_missing_future_data():
    """When a future date is requested but absent from provider data, return data_unavailable."""
    provider = OpenMeteoWeatherProvider()
    
    # Provider data only contains today
    mock_marine = {
        "current": {"time": "2026-09-09T12:00:00Z", "wave_height": 1.1},
        "hourly": {"time": ["2026-09-09T12:00:00Z"], "wave_height": [1.1]},
    }
    mock_weather = {
        "current": {"time": "2026-09-09T12:00:00Z", "wind_speed_10m": 15.0},
        "hourly": {"time": ["2026-09-09T12:00:00Z"], "wind_speed_10m": [15.0]},
    }
    
    def mock_get(url, params=None, **kwargs):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value=mock_marine if "marine" in url else mock_weather)
        return resp
    
    base = datetime(2026, 9, 9, 12, 0, 0, tzinfo=IST)
    temporal = resolve_query_time("tomorrow morning", base_time=base)
    
    with patch("httpx.Client.get", side_effect=mock_get):
        res = provider.get_weather(
            lat=20.9, lon=70.36, date=temporal.target_date, temporal_res=temporal
        )
    
    assert res["forecast"] == "data_unavailable"
    assert res["cache_status"] == "unavailable"
    assert res["forecast_valid_at"] is None


def test_api_conditions_future_date_endpoint():
    """FastAPI endpoint /api/marine/conditions correctly processes future time_hint."""
    from fastapi.testclient import TestClient
    from app.main import app
    from tests.auth_helpers import authenticate_client
    
    client = authenticate_client(TestClient(app))
    
    # Mock get_marine_weather to return valid future weather evidence
    mock_weather = WeatherEvidence(
        forecast="moderate",
        wave_height_m=1.8,
        wind_speed_kmh=22.0,
        source="INCOIS_OSF_WW3",
        is_mock=False,
        cache_status="live",
        issued_at="2026-09-09T00:00:00Z",
        forecast_valid_at="2026-09-10T06:00:00Z",
        retrieved_at="2026-09-09T18:00:00Z",
        target_period="2026-09-10 morning",
    )
    
    with patch("app.main.get_marine_weather", return_value=mock_weather):
        response = client.get("/api/marine/conditions?lat=20.9&lon=70.36&time_hint=tomorrow%20morning")
    
    assert response.status_code == 200
    data = response.json()
    assert data["forecast_valid_at"] == "2026-09-10T06:00:00Z"
    assert data["issued_at"] == "2026-09-09T00:00:00Z"
    assert data["retrieved_at"] == "2026-09-09T18:00:00Z"
    assert "morning" in data["target_period"]

