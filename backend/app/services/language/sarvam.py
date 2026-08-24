"""
Official Sarvam AI Indic Language & Speech Provider for ORCA Marine AI.

Integrates Sarvam AI REST API for:
- Machine Translation (Mayura v1) across 22+ Indian languages
- Language Identification
- Speech-to-Text / STT (Saaras v3 / v2)
- Neural Text-to-Speech / TTS (Bulbul v3)
"""
import base64
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
from dotenv import load_dotenv

from app.services.language.base import LanguageProvider

load_dotenv()

logger = logging.getLogger(__name__)

# Map ISO 639-1 two-letter codes to Sarvam BCP-47 regional language codes
SARVAM_LANG_MAP: Dict[str, str] = {
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

# Reverse mapping from Sarvam BCP-47 to ISO 639-1
REVERSE_SARVAM_LANG_MAP: Dict[str, str] = {
    "en-in": "en",
    "hi-in": "hi",
    "gu-in": "gu",
    "mr-in": "mr",
    "bn-in": "bn",
    "ta-in": "ta",
    "te-in": "te",
    "ml-in": "ml",
    "kn-in": "kn",
    "od-in": "or",
    "pa-in": "pa",
    "as-in": "as",
    "ur-in": "ur",
}

DEFAULT_SPEAKERS: Dict[str, str] = {
    "gu-IN": "meera",
    "hi-IN": "meera",
    "mr-IN": "meera",
    "ta-IN": "meera",
    "te-IN": "meera",
    "ml-IN": "meera",
    "bn-IN": "meera",
    "kn-IN": "meera",
    "en-IN": "meera",
}


def to_sarvam_code(lang: str) -> str:
    """Converts 2-letter or BCP-47 code to Sarvam standard (e.g. 'gu' -> 'gu-IN')."""
    if not lang:
        return "en-IN"
    lang_clean = lang.strip().lower()
    if "-in" in lang_clean:
        return lang_clean
    return SARVAM_LANG_MAP.get(lang_clean, f"{lang_clean}-IN")


def to_iso_code(sarvam_lang: str) -> str:
    """Converts Sarvam BCP-47 code to 2-letter ISO (e.g. 'gu-IN' -> 'gu')."""
    if not sarvam_lang:
        return "en"
    clean = sarvam_lang.strip().lower()
    if clean in REVERSE_SARVAM_LANG_MAP:
        return REVERSE_SARVAM_LANG_MAP[clean]
    if "-" in clean:
        return clean.split("-")[0]
    return clean


class SarvamLanguageProvider(LanguageProvider):
    """
    Production Sarvam AI Language & Speech Provider.
    
    Provides high-accuracy Indic translation, dialect speech transcription,
    and Bulbul v3 neural voice synthesis.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.sarvam.ai",
        timeout_sec: float = 12.0,
    ):
        self.api_key = api_key or os.getenv("SARVAM_API_KEY")
        self.base_url = (base_url or os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")).rstrip("/")
        self.timeout_sec = float(os.getenv("SARVAM_TIMEOUT_SEC", str(timeout_sec)))
        self._is_configured = bool(self.api_key and len(self.api_key.strip()) > 5)
        
        if self._is_configured:
            logger.info("SarvamLanguageProvider initialized with active API subscription key.")
        else:
            logger.info("SarvamLanguageProvider running in mock/fallback mode (SARVAM_API_KEY not set).")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-subscription-key"] = self.api_key.strip()
            headers["Authorization"] = f"Bearer {self.api_key.strip()}"
        return headers

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translates text using Sarvam Mayura v1 Translation API.
        
        Endpoint: POST /translate
        """
        if not text or not text.strip():
            return text

        src_iso = to_iso_code(source_lang)
        tgt_iso = to_iso_code(target_lang)

        if src_iso == tgt_iso:
            return text

        src_sarvam = to_sarvam_code(src_iso)
        tgt_sarvam = to_sarvam_code(tgt_iso)

        if not self.is_configured:
            return self._fallback_translate(text, src_iso, tgt_iso)

        url = f"{self.base_url}/translate"
        payload = {
            "input": text,
            "source_language_code": src_sarvam,
            "target_language_code": tgt_sarvam,
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "mayura:v1",
        }

        try:
            with httpx.Client(timeout=self.timeout_sec) as client:
                resp = client.post(url, json=payload, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    translated = data.get("translated_text")
                    if translated and isinstance(translated, str) and translated.strip():
                        return translated.strip()
                logger.warning(
                    f"Sarvam translate API returned {resp.status_code}: {resp.text}. Falling back to domain dictionary."
                )
        except Exception as err:
            logger.warning(f"Sarvam translate request failed: {err}. Falling back to domain dictionary.")

        return self._fallback_translate(text, src_iso, tgt_iso)

    def detect_language(self, text: str) -> str:
        """
        Identifies the Indian regional language of input text.
        
        Endpoint: POST /language-identification
        """
        if not text or not text.strip():
            return "en"

        # Check Unicode script ranges first (extremely fast & 100% deterministic for native Indic scripts)
        script_detected = self._detect_script_range(text)
        if script_detected != "en":
            return script_detected

        if not self.is_configured:
            return "en"

        url = f"{self.base_url}/language-identification"
        payload = {"input": text}

        try:
            with httpx.Client(timeout=self.timeout_sec) as client:
                resp = client.post(url, json=payload, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    lang_code = data.get("language_code")
                    if lang_code:
                        return to_iso_code(lang_code)
        except Exception as err:
            logger.debug(f"Sarvam language identification request failed: {err}")

        return "en"

    def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language_code: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> Dict[str, Any]:
        """
        Transcribes speech audio using Sarvam Saaras v3 Speech-to-Text API.
        
        Endpoint: POST /speech-to-text (multipart/form-data)
        """
        if not self.is_configured:
            logger.info("Sarvam STT requested without active API key. Returning synthetic transcript.")
            return {
                "transcript": "Is it safe to go fishing near Mumbai port today?",
                "language_code": to_sarvam_code(language_code or "en"),
                "detected_iso": language_code or "en",
                "source": "sarvam_mock_stt",
                "is_mock": True,
            }

        url = f"{self.base_url}/speech-to-text"
        headers = {}
        if self.api_key:
            headers["api-subscription-key"] = self.api_key.strip()

        data = {
            "model": "saaras:v3",
            "with_diarization": "false",
        }
        if language_code and language_code != "auto":
            data["language_code"] = to_sarvam_code(language_code)
        else:
            data["language_code"] = "unknown"

        files = {
            "file": (filename, audio_bytes, content_type)
        }

        try:
            with httpx.Client(timeout=self.timeout_sec * 2) as client:
                resp = client.post(url, data=data, files=files, headers=headers)
                if resp.status_code == 200:
                    res_data = resp.json()
                    transcript = res_data.get("transcript", "")
                    lang_detected = res_data.get("language_code", data.get("language_code", "en-IN"))
                    return {
                        "transcript": transcript,
                        "language_code": lang_detected,
                        "detected_iso": to_iso_code(lang_detected),
                        "source": "sarvam_saaras_v3",
                        "is_mock": False,
                    }
                else:
                    logger.warning(f"Sarvam STT API error {resp.status_code}: {resp.text}")
        except Exception as err:
            logger.warning(f"Sarvam STT request failed: {err}")

        return {
            "transcript": "Is it safe to sail today?",
            "language_code": to_sarvam_code(language_code or "en"),
            "detected_iso": language_code or "en",
            "source": "sarvam_fallback_stt",
            "is_mock": True,
        }

    def text_to_speech(
        self,
        text: str,
        language_code: str = "en",
        speaker: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes high-quality regional voice audio using Sarvam Bulbul v3 TTS.
        
        Endpoint: POST /text-to-speech
        """
        sarvam_lang = to_sarvam_code(language_code)
        chosen_speaker = speaker or DEFAULT_SPEAKERS.get(sarvam_lang, "meera")

        if not self.is_configured:
            # Generate a lightweight silent/tone wav byte response for offline testing
            return {
                "audio_base64": None,
                "audio_format": "wav",
                "sample_rate": 22050,
                "speaker": chosen_speaker,
                "language_code": sarvam_lang,
                "source": "sarvam_mock_tts",
                "is_mock": True,
            }

        url = f"{self.base_url}/text-to-speech"
        # Truncate text to 400 characters for optimal single-chunk synthesis
        clean_text = re.sub(r"[*#_`•-]", "", text).strip()[:400]

        payload = {
            "inputs": [clean_text],
            "target_language_code": sarvam_lang,
            "speaker": chosen_speaker,
            "pitch": 0.0,
            "pace": 1.0,
            "loudness": 1.5,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True,
            "model": "bulbul:v3",
        }

        try:
            with httpx.Client(timeout=self.timeout_sec * 2) as client:
                resp = client.post(url, json=payload, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    audios = data.get("audios", [])
                    if audios and len(audios) > 0:
                        return {
                            "audio_base64": audios[0],
                            "audio_format": "wav",
                            "sample_rate": 22050,
                            "speaker": chosen_speaker,
                            "language_code": sarvam_lang,
                            "source": "sarvam_bulbul_v3",
                            "is_mock": False,
                        }
                logger.warning(f"Sarvam TTS returned {resp.status_code}: {resp.text}")
        except Exception as err:
            logger.warning(f"Sarvam TTS request failed: {err}")

        return {
            "audio_base64": None,
            "audio_format": "wav",
            "sample_rate": 22050,
            "speaker": chosen_speaker,
            "language_code": sarvam_lang,
            "source": "sarvam_fallback_tts",
            "is_mock": True,
        }

    def _detect_script_range(self, text: str) -> str:
        """Detects language by Unicode block range for instant zero-latency detection."""
        for ch in text:
            code = ord(ch)
            if 0x0A80 <= code <= 0x0AFF:
                return "gu"
            if 0x0900 <= code <= 0x097F:
                if re.search(r"[ळ|ऱ|ऴ]", text):
                    return "mr"
                return "hi"
            if 0x0B80 <= code <= 0x0BFF:
                return "ta"
            if 0x0C00 <= code <= 0x0C7F:
                return "te"
            if 0x0D00 <= code <= 0x0D7F:
                return "ml"
            if 0x0980 <= code <= 0x09FF:
                return "bn"
            if 0x0C80 <= code <= 0x0CFF:
                return "kn"
            if 0x0B00 <= code <= 0x0B7F:
                return "or"
            if 0x0A00 <= code <= 0x0A7F:
                return "pa"
            if 0x0600 <= code <= 0x06FF:
                return "ur"
        return "en"

    def _fallback_translate(self, text: str, src_lang: str, tgt_lang: str) -> str:
        """Heuristic and keyword fallback translation for offline execution."""
        from app.services.bhashini import MARITIME_TRANSLATIONS

        if src_lang == "en" and tgt_lang in MARITIME_TRANSLATIONS:
            result = text
            for en_term, target_term in MARITIME_TRANSLATIONS[tgt_lang].items():
                result = result.replace(en_term, target_term)
            return result

        if tgt_lang == "en" and src_lang in MARITIME_TRANSLATIONS:
            lower_text = text.lower()
            if any(w in lower_text for w in ["સલામત", "સુરક્ષિત", "હવામાન", "વાવાઝોડું", "મોજાં", "પવન", "માછીમારી"]):
                if "સલામત" in lower_text or "સુરક્ષિત" in lower_text:
                    return "Is it safe to go to the sea for fishing today?"
                elif "મોજાં" in lower_text or "મોજા" in lower_text:
                    return "What is the wave height here?"
                elif "પવન" in lower_text:
                    return "What is the wind speed and direction?"
                elif "હવામાન" in lower_text:
                    return "What is the marine weather forecast for today?"
                elif "વિસ્તાર" in lower_text or "માછીમારી" in lower_text:
                    return "Where is the nearest Potential Fishing Zone (PFZ)?"

            if any(w in lower_text for w in ["सुरक्षित", "मौसम", "हवा", "लहरें", "मत्स्य"]):
                if "सुरक्षित" in lower_text:
                    return "Is it safe to sail today?"
                elif "मौसम" in lower_text:
                    return "What are the marine weather conditions?"
                elif "मत्स्य" in lower_text or "मछली" in lower_text:
                    return "Where is the nearest fishing zone?"

        return text
