# ORCA — manual setup and acceptance checklist

**Start here when available.** Work through the numbered items one at a time. Nothing below is marked passed from an automated test. Use `PASS`, `FAIL`, `BLOCKED` or `NOT RUN`; record the device/browser, frontend deployment ID, backend deployment ID/commit, time, and evidence for each result. Never include passwords, API keys, tokens, personal coordinates or private conversations in shared screenshots.

Suggested owners: Darshil coordinates; Kavan providers; Het location; Harpal maps; Prachi offline/cache; Rajvi acceptance/release. The owner names describe work allocation, not messages sent to teammates.

If something fails, stop that dependent flow, record its ID and continue an independent section. Example report: `M24 FAIL — Android Chrome — selected Nicobar but card showed Mumbai — screenshot/reference — candidate IDs`. A working localhost screen does not establish that the deployment contains the same code.

## Known code/data gaps — not solved by supplying a key

- **C1: PFZ publication ingestion.** Public geometry was found, but official issue/expiry linkage and a source-specific geometry adapter are still missing. Until implemented, verify truthful unavailable states; do not mark live PFZ integration passed.
- **C2: Chlorophyll/MOSDAC.** Real dated, quality-filtered ingestion is not implemented. Pavan must select and implement a documented product adapter before credentials or an account can close this gap.
- **C3: Offline translation.** The guide has 11-language copy; the offline viewer and download controls are still English. Translation implementation and native review remain before claiming an entirely multilingual offline product. Coordinate input labels are currently English technical terms.
- **C4: GIS/navigation certainty.** Approximate sector/coastal selection bounds do not prove authoritative international boundaries, navigable water, routing safety or complete coast/island coverage. Validate the actual datasets before promising those capabilities.

## A. Accounts, hosting and candidate identification

- [ ] **M01 — Candidate identity (Darshil/Rajvi):** record the exact frontend URL/deployment ID, backend URL/deployment ID, both Git SHAs and test date. Expected: the candidate contains the intended reviewed commit; local uncommitted changes are not called deployed.
- [ ] **M02 — Previous working version (Darshil):** find and smoke-test the retained frontend/backend pair. Expected: immutable IDs and database compatibility are recorded, not guessed from the public domain.
- [ ] **M03 — Open-Meteo usage (Pavan):** keep the confirmed non-commercial hackathon configuration, attribution and request monitoring. Expected: no API key needed on the public endpoint; rate limits and outages are handled. Reassess hosted-service licensing before commercial use.
- [ ] **M04 — PFZ access (Pavan/Darshil):** after C1 investigation, obtain official operational-feed access/schema/validity documentation if required. Expected: documented real source and publication semantics; no invented PFZ URL/key or expiry.
- [ ] **M05 — Satellite product access (Pavan):** select Copernicus/MOSDAC product, account process, dataset IDs, dates and quality flags. Expected: a real adapter and approved access; a `MOSDAC_API_KEY` alone is not treated as implementation.
- [ ] **M06 — Redis connectivity (Prachi):** test from the deployed backend's actual network. Expected: private address works there, or an approved external TLS endpoint is configured for local access. Do not publish its URL/password.
- [ ] **M07 — Redis sharing (Prachi):** query the same public location through two backend workers and inspect sanitized cache metrics. Expected: shared cache hit, correct source age and `orca:marine:v3:` namespace; an in-memory hit is not reported as Redis.
- [ ] **M08 — PostgreSQL schema (Darshil/Rajvi):** record deployed Alembic revision and chat table compatibility. Expected: authenticated conversation creation/read/write succeeds on the actual schema. Do not infer this from `DATABASE_URL` being present.
- [ ] **M09 — Backup restore (Rajvi):** restore an approved backup into isolated staging and record duration/revision. Expected: useful data and compatible application work; no destructive production restore as a test.
- [ ] **M10 — AI/voice account health (Darshil):** make actual authorized candidate requests and inspect provider response codes. Expected: sufficient quota or honest unavailable state. Add credits only if a current provider response requires them.
- [ ] **M11 — Hosting origins and secrets (Darshil):** verify frontend API base URL, backend CORS, environment-specific secrets, HTTPS and preview restrictions. Expected: no secret in browser bundle or shared logs; frontend talks to the intended backend.
- [ ] **M12 — Optional Google Maps (Harpal):** only if migration is chosen, enable the chosen API, billing/quota and referrer/API restrictions. Expected: translated labels verified; Google Maps is not assumed to supply PFZ, chlorophyll or international boundaries. This is not required for the current Leaflet build.

## B. Authentication and location selection

