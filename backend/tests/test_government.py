"""Unit and Integration tests for ORCA Government Announcements & Documents Portal."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from tests.auth_helpers import authenticate_client
from app.models.user_models import UserRole
from app.models.government_models import AnnouncementCategory, CreateAnnouncementRequest
from app.services.government import government_service


class TestGovernmentService(unittest.TestCase):
    """Tests for GovernmentService logic and filtering."""

    def test_default_announcements_seeded(self):
        self.assertEqual(government_service.get_announcements(), [])

    def test_filter_by_state(self):
        government_service.create_announcement(CreateAnnouncementRequest(title="Test bulletin", issuing_authority="Test authority", state_or_national="Gujarat", summary="Fixture only", full_text="Explicit test fixture, not a real bulletin", category=AnnouncementCategory.SAFETY_BAN))
        gujarat_items = government_service.get_announcements(state="Gujarat")
        self.assertTrue(any("Gujarat" in a.state_or_national for a in gujarat_items))

    def test_filter_by_urgent(self):
        urgent_items = government_service.get_announcements(urgent_only=True)
        self.assertTrue(all(a.is_urgent for a in urgent_items))

    def test_create_announcement(self):
        req = CreateAnnouncementRequest(
            title="Advisory on Cyclone Shakti Preparation for Saurashtra Ports",
            issuing_authority="Gujarat State Disaster Management Authority (GSDMA)",
            state_or_national="Gujarat",
            effective_dates="August 25 to August 28, 2026",
            summary="Port signal 4 hoisted at Pipavav and Bhavnagar. Fishermen must moor crafts securely.",
            full_text="Under influence of severe depression, all small craft activities suspended until clearance.",
            category=AnnouncementCategory.CYCLONE_ALERT,
            reference_number="GSDMA/CYC/2026/09",
            is_urgent=True,
        )
        created = government_service.create_announcement(req)
        self.assertIsNotNone(created)
        self.assertTrue(created.id.startswith("GOV-ANN-"))
        self.assertEqual(created.title, req.title)

    def test_get_documents(self):
        self.assertEqual(government_service.get_documents(), [])


class TestGovernmentEndpoints(unittest.TestCase):
    """Integration tests for /api/government REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)
        authenticate_client(self.client, UserRole.GOVERNMENT)
        self.gov_headers = dict(self.client.headers)

    def test_get_announcements_endpoint(self):
        res = self.client.get("/api/government/announcements")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(data, [])

    def test_get_announcement_by_id_endpoint(self):
        res = self.client.get("/api/government/announcements/GOV-ANN-2026-01")
        self.assertEqual(res.status_code, 404)

    def test_post_announcement_endpoint(self):
        payload = {
            "title": "Diesel Subsidy Quota Allotment Q3 2026",
            "issuing_authority": "Commissioner of Fisheries, Maharashtra",
            "state_or_national": "Maharashtra",
            "effective_dates": "Q3 2026",
            "summary": "State sales tax refund on high-speed diesel for registered mechanized fishing boats.",
            "full_text": "Fishermen cooperatives can submit biometric logbook verification at Sassoon Dock.",
            "category": "Government Schemes & PMMSY Subsidy",
            "reference_number":"MH-FISH-2026-99",
            "is_urgent": False,
        }
        res = self.client.post("/api/government/announcements", json=payload, headers=self.gov_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("id", data)

    def test_get_documents_endpoint(self):
        res = self.client.get("/api/government/documents")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(data, [])


if __name__ == "__main__":
    unittest.main()
