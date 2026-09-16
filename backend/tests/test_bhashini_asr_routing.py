import io
import wave
from unittest.mock import patch
from app.services.language.bhashini_provider import BhashiniLanguageProvider


def test_direct_asr_uses_language_specific_routes():
    provider = BhashiniLanguageProvider(inference_api_key='test-only')
    provider.user_id = provider.api_key = ''
    assert 'whisper-medium-en' in provider._get_pipeline_config('asr','en')['service_id']
    assert 'conformer-hi' in provider._get_pipeline_config('asr','hi')['service_id']
    assert 'indo_aryan' in provider._get_pipeline_config('asr','gu')['service_id']
    assert 'dravidian' in provider._get_pipeline_config('asr','ta')['service_id']


def test_mp4_is_not_sent_to_provider_as_wav():
    provider = BhashiniLanguageProvider(inference_api_key='test-only')
    provider.user_id = provider.api_key = ''
    with patch('httpx.Client.post') as post:
        result = provider.speech_to_text(b'not a wav file',content_type='audio/mp4')
    assert result['upstream_status'] == 415
    post.assert_not_called()


def test_wrong_wav_sample_rate_is_rejected_without_upstream_call():
    provider = BhashiniLanguageProvider(inference_api_key='test-only')
    provider.user_id = provider.api_key = ''
    buffer = io.BytesIO()
    with wave.open(buffer,'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(48000); audio.writeframes(b'\0' * 200)
    with patch('httpx.Client.post') as post:
        result = provider.speech_to_text(buffer.getvalue())
    assert result['upstream_status'] == 415
    post.assert_not_called()
