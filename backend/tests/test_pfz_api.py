"""Automated tests for PFZ dataset API endpoints."""
import json
from pathlib import Path
import sys
import unittest

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app


class TestPFZApi(unittest.TestCase):
    """Test suite for PFZ REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        """Verify GET / returns healthy status and registered endpoints."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("/api/pfz", data["endpoints"])

    def test_pfz_endpoint(self):
        """Verify GET /api/pfz loads 11 INCOIS records from JSON."""
        response = self.client.get("/api/pfz")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Source & Region validations
        self.assertEqual(data.get("source"), "INCOIS")
        self.assertEqual(data.get("region"), "Maharashtra")

        # Zone records validation
        zones = data.get("pfz_zones", [])
        self.assertEqual(len(zones), 11, f"Expected 11 records, got {len(zones)}")

        for z in zones:
            self.assertTrue("id" in z and z["id"].startswith("pfz_"))
            self.assertIn("landing_centre", z)
            self.assertIn("direction", z)
            self.assertIn("bearing_deg", z)
            self.assertIsInstance(z["bearing_deg"], (int, float))
            self.assertIn("distance_km", z)
            self.assertIn("min", z["distance_km"])
            self.assertIn("max", z["distance_km"])
            self.assertIn("depth_m", z)
            self.assertIn("min", z["depth_m"])
            self.assertIn("max", z["depth_m"])
            self.assertIn("latitude", z)
            self.assertIsInstance(z["latitude"], (int, float))
            self.assertIn("longitude", z)
            self.assertIsInstance(z["longitude"], (int, float))


if __name__ == "__main__":
    unittest.main()
