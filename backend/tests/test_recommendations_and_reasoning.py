"""Comprehensive test suite for ORCA Marine AI's Reliable Recommendations, Supporting Evidence, and Reasoning Engine."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.agent_models import (
    BoundaryEvidence,
    EcologyEvidence,
    EvidenceBundle,
    GeofenceZoneModel,
    HazardAlertEvidence,
    OceanAnalyticsEvidence,
    OperationalRecommendation,
    PFZEvidence,
    RiskEvidence,
    RouteEvidence,
    RouteWaypoint,
    SimulationEvidence,
    TideInfo,
    WeatherEvidence,
    ZoneAvoidanceEvidence,
    ZoneAvoidanceItem,
)
from app.services.recommendation_engine import RecommendationReasoningEngine
from tests.auth_helpers import authenticate_client


@pytest.fixture
def client():
    return authenticate_client(TestClient(app))


@pytest.mark.parametrize("wave,wind,level,priority", [(0.85,18,"unknown","INFO"), (1.95,42,"caution","HIGH"), (3.4,62,"unsafe","CRITICAL")])
def test_recommendation_generation_evidence_contract(wave, wind, level, priority):
    from app.agents.risk_agent import assess_risk
    weather = WeatherEvidence(forecast="unavailable", wave_height_m=wave, wind_speed_kmh=wind,
        source="INCOIS_OSF_WW3", is_mock=False, cache_status="fresh")
    risk = assess_risk(weather)
    bundle = EvidenceBundle(weather=weather, risk=risk, date="2026-09-09")
    rec = RecommendationReasoningEngine.generate_recommendations(bundle)[0]
    assert risk.level == level
    assert rec.priority == priority
    assert rec.confidence_score is None
    assert rec.reliability_tier == "ORCA_HEURISTIC"
    assert f"wave_height_m: {wave}" in rec.supporting_evidence
    assert "ORCA heuristic" in rec.title
    assert "does not issue departure clearance" in rec.directive
    assert "Missing evidence:" in " ".join(rec.supporting_evidence)


def test_recommendation_generation_pfz_and_fishing():
    """Verifies that Potential Fishing Zone evidence generates actionable fishing grounds recommendations."""
    pfz = PFZEvidence(
        name="Shelf Break Hotspot Alpha",
        latitude=18.7500,
        longitude=72.5000,
        distance_km=14.2,
        depth_m=45.0,
        species=["Tuna", "Kingfish", "Mackerel"],
        bearing_deg=225.0,
        suitability_score=92.0,
        source="incois_derived_pfz_dataset",
    )
    bundle = EvidenceBundle(
        pfz_zones=[pfz],
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )

    recs = RecommendationReasoningEngine.generate_recommendations(bundle)
    pfz_rec = next(r for r in recs if r.category == "FISHING")
    assert pfz_rec.priority == "INFO"
    assert pfz_rec.confidence_score is None
    assert "Shelf Break Hotspot Alpha" in pfz_rec.title
    assert "225°" not in pfz_rec.directive
    assert any("Tuna, Kingfish, Mackerel" in e for e in pfz_rec.supporting_evidence)
    assert any("14.2 km" in e for e in pfz_rec.supporting_evidence)
    assert "Catch-Per-Unit-Effort" not in pfz_rec.reasoning
    assert "does not establish" in pfz_rec.reasoning


def test_recommendation_generation_navigation_route():
    """Verifies that safe route planning produces a navigation corridor recommendation with waypoint reasoning."""
    route = RouteEvidence(
        origin_name="Mumbai Port",
        origin_lat=18.9220,
        origin_lon=72.8347,
        destination_name="Zone Alpha",
        destination_lat=18.7500,
        destination_lon=72.5000,
        distance_km=24.5,
        distance_nm=13.2,
        estimated_duration_hours=1.7,
        waypoints=[
            RouteWaypoint(lat=18.9220, lon=72.8347, name="Departure"),
            RouteWaypoint(lat=18.8300, lon=72.6700, name="Turn 1"),
            RouteWaypoint(lat=18.7500, lon=72.5000, name="Destination"),
        ],
        risk_assessment="SAFE",
        avoided_zones=["Shallow Reef Sandbar"],
    )
    bundle = EvidenceBundle(
        route=route,
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )

    recs = RecommendationReasoningEngine.generate_recommendations(bundle)
    nav_rec = next(r for r in recs if r.category == "NAVIGATION")
    assert nav_rec.priority == "HIGH"
    assert "Safe Navigation Corridor" in nav_rec.title
    assert "3-waypoint" in nav_rec.directive
    assert any("13.2 Nautical Miles" in e for e in nav_rec.supporting_evidence)
    assert any("Shallow Reef Sandbar" in e for e in nav_rec.supporting_evidence)
    assert "Geodesic route computed" in nav_rec.reasoning


def test_recommendation_generation_boundary_and_geofence():
    """Verifies boundary compliance recommendation generation for vessels inside or near borders."""
    # Test inside EEZ
    bound_inside = BoundaryEvidence(
        inside_eez=True,
        distance_to_boundary_km=48.5,
        geofence_status="CLEAR",
        country="India",
        zone_name="Exclusive Economic Zone",
        status_message="Inside Indian EEZ",
        source="Marine Regions / VLIZ",
        dataset_version="World EEZ v12",
    )
    bundle_inside = EvidenceBundle(
        boundary=bound_inside,
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )
    recs_inside = RecommendationReasoningEngine.generate_recommendations(bundle_inside)
    geo_rec = next(r for r in recs_inside if r.category == "GEOFENCE")
    assert geo_rec.priority == "INFO"
    assert geo_rec.reliability_tier == "REFERENCE_ESTIMATE"
    assert "does not establish legal" in geo_rec.directive

    # Test border proximity warning
    bound_border = BoundaryEvidence(
        inside_eez=True,
        distance_to_boundary_km=8.2,
        geofence_status="BUFFER_WARNING",
        country="India",
        zone_name="Exclusive Economic Zone",
        status_message="Approaching International Boundary",
        source="Marine Regions / VLIZ",
        dataset_version="World EEZ v12",
    )
    bundle_border = EvidenceBundle(
        boundary=bound_border,
        location_lat=19.9500,
        location_lon=68.2000,
        date="2026-08-27",
    )
    recs_border = RecommendationReasoningEngine.generate_recommendations(bundle_border)
    geo_crit = next(r for r in recs_border if r.category == "GEOFENCE")
    assert geo_crit.priority == "HIGH"
    assert "current official charts" in geo_crit.directive
    assert any("8.2" in e for e in geo_crit.supporting_evidence)


def test_query_endpoint_delivers_recommendations_and_evidence(client):
    """Verifies that /query returns structured operational recommendations with supporting evidence and reasoning."""
    payload = {
        "location": {"lat": 18.9220, "lon": 72.8347},
        "date": "2026-08-27",
        "question": "Is it safe to go fishing near Mumbai and where is the best catch?",
        "language": "en",
    }
    response = client.post("/query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "recommendations" in data
    assert data["recommendations"] is not None
    assert len(data["recommendations"]) >= 1

    for rec in data["recommendations"]:
        assert "id" in rec
        assert "category" in rec
        assert "title" in rec
        assert "directive" in rec
        assert "priority" in rec
        assert "confidence_score" in rec
        assert "supporting_evidence" in rec
        assert len(rec["supporting_evidence"]) > 0
        assert "reasoning" in rec
        assert len(rec["reasoning"]) > 10

    # Ensure answer text includes the formatted recommendation section
    assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_chat_endpoint_delivers_recommendations_and_evidence(client):
    """Verifies that /api/chat returns structured recommendations."""
    payload = {
        "message": "Can I sail today?",
        "location": {"lat": 18.9220, "lon": 72.8347},
        "date": "2026-08-27",
        "language": "en",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "recommendations" in data
    assert data["recommendations"] is not None
    assert len(data["recommendations"]) >= 1


def test_api_recommendations_endpoint(client):
    """Verifies the dedicated GET /api/recommendations endpoint."""
    response = client.get("/api/recommendations?lat=18.9220&lon=72.8347")
    assert response.status_code == 200
    data = response.json()

    assert "recommendations" in data
    assert len(data["recommendations"]) >= 1
    assert "evidence_summary" in data
    assert "reasoning_trace" in data
    assert "sources_used" in data


# Explicit upstream fixtures: these tests exercise orchestration, not live model prose.
import pytest
pytestmark = pytest.mark.usefixtures("pipeline_providers")
