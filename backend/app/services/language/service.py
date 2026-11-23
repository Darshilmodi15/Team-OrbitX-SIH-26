"""
Unified Language & Speech Service for Matsya (powered by ORCA).

Supports interchangeable language providers (Sarvam AI, Bhashini, Mock/Gemini)
with multi-turn session persistence, instant script classification, and caching.
"""
from collections import OrderedDict
import os
import logging
from threading import Lock
from typing import Any, Dict, Optional
from app.services.language.base import LanguageProvider
from app.services.language.bhashini_provider import BhashiniLanguageProvider
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
    "or": "Odia (\u0b13\u0b21\u0b3c\u0b3f\u0b06)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "as": "Assamese (অসমীয়া)",
    "ur": "Urdu (اردو)",
}


class LanguageService:
    """
    Central Language & Speech Service coordinating translation, STT, and TTS.
    Defaults to MeitY Bhashini as primary provider.
    """

    def __init__(self, provider: Optional[LanguageProvider] = None):
        if provider:
            self.provider = provider
        else:
            configured_provider = os.getenv("LANGUAGE_PROVIDER", "bhashini").strip().lower()
            if configured_provider == "sarvam":
                self.provider = SarvamLanguageProvider()
            else:
                self.provider = BhashiniLanguageProvider()
        self._lock = Lock()
        self._session_languages: OrderedDict = OrderedDict()
        self._translation_cache: OrderedDict = OrderedDict()
        self._max_sessions = 2000
        self._max_translations = 4096

    def set_provider(self, provider: LanguageProvider) -> None:
        """Switch the underlying language provider dynamically."""
        with self._lock:
            self.provider = provider
            self._translation_cache.clear()
        logger.info(f"LanguageService provider switched to {type(provider).__name__}.")

    @property
    def is_configured(self) -> bool:
        if hasattr(self.provider, "is_configured"):
            return getattr(self.provider, "is_configured")
        return True

    def get_session_language(self, session_id: str) -> Optional[str]:
        with self._lock:
            return self._session_languages.get(session_id)

    def set_session_language(self, session_id: str, lang_code: str) -> None:
        with self._lock:
            self._session_languages[session_id] = lang_code.lower()
            self._session_languages.move_to_end(session_id)
            while len(self._session_languages) > self._max_sessions:
                self._session_languages.popitem(last=False)

    def detect_language(self, text: str, session_id: Optional[str] = None) -> str:
        """
        Detects language of input text or returns active session language.
        """
        if not text or not text.strip():
            if session_id:
                with self._lock:
                    if session_id in self._session_languages:
                        return self._session_languages[session_id]
            return "en"

        detected = self.provider.detect_language(text)
        if session_id:
            self.set_session_language(session_id, detected)
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
        with self._lock:
            if cache_key in self._translation_cache:
                self._translation_cache.move_to_end(cache_key)
                return self._translation_cache[cache_key]

        translated = self.provider.translate(text, source_lang=src, target_lang=tgt)
        with self._lock:
            self._translation_cache[cache_key] = translated
            self._translation_cache.move_to_end(cache_key)
            while len(self._translation_cache) > self._max_translations:
                self._translation_cache.popitem(last=False)
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
