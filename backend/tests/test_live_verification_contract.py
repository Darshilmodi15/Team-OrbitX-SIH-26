"""Offline tests of live-check acceptance rules; never contact providers."""
from datetime import datetime, timedelta, timezone
import pytest
from scripts.verify_live import weather_result


def evidence():
    return {"source": "INCOIS_OSF_WW3", "is_mock": False, "cache_status": "fresh",
            "wave_height_m": 0.0, "wind_speed_kmh": 0.0,
            "forecast_time": datetime.now(timezone.utc).isoformat()}


def test_real_zero_is_accepted_but_optional_missing_fields_stay_null():
    result = weather_result(evidence(), "INCOIS_OSF_WW3")
    assert result["passed"]
    assert result["wind_gust_kmh"] is None


@pytest.mark.parametrize("field,value", [
    ("wave_height_m", None), ("wind_speed_kmh", None), ("wave_height_m", float("nan")),
    ("wind_speed_kmh", float("inf")), ("wave_height_m", True), ("wave_height_m", -1),
    ("source", "open_meteo_marine_api"), ("is_mock", True), ("cache_status", "stale"),
    ("cache_status", "cached"), ("cache_status", "unavailable"), ("forecast_time", None),
    ("forecast_time", "not-a-date"),
])
def test_live_check_rejects_missing_synthetic_or_fallback_evidence(field, value):
    data = {**evidence(), field: value}
    assert not weather_result(data, "INCOIS_OSF_WW3")["passed"]


@pytest.mark.parametrize("hours", [-24, 24])
def test_live_check_rejects_old_or_future_values(hours):
    data = {**evidence(), "forecast_time": (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()}
    assert not weather_result(data, "INCOIS_OSF_WW3")["passed"]
