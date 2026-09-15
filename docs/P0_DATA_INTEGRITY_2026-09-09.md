# P0 data-integrity sprint verification — 2026-09-09

Local changes only. No commit, push, deployment, production database migration, or feature work. The readiness report was read and its referenced P0 paths inspected before editing. Existing unrelated language, login, and QA work was preserved.

## 1. Root cause

Successful provider responses were treated as proof that every field existed. Open-Meteo filled gaps with constants/derived guesses while marking the result non-mock. The weather contract required wave and wind numbers, pushing outages toward zero. Risk and recommendation code filled gust/period gaps, assigned arbitrary confidence, and treated the default branch as navigation clearance. Zone avoidance treated absence of detected hazards as complete coverage. Startup notifications claimed current official advisories without a source fetch. Backend and browser disagreed on cached status, persisted old values, and conflated retrieval time with forecast validity. INCOIS TLS verification defaulted off.

## 2. Files changed

The list below includes only this sprint's files, not all pre-existing workspace changes. Edits in existing agent modules are limited to the explicitly requested risk/zone paths and necessary null/freshness guards; PFZ, tide, chlorophyll, and agent architecture were not refactored.

- `backend/app/data/weather/open_meteo.py`
- `backend/app/data/weather/incois.py`
- `backend/app/data/weather/cache.py`
- `backend/app/agents/weather_agent.py`
- `backend/app/agents/risk_agent.py`
- `backend/app/agents/hazard_agent.py`
- `backend/app/agents/ocean_analytics_agent.py`
- `backend/app/models/agent_models.py`
- `backend/app/services/notifications/notification_service.py`
- `backend/app/services/recommendation_engine.py`
- `backend/app/main.py`
- `frontend/src/lib/orca/marine.ts`
- `frontend/src/lib/orca/types.ts`
- `frontend/src/lib/orca/use-marine.ts`
- `frontend/src/components/orca/Conditions.tsx`
- `frontend/src/components/orca/SafetyStatus.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/AssistantPage.tsx`
- `backend/tests/test_p0_data_integrity.py`
- `backend/tests/test_weather_provider.py`
- `backend/tests/test_incois_provider.py`
- `backend/tests/test_risk_engine.py`
- `backend/tests/test_resilient_cache.py`
- `backend/tests/test_hazard_agent.py`
- `backend/tests/test_marine_cache.py`
- `backend/tests/test_notifications.py`
- `backend/tests/test_marine_endpoints.py`
- `backend/tests/test_recommendations_and_reasoning.py`
- `backend/tests/test_ocean_analytics_and_isro_queries.py`
- `backend/tests/test_simulation_agent.py`
- `frontend/src/test/data-integrity.test.ts`
- `docs/P0_DATA_INTEGRITY_2026-09-09.md` (this report)

## 3. Fabricated values removed

- Open-Meteo: fallback 1.10 m wave height, 18 km/h wind, 1.35× gust estimates, 15 km visibility, missing precipitation treated as zero, and air-temperature-derived / constant SST. Explicit mock fallback is no longer invoked.
- Forecast gaps: repeated current measurements and estimated gusts; only provider-indexed future rows are retained, with gaps as null.
- Risk/recommendations: 1.3× gusts, 7/7.5 s wave periods, fixed component scores and authoritative confidence claims, calm zero defaults, clear-sky inference from absent storm evidence, departure/optimal-condition clearance.
- Weather model/adapter and persistence call: absent waves/wind no longer default to zero. Genuine provider zero remains zero. Invalid/negative/nonfinite physical magnitudes become unavailable.
- Frontend: zero wave/wind and 10 km visibility assumptions in safety classification, air temperature substituted for SST, descriptive sea state converted into invented weather codes.
- Startup: all three fabricated INCOIS wave/PFZ/Coast Guard broadcasts. Location weather notifications no longer assume 1.2 m waves / 25 km/h gusts.
- Cache: missing source timestamps no longer become now; old Redis/browser cache namespaces are bypassed.

## 4. New failure contracts

- Measurements are nullable end to end. All-source failure returns `cache_status: unavailable`, null wave/wind values, and `is_mock: false` (no mock readings are supplied).
- Risk exposes `available_evidence`, `missing_evidence`, `evidence_completeness` (`complete`, `partial`, `unavailable`), and `assessment_type: ORCA_HEURISTIC`. The assessed set is wave height, wind speed, wave period, gusts, visibility and provider weather code. Completeness describes this input set; it is not official advisory coverage.
- Missing components are `UNKNOWN`; aggregate risk is `unknown` when incomplete readings do not independently trigger a warning. Known severe evidence can still warn with `partial` completeness. No numeric confidence/score is fabricated. Complete low-threshold evidence is labeled `low`, never navigation clearance.
- Stale/unavailable/mock evidence cannot establish a current safety assessment. Explicit what-if output stays `ORCA_SIMULATION` / `SIMULATED`, with no current-source clearance. Missing real baselines block the direct simulation endpoint with 503; orchestration skips route/simulation calculation without valid wave/wind baselines.
- Zone avoidance always discloses missing full-area advisory coverage. No findings means `INSUFFICIENT_EVIDENCE`, not `ALL_ZONES_CLEAR`; no unverified safe alternatives are returned. Known restrictions remain warnings.
- Canonical data states are `fresh`, `cached`, `stale`, `unavailable` (uppercase in chat metadata). Legacy `live` and `hit` are accepted by browser normalization only as compatibility inputs. Fresh means within the existing 3-hour window; stale retention is bounded at 24 hours. Forecast-valid age is checked as well as retrieval age. Missing/expired source time is unavailable. Browser cached placeholders are explicitly cached/stale, not live.
- INCOIS requests verify TLS certificates by default; certificate failures enter normal fallback/unavailable handling.

