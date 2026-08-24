"""Integration tests for ORCA /api/chat and Bhashini multilingual endpoints."""
import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestChatAndBhashiniEndpoints(unittest.TestCase):
    """Test suite for /api/chat and auxiliary multilingual endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_languages_endpoint(self):
        """Test GET /api/languages."""
        response = self.client.get("/api/languages")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("languages", data)
        codes = [item["code"] for item in data["languages"]]
        self.assertIn("gu", codes)
        self.assertIn("hi", codes)
        self.assertIn("en", codes)
        self.assertIn("mr", codes)
        self.assertIn("ta", codes)

    def test_detect_language_endpoint(self):
        """Test POST /api/detect-language."""
        payload = {"text": "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?"}
        response = self.client.post("/api/detect-language", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["language"], "gu")

    def test_translate_endpoint(self):
        """Test POST /api/translate."""
        payload = {
            "text": "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?",
            "source_language": "gu",
            "target_language": "en",
        }
        response = self.client.post("/api/translate", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("translated_text", data)
        self.assertTrue(len(data["translated_text"]) > 0)

    def test_chat_gujarati_query(self):
        """Test POST /api/chat with Gujarati query and auto-detection."""
        payload = {
            "message": "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?",
            "location": {"lat": 20.9077, "lon": 70.3678},
            "language": "auto",
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "gu")
        self.assertIn("original_message", data)
        self.assertIn("english_query", data)
        self.assertIn("answer", data)
        self.assertIn("reasoning", data)
        self.assertIn("sources_used", data)
        self.assertIn("bhashini_multilingual_service", data["sources_used"])

    def test_chat_hindi_query(self):
        """Test POST /api/chat with Hindi query."""
        payload = {
            "message": "क्या कल मुंबई के पास समुद्र में जाना सुरक्षित है?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "auto",
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "hi")
        self.assertIn("english_query", data)
        self.assertIn("answer", data)
        self.assertIn("bhashini_multilingual_service", data["sources_used"])

    def test_chat_english_query(self):
        """Test POST /api/chat with standard English query."""
        payload = {
            "message": "Is it safe to fish near Mumbai today, and where are the closest fishing spots?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "en")
        self.assertIn("answer", data)
        self.assertIn("sources_used", data)
        self.assertIn("bhashini_multilingual_service", data["sources_used"])

    def test_multilingual_query_backward_compatibility(self):
        """Test POST /query with multilingual support."""
        payload = {
            "location": {"lat": 20.9077, "lon": 70.3678},
            "date": "2026-08-24",
            "question": "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?",
            "language": "auto",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "gu")
        self.assertIn("answer", data)
        self.assertIn("bhashini_multilingual_service", data["sources_used"])


if __name__ == "__main__":
    unittest.main()
