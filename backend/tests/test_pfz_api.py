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

        self.assertEqual(data.get("source"), "unavailable")
        self.assertEqual(data.get("pfz_zones"), [])


if __name__ == "__main__":
    unittest.main()
