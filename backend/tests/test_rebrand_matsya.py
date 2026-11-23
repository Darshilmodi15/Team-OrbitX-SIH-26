"""Regression tests for Matsya rebrand, localized chatbot personas, and API metadata."""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.brand import (
    APP_NAME,
    DEMO_FISHERMAN_EMAIL,
    ENGINE_FULL_NAME,
    ENGINE_NAME,
    get_assistant_persona,
    get_public_base_url,
)
from app.main import app
from app.models.agent_models import EvidenceBundle
from app.services.dialogue_synthesizer import DialogueSynthesizer


def test_assistant_persona_mapping_and_fallback():
    expected = {
        "gu": ("Nakhuda", "નાખુદા"),
        "mr": ("Daryasarang", "दर्यासारंग"),
        "kn": ("Ambiga", "ಅಂಬಿಗ"),
        "ml": ("Kappithan", "കപ്പിത്താൻ"),
        "ta": ("Kadal Thunai", "கடல் துணை"),
        "bn": ("Majhi", "মাঝি"),
        "or": ("Majhi", "ମାଝି"),
        "hi": ("Sagar Mitra", "सागर मित्र"),
        "te": ("Sagar Mitra", "सागर मित्र"),
        "en": ("Sagar Mitra", "सागर मित्र"),
        "pa": ("Sagar Mitra", "सागर मित्र"),
    }
    for code, (latin, native) in expected.items():
        persona = get_assistant_persona(code)
        assert persona["latin"] == latin
        assert persona["native"] == native

    # Regional tag normalization and unknown fallback -> Sagar Mitra
    assert get_assistant_persona("gu-IN")["latin"] == "Nakhuda"
    assert get_assistant_persona("fr")["latin"] == "Sagar Mitra"
    assert get_assistant_persona("")["latin"] == "Sagar Mitra"
    assert get_assistant_persona(None)["latin"] == "Sagar Mitra"


def test_root_health_and_demo_login_matsya():
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    root = client.get("/")
    assert root.status_code == 200
    body = root.json()
    assert body["service"] == f"{APP_NAME} API"
    assert body["product"] == APP_NAME
    assert body["engine"] == ENGINE_NAME
    assert "ORCA Marine AI" not in str(body)
    assert app.title == f"{APP_NAME} API"
    assert ENGINE_FULL_NAME in app.description

    login = client.post(
        "/api/auth/login",
        json={"email_or_phone": DEMO_FISHERMAN_EMAIL, "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["email"] == DEMO_FISHERMAN_EMAIL


def test_dialogue_synthesizer_prompt_uses_localized_persona_and_matsya():
    captured = {}

    class FakeModels:
        def generate_content(self, model, contents, config):
            captured["system_instruction"] = config["system_instruction"]
            res = MagicMock()
            res.text = "Safe waters ahead."
            return res

    class FakeClient:
        def __init__(self, **kwargs):
            self.models = FakeModels()

    with patch("google.genai.Client", FakeClient):
        reply = DialogueSynthesizer._synthesize_with_gemini(
            user_query="શું આજે દરિયો શાંત છે?",
            english_query="Is the sea calm today?",
            detected_intent="safety_check",
            evidence=EvidenceBundle(date="2026-11-23"),
            location_title="Veraval",
            target_lang="gu",
            history=None,
            api_key="test-key",
        )

    assert reply == "Safe waters ahead."
    prompt = captured["system_instruction"]
    assert "Nakhuda (નાખુદા)" in prompt
    assert "Matsya" in prompt
    assert "powered by ORCA" in prompt
    assert "You are ORCA Marine AI" not in prompt


def test_public_base_url_and_cors_domains(monkeypatch):
    monkeypatch.delenv("PUBLIC_BASE_URL", raising=False)
    assert get_public_base_url() == "https://matsya.app"

    client = TestClient(app)
    for origin in (
        "https://matsya.app",
        "https://www.matsya.app",
        "https://team-orbit-x-sih-26.vercel.app",
        "https://team-orbitx-sih-26.vercel.app",
    ):
        resp = client.options(
            "/health",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
        )
        assert resp.headers.get("access-control-allow-origin") == origin

    blocked = client.options(
        "/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert blocked.headers.get("access-control-allow-origin") is None
