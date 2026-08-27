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


@pytest.fixture
def client():
    return TestClient(app)


def test_recommendation_generation_safe_conditions():
    """Verifies that safe marine conditions produce verified departure recommendations with evidence and reasoning."""
    weather = WeatherEvidence(
        forecast="clear",
        wave_height_m=0.85,
        wind_speed_kmh=18.0,
        wind_speed_ms=5.0,
        wave_period_s=8.0,
        source="INCOIS_OSF_WW3",
        is_mock=False,
    )
    risk = RiskEvidence(
        level="safe",
        reason="Wave height 0.85m and wind 18.0 km/h are within safe craft limits.",
        factors=["wave_height=0.85m", "wind_speed=18.0 km/h"],
        safety_label="SAFE TO VENTURE",
    )
    bundle = EvidenceBundle(
        weather=weather,
        risk=risk,
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )

    recs = RecommendationReasoningEngine.generate_recommendations(bundle)
    assert len(recs) >= 1
    saf_rec = next(r for r in recs if r.category == "SAFETY")
    assert saf_rec.priority == "MEDIUM"
    assert saf_rec.confidence_score >= 0.90
    assert "Optimal Marine Conditions" in saf_rec.title
    assert "Normal fishing and navigation operations are cleared" in saf_rec.directive
    assert len(saf_rec.supporting_evidence) >= 3
    assert any("0.85m" in e for e in saf_rec.supporting_evidence)
    assert "1. Multi-vector physics check" in saf_rec.reasoning
    assert "SAFE TO VENTURE" in saf_rec.reasoning


def test_recommendation_generation_caution_conditions():
    """Verifies that elevated wave or wind conditions generate caution directives with evidence and reasoning."""
    weather = WeatherEvidence(
        forecast="rainy",
        wave_height_m=1.95,
        wind_speed_kmh=42.0,
        wind_speed_ms=11.67,
        wave_period_s=5.0,
        source="INCOIS_OSF_WW3",
        is_mock=False,
    )
    risk = RiskEvidence(
        level="caution",
        reason="Elevated wave height of 1.95m and squalls require heightened vigilance.",
        factors=["wave_height=1.95m", "wind_speed=42.0 km/h"],
        safety_label="CAUTION ADVISED",
    )
    bundle = EvidenceBundle(
        weather=weather,
        risk=risk,
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )

    recs = RecommendationReasoningEngine.generate_recommendations(bundle)
    saf_rec = next(r for r in recs if r.category == "SAFETY")
    assert saf_rec.priority == "HIGH"
    assert "Restricted Coastal Operations" in saf_rec.title
    assert "within 5 Nautical Miles" in saf_rec.directive
    assert any("1.95m" in e for e in saf_rec.supporting_evidence)
    assert "CAUTION ADVISED" in saf_rec.reasoning


def test_recommendation_generation_unsafe_storm_conditions():
    """Verifies that extreme storm conditions generate critical venture prohibitions with evidence and reasoning."""
    weather = WeatherEvidence(
        forecast="stormy",
        wave_height_m=3.40,
        wind_speed_kmh=62.0,
        wind_speed_ms=17.22,
        wave_period_s=4.2,
        source="INCOIS_OSF_WW3",
        is_mock=False,
    )
    risk = RiskEvidence(
        level="unsafe",
        reason="Severe wave height of 3.40m and gale winds exceed safety thresholds.",
        factors=["wave_height=3.40m", "wind_speed=62.0 km/h", "stormy"],
        safety_label="UNSAFE — SEVERE HAZARD",
    )
    bundle = EvidenceBundle(
        weather=weather,
        risk=risk,
        location_lat=18.9220,
        location_lon=72.8347,
        date="2026-08-27",
    )

    recs = RecommendationReasoningEngine.generate_recommendations(bundle)
    saf_rec = next(r for r in recs if r.category == "SAFETY")
    assert saf_rec.priority == "CRITICAL"
    assert saf_rec.confidence_score >= 0.95
    assert "Vessel Venture Prohibition" in saf_rec.title
    assert "Suspend all vessel departures" in saf_rec.directive
    assert any("3.40m" in e for e in saf_rec.supporting_evidence)
    assert "capsizing stability margins" in saf_rec.reasoning


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
    assert pfz_rec.priority == "HIGH"
    assert "Shelf Break Hotspot Alpha" in pfz_rec.title
    assert "225° (SW)" in pfz_rec.directive
    assert "Tuna, Kingfish, Mackerel" in pfz_rec.directive
    assert any("14.2 km" in e for e in pfz_rec.supporting_evidence)
    assert "Catch-Per-Unit-Effort" in pfz_rec.reasoning


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
    assert "Indian EEZ Verified" in geo_rec.title
    assert "legal fishing operations" in geo_rec.reasoning

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
    assert geo_crit.priority == "CRITICAL"
    assert "Alter course immediately toward the Indian mainland" in geo_crit.directive
    assert any("8.2 km" in e for e in geo_crit.supporting_evidence)


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
    assert "Operational Recommendations, Evidence & Reasoning Derivation" in data["answer"]


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
