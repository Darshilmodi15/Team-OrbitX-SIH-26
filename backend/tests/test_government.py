"""Unit and Integration tests for ORCA Government Announcements & Documents Portal."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.government_models import AnnouncementCategory, CreateAnnouncementRequest
from app.services.government import government_service


class TestGovernmentService(unittest.TestCase):
    """Tests for GovernmentService logic and filtering."""

    def test_default_announcements_seeded(self):
        announcements = government_service.get_announcements()
        self.assertGreaterEqual(len(announcements), 3)
        ban_ann = next((a for a in announcements if a.category == AnnouncementCategory.SAFETY_BAN), None)
        self.assertIsNotNone(ban_ann)
        self.assertIn("Monsoon Fishing Ban", ban_ann.title)

    def test_filter_by_state(self):
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
        docs = government_service.get_documents()
        self.assertGreaterEqual(len(docs), 3)
        pmmsy_doc = next((d for d in docs if "PMMSY" in d.title), None)
        self.assertIsNotNone(pmmsy_doc)


class TestGovernmentEndpoints(unittest.TestCase):
    """Integration tests for /api/government REST endpoints."""

    def setUp(self):
        self.client = TestClient(app)
        login = self.client.post("/api/auth/login", json={"email_or_phone": "officer@fisheries.gov.in", "password": "govpassword123"})
        self.gov_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    def test_get_announcements_endpoint(self):
        res = self.client.get("/api/government/announcements")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 2)

    def test_get_announcement_by_id_endpoint(self):
        res = self.client.get("/api/government/announcements/GOV-ANN-2026-01")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], "GOV-ANN-2026-01")
        self.assertIn("Monsoon Fishing Ban", data["title"])

    def test_post_announcement_endpoint(self):
        payload = {
            "title": "Diesel Subsidy Quota Allotment Q3 2026",
            "issuing_authority": "Commissioner of Fisheries, Maharashtra",
            "state_or_national": "Maharashtra",
            "effective_dates": "Q3 2026",
            "summary": "State sales tax refund on high-speed diesel for registered mechanized fishing boats.",
            "full_text": "Fishermen cooperatives can submit biometric logbook verification at Sassoon Dock.",
            "category": "Government Schemes & PMMSY Subsidy",
            "reference_number=":"MH-FISH-2026-99",
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
        self.assertGreaterEqual(len(data), 2)


if __name__ == "__main__":
    unittest.main()
