"""Model marine-field regressions; HTTP responses below are explicit fixtures."""
from datetime import datetime, timezone
from unittest.mock import patch
import httpx
import pytest
from app.agents.weather_agent import get_marine_weather
from app.data.weather.open_meteo import OpenMeteoWeatherProvider, MARINE_FIELDS
from app.services.temporal import resolve_query_time


def fetch(marine, weather=None, temporal=None):
    def response(url, **kwargs):
        data = marine if "marine-api" in url else weather
        if isinstance(data, Exception): raise data
        return httpx.Response(200, json=data or {}, request=httpx.Request("GET", url))
    with patch("httpx.Client.get", side_effect=response) as calls:
        result = get_marine_weather(OpenMeteoWeatherProvider(), 18.9, 72.6, "2026-09-14", temporal_res=temporal)
    return result, calls


def test_all_marine_fields_reach_api_evidence_with_separate_timestamps():
    current = {key: 1.25 for key in MARINE_FIELDS}
    current.update(time="2026-09-14T04:00", sea_surface_temperature=28.6, ocean_current_direction=74)
    result, calls = fetch({"current": current, "latitude": 18.875, "longitude": 72.625}, {"current": {"time": "2026-09-14T04:15", "temperature_2m": 31}})
    for field in MARINE_FIELDS.values(): assert getattr(result, field) is not None
    assert result.sea_surface_temperature_c == 28.6
    assert result.temperature_c == 31
    assert result.ocean_current_speed_kmh == 1.25
    assert result.marine_forecast_valid_at == "2026-09-14T04:00:00Z"
    assert result.weather_forecast_valid_at == "2026-09-14T04:15:00Z"
    assert result.issued_at is None
    assert result.grid_lat == 18.875
    assert result.measurement_kind == "model_forecast"
    assert calls.call_args_list[0].kwargs["params"]["cell_selection"] == "sea"


@pytest.mark.parametrize("field", list(MARINE_FIELDS))
def test_missing_marine_field_is_not_backfilled(field):
    current = {key: 1.0 for key in MARINE_FIELDS}
    current.update(time="2026-09-14T04:00")
    current[field] = None
    result, _ = fetch({"current": current})
    assert getattr(result, MARINE_FIELDS[field]) is None


@pytest.mark.parametrize("bad", [True, float("nan"), -1, 361])
def test_invalid_direction_stays_unknown(bad):
    result, _ = fetch({"current": {"time": "2026-09-14T04:00", "wave_direction": bad}})
    assert result.wave_direction_deg is None


def test_ocean_current_zero_is_real_and_weather_outage_keeps_marine():
    result, _ = fetch({"current": {"time": "2026-09-14T04:00", "ocean_current_velocity": 0, "sea_surface_temperature": -1}}, httpx.ConnectError("offline"))
    assert result.ocean_current_speed_kmh == 0
    assert result.sea_surface_temperature_c == -1
    assert result.wind_speed_kmh is None
    assert result.weather_forecast_valid_at is None


def test_unavailable_future_does_not_leak_current_measurements():
    temporal = resolve_query_time("tomorrow morning", base_time=datetime(2026, 9, 14, 4, tzinfo=timezone.utc))
    result, _ = fetch({"current": {"time": "2026-09-14T04:00", "wave_height": 1, "sea_surface_temperature": 28}}, {"current": {"time": "2026-09-14T04:00", "wind_speed_10m": 10}}, temporal)
    assert result.cache_status == "unavailable"
    assert result.wave_height_m is result.sea_surface_temperature_c is result.wind_speed_kmh is None
    assert result.marine_forecast_valid_at is None
