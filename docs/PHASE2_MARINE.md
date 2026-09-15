# Phase 2A — Open-Meteo marine fields

14 September 2026. This is the first live marine-provider milestone within Phase 2; it does not mark all of Phase 2 complete. Earlier PFZ review changes remain in the same local working tree.

## Implemented

The existing Open-Meteo backend adapter now requests 12 marine variables: significant wave height/direction/period; wind-wave height/direction/period; swell height/direction/period; sea-surface temperature; ocean-current speed/direction. Fields pass through WeatherEvidence to the marine conditions response and frontend display. Missing values remain null, zero remains a real reading, and air temperature does not replace SST. Added labels are provided in the existing 11 UI languages, pending native-speaker review.

The interface labels these values as model forecasts, displays marine and atmosphere valid times separately, and shows the provider's sampled sea-grid coordinates. Model issue time remains null because the inspected API does not provide it. Current velocity is km/h; wave period is seconds, not wave propagation speed. Wave direction is where waves come from; current direction is where water flows toward. [Official variable definitions](https://open-meteo.com/en/docs/marine-weather-api).

Fixed current measurements leaking into an unavailable future request. Fixed UTC strings interpreted as browser-local time in the direct fallback, backend failures swallowed before reaching that fallback, and current wave/wind values repeated into missing forecast slots. Partial direct-provider outages preserve the other provider's fields. Added bounded frontend request timeouts. Undated backend responses no longer receive invented forecast/retrieval times; missing valid time is unavailable.

## Integration boundary

The server preserves its INCOIS-first core weather policy and now supplements missing marine fields from Open-Meteo when the primary result is fresh/cached and valid. Existing primary values, source, grid and timestamps are not overwritten. Each supplemental field carries its own source, model-valid time, retrieval time, cache mode and sampled grid; the frontend provides an expandable provenance list. Stale/unavailable/demo primary evidence is never promoted through a fresh supplement. Failed, stale, undated or invalid supplemental readings are discarded.

The supplemental cache is process-local, limited to 128 requests and five minutes, with striped locks to coalesce concurrent same-key requests. It has no stale fallback and does not claim shared Redis operation. Primary marine Redis keys now use `orca:marine:v3:` so old entries with inferred issue dates cannot be reused. Old v2 records are left to expire; no flush is performed. Rollback can still read v2 until it expires, so do not represent those older timestamp semantics as the new contract. Background INCOIS ingestion retains its original provider; request orchestration uses the combined wrapper.

The browser fallback independently retrieves Open-Meteo when the backend is unreachable. A backend HTTP 200 with an explicit unavailable response remains unavailable rather than silently bypassing the backend's decision. No commercial API key is shipped in the browser. A paid provider plan would require server-only customer-endpoint configuration and revisiting the direct fallback policy.

No chlorophyll, satellite observation, PFZ publication, maritime boundary, tide-datum, route clearance or catch-probability inference is introduced by these fields. Model coastal resolution is not exact harbour/vessel measurement. Location validation remains a separate workstream.

## Evidence

- A real provider → WeatherEvidence probe returned all 12 marine fields for six public reference positions: Mumbai, Lakshadweep, Andaman, Nicobar, Rameswaram and Kanyakumari. Raw sanitized records and timestamps are in [live probe results](verification/phase2-marine-live.json). These are sampled references, not an exhaustive coverage guarantee.
- A temporary local browser harness used the real adapter and WeatherEvidence serialization through a local FastAPI endpoint. The rendered MarineConditions component displayed real SST, swell and current values with separate valid times and sampled-grid coordinates. This bypassed unrelated auth/INCOIS/cache orchestration only within the isolated test process; it is not a deployed full-dashboard verification. No values were injected into the production UI.
- Regression tests cover all added fields, individual nulls, invalid directions, real zero, partial provider failures, future-date mismatch, UTC interpretation, backend-unreachable fallback and rendered model provenance. Full backend: 427 passed, 5 skipped. Frontend: 87 passed across 14 files. Build passed; lint exited 0 with existing warnings.

## Human decision and upcoming setup

Darshil confirmed non-commercial hackathon use on 14 September. The public Open-Meteo endpoint needs no API key; no placeholder key or secret was added to `.env`. Its free hosted tier is rate-limited (currently 600/minute, 5,000/hour, 10,000/day); requests with more than ten variables can count as multiple calls. Keep attribution and monitor use. Commercial launch would require revisiting hosted-service licensing and server-only customer credentials under [current pricing and terms](https://open-meteo.com/en/pricing). No purchase or subscription was made.

Remaining Phase 2 work: complete official PFZ geometry/publication expiry linkage; implement a real chlorophyll observation ingestion adapter; verify shared Redis from the deployed backend; verify authenticated chat/voice and provider failures on the release candidate. Ask for account access only after the exact dataset/service is selected. See [human setup checklist](BETA_REVIEW.md) and [team ownership](team/README.md).

## Follow-up verification

Combined-provider regressions cover preservation of primary values, per-field provenance through WeatherEvidence, no stale promotion, bad/stale retrieval rejection, failure handling, copied bounded-cache responses and a separate v3 Redis namespace. These mixed-provider tests use explicit fixtures; a deployed live INCOIS-plus-Open-Meteo result is not yet verified. The earlier real six-location Open-Meteo probe remains evidence for that provider alone. See the current run totals in [PHASES.md](PHASES.md).
