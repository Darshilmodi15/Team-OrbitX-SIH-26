# ORCA UI, map and Google sign-in — 16 September 2026

## Scope and source

Continued from checkpoint `94ac858` and the September 16 handoff. Inspected all 14 images in the supplied visual reference pack, the competitor public home/login/chat/map and public source repository. Reused ORCA's existing ocean photo and authentication, marine snapshot and voice contracts. Competitor fixed marine coordinates and simulated overlays were not copied.

UI implementation commit: `71e69c5923caf2cf31582269c248f78c50f2cad0`. Google sign-in was added afterward at the user's explicit request.

## Implemented

- Assistant: neutral full-height workspace, collapsible history sidebar and mobile drawer, history search, compact message actions, autogrowing composer, circular controls, keyboard submission, editable map question prefill.
- Dictation: analyser-driven waveform, cancel/done controls, processing/error/transcript states. Dictation inserts an editable transcript. Existing conversation recording, STT and TTS lifecycle remains intact; no full-duplex voice rewrite.
- Evidence: one disclosure per snapshot, readable sources and cache/retrieval state, technical identifiers behind a secondary disclosure, lazy inline map expansion.
- Map: full viewport map/satellite/text modes, compact layer panel, recenter, selected-location inspection, desktop information panel/mobile bottom panel, compact legend and snapshot-preserving links between chat and map.
- Public pages: ocean hero and ORCA typography, floating navigation, clearer calls to action, split login/ocean layout and mobile form layout.
- Google: real GIS button, server verification and durable subject binding; same session/remember handling as password sign-in. See [Google sign-in configuration](google-sign-in.md).

## Data layers

| Layer | Status |
|---|---|
| OpenStreetMap / Esri imagery | Available base maps; imagery is not an ORCA live satellite ingestion feed |
| Selected location | Available from the saved/selected coordinates |
| India EEZ | Available from existing Marine Regions / VLIZ geometry |
| PFZ | Only actual snapshot advisories are rendered; disabled with explicit unavailable text when absent |
| Marine sample points | Actual model samples, off by default under Advanced |
| SST/chlorophyll heatmaps, AIS, radar, wind streamlines | Not implemented; no fabricated spatial feeds |

Text Mode unmounts Leaflet and its tile elements. Unknown historical snapshot IDs fail closed. Map-to-chat snapshots are loaded through the authenticated API and must match the saved location before sending.

## Evidence before deployment

- Frontend full suite: 146 tests passed in 27 files, including session and Google callback tests.
- Focused backend auth/RBAC run: 37 passed. Dedicated Google run: 13 passed (includes added issuer rejection regression).
- Production Vercel build passed. Existing main-chunk size warning remains.
- Clean SQLite migration from zero through `0006_google_identity` passed.
- Local rendered browser: password login, greeting and real-provider marine follow-up, persisted chat, one snapshot disclosure, inline map expansion, satellite tiles, actual EEZ toggle, unavailable PFZ state, advanced samples initially off, editable map-to-chat question, and Text Mode without Leaflet/tile elements.
- Responsive browser checks at 390 x 844: no horizontal overflow, accessible history drawer, visible composer/map controls. Google button also renders on the mobile layout. Browser viewport tests are not physical Android tests.

## Performance

All generated JavaScript and CSS chunks together (not the initial route download): baseline 1,319,006 bytes raw / 371,102 bytes gzip. Final release: 1,326,082 bytes raw / 376,074 bytes gzip, a 1.34% increase in aggregate compressed JavaScript/CSS. These totals cover all chunks rather than initial-page transfer. Maps remain lazy. Google GIS loads on the login route only; its remote script is additional to the Vite bundle measurement.

## Deliberately pending

Physical desktop microphone, Android microphone/keyboard, dictation and voice-conversation acceptance remain pending at the user's request. Deployed officer-screen acceptance requires an existing officer account/alert; no production SOS was created. The user confirmed successful Google sign-in on production during this session.

Attachments are disabled until processing exists. Retry restores the prior question for editing; it does not silently regenerate. Public conversation sharing, PDF export, feedback persistence, swipe gestures and full-duplex voice remain unimplemented. Existing non-Google third-party-email accounts use password sign-in until an authenticated linking UI exists. Some new interface copy remains English; full translation coverage is not claimed. One production history-list API request took 64.32 seconds and a conversation request took 16.87 seconds; both returned HTTP 200. This latency is observed, but its backend/network cause was not diagnosed in this UI task. The UI now explicitly shows loading instead of claiming history is empty.

## Main files

Frontend pages: `AssistantPage.tsx`, `MapPage.tsx`, `LandingPage.tsx`, `AuthPage.tsx`.
Components: `VoiceControls.tsx`, `ChatSnapshot.tsx`, `SnapshotDetails.tsx`, `MapPanel.tsx`, `CoastMap.tsx`, `GoogleSignInButton.tsx`, `workspace.css`, `public-pages.css`.
Google integration: `session.tsx`, `services/api.ts`, backend auth router/service, user model, `0006_google_identity.py`, and `requirements.txt`.
Tests: assistant behavior, map workspace, session, Google button, backend auth and Google identity security regressions.


## Final production release

- Source commit: `c69ff4f015e17fce3d60f1d6ab5729987387ae1d`, pushed to `origin/main`.
- Vercel: READY, `dpl_4Cx29vDNJRWpooi6rBMcHtkAQi67`.
- Public URL: https://team-orbit-x-sih-26.vercel.app
- Immutable Vercel URL: https://team-orbit-x-sih-26-3314en5n8-darshilmodi99-6492s-projects.vercel.app
- Render: last successfully deployed commit `c69ff4f`, deployment `dep-dal5ep4s728c7396o0ng`.
- Production JavaScript entry assets match the isolated build from the release commit.
- The user confirmed: “I signed in successfully” using Continue with Google on production.
- Invalid Google token production probe returned HTTP 401, with no session issued.
- Backend health returned healthy. Existing password login and saved-location access passed in the deployed browser.
- Broad backend regression run: 489 passed, 5 skipped. After restoring concurrently reverted Google files into the release checkpoint, 24 auth/Google tests passed in the isolated checkout. UI-only follow-ups were then verified with 146 frontend tests and a fresh production build. No claim of physical-device acceptance follows from these counts.
- Deployed browser: greeting and marine follow-up succeeded; four messages restored after reload; each assistant response had one snapshot disclosure, with the same disclosure count before and after map expansion (2 for 2 answers).
- Deployed map: chat expansion carried the immutable snapshot, EEZ toggle removed/restored its geometry, PFZ was unavailable/disabled, sample points started off, satellite/OSM controls worked, and Text Mode had zero Leaflet containers and zero tile elements.
- Map-to-chat prefilled an editable question and did not submit automatically.
- Final screenshot review corrected a CSS sizing rule that had stretched the legend. Final desktop measurement: legend height 40.5px inside a 500px map. Final mobile capture was 390 x 844, with document width 390px and legend height 35px.
- Physical desktop/Android voice and officer-screen checks remain open. No production SOS alert was created.

## Screenshots

Final screenshot files are saved in `/Users/darshilmodi/Desktop/ORCA_UI_REDESIGN_2026-09-16/`. These are actual browser captures, not mockups. Mobile captures use a browser viewport, not physical Android hardware.

- `deployed-assistant-desktop.png`
- `deployed-assistant-mobile.png`
- `deployed-map-desktop.png`
- `deployed-map-mobile.png`
- `deployed-home-desktop.png`
- `deployed-login-desktop.png`
- `deployed-login-mobile.png`
- `deployed-ui-overview.png` combines the four assistant/map captures for quick comparison.
