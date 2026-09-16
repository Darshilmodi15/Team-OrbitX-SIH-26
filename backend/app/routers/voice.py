"""
Voice & Speech API Router for ORCA Marine AI.

Powered by Sarvam AI:
- Saaras v3 / v2: Speech-to-Text (STT) for 22+ Indian languages + English
- Bulbul v3: Neural Text-to-Speech (TTS) with Indian voice personas
"""
import base64
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.routers.auth import get_optional_current_user
from app.services.rate_limit import rate_limiter
from app.services.language import (
    BULBUL_V3_SPEAKERS,
    SUPPORTED_LANGUAGES,
    language_service,
    to_sarvam_code,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice & Speech"])

MAX_AUDIO_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_BASE64_BYTES = 7 * 1024 * 1024  # ~5 MB decoded
MAX_TTS_CHARS = 1000
MAX_RECORDING_SECONDS = 45.0  # Hard server limit 45s


def _resolve_caller_rate_key(request: Request, authorization: Optional[str] = None) -> str:
    try:
        user = get_optional_current_user(authorization)
        if user:
            return f"user:{user.id}"
    except Exception:
        pass
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    return f"ip:{client_ip}"


class TranscribeBase64Request(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio data (wav, mp3, webm, ogg)")
    filename: Optional[str] = Field(default="audio.wav", description="Audio filename with extension")
    language: Optional[str] = Field(default="auto", description="Spoken language code or 'auto'")
    content_type: Optional[str] = Field(default="audio/wav", description="MIME type of audio")


class TranscribeResponse(BaseModel):
    success: bool = True
    transcript: str = Field(..., description="Transcribed regional text")
    language: str = Field(..., description="Detected 2-letter ISO language code")
    language_code: str = Field(..., description="Sarvam BCP-47 language code (e.g. 'gu-IN')")
    language_name: str = Field(..., description="Human-readable language name")
    english_transcript: str = Field(..., description="English translation of transcribed speech")
    source: str = Field(..., description="Provider source (e.g. 'sarvam_saaras_v3')")
    is_mock: bool = Field(default=False, description="Whether mock provider was used")
    provider: str = Field(default="bhashini", description="Normalized STT provider")
    fallback_used: bool = False
    original_transcript: Optional[str] = None
    detected_languages: Optional[List[str]] = None
    dominant_language: Optional[str] = None
    response_language: Optional[str] = None
    english_normalized_query: Optional[str] = None
    language_confidence: Optional[float] = None
    transcription_provider: Optional[str] = "bhashini"


class SpeakRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize to speech")
    language: Optional[str] = Field(default="en", description="Target ISO language code (e.g. 'gu', 'hi', 'en')")
    speaker: Optional[str] = Field(default=None, description="Bulbul v3 speaker persona (e.g. 'shubh', 'ratan', 'kavya')")


class SpeakResponse(BaseModel):
    audio_base64: Optional[str] = Field(default=None, description="Base64 encoded WAV audio bytes")
    audio_format: str = Field(default="wav", description="Audio format")
    sample_rate: int = Field(default=22050, description="Audio sample rate in Hz")
    speaker: str = Field(default="shubh", description="Voice persona used")
    language_code: str = Field(default="en-IN", description="Sarvam language code")
    source: str = Field(default="sarvam_bulbul_v3", description="Provider name")
    is_mock: bool = Field(default=False, description="Whether mock provider was used")


def _check_audio_limits(audio_bytes: bytes, declared_duration: Optional[float] = None) -> None:
    if declared_duration is not None and declared_duration > MAX_RECORDING_SECONDS:
        raise HTTPException(
            status_code=413,
            detail=f"Audio recording duration ({declared_duration:.1f}s) exceeds maximum allowed limit ({int(MAX_RECORDING_SECONDS)}s)."
        )
    if len(audio_bytes) >= 44 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        byte_rate = int.from_bytes(audio_bytes[28:32], "little")
        if byte_rate > 0:
            duration_s = (len(audio_bytes) - 44) / byte_rate
            if duration_s > MAX_RECORDING_SECONDS:
                raise HTTPException(
                    status_code=413,
                    detail=f"Audio recording duration ({duration_s:.1f}s) exceeds maximum allowed limit ({int(MAX_RECORDING_SECONDS)}s)."
                )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio_file(
    request: Request,
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form("auto"),
    duration: Optional[float] = Form(None),
    authorization: Optional[str] = Header(None),
):
    """
    Transcribes uploaded audio file using Sarvam Saaras Speech-to-Text.
    
    Accepts multipart/form-data with 'file', optional 'language' ('auto', 'gu', 'hi', etc.),
    and optional 'duration' in seconds.
    """
    rate_limiter.check("voice_stt", _resolve_caller_rate_key(request, authorization), limit=20, window_seconds=60)
    if not file:
        raise HTTPException(status_code=400, detail="Missing required audio file in multipart form data.")

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 10:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty or corrupted.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds maximum size limit (5 MB).")

    _check_audio_limits(audio_bytes, declared_duration=duration)

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "recording.wav"
    supported = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"}
    normalized_type = content_type.split(";", 1)[0].lower()
    if normalized_type not in supported:
        raise HTTPException(status_code=415, detail=f"Unsupported audio type: {normalized_type}")

    result = language_service.speech_to_text(
        audio_bytes=audio_bytes,
        filename=filename,
        language_code=language,
        content_type=content_type,
    )
    if result.get("is_mock"):
        status_code = result.get("upstream_status", 503)
        if status_code == 429:
            return JSONResponse(status_code=429, content={
                "success": False,
                "error_code": "STT_QUOTA_EXHAUSTED",
                "message": "Speech transcription quota exceeded. Please try again later.",
            })
        logger.warning("STT provider unavailable (source=%s, status=%s)", result.get("source"), status_code)
        return JSONResponse(status_code=503, content={
            "success": False,
            "error_code": "STT_UPSTREAM_UNAVAILABLE",
            "message": "Voice transcription is temporarily unavailable.",
        })

    raw_transcript = result.get("transcript", "")
    if not raw_transcript or not raw_transcript.strip():
        logger.info("STT returned empty transcript (no speech detected)")
        return JSONResponse(status_code=400, content={
            "success": False,
            "error_code": "NO_SPEECH_DETECTED",
            "message": "We couldn't understand the recording. Please try again or type your question.",
        })

    transcript = raw_transcript.strip()
    stt_detected = result.get("detected_iso")
    stt_lang = stt_detected if (stt_detected and stt_detected != "auto") else (language if language and language != "auto" else None)
    provider_name = "bhashini" if "bhashini" in result.get("source", "") else ("sarvam" if "sarvam" in result.get("source", "") else "bhashini")
    from app.services.bhashini import bhashini_service
    decision = bhashini_service.determine_query_language(
        text=transcript,
        requested_lang=stt_lang or language,
        user_profile_lang=stt_lang,
        transcription_provider=provider_name,
    )
    resp_lang = decision.response_language
    if stt_lang and stt_lang not in ("en", "auto") and (resp_lang == "en" and not any(ord(c) >= 128 for c in transcript)):
        resp_lang = stt_lang

    sarvam_code = to_sarvam_code(resp_lang)
    lang_name = SUPPORTED_LANGUAGES.get(resp_lang, resp_lang.upper())
    eng_trans = decision.english_normalized_query
    if resp_lang != "en" and eng_trans == transcript:
        eng_trans = language_service.translate(transcript, source_lang=resp_lang, target_lang="en")

    return TranscribeResponse(
        transcript=transcript,
        language=resp_lang,
        language_code=sarvam_code,
        language_name=lang_name,
        english_transcript=eng_trans,
        source=result.get("source", f"{provider_name}_asr"),
        is_mock=False,
        provider=provider_name,
        fallback_used=decision.fallback_used,
        original_transcript=decision.original_transcript,
        detected_languages=decision.detected_languages,
        dominant_language=decision.dominant_language,
        response_language=decision.response_language,
        english_normalized_query=decision.english_normalized_query,
        language_confidence=decision.language_confidence,
        transcription_provider=provider_name,
    )


@router.post("/transcribe-base64", response_model=TranscribeResponse)
def transcribe_base64_audio(
    payload: TranscribeBase64Request,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Transcribes base64-encoded audio payload via Sarvam Saaras Speech-to-Text.
    """
    rate_limiter.check("voice_stt", _resolve_caller_rate_key(request, authorization), limit=20, window_seconds=60)
    if len(payload.audio_base64) > MAX_BASE64_BYTES:
        raise HTTPException(status_code=413, detail="Audio base64 payload exceeds maximum size limit.")
    try:
        # Strip potential data URL prefix
        raw_b64 = payload.audio_base64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]
        audio_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio encoding: {err}")

    if len(audio_bytes) < 10:
        raise HTTPException(status_code=400, detail="Empty or malformed audio")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Decoded audio exceeds maximum size limit (5 MB).")

    _check_audio_limits(audio_bytes)

    result = language_service.speech_to_text(
        audio_bytes=audio_bytes,
        filename=payload.filename or "recording.wav",
        language_code=payload.language,
        content_type=payload.content_type or "audio/wav",
    )

    if result.get("is_mock"):
        status_code = result.get("upstream_status", 503)
        if status_code == 429:
            raise HTTPException(status_code=429, detail="STT_QUOTA_EXHAUSTED")
        raise HTTPException(status_code=503, detail="STT_UPSTREAM_UNAVAILABLE")

    raw_transcript = result.get("transcript", "")
    if not raw_transcript or not raw_transcript.strip():
        raise HTTPException(status_code=400, detail="NO_SPEECH_DETECTED")

    transcript = raw_transcript.strip()
    stt_detected = result.get("detected_iso")
    stt_lang = stt_detected if (stt_detected and stt_detected != "auto") else (payload.language if payload.language and payload.language != "auto" else None)
    provider_name = "bhashini" if "bhashini" in result.get("source", "") else ("sarvam" if "sarvam" in result.get("source", "") else "bhashini")
    from app.services.bhashini import bhashini_service
    decision = bhashini_service.determine_query_language(
        text=transcript,
        requested_lang=stt_lang or payload.language,
        user_profile_lang=stt_lang,
        transcription_provider=provider_name,
    )
    resp_lang = decision.response_language
    if stt_lang and stt_lang not in ("en", "auto") and (resp_lang == "en" and not any(ord(c) >= 128 for c in transcript)):
        resp_lang = stt_lang

    sarvam_code = to_sarvam_code(resp_lang)
    lang_name = SUPPORTED_LANGUAGES.get(resp_lang, resp_lang.upper())
    eng_trans = decision.english_normalized_query
    if resp_lang != "en" and eng_trans == transcript:
        eng_trans = language_service.translate(transcript, source_lang=resp_lang, target_lang="en")

    return TranscribeResponse(
        transcript=transcript,
        language=resp_lang,
        language_code=sarvam_code,
        language_name=lang_name,
        english_transcript=eng_trans,
        source=result.get("source", f"{provider_name}_asr"),
        is_mock=False,
        provider=provider_name,
        fallback_used=decision.fallback_used,
        original_transcript=decision.original_transcript,
        detected_languages=decision.detected_languages,
        dominant_language=decision.dominant_language,
        response_language=decision.response_language,
        english_normalized_query=decision.english_normalized_query,
        language_confidence=decision.language_confidence,
        transcription_provider=provider_name,
    )


@router.post("/speak", response_model=SpeakResponse)
def synthesize_speech(
    payload: SpeakRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Synthesizes regional Indic speech audio using neural TTS (Bhashini / Sarvam).
    """
    rate_limiter.check("voice_tts", _resolve_caller_rate_key(request, authorization), limit=30, window_seconds=60)
    if len(payload.text) > MAX_TTS_CHARS:
        raise HTTPException(status_code=400, detail="Text length exceeds maximum allowed limit of 1000 characters.")
    result = language_service.text_to_speech(
        text=payload.text,
        language_code=payload.language or "en",
        speaker=payload.speaker,
    )

    if result.get("is_mock") or not result.get("audio_base64"):
        raise HTTPException(status_code=503, detail="TTS_UPSTREAM_UNAVAILABLE")
    default_speaker = "female" if "bhashini" in result.get("source", "") else "shubh"
    default_source = "bhashini_tts" if "bhashini" in result.get("source", "") else "sarvam_bulbul_v3"
    return SpeakResponse(
        audio_base64=result.get("audio_base64"),
        audio_format=result.get("audio_format", "wav"),
        sample_rate=result.get("sample_rate", 8000),
        speaker=result.get("speaker", default_speaker),
        language_code=result.get("language_code", to_sarvam_code(payload.language or "en")),
        source=result.get("source", default_source),
        is_mock=result.get("is_mock", False),
    )


@router.get("/speakers")
def list_available_speakers():
    """
    Lists supported voice personas and language mapping.
    """
    provider_cls_name = getattr(language_service.provider, "__class__", type(None)).__name__.lower()
    if "sarvam" in provider_cls_name:
        return {
            "provider": "Sarvam AI (Bulbul v3)",
            "default_speaker": "shubh",
            "available_speakers": list(BULBUL_V3_SPEAKERS),
            "supported_languages": SUPPORTED_LANGUAGES,
        }
    return {
        "provider": "MeitY Bhashini (IITM / AI4Bharat Indic-TTS)",
        "default_speaker": "female",
        "available_speakers": ["female", "male"],
        "supported_languages": SUPPORTED_LANGUAGES,
    }
