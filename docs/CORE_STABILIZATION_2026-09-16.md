# ORCA core stabilization — candidate verification, 16 September 2026

**Release status: incomplete.** This report describes the local candidate and distinguishes it from the existing production deployments. The candidate has not been committed or deployed in this run. Physical Android and deployed manual acceptance remain mandatory.

## Root causes and limits of the diagnosis

- The earlier frontend marine path independently resolved backend and Open-Meteo responses. Chat also had its own provider orchestration. These paths did not share a normalized response identity, location/time key, or provider snapshot. A successful HTTP response containing all-null fields could also suppress frontend fallback; that earlier defect is recorded in `REPAIR_REPORT_2026-09-15.md`.
- Location restoration and query completion could race navigation and selection. A saved location arriving after a route gate could send the user to location selection; a late response could belong to an older location. The candidate waits for authoritative location restoration and rejects mismatched/aborted responses.
- Authentication storage exceptions could be treated as invalid credentials. Database outages now produce 503, preserving the client session; actual invalid/expired credentials still return 401. Independent persisted device sessions retain ownership and revocation checks.
- Gemini's actual upstream failure was **HTTP 429 RESOURCE_EXHAUSTED** for `gemini-3.6-flash`, quota ID `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, daily quota **20**. This was not an inferred provider outage.
- The stricter evidence validator initially rejected legitimate source identifiers containing digits, legacy current-field aliases, and direct VHF channel numbers. The prompt now uses canonical weather names. Validation recognizes exact verified source labels, exact selected coordinate pairs, and explicitly labeled VHF channels; bare unsupported marine numbers still fail. One bounded, real model regeneration receives the allowed reference tokens and must pass validation before display. No scripted answer replaces a failure.
- **The original desktop-versus-physical-Android incident is not conclusively attributed to a single defect:** original paired raw responses were not supplied or captured. Architectural defects above are confirmed code findings. Local paired HTTP tests now match; physical-device confirmation remains open.

## Canonical architecture

`Authenticated saved location + requested time → marine_snapshot_service → persisted MarineSnapshot → shared React Query provider → Dashboard / Map / Chat`.

- `GET /api/marine/snapshot` resolves the authenticated owner's saved coordinates. Supplied coordinates must match; stale client coordinates cannot override the saved location.
- `GET /api/marine/snapshots/{snapshot_id}` reads immutable owner-scoped evidence. Another account receives 404. Chat also checks current selection, expiry, and requested-time consistency.
- The active SQL uniqueness key includes owner, exact saved location, normalized timezone-aware requested time, and backend SHA. Concurrent resolutions return the winning canonical payload. Expired versions are retired from the active key; historical payloads remain unchanged.
- The object contains weather, ocean, PFZ, tide, boundary, hazards, deterministic risk, missing fields, expiry, backend SHA, and per-field provenance. Optional failures remain local to their sections. Unsupported data stays null/unavailable.
- Dashboard, Map and Chat show snapshot identity and offer JSON download. Chat returns its structured snapshot; the shared provider adopts it so the other views can show the same requested evidence.
- Snapshot requests log only controlled metadata: snapshot ID, owner ID, coordinates, requested time, provider and backend SHA. Credentials and raw upstream errors are not logged.

## Providers and truthful availability

| Integration | Confirmed local real-provider result |
| --- | --- |
| INCOIS OSF WW3 | Wave/wind forecast evidence received in the final run. |
| Open-Meteo Marine | Swell, current and SST supplements received; provenance remains field-specific. |
| Open-Meteo Weather | Received in earlier real-provider runs; availability varies by selected provider response. Final INCOIS-based snapshot did not contain visibility/gust/weather-code fields. |
| Marine Regions / VLIZ | Actual EEZ GeoJSON received and rendered. Boundary-edge distance is explicitly approximate and may include coastline; it is not an international-border distance. |
| Verified INCOIS PFZ | `NOT_CONFIGURED`; advisory ID/times null and zones empty. No fake points or zones. |
| Tide | No authoritative configured tide feed; high/low tide unavailable. |
| Satellite chlorophyll | Unavailable; no satellite raster/gradient is claimed. |
| Gemini | Real `gemini-3.5-flash-lite` answers after primary model quota failure. Model and fallback metadata retained. |
| Sarvam | Real Saaras v3 STT and Bulbul v3 TTS returned HTTP 200 in isolated HTTP verification. |

