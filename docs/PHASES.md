# ORCA improvement phases

Started 13 September 2026. Initial baseline: `13e4ded`; reviewed user work: `64d303d` on main. Your deployment is https://team-orbit-x-sih-26.vercel.app; https://orca-seven-alpha.vercel.app belongs to Team DeTABIS.

## Phase 1 — Understandable maps and truthful availability

Status: Phase 1 foundation is in commit `64d303d` on main/origin. The follow-up PFZ review has local uncommitted repairs; deployment of those repairs is not verified.

Purpose: a fisher can distinguish current PFZ evidence from missing information, read the advisory without map imagery, and understand what PFZ means.

- [x] Display PFZ source, issue date and expiry date separately. Unknown dates stay blank; retrieval time does not become forecast time.
- [x] Reject missing timestamps, future issue dates, expired advisories, demonstration data and invalid coordinates before plotting.
- [x] Plot all valid advisory points rather than one nearest point. Remove invented PFZ radii. Provide an explicit fit-to-advisory control.
- [x] Offer Text only, Map and Satellite modes; remember text preference across visits. Text mode skips loading the Leaflet component and tiles.
- [x] Use one basemap tile layer at a time. Satellite imagery is opt-in. Explain tile failures without substituting imaginary data.
- [x] Add an expandable PFZ explanation and official INCOIS reference. New controls and availability labels support all 11 existing UI languages.
- [x] Keep the unconfigured PFZ endpoint functional without old JSON files. Return unavailable with null issue/expiry dates.
- [x] Remove dashboard fixed-value measurement substitutions and the “Safe” verdict on API failure; eliminate its conditional hook.
- [x] Finish browser, regression and build checks; results below.

**Current limitation:** no timestamped live PFZ provider is connected. The correct result is “No current PFZ advisory available.” The client contract is ready for a provider; this does not mean the integration exists. PFZ locations are advisory points, not route guidance or authoritative zone geometry. No sector coverage is claimed.

**Offline boundary:** text mode saves map transfer while online; it is not yet an installable offline application or durable trip pack. A browser with zero connectivity cannot receive new weather, PFZ or SOS responses. Satellite phones need an actual compatible data connection/integration to deliver updates; simply owning one does not connect this web app.

### Verification record

- Frontend: **73 tests passed across 12 files**, including PFZ validity, mounted expiry, saved text mode, Hindi UI and dashboard failure/missing-reading regressions.
- Backend: **1 focused availability test passed**, using the real router in an isolated FastAPI app with no historical files.
- Production build passed. Main entry remains ~542 kB before gzip; Vite reports its existing large-chunk warning. This phase does not claim a measured whole-app bandwidth reduction.
- Lint exited 0 with existing warnings; `git diff --check` passed. New map/PFZ files produced no lint findings.
- Browser component review against the real local PFZ router: unavailable response displayed with unknown dates, basic map and satellite imagery rendered, text mode removed the map and survived reload, explanation expanded, English/Hindi controls worked, mobile text layout inspected at 390 px. An existing Gujarati preference also rendered correctly. All 11 translations are provided, but only these three languages were inspected in-browser.
- Verification used a temporary, explicitly labelled component harness with public Mumbai reference coordinates. It did not bypass production authentication or inject live-looking sample data. The harness was removed after review. Authenticated production flows, a live PFZ feed, all-point rendering against a real provider, and full backend regression are not claimed as verified by this phase.

## Phase 2 — Live data and reliable assistant

Status: PARTIAL — architecture and tests exist in `64d303d`, but operational PFZ publication validity and satellite ingestion remain unresolved. Earlier completion claims below are superseded by the review ledger.

Purpose: live feeds and AI interactions deliver truthful data, preserve failure reasons, reject fabricated metrics, and provide explicit sector-level coverage.

