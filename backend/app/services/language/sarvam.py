"""
Official Sarvam AI Indic Language & Speech Provider for Matsya (powered by ORCA).

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
from app.services.provider_health import record, ProviderUnavailable
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
    "gu-IN": "ratan",
    "hi-IN": "shubh",
    "mr-IN": "ratan",
    "ta-IN": "ratan",
    "te-IN": "shubh",
    "ml-IN": "shubh",
    "bn-IN": "rehan",
    "kn-IN": "shubh",
    "en-IN": "ratan",
}

BULBUL_V3_SPEAKERS: Tuple[str, ...] = (
    "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja",
    "rohan", "simran", "kavya", "amit", "dev", "ishita", "shreya",
    "ratan", "varun", "manan", "sumit", "roopa", "kabir", "aayan",
    "shubh", "advait", "anand", "tanya", "tarun", "sunny", "mani",
    "gokul", "vijay", "shruti", "suhani", "mohit", "kavitha", "rehan",
    "soham", "rupali", "niharika",
)


def to_sarvam_code(lang: str) -> str:
    """Converts 2-letter or BCP-47 code to Sarvam standard (e.g. 'gu' -> 'gu-IN')."""
    if not lang:
        return "en-IN"
    prefix = lang.strip().lower().split("-")[0]
    if prefix == "auto":
        return "en-IN"
    return SARVAM_LANG_MAP.get(prefix, f"{prefix}-IN")


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
        base_url: Optional[str] = None,
        timeout_sec: float = 12.0,
    ):
        self.api_key = api_key if api_key is not None else os.getenv("SARVAM_API_KEY")
        self.base_url = (base_url or os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")).rstrip("/")
        try:
            t_val = float(os.getenv("SARVAM_TIMEOUT_SEC", str(timeout_sec)))
            self.timeout_sec = t_val if t_val > 0 else timeout_sec
        except (TypeError, ValueError):
            self.timeout_sec = timeout_sec
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
            record("sarvam_translation", success=False, reason="NOT_CONFIGURED")
            raise ProviderUnavailable("TRANSLATION_UNAVAILABLE")

        # Handle chunking safely without unbounded recursion (Sarvam Mayura v1 has 1000 char per-request limit)
        if len(text) > 750:
            chunks = self._split_chunks(text, max_chars=700)
            return "\n\n".join(self._translate_chunk(chunk, src_sarvam, tgt_sarvam) for chunk in chunks)

        return self._translate_chunk(text, src_sarvam, tgt_sarvam)

    @staticmethod
    def _split_chunks(text: str, max_chars: int = 700) -> List[str]:
        segments: List[str] = []
        for para in text.split("\n\n"):
            if len(para) <= max_chars:
                segments.append(para)
                continue
            for line in para.split("\n"):
                if len(line) <= max_chars:
                    segments.append(line)
                    continue
                words = line.split(" ")
                cur: List[str] = []
                cur_len = 0
                for word in words:
                    if len(word) > max_chars:
                        if cur:
                            segments.append(" ".join(cur))
                            cur = []
                            cur_len = 0
                        for i in range(0, len(word), max_chars):
                            segments.append(word[i:i + max_chars])
                    elif cur_len + len(word) + (1 if cur else 0) > max_chars:
                        segments.append(" ".join(cur))
                        cur = [word]
                        cur_len = len(word)
                    else:
                        cur.append(word)
                        cur_len += len(word) + (1 if len(cur) > 1 else 0)
                if cur:
                    segments.append(" ".join(cur))
        chunks: List[str] = []
        buf: List[str] = []
        buf_len = 0
        for seg in segments:
            if buf and buf_len + len(seg) + 2 > max_chars:
                chunks.append("\n\n".join(buf))
                buf = [seg]
                buf_len = len(seg)
            else:
                buf.append(seg)
                buf_len += len(seg) + (2 if len(buf) > 1 else 0)
        if buf:
            chunks.append("\n\n".join(buf))
        return chunks

    def _translate_chunk(self, text: str, src_sarvam: str, tgt_sarvam: str) -> str:
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
                        record("sarvam_translation", success=True, http_status=200)
                        return translated.strip()
                record("sarvam_translation", success=False, http_status=resp.status_code, reason="UPSTREAM_HTTP_ERROR")
        except Exception as err:
            record("sarvam_translation", success=False, reason=type(err).__name__)
        raise ProviderUnavailable("TRANSLATION_UNAVAILABLE")

    def detect_language(self, text: str) -> str:
        """
        Identifies the Indian regional language of input text.
        
        Endpoint: POST /text-lid
        """
        if not text or not text.strip():
            return "en"

        # Check Unicode script ranges first (extremely fast & 100% deterministic for native Indic scripts)
        script_detected = self._detect_script_range(text)
        if script_detected != "en":
            return script_detected

        if not self.is_configured:
            return "en"

        url = f"{self.base_url}/text-lid"
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
        fallback_iso = (
            "en"
            if not language_code or str(language_code).strip().lower() == "auto"
            else to_iso_code(language_code)
        )
        if not self.is_configured:
            record("sarvam_stt", success=False, reason="NOT_CONFIGURED")
            return {
                "transcript": "",
                "language_code": to_sarvam_code(fallback_iso),
                "detected_iso": fallback_iso,
                "source": "sarvam_mock_stt",
                "is_mock": True,
            }

        url = f"{self.base_url}/speech-to-text"
        headers = {}
        if self.api_key:
            headers["api-subscription-key"] = self.api_key.strip()

        data = {
            "model": "saaras:v3",
            "mode": "transcribe",
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
                    raw_transcript = res_data.get("transcript")
                    transcript = raw_transcript.strip() if isinstance(raw_transcript, str) else ""
                    record(
                        "sarvam_stt",
                        success=bool(transcript),
                        http_status=200,
                        reason=None if transcript else "EMPTY_TRANSCRIPT",
                    )
                    lang_detected = res_data.get("language_code") or to_sarvam_code(fallback_iso)
                    if not isinstance(lang_detected, str) or lang_detected.strip().lower() == "unknown":
                        lang_detected = to_sarvam_code(fallback_iso)
                    return {
                        "transcript": transcript,
                        "language_code": lang_detected,
                        "detected_iso": to_iso_code(lang_detected),
                        "source": "sarvam_saaras_v3",
                        "is_mock": False,
                    }
                else:
                    record("sarvam_stt", success=False, http_status=resp.status_code, reason="UPSTREAM_HTTP_ERROR")
                    logger.warning("Sarvam STT HTTP %s", resp.status_code)
                    return {
                        "transcript": "",
                        "language_code": to_sarvam_code(fallback_iso),
                        "detected_iso": fallback_iso,
                        "source": "sarvam_fallback_stt",
                        "is_mock": True,
                        "upstream_status": resp.status_code,
                    }
        except Exception as err:
            record("sarvam_stt", success=False, reason=type(err).__name__)
            logger.warning("Sarvam STT failed: %s", type(err).__name__)
            return {
                "transcript": "",
                "language_code": to_sarvam_code(fallback_iso),
                "detected_iso": fallback_iso,
                "source": "sarvam_fallback_stt",
                "is_mock": True,
                "upstream_status": 503,
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
        speaker_clean = speaker.strip().lower() if isinstance(speaker, str) and speaker.strip() else None
        chosen_speaker = speaker_clean or DEFAULT_SPEAKERS.get(sarvam_lang, "shubh")

        if not self.is_configured:
            record("sarvam_tts", success=False, reason="NOT_CONFIGURED")
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
        # Strip markdown tokens while preserving hyphens inside numbers/coordinates/compounds
        clean_text = re.sub(r"[*#_`•]", "", re.sub(r"(?m)^\s*[-*•]\s+", "", text)).strip()[:400]

        payload = {
            "text": clean_text,
            "language_code": sarvam_lang,
            "speaker": chosen_speaker,
            "pace": 1.0,
            "speech_sample_rate": 22050,
            "model": "bulbul:v3",
        }

        try:
            with httpx.Client(timeout=self.timeout_sec * 2) as client:
                resp = client.post(url, json=payload, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    audios = data.get("audios", [])
                    if audios and isinstance(audios[0], str) and audios[0].strip():
                        record("sarvam_tts", success=True, http_status=200)
                        return {
                            "audio_base64": audios[0],
                            "audio_format": "wav",
                            "sample_rate": 22050,
                            "speaker": chosen_speaker,
                            "language_code": sarvam_lang,
                            "source": "sarvam_bulbul_v3",
                            "is_mock": False,
                        }
                record("sarvam_tts", success=False, http_status=resp.status_code, reason="UPSTREAM_HTTP_ERROR")
        except Exception as err:
            record("sarvam_tts", success=False, reason=type(err).__name__)

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
                if re.search(r"[ळऱऴ]", text):
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
