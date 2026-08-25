"""
Unified Language & Speech Service for ORCA Marine AI.

Supports interchangeable language providers (Sarvam AI, Bhashini, Mock/Gemini)
with multi-turn session persistence, instant script classification, and caching.
"""
import logging
from typing import Any, Dict, Optional
from app.services.language.base import LanguageProvider
from app.services.language.sarvam import SarvamLanguageProvider

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "gu": "Gujarati (ગુજરાતી)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "ml": "Malayalam (മലയാളം)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "or": "Odia (ଓଡ଼ିଆ)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "as": "Assamese (অসমীয়া)",
    "ur": "Urdu (اردو)",
}


class LanguageService:
    """
    Central Language & Speech Service coordinating translation, STT, and TTS.
    """

    def __init__(self, provider: Optional[LanguageProvider] = None):
        self.provider: LanguageProvider = provider or SarvamLanguageProvider()
        self._session_languages: Dict[str, str] = {}
        self._translation_cache: Dict[tuple[str, str, str], str] = {}

    def set_provider(self, provider: LanguageProvider) -> None:
        """Switch the underlying language provider dynamically."""
        self.provider = provider
        logger.info(f"LanguageService provider switched to {type(provider).__name__}.")

    @property
    def is_configured(self) -> bool:
        if hasattr(self.provider, "is_configured"):
            return getattr(self.provider, "is_configured")
        return True

    def get_session_language(self, session_id: str) -> Optional[str]:
        return self._session_languages.get(session_id)

    def set_session_language(self, session_id: str, lang_code: str) -> None:
        self._session_languages[session_id] = lang_code.lower()

    def detect_language(self, text: str, session_id: Optional[str] = None) -> str:
        """
        Detects language of input text or returns active session language.
        """
        if not text or not text.strip():
            if session_id and session_id in self._session_languages:
                return self._session_languages[session_id]
            return "en"

        detected = self.provider.detect_language(text)
        if session_id:
            self._session_languages[session_id] = detected
        return detected

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translates text with in-memory caching.
        """
        if not text or not text.strip():
            return text

        src = source_lang.strip().lower()
        tgt = target_lang.strip().lower()

        if src == tgt:
            return text

        cache_key = (text.strip(), src, tgt)
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        translated = self.provider.translate(text, source_lang=src, target_lang=tgt)
        self._translation_cache[cache_key] = translated
        return translated

    def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language_code: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> Dict[str, Any]:
        """Transcribes speech audio."""
        return self.provider.speech_to_text(
            audio_bytes=audio_bytes,
            filename=filename,
            language_code=language_code,
            content_type=content_type,
        )

    def text_to_speech(
        self,
        text: str,
        language_code: str = "en",
        speaker: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synthesizes neural voice audio."""
        return self.provider.text_to_speech(
            text=text,
            language_code=language_code,
            speaker=speaker,
        )


# Global default language service singleton
language_service = LanguageService()
