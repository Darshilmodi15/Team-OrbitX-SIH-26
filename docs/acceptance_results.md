# ORCA Acceptance Results Tracker

**Test Date:** _fill in_  
**Candidate Frontend:** URL: `https://team-orbit-x-sih-26.vercel.app` | Deployment ID: _fill in_  
**Candidate Backend:** URL: _fill in_ | Deployment ID: _fill in_  
**Frontend Git SHA:** `13bb7da311d1cde03a6d01824710a09aa2950cfd`  
**Backend Git SHA:** `13bb7da311d1cde03a6d01824710a09aa2950cfd`  
**Previous Verified Pair:** Frontend: _fill in_ | Backend: _fill in_

## Instructions

- Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` for each item.
- Record device/browser, time, and evidence for every result.
- Never include passwords, API keys, tokens, personal coordinates, or private conversations.
- If something fails, stop that dependent flow, record its ID, and continue an independent section.
- Items marked `BLOCKED(Cx)` depend on a known code/data gap and cannot pass until that gap is resolved.

## Known Code/Data Gaps

| Gap | Description | Blocks |
|---|---|---|
| **C1** | PFZ publication ingestion — no official feed, no issue/expiry linkage | M37, M38, M39 (live PFZ parts) |
| **C2** | Chlorophyll/MOSDAC — no adapter, no product selected | M42 |
| **C3** | Offline translation — viewer/download English-only | M66 (partial) |
| **C4** | GIS/navigation — approximate boundaries, no authoritative source validated | M41 (partial) |

---

## A. Accounts, Hosting and Candidate Identification

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M01 | NOT RUN | — | — | — | — | Darshil/Rajvi | Record exact frontend/backend URLs, deployment IDs, git SHAs |
| M02 | NOT RUN | — | — | — | — | Darshil | Find and smoke-test previous working version |
| M03 | NOT RUN | — | — | — | — | Pavan | Open-Meteo non-commercial usage, attribution, rate limits |
| M04 | NOT RUN | — | — | — | — | Pavan/Darshil | BLOCKED(C1) — requires official PFZ feed investigation |
| M05 | NOT RUN | — | — | — | — | Pavan | BLOCKED(C2) — requires satellite product selection |
| M06 | NOT RUN | — | — | — | — | Prachi | Redis connectivity from deployed backend network |
| M07 | NOT RUN | — | — | — | — | Prachi | Redis sharing — shared cache hit, `orca:marine:v3:` namespace |
| M08 | NOT RUN | — | — | — | — | Darshil/Rajvi | PostgreSQL schema — deployed Alembic revision, chat tables |
| M09 | NOT RUN | — | — | — | — | Rajvi | Backup restore into isolated staging |
| M10 | NOT RUN | — | — | — | — | Darshil | AI/voice account health — Gemini/Sarvam quota |
| M11 | NOT RUN | — | — | — | — | Darshil | Frontend API base URL, CORS, HTTPS, no secrets in bundle |
| M12 | NOT RUN | — | — | — | — | Harpal | Optional Google Maps — only if migration chosen |

## B. Authentication and Location Selection

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M13 | NOT RUN | — | — | — | — | Rajvi | First sign-in, location selection before dashboard |
| M14 | NOT RUN | — | — | — | — | Heth | Direct-link bypass — `/assistant`, `/map`, `/alerts`, `/dashboard` |
| M15 | NOT RUN | — | — | — | — | Heth | Saved location reload on slow internet |
| M16 | NOT RUN | — | — | — | — | Heth | GPS allow — phone, measured coordinates |
| M17 | NOT RUN | — | — | — | — | Heth | GPS denial/timeout — clear error, manual path |
| M18 | NOT RUN | — | — | — | — | Heth | Preset removal — no demo buttons/fixed values |
| M19 | NOT RUN | — | — | — | — | Heth | Manual search — real coastal place |
| M20 | NOT RUN | — | — | — | — | Heth | Coordinate entry — valid, blank, invalid, out-of-range |
| M21 | NOT RUN | — | — | — | — | Heth | Home/inland pin — inland rejection |
| M22 | NOT RUN | — | — | — | — | Heth/Pavan | Mainland reference — Mumbai or real coastal point |
| M23 | NOT RUN | — | — | — | — | Heth/Pavan | Lakshadweep — coastal/sea point near islands |
| M24 | NOT RUN | — | — | — | — | Heth/Pavan | Andaman — no forced mainland fallback |
| M25 | NOT RUN | — | — | — | — | Heth/Pavan | Nicobar — not conflated with Andaman |
| M26 | NOT RUN | — | — | — | — | Heth/Harpal | Rameswaram — departure/sea pin |
| M27 | NOT RUN | — | — | — | — | Heth/Pavan | Kanyakumari — southern tip |
| M28 | NOT RUN | — | — | — | — | Heth | Save failure and race — connectivity loss |
| M29 | NOT RUN | — | — | — | — | Rajvi | Account switch — no data leakage |
| M30 | NOT RUN | — | — | — | — | Rajvi | Role isolation — user/government/admin routes |

## C. Marine Data, PFZ and Maps

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M31 | NOT RUN | — | — | — | — | Pavan | Source/time labels — units, times, grid accuracy |
| M32 | NOT RUN | — | — | — | — | Pavan | Expanded fields — waves, swell, SST, currents |
| M33 | NOT RUN | — | — | — | — | Pavan | Mixed providers — INCOIS primary + Open-Meteo supplement |
| M34 | NOT RUN | — | — | — | — | Pavan | Provider outage/rate limit — staging controls |
| M35 | NOT RUN | — | — | — | — | Pavan | Future and missing hours — no invented times |
| M36 | NOT RUN | — | — | — | — | Darshil | PFZ unavailable — can pass with C1 still blocked |
| M37 | BLOCKED(C1) | — | — | — | — | Darshil | Real PFZ publication — requires C1 resolution |
| M38 | BLOCKED(C1) | — | — | — | — | Darshil | PFZ expiry while open — requires C1 resolution |
| M39 | NOT RUN | — | — | — | — | Darshil | PFZ selector consistency — sector/language |
| M40 | NOT RUN | — | — | — | — | Harpal | Map/satellite/text modes |
| M41 | NOT RUN | — | — | — | — | Harpal | Boundary source — provenance, C4 gaps |
| M42 | BLOCKED(C2) | — | — | — | — | Pavan | Chlorophyll/satellite — requires C2 resolution |
| M43 | NOT RUN | — | — | — | — | Pavan | Tides — source, station, datum |
| M44 | NOT RUN | — | — | — | — | Rajvi | Recommendations — no invented data |

## D. Assistant, Voice and SOS

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M45 | NOT RUN | — | — | — | — | Rajvi | Real chat — actual answer for user/location/time |
| M46 | NOT RUN | — | — | — | — | Rajvi | Conversation isolation — two test accounts |
| M47 | NOT RUN | — | — | — | — | Rajvi | Chat failure/retry — staged error |
| M48 | NOT RUN | — | — | — | — | Rajvi | Microphone permissions — allow/deny/revoke |
| M49 | NOT RUN | — | — | — | — | Rajvi | Real STT/TTS — Sarvam, each language |
| M50 | NOT RUN | — | — | — | — | Rajvi | SOS semantics — isolated staging only |

## E. Offline Preparation and Real Devices

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M51 | NOT RUN | — | — | — | — | Prachi | Prepare a pack — download, password, counts |
| M52 | NOT RUN | — | — | — | — | Prachi | OS save — Downloads/Files, cancel, low storage |
| M53 | NOT RUN | — | — | — | — | Prachi | Local browser opening — phone browser, not Files preview |
| M54 | NOT RUN | — | — | — | — | Prachi | Wrong password/tamper — no partial decrypt |
| M55 | NOT RUN | — | — | — | — | Prachi | Airplane-mode restart — saved content readable |
| M56 | NOT RUN | — | — | — | — | Prachi | Offline route fallback — public trip reader |
| M57 | NOT RUN | — | — | — | — | Prachi | Denied/evicted browser storage |
| M58 | NOT RUN | — | — | — | — | Prachi | Reading/PFZ expiry — 3-hour display limit |
| M59 | NOT RUN | — | — | — | — | Prachi | Full pack expiry/clock — 48-hour limit |
| M60 | NOT RUN | — | — | — | — | Prachi | Lock and deletion |
| M61 | NOT RUN | — | — | — | — | Prachi | Reconnect — fresh provider request |
| M62 | NOT RUN | — | — | — | — | Prachi/Rajvi | Offline communications — no sent/received claim |

## F. Onboarding, Language, Usability and Accessibility

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M63 | NOT RUN | — | — | — | — | Rajvi | Five-step tour — guide accuracy |
| M64 | NOT RUN | — | — | — | — | Rajvi | Dismiss/replay — no trapped modal |
| M65 | NOT RUN | — | — | — | — | Rajvi | Navigation clarity — desktop/mobile |
| M66 | NOT RUN | — | — | — | — | Rajvi/native | Languages — 11 guide languages, C3 for offline |
| M67 | NOT RUN | — | — | — | — | Rajvi | Keyboard/screen reader — focus, labels |
| M68 | NOT RUN | — | — | — | — | Rajvi | Phone layout — narrow Android/iOS |
| M69 | NOT RUN | — | — | — | — | Rajvi | Reduced motion/contrast — themes |
| M70 | NOT RUN | — | — | — | — | Rajvi | Slow connection — throttled data |
| M71 | NOT RUN | — | — | — | — | Rajvi/team | Realistic fisher task — representative user |

## G. Release and Recovery

| ID | Status | Device/Browser | Time | Candidate IDs | Evidence | Owner | Notes |
|---|---|---|---|---|---|---|---|
| M72 | NOT RUN | — | — | — | — | Darshil | CI evidence — both jobs, exact commit |
| M73 | NOT RUN | — | — | — | — | Darshil | Release record — `tools/release_check.py` |
| M74 | NOT RUN | — | — | — | — | Rajvi | Candidate smoke — deployed URLs |
| M75 | NOT RUN | — | — | — | — | Darshil/Rajvi | Staging rollback drill |
| M76 | NOT RUN | — | — | — | — | Darshil | Vercel/Render rollback settings |
| M77 | NOT RUN | — | — | — | — | Prachi | Installed worker during rollback |
| M78 | NOT RUN | — | — | — | — | Darshil/Rajvi | Promotion and observation |
| M79 | NOT RUN | — | — | — | — | Darshil | Recovery evidence — drill commands/timings |
| M80 | NOT RUN | — | — | — | — | Team | Final disposition — review all results |

---

## Summary

| Section | Total | PASS | FAIL | BLOCKED | NOT RUN |
|---|---|---|---|---|---|
| A. Accounts/Hosting | 12 | 0 | 0 | 0 | 12 |
| B. Auth/Location | 18 | 0 | 0 | 0 | 18 |
| C. Marine/PFZ/Maps | 14 | 0 | 0 | 3 | 11 |
| D. Assistant/Voice/SOS | 6 | 0 | 0 | 0 | 6 |
| E. Offline/Devices | 12 | 0 | 0 | 0 | 12 |
| F. Onboarding/UX | 9 | 0 | 0 | 0 | 9 |
| G. Release/Recovery | 9 | 0 | 0 | 0 | 9 |
| **TOTAL** | **80** | **0** | **0** | **3** | **77** |

## Change Log

| Date | Who | Items Updated | Notes |
|---|---|---|---|
| _fill in_ | _fill in_ | _fill in_ | _fill in_ |
