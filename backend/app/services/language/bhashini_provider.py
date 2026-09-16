"""
Official Bhashini (MeitY ULCA / Dhruva) Indic Language & Speech Provider for ORCA Marine AI.

Integrates Government of India Bhashini APIs for:
- Machine Translation (IndicTrans2 / MeitY NMT across 22+ Indian languages)
- Zero-latency Unicode Script & Dialect Language Identification
- Speech-to-Text / ASR (AI4Bharat Conformer / IITM ASR)
- Neural Text-to-Speech / TTS (IITM / AI4Bharat Indic-TTS)
"""
import base64
import logging
import os
import io
import wave
from typing import Any, Dict, Optional
import httpx
from dotenv import load_dotenv

from app.services.language.base import LanguageProvider
from app.services.provider_health import record

load_dotenv()

logger = logging.getLogger(__name__)

# Map ISO 639-1 two-letter codes to full names and language codes
BHASHINI_LANG_MAP: Dict[str, str] = {
    "en": "en",
    "hi": "hi",
    "gu": "gu",
    "mr": "mr",
    "bn": "bn",
    "ta": "ta",
    "te": "te",
    "ml": "ml",
    "kn": "kn",
    "or": "or",
    "pa": "pa",
    "as": "as",
    "ur": "ur",
}

DEFAULT_TTS_VOICES: Dict[str, str] = {
    "en": "female",
    "hi": "female",
    "gu": "female",
    "mr": "female",
    "ta": "female",
    "te": "female",
    "ml": "female",
    "bn": "female",
    "kn": "female",
    "or": "female",
    "pa": "female",
}

# Dhruva services are language-specific. The old generic ASR ID returns HTTP 500.
def asr_service_id(language: str) -> str:
    override = os.getenv(f"BHASHINI_ASR_SERVICE_{language.upper()}", "").strip()
    if override:
        return override
    if language == "en":
        return "ai4bharat/whisper-medium-en--gpu--t4"
    if language == "hi":
        return "ai4bharat/conformer-hi-gpu--t4"
    if language in {"ta", "te", "ml", "kn"}:
        return "ai4bharat/conformer-multilingual-dravidian-gpu--t4"
    return "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4"