- [ ] **M13 — First sign-in (Rajvi):** sign in as a normal user with no saved location. Expected: location selection appears before dashboard/map/assistant/location-based alerts; guide is visible and dismissible.
- [ ] **M14 — Direct-link bypass (Heth):** before selecting a location, paste `/assistant`, `/map`, `/alerts` and `/dashboard`, use navbar/back/forward, and reload. Expected: location-dependent content does not load; selection is required. Settings and emergency service information remain reachable.
- [ ] **M15 — Saved location reload (Heth):** reload a valid session with a saved coastal location on slow internet. Expected: restoration waits; it does not briefly treat an arbitrary map center as selected or overwrite a newly confirmed location with an old response.
- [ ] **M16 — GPS allow (Heth):** grant location permission on a phone. Expected: measured coordinates and accuracy are submitted for server validation; displayed point agrees with the phone reading within its reported accuracy.
- [ ] **M17 — GPS denial/timeout (Heth):** deny permission or test indoors. Expected: a clear error and usable manual search/pin/coordinates path; no automatic Mumbai selection.
- [ ] **M18 — Preset removal (Heth):** inspect location selection. Expected: no jury/example port buttons, fixed wave/wind numbers or selected default city. The initial map center is only a viewport.
- [ ] **M19 — Manual search (Heth):** search a real coastal place, review results, select one and confirm. Expected: the selected pin/coordinates are shown, validated and saved before navigation; geocoder failure does not invent a result.
- [ ] **M20 — Coordinate entry (Heth):** enter valid decimal latitude/longitude; then try blank, invalid and out-of-range values. Expected: valid input moves the selection; invalid input cannot become a saved trip point. Verify typing with the phone's decimal keyboard.
- [ ] **M21 — Home/inland pin (Heth):** choose an inland home and a home near the coast. Expected: inland server rejection cannot become a selected location; coastal support is not presented as proof the house is water or a fishing zone. Follow the harbour/sea-pin guidance.
- [ ] **M22 — Mainland reference (Heth/Pavan):** select Mumbai or another real coastal departure point and inspect returned grid/time. Expected: location-specific results or explicit coverage gaps; no silent replacement with a different city.
- [ ] **M23 — Lakshadweep (Heth/Pavan):** select a suitable coastal/sea point near the islands. Expected: server validation, map centering and provider query use those coordinates. Record unsupported products separately.
- [ ] **M24 — Andaman (Heth/Pavan):** repeat location, map and provider checks near Andaman. Expected: no forced mainland fallback; PFZ sector/coverage is explicit.
- [ ] **M25 — Nicobar (Heth/Pavan):** repeat independently near Nicobar. Expected: Nicobar is not silently conflated with Andaman; correct selected coordinates and coverage labels.
- [ ] **M26 — Rameswaram (Heth/Harpal):** test a real departure/sea pin and nearby land. Expected: selection/validation is consistent; map bounds are not claimed as safe border clearance.
- [ ] **M27 — Kanyakumari (Heth/Pavan):** test the southern tip and nearby sea. Expected: no arbitrary bounding-box exclusion or northward substitution; source/grid offsets remain visible.
- [ ] **M28 — Save failure and race (Heth):** lose connectivity during confirmation; retry, and attempt changing selection while saving/GPS is pending. Expected: no false persistence and no unnoticed old/new-coordinate swap.
- [ ] **M29 — Account switch (Rajvi):** select a location, sign out and sign in as another test user. Expected: no previous user's location/chat/private data; marine session caches clear. Recheck a response finishing during sign-out.
- [ ] **M30 — Role isolation (Rajvi):** verify user, government and admin routes with authorized test accounts. Expected: server-enforced access remains correct; normal-user location gating does not block the officer/admin overview incorrectly.

## C. Marine data, PFZ and maps

