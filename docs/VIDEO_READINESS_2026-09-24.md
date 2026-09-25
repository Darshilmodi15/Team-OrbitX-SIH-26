# ORCA video candidate — evidence and release gates

Status: **VIDEO READY: NO** until the deployed acceptance gates below pass.

## 1. Memory root cause

Suspected, not confirmed from Render logs: repeated EEZ serialization and copies, serialized full snapshots in chat messages, and a sidebar query that loaded every message in up to 50 conversations. The old geometry cache retained serialized full GeoJSON keys. Boundary and weather caches were unbounded. No Render plan upgrade was made.

Fixes: one cached display derivative keyed by immutable source identity; single-flight boundary loading; two-entry boundary cache; 256-entry weather cache with expiry eviction; separate `/api/marine-boundaries/eez/display` reference instead of geometry in every new snapshot; summary-only sidebar; iterator-based owned conversation reads with geometry stripped from legacy message payloads. Optional Earth Engine/species requests remain user-toggle driven and are disabled for demo scenarios.

## 2. Local memory measurements

These are local macOS Python 3.11 measurements, **not Render RSS**, and the two experiments are not interchangeable.

| Geometry-only probe (same process sequence) | Before | After initial geometry-cache optimization |
|---|---:|---:|
| App import, no lifespan | 97.64 MiB | 85.84 MiB |
| Dashboard boundary calculation | 144.23 MiB | 136.66 MiB |
| Ten map serializations | 149.81 MiB | 138.48 MiB |
| Peak RSS | 162.81 MiB | 148.62 MiB |

A later real-provider HTTP run after geometry references: pre-request RSS 104.62 MiB; dashboard snapshot 141.75 MiB; display map request 168.81 MiB; successful chat 164.02 MiB; sampled peak 182.39 MiB. Snapshot response 14,981 bytes, separate display geometry 448,203 bytes, two-conversation sidebar 339 bytes. One chat timed out (504, 40.23 s); another succeeded (200, 15.76 s). No comparable full-request baseline was captured, so this is not an end-to-end percentage reduction claim. Earlier temporary raw memory logs were cleared by the environment restart; figures above were retained from tool output in this task.

## 3. Deterministic safety

The existing risk engine maps low/caution/unsafe to explicit status cards. Low risk requires usable wave height, wind speed and wave period. Observed high/moderate components take precedence; missing optional dimensions remain disclosed; stale data does not become safe. Swell participates in thresholds; current is recorded as evidence but has no new navigation threshold. Vessel-specific thresholds were not invented. Reasons expose configured heuristic outputs and the no-navigation-clearance caveat.

## 4–5. Live and illustrative data

`MarineDataProvider` separates `LiveProvider` and `DemoScenarioProvider`. `DEMO_MODE` defaults false. Enabling the server flag exposes an explicit selection; complete real data still wins. Partial real data is replaced by a whole labelled scenario, never silently patched with illustrative numbers. Scenarios: Mumbai Port & Sassoon Dock, Surat / Hazira, Veraval Port. Dashboard, map, evidence disclosure, chat prompt/answer and trip pack identify simulation. Demo selection resets on a new session/refresh. Do not record a demo without its visible label.

## 6. Dashboard explanations

Static info dialogs cover wave height, wind speed/direction, period/direction, SST, swell and current. Direction conventions, source and validity are included. Missing tide/visibility are removed from the main card grid. Wind-direction dialog was opened and inspected in the local browser.

## 7–9. GIS evidence

Local browser screenshots: `video-evidence/demo-gis.png`, `video-evidence/demo-pfz-popup.png`. Three teal PFZ markers and symbol halos, one explicitly illustrative dashed sector, cyan selected-location marker and amber EEZ were rendered. Popup includes distance/bearing, issue/expiry, simulation source and Ask ORCA. PFZ off removed circles and sector; re-enabling restored them. Text-only mode displayed the same snapshot. Satellite was correctly disabled in degraded connectivity; a connected satellite render remains to be checked. No valid live advisory leaves PFZ disabled with an explicit unavailable label.

## 10–11. Theme

Dashboard theme tokens now use Assistant's neutral surfaces. Local map and Assistant renders share the dark neutral palette. Inline head bootstrap applies stored/system theme and font size before React. Local refresh retained dark appearance. Fresh-incognito production and frame-level hard-refresh FOUC acceptance remain open.

## 12–13. Session and outage states

Designed expired-session, backend, marine and AI states replace raw auth/provider output. Safe dashboard/map/assistant/location/conversation return routes survive sign-in. The app error boundary hides diagnostics in production and offers home navigation without clearing saved data. Session-expiry and backend-outage rendered acceptance remain open. Unsent draft persistence was not added.

## 14–15. Chat history and Gujarati trace

Owner-scoped opaque conversation endpoints preserve complete history while sidebar responses omit messages. Cross-account access is covered by tests. Two real Gemini requests on September 23 returned HTTP 200 in 11.03 and 11.35 seconds, Gujarati answers, five operational events each, and successful history reads. Local browser reopened A and B, confirmed distinct original questions/answers, and refreshed B successfully after a fresh sign-in. Gujarati trace labels/statuses rendered correctly and provider names remained unchanged. Screenshot: `video-evidence/gujarati-trace.png`. A Gujarati follow-up in refreshed B returned a real answer in the same conversation. The expired historical demo snapshot remained labelled stale; the follow-up used a newly resolved real snapshot. Labels are provided for all 11 supported languages; only Gujarati was visually checked.

## 16. Verification

- Backend: **530 passed, 5 skipped** (325.99 s).
- Frontend: **161 passed**, 31 files.
- TypeScript and Vite production build passed. Existing chunk-size warning remains.
- `git diff --check` passed.
- Lint completed with warnings (including existing hook/dependency warnings); this is not a warning-free claim.

## 17. Deployment

Candidate SHA and observed frontend/backend deployments will be recorded after publishing. No deployment identity is inferred from a related commit.

## 18–19. Remaining video gates

Render crash logs, production RSS/peak under the walkthrough, matching deployed SHAs, enabling `DEMO_MODE=true` only for the intended demonstration, production/incognito authenticated walkthrough, connected satellite, offline trip pack, safe local/demo SOS and government monitoring remain unverified. No external rescue communication was triggered. **VIDEO READY: NO.**
