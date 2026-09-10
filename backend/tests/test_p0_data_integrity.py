"""P0 production data contracts; all provider failures are simulated locally."""
from datetime import datetime, timezone
from unittest.mock import patch
import httpx
import pytest
from app.data.weather.open_meteo import OpenMeteoWeatherProvider
from app.data.weather.incois import IncoisWeatherProvider
from app.data.weather.cache import MarineWeatherCache
from app.agents.weather_agent import get_marine_weather
from app.agents.risk_agent import assess_risk
from app.agents.ocean_analytics_agent import evaluate_zone_avoidance
from app.models.agent_models import WeatherEvidence, EvidenceBundle
from app.services.notifications.notification_service import NotificationService
from app.services.recommendation_engine import RecommendationReasoningEngine

NOW = "2026-09-09T12:00:00+00:00"
EPOCH = datetime.fromisoformat(NOW).timestamp()

def fetch_payloads(marine, weather):
    def respond(url, **kwargs):
        payload = marine if "marine-api" in url else weather
        if isinstance(payload, Exception):
            raise payload
        return httpx.Response(200, json=payload, request=httpx.Request("GET", url))
    with patch("httpx.Client.get", side_effect=respond):
        return OpenMeteoWeatherProvider().get_weather(19, 72, "2026-09-09")

@pytest.mark.parametrize("missing", ["wave_height", "wave_period", "wave_direction", "wind_direction_10m", "wind_speed_10m", "wind_gusts_10m", "visibility", "weather_code", "temperature_2m", "cloud_cover", "precipitation"])
def test_individual_provider_fields_stay_null(missing):
    marine = {"time": NOW, "wave_height": 1.1, "wave_period": 6, "wave_direction": 90}
    weather = {"time": NOW, "wind_direction_10m": 180, "wind_speed_10m": 20, "wind_gusts_10m": 25, "visibility": 12000, "weather_code": 0, "temperature_2m": 28, "cloud_cover": 10, "precipitation": 0}
    (marine if missing in marine else weather)[missing] = None
    result = fetch_payloads({"current": marine}, {"current": weather})
    key = {"wave_direction":"wave_direction_deg", "wind_direction_10m":"wind_direction_deg", "wave_height":"wave_height_m", "wave_period":"wave_period_s", "wind_speed_10m":"wind_speed_kmh", "wind_gusts_10m":"wind_gust_kmh", "visibility":"visibility_km", "temperature_2m":"temperature_c", "cloud_cover":"cloud_cover_pct", "precipitation":"precipitation_mm"}.get(missing, missing)
    assert result[key] is None
    assert result["sea_surface_temperature_c"] is None
    provider = type("Provider", (), {"get_weather": lambda self, **kwargs: result})()
    assert getattr(get_marine_weather(provider, 19, 72, "2026-09-09"), key) is None

@pytest.mark.parametrize("bad", [None, -1, "bad", float("nan"), float("inf"), True])
def test_invalid_wave_never_becomes_calm_zero(bad):
    result = fetch_payloads({"current": {"time": NOW, "wave_height": bad}}, {})
    assert result["wave_height_m"] is None

def test_real_zero_is_preserved_and_air_is_not_sst():
    result = fetch_payloads({"current": {"time": NOW, "wave_height": 0}}, {"current": {"wind_speed_10m": 0, "temperature_2m": -5}})
    assert result["wave_height_m"] == result["wind_speed_ms"] == 0
    assert result["temperature_c"] == -5
    assert result["sea_surface_temperature_c"] is None

def test_partial_failure_and_missing_horizon_are_not_backfilled():
    result = fetch_payloads({"current": {"time": "2026-09-09T12:00", "wave_height": 1}, "hourly": {"time": ["2026-09-09T13:00"], "wave_height": [None]}}, httpx.ConnectError("offline"))
    assert result["wave_height_m"] == 1
    assert result["wind_speed_kmh"] is None
    assert result["forecast_horizon"][0]["wave_height_m"] is None
    assert result["forecast_horizon"][0]["wind_gust_kmh"] is None

def test_complete_provider_failure_stays_unavailable_through_risk():
    with patch("httpx.Client.get", side_effect=httpx.ConnectError("offline")):
        raw = IncoisWeatherProvider(cache=MarineWeatherCache()).get_weather(19, 72, "2026-09-09")
    assert raw["cache_status"] == "unavailable"
    assert all(raw[k] is None for k in ["wave_height_m", "wind_speed_ms", "wind_speed_kmh"])
    assert assess_risk(raw).level == "unknown"
    assert not raw["is_mock"]

def test_cache_fresh_cached_stale_expired_preserves_null():
    cache = MarineWeatherCache(fresh_ttl_seconds=60, max_stale_seconds=120)
    with patch("app.data.weather.cache.time.time", return_value=EPOCH):
        result = cache.set(19, 72, {"wave_height_m": None, "wind_speed_kmh": 0}, forecast_time=NOW)
        assert result["cache_status"] == "fresh"
        assert cache.get(19, 72)[0]["cache_status"] == "cached"
    with patch("app.data.weather.cache.time.time", return_value=EPOCH+61):
        provider = IncoisWeatherProvider(cache=cache)
        with patch.object(provider, "_fetch_from_incois_with_neighbor_search", return_value=(None, "failed")):
            stale = provider.get_weather(19, 72, "2026-09-09")
        assert stale["cache_status"] == "stale"
        assert stale["wave_height_m"] is None and stale["wind_speed_kmh"] == 0
        assert assess_risk(stale).level == "unknown"
    with patch("app.data.weather.cache.time.time", return_value=EPOCH+121):
        assert cache.get(19, 72)[0] is None

