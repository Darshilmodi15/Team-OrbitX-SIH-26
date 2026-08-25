"""Unit and Integration tests for Super Admin Diagnostics and Historical Marine Comparison."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user_models import UserRole
from app.services.admin import admin_service


class TestAdminAndHistoricalService(unittest.TestCase):
    """Tests for AdminService diagnostics and Historical comparison."""

    def test_system_health_diagnostics(self):
        health = admin_service.get_system_health()
        self.assertEqual(health.overall_status, "HEALTHY")
        self.assertGreaterEqual(health.registered_users_count, 3)
        self.assertGreaterEqual(len(health.services), 4)
        incois_svc = next((s for s in health.services if "INCOIS" in s.service_name), None)
        self.assertIsNotNone(incois_svc)
        self.assertEqual(incois_svc.status, "OPERATIONAL")

    def test_historical_marine_comparison_24h(self):
        comp = admin_service.get_historical_comparison(lat=18.92, lon=72.83, period_hours=24)
        self.assertEqual(comp.comparison_period_hours, 24)
        self.assertIsInstance(comp.wave_delta_m, float)
        self.assertIn("STABLE", ["IMPROVING", "STABLE", "DETERIORATING"])

    def test_historical_marine_comparison_7d(self):
        comp = admin_service.get_historical_comparison(lat=18.92, lon=72.83, period_hours=168)
        self.assertEqual(comp.comparison_period_hours, 168)
        self.assertIsInstance(comp.wind_delta_kmh, float)


class TestAdminEndpoints(unittest.TestCase):
    """Integration tests for Admin and Historical REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_system_health_endpoint(self):
        res = self.client.get("/api/admin/system-health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["overall_status"], "HEALTHY")
        self.assertIn("services", data)

    def test_get_admin_users_endpoint(self):
        res = self.client.get("/api/admin/users")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 3)

    def test_patch_user_role_endpoint(self):
        reg = self.client.post("/api/auth/register", json={
            "name": "Test Role Account",
            "email": "role_test_user@orca.marine",
            "password": "Password123!",
            "role": "USER",
        }).json()
        target_user_id = reg["user"]["id"]

        payload = {"role": UserRole.GOVERNMENT.value}
        res = self.client.patch(f"/api/admin/users/{target_user_id}/role", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], UserRole.GOVERNMENT.value)

    def test_get_historical_comparison_endpoint(self):
        res = self.client.get("/api/marine/historical-comparison?lat=18.92&lon=72.83&period_hours=24")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("wave_delta_m", data)
        self.assertIn("safety_trend", data)


if __name__ == "__main__":
    unittest.main()
