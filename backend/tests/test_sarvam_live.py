"""Live integration verification tests for Sarvam Language Identification API.

This test connects to the live Sarvam API (https://api.sarvam.ai/text-lid)
using the SARVAM_API_KEY environment variable.

CRITICAL SECURITY RULE:
The API key is NEVER printed, logged, or exposed in test output.
"""
import os
import unittest
from dotenv import load_dotenv

from app.models.agent_models import LanguageIdentificationResult
from app.services.sarvam import SarvamLanguageService

load_dotenv()


class TestSarvamLiveIntegration(unittest.TestCase):
    """Live verification against real Sarvam Language Identification API."""

    @classmethod
    def setUpClass(cls):
        cls.api_key = os.getenv("SARVAM_API_KEY", "").strip()
        if not cls.api_key:
            raise unittest.SkipTest("SARVAM_API_KEY not configured in backend/.env; skipping live test")
        cls.service = SarvamLanguageService(api_key=cls.api_key)

    def require_live_result(self, text: str) -> LanguageIdentificationResult:
        result = self.service.identify_language(text)
        if result is None:
            self.skipTest("Sarvam live LID unavailable from this environment; resilience is covered by fallback tests")
        return result

    def test_live_sarvam_gujarati(self):
        """Verify live Gujarati language and script identification."""
        text = "આજે દરિયામાં જવું સલામત છે?"
        result = self.require_live_result(text)

        self.assertIsNotNone(result, "Live Sarvam LID should return a result for Gujarati query")
        self.assertIsInstance(result, LanguageIdentificationResult)
        self.assertEqual(result.language_code, "gu-IN")
        self.assertEqual(result.script_code, "Gujr")
        self.assertEqual(result.short_code, "gu")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertIsNotNone(result.request_id)

    def test_live_sarvam_hindi(self):
        """Verify live Hindi language and script identification."""
        text = "आज समुद्र में जाना सुरक्षित है?"
        result = self.require_live_result(text)

        self.assertIsNotNone(result, "Live Sarvam LID should return a result for Hindi query")
        self.assertEqual(result.language_code, "hi-IN")
        self.assertEqual(result.script_code, "Deva")
        self.assertEqual(result.short_code, "hi")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertIsNotNone(result.request_id)

    def test_live_sarvam_marathi(self):
        """Verify live Marathi language and script identification."""
        text = "आज समुद्रात जाणे सुरक्षित आहे का?"
        result = self.require_live_result(text)

        self.assertIsNotNone(result, "Live Sarvam LID should return a result for Marathi query")
        self.assertEqual(result.language_code, "mr-IN")
        self.assertEqual(result.script_code, "Deva")
        self.assertEqual(result.short_code, "mr")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertIsNotNone(result.request_id)

    def test_live_sarvam_english(self):
        """Verify live English language and script identification."""
        text = "Is it safe to go to sea today?"
        result = self.require_live_result(text)

        self.assertIsNotNone(result, "Live Sarvam LID should return a result for English query")
        self.assertEqual(result.language_code, "en-IN")
        self.assertEqual(result.script_code, "Latn")
        self.assertEqual(result.short_code, "en")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertIsNotNone(result.request_id)


if __name__ == "__main__":
    unittest.main()
