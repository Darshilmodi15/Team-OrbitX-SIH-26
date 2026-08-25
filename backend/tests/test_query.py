"""Integration tests for ORCA /query endpoint and multi-agent execution."""
import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestQueryEndpoint(unittest.TestCase):
    """Test suite verifying end-to-end execution of /query across intents."""

    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_query_safety_check(self):
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Is it safe to sail today?",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("answer", data)
        self.assertIn("reasoning", data)
        self.assertIn("sources_used", data)
        self.assertIn("plan", data)
        
        self.assertIn("planner", data["sources_used"])
        self.assertIn("intent_agent", data["sources_used"])
        self.assertTrue(
            any(s in data["sources_used"] for s in ["INCOIS_OSF_WW3", "open_meteo_marine_api", "mock_marine_weather"]),
            f"Expected weather source in {data['sources_used']}",
        )
        self.assertIn("risk_assessment_agent", data["sources_used"])
        self.assertNotIn("incois_derived_pfz_dataset", data["sources_used"])
        self.assertNotIn("geospatial_agent", data["sources_used"])
        self.assertIsInstance(data["plan"]["tasks"], list)

    def test_query_nearest_pfz(self):
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Where is the nearest fishing zone?",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("planner", data["sources_used"])
        self.assertIn("incois_derived_pfz_dataset", data["sources_used"])
        self.assertIn("geospatial_agent", data["sources_used"])
        self.assertNotIn("open_meteo_marine_api", data["sources_used"])
        self.assertNotIn("mock_marine_weather", data["sources_used"])
        self.assertNotIn("INCOIS_OSF_WW3", data["sources_used"])
        self.assertNotIn("risk_assessment_agent", data["sources_used"])
        self.assertIn("Nearby Potential Fishing Zones", data["answer"])

    def test_query_weather_conditions(self):
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "What is the weather forecast and wave height?",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("planner", data["sources_used"])
        self.assertTrue(
            any(s in data["sources_used"] for s in ["INCOIS_OSF_WW3", "open_meteo_marine_api", "mock_marine_weather"]),
            f"Expected weather source in {data['sources_used']}",
        )
        self.assertNotIn("incois_derived_pfz_dataset", data["sources_used"])
        self.assertNotIn("risk_assessment_agent", data["sources_used"])

    def test_query_safety_check_with_pfz(self):
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Is it safe to fish today and where are the closest fishing spots?",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("planner", data["sources_used"])
        self.assertTrue(
            any(s in data["sources_used"] for s in ["INCOIS_OSF_WW3", "open_meteo_marine_api", "mock_marine_weather"]),
            f"Expected weather source in {data['sources_used']}",
        )
        self.assertIn("risk_assessment_agent", data["sources_used"])
        self.assertIn("incois_derived_pfz_dataset", data["sources_used"])
        self.assertIn("geospatial_agent", data["sources_used"])

    def test_query_general(self):
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Hello there, what are your capabilities?",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("planner", data["sources_used"])
        self.assertEqual(len(data["plan"]["tasks"]), 0)


if __name__ == "__main__":
    unittest.main()
