from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.provider_health import ProviderUnavailable, record, snapshot, _recent
from app.services.dialogue_synthesizer import DialogueSynthesizer
from app.models.agent_models import EvidenceBundle
from tests.auth_helpers import authenticate_client


def test_provider_failure_never_calls_deterministic_answer(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    monkeypatch.delenv('GOOGLE_API_KEY', raising=False)
    with patch.object(DialogueSynthesizer, '_synthesize_deterministic') as scripted:
        with pytest.raises(ProviderUnavailable):
            DialogueSynthesizer.synthesize_response('hi', 'hi', 'general', None, 'No location')
        scripted.assert_not_called()


def test_health_observed_success_failure_never_tested_and_stale():
    _recent.clear()
    assert snapshot('never_requested')['status'] == 'UNKNOWN'
    record('test_provider', success=True, http_status=200)
    success = snapshot('test_provider')
    assert success['status'] == 'HEALTHY'
    record('test_provider', success=False, http_status=403, reason='AUTH_REJECTED')
    failure = snapshot('test_provider')
    assert failure['status'] == 'DOWN'
    assert failure['last_successful_response'] == success['last_successful_response']
    assert failure['http_status'] == 403
    record('test_stale', success=True, data_timestamp=(datetime.now(timezone.utc)-timedelta(hours=2)).isoformat())
    assert snapshot('test_stale')['status'] == 'DEGRADED'
    record('test_fallback', success=True, mode='fallback')
    assert snapshot('test_fallback')['fallback_in_use'] is True


def test_chat_missing_location_does_not_assume_city():
    client = authenticate_client(TestClient(app))
    with patch('app.main._process_orca_query') as process, patch.object(DialogueSynthesizer, 'synthesize_response', return_value='Choose a location for local weather.') as synthesize:
        response = client.post('/api/chat', json={'message': 'Weather here?'})
    assert response.status_code == 200
    assert response.json()['location'] is None
    assert synthesize.call_args.kwargs['evidence'].location_lat is None
    process.assert_not_called()


@pytest.mark.parametrize('location', [None, {'lat': 20.9, 'lon': 70.3}])
def test_chat_failed_ai_preserves_user_turn_without_fake_assistant(location):
    client = authenticate_client(TestClient(app))
    conversation = client.post('/api/conversations', json={'title': 'QA'}).json()['id']
    with patch('app.main._process_orca_query', side_effect=ProviderUnavailable()), patch.object(DialogueSynthesizer, 'synthesize_response', side_effect=ProviderUnavailable()):
        response = client.post('/api/chat', json={'message': 'Explain waves', 'location': location, 'session_id': conversation})
    assert response.status_code == 503
    assert response.json() == {'detail': 'AI_PROVIDER_UNAVAILABLE'}
    stored = client.get('/api/conversations/'+conversation).json()['messages']
    assert [(m['role'], m['content']) for m in stored] == [('user', 'Explain waves')]


@pytest.mark.parametrize('status', [401, 403, 429])
def test_gemini_account_failures_stop_model_retry_chain(monkeypatch, status):
    import sys
    from types import ModuleType
    from unittest.mock import Mock
    error = RuntimeError('Provider detail that must not become an answer')
    error.code = status
    provider = Mock()
    provider.models.generate_content.side_effect = error
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-key')
    google_mod = sys.modules.setdefault('google', ModuleType('google'))
    genai_mod = sys.modules.setdefault('google.genai', ModuleType('google.genai'))
    monkeypatch.setattr(google_mod, 'genai', genai_mod, raising=False)
    monkeypatch.setattr(genai_mod, 'Client', Mock(return_value=provider), raising=False)
    with pytest.raises(ProviderUnavailable):
        DialogueSynthesizer.synthesize_response('Hello', 'Hello', 'general', EvidenceBundle(date='2026-09-11'), 'Not selected')
    provider.models.generate_content.assert_called_once()
    assert snapshot('gemini')['http_status'] == status


def test_base64_invalid_audio_and_upstream_error():
    client = TestClient(app)
    assert client.post('/api/voice/transcribe-base64', json={'audio_base64':'%%%'}).status_code == 400
    import base64
    with patch('app.routers.voice.language_service.speech_to_text', return_value={'transcript':'', 'is_mock':True}):
        assert client.post('/api/voice/transcribe-base64', json={'audio_base64':base64.b64encode(b'a'*20).decode()}).status_code == 503


def test_stale_cache_read_preserves_last_provider_success():
    record('cache_test', success=True, http_status=200)
    original = snapshot('cache_test')['last_successful_response']
    record('cache_test', success=True, mode='stale')
    assert snapshot('cache_test')['last_successful_response'] == original
    assert snapshot('cache_test')['real_data_arriving'] is False


def test_health_database_outage_is_not_zero_users():
    from app.services.admin.admin_service import admin_service
    with patch('app.db.session.get_db_context', side_effect=RuntimeError('storage unavailable')):
        status = admin_service.get_system_health()
    assert status.registered_users_count is None
    assert next(s for s in status.services if s.service_id == 'database').status == 'DOWN'


def test_location_save_failure_does_not_change_active_location():
    from app.services.location.location_service import LocationService
    from fastapi import HTTPException
    service = LocationService()
    with patch('app.db.session.get_db_context', side_effect=RuntimeError('storage unavailable')):
        with pytest.raises(HTTPException) as error:
            service.validate_location(18.922, 72.8347, user_id='qa-user')
    assert error.value.status_code == 503
    assert service.get_user_location('qa-user') is None


def test_sos_save_failure_never_returns_received():
    from app.services.emergency.emergency_service import EmergencyService
    from app.models.emergency_models import SOSBroadcastRequest
    from fastapi import HTTPException
    service = EmergencyService()
    with patch('app.db.session.get_db_context', side_effect=RuntimeError('storage unavailable')):
        with pytest.raises(HTTPException) as error:
            service.broadcast_sos(SOSBroadcastRequest(lat=18.92, lon=72.83, crew_count=1))
    assert error.value.status_code == 503
    assert service._active_sos_records == {}


def test_existing_account_is_not_authorized_from_cache_during_db_outage():
    from app.services.auth.auth_service import auth_service
    client = authenticate_client(TestClient(app))
    user_id = client.get('/api/user/profile').json()['id']
    assert user_id in auth_service._users
    with patch('app.db.session.get_db_context', side_effect=RuntimeError('storage unavailable')):
        assert auth_service.get_user_by_id(user_id) is None


def test_missing_forecast_and_tide_are_not_synthesized():
    from types import SimpleNamespace
    client = TestClient(app)
    with patch('app.main.get_marine_weather', return_value=SimpleNamespace(forecast_horizon=[], source='verified_fixture')):
        response = client.get('/api/marine/forecast?lat=20.9&lon=70.3')
    assert response.status_code == 200
    assert response.json()['forecast_horizon'] == []
    assert client.get('/api/marine/tide?lat=20.9&lon=70.3').status_code == 503


@pytest.mark.parametrize("message,expected", [
    ("Emergency numbers", "en"), ("Emergency Number", "en"),
    ("What is the coast guard number?", "en"),
    ("આપાતકાલીન નંબર", "gu"), ("అత్యవసర నంబర్లు", "te"),
    ("samundar kaisa hai", "hi"), ("dariya ma pavan kevo che", "gu"),
])
def test_clear_message_language_cannot_be_overridden_by_remote_guess(message, expected):
    from app.services.bhashini import BhashiniService
    from unittest.mock import Mock
    remote = Mock()
    remote.identify_language.side_effect = AssertionError("Unnecessary language HTTP request")
    service = BhashiniService(sarvam_service=remote)
    service.set_session_language("old", "te")
    assert service.identify_language(message, session_id="old").short_code == expected
    remote.identify_language.assert_not_called()


@pytest.mark.parametrize("location", [None, {"lat": 20.9, "lon": 70.3}])
@pytest.mark.parametrize("ui_language", ["en", "gu", "te"])
def test_emergency_numbers_english_and_no_operational_lookups(location, ui_language):
    client = authenticate_client(TestClient(app))
    with patch('app.main.bhashini_service.sarvam_service.identify_language', side_effect=AssertionError("No remote LID")), \
         patch('app.main.bhashini_service.translate', side_effect=AssertionError("No translation")), \
         patch('app.main.get_marine_weather', side_effect=AssertionError("No weather lookup")), \
         patch.object(DialogueSynthesizer, 'synthesize_response', return_value='Emergency contacts') as synthesize:
        response = client.post('/api/chat', json={'message': 'Emergency numbers', 'language': ui_language, 'location': location})
    assert response.status_code == 200, response.text
    assert response.json()['language'] == 'en'
    assert synthesize.call_args.kwargs['target_lang'] == 'en'
    if location:
        assert response.json()['plan']['tasks'] == []
