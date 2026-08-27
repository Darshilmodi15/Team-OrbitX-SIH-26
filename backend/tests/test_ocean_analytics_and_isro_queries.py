"""
Tests for Ocean Analytics, Marine Ecological Reasoning, Zone Avoidance,
and all 8 ISRO Problem Statement (SIH 26176) Query Scenarios.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.agents.intent_agent import _fallback_intent
from app.agents.ocean_analytics_agent import (
    analyze_chlorophyll_and_sst,
    analyze_productivity_decline,
    evaluate_zone_avoidance,
)
from app.models.agent_models import GeofenceZoneModel, PFZEvidence, WeatherEvidence
from app.services.planner import create_plan


@pytest.fixture
def client():
    return TestClient(app)


# =========================================================================
# 1. Ocean Analytics & Marine Ecological Reasoning Tests
# =========================================================================

def test_analyze_chlorophyll_and_sst_regions():
    # Gujarat / Saurashtra
    res_gujarat = analyze_chlorophyll_and_sst(lat=20.90, lon=70.36, region_name="Veraval Coast")
    assert res_gujarat.mean_chlorophyll_mg_m3 > 1.0
    assert res_gujarat.thermal_front_detected is True
    assert len(res_gujarat.favorable_sectors) > 0
    assert "ISRO" in res_gujarat.satellite_source

    # Maharashtra
    res_mh = analyze_chlorophyll_and_sst(lat=18.92, lon=72.83, region_name="Mumbai / Palghar Coast")
    assert res_mh.upwelling_index in ["HIGH", "VERY_HIGH", "MODERATE_TO_HIGH"]
    assert len(res_mh.favorable_sectors) > 0

    # Kerala
    res_kl = analyze_chlorophyll_and_sst(lat=9.93, lon=76.26, region_name="Kochi Coast")
    assert res_kl.upwelling_index == "VERY_HIGH"
    assert res_kl.mean_chlorophyll_mg_m3 >= 1.5

    # Coromandel / Tamil Nadu
    res_tn = analyze_chlorophyll_and_sst(lat=13.08, lon=80.27, region_name="Chennai Coast")
    assert res_tn.mean_sst_c > 27.0


def test_analyze_productivity_decline():
    # Gujarat
    diag_gu = analyze_productivity_decline(region_name="Gujarat Veraval Coast", lat=20.90, lon=70.36)
    assert len(diag_gu.primary_causes) >= 3
    assert len(diag_gu.recommendations) >= 2
    assert any("Heatwave" in c or "Warming" in c or "Trawling" in c for c in diag_gu.primary_causes)

    # Maharashtra
    diag_mh = analyze_productivity_decline(region_name="Mumbai / Dahanu", lat=19.98, lon=72.73)
    assert any("Habitat" in c or "Trawling" in c or "Bombay Duck" in c for c in diag_mh.primary_causes)

    # Kerala
    diag_kl = analyze_productivity_decline(region_name="Kochi Malabar", lat=9.93, lon=76.26)
    assert any("Sardine" in c or "Upwelling" in c for c in diag_kl.primary_causes)


def test_evaluate_zone_avoidance():
    # Severe Weather Hazard
    severe_weather = WeatherEvidence(
        temperature_c=27.0,
        wind_speed_kmh=52.0,
        wind_direction="SW",
        wave_height_m=3.4,
        visibility_km=4.0,
        forecast="rough",
        source="INCOIS",
    )
    res_weather_hazard = evaluate_zone_avoidance(lat=18.9, lon=72.8, weather=severe_weather)
    assert res_weather_hazard.overall_avoidance_status == "CRITICAL_AVOIDANCE"
    assert len(res_weather_hazard.avoided_zones) >= 1

    # Geofence Breach
    breached_geofence = [
        GeofenceZoneModel(
            id="imbl_sl_1",
            name="IMBL Sri Lanka Buffer Zone",
            category="IMBL",
            risk_level="CRITICAL_DANGER",
            description="Restricted international boundary",
            distance_to_vessel_km=0.0,
            is_inside=True,
            is_proximity_warning=False,
        )
    ]
    res_geofence = evaluate_zone_avoidance(lat=9.28, lon=79.31, geofences=breached_geofence)
    assert res_geofence.overall_avoidance_status == "CRITICAL_AVOIDANCE"
    assert any("BREACH" in item.reason for item in res_geofence.avoided_zones)


# =========================================================================
# 2. Intent Classification & Planner Routing Tests
# =========================================================================

def test_intent_classification_new_intents():
    # Chlorophyll & SST
    intent_chl = _fallback_intent("Where are the thermal fronts and chlorophyll-a concentrations today?")
    assert intent_chl["intent"] == "chlorophyll_sst_analytics"

    # Fish Productivity Decline
    intent_decl = _fallback_intent("Why has fish catch decreased in Maharashtra and Gujarat waters over the past years?")
    assert intent_decl["intent"] == "fish_productivity_decline"

    # Zone Avoidance
    intent_avoid = _fallback_intent("Which fishing zones should be avoided today due to hazardous marine conditions or geofencing?")
    assert intent_avoid["intent"] == "zone_avoidance"

    # Tidal Forecast
    intent_tide = _fallback_intent("What is the high tide and low tide timing for Mumbai port today?")
    assert intent_tide["intent"] == "weather_conditions"


def test_planner_multi_agent_tasks():
    plan_chl = create_plan(
        question="Show chlorophyll and SST",
        intent="chlorophyll_sst_analytics",
        lat=18.9,
        lon=72.8,
        date="2026-08-26",
    )
    assert any(t.agent == "ocean_analytics_agent" and t.action == "analyze_chlorophyll_sst" for t in plan_chl.tasks)

    plan_decl = create_plan(
        question="Why has fish catch declined?",
        intent="fish_productivity_decline",
        lat=20.9,
        lon=70.3,
        date="2026-08-26",
    )
    assert any(t.agent == "ocean_analytics_agent" and t.action == "analyze_productivity_decline" for t in plan_decl.tasks)

    plan_avoid = create_plan(
        question="Which zones should I avoid?",
        intent="zone_avoidance",
        lat=9.2,
        lon=79.3,
        date="2026-08-26",
    )
    assert any(t.agent == "ocean_analytics_agent" and t.action == "evaluate_zone_avoidance" for t in plan_avoid.tasks)


# =========================================================================
# 3. All 8 ISRO SIH Problem Statement Query Scenarios via Chat API
# =========================================================================

def test_scenario_1_marine_weather_advisory(client):
    """Scenario 1: Marine Weather & Sea-State Advisory (INCOIS OSF, wave, wind, tide)."""
    resp = client.post("/api/chat", json={
        "message": "What is the wave height, wind speed, and sea condition near Veraval port today?",
        "language": "en",
        "location": {"lat": 20.90, "lon": 70.36},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "Wave Height" in data["answer"] or "Ocean State Forecast" in data["answer"]
    assert data["weather"] is not None


def test_scenario_2_potential_fishing_zones(client):
    """Scenario 2: Potential Fishing Zone (PFZ) Identification (species, bearing, distance)."""
    resp = client.post("/api/chat", json={
        "message": "Where are the nearest high-yield Potential Fishing Zones (PFZ) for Tuna and Mackerel?",
        "language": "en",
        "location": {"lat": 18.92, "lon": 72.83},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "Potential Fishing Zones" in data["answer"] or "PFZ" in data["answer"]
    assert len(data["nearest_pfz"]) > 0


def test_scenario_3_safety_risk_assessment(client):
    """Scenario 3: Safety Risk & Navigation Feasibility Assessment (Go / Caution / No-Go)."""
    resp = client.post("/api/chat", json={
        "message": "Is it safe for a small motorized boat to go out to sea today?",
        "language": "en",
        "location": {"lat": 9.93, "lon": 76.26},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] in ["safe", "caution", "unsafe"]


def test_scenario_4_maritime_boundary_geofence(client):
    """Scenario 4: Maritime Border (IMBL) & Geofence Proximity Alerts."""
    resp = client.post("/api/chat", json={
        "message": "Am I close to the International Maritime Boundary Line (IMBL) near Rameshwaram and Palk Strait?",
        "language": "en",
        "location": {"lat": 9.28, "lon": 79.31},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["geofences"]) > 0


def test_scenario_5_multi_hazard_cyclone_alert(client):
    """Scenario 5: Multi-hazard & Cyclone Alert Detection (proactive early warning)."""
    resp = client.post("/api/chat", json={
        "message": "Are there any active cyclone, high wave, or rough weather alerts in the Arabian Sea?",
        "language": "en",
        "location": {"lat": 15.49, "lon": 73.82},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts" in data


def test_scenario_6_chlorophyll_and_sst_analytics(client):
    """Scenario 6: Chlorophyll-a & SST Thermal Front Analytics (Earth Observation)."""
    resp = client.post("/api/chat", json={
        "message": "What is the sea surface temperature and chlorophyll-a concentration in Maharashtra waters?",
        "language": "en",
        "location": {"lat": 18.92, "lon": 72.83},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "Chlorophyll" in data["answer"] or "Thermal Front" in data["answer"]
    assert data["ocean_analytics"] is not None
    assert data["ocean_analytics"]["mean_chlorophyll_mg_m3"] > 0


def test_scenario_7_marine_ecological_productivity_decline(client):
    """Scenario 7: Marine Ecological Reasoning for Fish Productivity Decline."""
    resp = client.post("/api/chat", json={
        "message": "Why has fish productivity declined in Maharashtra and Gujarat waters over the past years?",
        "language": "en",
        "location": {"lat": 20.90, "lon": 70.36},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "Marine Ecological Analysis" in data["answer"] or "Productivity" in data["answer"]
    assert data["ecology"] is not None
    assert len(data["ecology"]["primary_causes"]) > 0


def test_scenario_8_zone_avoidance_and_safe_routing(client):
    """Scenario 8: Safe Fishing Ground Route & Hazard/Geofence Zone Avoidance."""
    resp = client.post("/api/chat", json={
        "message": "Which zones to avoid today due to hazardous marine conditions or geofencing?",
        "language": "en",
        "location": {"lat": 9.28, "lon": 79.31},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "Avoidance" in data["answer"] or "Avoid" in data["answer"]
    assert data["zone_avoidance"] is not None