- [ ] Re-verify the deployed browser → backend → provider flow for chat and marine conditions, including real provider failure handling. Preserve explicit failure reasons without fallback fabrication. Fixed Python 3.14 namespace resolution in `tests/test_product_reliability.py`.
- [x] Implement a normalized PFZ adapter with 14 named sectors and explicitly approximate coordinate hints. Official feed approval and publication linkage remain unverified.
- [x] Reject missing timestamps, future issue dates, demo points, and mark expired advisories past `valid_until` with `data_mode="stale"`.
- [x] Integrate sector selector and coverage gap warnings (`coverage_status: "active" | "coverage_gap" | "unconfigured"`) into frontend `PFZAdvisory` with translated availability controls; sector names still need localization review.
- [x] Remove synthetic fallback readings from `marine.ts` (eliminated 12h sine wave forecast generator and hardcoded 2.7m/0.8m tide defaults).
- [ ] Implement MOSDAC documented dataset ingestion. The old point endpoint was unsupported; current status explicitly reports NOT_IMPLEMENTED.
- [x] Expose public sanitized `/api/health/providers` endpoint and update admin health monitoring for INCOIS PFZ, ISRO MOSDAC, Gemini, and Sarvam.
- [x] Finish comprehensive backend and frontend test suites and production build checks.

### Prior commit verification record (historical, not current release evidence)

- Backend: **378 passed, 5 skipped (0 failed)** across 383 items in `pytest backend/tests`, including `test_phase2_live_data.py` and `test_product_reliability.py`.
- Frontend: **76 passed across 13 test files** (`vitest run`), including `phase2-reliability.test.tsx`, `pfz-integrity.test.ts`, and `pfz-view.test.tsx`.
- Production build passed (`tsc -b && vite build`).
- `git diff --check` passed cleanly without whitespace issues or unreferenced assets.

Gate remaining: real publication validity and geometry match, deployed authenticated flows, provider quota/failure scenarios and per-field live measurements. Mock tests do not close this gate.

## Phase 2A — Expanded live marine fields

Status: implemented locally and verified for the Open-Meteo path. Full Phase 2 remains partial. See [marine implementation and remaining boundaries](PHASE2_MARINE.md).

- [x] Extend existing Open-Meteo adapter and WeatherEvidence with swell, wind-wave, SST and current fields.
- [x] Display values, units, model provenance, separate source valid times and sampled marine grid.
- [x] Fix unavailable-future leakage, UTC interpretation, lost direct fallback and repeated current values in missing forecast slots.
- [x] Probe six mainland/island/southern-tip references against the actual provider.
- [x] Implement mixed-provider supplementation with separate field provenance and a v3 primary-cache namespace; deployed Redis remains unverified.
- [ ] Complete remaining Phase 2 source, Redis and authenticated release gates.

### Phase 2A verification — 14 September 2026

- Full backend: **427 passed, 5 skipped** in 259.88 seconds. This supersedes the earlier review run with its corrected obsolete recommendation assertion.
- Frontend: **87 passed / 14 files**. Production build passed; existing large-chunk warning remains. Lint exited 0 with existing warnings, including the pre-existing Conditions render-time clock warning.
- Actual provider: all 12 marine fields returned for six public mainland/island/southern-tip references. Sampled-grid coordinate precision was verified after correcting two-decimal rounding. [Probe record](verification/phase2-marine-live.json).
- Rendered browser: actual provider → isolated FastAPI/WeatherEvidence → MarineConditions showed SST, swell, wind waves, current velocity/direction, model provenance and separate source valid times. Temporary harness and servers removed. Production auth, INCOIS-first supplementation and shared Redis were not covered by that harness.
- No commits, pushes, deployments, production migrations or purchases were performed. Darshil subsequently confirmed non-commercial hackathon use; public Open-Meteo needs no API key.

## Follow-up review progress

See [beta findings and human setup](BETA_REVIEW.md) and [six owner briefs](team/README.md). Current focus is closing PFZ truthfulness before broad feature work.

