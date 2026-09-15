from datetime import datetime, timezone
from unittest.mock import patch
import pytest
from app.agents.hazard_agent import detect_proactive_hazards
from app.models.agent_models import WeatherEvidence, EvidenceBundle, ZoneAvoidanceEvidence, BoundaryEvidence
from app.services.recommendation_engine import RecommendationReasoningEngine
from app.services.dialogue_synthesizer import DialogueSynthesizer
from app.services.bhashini import BhashiniService
from app.services.provider_health import ProviderUnavailable


def test_no_storm_observations_from_description_or_missing_evidence():
    weather = WeatherEvidence(source='INCOIS_OSF_WW3', forecast='stormy', is_mock=False, cache_status='fresh')
    with patch('app.agents.hazard_agent.evaluate_vessel_geofences', return_value=[]):
        assert detect_proactive_hazards(19, 72, weather) == []
        weather.weather_code = 95
        alerts = detect_proactive_hazards(19, 72, weather)
    assert len(alerts) == 1
    assert alerts[0].source == 'ORCA heuristic'
    assert alerts[0].timestamp is None
    assert 'detected' not in alerts[0].message


def test_missing_zone_alternatives_are_not_invented_in_recommendations():
    bundle = EvidenceBundle(date='2026-09-09', zone_avoidance=ZoneAvoidanceEvidence(summary='Coverage incomplete'))
    rec = RecommendationReasoningEngine.generate_recommendations(bundle)[0]
    assert rec.confidence_score is None
    assert 'No safe alternative is established' in rec.directive
    assert 'harbor channels' not in rec.model_dump_json()


def test_reference_boundary_is_not_legal_clearance():
    boundary = BoundaryEvidence(inside_eez=True, geofence_status='UNKNOWN', source='embedded reference', status_message='Reference only')
    rec = RecommendationReasoningEngine.generate_recommendations(EvidenceBundle(date='2026-09-09', boundary=boundary))[0]
    assert rec.confidence_score is None and rec.reliability_tier == 'REFERENCE_ESTIMATE'
    assert 'does not establish legal' in rec.directive


def test_legacy_fallbacks_cannot_generate_scientific_answers_or_translations():
    with pytest.raises(ProviderUnavailable, match='LEGACY_SYNTHETIC_TEMPLATE_DISABLED'):
        DialogueSynthesizer._synthesize_deterministic('waves', 'weather_conditions', EvidenceBundle(date='2026-09-09'), 'Veraval', 'en', [])
    with pytest.raises(ProviderUnavailable):
        BhashiniService().translate('કાલે દરિયામાં જવું સલામત છે?', 'gu', 'en')


def test_persistence_uses_source_time_not_current_clock():
    from app.data.weather.incois import IncoisWeatherProvider
    from app.data.weather.cache import MarineWeatherCache
    provider = IncoisWeatherProvider(cache=MarineWeatherCache())
    raw = dict(hs=1, u=2, v=3, grid_lat=19, grid_lon=72, forecast_time='2026-09-01T12:00:00Z')
    with patch.object(provider, '_fetch_from_incois_with_neighbor_search', return_value=(raw, 'exact')), patch('app.repositories.MarineObservationRepository.record_observation') as save:
        provider.get_weather(19, 72, '2026-09-09')
    assert save.call_args.kwargs['timestamp'] == datetime(2026, 9, 1, 12, tzinfo=timezone.utc)
    raw['forecast_time'] = None
    with patch.object(provider, '_fetch_from_incois_with_neighbor_search', return_value=(raw, 'exact')), patch('app.repositories.MarineObservationRepository.record_observation') as save:
        provider.get_weather(19, 72, '2026-09-09')
    save.assert_not_called()
