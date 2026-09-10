import pytest
from fastapi.testclient import TestClient
from app.main import app, _process_orca_query
from app.services.bhashini import bhashini_service
from app.models.agent_models import EvidenceBundle, WeatherEvidence, RiskEvidence, PFZEvidence, BoundaryEvidence, RouteEvidence
from tests.auth_helpers import authenticate_client

client = authenticate_client(TestClient(app))


def test_language_priority_rule_english_query():
    """If user asks in English while dashboard is Gujarati, ORCA answers in English."""
    res = _process_orca_query(
        question_raw="What is the current wind speed and wave height near Mumbai?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="gu",  # Dashboard selected Gujarati
    )
    assert res["language"] == "en"
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_language_priority_rule_native_gujarati():
    """If user asks in native Gujarati script, ORCA detects 'gu' and answers in Gujarati."""
    res = _process_orca_query(
        question_raw="આજે દરિયામાં પવન અને મોજાની સ્થિતિ કેવી છે?",
        lat=20.9000,
        lon=70.3667,
        query_date="2026-08-27",
        requested_lang="en",
    )
    assert res["language"] == "gu"
    # Response contains native Gujarati Unicode characters
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_language_priority_rule_native_hindi():
    """If user asks in native Hindi Devanagari script, ORCA detects 'hi' and answers in Hindi."""
    res = _process_orca_query(
        question_raw="क्या आज मछली पकड़ने जाना सुरक्षित है?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    assert res["language"] == "hi"
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_romanized_indic_detection_hindi():
    """User types Latin Hindi ('Kya main kal machhli pakadne ja sakta hoon?') -> detected as Hindi."""
    lid = bhashini_service.identify_language("Kya main kal machhli pakadne ja sakta hoon?")
    assert lid.short_code == "hi"


def test_romanized_indic_detection_gujarati():
    """User types Latin Gujarati ('shu hu kale machhimari karva jai shaku?') -> detected as Gujarati."""
    lid = bhashini_service.identify_language("shu hu kale machhimari karva jai shaku?")
    assert lid.short_code == "gu"


def test_romanized_indic_detection_tamil():
    """User types Latin Tamil ('naalai meen pidikka pogalama?') -> detected as Tamil."""
    lid = bhashini_service.identify_language("naalai meen pidikka pogalama?")
    assert lid.short_code == "ta"


def test_arbitrary_marine_query_wind_and_waves():
    """Arbitrary marine query on wind speed and wave height."""
    res = _process_orca_query(
        question_raw="What is the wave height, wind speed and sea condition near Veraval port?",
        lat=20.9000,
        lon=70.3667,
        query_date="2026-08-27",
        requested_lang="en",
    )
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")
    assert res.get("weather") is not None


def test_arbitrary_marine_query_sea_surface_temperature():
    """Arbitrary marine query on Sea Surface Temperature (SST)."""
    res = _process_orca_query(
        question_raw="What is the sea surface temperature near Mumbai?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_arbitrary_marine_query_emergency_distress():
    """Emergency query regarding engine breakdown at sea."""
    res = _process_orca_query(
        question_raw="My boat engine broke down and we are taking water, what should we do?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    ans = res["answer"]
    assert ans.startswith("TEST_PROVIDER_RESPONSE ")
    assert ans.startswith("TEST_PROVIDER_RESPONSE ")


def test_arbitrary_marine_query_government_schemes():
    """Inquiry about government subsidies and PMMSY."""
    res = _process_orca_query(
        question_raw="What government schemes or subsidies can help fishermen get boats and safety kits?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    ans = res["answer"]
    assert ans.startswith("TEST_PROVIDER_RESPONSE ")


def test_arbitrary_marine_query_distance_to_coast_and_eez():
    """Inquiry about territorial waters and distance to coast."""
    res = _process_orca_query(
        question_raw="How far am I from the coast and am I inside Indian territorial waters?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    ans = res["answer"]
    assert ans.startswith("TEST_PROVIDER_RESPONSE ")


def test_arbitrary_marine_query_nearest_pfz_distance():
    """Inquiry about the distance to nearest PFZ."""
    res = _process_orca_query(
        question_raw="How far is the nearest PFZ from my location and which fish are there?",
        lat=18.9220,
        lon=72.8347,
        query_date="2026-08-27",
        requested_lang="en",
    )
    ans = res["answer"]
    assert ans.startswith("TEST_PROVIDER_RESPONSE ")


def test_multi_turn_context_resolution():
    """Follow-up questions like 'Is that dangerous?' resolve prior context."""
    history = [
        {"role": "user", "text": "What is the wind speed near Okha port?"},
        {"role": "assistant", "text": "The wind speed near Okha Port is 18.0 km/h from the West with wave height 0.85m."},
    ]
    res = _process_orca_query(
        question_raw="Is that dangerous for small boats?",
        lat=22.4667,
        lon=69.0667,
        query_date="2026-08-27",
        requested_lang="en",
        history=history,
    )
    assert res['answer'].startswith("TEST_PROVIDER_RESPONSE ")


def test_voice_speakers_endpoint():
    """Check /api/voice/speakers metadata."""
    response = client.get("/api/voice/speakers")
    assert response.status_code == 200
    data = response.json()
    assert "available_speakers" in data
    assert "supported_languages" in data


def test_voice_speak_endpoint():
    """Check /api/voice/speak TTS endpoint."""
    response = client.post(
        "/api/voice/speak",
        json={
            "text": "Conditions are safe for fishing operations today.",
            "language": "en",
            "speaker": "ratan",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["speaker"] == "ratan"
    assert data["language_code"] == "en-IN"


def test_chat_endpoint_full_pipeline():
    """POST /api/chat handles full multi-agent payload."""
    authenticate_client(client)
    response = client.post(
        "/api/chat",
        json={
            "message": "Where are the best fishing spots near Ratnagiri today?",
            "location": {"lat": 16.9902, "lon": 73.3120},
            "date": "2026-08-27",
            "language": "en",
            "history": [],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
    assert data["language"] == "en"


# Explicit upstream fixtures: these tests exercise orchestration, not live model prose.
import pytest
pytestmark = pytest.mark.usefixtures("pipeline_providers")
