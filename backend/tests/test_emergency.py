"""Unit and Integration tests for ORCA Emergency Services & SOS Broadcasts."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from tests.auth_helpers import authenticate_client
from app.models.user_models import UserRole
from app.models.emergency_models import EmergencyNature, SOSBroadcastRequest
from app.services.emergency import emergency_service


class TestEmergencyService(unittest.TestCase):
    """Tests for EmergencyService logic and MAYDAY formatting."""

    def test_national_contacts_retrieval(self):
        contacts = emergency_service.get_all_emergency_contacts()
        self.assertGreaterEqual(len(contacts), 10)
        icg = next((c for c in contacts if "1554" in c.helpline), None)
        self.assertIsNotNone(icg)
        self.assertIn("Coast Guard", icg.agency_name)

    def test_regional_contacts_filter(self):
        contacts_gujarat = emergency_service.get_all_emergency_contacts(region="Gujarat")
        self.assertTrue(any("Gujarat" in c.region for c in contacts_gujarat))

    def test_mrcc_geographic_routing(self):
        # West Coast (Mumbai ~72.8E)
        mrcc_west = emergency_service.route_to_mrcc(18.92, 72.83)
        self.assertIn("MRCC Mumbai", mrcc_west)

        # East Coast (Chennai ~80.2E)
        mrcc_east = emergency_service.route_to_mrcc(13.08, 80.27)
        self.assertIn("MRCC Chennai", mrcc_east)

        # Andaman & Nicobar (Port Blair ~92.7E)
        mrcc_andaman = emergency_service.route_to_mrcc(11.62, 92.72)
        self.assertIn("MRCC Port Blair", mrcc_andaman)

    def test_mayday_transcript_generation(self):
        mayday = emergency_service.generate_mayday_transcript(
            vessel_name="Matsya Sagar",
            reg_no="IND-GJ-02-F-9988",
            lat=20.9023,
            lon=70.3644,
            emergency_nature=EmergencyNature.ENGINE_FAILURE,
            crew_count=6,
            notes="Drifting near Diu headland",
        )
        self.assertIn("MAYDAY, MAYDAY, MAYDAY", mayday)
        self.assertIn("MATSYA SAGAR", mayday)
        self.assertIn("20.9023° N, 70.3644° E", mayday)
        self.assertIn("6", mayday)
        self.assertIn("REQUIRE IMMEDIATE RESCUE ASSISTANCE", mayday)

    def test_sos_broadcast(self):
        req = SOSBroadcastRequest(
            vessel_name="Ocean Pride",
            registration_no="IND-MH-01-MM-4433",
            lat=18.92,
            lon=72.83,
            crew_count=5,
            emergency_nature=EmergencyNature.CAPSIZING_WATER,
            notes="Taking heavy water in engine room",
            contact_phone="+91-9820011223",
        )
        resp = emergency_service.broadcast_sos(req)
        self.assertEqual(resp.status, "ACTIVE_BEACON_DISPATCHED")
        self.assertTrue(resp.sos_id.startswith("SOS-"))
        self.assertIn("MRCC Mumbai", resp.assigned_mrcc)
        self.assertGreaterEqual(len(resp.emergency_hotlines), 3)


class TestEmergencyEndpoints(unittest.TestCase):
    """Integration tests for /api/emergency REST endpoints."""

    def setUp(self):
        self.client = authenticate_client(TestClient(app), UserRole.SUPER_ADMIN)

    def test_get_contacts_endpoint(self):
        res = self.client.get("/api/emergency/contacts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 5)

    def test_post_sos_endpoint(self):
        payload = {
            "vessel_name": "Sagar Kanya",
            "registration_no": "IND-KA-03-F-7766",
            "lat": 12.87,
            "lon": 74.84,
            "crew_count": 3,
            "emergency_nature": "Critical Medical Emergency on Board",
            "notes": "Crew member unconscious",
            "contact_phone": "+91-9876543210",
        }
        res = self.client.post("/api/emergency/sos", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("sos_id", data)
        self.assertEqual(data["status"], "ACTIVE_BEACON_DISPATCHED")
        self.assertIn("MAYDAY", data["mayday_message"])

    def test_get_active_sos_endpoint(self):
        res = self.client.get("/api/emergency/sos/active")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)


if __name__ == "__main__":
    unittest.main()
