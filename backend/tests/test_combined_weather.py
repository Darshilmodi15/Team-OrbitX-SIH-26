from copy import deepcopy
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock
import pytest
from app.data.weather.combined import CombinedWeatherProvider
from app.agents.weather_agent import get_marine_weather


def setup(mode="fresh"):
    now = datetime.now(timezone.utc).isoformat()
    primary = {"source": "INCOIS_OSF_WW3", "is_mock": False, "cache_status": mode,
        "forecast_valid_at": now, "retrieved_at": now, "wave_height_m": 2.0,
        "wind_speed_kmh": 10, "grid_lat": 19, "grid_lon": 72, "issued_at": None}
    extra = {"source": "open_meteo_marine_api", "is_mock": False, "cache_status": "fresh",
        "marine_forecast_valid_at": now, "retrieved_at": now, "wave_height_m": 9,
        "sea_surface_temperature_c": 28, "wave_period_s": 6, "grid_lat": 19.1, "grid_lon": 72.1}
    a, b = Mock(), Mock()
    a.get_weather.return_value = primary
    b.get_weather.return_value = extra
    return CombinedWeatherProvider(a, b), primary, extra


def fetch(provider):
    return provider.get_weather(19, 72, datetime.now(timezone.utc).date().isoformat())


def test_merge_keeps_primary_and_separate_provenance():
    provider, primary, extra = setup()
    original = deepcopy(primary)
    result = fetch(provider)
    assert result["wave_height_m"] == 2
    assert result["sea_surface_temperature_c"] == 28
    assert result["grid_lat"] == 19
    assert result["source"] == primary["source"]
    assert result["issued_at"] is None
    assert result["supplemental_fields"]["wave_period_s"]["grid_lat"] == 19.1
    assert primary == original
    evidence = get_marine_weather(provider, 19, 72, datetime.now(timezone.utc).date().isoformat())
    assert evidence.supplemental_fields["wave_period_s"]["source"] == "Open-Meteo Marine"
    assert provider.supplement.get_weather.call_count == 1


@pytest.mark.parametrize("mode", ["stale", "unavailable"])
def test_no_promotion(mode):
    provider, primary, _ = setup(mode)
    assert fetch(provider) == primary
    provider.supplement.get_weather.assert_not_called()


@pytest.mark.parametrize("change", [{"is_mock": True}, {"marine_forecast_valid_at": None},
    {"retrieved_at": "bad"}, {"cache_status": "unavailable"},
    {"retrieved_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()}])
def test_reject_bad_supplement(change):
    provider, primary, extra = setup()
    extra.update(change)
    assert fetch(provider) == primary


def test_supplement_failure_preserves_primary():
    provider, primary, _ = setup()
    provider.supplement.get_weather.side_effect = RuntimeError("offline")
    assert fetch(provider) == primary


def test_cache_copy_and_invalid_number():
    provider, _, extra = setup()
    extra["ocean_current_direction_deg"] = 400
    first = fetch(provider)
    first["supplemental_fields"]["wave_period_s"]["source"] = "changed"
    second = fetch(provider)
    assert second["supplemental_fields"]["wave_period_s"]["source"] == "Open-Meteo Marine"
    assert "ocean_current_direction_deg" not in second


def test_cache_namespace_does_not_reuse_legacy_model_timestamps():
    from app.data.weather.cache import MarineWeatherCache
    cache = MarineWeatherCache(redis_url="")
    redis = Mock()
    redis.get.return_value = None
    redis.keys.return_value = []
    cache._redis_client = redis
    now = datetime.now(timezone.utc).isoformat()
    cache.set(19, 72, {"wave_height_m": 1, "is_mock": False}, forecast_time=now)
    key = redis.setex.call_args.args[0]
    assert key.startswith("orca:marine:v3:")
    cache.get(19, 72)
    assert redis.get.call_args.args[0] == key
    cache.clear()
    redis.keys.assert_called_with("orca:marine:v3:*")
