"""Contract and adversarial tests; provider values here are isolated test fixtures."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app, weather_provider
from app.db.session import get_db_context
from app.db.models import ChatHistory
from app.services.marine_snapshot_service import marine_snapshot_service
from app.services.dialogue_synthesizer import DialogueSynthesizer
from app.services.provider_health import ProviderUnavailable
from tests.auth_helpers import authenticate_client


@pytest.fixture
def client(monkeypatch):
    c=authenticate_client(TestClient(app))
    assert c.post("/api/location/update",json={"lat":18.9,"lon":72.7}).status_code == 200
    def weather(**kw):
        return {"wave_height_m":1.6,"wind_speed_kmh":20.0,"sea_surface_temperature_c":None,
            "wave_direction_deg":240.0,"wave_period_s":7.0,"forecast":"unavailable","source":"INCOIS_OSF_WW3",
            "forecast_valid_at":kw["temporal_res"].target_utc.isoformat(),"retrieved_at":datetime.now(timezone.utc).isoformat(),
            "cache_status":"fresh","is_mock":False,"grid_lat":18.875,"grid_lon":72.75}
    monkeypatch.setattr(weather_provider,"get_weather",weather)
    return c


def test_desktop_android_same_raw_payload_and_owned_identity(client):
    target=datetime.now(timezone.utc).replace(minute=0,second=0,microsecond=0).isoformat()
    desktop=client.get("/api/marine/snapshot",params={"requested_time":target,"lat":18.9,"lon":72.7},headers={"User-Agent":"Desktop Chrome"})
    android=client.get("/api/marine/snapshot",params={"requested_time":target,"lat":18.9,"lon":72.7},headers={"User-Agent":"Android Chrome"})
    assert desktop.status_code == 200, desktop.text
    assert desktop.content == android.content
    data=desktop.json()
    assert data["weather"]["wave_height_m"] == 1.6
    assert data["ocean"]["sst_c"] is None
    assert data["pfz"]["zones"] == []
    assert data["tide"]["availability"] == "unavailable"
    assert "ocean.sst_c" in data["missing_fields"]
    other=authenticate_client(TestClient(app))
    assert other.get("/api/marine/snapshots/"+data["snapshot_id"]).status_code == 404
    assert client.get("/api/marine/snapshot",params={"lat":19.1,"lon":72.9}).status_code == 409
    assert client.get("/api/marine/snapshots/"+data["snapshot_id"]).content == desktop.content


def test_greeting_never_resolves_marine(client,monkeypatch):
    monkeypatch.setattr(marine_snapshot_service,"resolve",lambda *a,**k:pytest.fail("greeting invoked marine"))
    monkeypatch.setattr(DialogueSynthesizer,"synthesize_response",lambda **kw:"Hello.")
    result=client.post("/api/chat",json={"message":"Hello","language":"en"})
    assert result.status_code == 200,result.text
    assert result.json()["snapshot_id"] is None


def test_chat_same_evidence_and_durable_idempotency(client,monkeypatch):
    snap=client.get("/api/marine/snapshot").json()
    calls=[]
    def answer(**kw):
        calls.append(kw)
        assert kw["evidence"].marine_snapshot["snapshot_id"] == snap["snapshot_id"]
        assert kw["evidence"].weather.wave_height_m == snap["weather"]["wave_height_m"]
        return "Test provider explanation"
    monkeypatch.setattr(DialogueSynthesizer,"synthesize_response",answer)
    conv=client.post("/api/conversations",json={"title":"Canonical evidence"}).json()["id"]
    payload={"message":"What are the current wave conditions?","language":"en","session_id":conv,"snapshot_id":snap["snapshot_id"],"request_id":"same-attempt"}
    first=client.post("/api/chat",json=payload)
    assert first.status_code == 200,first.text
    repeat=client.post("/api/chat",json=payload)
    assert first.content == repeat.content
    assert len(calls)==1
    history=client.get("/api/conversations/"+conv).json()["messages"]
    assert len(history)==2
    assert history[0]["metadata"]["request_id"] == payload["request_id"]
    assert history[0]["metadata"]["request_language"] == "en"
    assert history[-1]["metadata"]["request_id"] == payload["request_id"]
    assert history[-1]["metadata"]["marine_snapshot"] == snap
    trace = first.json()["operational_trace"]
    assert trace and history[-1]["metadata"]["operational_trace"] == trace
    assert all("status" in stage and "timestamp" in stage for stage in trace)


def test_optional_evidence_rejects_cross_account_before_upstream(client, monkeypatch):
    from app.services.species import species_service
    from app.services.earth_observation import earth_observation_service
    snap = client.get("/api/marine/snapshot").json()
    other = authenticate_client(TestClient(app))
    calls = []
    for service in (species_service, earth_observation_service):
        monkeypatch.setattr(service, "get", lambda lat, lon: calls.append((lat, lon)) or {"status": "empty"})
    for name in ("species", "earth-observation"):
        path = f"/api/intelligence/{name}?snapshot_id={snap['snapshot_id']}"
        assert other.get(path).status_code == 404
        assert not calls
    for name in ("species", "earth-observation"):
        assert client.get(f"/api/intelligence/{name}?snapshot_id={snap['snapshot_id']}").status_code == 200
    assert calls == [(18.9, 72.7), (18.9, 72.7)]


def test_failed_provider_retry_does_not_duplicate_user(client,monkeypatch):
    conv=client.post("/api/conversations",json={"title":"Retry"}).json()["id"]
    def fail(**kw):raise ProviderUnavailable("RATE_LIMIT_OR_QUOTA",429)
    monkeypatch.setattr(DialogueSynthesizer,"synthesize_response",fail)
    payload={"message":"Hello","session_id":conv,"request_id":"one-user-turn","language":"en"}
    failure=client.post("/api/chat",json=payload)
    assert failure.status_code==503
    assert failure.json()["reason"]=="RATE_LIMIT_OR_QUOTA"
    monkeypatch.setattr(DialogueSynthesizer,"synthesize_response",lambda **kw:"Hello again")
    assert client.post("/api/chat",json=payload).status_code==200
    assert len(client.get("/api/conversations/"+conv).json()["messages"])==2


def test_changed_location_rejects_old_snapshot(client):
    snap=client.get("/api/marine/snapshot").json()
    assert client.post("/api/location/update",json={"lat":18.8,"lon":72.6}).status_code==200
    with get_db_context() as db:
        from fastapi import HTTPException
        uid=client.get("/api/user/profile").json()["id"]
        with pytest.raises(HTTPException) as exc:marine_snapshot_service.get_by_id(db,uid,snap["snapshot_id"],require_current=True)
        assert exc.value.detail == "SNAPSHOT_LOCATION_CHANGED"


def test_no_synthetic_boundary_or_uncited_measurement(client):
    snap=client.get("/api/marine/snapshot").json()
    assert snap["boundary"]["provenance"].get("retrieval_status") != "embedded_baseline"
    from app.services.marine_boundaries import marine_boundaries_service
    assert marine_boundaries_service._generate_fallback_india_eez()["features"] == []
    assert DialogueSynthesizer._resolve_measurements("Wave [[weather.wave_height_m]] m",snap)=="Wave 1.6 m"
    assert DialogueSynthesizer._resolve_measurements("Call [[contacts.emergency]] or VHF [[radio.distress_channel]]", snap) == "Call 112 or VHF 16"
    assert DialogueSynthesizer._resolve_measurements("INCOIS OSF WW3: [[weather.wave_height_m]] m", snap) == "INCOIS OSF WW3: 1.6 m"
    for text in ("VHF Ch 16", "VHF ચેનલ ૧૬", "VHF चैनल 16", "At 18.9, 72.7"):
        assert DialogueSynthesizer._resolve_measurements(text,snap) == text
    alias_snapshot={"weather":{"current_speed":0.6},"ocean":{}}
    assert DialogueSynthesizer._resolve_measurements("[[weather.ocean_current_speed_kmh]] km/h",alias_snapshot)=="0.6 km/h"
    for reply in ["SST is 28.5 C", "SST [[ocean.sst_c]] C", "Wave [[weather.invented]] m", "Waves are 16 m", "Wind is 112 km/h", "VHF 16; wind 16 km/h", "At 19.9, 72.7"]:
        with pytest.raises(ProviderUnavailable):DialogueSynthesizer._resolve_measurements(reply,snap)


def test_chat_rejects_snapshot_from_another_requested_time(client, monkeypatch):
    snap=client.get("/api/marine/snapshot").json()
    monkeypatch.setattr(DialogueSynthesizer,"synthesize_response",lambda **kw:pytest.fail("mismatched evidence reached AI"))
    target=datetime.fromisoformat(snap["request"]["requested_time"])+timedelta(hours=1)
    result=client.post("/api/chat",json={"message":"Explain conditions", "language":"en", "snapshot_id":snap["snapshot_id"], "requested_time":target.isoformat()})
    assert result.status_code == 409
    assert result.json()["detail"] == "SNAPSHOT_REQUESTED_TIME_MISMATCH"


def test_profile_database_outage_is_503_not_401(client,monkeypatch):
    from app.repositories import UserRepository
    def down(*a,**k):raise RuntimeError("test database unavailable")
    monkeypatch.setattr(UserRepository,"get_by_id",down)
    assert client.get("/api/user/profile").status_code==503


def test_exact_time_is_required_and_upstream_mismatch_is_null(client,monkeypatch):
    assert client.get("/api/marine/snapshot",params={"requested_time":"2026-09-16T10:00:00"}).status_code==422
    monkeypatch.setattr(weather_provider,"get_weather",lambda **kw:{"wave_height_m":1.0,"source":"INCOIS_OSF_WW3","is_mock":False,"cache_status":"fresh","forecast_valid_at":(datetime.now(timezone.utc)-timedelta(days=3)).isoformat(),"retrieved_at":datetime.now(timezone.utc).isoformat()})
    data=client.get("/api/marine/snapshot").json()
    assert data["weather"]["wave_height_m"] is None
    assert data["risk"]["level"]=="unknown"


def test_what_does_this_mean_is_grounded_followup(client, monkeypatch):
    snap = client.get("/api/marine/snapshot").json()
    def answer(**kwargs):
        assert kwargs["evidence"].marine_snapshot["snapshot_id"] == snap["snapshot_id"]
        return "Explanation from the supplied evidence"
    monkeypatch.setattr(DialogueSynthesizer, "synthesize_response", answer)
    result = client.post("/api/chat", json={"message":"What does this mean for a small fishing boat?", "language":"en", "snapshot_id":snap["snapshot_id"]})
    assert result.status_code == 200, result.text
    assert result.json()["snapshot_id"] == snap["snapshot_id"]


def test_expired_worker_lease_retries_without_duplicate_turn(client, monkeypatch):
    from app.db.models import ChatRequestRecord
    conv = client.post("/api/conversations", json={"title":"Lease recovery"}).json()["id"]
    monkeypatch.setattr(DialogueSynthesizer, "synthesize_response", lambda **kw: (_ for _ in ()).throw(ProviderUnavailable()))
    payload={"message":"Hello", "language":"en", "session_id":conv, "request_id":"lease-retry"}
    assert client.post("/api/chat", json=payload).status_code == 503
    with get_db_context() as db:
        record = db.query(ChatRequestRecord).filter_by(conversation_id=conv).one()
        record.status="processing"
        record.updated_at=datetime.now(timezone.utc)-timedelta(minutes=11)
    monkeypatch.setattr(DialogueSynthesizer, "synthesize_response", lambda **kw:"Hello")
    assert client.post("/api/chat", json=payload).status_code == 200
    assert len(client.get("/api/conversations/"+conv).json()["messages"]) == 2


def test_refresh_keeps_historical_snapshot_immutable(client):
    from app.db.models import MarineSnapshotRecord
    first=client.get("/api/marine/snapshot").json()
    with get_db_context() as db:
        record=db.get(MarineSnapshotRecord,first["snapshot_id"])
        import json
        payload=json.loads(record.payload_json)
        payload["expires_at"]=(datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat()
        record.payload_json=json.dumps(payload)
    second=client.get("/api/marine/snapshot").json()
    assert second["snapshot_id"] != first["snapshot_id"]
    assert client.get("/api/marine/snapshot").json()==second
    assert client.get("/api/marine/snapshots/"+first["snapshot_id"]).json()==payload


def test_sos_remains_available_when_marine_and_ai_are_down(client, monkeypatch):
    def unavailable(*args, **kwargs):
        raise RuntimeError("provider offline")
    monkeypatch.setattr(marine_snapshot_service, "resolve", unavailable)
    monkeypatch.setattr(DialogueSynthesizer, "synthesize_response", unavailable)
    response=client.post("/api/emergency/sos",json={"lat":18.9,"lon":72.7,"notes":"Isolated regression test only"})
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "RECEIVED"
    assert response.json()["recorded_telemetry"]["lat"] == 18.9
    assert client.get("/api/emergency/contacts").status_code == 200


def test_google_daily_quota_diagnostic_and_real_model_failover(monkeypatch):
    import sys
    from types import ModuleType
    from unittest.mock import Mock
    from app.services.dialogue_synthesizer import _model_cooldowns
    from app.services.provider_health import failure_reason, snapshot
    from app.models.agent_models import EvidenceBundle
    error=RuntimeError("sensitive upstream detail must not be exposed")
    error.code=429
    error.details={"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}
    assert failure_reason(error) == "DAILY_QUOTA_EXHAUSTED"
    provider=Mock()
    provider.models.generate_content.side_effect=[error,Mock(text="Hello from the real provider interface")]
    import google
    genai=ModuleType("google.genai")
    monkeypatch.setitem(sys.modules,"google.genai",genai)
    monkeypatch.setattr(google,"genai",genai,raising=False)
    monkeypatch.setattr(genai,"Client",Mock(return_value=provider),raising=False)
    monkeypatch.setenv("GEMINI_API_KEY","test-only")
    monkeypatch.setenv("GEMINI_MODEL","test-primary")
    monkeypatch.setenv("GEMINI_FALLBACK_MODELS","test-secondary")
    _model_cooldowns.clear()
    answer=DialogueSynthesizer.synthesize_response("Hello","Hello","general",EvidenceBundle(date="2026-09-16"),"Not requested")
    assert answer.model == "test-secondary"
    assert answer.fallback_used is True
    assert [call.kwargs["model"] for call in provider.models.generate_content.call_args_list]==["test-primary","test-secondary"]
    assert snapshot("gemini")["last_failure_reason"] == "DAILY_QUOTA_EXHAUSTED"
    _model_cooldowns.clear()


def test_invalid_model_draft_is_regenerated_once_and_never_returned(client, monkeypatch):
    import sys
    from types import ModuleType
    from unittest.mock import Mock
    snap=client.get("/api/marine/snapshot").json()
    from app.models.marine_snapshot import MarineSnapshot
    evidence=marine_snapshot_service.evidence(MarineSnapshot.model_validate(snap))
    provider=Mock()
    provider.models.generate_content.side_effect=[Mock(text="Wave 999 m"),Mock(text="Wave [[weather.wave_height_m]] m")]
    import google
    genai=ModuleType("google.genai")
    monkeypatch.setitem(sys.modules,"google.genai",genai)
    monkeypatch.setattr(google,"genai",genai,raising=False)
    monkeypatch.setattr(genai,"Client",Mock(return_value=provider),raising=False)
    monkeypatch.setenv("GEMINI_API_KEY","test-only")
    monkeypatch.setenv("GEMINI_MODEL","test-validation-primary")
    answer=DialogueSynthesizer.synthesize_response("Waves?","Waves?","weather",evidence,"Selected location")
    assert answer == "Wave 1.6 m"
    assert provider.models.generate_content.call_count == 2
    assert "999" not in answer
    provider.models.generate_content.reset_mock(side_effect=True)
    provider.models.generate_content.side_effect=[Mock(text="Wave 999 m"),Mock(text="Wave 888 m")]
    with pytest.raises(ProviderUnavailable):
        DialogueSynthesizer.synthesize_response("Waves?","Waves?","weather",evidence,"Selected location")
    assert provider.models.generate_content.call_count == 2
