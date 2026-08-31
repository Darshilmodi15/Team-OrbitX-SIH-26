from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_voice_rejects_empty_audio():
    response = client.post("/api/voice/transcribe", files={"file": ("empty.webm", b"", "audio/webm")})
    assert response.status_code == 400


def test_voice_rejects_unsupported_media_type():
    response = client.post("/api/voice/transcribe", files={"file": ("audio.txt", b"not really audio", "text/plain")})
    assert response.status_code == 415


def test_voice_provider_failure_is_not_reported_as_success():
    unavailable = {"transcript": "", "detected_iso": "en", "language_code": "en-IN", "source": "sarvam_fallback_stt", "is_mock": True}
    with patch("app.routers.voice.language_service.speech_to_text", return_value=unavailable):
        response = client.post("/api/voice/transcribe", files={"file": ("audio.webm", b"0123456789audio", "audio/webm")})
    assert response.status_code == 503
    assert response.json() == {
        "success": False,
        "error_code": "STT_UPSTREAM_UNAVAILABLE",
        "message": "Voice transcription is temporarily unavailable.",
    }