- [x] Shared sector/language query for map and card; expired data hidden correctly.
- [x] Strict source/date/coordinate validation and bounded, copied sector/language cache.
- [x] Remove fabricated PFZ recommendation measurements and unsupported MOSDAC point fetch.
- [x] Confirm public WFS geometry availability; document missing expiry linkage.
- [x] Write six detailed team briefs and concrete operator setup requirements.
- [ ] Connect a verified current PFZ publication; prove its expiry and geometry.
- [ ] Verify the candidate in an authenticated deployed browser.

### Review verification (13–14 September 2026)

- Frontend: **81 passed / 13 files**; production build passed with the existing >500 kB chunk warning. Lint exited 0 with existing warnings.
- Full backend run: **406 passed, 5 skipped, 1 failed** in 246.58 seconds. The failure expected the removed high-priority PFZ steering/CPUE claim. After correcting that obsolete expectation, the affected PFZ/satellite/recommendation suites passed **49 tests**, including the added Redis log-redaction regression. The complete suite was not repeated after that test correction; do not relabel the earlier run as all-green.
- Real local router/browser: Nicobar selection sent the correct sector/language request; satellite imagery rendered; map/text selection stayed consistent; text preference survived reload; absent PFZ source/dates remained unknown. Temporary component harness removed, servers stopped. Geofences and authenticated deployment flows were outside that harness.
- `git diff --check` passed; nine new review/contract/team documents have no missing local Markdown links.
- Changes remain local and uncommitted. No push, deployment, production database migration or provider account purchase was performed.

## Phase 3 — Before-departure offline trip pack

Status: core implementation now exists locally; native-device and deployed acceptance are pending. See [offline implementation and manual gate](PHASE3_OFFLINE.md).

- [x] Explicit dashboard download: password-protected standalone HTML with selected coordinates, available readings, forecast slots and PFZ evidence. No map-tile download.
- [x] Content counts, source/time metadata, independent reading/PFZ expiry, 48-hour outer limit, lock and file-deletion instructions.
- [x] Public offline trip-reader fallback with production service worker. No API/auth/SOS caching or queueing; no fake signed-in state.
- [x] Account-scoped session marine cache and sign-in/sign-out cleanup of older persistent location caches.
- [x] Automated encryption, tamper, expiry, download-failure and worker-exclusion checks; production build.
- [ ] Native phone/browser file opening, airplane-mode restart, installed worker, interrupted/denied OS download, reconnect and deployed acceptance.
- [ ] Offline controls/viewer translation and fisher usability review (currently English).

Gate: a pack prepared on shore remains readable after restart at sea; no screen claims new updates or message delivery without connectivity. Automated tests cover the reader and expiry rules; this native-device gate is still open. Browser tooling blocked local-file navigation under its security policy; no workaround was attempted.

### Latest local verification — 14 September 2026

- Backend final full regression: **438 passed, 5 skipped** in 260.65 seconds.
- Frontend: **105 passed / 17 files**; production build passed; lint exited 0 with existing warnings. New offline builder is loaded on demand. Existing main bundle remains ~542 kB before gzip.
- No commit, push or deployment. Phase 2 live PFZ validity, chlorophyll ingestion, shared Redis and authenticated release checks remain open. Phase 4 and 5 core work was subsequently authorized; see the milestones below.

## Phase 4 — Task-focused onboarding and UI polish

Status: core implemented locally; deployed and field acceptance pending.

- [x] Location-required dashboard/map/assistant/alerts routes wait for restoration and redirect unselected users; settings/services and role-specific overviews remain available.
- [x] Remove the redundant normal-user Dashboard badge, add active-page semantics and a keyboard skip link.
- [x] Remove preset port/demo-weather buttons and approximate automatic coastline snapping from location selection.
- [x] Support GPS, search, map pin and decimal-coordinate entry. Explain home/harbour/sea selection and use the server's coastal assessment on save.
- [x] Avoid late saved-location/profile restoration overwriting a new selection or resurrecting a signed-out session.
- [x] Five-step, dismissible/replayable task guide with all 11 language copies, keyboard focus and no required animation. Native-language review remains pending.
- [ ] Field usability, narrow-phone layout, accessibility, all-language review and candidate deployment checks: M13–M30 and M63–M71 in [manual acceptance](MANUAL_ACCEPTANCE.md).