All ocean values are provider/model evidence, not claimed live measurements at the vessel. Different grids and valid times remain visible. A missing optional provider does not blank unrelated weather data or disable SOS.

## Cache and location behavior

- Backend snapshots expire five minutes after assembly, capped by advisory validity where relevant. Cache age and provenance are immutable assembly metadata; consumers compare the explicit expiry to their current clock.
- Refresh produces a new version. To compare exactly the same historical version across devices, use its snapshot ID; requests on opposite sides of expiry can legitimately resolve different versions.
- A complete snapshot is cached per account in session storage. Location must match and cached data older than 48 hours is rejected. Expired/error/offline evidence is labeled stale or “Last downloaded marine snapshot — not live.”
- No silent Mumbai/default/map-center substitution is used by canonical marine requests. Latest saved location order is consistent on backend endpoints. Post-fetch selection checks prevent an old request restoring an earlier selection.
- Offline use of an already downloaded snapshot is implemented and covered by frontend checks. A complete cold-start offline login/reload flow has **not** been manually accepted; session storage also does not promise persistence after the browser session ends.

## Typed chat, history, and auth

- Greetings are classified before marine resolution and do not call marine providers. General turns without a snapshot do not reuse old marine history as current environmental evidence.
- Marine questions pass the canonical snapshot to synthesis. Environmental numeric references are resolved by the application only from non-null evidence; missing or unsupported references fail closed. The risk assessment is calculated in backend code and displayed separately from generated explanation.
- Request IDs are persisted in SQL. Completed retries replay the stored response exactly. Failed/expired worker leases reuse the existing user turn. Response persistence and assistant append commit together; microsecond timestamps preserve turn order.
- User/assistant request IDs and original requested time/language are persisted in history. Reloaded pending turns can retry without an extra user bubble.
- Local rendered login, marine question, follow-up and history were exercised. A login redirect observed during verification was traced to a session created at `04:15:18 UTC` expiring at `05:15:18 UTC`, not revocation or a restart-generated signing key. The configured default access-token lifetime is one hour; indefinite “remember me” sessions are not implemented.
- This does not prove production has no intermittent 401s. Production authenticated acceptance is still required.

## Map and SOS

- Supported layers: selected-location marker, actual VLIZ EEZ polygons, and wave/wind/SST condition markers at provider grid points. Shared grid points use one popup. No unsupported spatial raster is generated.
- PFZ layer displays only current verified advisory points if present; current local status is “Current verified PFZ advisory unavailable.”
- Chat has an expandable map using its evidence snapshot. Resize handling and disabled Leaflet fade animation fixed the observed gray Safari basemap; tiles, boundaries and markers were visibly rendered.
- At a 390 × 844 Safari viewport, wave direction/period, wind waves, swell, current, visibility, SST and tide cards were visibly present in the stacked layout. This is responsive Safari testing, **not Android hardware testing**.
- SOS isolated HTTP returned **201 / RECEIVED** with four hotline entries. A regression test forces marine and AI failures and verifies SOS/contact endpoints remain available. No test invoked a real authority dispatch integration.
- The active SOS modal states that recording a request is not rescue dispatch. The services page now uses “Record SOS” and explicitly explains the prototype limitation in English, Gujarati and Hindi. Telephone links remain available.

## Voice

Voice creates editable text for the same chat send path: microphone → listening animation → Sarvam transcription → editable transcript → explicit send. Browser SpeechRecognition is not used as an authoritative fallback. Cancellation/unmount releases microphone tracks and prevents late recording results from submitting.

Automated tests cover editable transcript, no automatic chat submission, normal text submission, and microphone denial. Real STT/TTS HTTP was verified. A physical microphone/browser recording and Android audio-format acceptance test remain open. Gujarati, Hindi, English and configured additional language support remain in place; native-speaker review of generated phrasing is not claimed.

## Recorded local acceptance evidence

Sanitized files are in `backend/test-results/core-stabilization-2026-09-16/` (ignored by Git). Credentials, databases and audio recordings were not copied into this evidence folder.

Final real-provider HTTP run began `2026-09-16T05:17:42.709212+00:00`:

