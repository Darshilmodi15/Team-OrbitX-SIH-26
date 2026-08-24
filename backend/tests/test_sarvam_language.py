"""Unit and Integration tests for Sarvam AI Language & Voice Services."""
import base64
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.language import (
    LanguageService,
    SarvamLanguageProvider,
    SUPPORTED_LANGUAGES,
    language_service,
    to_sarvam_code,
    to_iso_code,
)


class TestSarvamLanguageService(unittest.TestCase):
    """Tests for SarvamLanguageProvider and LanguageService orchestration."""

    def setUp(self):
        self.client = TestClient(app)
        self.provider = SarvamLanguageProvider(api_key="test_mock_key")

    def test_language_code_conversions(self):
        """Validates mapping between ISO 639-1 and Sarvam BCP-47 codes."""
        self.assertEqual(to_sarvam_code("gu"), "gu-IN")
        self.assertEqual(to_sarvam_code("hi"), "hi-IN")
        self.assertEqual(to_sarvam_code("mr"), "mr-IN")
        self.assertEqual(to_sarvam_code("en"), "en-IN")
        self.assertEqual(to_sarvam_code("ta"), "ta-IN")
        
        self.assertEqual(to_iso_code("gu-IN"), "gu")
        self.assertEqual(to_iso_code("hi-IN"), "hi")
        self.assertEqual(to_iso_code("en-IN"), "en")
        self.assertEqual(to_iso_code("unknown"), "unknown")

    def test_native_script_detection_gujarati(self):
        """Validates zero-latency Unicode detection of Gujarati text."""
        text = "શું આજે દરિયામાં જવું સલામત છે?"
        detected = self.provider.detect_language(text)
        self.assertEqual(detected, "gu")

    def test_native_script_detection_hindi(self):
        """Validates Unicode detection of Hindi/Devanagari text."""
        text = "क्या आज समुद्र में जाना सुरक्षित है?"
        detected = self.provider.detect_language(text)
        self.assertEqual(detected, "hi")

    def test_native_script_detection_tamil(self):
        """Validates Unicode detection of Tamil text."""
        text = "இன்று கடலுக்குச் செல்வது பாதுகாப்பானதா?"
        detected = self.provider.detect_language(text)
        self.assertEqual(detected, "ta")

    def test_english_detection(self):
        """Validates fallback to English for ASCII queries."""
        text = "Is it safe to go fishing near Mumbai port?"
        detected = self.provider.detect_language(text)
        self.assertEqual(detected, "en")

    def test_translation_identity(self):
        """Translating between same languages returns identical string."""
        text = "Weather conditions are safe."
        self.assertEqual(self.provider.translate(text, "en", "en"), text)

    def test_sarvam_live_translate_mock(self):
        """Validates parsing of Sarvam Mayura v1 translation API response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "translated_text": "Is it safe to go fishing today?"
        }

        with patch("httpx.Client.post", return_value=mock_response):
            res = self.provider.translate("શું આજે માછીમારી માટે જવું સલામત છે?", "gu", "en")
            self.assertEqual(res, "Is it safe to go fishing today?")

    def test_speech_to_text_mock(self):
        """Validates Speech-to-Text payload handling."""
        mock_audio = b"RIFF....WAVEfmt ...."
        res = self.provider.speech_to_text(mock_audio, language_code="gu")
        self.assertIn("transcript", res)
        self.assertIn("language_code", res)

    def test_text_to_speech_mock(self):
        """Validates Text-to-Speech Bulbul v3 request formatting."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "audios": ["UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="]
        }

        with patch("httpx.Client.post", return_value=mock_response):
            res = self.provider.text_to_speech("દરિયાઈ સ્થિતિ સલામત છે.", language_code="gu", speaker="meera")
            self.assertEqual(res["speaker"], "meera")
            self.assertEqual(res["language_code"], "gu-IN")
            self.assertIsNotNone(res["audio_base64"])


class TestVoiceEndpoints(unittest.TestCase):
    """Integration tests for FastAPI /api/voice/* endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_voice_speakers_catalog(self):
        """Validates GET /api/voice/speakers."""
        res = self.client.get("/api/voice/speakers")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Sarvam AI", data["provider"])
        self.assertIn("meera", data["available_speakers"])
        self.assertIn("gu", data["supported_languages"])

    def test_voice_speak_endpoint(self):
        """Validates POST /api/voice/speak endpoint."""
        payload = {
            "text": "Weather is calm in Arabian sea.",
            "language": "en",
            "speaker": "kavya",
        }
        res = self.client.post("/api/voice/speak", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["speaker"], "kavya")
        self.assertEqual(data["language_code"], "en-IN")

    def test_voice_transcribe_base64_endpoint(self):
        """Validates POST /api/voice/transcribe-base64."""
        # Simple base64 payload
        dummy_wav = base64.b64encode(b"RIFFdummydataWAVE").decode("utf-8")
        payload = {
            "audio_base64": dummy_wav,
            "filename": "test.wav",
            "language": "gu",
        }
        res = self.client.post("/api/voice/transcribe-base64", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("transcript", data)
        self.assertIn("english_transcript", data)
        self.assertEqual(data["language"], "gu")

    def test_query_multilingual_with_sarvam_attribution(self):
        """Validates that /query endpoint includes sarvam_ai_language_service attribution."""
        payload = {
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Can I go sailing today?",
            "language": "en",
        }
        res = self.client.post("/query", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("sarvam_ai_language_service", data["sources_used"])
        self.assertIn("bhashini_multilingual_service", data["sources_used"])


if __name__ == "__main__":
    unittest.main()
