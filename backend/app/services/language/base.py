"""Abstract base interface for Indic language and speech providers in ORCA."""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class LanguageProvider(ABC):
    """Abstract interface for Multilingual Machine Translation, Language ID, STT, and TTS."""

    @abstractmethod
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translates text between Indian languages and English."""
        pass

    @abstractmethod
    def detect_language(self, text: str) -> str:
        """Detects the Indian regional language or English code from text."""
        pass

    @abstractmethod
    def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language_code: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> Dict[str, Any]:
        """Transcribes Indian regional speech audio to text."""
        pass

    @abstractmethod
    def text_to_speech(
        self,
        text: str,
        language_code: str,
        speaker: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synthesizes Indian regional speech audio from text using neural TTS."""
        pass