- Login/profile/location, greeting, English conditions, English follow-up, Gujarati, Hindi and history succeeded.
- All four marine responses used snapshot `3f0ae0d10daf4acbe27e7788d0061b6b7fb2ff810555dd0bd2fb09db151755a4` and returned `risk_level=unknown` for incomplete evidence. Each completed retry was byte-identical.
- Exact manual coordinates: **18.9, 72.7**. Requested time: **2026-09-16T05:00:00+00:00**. Candidate backend identity: `local-unversioned`.
- `desktop-snapshot.json` and `android-user-agent-snapshot.json` were byte-identical, including every field and provenance entry. SHA-256: `628750cf8b4df116538969dc9660488f967fa9185e636c005972df9c0d0bcb3e`.
- This pair was fetched by an HTTP script changing User-Agent. It does **not** satisfy the physical Android acceptance requirement.
- Recorded values were wave 1.21 m, wind 17.4 km/h, period 8.5 s, swell 0.84 m, current 1.0 km/h, SST 28.9 °C. They are historical evidence only and are not hardcoded into the app or a promised future demo result.
- Final rendered local chat and follow-up used the same visible snapshot prefix `7071de0a0b6a`, with matching 1.21 m waves and 17.4 km/h wind in prose and evidence cards.

Automated verification: full backend run **458 passed, 5 skipped** before the final validator/request-time tests; latest focused canonical suite **15 passed**, and the preceding canonical plus ownership run **26 passed**. Full frontend **128 passed across 21 files**; production build passed. Alembic applied the full migration chain on an empty isolated SQLite database. Production PostgreSQL migration application is not asserted.

## Demonstration location and procedure

Use **18.9 N, 72.7 E**, an offshore Mumbai-area reference point explicitly selected by the demonstrator. Real INCOIS/Open-Meteo/VLIZ coverage was observed locally. Do not make it a hidden default.

Before the expo, repeat this on the deployed candidate:

1. Log in on desktop and Android as the same test account; manually confirm the exact coordinates and requested timezone-aware time.
2. Download the snapshot JSON from both devices. Compare all fields, snapshot ID, backend SHA, source times and cache metadata. Capture both filenames and hashes. Use the same immutable ID if the cache refresh boundary is crossed.
3. Confirm Dashboard values, Map condition popups and Chat evidence agree for that ID. Missing fields must remain visibly unavailable.
4. Ask an English conditions question, a follow-up and a Gujarati/Hindi query; reload and inspect persisted history without duplicate turns.
5. Open the map. Show the selected marker, actual EEZ and supported grid conditions. State that verified PFZ is currently unavailable.
6. Demonstrate SOS recording in an isolated test environment and show call links; do not claim electronically dispatched rescue.
7. Explain and verify downloaded-snapshot behavior under connectivity loss; confirm stale labels and perform a cold offline reload test separately.
8. Test the real microphone, edit the transcript and submit it through the normal chat path.

## Existing deployments and remaining blockers

| Platform | Verified existing production deployment |
| --- | --- |
| Vercel | `https://team-orbit-x-sih-26.vercel.app`; deployment `dpl_5zQfyKNwqwfThHxMNamNM1SbEwTb`; Ready; SHA `dc2b64de7f4d90e09eca9d29a1b9f04cbcdd4257`. CLI metadata refreshed in this run. |
| Render | `https://orca-backend-ycue.onrender.com`; service `srv-da6hm6u1egvs738t3q50`; deployment `dep-dal176nqj5pc73dpq4e0`; Live; SHA `dc2b64de7f4d90e09eca9d29a1b9f04cbcdd4257`. Confirmed in the Render dashboard. |

Neither identity establishes that the local candidate is deployed. No candidate commit, push, production migration or deployment was performed here.

Blocking release:

1. **Git exits 69 because Apple's Xcode license is not accepted.** The account owner must review `sudo xcodebuild -license` in Terminal. This run did not accept legal terms. Once Git is available, inspect all existing changes, commit only intended work, deploy both platforms, verify migrations and repeat production acceptance.
2. **No physical Android raw comparison or rendered acceptance.** Responsive Safari and User-Agent comparison are explicitly insufficient substitutes.
3. **No deployed manual acceptance of this candidate**, including sustained auth, typed chat, provider evidence, reload/history, SOS and voice.

Other limitations requiring explicit demo disclosure or follow-up: primary Gemini daily quota remains exhausted; alternate-model availability is not guaranteed. PFZ/tide/chlorophyll are unavailable. Snapshot payloads include roughly 1.86 MB of EEZ geometry and historical snapshot retention is not bounded yet. The location-selection preview uses a coarse coastline estimate and may differ from backend validation; it is not navigability or border evidence. Full cold-start offline and physical voice acceptance remain unverified.
