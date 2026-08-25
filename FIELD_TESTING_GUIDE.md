# 🧪 ORCA Marine AI — Field Testing & Resilience Verification Manual

This document outlines the step-by-step test procedures for verifying ORCA's resilience against real-world marine conditions, network dropouts, GPS anomalies, and upstream API failures.

---

## 📋 Matrix of 10 Edge-Case Test Scenarios

| Test ID | Test Scenario | Expected System Behavior | Verification Status |
| :---: | :--- | :--- | :---: |
| **TC-01** | **Intermittent / Slow 3G Network** | Regional cache responds in $< 50\text{ms}$; UI displays data freshness badge. | ✅ Verified |
| **TC-02** | **INCOIS Server Downtime** | Automatic seamless fallback to Open-Meteo or cached observation; zero crashes. | ✅ Verified |
| **TC-03** | **GPS Permission Denied** | App presents graceful manual coastal port picker (*10 major Indian harbours*). | ✅ Verified |
| **TC-04** | **Inland / Non-Coastal GPS** | App calculates distance to coast, explains limitation, suggests nearest port. | ✅ Verified |
| **TC-05** | **IMBL / Geofence Proximity** | Triggers yellow caution toast at 20 NM and red hazard warning at 10 NM from border. | ✅ Verified |
| **TC-06** | **Multilingual Voice Synthesis** | Audio synthesized in selected Indic dialect (*Sarvam Bulbul v3 neural voices*). | ✅ Verified |
| **TC-07** | **Emergency SOS Broadcast** | Incident logged in `sos_requests` table, routed to nearest MRCC with IMO VHF script. | ✅ Verified |
| **TC-08** | **Government Role Authorization** | Only `GOVERNMENT` or `SUPER_ADMIN` accounts can publish official circulars. | ✅ Verified |
| **TC-09** | **Super Admin Diagnostics** | Displays real-time uptime, database state, memory, and upstream API latencies. | ✅ Verified |
| **TC-10** | **Database Schema & Migrations** | `alembic upgrade head` cleanly builds all 16 tables on fresh PostgreSQL instance. | ✅ Verified |

---

## 🛠️ Step-by-Step Test Execution Instructions

### TC-01: Low-Bandwidth Geospatial Cache Verification
1. Run query at coordinates `(18.9220, 72.8347)` (Mumbai Port).
2. Note response time on initial retrieval (~200–400ms).
3. Run a second query at nearby coordinates `(18.9250, 72.8370)` (~300m away).
4. Verify response time drops to **$< 15\text{ms}$** as the query hits the 0.05° spatial cache bin.

---

### TC-02: Live Provider Fallback & Stale-Data Recovery
1. Set `INCOIS_BASE_URL=https://invalid-incois-domain-test.gov.in` in environment.
2. Trigger `/query` for marine conditions.
3. Verify backend automatically logs fallback event and serves Open-Meteo or cached telemetry without returning HTTP 500.

---

### TC-03 & TC-04: Geodesic Coastal Belt Validation
1. Send GPS payload with New Delhi coordinates: `{"lat": 28.6139, "lon": 77.2090}` to `/api/location/validate`.
2. Verify response:
   - `inside_india: true`
   - `is_coastal_supported: false`
   - `distance_to_coast_km: ~1050 km`
   - `message`: Explains ORCA is designed for coastal zones ($\le 100\text{ km}$) and suggests coastal ports.

---

### TC-05: Maritime Geofencing & International Boundary Alerts
1. Query coordinates near Indo-Pak maritime boundary `(23.5000, 67.8000)` (Sir Creek / Kutch offshore).
2. Verify boundary agent flags `WARNING` / `CRITICAL` geofence tier.
3. Verify response advises vessel to maintain heading inside Indian EEZ waters.

---

### TC-06: Indic Speech & Sarvam AI Voice Verification
1. Send Gujarati audio payload to `/api/voice/transcribe`.
2. Verify transcription returns Gujarati text with ISO code `gu`.
3. Request audio synthesis via `/api/voice/speak` with speaker `meera` or `arvind`.
4. Verify base64 WAV payload decodes and plays clearly.

---

### TC-07: Emergency SOS & MRCC Routing Validation
1. Post distress signal to `/api/emergency/sos` from East Coast `(13.0827, 80.2707)` (Chennai).
2. Verify backend assigns incident to **MRCC Chennai**.
3. Verify generated `mayday_message` follows IMO standard format with phonetic callouts.
4. Verify record is persisted in PostgreSQL `sos_requests` table.

---

### TC-08 & TC-09: RBAC Security & Diagnostics Audit
1. Attempt `POST /api/government/announcements` with a standard `USER` token $\to$ Verify `403 Forbidden`.
2. Login with `GOVERNMENT` or `SUPER_ADMIN` credentials $\to$ Verify `201 Created`.
3. Query `GET /api/admin/system-health` $\to$ Verify status reports `HEALTHY`, database connected, and latencies under 50ms.
