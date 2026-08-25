"""Sarvam AI Language Provider Service for ORCA Marine AI.

Implements:
- Sarvam Language Identification (/text-lid)
- Clean provider abstraction for future extensions (Translation, STT, TTS)
- Secure API key management (SARVAM_API_KEY)
- Resilient failure and timeout handling
"""
import json
import logging
import os
from typing import Any, Dict, Optional
from dotenv import load_dotenv
import httpx

from app.models.agent_models import LanguageIdentificationResult

load_dotenv()

logger = logging.getLogger(__name__)

# Mapping from Sarvam BCP-47 language codes to 2-letter ISO 639-1 codes
SARVAM_TO_SHORT_CODE: Dict[str, str] = {
    "en-IN": "en",
    "hi-IN": "hi",
    "gu-IN": "gu",
    "mr-IN": "mr",
    "bn-IN": "bn",
    "ta-IN": "ta",
    "te-IN": "te",
    "ml-IN": "ml",
    "kn-IN": "kn",
    "or-IN": "or",
    "od-IN": "or",
    "pa-IN": "pa",
    "as-IN": "as",
    "ur-IN": "ur",
}

# Mapping from 2-letter short codes to Sarvam BCP-47 language codes
SHORT_CODE_TO_SARVAM: Dict[str, str] = {
    "en": "en-IN",
    "hi": "hi-IN",
    "gu": "gu-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "kn": "kn-IN",
    "or": "od-IN",
    "pa": "pa-IN",
    "as": "as-IN",
    "ur": "ur-IN",
}

# Human-readable language names
LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "gu": "Gujarati (ગુજરાતી)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "ml": "Malayalam (മലയാളം)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "or": "Odia (ଓଡ଼િଆ)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "as": "Assamese (অসমীয়া)",
    "ur": "Urdu (اردو)",
}


class SarvamLanguageService:
    """
    Sarvam AI Language Provider Service.
    
    Provides language identification via Sarvam's /text-lid endpoint.
    Designed with a clean provider abstraction to support future Sarvam
    capabilities (Translation, STT, TTS) without coupling ORCA core agents.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        # Read SARVAM_API_KEY from environment if not explicitly provided
        self.api_key = (api_key if api_key is not None else os.getenv("SARVAM_API_KEY", "")).strip()
        self.base_url = (base_url or os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")).rstrip("/")
        self.lid_endpoint = f"{self.base_url}/text-lid"
        self.default_timeout = float(os.getenv("SARVAM_TIMEOUT_SEC", "5.0"))

    @property
    def is_configured(self) -> bool:
        """Returns True if Sarvam API key is configured."""
        return bool(self.api_key)

    def identify_language(
        self,
        text: str,
        timeout: Optional[float] = None,
    ) -> Optional[LanguageIdentificationResult]:
        """
        Identifies language and script of input text using Sarvam /text-lid API.
        
        Args:
            text: Input string (max 1000 characters).
            timeout: Optional HTTP timeout in seconds (defaults to self.default_timeout).
            
        Returns:
            LanguageIdentificationResult if successful, or None if detection fails/unavailable.
        """
        if not text or not isinstance(text, str) or not text.strip():
            logger.debug("Sarvam LID skipped: empty or whitespace input")
            return None

        if not self.is_configured:
            logger.debug("Sarvam LID skipped: SARVAM_API_KEY not configured")
            return None

        cleaned_text = text.strip()[:1000]
        req_timeout = timeout if timeout is not None else self.default_timeout

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "input": cleaned_text,
        }

        try:
            with httpx.Client(timeout=req_timeout) as client:
                response = client.post(self.lid_endpoint, headers=headers, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    language_code = data.get("language_code")
                    script_code = data.get("script_code")
                    
                    # Extract request ID safely
                    raw_req_id = data.get("request_id")
                    if not raw_req_id and hasattr(response, "headers") and hasattr(response.headers, "get"):
                        h_val = response.headers.get("x-request-id")
                        if isinstance(h_val, str):
                            raw_req_id = h_val
                    request_id = raw_req_id if isinstance(raw_req_id, str) else None

                    if not language_code or not isinstance(language_code, str):
                        logger.warning("Sarvam LID response missing or invalid 'language_code'")
                        return None

                    # Resolve 2-letter ISO short code for internal ORCA routing
                    short_code = SARVAM_TO_SHORT_CODE.get(
                        language_code,
                        language_code.split("-")[0].lower() if "-" in language_code else language_code.lower()
                    )
                    language_name = LANGUAGE_NAMES.get(short_code, language_code)

                    return LanguageIdentificationResult(
                        language_code=language_code,
                        script_code=script_code,
                        request_id=request_id,
                        provider="sarvam",
                        detection_status="SARVAM_DETECTED",
                        short_code=short_code,
                        language_name=language_name,
                    )
                elif response.status_code in (401, 403):
                    logger.warning(
                        "Sarvam LID authentication failed (HTTP %s). Check SARVAM_API_KEY configuration.",
                        response.status_code,
                    )
                    return None
                elif response.status_code == 429:
                    logger.warning("Sarvam LID rate limit reached (HTTP 429).")
                    return None
                else:
                    logger.warning(
                        "Sarvam LID request returned non-200 status code: %s",
                        response.status_code,
                    )
                    return None

        except httpx.TimeoutException:
            logger.warning("Sarvam LID request timed out after %.1fs", req_timeout)
            return None
        except httpx.RequestError as req_err:
            logger.warning("Sarvam LID network request failed: %s", type(req_err).__name__)
            return None
        except json.JSONDecodeError:
            logger.warning("Sarvam LID returned malformed non-JSON response")
            return None
        except Exception as exc:
            logger.warning("Sarvam LID unexpected error: %s", type(exc).__name__)
            return None

    # =========================================================================
    # Future Provider Extension Hooks (Milestones 2, 3, 4)
    # =========================================================================
    # def translate(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
    #     """Future Milestone 2: Sarvam Translation API (/translate)"""
    #     raise NotImplementedError("Sarvam Translation will be integrated in Milestone 2")
    #
    # def speech_to_text(self, audio_bytes: bytes, language_code: Optional[str] = None) -> Optional[str]:
    #     """Future Milestone 3: Sarvam STT API (/speech-to-text)"""
    #     raise NotImplementedError("Sarvam STT will be integrated in Milestone 3")
    #
    # def text_to_speech(self, text: str, target_lang: str) -> Optional[bytes]:
    #     """Future Milestone 4: Sarvam TTS API (/text-to-speech)"""
    #     raise NotImplementedError("Sarvam TTS will be integrated in Milestone 4")

    def __repr__(self) -> str:
        return f"<SarvamLanguageService is_configured={self.is_configured} endpoint='{self.lid_endpoint}'>"


# Default singleton instance
sarvam_language_service = SarvamLanguageService()
