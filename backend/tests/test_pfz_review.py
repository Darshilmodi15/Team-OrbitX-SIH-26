"""Regressions from the beta PFZ review; upstream payloads are test fixtures."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers.pfz import router
from app.services.pfz.incois_pfz_service import IncoisPFZService, detect_sector_from_coords
from app.data.pfz.mock import IncoisPFZProvider
from app.agents.pfz_agent import get_pfz_zones_evidence
from app.models.agent_models import EvidenceBundle
from app.services.recommendation_engine import RecommendationReasoningEngine
from app.services.satellite.mosdac_service import MosdacSatelliteService


def payload():
    now = datetime.now(timezone.utc)
    return dict(source="INCOIS fixture", data_mode="live", sector="maharashtra", language="en",
                issued_at=(now-timedelta(hours=1)).isoformat(), valid_until=(now+timedelta(hours=1)).isoformat(),
                pfz_zones=[dict(latitude=18.9, longitude=72.7)])


def query(raw, service=None, **kwargs):
    service = service or IncoisPFZService(api_url="https://provider.example/pfz")
    with patch("httpx.Client.get", return_value=Mock(status_code=200, json=lambda: raw)):
        return service.get_advisory(sector="maharashtra", **kwargs)


@pytest.mark.parametrize("changes,code", [
    ({"is_demonstration": True}, "UNVERIFIED_SOURCE"),
    ({"is_mock": True}, "UNVERIFIED_SOURCE"),
    ({"source": None}, "UNVERIFIED_SOURCE"),
    ({"data_mode": "stale"}, "UNVERIFIED_SOURCE"),
    ({"data_mode": []}, "UNVERIFIED_SOURCE"),
    ({"issued_at": "2026-09-13T00:00:00"}, "INVALID_TIMESTAMPS"),
    ({"sector": "gujarat"}, "SECTOR_MISMATCH"),
    ({"language": "hi"}, "LANGUAGE_MISMATCH"),
    ({"pfz_zones": [{"latitude": True, "longitude": 72}]}, "NO_VALID_POINTS"),
    ({"pfz_zones": [{"latitude": 18, "longitude": float("nan")}]}, "NO_VALID_POINTS"),
    ({"pfz_zones": []}, "NO_VALID_POINTS"),
])
def test_unverified_data_is_withheld(changes, code):
    result = query({**payload(), **changes})
    assert result["status"] == "unavailable"
    assert result["reason_code"] == code
    assert result["pfz_zones"] == []


def test_optional_bad_numbers_are_null_not_json_nan():
    raw = payload()
    raw["pfz_zones"][0].update(depth_m=float("nan"), distance_km="12", bearing_deg=500)
    point = query(raw)["pfz_zones"][0]
    assert point["depth_m"] is point["distance_km"] is point["bearing_deg"] is None


def test_expired_feed_exposes_dates_but_no_points():
    raw = payload()
    raw.update(issued_at=(datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
               valid_until=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat())
    result = query(raw)
    assert result["status"] == "expired"
    assert result["pfz_zones"] == []


def test_only_explicit_empty_publication_can_mean_no_advisory():
    result = query({**payload(), "pfz_zones": [], "coverage_status": "no_advisory_issued"})
    assert result["coverage_status"] == "no_advisory_issued"


def test_cache_copies_data_and_separates_language_and_refreshes():
    service = IncoisPFZService(api_url="https://provider.example/pfz?token=test")
    raw = payload()
    with patch("httpx.Client.get", return_value=Mock(status_code=200, json=lambda: deepcopy(raw))) as get:
        first = service.get_advisory(sector="maharashtra")
        first["pfz_zones"].clear()
        assert len(service.get_advisory(sector="maharashtra")["pfz_zones"]) == 1
        assert get.call_count == 1
        raw["language"] = "hi"
        assert service.get_advisory(sector="maharashtra", language="hi")["language"] == "hi"
        assert get.call_args.kwargs["params"] == {"sector": "maharashtra", "language": "hi"}
        service._cache[("maharashtra", "en")]["refresh_at"] = datetime.now(timezone.utc)-timedelta(seconds=1)
        raw["language"] = "en"
        service.get_advisory(sector="maharashtra")
        assert get.call_count == 3


def test_timeout_is_not_reported_as_missing_configuration():
    with patch("httpx.Client.get", side_effect=httpx.ReadTimeout("private url")):
        result = IncoisPFZService(api_url="https://provider.example").get_advisory(sector="maharashtra")
    assert result["reason_code"] == "UPSTREAM_TIMEOUT"
    assert "private" not in str(result)


@pytest.mark.parametrize("suffix", ["lat=91&lon=72", "lat=nan&lon=72", "lat=18", "sector=unknown", "language=xx"])
def test_route_rejects_invalid_selection(suffix):
    app = FastAPI()
    app.include_router(router)
    assert TestClient(app).get("/api/pfz?" + suffix).status_code == 422


@pytest.mark.parametrize("lat,lon,sector", [(11.6,92.7,"andaman"),(7,93.8,"nicobar"),(10.6,72.6,"lakshadweep"),(9.28,79.31,"south_tamil_nadu"),(8.08,77.55,"south_tamil_nadu")])
def test_island_and_southern_tip_selection(lat, lon, sector):
    assert detect_sector_from_coords(lat, lon) == sector


def test_overlap_requires_explicit_sector():
    assert detect_sector_from_coords(20.1, 72.5) is None


def test_provider_agent_recommendation_keeps_missing_measurements_unknown():
    raw = {**payload(), "status": "current"}
    with patch("app.services.pfz.incois_pfz_service.incois_pfz_service.get_advisory", return_value=raw):
        zones = get_pfz_zones_evidence(IncoisPFZProvider(), lat=19, lon=73)
    assert len(zones) == 1
    assert 30 < zones[0].distance_km < 35
    assert zones[0].depth_m is None
    assert zones[0].suitability_score is None
    assert zones[0].source == raw["source"]
    recs = RecommendationReasoningEngine.generate_recommendations(EvidenceBundle(date="2026-09-13", pfz_zones=zones))
    rec = next(r for r in recs if r.category == "FISHING")
    assert rec.confidence_score is None
    assert "Published depth: unavailable" in rec.supporting_evidence
    assert "25-45" not in rec.model_dump_json()
    assert "Set navigational heading" not in rec.directive


def test_mosdac_credentials_cannot_enable_undocumented_endpoint():
    with patch("httpx.Client.get") as get:
        service = MosdacSatelliteService(user="test", api_key="secret", base_url="https://example.com")
        assert service.is_configured is False
        obs = service.get_satellite_observations(18, 72)
    get.assert_not_called()
    assert obs["observations_timestamp"] is None
    assert obs["thermal_front_detected"] is None
    assert "secret" not in str(obs)


def test_redis_connection_failure_does_not_log_credentials(caplog):
    from app.data.weather.cache import MarineWeatherCache
    private_url = "rediss://user:secret-password@cache.example:6379"
    with patch("app.data.weather.cache.redis.Redis.from_url", side_effect=RuntimeError(private_url)):
        cache = MarineWeatherCache(redis_url=private_url)
    assert cache._redis_client is None
    assert "secret-password" not in caplog.text
    assert "cache.example" not in caplog.text
    assert "RuntimeError" in caplog.text
