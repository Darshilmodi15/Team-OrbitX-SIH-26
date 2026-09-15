"""Bhashini adapter tests, with a separately opted-in live probe."""
from unittest.mock import patch
import httpx
import pytest
from app.services.bhashini import BhashiniService


def test_config_and_compute_use_returned_service_and_auth(monkeypatch):
    monkeypatch.setenv('BHASHINI_USER_ID', 'test-user')
    monkeypatch.setenv('BHASHINI_API_KEY', 'test-config-key')
    service = BhashiniService()
    responses = [
        {'pipelineInferenceAPIEndPoint': {'callbackUrl':'https://dhruva-api.bhashini.gov.in/services/inference/pipeline', 'inferenceApiKey':{'name':'Authorization','value':'test-compute-key'}}, 'pipelineResponseConfig':[{'config':[{'serviceId':'test-selected-service'}]}]},
        {'pipelineResponse':[{'output':[{'target':'नमस्ते'}]}]},
    ]
    def respond(url, **kwargs):
        return httpx.Response(200, json=responses.pop(0), request=httpx.Request('POST',url))
    with patch('httpx.Client.post', side_effect=respond) as post:
        assert service.translate_bhashini('Hello', 'en', 'hi') == 'नमस्ते'
    assert post.call_count == 2
    request = post.call_args.kwargs
    assert request['headers']['Authorization'] == 'test-compute-key'
    assert request['json']['pipelineTasks'][0]['config']['serviceId'] == 'test-selected-service'
    assert request['json']['inputData']['input'] == [{'source':'Hello'}]


@pytest.mark.parametrize('status', [401,403,429,500,503])
def test_bhashini_failure_is_not_faked(monkeypatch, status):
    monkeypatch.setenv('BHASHINI_INFERENCE_API_KEY', 'test-key')
    service = BhashiniService()
    with patch('httpx.Client.post', return_value=httpx.Response(status)):
        assert service.translate_bhashini('Hello', 'en', 'hi') is None


@pytest.mark.external
def test_live_bhashini_translation():
    service = BhashiniService()
    assert service.is_configured, 'Bhashini credentials required for opted-in external test'
    result = service.translate_bhashini('Hello', 'en', 'hi')
    assert result and result != 'Hello', 'Live Bhashini translation unavailable'
