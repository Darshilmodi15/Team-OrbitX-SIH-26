import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestDemoScenario(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_dahanu_killer_demo_endpoint(self):
        """Tests the dedicated one-click killer demo endpoint for Dahanu fisherman scenario."""
        response = self.client.post("/api/demo/dahanu?language=en")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # 1. Verify explainable reasoning and plan
        self.assertIn("reasoning", data)
        self.assertIn("sources_used", data)
        self.assertIn("intent_agent", data["sources_used"])
        self.assertIn("planner", data["sources_used"])
        self.assertIn("pfz_unavailable", data["sources_used"])
        self.assertNotIn("route_optimizer_agent", data["sources_used"])

        # 2. Verify Structured Multi-Agent Evidence fields
        self.assertIsNotNone(data["weather"])
        self.assertIsNotNone(data["risk_level"])
        self.assertIsNone(data["nearest_pfz"])

        # No route may be fabricated without a provider PFZ.
        self.assertIsNone(data["route"])

        # 4. Verify Geofences & Alerts
        self.assertIsNotNone(data["geofences"])
        self.assertIsNotNone(data["alerts"])

        # 5. Verify synthesized operational advisory content
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")

    def test_simulate_api_endpoint(self):
        payload = {
            "location": {"lat": 19.9700, "lon": 72.7300},
            "delta_wave_m": 1.5,
        }
        response = self.client.post("/api/simulate", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("baseline_weather", data)
        self.assertIn("baseline_risk", data)
        self.assertIn("simulation", data)
        self.assertTrue(data["simulation"]["is_simulation"])

    def test_geofences_api_endpoint(self):
        response = self.client.get("/api/geofences?lat=19.9700&lon=72.7300")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("geofences", data)
        self.assertGreater(len(data["geofences"]), 0)

    def test_alerts_api_endpoint(self):
        response = self.client.get("/api/alerts?lat=19.9700&lon=72.7300")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("alerts", data)


if __name__ == "__main__":
    unittest.main()


# Explicit upstream fixtures: these tests exercise orchestration, not live model prose.
import pytest
pytestmark = pytest.mark.usefixtures("pipeline_providers")
