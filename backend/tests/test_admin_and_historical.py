"""Unit and Integration tests for Super Admin Diagnostics and Historical Marine Comparison."""
import unittest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import patch

from app.main import app
from app.models.user_models import UserRole
from app.services.admin import admin_service
from tests.auth_helpers import authenticate_client


class TestAdminAndHistoricalService(unittest.TestCase):
    """Tests for AdminService diagnostics and Historical comparison."""

    def test_system_health_diagnostics(self):
        health = admin_service.get_system_health()
        self.assertEqual(health.overall_status, "DEGRADED")
        self.assertGreaterEqual(health.registered_users_count, 0)
        self.assertGreaterEqual(len(health.services), 4)
        incois_svc = next((s for s in health.services if "INCOIS" in s.service_name), None)
        self.assertIsNotNone(incois_svc)
        self.assertEqual(incois_svc.status, "UNKNOWN")

    def test_missing_history_is_unavailable_for_both_windows(self):
        for period in (24, 168):
            with self.assertRaises(HTTPException) as error:
                admin_service.get_historical_comparison(lat=18.92, lon=72.83, period_hours=period)
            self.assertEqual(error.exception.status_code, 503)
            self.assertEqual(error.exception.detail, "HISTORICAL_DATA_UNAVAILABLE")

    def test_comparison_uses_supplied_observations(self):
        from types import SimpleNamespace
        current = SimpleNamespace(wave_height_m=2.0, wind_speed_kmh=20.0, sst_c=29.0)
        past = SimpleNamespace(wave_height_m=1.0, wind_speed_kmh=10.0, sst_c=28.0)
        with patch('app.repositories.MarineObservationRepository.get_latest_observation', return_value=current), patch('app.repositories.MarineObservationRepository.get_historical_window', return_value=past):
            comparison = admin_service.get_historical_comparison(18.92, 72.83)
        self.assertEqual(comparison.wave_delta_m, 1.0)
        self.assertEqual(comparison.wind_delta_kmh, 10.0)
        self.assertEqual(comparison.safety_trend, 'DETERIORATING')


class TestAdminEndpoints(unittest.TestCase):
    """Integration tests for Admin and Historical REST endpoints."""

    def setUp(self):
        self.client = authenticate_client(TestClient(app), UserRole.SUPER_ADMIN)
        self.admin_headers = dict(self.client.headers)

    def test_get_system_health_endpoint(self):
        res = self.client.get("/api/admin/system-health", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["overall_status"], "DEGRADED")
        self.assertIn("services", data)

    def test_get_admin_users_endpoint(self):
        res = self.client.get("/api/admin/users", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertTrue(all(user["id"] != "USR-DEMO-01" for user in data))

    def test_patch_user_role_endpoint(self):
        reg = self.client.post("/api/auth/register", json={
            "name": "Test Role Account",
            "email": "role_test_user@orca.marine",
            "password": "Password123!",
            "role": "USER",
        }).json()
        target_user_id = reg["user"]["id"]

        payload = {"role": UserRole.GOVERNMENT.value}
        res = self.client.patch(f"/api/admin/users/{target_user_id}/role", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], UserRole.GOVERNMENT.value)

    def test_get_historical_comparison_endpoint(self):
        res = self.client.get("/api/marine/historical-comparison?lat=18.92&lon=72.83&period_hours=24")
        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.json()["detail"], "HISTORICAL_DATA_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