Local verification: frontend **112 passed / 18 files**; production build passed with the existing ~543 kB entry warning; lint exits 0 with existing warnings. Browser component review verified progression, heading focus, dismissal across reload, replay and English/Hindi/Gujarati rendering. This was an isolated guide, not authenticated production verification; temporary harness removed.

Build a short, dismissible and replayable tour around choosing location, checking advisory age, reading the map, saving a trip pack and asking the assistant. Use plain translated instructions, large mobile controls and reduced motion. Keep optional visual detail out of the critical loading path. Validate with fishers or realistic field tasks.

Gate: first-time users can complete those tasks on mobile with slow connectivity; keyboard and translated layouts remain usable.

## Phase 5 — Demonstration and release recovery

Status: release tooling and runbook implemented locally; actual deployments/rollback drill remain pending.

- [x] Add `tools/release_check.py` to record build hashes, commit/dirty state and pending deployment/manual checks without reading secrets or deploying.
- [x] Validate required evidence, clean source, immutable deployment IDs, database compatibility and previous verified rollback pair; incomplete records fail closed. A real [local draft record](releases/local-review-2026-09-14.json) was generated and correctly rejected as NOT READY (exit 1); its deployment/manual checks remain not_run.
- [x] Four release-tool regression tests pass. CI runs them and retains commit-named frontend build/draft-record artifacts for 30 days.
- [x] Write [release/recovery runbook](PHASE5_RELEASE.md) covering both hosts, database restore, worker lifecycle and compatibility.
- [x] Consolidate **80 numbered manual checks**, owner guidance, expected outcomes and result log in [MANUAL_ACCEPTANCE.md](MANUAL_ACCEPTANCE.md). Missing code/data adapters are distinguished from human setup.
- [ ] Execute GitHub CI, identify/deploy candidate and retained compatible versions, complete restore/rollback drill and promote only after acceptance. No push, deployment or rollback has been performed by this work.

For each releasable phase, record the frontend deployment URL, backend deployment/version, git commit, compatible API contract and verification results. Keep the last verified phase available separately until the next passes. Use additive database changes and verify backward compatibility; frontend rollback alone cannot reverse backend/schema changes.

Do not overwrite the only working demonstration during development. Before promotion, verify sign-in, location selection, PFZ availability, real chat, provider-failure behavior and the offline pack if shipped. Perform a rollback drill using a verified compatible frontend/backend pair, then document the actual commands and deployment IDs. Tags and deployment promotion are release actions, not completed by this plan.

## Reference findings

- [INCOIS PFZ advisory explanation](https://incois.gov.in/MarineFisheries/PfzAdvisory): sector-specific maps and text, local languages, landing centres and satellite-derived indicators are useful product references. The supplied screenshot dates are examples, not evidence available to ORCA's API.
- [Competitor map source](https://github.com/dhrubojyotihazra/ORCA/blob/main/landing/src/components/app/MarineMap.tsx): inspected on 13 September; `SECTOR_DATA` defines fixed PFZ extents, SST/chlorophyll points and wind values. Layer toggles and recenter controls are useful interaction ideas; this component does not establish live feeds.
- [Competitor onboarding source](https://github.com/dhrubojyotihazra/ORCA/blob/main/landing/src/components/app/OnboardingTourModal.tsx): a step-based tutorial covers chat, voice, map and a demonstration query. Adapt the task-oriented introduction; verify capabilities before describing them as live.
- “Orbitx AI” in the brief has no exact URL and could refer to multiple products. External design research remains unverified until the intended product is identified; it is not blocking Phase 1.
