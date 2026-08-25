"""Unit and Integration tests for ORCA Safety Notifications and Anomaly Monitoring."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.notification_models import NotificationCategory, NotificationSeverity
from app.services.notifications import notification_service


class TestNotificationService(unittest.TestCase):
    """Tests for NotificationService business logic and alert generation."""

    def test_default_seeded_notifications(self):
        res = notification_service.get_notifications_for_user()
        self.assertGreaterEqual(len(res.notifications), 3)
        self.assertGreaterEqual(res.unread_count, 1)

    def test_mark_as_read(self):
        res = notification_service.get_notifications_for_user()
        unread_notif = next((n for n in res.notifications if not n.is_read), None)
        self.assertIsNotNone(unread_notif)

        updated = notification_service.mark_as_read(unread_notif.id)
        self.assertIsNotNone(updated)
        self.assertTrue(updated.is_read)

    def test_imbl_proximity_alert_generation(self):
        """Coordinates near Sir Creek / Kutch (~23.28N, 68.10E) trigger CRITICAL IMBL alert."""
        alerts = notification_service.evaluate_location_alerts(lat=23.28, lon=68.10)
        imbl_alert = next((a for a in alerts if a.category == NotificationCategory.GEOFENCE), None)
        self.assertIsNotNone(imbl_alert)
        self.assertEqual(imbl_alert.severity, NotificationSeverity.CRITICAL)
        self.assertIn("IMBL", imbl_alert.title)

    def test_severe_weather_alert_generation(self):
        """Wave height 3.2m with gusts 65 km/h triggers CRITICAL weather alert."""
        alerts = notification_service.evaluate_location_alerts(
            lat=18.92,
            lon=72.83,
            wave_height_m=3.2,
            wind_gusts_kmh=65.0,
        )
        weather_alert = next((a for a in alerts if a.category == NotificationCategory.WEATHER), None)
        self.assertIsNotNone(weather_alert)
        self.assertEqual(weather_alert.severity, NotificationSeverity.CRITICAL)

    def test_anomaly_detection_trajectory(self):
        """Vessel rapidly advancing towards IMBL boundary generates ANOMALY warning."""
        alerts = notification_service.evaluate_location_alerts(
            lat=23.25,
            lon=68.05,
            previous_lat=23.10,
            previous_lon=68.50,
        )
        anomaly_alert = next((a for a in alerts if a.category == NotificationCategory.ANOMALY), None)
        self.assertIsNotNone(anomaly_alert)
        self.assertIn("Anomaly", anomaly_alert.title)


class TestNotificationEndpoints(unittest.TestCase):
    """Integration tests for /api/notifications REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_notifications_endpoint(self):
        res = self.client.get("/api/notifications")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("unread_count", data)
        self.assertIn("notifications", data)

    def test_check_location_alerts_endpoint(self):
        payload = {
            "lat": 23.28,
            "lon": 68.10,
            "user_id": "test_vessel_101",
        }
        res = self.client.post("/api/notifications/check", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data["notifications"]), 1)


if __name__ == "__main__":
    unittest.main()
