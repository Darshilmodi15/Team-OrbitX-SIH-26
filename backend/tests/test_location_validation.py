"""Unit and Integration tests for India Boundary Validation & Coastal Distance Calculation."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.services.location import (
    coastal_distance_service,
    location_service,
)


class TestLocationValidation(unittest.TestCase):
    """Tests for coastal distance math and boundary validation."""

    def setUp(self):
        self.client = TestClient(app)

    def test_coastal_mumbai_location_valid(self):
        """Mumbai Sassoon Dock (~18.92N, 72.83E) is coastal and supported."""
        res = location_service.validate_location(lat=18.9220, lon=72.8347)
        self.assertTrue(res.inside_india)
        self.assertTrue(res.is_coastal_supported)
        self.assertEqual(res.coastal_region, "Maharashtra")
        self.assertLess(res.distance_to_coast_km, 15.0)

    def test_coastal_veraval_location_valid(self):
        """Veraval Fishing Port (~20.90N, 70.37E) is coastal and supported in Gujarat."""
        res = location_service.validate_location(lat=20.9000, lon=70.3700)
        self.assertTrue(res.inside_india)
        self.assertTrue(res.is_coastal_supported)
        self.assertEqual(res.coastal_region, "Gujarat")
        self.assertLess(res.distance_to_coast_km, 10.0)

    def test_inland_delhi_location_rejected_gracefully(self):
        """New Delhi (~28.61N, 77.20E) is in India but far inland (>100 km)."""
        res = location_service.validate_location(lat=28.6139, lon=77.2090)
        self.assertTrue(res.inside_india)
        self.assertFalse(res.is_coastal_supported)
        self.assertGreater(res.distance_to_coast_km, 500.0)
        self.assertIn("inland from the nearest coast", res.message)

    def test_inland_bhopal_location_rejected_gracefully(self):
        """Bhopal, Madhya Pradesh (~23.25N, 77.41E) is inland and not coastal."""
        res = location_service.validate_location(lat=23.2599, lon=77.4126)
        self.assertTrue(res.inside_india)
        self.assertFalse(res.is_coastal_supported)
        self.assertGreater(res.distance_to_coast_km, 400.0)

    def test_outside_india_london_rejected(self):
        """London, UK (~51.50N, -0.12E) is outside Indian territory."""
        res = location_service.validate_location(lat=51.5074, lon=-0.1278)
        self.assertFalse(res.inside_india)
        self.assertFalse(res.is_coastal_supported)
        self.assertIn("outside the sovereign territory", res.message)

    def test_outside_india_beijing_rejected(self):
        """Beijing (~39.90N, 116.40E) is outside India."""
        res = location_service.validate_location(lat=39.9042, lon=116.4074)
        self.assertFalse(res.inside_india)
        self.assertFalse(res.is_coastal_supported)

    def test_location_validate_endpoint(self):
        """Validates POST /api/location/validate endpoint."""
        payload = {"lat": 9.9312, "lon": 76.2673}  # Kochi, Kerala
        res = self.client.post("/api/location/validate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["inside_india"])
        self.assertTrue(data["is_coastal_supported"])
        self.assertEqual(data["coastal_region"], "Kerala")


if __name__ == "__main__":
    unittest.main()
