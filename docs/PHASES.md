# ORCA improvement phases

Started 13 September 2026. Baseline commit: `13e4ded`. Your deployment is https://team-orbit-x-sih-26.vercel.app; https://orca-seven-alpha.vercel.app belongs to Team DeTABIS.

## Phase 1 — Understandable maps and truthful availability

Status: Phase 1 complete locally and verified. Local changes only, not committed, pushed or deployed.

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

Status: Phase 2 complete locally and verified. Local changes only, not committed, pushed or deployed.

Purpose: live feeds and AI interactions deliver truthful data, preserve failure reasons, reject fabricated metrics, and provide explicit sector-level coverage.

- [x] Verify the deployed browser → backend → provider flow for chat and marine conditions, including real provider failure handling. Preserve explicit failure reasons without fallback fabrication. Fixed Python 3.14 namespace resolution in `tests/test_product_reliability.py`.
- [x] Establish approved machine-readable INCOIS feed architecture (`IncoisPFZService`) with 11 coastal sectors, landing centres, bounding coordinates, coordinate-to-sector detection, timezone-aware issued/valid dates, and source attribution.
- [x] Reject missing timestamps, future issue dates, demo points, and mark expired advisories past `valid_until` with `data_mode="stale"`.
- [x] Integrate sector selector and coverage gap warnings (`coverage_status: "active" | "coverage_gap" | "unconfigured"`) into frontend `PFZAdvisory` with 11-language localization.
- [x] Remove synthetic fallback readings from `marine.ts` (eliminated 12h sine wave forecast generator and hardcoded 2.7m/0.8m tide defaults).
- [x] Formalize ISRO MOSDAC satellite service (`MosdacSatelliteService`) for Oceansat-3 OCM-3 (chlorophyll-a) and INSAT-3DR (SST thermal fronts) with strict credential checks and truthful status reporting.
- [x] Expose public sanitized `/api/health/providers` endpoint and update admin health monitoring for INCOIS PFZ, ISRO MOSDAC, Gemini, and Sarvam.
- [x] Finish comprehensive backend and frontend test suites and production build checks.

### Verification record (Phase 2)

- Backend: **378 passed, 5 skipped (0 failed)** across 383 items in `pytest backend/tests`, including `test_phase2_live_data.py` and `test_product_reliability.py`.
- Frontend: **76 passed across 13 test files** (`vitest run`), including `phase2-reliability.test.tsx`, `pfz-integrity.test.ts`, and `pfz-view.test.tsx`.
- Production build passed (`tsc -b && vite build`).
- `git diff --check` passed cleanly without whitespace issues or unreferenced assets.

Gate: current, expired, unavailable, upstream timeout and quota-failure scenarios verified without fabricated readings or answers.

## Phase 3 — Before-departure offline trip pack

1. Save an explicitly selected coastal trip pack: advisory text, authority/source, dates, public emergency guidance and permitted map assets.
2. Show exactly what was saved and when it expires. Preserve user ownership and allow pack deletion.
3. Serve the application shell offline; expire time-sensitive information while disconnected. Queue only appropriate actions and distinguish queued from delivered SOS.
4. Test airplane mode, browser restart, 48-hour expiry, interrupted download, denied storage and reconnect. Do not bulk-download basemap tiles without provider permission.

Gate: a pack prepared on shore remains readable after restart at sea; no screen claims new updates or message delivery without connectivity.

## Phase 4 — Task-focused onboarding and UI polish

Build a short, dismissible and replayable tour around choosing location, checking advisory age, reading the map, saving a trip pack and asking the assistant. Use plain translated instructions, large mobile controls and reduced motion. Keep optional visual detail out of the critical loading path. Validate with fishers or realistic field tasks.

Gate: first-time users can complete those tasks on mobile with slow connectivity; keyboard and translated layouts remain usable.

## Phase 5 — Demonstration and release recovery

For each releasable phase, record the frontend deployment URL, backend deployment/version, git commit, compatible API contract and verification results. Keep the last verified phase available separately until the next passes. Use additive database changes and verify backward compatibility; frontend rollback alone cannot reverse backend/schema changes.

Do not overwrite the only working demonstration during development. Before promotion, verify sign-in, location selection, PFZ availability, real chat, provider-failure behavior and the offline pack if shipped. Perform a rollback drill using a verified compatible frontend/backend pair, then document the actual commands and deployment IDs. Tags and deployment promotion are release actions, not completed by this plan.

## Reference findings

- [INCOIS PFZ advisory explanation](https://incois.gov.in/MarineFisheries/PfzAdvisory): sector-specific maps and text, local languages, landing centres and satellite-derived indicators are useful product references. The supplied screenshot dates are examples, not evidence available to ORCA's API.
- [Competitor map source](https://github.com/dhrubojyotihazra/ORCA/blob/main/landing/src/components/app/MarineMap.tsx): inspected on 13 September; `SECTOR_DATA` defines fixed PFZ extents, SST/chlorophyll points and wind values. Layer toggles and recenter controls are useful interaction ideas; this component does not establish live feeds.
- [Competitor onboarding source](https://github.com/dhrubojyotihazra/ORCA/blob/main/landing/src/components/app/OnboardingTourModal.tsx): a step-based tutorial covers chat, voice, map and a demonstration query. Adapt the task-oriented introduction; verify capabilities before describing them as live.w- “Orbitx AI” in the brief has no exact URL and could refer to multiple products. External design research remains unverified until the intended product is identified; it is not blocking Phase 1.