- [ ] **M31 — Source/time labels (Pavan):** compare candidate marine readings with the provider response at the selected point. Expected: units, forecast-valid time, retrieval time and sampled grid are accurate; missing issue time stays unknown.
- [ ] **M32 — Expanded fields (Pavan):** check waves, wind waves, swell, SST and current speed/direction. Expected: actual values or unavailable, including real zero; air temperature is not substituted for SST and period is not called wave speed.
- [ ] **M33 — Mixed providers (Pavan):** obtain a real INCOIS primary response with Open-Meteo supplementation. Expected: primary values stay unchanged; added fields have their own source/time/grid; fresh supplement does not promote stale primary evidence.
- [ ] **M34 — Provider outage/rate limit (Pavan):** use staging controls to cause timeouts/429/5xx. Expected: sanitized failure, bounded retry/cache behavior and no fabricated live readings or secret-bearing errors.
- [ ] **M35 — Future and missing hours (Pavan):** request a future time and a period outside model coverage. Expected: actual dated forecast slots only; today's readings and invented hourly times do not fill gaps.
- [ ] **M36 — PFZ unavailable (Darshil):** with current unconfigured feed, inspect card/map/assistant. Expected: unavailable with no fabricated dates/targets. This can pass while **live PFZ integration remains blocked by C1**.
- [ ] **M37 — Real PFZ publication (Darshil):** after C1, compare one actual bulletin with issue date, expiry, sector, language and geometry. Expected: genuine publication linkage; WFS retrieval time is not issuance and line vertices are not invented fishing targets.
- [ ] **M38 — PFZ expiry while open (Darshil):** use an explicitly labelled short-lived test advisory in staging. Expected: points disappear at expiry without reload; an expired advisory is distinguishable from unavailable service. Never change a real bulletin's dates for a demo.
- [ ] **M39 — PFZ selector consistency (Darshil):** change sector and language, then alternate map/text views. Expected: card and map use the same query; north/south TN/AP and island groups remain distinct; overlap asks for selection.
- [ ] **M40 — Map/satellite/text (Harpal):** switch all three modes, reload and fail tile requests. Expected: text mode needs no tiles; satellite failure is explained; imagery is not called live PFZ evidence.
- [ ] **M41 — Boundary source (Harpal):** inspect boundary provenance/version and compare to an authoritative applicable dataset. Expected: no approximate box/EEZ automatically called an international maritime boundary or a safe route. Record C4 gaps.
- [ ] **M42 — Chlorophyll/satellite (Pavan):** after C2, compare dated sample and quality/cloud mask with the source product. Expected: cloud/no-data/old observations remain missing or stale; no “live” value from a basemap or unsupported endpoint.
- [ ] **M43 — Tides (Pavan):** verify each displayed tide source, station, datum, times and supported Indian location. Expected: no assumed all-India NOAA coverage or unverified station/datum; unavailable stays unavailable.
- [ ] **M44 — Recommendations (Rajvi):** inspect assistant/cards with missing PFZ/depth/species/tide/boundary data. Expected: no invented catch probability, CPUE, depth or safe-route assurance; trace every factual measurement to evidence.

## D. Assistant, voice and SOS

- [ ] **M45 — Real chat (Rajvi):** sign in, choose location, ask about today's conditions, then a future time. Expected: actual answer/evidence for that user/location/time and persisted conversation; no hidden fallback on backend failure.
- [ ] **M46 — Conversation isolation (Rajvi):** use two test accounts and separate conversations. Expected: each can access only its own history; direct ID substitution is denied. Keep test data non-sensitive.
- [ ] **M47 — Chat failure/retry (Rajvi):** cause a staged provider error, network loss and duplicate send. Expected: one clear failed/pending state, no fabricated assistant success, no duplicate stored answer, usable retry.
- [ ] **M48 — Microphone permissions (Rajvi):** allow, deny and revoke microphone access. Expected: recording controls and feedback match actual state; denial does not submit audio or fake transcription.
- [ ] **M49 — Real STT/TTS (Rajvi):** record a short phrase in each intended launch language and play the reply. Expected: actual Sarvam transcription/audio, understandable output and honest quota failure. Device speech recognition alone is not proof of the configured server provider.
- [ ] **M50 — SOS semantics (Rajvi):** use isolated staging with no external emergency dispatch. Test success, failure, offline and repeated clicks. Expected: only the actual accepted stage is reported; “queued” or “saved” never means rescuers contacted. Do not trigger real emergency contacts for a test.

## E. Offline preparation and real devices

