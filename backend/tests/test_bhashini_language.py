"""Unit and Integration tests for Bhashini Language & Voice Services."""
import base64
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.language import (
    LanguageService,
    BhashiniLanguageProvider,
    SUPPORTED_LANGUAGES,
    language_service,
)


class TestBhashiniLanguageService(unittest.TestCase):
    """Tests for BhashiniLanguageProvider and LanguageService orchestration."""

    def setUp(self):
        self.client = TestClient(app)
        self.provider = BhashiniLanguageProvider()

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

    def test_identity_translation(self):
        """Validates identity when source and target languages match."""
        text = "Weather is calm in Arabian sea."
        self.assertEqual(self.provider.translate(text, "en", "en"), text)

    def test_bhashini_mock_stt_fallback(self):
        """Validates that unconfigured Bhashini returns is_mock=True gracefully."""
        res = self.provider.speech_to_text(
            audio_bytes=b"0123456789audio",
            filename="audio.webm",
            language_code="gu",
            content_type="audio/webm",
        )
        self.assertTrue(res["is_mock"])
        self.assertEqual(res["source"], "bhashini_mock_stt")

    def test_bhashini_mock_tts_fallback(self):
        """Validates that unconfigured Bhashini TTS returns is_mock=True gracefully."""
        res = self.provider.text_to_speech(
            text="હવામાન શાંત છે.",
            language_code="gu",
        )
        self.assertTrue(res["is_mock"])
        self.assertIsNone(res["audio_base64"])


class TestBhashiniVoiceEndpoints(unittest.TestCase):
    """Integration tests for FastAPI /api/voice/* endpoints with Bhashini."""

    def setUp(self):
        self.client = TestClient(app)

    def test_voice_speakers_catalog(self):
        """Validates GET /api/voice/speakers returns Bhashini provider."""
        res = self.client.get("/api/voice/speakers")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Bhashini", data["provider"])
        self.assertEqual(data["default_speaker"], "female")
        self.assertIn("gu", data["supported_languages"])

    def test_voice_transcribe_base64_bhashini_mock(self):
        """Validates POST /api/voice/transcribe-base64 with Bhashini mocked response."""
        mock_result = {
            "transcript": "શું આજે માછીમારી કરવી સુરક્ષિત છે?",
            "detected_iso": "gu",
            "language_code": "gu-IN",
            "source": "bhashini_asr",
            "is_mock": False,
        }
        dummy_wav = base64.b64encode(b"RIFFdummydataWAVE").decode("utf-8")
        payload = {
            "audio_base64": dummy_wav,
            "filename": "test.wav",
            "language": "gu",
        }
        with patch("app.routers.voice.language_service.speech_to_text", return_value=mock_result):
            res = self.client.post("/api/voice/transcribe-base64", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["provider"], "bhashini")
            self.assertEqual(data["source"], "bhashini_asr")
            self.assertIn("transcript", data)


if __name__ == "__main__":
    unittest.main()

import pytest
pytestmark = pytest.mark.usefixtures("pipeline_providers")