def test_missing_or_old_source_time_is_not_newly_live():
    cache = MarineWeatherCache()
    with patch("app.data.weather.cache.time.time", return_value=EPOCH):
        for stamp in [None, "bad", "2025-01-01T00:00:00Z"]:
            assert cache.set(19, 72, {"wave_height_m": 1}, forecast_time=stamp)["cache_status"] == "unavailable"
        assert cache.get(19, 72)[0] is None

def test_tls_verification_enabled_on_actual_client():
    provider = IncoisWeatherProvider()
    with patch("app.data.weather.incois.httpx.Client") as client:
        provider.discover_latest_dataset()
    assert client.call_args.kwargs["verify"] is True

def test_no_startup_advisories_or_missing_measurement_alerts():
    service = NotificationService()
    assert service._notifications == {}
    assert service.evaluate_location_alerts(19, 72) == []

@pytest.mark.parametrize("status", ["fresh", "cached", "stale", "unavailable"])
def test_risk_missing_inputs_unknown_no_clearance(status):
    weather = WeatherEvidence(forecast="unavailable", source="INCOIS_OSF_WW3", cache_status=status, is_mock=False, wave_height_m=0, wind_speed_kmh=0)
    risk = assess_risk(weather)
    assert risk.level == "unknown"
    assert risk.profile.storm_risk.level == "UNKNOWN"
    assert risk.profile.gust_risk.level == "UNKNOWN"
    assert "wave_period_s" in risk.missing_evidence
    assert risk.available_evidence["wave_height_m"] == 0
    assert risk.evidence_completeness == "partial"
    assert risk.risk_score is None and risk.confidence is None
    assert "SAFE TO SAIL" not in risk.model_dump_json() and "Clear sky" not in risk.model_dump_json()
    zone = evaluate_zone_avoidance(19, 72, weather)
    assert zone.overall_avoidance_status == "INSUFFICIENT_EVIDENCE"
    assert zone.safe_alternative_zones == [] and zone.missing_evidence
    recommendations = RecommendationReasoningEngine.generate_recommendations(EvidenceBundle(date="2026-09-09", weather=weather, risk=risk))
    assert recommendations[0].reliability_tier == "ORCA_HEURISTIC"
    assert recommendations[0].confidence_score is None

def test_high_partial_evidence_still_warns_without_claiming_completeness():
    risk = assess_risk({"wave_height_m": 4, "cache_status": "fresh"})
    assert risk.level == "unsafe" and risk.evidence_completeness == "partial"
    assert risk.profile.gust_risk.level == "UNKNOWN"


def test_api_failure_serializes_null_and_unknown():
    from fastapi.testclient import TestClient
    from app.main import app
    raw = {"forecast": "data_unavailable", "wave_height_m": None, "wind_speed_kmh": None, "wind_speed_ms": None, "cache_status": "unavailable", "source": "INCOIS_OSF_WW3", "is_mock": False}
    with patch("app.main.weather_provider.get_weather", return_value=raw):
        client = TestClient(app)
        conditions = client.get("/api/marine/conditions?lat=19&lon=72").json()
        risk = client.get("/api/marine/risk?lat=19&lon=72").json()
    assert conditions["wave_height_m"] is None and conditions["wind_speed_kmh"] is None
    assert risk["level"] == "unknown"
    assert risk["available_evidence"] == {}
    assert risk["evidence_completeness"] == "unavailable"


def test_unknown_weather_code_does_not_mean_clear():
    for code in [None, -1, 999, "bad"]:
        result = fetch_payloads({}, {"current": {"time": NOW, "weather_code": code}})
        assert result["weather_code"] is None
        assert result["forecast"] in {"unavailable", "data_unavailable"}

def test_partial_horizon_does_not_invent_trend():
    risk = assess_risk({"wave_height_m": 1, "cache_status": "fresh", "forecast_horizon": [{"wave_height_m": 1.1}, {"wave_height_m": None}]})
    assert risk.profile.forecast_trend == "unknown"

def test_hazard_cache_status_is_not_promoted_to_live():
    from app.agents.hazard_agent import detect_proactive_hazards
    for status in ["fresh", "cached", "stale", "unavailable"]:
        weather = WeatherEvidence(forecast="unavailable", source="open_meteo", is_mock=False, cache_status=status, wave_height_m=4)
        with patch("app.agents.hazard_agent.evaluate_vessel_geofences", return_value=[]):
            alerts = detect_proactive_hazards(19, 72, weather)
        if status == "unavailable":
            assert alerts == []
        else:
            assert alerts and all(a.freshness == status.upper() for a in alerts)