- [ ] **M51 — Prepare a pack (Prachi):** after data loads, set a separate 12+ character trip password and download. Expected: exact readings/forecast/PFZ counts, limitations and chosen coordinates are explained; missing PFZ is explicitly missing.
- [ ] **M52 — OS save (Prachi):** confirm the file exists in Downloads/Files; cancel a download and test low storage. Expected: app only claims a download request, not guaranteed storage; no false saved state on failure.
- [ ] **M53 — Local browser opening (Prachi):** open the actual downloaded HTML in the supported phone browser, not just Files preview. Expected: compatible password prompt and content. Browser-tool local-file navigation was blocked, so this is still a real manual check.
- [ ] **M54 — Wrong password/tamper (Prachi):** try a wrong password and a damaged copy of a labelled test file. Expected: no partial decrypted content or network upload; original remains usable.
- [ ] **M55 — Airplane-mode restart (Prachi):** unlock successfully, enable airplane mode, close/reopen the browser and file, then unlock again. Expected: saved content is readable after restart with no session/server connection.
- [ ] **M56 — Offline route fallback (Prachi):** online, install the production worker; then go offline and reopen `/dashboard` and `/map`. Expected: public trip reader, not a fake authenticated dashboard. Select the downloaded pack locally and unlock it.
- [ ] **M57 — Denied/evicted browser storage (Prachi):** deny storage or clear site data, then go offline. Expected: no false app-shell readiness; the independently downloaded HTML still works where local HTML execution is supported.
- [ ] **M58 — Reading/PFZ expiry (Prachi):** use labelled test data expiring soon, leave open and background/resume. Expected: readings disappear after their three-hour display limit; PFZ points follow their own expiry, even before the 48-hour pack limit.
- [ ] **M59 — Full pack expiry/clock (Prachi):** use labelled expired test files and a deliberately incorrect device clock. Expected: time-sensitive data hidden at the limit; device-clock dependence is explained. This is not a promise against deliberate clock manipulation.
- [ ] **M60 — Lock and deletion (Prachi):** lock the viewer, sign out, delete the downloaded file and copies, then empty trash. Expected: lock hides plaintext; sign-out clears app caches but does not pretend to delete files; file ownership/password limitations are clear.
- [ ] **M61 — Reconnect (Prachi):** reconnect and reopen ORCA. Expected: normal authenticated flow and fresh provider request; old pack does not claim automatic updates. Explicitly save a new pack.
- [ ] **M62 — Offline communications (Prachi/Rajvi):** inspect offline reader and SOS behavior without connectivity. Expected: no sent/received/rescue claim and no hidden queue. A satellite phone needs an actual compatible data connection; owning one alone does not connect the app.

## F. Onboarding, language, usability and accessibility

- [ ] **M63 — Five-step tour (Rajvi):** choose location, review age/source, open map/text, prepare pack, ask assistant. Expected: guide accurately describes available actions and never treats completing the guide as passing safety checks.
- [ ] **M64 — Dismiss/replay (Rajvi):** dismiss mid-tour, navigate/reload, replay and finish. Expected: no trapped modal or blocked tasks; guide progress and replay remain usable when browser storage is denied.
- [ ] **M65 — Navigation clarity (Rajvi):** inspect desktop/mobile dashboard. Expected: redundant normal-user “Dashboard” badge removed, active page indicated, settings/services reachable, location-required routes gated.
- [ ] **M66 — Languages (Rajvi/native speakers):** review all 11 guide languages and existing marine/PFZ labels. Expected: meaningful terminology, correct line wrapping and no missing text. Record English-only offline/coordinate labels under C3 rather than calling all UI translated.
- [ ] **M67 — Keyboard/screen reader (Rajvi):** tab through guide, search, coordinates, map controls, confirmation and navigation. Expected: visible focus, labelled controls, announced status/error, working skip link, no keyboard trap. Verify map-independent coordinate entry.
- [ ] **M68 — Phone layout (Rajvi):** test actual narrow Android and iOS devices in portrait/landscape with large text. Expected: readable cards and guide, usable touch targets, no content trapped under bottom navigation or cut-off critical labels.
- [ ] **M69 — Reduced motion/contrast (Rajvi):** enable reduced motion, light/dark/system themes and inspect contrast. Expected: no essential action depends on animation; focus/error/source-age states remain distinguishable.
- [ ] **M70 — Slow connection (Rajvi):** throttle data and introduce packet loss. Expected: useful loading/error states, low-bandwidth text alternative and no stale data promoted to live; measure actual time to usable content rather than assuming optimization.
- [ ] **M71 — Realistic fisher task (Rajvi/team):** ask a representative user to select departure location, recognize unavailable PFZ, find source/expiry, prepare/open a pack and ask a question without coaching. Expected: tasks understood; record confusion and corrections before claiming field readiness.

## G. Release and recovery

