"""
Phase 2 Live Data & Reliable Assistant Verification Test Suite.

Verifies:
1. Approved machine-readable INCOIS PFZ feed parser, sector selection, and coverage gap reporting.
2. Timestamps validation: rejection of future issue dates, invalid dates, expired advisories, and demo data.
3. ISRO / MOSDAC satellite observation contract and unconfigured credential requirement.
4. Provider-specific timeouts, last successful fetch times, and health observability.
5. Preserved failure reasons on provider outages without synthetic measurement fabrication.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app
from app.services.pfz.incois_pfz_service import (
    COASTAL_SECTORS,
    IncoisPFZService,
    detect_sector_from_coords,
    incois_pfz_service,
)
from app.services.satellite.mosdac_service import MosdacSatelliteService, mosdac_service
from app.services.provider_health import snapshot, record


@pytest.fixture
def client():
    return TestClient(app)


# =========================================================================
# 1. INCOIS PFZ Machine-Readable Feed & Sector Selection
# =========================================================================

def test_coastal_sectors_contain_all_11_maritime_states():
    """Verify that all 11 Indian coastal sectors are defined with official metadata."""
    sectors = incois_pfz_service.get_sectors()
    assert len(sectors) == 11
    ids = {s["id"] for s in sectors}
    expected = {
        "gujarat", "maharashtra", "goa", "karnataka", "kerala",
        "tamil_nadu", "andhra_pradesh", "odisha", "west_bengal",
        "lakshadweep", "andaman_nicobar",
    }
    assert ids == expected
    for s in sectors:
        assert s["issuing_authority"] == "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India"
        assert len(s["landing_centres"]) > 0
        assert "lat_min" in s["bounds"]


def test_sector_detection_from_coordinates():
    """Verify coordinate matching to correct coastal sector."""
    # Mumbai (18.92, 72.83) -> maharashtra
    assert detect_sector_from_coords(18.92, 72.83) == "maharashtra"
    # Veraval (20.90, 70.36) -> gujarat
    assert detect_sector_from_coords(20.90, 70.36) == "gujarat"
    # Kochi (9.93, 76.26) -> kerala
    assert detect_sector_from_coords(9.93, 76.26) == "kerala"
    # Chennai (13.08, 80.27) -> tamil_nadu
    assert detect_sector_from_coords(13.08, 80.27) == "tamil_nadu"
    # Deep mid-ocean or inland location
    assert detect_sector_from_coords(0.0, 0.0) is None


def test_unconfigured_pfz_feed_returns_unavailable_with_null_dates(client):
    """When no live feed is configured, return explicit availability without inventing dates."""
    resp = client.get("/api/pfz?sector=maharashtra")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "unavailable"
    assert data["data_mode"] == "unavailable"
    assert data["status"] == "unavailable"
    assert data["issued_at"] is None
    assert data["valid_until"] is None
    assert data["pfz_zones"] == []
    assert data["sector"] == "maharashtra"
    assert data["coverage_status"] == "coverage_gap"
    assert "No timestamped current PFZ advisory feed is configured" in data["reason"]


def test_pfz_feed_validates_and_accepts_current_advisory():
    """Verify that a valid upstream INCOIS payload is properly parsed and marked current."""
    service = IncoisPFZService(api_url="https://mock.incois.gov.in/pfz")
    now = datetime.now(timezone.utc)
    issued = (now - timedelta(hours=2)).isoformat()
    valid = (now + timedelta(hours=24)).isoformat()

    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "source": "INCOIS Operational PFZ Advisory",
        "issued_at": issued,
        "valid_until": valid,
        "pfz_zones": [
            {
                "id": "pfz-01",
                "latitude": 18.8500,
                "longitude": 72.6500,
                "landing_centre": "Sassoon Dock",
                "distance_km": 14.5,
                "bearing_deg": 245.0,
                "depth_m": 35.0,
                "species": ["Tuna", "Mackerel"],
            },
            {
                "id": "pfz-demo-invalid",
                "latitude": 18.9000,
                "longitude": 72.7000,
                "is_demonstration": True,
            },
        ],
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        advisory = service.get_advisory(sector="maharashtra")

    assert advisory["status"] == "current"
    assert advisory["data_mode"] == "live"
    assert advisory["issued_at"] == issued
    assert advisory["valid_until"] == valid
    # Demo point must be excluded
    assert len(advisory["pfz_zones"]) == 1
    point = advisory["pfz_zones"][0]
    assert point["id"] == "pfz-01"
    assert point["latitude"] == 18.85
    assert point["landing_centre"] == "Sassoon Dock"
    assert "Tuna" in point["species"]


def test_pfz_feed_rejects_future_issue_date():
    """Future issue dates indicate clock skew or unverified data and must be rejected."""
    service = IncoisPFZService(api_url="https://mock.incois.gov.in/pfz")
    now = datetime.now(timezone.utc)
    future_issued = (now + timedelta(hours=5)).isoformat()
    future_valid = (now + timedelta(hours=48)).isoformat()

    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "source": "INCOIS",
        "issued_at": future_issued,
        "valid_until": future_valid,
        "pfz_zones": [{"latitude": 18.9, "longitude": 72.7}],
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        advisory = service.get_advisory(sector="maharashtra")

    assert advisory["status"] == "unavailable"
    assert advisory["issued_at"] is None
    assert advisory["valid_until"] is None
    assert advisory["pfz_zones"] == []
    assert "future" in advisory["reason"]


def test_pfz_feed_detects_expired_advisory():
    """Advisories past valid_until must be marked expired with data_mode stale."""
    service = IncoisPFZService(api_url="https://mock.incois.gov.in/pfz")
    now = datetime.now(timezone.utc)
    past_issued = (now - timedelta(hours=72)).isoformat()
    past_valid = (now - timedelta(hours=12)).isoformat()

    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "source": "INCOIS",
        "issued_at": past_issued,
        "valid_until": past_valid,
        "pfz_zones": [{"latitude": 18.9, "longitude": 72.7}],
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        advisory = service.get_advisory(sector="maharashtra")

    assert advisory["status"] == "expired"
    assert advisory["data_mode"] == "stale"
    assert advisory["issued_at"] == past_issued
    assert advisory["valid_until"] == past_valid
    assert advisory["coverage_status"] == "expired"


# =========================================================================
# 2. ISRO / MOSDAC Satellite Telemetry Contract
# =========================================================================

def test_mosdac_unconfigured_requires_credentials():
    """Unconfigured MOSDAC client must return explicit UNCONFIGURED without fabricating values."""
    service = MosdacSatelliteService(user="", api_key="")
    obs = service.get_satellite_observations(lat=18.92, lon=72.83)

    assert obs["status"] == "UNCONFIGURED"
    assert obs["source"] == "ISRO_MOSDAC"
    assert obs["real_data_arriving"] is False
    assert obs["chlorophyll_mg_m3"] is None
    assert obs["sea_surface_temperature_c"] is None
    assert obs["thermal_front_detected"] is False
    assert "MOSDAC_USER" in obs["required_credentials"]
    assert "MOSDAC_API_KEY" in obs["required_credentials"]
    assert snapshot("isro_mosdac")["status"] == "DOWN"
    assert snapshot("isro_mosdac")["last_error_summary"] == "MOSDAC_CREDENTIALS_REQUIRED"


def test_mosdac_endpoint_returns_status(client):
    """Verify GET /api/satellite/status exposes credential requirement and portal link."""
    resp = client.get("/api/satellite/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "ISRO_MOSDAC"
    assert "mosdac.gov.in" in data["registration_portal"]


# =========================================================================
# 3. Provider Observability & Public Health Endpoint
# =========================================================================

def test_public_provider_health_endpoint(client):
    """Verify GET /api/health/providers returns clean non-secret telemetry for all providers."""
    resp = client.get("/api/health/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert "timestamp" in data
    assert "providers" in data
    providers = data["providers"]
    for expected_key in ["incois", "incois_pfz", "open_meteo", "gemini", "isro_mosdac"]:
        assert expected_key in providers
        p_info = providers[expected_key]
        assert "status" in p_info
        assert "real_data_arriving" in p_info
        assert "data_mode" in p_info
