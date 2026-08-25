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
        self.assertIn("incois_derived_pfz_dataset", data["sources_used"])
        self.assertIn("route_optimizer_agent", data["sources_used"])

        # 2. Verify Structured Multi-Agent Evidence fields
        self.assertIsNotNone(data["weather"])
        self.assertIsNotNone(data["risk_level"])
        self.assertIsNotNone(data["nearest_pfz"])
        self.assertGreater(len(data["nearest_pfz"]), 0)

        # 3. Verify Route and Waypoints
        self.assertIsNotNone(data["route"])
        self.assertEqual(len(data["route"]["waypoints"]), 3)
        self.assertGreater(data["route"]["distance_km"], 0)
        self.assertGreater(data["route"]["distance_nm"], 0)
        self.assertTrue(data["route"]["is_advisory_only"])

        # 4. Verify Geofences & Alerts
        self.assertIsNotNone(data["geofences"])
        self.assertIsNotNone(data["alerts"])

        # 5. Verify synthesized operational advisory content
        self.assertIn("Operational Advisory", data["answer"])
        self.assertIn("Potential Fishing Zones", data["answer"])
        self.assertIn("Recommended Safe Navigation Route", data["answer"])

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