class BhashiniLanguageProvider(LanguageProvider):
    """
    Production Bhashini Language & Speech Provider.
    
    Provides high-accuracy Indic translation, ASR speech recognition,
    and Indic neural voice synthesis via MeitY ULCA Dhruva pipeline.
    """

    def __init__(
        self,
        user_id: Optional[str] = None,
        api_key: Optional[str] = None,
        inference_api_key: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        timeout_sec: float = 12.0,
    ):
        self.user_id = user_id or os.getenv("BHASHINI_USER_ID", "").strip()
        self.api_key = (
            api_key
            or os.getenv("BHASHINI_API_KEY", "").strip()
            or os.getenv("ULCA_API_KEY", "").strip()
        )
        self.inference_api_key = inference_api_key or os.getenv("BHASHINI_INFERENCE_API_KEY", "").strip()
        self.pipeline_id = pipeline_id or os.getenv("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543d6").strip()
        self.timeout_sec = float(os.getenv("BHASHINI_TIMEOUT_SEC", str(timeout_sec)))
        self.pipeline_config_url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
        self._pipeline_cache: Dict[tuple[str, str, str], Dict[str, Any]] = {}

        if self.is_configured:
            logger.info("BhashiniLanguageProvider initialized with active MeitY Bhashini credentials.")
        else:
            logger.info("BhashiniLanguageProvider initialized in local/Gemini fallback mode (no Bhashini keys configured).")

    @property
    def is_configured(self) -> bool:
        """Checks if live Bhashini credentials are present."""
        return bool((self.user_id and self.api_key) or self.inference_api_key)

    def _get_pipeline_config(self, task_type: str, source_lang: str, target_lang: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieves and caches pipeline configuration from MeitY Bhashini API."""
        cache_key = (task_type, source_lang, target_lang or "")
        if cache_key in self._pipeline_cache:
            return self._pipeline_cache[cache_key]

        if not self.is_configured:
            return None

        if self.user_id and self.api_key:
            headers = {
                "userID": self.user_id,
                "ulcaApiKey": self.api_key,
                "Content-Type": "application/json",
            }

            lang_config: Dict[str, Any] = {"sourceLanguage": source_lang}
            if target_lang:
                lang_config["targetLanguage"] = target_lang

            payload = {
                "pipelineTasks": [
                    {
                        "taskType": task_type,
                        "config": {
                            "language": lang_config
                        },
                    }
                ],
                "pipelineRequestConfig": {
                    "pipelineId": self.pipeline_id,
                },
            }

            try:
                with httpx.Client(timeout=8.0) as client:
                    resp = client.post(self.pipeline_config_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        callback_url = data.get("pipelineInferenceAPIEndPoint", {}).get("callbackUrl")
                        inference_auth = data.get("pipelineInferenceAPIEndPoint", {}).get("inferenceApiKey", {})
                        auth_name = inference_auth.get("name", "Authorization")
                        auth_value = inference_auth.get("value") or self.inference_api_key or self.api_key

                        service_id = None
                        tasks = data.get("pipelineResponseConfig", [])
                        if tasks and "config" in tasks[0] and tasks[0]["config"]:
                            service_id = tasks[0]["config"][0].get("serviceId")

                        if callback_url and service_id:
                            config_data = {
                                "callback_url": callback_url,
                                "service_id": service_id,
                                "auth_name": auth_name,
                                "auth_value": auth_value,
                            }
                            self._pipeline_cache[cache_key] = config_data
                            return config_data
            except Exception as err:
                logger.warning(f"Bhashini pipeline config call failed for task {task_type}: {err}")

        # Fallback to direct Dhruva pipeline inference endpoint
        if self.inference_api_key:
            default_service_map = {
                "translation": "ai4bharat/indictrans-v2-all-gpu--t4",
                "asr": asr_service_id(source_lang),
                "tts": "Bhashini/IITM/TTS",
            }
            config_data = {
                "callback_url": "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
                "service_id": default_service_map.get(task_type, "bhashini/ai4bharat/conformer-multilingual-asr"),
                "auth_name": "Authorization",
                "auth_value": self.inference_api_key,
            }
            self._pipeline_cache[cache_key] = config_data
            return config_data

        return None

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translates text from source_lang to target_lang via Bhashini NMT."""
        from app.services.bhashini import bhashini_service
        return bhashini_service.translate(text, source_lang=source_lang, target_lang=target_lang)

    def detect_language(self, text: str) -> str:
        """Detects Indian regional language or English from text using script analysis."""
        from app.services.bhashini import bhashini_service
        res = bhashini_service.identify_language(text)
        return res.short_code or "en"

    def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language_code: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> Dict[str, Any]:
        """
        Transcribes speech audio using Bhashini ASR (MeitY ULCA / Dhruva).
        """
        lang = (language_code or "en").lower().split("-")[0]
        if lang == "auto":
            lang = "hi"  # Default Indic speech recognition anchor for auto-detect

        if not self.is_configured:
            record("bhashini_stt", success=False, reason="NOT_CONFIGURED")
            return {
                "transcript": "",
                "language_code": f"{lang}-IN",
                "detected_iso": lang,
                "source": "bhashini_mock_stt",
                "is_mock": True,
                "upstream_status": 503,
            }

        config = self._get_pipeline_config("asr", lang)
        if not config:
            record("bhashini_stt", success=False, reason="NO_PIPELINE_CONFIG")
            return {
                "transcript": "",
                "language_code": f"{lang}-IN",
                "detected_iso": lang,
                "source": "bhashini_fallback_stt",
                "is_mock": True,
                "upstream_status": 503,
            }

        callback_url = config["callback_url"]
        service_id = config["service_id"]
        auth_name = config.get("auth_name", "Authorization")
        auth_value = config.get("auth_value", "")

        headers = {
            auth_name: auth_value,
            "Content-Type": "application/json",
        }

        # The browser decodes MP4/WebM and resamples before upload. Validate the
        # actual WAV header rather than declaring every recording to be 16 kHz.
        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as audio:
                valid = audio.getframerate() == 16000 and audio.getnchannels() == 1 and audio.getsampwidth() == 2 and audio.getcomptype() == "NONE"
            if not valid:
                raise ValueError("Unsupported PCM format")
        except (wave.Error, EOFError, ValueError):
            record("bhashini_stt", success=False, reason="AUDIO_FORMAT_UNSUPPORTED")
            return {"transcript": "", "is_mock": True, "source": "bhashini_asr", "upstream_status": 415}

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": lang,
                        },
                        "serviceId": service_id,
                        "audioFormat": "wav",
                        "samplingRate": 16000,
                    },
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_b64,
                    }
                ]
            },
        }

        try:
            with httpx.Client(timeout=self.timeout_sec * 2) as client:
                resp = client.post(callback_url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    pipeline_res = data.get("pipelineResponse", [])
                    if pipeline_res and "output" in pipeline_res[0]:
                        outputs = pipeline_res[0]["output"]
                        if outputs:
                            transcript = outputs[0].get("source", outputs[0].get("text", "")).strip()
                            record("bhashini_stt", success=bool(transcript), http_status=200)
                            return {
                                "transcript": transcript,
                                "language_code": f"{lang}-IN",
                                "detected_iso": lang,
                                "source": "bhashini_asr",
                                "is_mock": False,
                            }
                record("bhashini_stt", success=False, http_status=resp.status_code)
                return {
                    "transcript": "",
                    "language_code": f"{lang}-IN",
                    "detected_iso": lang,
                    "source": "bhashini_fallback_stt",
                    "is_mock": True,
                    "upstream_status": resp.status_code,
                }
        except Exception as err:
            logger.warning(f"Bhashini ASR call failed: {err}")
            record("bhashini_stt", success=False, reason=type(err).__name__)
            return {
                "transcript": "",
                "language_code": f"{lang}-IN",
                "detected_iso": lang,
                "source": "bhashini_fallback_stt",
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
        Synthesizes Indian regional voice audio using Bhashini TTS.
        """
        lang = (language_code or "en").lower().split("-")[0]
        gender = speaker.lower() if speaker in ("male", "female") else DEFAULT_TTS_VOICES.get(lang, "female")

        if not self.is_configured:
            record("bhashini_tts", success=False, reason="NOT_CONFIGURED")
            return {
                "audio_base64": None,
                "audio_format": "wav",
                "sample_rate": 8000,
                "speaker": gender,
                "language_code": f"{lang}-IN",
                "source": "bhashini_mock_tts",
                "is_mock": True,
            }

        config = self._get_pipeline_config("tts", lang)
        if not config:
            record("bhashini_tts", success=False, reason="NO_PIPELINE_CONFIG")
            return {
                "audio_base64": None,
                "audio_format": "wav",
                "sample_rate": 8000,
                "speaker": gender,
                "language_code": f"{lang}-IN",
                "source": "bhashini_fallback_tts",
                "is_mock": True,
            }

        callback_url = config["callback_url"]
        service_id = config["service_id"]
        auth_name = config.get("auth_name", "Authorization")
        auth_value = config.get("auth_value", "")

        headers = {
            auth_name: auth_value,
            "Content-Type": "application/json",
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": lang,
                        },
                        "serviceId": service_id,
                        "gender": gender,
                        "samplingRate": 8000,
                    },
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text,
                    }
                ]
            },
        }

        try:
            with httpx.Client(timeout=self.timeout_sec * 2) as client:
                resp = client.post(callback_url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    pipeline_res = data.get("pipelineResponse", [])
                    if pipeline_res and "audio" in pipeline_res[0]:
                        audio_list = pipeline_res[0]["audio"]
                        if audio_list and "audioContent" in audio_list[0]:
                            audio_b64 = audio_list[0]["audioContent"]
                            record("bhashini_tts", success=True, http_status=200)
                            return {
                                "audio_base64": audio_b64,
                                "audio_format": "wav",
                                "sample_rate": 8000,
                                "speaker": gender,
                                "language_code": f"{lang}-IN",
                                "source": "bhashini_tts",
                                "is_mock": False,
                            }
                record("bhashini_tts", success=False, http_status=resp.status_code)
                return {
                    "audio_base64": None,
                    "audio_format": "wav",
                    "sample_rate": 8000,
                    "speaker": gender,
                    "language_code": f"{lang}-IN",
                    "source": "bhashini_fallback_tts",
                    "is_mock": True,
                }
        except Exception as err:
            logger.warning(f"Bhashini TTS call failed: {err}")
            record("bhashini_tts", success=False, reason=type(err).__name__)
            return {
                "audio_base64": None,
                "audio_format": "wav",
                "sample_rate": 8000,
                "speaker": gender,
                "language_code": f"{lang}-IN",
                "source": "bhashini_fallback_tts",
                "is_mock": True,
            }