- [ ] **M72 — CI evidence (Darshil):** after the reviewed source is committed/pushed, inspect both CI jobs and retained test/build artifacts. Expected: passing checks for the exact commit; artifact hashes match the candidate record. Local passes are not called a GitHub run.
- [ ] **M73 — Release record (Darshil):** generate a new record with `tools/release_check.py record`, add verified deployment/database/evidence fields, then run `validate`. Expected: pending or failed required checks cause nonzero exit. Never change statuses merely to force a pass.
- [ ] **M74 — Candidate smoke (Rajvi):** run auth, location, real chat, marine/PFZ truthfulness, provider failure, offline reader and SOS semantics on the candidate URLs. Expected: same verified behavior as local code, with actual deployment IDs recorded.
- [ ] **M75 — Staging rollback drill (Darshil/Rajvi):** follow [PHASE5_RELEASE.md](PHASE5_RELEASE.md) using compatible retained frontend/backend builds and an isolated restored database. Expected: both application versions work with the recorded schema; test conversation survives.
- [ ] **M76 — Plan/settings constraints (Darshil):** confirm Vercel rollback targets allowed by the actual plan and Render service rollback/auto-deploy settings. Expected: recovery can be performed without a guessed target or unintended immediate redeploy.
- [ ] **M77 — Installed worker during rollback (Prachi):** compare an already-open tab, a fresh tab, an older installed worker and a saved version-1 trip file after the staging rollback. Expected: no broken reader or lost expiry enforcement; downloaded files are not falsely claimed deleted.
- [ ] **M78 — Promotion and observation (Darshil/Rajvi):** only after acceptance, promote the verified pair; record deployment IDs, smoke results and observed errors. Expected: no hidden migration mismatch, auth failure or data-mode regression. Keep the prior compatible pair available.
- [ ] **M79 — Recovery evidence (Darshil):** record actual drill commands/actions, timings, deployment IDs, schema and restore result in the release record. Expected: a repeatable tested runbook, not just command templates. Keep durable copies beyond CI artifact retention.
- [ ] **M80 — Final disposition (team):** review every FAIL/BLOCKED/NOT RUN and C1–C4. Expected: scope and limitations are explicit. Decide the next phase from these findings; do not declare all phases operationally complete because implementation/builds passed.

## Results log

Copy one line per test into the table; append rows as you work.

| ID | PASS / FAIL / BLOCKED / NOT RUN | Device/browser + time | Candidate frontend/backend IDs | Evidence / what happened | Owner / next action |
|---|---|---|---|---|---|
| M01 | NOT RUN | — | — | — | — |

Automated evidence and implementation scope are tracked separately in [PHASES.md](PHASES.md), [PHASE2_MARINE.md](PHASE2_MARINE.md), [PHASE3_OFFLINE.md](PHASE3_OFFLINE.md) and [PHASE5_RELEASE.md](PHASE5_RELEASE.md).

## Companion tooling

| Tool | Purpose | Path |
|---|---|---|
| **Acceptance tracker** | Structured per-item result recording | [acceptance_results.md](acceptance_results.md) |
| **Pre-acceptance script** | Automated code-level checks (22 items) | [../../tools/pre_acceptance.py](../../tools/pre_acceptance.py) |
| **Data source guide** | Manual investigation templates for each provider | [data_source_investigation.md](data_source_investigation.md) |
| **Release check** | Build hash recording and release validation | [../../tools/release_check.py](../../tools/release_check.py) |

Run the pre-acceptance script before starting manual checks:
```bash
python3 tools/pre_acceptance.py
```

## Recommended device/browser matrix

| Device | Browser | Assigned To | Priority |
|---|---|---|---|
| Android phone (narrow) | Chrome | Heth | HIGH — M16-M28 GPS/location |
| Android phone (narrow) | Chrome | Prachi | HIGH — M51-M62 offline/airplane |
| iOS phone | Safari | Rajvi | HIGH — M45-M50 voice, M63-M71 UX |
| Desktop | Chrome | Darshil | MEDIUM — M01, M11, M36, M72-M73 |
| Desktop | Firefox | Harpal | MEDIUM — M40-M41 map modes |

## Quick-start testing order

**Before any manual testing:**
1. Run `python3 tools/pre_acceptance.py` — all 22 checks should pass
2. Record candidate identity (M01) — git SHA, deployment URLs
3. Verify CI passed on GitHub for the exact commit (M72)

**Critical path (do these first):**
1. M13 → M14 → M19 → M20 — sign-in and location basics
2. M22 → M36 — mainland data + PFZ unavailable state
3. M45 → M47 — real chat + failure handling
4. M51 → M53 → M55 — offline pack basics

**Independent sections (can run in parallel):**
- Heth: M16-M28 (location/GPS testing)
- Pavan: M31-M35, M43 (marine data verification)
- Harpal: M40-M41 (map modes and boundaries)
- Prachi: M06-M07 (Redis), M51-M62 (offline)
- Rajvi: M29-M30 (auth), M63-M71 (UX/accessibility)

## Screenshot naming convention

Use this format: `M{ID}_{status}_{device}_{timestamp}.png`

Examples:
- `M22_PASS_android-chrome_2026-09-15T1430.png`
- `M36_PASS_desktop-chrome_2026-09-15T1445.png`
- `M24_FAIL_android-chrome_2026-09-15T1500.png`