## 5. Tests added

33 new backend parametrized regression cases in `test_p0_data_integrity.py`: missing wave, period, directions, wind, gusts, visibility, weather code, air temperature, cloud and precipitation; invalid values; valid zero; no air-to-SST substitution; partial and total HTTP failure; forecast gaps; fresh/cached/stale/expired cache; absent source time; TLS client configuration; empty startup notices; unknown risk and zone coverage; recommendation evidence; API null serialization; unsupported weather code; unknown forecast trend; hazard cache-state propagation.

13 frontend cases cover nullable normalization, cache-state compatibility, no unknown-to-calm safety verdict, and real zero versus missing weather code. Existing cache/provider/risk/notification/recommendation/simulation tests were updated to the truthful contracts and source timestamps.

## 6. Test results

- Focused backend checks: **81 passed, 13 deselected**. Deselected tests were broader scenario/endpoint tests; they are included in the full-suite run.
- New P0 backend regression file: **33 passed**. Hazard fixture checks: **3 passed**.
- Frontend full suite: **47 passed** across 9 files.
- Frontend production TypeScript/Vite build: passed (existing bundle-size warning).
- `git diff --check`: passed.
- Full backend suite: **260 passed, 66 failed, 4 skipped** (199.09 seconds; not green). External AI/voice credentials were deliberately blank; failures requiring provider success, legacy seed data, or unrelated contracts are not being masked with fake responses.
- Pytest reports an existing unknown `asyncio_mode` configuration warning. Provider secrets were blanked during backend runs and tests used the isolated in-memory database.


Remaining full-suite failures by file (all 66):

| Test file | Failures |
| --- | ---: |
| `tests/test_assistant_pipeline_comprehensive.py` | 12 |
| `tests/test_bhashini.py` | 2 |
| `tests/test_chat.py` | 5 |
| `tests/test_chat_quality.py` | 1 |
| `tests/test_demo_scenario.py` | 2 |
| `tests/test_government.py` | 7 |
| `tests/test_incois_query.py` | 5 |
| `tests/test_marine_boundaries.py` | 1 |
| `tests/test_multilingual_assistant_upgrade.py` | 9 |
| `tests/test_ocean_analytics_and_isro_queries.py` | 8 |
| `tests/test_pfz_api.py` | 1 |
| `tests/test_query.py` | 5 |
| `tests/test_recommendations_and_reasoning.py` | 3 |
| `tests/test_sarvam_language.py` | 3 |
| `tests/test_sarvam_lid.py` | 2 |

Observed failure categories include AI/voice/translation unavailable responses versus expected success; obsolete seeded government/PFZ expectations; auth/status expectations; a simulation endpoint expecting 200 without a current provider baseline; and language-detection attribution expectations. These are not a passing release gate. Full local output: `/private/tmp/orca-p0-backend-complete.log`; focused output: `/private/tmp/orca-p0-focused-final.log`; frontend build output: `/private/tmp/orca-p0-build.log`.

## 7. Still capable of presenting synthetic data as live

This is not a certification of the whole product or the deployed version. Remaining paths outside this bounded fix include:

- Hazard/advisory text still infers cyclone/lightning observations and official INCOIS/IMD attribution from broad forecast descriptions; swell heuristics name an official warning system. Recommendation sections outside marine risk can repeat those authority claims. Their measurements are no longer filled with calm zeros, but their narrative provenance needs a separate correction.
- Forecast-history persistence still uses insertion time as observation time and legacy rows have not been audited/migrated. The new cache namespaces do not cleanse historical database rows.
- Requested-date selection and dataset ordering remain unresolved. A tomorrow request can still retrieve current model data; source time must be read literally. The browser horizon adapter still accepts relative/indexed timestamps from legacy contracts.
- Route and geofence/reference geometry can still imply more navigational/legal certainty than verified coverage supports. This sprint prevents missing-weather execution and zone all-clear; it does not certify routing or polygon accuracy.
- Dormant `DialogueSynthesizer._synthesize_deterministic`, frontend `lib/orca/assistant.ts`, legacy `MarineMetrics`/`EvidencePanel`, mock weather provider, and analytics UI/helpers still contain synthetic constants or confidence labels. Current primary AssistantPage does not call the legacy chat/template paths; do not reactivate them as live data.
- PFZ/tide/chlorophyll remain outside scope. Their disabled primary integrations and dormant synthetic helpers were not changed.
- Active `/thank-you` still has unsupported receipt/random transaction claims; outside this marine-data fix.
- LLM prose can still produce unsupported statements; prompt grounding is not independent source verification. No paid-provider end-to-end or newly deployed verification was performed in this sprint.

The existing production deployment remains unchanged until these local changes are separately reviewed and released.
