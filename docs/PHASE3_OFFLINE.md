# Phase 3 — Offline trip pack

14 September 2026. Core implementation is local; release acceptance is still pending. No deployment, account purchase or production database change was performed.

## What now exists

The dashboard offers an explicit **Download trip pack** action for the selected coordinates. It reports current PFZ availability and exports only available, timestamped marine readings, returned forecast slots and normalized PFZ evidence. The advisory is requested for the trip location; a manual sector selected elsewhere on the map is not silently exported as this location's advisory.

The download is a standalone HTML viewer with an encrypted payload. Location and readings are protected with browser Web Crypto AES-256-GCM, a random 96-bit nonce, random 128-bit salt and a PBKDF2-SHA256 key derived with 600,000 iterations. Passwords must contain at least 12 characters, are cleared after a download request, and are not persisted. No account token, identity record, chat, SOS or server secret is exported. Encryption protects the downloaded data; it does not authenticate a publisher or make a modified HTML viewer trustworthy. Open only files you prepared or trust.

Open the downloaded file in a compatible browser, supply its password, and lock it when finished. It needs no external scripts, fonts, images, server or session. A restrictive content policy disallows network connections. The viewer also reads downloaded packs locally through a file picker; it extracts only the encrypted JSON payload, not scripts from the selected file. Decryption failure and damaged input do not reveal partial content.

The production build emits a public offline reader and a service worker. After successful installation, network-failed navigation to supported ORCA routes falls back to that reader. Only the public reader is cached. API requests, cross-origin requests, POST/SOS actions and authenticated response bodies are never cached or queued. Online server errors remain server errors. A denied/interrupted cache installation does not establish offline readiness. A downloaded standalone file remains independent of this cache. The Vite development server serves the reader too, but service-worker registration is production-build only.

A navigation fallback is intentionally a trip-reader screen, not a simulated signed-in dashboard. Reconnecting permits normal online navigation; it does not secretly refresh a saved pack. Save a new pack explicitly.

## Validity and ownership

- Maximum pack lifetime: 48 hours after preparation. This does **not** promise 48 hours of forecasts.
- Current model readings are hidden three hours after their forecast-valid time, even while the file remains open. Their own provider/time/grid metadata is retained. This is ORCA's display-age policy, not a provider-issued expiry.
- PFZ points follow the advisory's actual expiry and are hidden afterwards. Missing or expired PFZ remains unavailable. An explicit provider no-advisory state stays distinct from missing data.
- Only returned, timestamped future slots are stored. Missing wave/wind values remain missing; no synthetic hourly timeline or safe-route verdict is exported.
- Full pack expiry and individual expiry are rechecked every 15 seconds and on page resume. An obviously earlier device clock hides content; there is no trusted offline clock that can defeat deliberate clock manipulation.
- The file contains chosen coordinates. Anyone with the file and password can read it. Password recovery is unavailable. Delete files/copies from Downloads or Files and empty trash; signing out cannot remove a downloaded file.
- The regular marine browser cache is now session-scoped and keyed by account and exact selected coordinates. Sign-in/sign-out clear legacy marine caches. Responses finishing after session changes cannot rewrite that persistent cache. Other preferences remain.
- Map tiles, satellite imagery, tide predictions, routes and live alerts are excluded. There is no automatic SOS retry or implied delivery. In an emergency, use working communication equipment; this file cannot make contact.

## Verification and limits

Automated tests exercise real encryption/decryption in Node Web Crypto with the HTML reader in JSDOM: correct/wrong password, authenticated-ciphertext tampering, safe text rendering, locking, stale readings, expired PFZ, full 48-hour expiry and expiry after page resume. React tests cover the download trigger, password clearing, exact content counts and preparation failures. Worker tests cover offline fallback, API/POST/cross-origin exclusions, server-error pass-through, selective cache cleanup and denied installation. Final full backend regression: **438 passed, 5 skipped**. Frontend: **105 passed across 17 files**. Production build emits both reader and worker; lint exits 0 with existing warnings, and the existing ~542 kB main-chunk warning remains. These are code/runtime tests, not an airplane-mode device certification.

The browser tool rejected direct local-file navigation under its URL security policy. No workaround was attempted. Consequently, downloaded-file opening in a native browser, OS download success, browser restart/airplane mode, service-worker lifecycle, mobile file handling and real-device storage limits remain **manual acceptance checks**. The generated test artifact uses conspicuously labelled public reference/test data; it is not a live advisory.

New offline controls and viewer are currently English. Translation and fisher usability review remain before a multilingual release. This limitation is separate from the existing 11-language marine measurement labels.

## After this core work, before Phase 4

1. On the candidate deployment, sign in normally, select a coastal location, let data load, set a new trip password and download a pack. Confirm its content counts, sources and expiry.
2. Open the actual downloaded HTML in the target phone browser and unlock it. Turn on airplane mode, close/reopen the browser and file, then unlock again. Confirm no network or SOS success is implied. Verify local file support on every supported platform; mobile Files preview alone may not execute the viewer.
3. While online, visit ORCA once and allow worker installation. Turn on airplane mode and reopen `/dashboard`; check that the public reader appears and can select/unlock the saved HTML. Denied browser storage must show no false readiness; use the standalone file path.
4. Check a deliberately short-lived **labelled test** advisory expires while open. Check clock changes/48-hour expiry using test files, never alter a real advisory's validity to make it appear current.
5. Lock, sign out, switch accounts, and delete downloaded files. Confirm no account credentials or chats appear in the decrypted pack. Verify sign-out clears the regular marine cache, while downloaded-file deletion remains explicit.
6. Reconnect, sign in if needed and prepare a new pack. Resolve the Phase 2 live-source and infrastructure checklist in [PHASE2_MARINE.md](PHASE2_MARINE.md) and [BETA_REVIEW.md](BETA_REVIEW.md). Do not call Phase 2 or Phase 3 release-complete based solely on builds/tests.

Web Crypto references: [AES-GCM encryption](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt), [key derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey).
