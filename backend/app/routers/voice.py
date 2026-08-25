"""
Voice & Speech API Router for ORCA Marine AI.

Powered by Sarvam AI:
- Saaras v3 / v2: Speech-to-Text (STT) for 22+ Indian languages + English
- Bulbul v3: Neural Text-to-Speech (TTS) with Indian voice personas
"""
import base64
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.services.language import SUPPORTED_LANGUAGES, language_service, to_sarvam_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice & Speech"])


class TranscribeBase64Request(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio data (wav, mp3, webm, ogg)")
    filename: Optional[str] = Field(default="audio.wav", description="Audio filename with extension")
    language: Optional[str] = Field(default="auto", description="Spoken language code or 'auto'")
    content_type: Optional[str] = Field(default="audio/wav", description="MIME type of audio")


class TranscribeResponse(BaseModel):
    transcript: str = Field(..., description="Transcribed regional text")
    language: str = Field(..., description="Detected 2-letter ISO language code")
    language_code: str = Field(..., description="Sarvam BCP-47 language code (e.g. 'gu-IN')")
    language_name: str = Field(..., description="Human-readable language name")
    english_transcript: str = Field(..., description="English translation of transcribed speech")
    source: str = Field(..., description="Provider source (e.g. 'sarvam_saaras_v3')")
    is_mock: bool = Field(default=False, description="Whether mock provider was used")


class SpeakRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize to speech")
    language: Optional[str] = Field(default="en", description="Target ISO language code (e.g. 'gu', 'hi', 'en')")
    speaker: Optional[str] = Field(default=None, description="Speaker persona (e.g. 'meera', 'arvind', 'kavya')")


class SpeakResponse(BaseModel):
    audio_base64: Optional[str] = Field(default=None, description="Base64 encoded WAV audio bytes")
    audio_format: str = Field(default="wav", description="Audio format")
    sample_rate: int = Field(default=22050, description="Audio sample rate in Hz")
    speaker: str = Field(default="meera", description="Voice persona used")
    language_code: str = Field(default="en-IN", description="Sarvam language code")
    source: str = Field(default="sarvam_bulbul_v3", description="Provider name")
    is_mock: bool = Field(default=False, description="Whether mock provider was used")


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio_file(
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form("auto"),
):
    """
    Transcribes uploaded audio file using Sarvam Saaras Speech-to-Text.
    
    Accepts multipart/form-data with 'file' and optional 'language' ('auto', 'gu', 'hi', etc.).
    """
    if not file:
        raise HTTPException(status_code=400, detail="Missing required audio file in multipart form data.")

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 10:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty or corrupted.")

    content_type = file.content_type or "audio/wav"
    filename = file.filename or "recording.wav"

    result = language_service.speech_to_text(
        audio_bytes=audio_bytes,
        filename=filename,
        language_code=language,
        content_type=content_type,
    )

    transcript = result.get("transcript", "")
    detected_iso = result.get("detected_iso", "en")
    sarvam_code = result.get("language_code", to_sarvam_code(detected_iso))
    lang_name = SUPPORTED_LANGUAGES.get(detected_iso, detected_iso.upper())

    # Generate English translation for downstream ORCA agents
    if detected_iso != "en" and transcript:
        english_transcript = language_service.translate(
            text=transcript,
            source_lang=detected_iso,
            target_lang="en",
        )
    else:
        english_transcript = transcript

    return TranscribeResponse(
        transcript=transcript,
        language=detected_iso,
        language_code=sarvam_code,
        language_name=lang_name,
        english_transcript=english_transcript,
        source=result.get("source", "sarvam_saaras_v3"),
        is_mock=result.get("is_mock", False),
    )


@router.post("/transcribe-base64", response_model=TranscribeResponse)
def transcribe_base64_audio(request: TranscribeBase64Request):
    """
    Transcribes base64-encoded audio payload via Sarvam Saaras Speech-to-Text.
    """
    try:
        # Strip potential data URL prefix
        raw_b64 = request.audio_base64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]
        audio_bytes = base64.b64decode(raw_b64)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio encoding: {err}")

    result = language_service.speech_to_text(
        audio_bytes=audio_bytes,
        filename=request.filename or "recording.wav",
        language_code=request.language,
        content_type=request.content_type or "audio/wav",
    )

    transcript = result.get("transcript", "")
    detected_iso = result.get("detected_iso", "en")
    sarvam_code = result.get("language_code", to_sarvam_code(detected_iso))
    lang_name = SUPPORTED_LANGUAGES.get(detected_iso, detected_iso.upper())

    if detected_iso != "en" and transcript:
        english_transcript = language_service.translate(
            text=transcript,
            source_lang=detected_iso,
            target_lang="en",
        )
    else:
        english_transcript = transcript

    return TranscribeResponse(
        transcript=transcript,
        language=detected_iso,
        language_code=sarvam_code,
        language_name=lang_name,
        english_transcript=english_transcript,
        source=result.get("source", "sarvam_saaras_v3"),
        is_mock=result.get("is_mock", False),
    )


@router.post("/speak", response_model=SpeakResponse)
def synthesize_speech(request: SpeakRequest):
    """
    Synthesizes regional Indic speech audio using Sarvam Bulbul v3 neural voices.
    """
    result = language_service.text_to_speech(
        text=request.text,
        language_code=request.language or "en",
        speaker=request.speaker,
    )

    return SpeakResponse(
        audio_base64=result.get("audio_base64"),
        audio_format=result.get("audio_format", "wav"),
        sample_rate=result.get("sample_rate", 22050),
        speaker=result.get("speaker", "meera"),
        language_code=result.get("language_code", to_sarvam_code(request.language or "en")),
        source=result.get("source", "sarvam_bulbul_v3"),
        is_mock=result.get("is_mock", False),
    )


@router.get("/speakers")
def list_available_speakers():
    """
    Lists supported Sarvam voice personas and language mapping.
    """
    return {
        "provider": "Sarvam AI (Bulbul v3)",
        "default_speaker": "meera",
        "available_speakers": ["meera", "kavya", "arvind", "amartya", "ratan", "shashi"],
        "supported_languages": SUPPORTED_LANGUAGES,
    }
