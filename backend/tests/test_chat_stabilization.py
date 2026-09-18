"""Fault-injection tests are not claims of live provider acceptance."""
import json
import logging
import sys
from types import ModuleType
from unittest.mock import Mock
import httpx
import pytest
from app.models.agent_models import EvidenceBundle
from app.services.dialogue_synthesizer import DialogueSynthesizer, _model_cooldowns
from app.services.provider_health import ProviderUnavailable, failure_reason, provider_request, request_id_context


@pytest.fixture
def provider(monkeypatch):
    import google
    genai = ModuleType("google.genai")
    client = Mock()
    genai.Client = Mock(return_value=client)
    monkeypatch.setitem(sys.modules, "google.genai", genai)
    monkeypatch.setattr(google, "genai", genai, raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "secret-test-value")
    monkeypatch.setenv("GEMINI_MODEL", "test-primary")
    monkeypatch.setenv("GEMINI_FALLBACK_MODELS", "test-secondary,test-third")
    monkeypatch.setattr("app.services.dialogue_synthesizer.record", Mock())
    _model_cooldowns.clear()
    yield client
    _model_cooldowns.clear()


def ask():
    with provider_request("acceptance-123"):
        return DialogueSynthesizer.synthesize_response("private prompt", "private prompt", "general",
            EvidenceBundle(date="2026-09-18"), "Not requested")


@pytest.mark.parametrize("status", [500, 502, 503, 504])
def test_transient_failure_uses_real_alternate_and_logs_sanitized_fields(provider, caplog, status):
    error = RuntimeError("secret-test-value private upstream body")
    error.code = status
    provider.models.generate_content.side_effect = [error, Mock(text="Actual model output")]
    with caplog.at_level(logging.INFO):
        answer = ask()
    assert answer.model == "test-secondary" and answer.fallback_used
    events = [json.loads(r.message.split("provider_attempt ")[1]) for r in caplog.records if "provider_attempt " in r.message]
    assert len(events) == 2
    assert events[0]["upstream_status"] == status
    assert events[0]["category"] == ("UPSTREAM_TIMEOUT" if status == 504 else "PROVIDER_OUTAGE")
    assert [event["retry_count"] for event in events] == [0, 1]
    assert all(event["request_id"] == "acceptance-123" and event["latency_ms"] >= 0 for event in events)
    assert "secret-test-value" not in caplog.text and "private prompt" not in caplog.text
    provider.close.assert_called_once()
    assert request_id_context.get() is None


def test_outage_stops_after_two_total_calls(provider):
    error = RuntimeError("private upstream body")
    error.code = 503
    provider.models.generate_content.side_effect = error
    with pytest.raises(ProviderUnavailable) as raised:
        ask()
    assert raised.value.reason == "PROVIDER_OUTAGE"
    assert raised.value.request_id == "acceptance-123"
    assert provider.models.generate_content.call_count == 2
    provider.close.assert_called_once()


def test_alternate_can_repair_evidence_once_within_shared_deadline(provider, monkeypatch):
    error = RuntimeError("private")
    error.code = 503
    provider.models.generate_content.side_effect = [error, Mock(text="invalid draft"), Mock(text="valid draft")]
    monkeypatch.setattr(DialogueSynthesizer, "_resolve_measurements", Mock(side_effect=[ProviderUnavailable("EVIDENCE_VALIDATION_FAILED"), "verified answer"]))
    evidence = EvidenceBundle(date="2026-09-18", marine_snapshot={"weather":{},"ocean":{},"boundary":{}})
    with provider_request("repair-123"):
        answer = DialogueSynthesizer.synthesize_response("waves", "waves", "weather", evidence, "Reference location")
    assert answer == "verified answer" and answer.fallback_used
    assert provider.models.generate_content.call_count == 3
    for call in provider.models.generate_content.call_args_list:
        options = call.kwargs["config"]["http_options"]
        assert 0 < options["timeout"] <= 20000
        assert options["retry_options"] == {"attempts": 1}


def test_expired_deadline_prevents_request(provider, monkeypatch):
    clock = iter([0, 0, 41])
    monkeypatch.setattr("app.services.dialogue_synthesizer.time.monotonic", lambda: next(clock))
    with pytest.raises(ProviderUnavailable, match="RETRY_BUDGET_EXHAUSTED"):
        ask()
    provider.models.generate_content.assert_not_called()


@pytest.mark.parametrize("status,reason", [(400,"MALFORMED_REQUEST"),(401,"AUTH_FAILED"),(403,"AUTH_FAILED")])
def test_nontransient_failure_does_not_retry(provider, status, reason):
    error = RuntimeError("private")
    error.code = status
    provider.models.generate_content.side_effect = error
    with pytest.raises(ProviderUnavailable) as raised:
        ask()
    assert raised.value.reason == reason
    assert provider.models.generate_content.call_count == 1


def test_empty_answer_is_not_cooling_down(provider):
    provider.models.generate_content.return_value = Mock(text="")
    with pytest.raises(ProviderUnavailable, match="EMPTY_RESPONSE"):
        ask()


def test_correlation_rejects_log_injection_and_resets_context():
    with provider_request("unsafe\nsecret") as outer:
        assert "unsafe" not in outer and len(outer) == 32
        with provider_request("inner"):
            assert request_id_context.get() == "inner"
        assert request_id_context.get() == outer
    assert request_id_context.get() is None


@pytest.mark.parametrize("error,reason", [(httpx.ReadTimeout("private"),"TIMEOUT"), (httpx.ConnectError("private"),"NETWORK_ERROR")])
def test_transport_categories(error, reason):
    assert failure_reason(error) == reason


def test_malformed_quota_details_do_not_mask_failure():
    error = RuntimeError("private")
    error.code = 429
    error.response_json = {"error":{"details":[None, "bad", {"violations":[None, {}]}]}}
    assert failure_reason(error) == "RATE_LIMIT_OR_QUOTA"


@pytest.mark.parametrize("reason,expected", [("TIMEOUT",504),("UPSTREAM_TIMEOUT",504),("EVIDENCE_VALIDATION_FAILED",502),("AUTH_FAILED",503)])
def test_api_error_mapping(reason, expected):
    import asyncio
    from app.main import unavailable_provider_handler
    response = asyncio.run(unavailable_provider_handler(None, ProviderUnavailable(reason)))
    assert response.status_code == expected
