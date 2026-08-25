"""Automated unit and integration tests for Sarvam Language Identification (LID).

All tests in this file mock external network calls to guarantee reliable,
isolated, and deterministic execution without requiring external network connectivity.
"""
import unittest
from unittest.mock import MagicMock, patch
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.models.agent_models import LanguageIdentificationResult
from app.services.bhashini import BhashiniService
from app.services.sarvam import (
    LANGUAGE_NAMES,
    SARVAM_TO_SHORT_CODE,
    SarvamLanguageService,
)


class TestSarvamLanguageIdentification(unittest.TestCase):
    """Unit and mock integration test suite for Sarvam Language Identification."""

    def setUp(self):
        self.mock_api_key = "dummy_mock_test_key_xyz"
        self.service = SarvamLanguageService(api_key=self.mock_api_key)

    # 1. Gujarati Language Identification
    @patch("httpx.Client.post")
    def test_gujarati_identification(self, mock_post):
        """Test 1: Gujarati text identification via mocked Sarvam API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "request_id": "req-gu-12345",
            "language_code": "gu-IN",
            "script_code": "Gujr",
        }
        mock_post.return_value = mock_response

        text = "આજે દરિયામાં જવું સલામત છે?"
        result = self.service.identify_language(text)

        self.assertIsNotNone(result)
        self.assertIsInstance(result, LanguageIdentificationResult)
        self.assertEqual(result.language_code, "gu-IN")
        self.assertEqual(result.script_code, "Gujr")
        self.assertEqual(result.short_code, "gu")
        self.assertEqual(result.request_id, "req-gu-12345")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertEqual(result.language_name, "Gujarati (ગુજરાતી)")

    # 2. Hindi Language Identification
    @patch("httpx.Client.post")
    def test_hindi_identification(self, mock_post):
        """Test 2: Hindi text identification via mocked Sarvam API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "request_id": "req-hi-12345",
            "language_code": "hi-IN",
            "script_code": "Deva",
        }
        mock_post.return_value = mock_response

        text = "आज समुद्र में जाना सुरक्षित है?"
        result = self.service.identify_language(text)

        self.assertIsNotNone(result)
        self.assertEqual(result.language_code, "hi-IN")
        self.assertEqual(result.script_code, "Deva")
        self.assertEqual(result.short_code, "hi")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertEqual(result.language_name, "Hindi (हिन्दी)")

    # 3. Marathi Language Identification
    @patch("httpx.Client.post")
    def test_marathi_identification(self, mock_post):
        """Test 3: Marathi text identification via mocked Sarvam API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "request_id": "req-mr-12345",
            "language_code": "mr-IN",
            "script_code": "Deva",
        }
        mock_post.return_value = mock_response

        text = "आज समुद्रात जाणे सुरक्षित आहे का?"
        result = self.service.identify_language(text)

        self.assertIsNotNone(result)
        self.assertEqual(result.language_code, "mr-IN")
        self.assertEqual(result.script_code, "Deva")
        self.assertEqual(result.short_code, "mr")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertEqual(result.language_name, "Marathi (मराठी)")

    # 4. English Language Identification
    @patch("httpx.Client.post")
    def test_english_identification(self, mock_post):
        """Test 4: English text identification via mocked Sarvam API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "request_id": "req-en-12345",
            "language_code": "en-IN",
            "script_code": "Latn",
        }
        mock_post.return_value = mock_response

        text = "Is it safe to go to sea today?"
        result = self.service.identify_language(text)

        self.assertIsNotNone(result)
        self.assertEqual(result.language_code, "en-IN")
        self.assertEqual(result.script_code, "Latn")
        self.assertEqual(result.short_code, "en")
        self.assertEqual(result.provider, "sarvam")
        self.assertEqual(result.detection_status, "SARVAM_DETECTED")
        self.assertEqual(result.language_name, "English")

    # 5. Empty and Whitespace Input Handling
    @patch("httpx.Client.post")
    def test_empty_input(self, mock_post):
        """Test 5: Empty and whitespace-only inputs do not trigger HTTP requests."""
        # Empty string
        res_empty = self.service.identify_language("")
        self.assertIsNone(res_empty)
        mock_post.assert_not_called()

        # Whitespace-only string
        res_spaces = self.service.identify_language("   \n\t  ")
        self.assertIsNone(res_spaces)
        mock_post.assert_not_called()

        # BhashiniService fallback with empty text
        bhashini = BhashiniService(sarvam_service=self.service)
        fallback_res = bhashini.identify_language("")
        self.assertEqual(fallback_res.language_code, "en-IN")
        self.assertEqual(fallback_res.short_code, "en")
        self.assertEqual(fallback_res.detection_status, "FALLBACK_DETECTED")

    # 6. Invalid Input and Long Input Truncation
    @patch("httpx.Client.post")
    def test_invalid_input(self, mock_post):
        """Test 6: Invalid types and oversized inputs (>1000 chars) are handled safely."""
        # None input
        self.assertIsNone(self.service.identify_language(None))  # type: ignore
        mock_post.assert_not_called()

        # Number input
        self.assertIsNone(self.service.identify_language(12345))  # type: ignore
        mock_post.assert_not_called()

        # Long input truncation (>1000 characters)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "language_code": "en-IN",
            "script_code": "Latn",
        }
        mock_post.return_value = mock_response

        long_text = "Is it safe to navigate? " * 100  # ~2400 chars
        res_long = self.service.identify_language(long_text)
        self.assertIsNotNone(res_long)
        # Verify the payload input was truncated to 1000 chars
        call_json = mock_post.call_args[1]["json"]
        self.assertLessEqual(len(call_json["input"]), 1000)

    # 7. Missing API Key Handling
    @patch("httpx.Client.post")
    def test_missing_api_key(self, mock_post):
        """Test 7: Unconfigured Sarvam service returns None and triggers deterministic fallback."""
        unconfigured_service = SarvamLanguageService(api_key="")
        self.assertFalse(unconfigured_service.is_configured)

        res = unconfigured_service.identify_language("આજે દરિયામાં જવું સલામત છે?")
        self.assertIsNone(res)
        mock_post.assert_not_called()

        # BhashiniService integration should fall back gracefully
        bhashini = BhashiniService(sarvam_service=unconfigured_service)
        fallback = bhashini.identify_language("આજે દરિયામાં જવું સલામત છે?")
        self.assertEqual(fallback.short_code, "gu")
        self.assertEqual(fallback.detection_status, "FALLBACK_DETECTED")
        self.assertEqual(fallback.provider, "deterministic_fallback")

    # 8. Authentication Failure (HTTP 401 / 403)
    @patch("httpx.Client.post")
    def test_authentication_failure(self, mock_post):
        """Test 8: HTTP 401 and 403 errors are handled gracefully without raising exceptions."""
        for code in [401, 403]:
            mock_response = MagicMock()
            mock_response.status_code = code
            mock_post.return_value = mock_response

            res = self.service.identify_language("आज समुद्र में जाना सुरक्षित है?")
            self.assertIsNone(res)

            # Check that BhashiniService falls back to deterministic detection
            bhashini = BhashiniService(sarvam_service=self.service)
            fallback = bhashini.identify_language("आज समुद्र में जाना सुरक्षित है?")
            self.assertEqual(fallback.short_code, "hi")
            self.assertEqual(fallback.detection_status, "FALLBACK_DETECTED")

    # 9. Rate Limit Failure (HTTP 429)
    @patch("httpx.Client.post")
    def test_rate_limit_failure(self, mock_post):
        """Test 9: HTTP 429 Rate Limit error is handled gracefully without crashing."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response

        res = self.service.identify_language("आज समुद्रात जाणे सुरक्षित आहे का?")
        self.assertIsNone(res)

        bhashini = BhashiniService(sarvam_service=self.service)
        fallback = bhashini.identify_language("आज समुद्रात जाणे सुरक्षित आहे का?")
        self.assertEqual(fallback.short_code, "mr")
        self.assertEqual(fallback.detection_status, "FALLBACK_DETECTED")

    # 10. Network and API Failures (Timeout, ConnectError, HTTP 500)
    @patch("httpx.Client.post")
    def test_network_and_api_failure(self, mock_post):
        """Test 10: Timeout, connection error, and 500 error are handled gracefully."""
        # Timeout
        mock_post.side_effect = httpx.TimeoutException("Connection timed out")
        res_timeout = self.service.identify_language("Is it safe to sail?")
        self.assertIsNone(res_timeout)

        # Connection error
        mock_post.side_effect = httpx.ConnectError("Failed to establish connection")
        res_conn = self.service.identify_language("Is it safe to sail?")
        self.assertIsNone(res_conn)

        # 500 Internal Server Error
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.side_effect = None
        mock_post.return_value = mock_response
        res_500 = self.service.identify_language("Is it safe to sail?")
        self.assertIsNone(res_500)

        # Verify fallback pipeline succeeds
        bhashini = BhashiniService(sarvam_service=self.service)
        fallback = bhashini.identify_language("Is it safe to sail?")
        self.assertEqual(fallback.short_code, "en")
        self.assertEqual(fallback.detection_status, "FALLBACK_DETECTED")

    # 11. Successful Sarvam Response Parsing with All Fields
    @patch("httpx.Client.post")
    def test_successful_sarvam_response_parsing(self, mock_post):
        """Test 11: Parses all Sarvam response fields and handles all Indian languages."""
        test_languages = [
            ("ta-IN", "Taml", "ta"),
            ("te-IN", "Telu", "te"),
            ("bn-IN", "Beng", "bn"),
            ("kn-IN", "Knda", "kn"),
            ("ml-IN", "Mlym", "ml"),
            ("od-IN", "Orya", "or"),
            ("pa-IN", "Guru", "pa"),
        ]

        for lang_code, script_code, exp_short in test_languages:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "request_id": f"req-{exp_short}-999",
                "language_code": lang_code,
                "script_code": script_code,
            }
            mock_post.return_value = mock_response

            res = self.service.identify_language("test text sample")
            self.assertIsNotNone(res)
            self.assertEqual(res.language_code, lang_code)
            self.assertEqual(res.script_code, script_code)
            self.assertEqual(res.short_code, exp_short)
            self.assertEqual(res.language_name, LANGUAGE_NAMES[exp_short])
            self.assertEqual(res.request_id, f"req-{exp_short}-999")
            self.assertEqual(res.provider, "sarvam")
            self.assertEqual(res.detection_status, "SARVAM_DETECTED")

    # 12. Malformed Provider Response Handling
    @patch("httpx.Client.post")
    def test_malformed_provider_response(self, mock_post):
        """Test 12: Handles JSON decode errors, missing fields, and non-dict JSON gracefully."""
        # Non-JSON HTML error body
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = httpx.DecodingError("Invalid JSON")
        mock_post.return_value = mock_response

        res = self.service.identify_language("Hello world")
        self.assertIsNone(res)

        # JSON missing 'language_code'
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = None
        mock_response.json.return_value = {"script_code": "Latn"}  # missing language_code
        mock_post.return_value = mock_response

        res_missing = self.service.identify_language("Hello world")
        self.assertIsNone(res_missing)


class TestFastAPIDetectLanguageIntegration(unittest.TestCase):
    """Integration test suite for FastAPI /api/detect-language endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.services.sarvam.SarvamLanguageService.identify_language")
    def test_api_detect_language_sarvam_success(self, mock_identify):
        """Test POST /api/detect-language returns enriched Sarvam metadata."""
        mock_identify.return_value = LanguageIdentificationResult(
            language_code="gu-IN",
            script_code="Gujr",
            request_id="test-req-12345",
            provider="sarvam",
            detection_status="SARVAM_DETECTED",
            short_code="gu",
            language_name="Gujarati (ગુજરાતી)",
        )

        payload = {"text": "આજે દરિયામાં જવું સલામત છે?"}
        response = self.client.post("/api/detect-language", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "gu")
        self.assertEqual(data["language_code"], "gu-IN")
        self.assertEqual(data["script_code"], "Gujr")
        self.assertEqual(data["request_id"], "test-req-12345")
        self.assertEqual(data["provider"], "sarvam")
        self.assertEqual(data["detection_status"], "SARVAM_DETECTED")
        self.assertEqual(data["language_name"], "Gujarati (ગુજરાતી)")

    @patch("app.services.sarvam.SarvamLanguageService.identify_language")
    def test_api_detect_language_fallback_on_sarvam_error(self, mock_identify):
        """Test POST /api/detect-language falls back seamlessly when Sarvam returns None."""
        mock_identify.return_value = None  # Simulates provider failure or unconfigured key

        payload = {"text": "આજે દરિયામાં જવું સલામત છે?"}
        response = self.client.post("/api/detect-language", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["language"], "gu")
        self.assertEqual(data["language_code"], "gu-IN")
        self.assertEqual(data["script_code"], "Gujr")
        self.assertEqual(data["provider"], "deterministic_fallback")
        self.assertEqual(data["detection_status"], "FALLBACK_DETECTED")


if __name__ == "__main__":
    unittest.main()
