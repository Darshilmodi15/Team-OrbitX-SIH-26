"""
Pytest configuration and fixtures for ORCA Marine AI tests.
Provides isolated in-memory test database and resets AuthService/services state between test runs.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set in-memory sqlite test database for pytest execution
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["APP_ENV"] = "test"

from app.db.base import Base
from app.db.session import engine, init_db
from app.services.auth.auth_service import auth_service
from app.services.emergency.emergency_service import emergency_service
from app.services.government.government_service import government_service
from app.services.notifications.notification_service import notification_service
from app.services.rate_limit import rate_limiter


@pytest.fixture(autouse=True)
def reset_services_and_db():
    """Resets in-memory state and test database tables before each test."""
    Base.metadata.create_all(bind=engine)
    
    # Reset in-memory services to fresh seed state
    auth_service._users.clear()
    auth_service._lookup.clear()
    auth_service._seed_default_accounts()
    
    emergency_service._active_sos_records.clear()
    rate_limiter.clear()
    from app.services.provider_health import _recent
    _recent.clear()
    
    yield
    
    # Cleanup tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def offline_provider_boundary(monkeypatch, request):
    """Ordinary tests cannot use real credentials or send external HTTP traffic."""
    if request.node.get_closest_marker("external"):
        return
    import httpx
    from app.services.bhashini import bhashini_service
    from app.services.sarvam import sarvam_language_service
    from app.services.language import language_service
    for key in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "SARVAM_API_KEY", "BHASHINI_API_KEY", "ULCA_API_KEY", "BHASHINI_USER_ID", "BHASHINI_INFERENCE_API_KEY"):
        monkeypatch.setenv(key, "")
    for instance, attrs in [(bhashini_service, ("user_id", "api_key", "inference_api_key")), (sarvam_language_service, ("api_key",)), (language_service.provider, ("api_key",))]:
        for attr in attrs:
            if hasattr(instance, attr):
                monkeypatch.setattr(instance, attr, "")
    def offline(*args, **kwargs):
        raise httpx.ConnectError("External HTTP disabled in ordinary tests; stub the provider boundary")
    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", offline)
    import requests
    def requests_offline(*args, **kwargs):
        raise requests.ConnectionError("External HTTP disabled in ordinary tests")
    monkeypatch.setattr(requests.sessions.Session, "request", requests_offline)
    import urllib.request, urllib.error
    def urllib_offline(*args, **kwargs):
        raise urllib.error.URLError("External HTTP disabled in ordinary tests")
    monkeypatch.setattr(urllib.request, "urlopen", urllib_offline)

@pytest.fixture
def pipeline_providers(monkeypatch, request):
    """Controlled upstream responses for orchestration tests, never production fallback."""
    import hashlib
    from datetime import datetime, timezone
    from app.services.dialogue_synthesizer import DialogueSynthesizer
    from app.services.bhashini import BhashiniService
    from app.services.language import language_service
    from app.main import weather_provider
    calls = []
    def synthesis(**kwargs):
        calls.append(kwargs)
        marker = hashlib.sha256((kwargs["user_query"] + str(kwargs.get("history"))).encode()).hexdigest()
        return "TEST_PROVIDER_RESPONSE " + kwargs["target_lang"] + " " + marker
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-not-a-real-key")
    monkeypatch.setattr(DialogueSynthesizer, "_synthesize_with_gemini", synthesis)
    monkeypatch.setattr(BhashiniService, "_translate_with_gemini", lambda self, text, source_lang, target_lang: "Is it safe to go fishing tomorrow?" if target_lang == "en" else "TEST_TRANSLATION " + target_lang)
    monkeypatch.setattr(language_service, "text_to_speech", lambda **kw: {"audio_base64":"UklGRg==", "speaker":kw.get("speaker") or "shubh", "language_code": kw.get("language_code", "en") + "-IN", "source":"test_provider", "is_mock":False})
    monkeypatch.setattr(language_service, "translate", lambda text, source_lang, target_lang: "Test translated transcript")
    monkeypatch.setattr(language_service, "speech_to_text", lambda **kw: {"transcript":"Test recording transcript", "detected_iso":kw.get("language_code") or "en", "language_code":(kw.get("language_code") or "en") + "-IN", "source":"test_provider", "is_mock":False})
    if request.path.name != "test_incois_query.py":
        monkeypatch.setattr(weather_provider, "get_weather", lambda **kw: {"wave_height_m":1.0, "wind_speed_kmh":20.0, "forecast":"unavailable", "source":"INCOIS_OSF_WW3", "is_mock":False, "cache_status":"fresh", "forecast_time":datetime.now(timezone.utc).isoformat()})
    return calls


def pytest_addoption(parser):
    parser.addoption("--run-external", action="store_true", default=False, help="Explicitly run credentialed live-provider tests")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-external"):
        for item in items:
            if item.get_closest_marker("external"):
                item.add_marker(pytest.mark.skip(reason="External provider test; opt in with --run-external"))
