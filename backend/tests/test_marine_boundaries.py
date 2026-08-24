"""Unit and integration tests for Marine Boundaries module (Marine Regions / VLIZ)."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.agent_models import BoundaryEvidence
from app.services.marine_boundaries import (
    DEFAULT_MRGID,
    DATASET_VERSION,
    PROVIDER,
    WFS_ENDPOINT,
    MarineBoundariesService,
    marine_boundaries_service,
)
from app.agents.boundary_agent import check_marine_boundary_evidence
from app.services.planner import Planner


class TestMarineBoundaries(unittest.TestCase):
    """Unit tests for MarineBoundariesService, boundary agent, and API endpoints."""

    def setUp(self):
        self.client = TestClient(app)
        self.service = marine_boundaries_service

    def test_1_metadata_provenance(self):
        """Verifies official provenance metadata."""
        meta = self.service.get_metadata()
        self.assertEqual(meta["provider"], PROVIDER)
        self.assertEqual(meta["version"], DATASET_VERSION)
        self.assertEqual(meta["wfs_endpoint"], WFS_ENDPOINT)
        self.assertFalse(meta["is_realtime"])
        self.assertIn("Exclusive Economic Zone", meta["purpose"])

    def test_2_fetch_india_eez_geojson(self):
        """Verifies loading of Indian EEZ GeoJSON (MRGID 8480)."""
        geojson = self.service.fetch_eez_by_mrgid(DEFAULT_MRGID)
        self.assertIn("type", geojson)
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertTrue(len(geojson.get("features", [])) >= 1)

        feat = geojson["features"][0]
        self.assertEqual(feat["type"], "Feature")
        self.assertIn("geometry", feat)
        self.assertIn(feat["geometry"]["type"], ["Polygon", "MultiPolygon"])
        self.assertEqual(feat["properties"]["mrgid"], DEFAULT_MRGID)
        self.assertEqual(feat["properties"]["territory1"], "India")

    def test_3_spatial_check_offshore_mumbai(self):
        """Verifies spatial geofence check for a vessel operating inside India EEZ."""
        # 35 km offshore Mumbai (18.9220°N, 72.5000°E)
        res = self.service.check_marine_boundary(lat=18.9220, lon=72.5000, mrgid=8480)
        self.assertTrue(res["inside_eez"])
        self.assertEqual(res["country"], "India")
        self.assertEqual(res["geofence_status"], "safe")
        self.assertTrue(res["distance_to_boundary_km"] > 25.0)
        self.assertIn("inside the India Exclusive Economic Zone", res["status_message"])

    def test_4_spatial_check_international_waters(self):
        """Verifies critical geofence classification for vessel in international waters."""
        # Central Arabian Sea far outside EEZ (10.0°N, 60.0°E)
        res = self.service.check_marine_boundary(lat=10.0000, lon=60.0000, mrgid=8480)
        self.assertFalse(res["inside_eez"])
        self.assertEqual(res["geofence_status"], "critical")
        self.assertTrue(res["distance_to_boundary_km"] > 500.0)
        self.assertIn("OUTSIDE", res["status_message"])

    def test_5_boundary_agent_evidence(self):
        """Verifies typed BoundaryEvidence contract produced by Boundary Agent."""
        ev = check_marine_boundary_evidence(lat=20.5000, lon=70.0000, mrgid=8480)
        self.assertIsInstance(ev, BoundaryEvidence)
        self.assertTrue(ev.inside_eez)
        self.assertEqual(ev.country, "India")
        self.assertEqual(ev.mrgid, 8480)
        self.assertEqual(ev.dataset_version, "World EEZ v12")

    def test_6_planner_boundary_intent(self):
        """Verifies deterministic task planner schedules boundary_agent when asking about borders."""
        plan = Planner.plan(
            question="Am I approaching the international maritime boundary or EEZ limit?",
            intent="marine_boundary",
            lat=18.9220,
            lon=72.8347,
            date="2026-08-24",
        )
        task_names = [t.agent for t in plan.tasks]
        self.assertIn("boundary_agent", task_names)

    def test_7_api_info_endpoint(self):
        """Tests GET /api/marine-boundaries/info."""
        response = self.client.get("/api/marine-boundaries/info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provider"], PROVIDER)
        self.assertEqual(data["version"], "World EEZ v12")

    def test_8_api_eez_endpoint(self):
        """Tests GET /api/marine-boundaries/eez."""
        response = self.client.get("/api/marine-boundaries/eez?mrgid=8480")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertTrue(len(data["features"]) >= 1)

    def test_9_api_check_endpoints(self):
        """Tests GET & POST /api/marine-boundaries/check."""
        # GET
        get_res = self.client.get("/api/marine-boundaries/check?lat=18.9220&lon=72.5000&mrgid=8480")
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.json()
        self.assertTrue(get_data["inside_eez"])
        self.assertEqual(get_data["country"], "India")

        # POST
        post_res = self.client.post(
            "/api/marine-boundaries/check",
            json={"lat": 18.9220, "lon": 72.5000, "mrgid": 8480},
        )
        self.assertEqual(post_res.status_code, 200)
        post_data = post_res.json()
        self.assertTrue(post_data["inside_eez"])
        self.assertEqual(post_data["geofence_status"], "safe")

    def test_10_multilingual_query_with_boundary_check(self):
        """Tests end-to-end /query endpoint with boundary check query."""
        payload = {
            "location": {"lat": 18.9220, "lon": 72.5000},
            "date": "2026-08-24",
            "question": "Is my vessel inside the Indian EEZ and where is the maritime boundary?",
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("planner", data["sources_used"])
        self.assertIn(PROVIDER, data["sources_used"])
        self.assertIsNotNone(data.get("boundary"))
        self.assertTrue(data["boundary"]["inside_eez"])
        self.assertEqual(data["boundary"]["country"], "India")
        self.assertIn("Exclusive Economic Zone", data["answer"])


if __name__ == "__main__":
    unittest.main()
