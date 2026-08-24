"""Integration tests for dedicated ORCA marine intelligence and geofence REST endpoints."""
import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestMarineEndpoints(unittest.TestCase):
    """Test suite verifying /api/marine/* and /api/geofences REST routes."""

    def setUp(self):
        self.client = TestClient(app)

    def test_marine_conditions_endpoint(self):
        """Validates GET /api/marine/conditions response structure."""
        response = self.client.get("/api/marine/conditions?lat=18.9220&lon=72.8347")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("wave_height_m", data)
        self.assertIn("wind_speed_kmh", data)
        self.assertIn("forecast", data)
        self.assertIn("source", data)
        self.assertIsInstance(data["wave_height_m"], (int, float))

    def test_marine_risk_endpoint(self):
        """Validates GET /api/marine/risk returns decomposed MarineRiskProfile."""
        response = self.client.get("/api/marine/risk?lat=18.9220&lon=72.8347")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("level", data)
        self.assertIn("reason", data)
        self.assertIn("profile", data)
        self.assertIn("disclaimer", data)
        profile = data["profile"]
        self.assertIn("wave_risk", profile)
        self.assertIn("wind_risk", profile)
        self.assertIn("visibility_risk", profile)

    def test_marine_forecast_horizon_endpoint(self):
        """Validates GET /api/marine/forecast returns hourly forecast horizon."""
        response = self.client.get("/api/marine/forecast?lat=18.9220&lon=72.8347")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("forecast_horizon", data)
        self.assertIsInstance(data["forecast_horizon"], list)

    def test_geofences_catalog_endpoint(self):
        """Validates GET /api/geofences returns all registered boundary zones."""
        response = self.client.get("/api/geofences")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("geofences", data)
        self.assertTrue(len(data["geofences"]) >= 4)

    def test_geofences_proximity_evaluation_endpoint(self):
        """Validates GET /api/geofences with lat/lon parameters evaluates alerts."""
        response = self.client.get("/api/geofences?lat=23.4000&lon=68.1000")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("vessel_location", data)
        self.assertIn("status", data)
        status = data["status"]
        self.assertIn("active_alerts", status)
        self.assertTrue(len(status["active_alerts"]) > 0)


if __name__ == "__main__":
    unittest.main()
