# ⚓ ORCA Marine AI — Official Frontend-Backend API Integration Contract

This document serves as the binding integration contract between the **Frontend (React 19)** and **Backend (FastAPI)** teams. The backend is frozen; frontend components must format requests and parse responses according to this specification.

---

## 🌐 1. Base Configuration

- **Local Development URL**: `http://localhost:8000`
- **Production URL**: `https://orca-backend.onrender.com` (configured via `VITE_API_BASE_URL`)
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs` (Swagger UI) & `/redoc`

---

## 📡 2. Core User Journey Endpoints

### 🌊 Journey 1: Operational Advisory & Multi-Agent Query
- **Endpoint**: `POST /query`
- **Purpose**: Executes full multi-agent pipeline: Intent Parsing $\to$ Deterministic Planning $\to$ Weather Retrieval $\to$ 4-Vector Risk Assessment $\to$ PFZ Advisory $\to$ EEZ Boundary Check $\to$ Indic Localization.
- **Request Payload**:
  ```json
  {
    "location": {
      "lat": 18.9220,
      "lon": 72.8347
    },
    "date": "2026-08-25",
    "question": "Is it safe to go fishing tomorrow near Mumbai?",
    "language": "en",
    "session_id": "session_abc123"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "answer": "Operational Advisory for (18.9220, 72.8347) on 2026-08-25:\n\n✅ SEA STATE SAFE for navigation & artisanal fishing (Wave height: 1.05m, Wind: 20.1 km/h WSW).\n\nNearest Potential Fishing Zones:\n- Shelf Break Zone D: 8.8 km away (Depth: ~65m, Dominant: Kingfish, Seer Fish)",
    "language": "en",
    "language_name": "English",
    "risk_level": "safe",
    "risk_profile": {
      "overall_risk": "safe",
      "wave_risk": "safe",
      "wind_risk": "safe",
      "weather_risk": "safe",
      "swell_risk": "safe"
    },
    "weather": {
      "wave_height_m": 1.05,
      "wind_speed_kmh": 20.1,
      "wind_direction_cardinal": "WSW",
      "forecast": "clear",
      "source": "INCOIS_OSF_LIVE",
      "is_mock": false
    },
    "nearest_pfz": [
      {
        "name": "Shelf Break Zone D",
        "latitude": 18.9612,
        "longitude": 72.8941,
        "distance_km": 8.8,
        "depth_m": 65,
        "species": ["Kingfish", "Seer Fish"]
      }
    ],
    "reasoning": [
      "Detected intent 'safety_check' (location hint: 'Mumbai').",
      "Generated execution plan with 4 tasks.",
      "Retrieved marine weather from INCOIS: wave_height=1.05m, wind_speed=20.1 km/h.",
      "Assessed marine risk level as 'SAFE'.",
      "Synthesized operational guidance."
    ],
    "sources_used": [
      "intent_agent",
      "planner",
      "incois_osf_provider",
      "risk_assessment_agent",
      "pfz_provider",
      "marine_boundaries_service"
    ]
  }
  ```

---

### 💬 Multi-Turn Conversational Chat
- **Endpoint**: `POST /api/chat`
- **Request Payload**:
  ```json
  {
    "message": "Where are the nearest fishing zones?",
    "location": { "lat": 18.9220, "lon": 72.8347 },
    "date": "2026-08-25",
    "language": "auto",
    "session_id": "session_abc123"
  }
  ```

---

### 🗺️ Journey 2: Tactical GIS Map & Spatial Telemetry

| Endpoint | Method | Query Parameters | Description |
| :--- | :---: | :--- | :--- |
| `/api/marine/conditions` | `GET` | `lat=18.922&lon=72.834` | Real-time ocean state (waves, wind, SST, tide). |
| `/api/marine/risk` | `GET` | `lat=18.922&lon=72.834` | Decomposed 4-vector risk evaluation. |
| `/api/marine/forecast` | `GET` | `lat=18.922&lon=72.834` | Hourly forecast horizon (24h/48h). |
| `/api/marine/historical-comparison` | `GET` | `lat=18.922&lon=72.834&period_hours=24` | 24h Before vs After variance analysis. |
| `/api/pfz` | `GET` | `lat=18.922&lon=72.834` | List of nearest high-confidence PFZ coordinates. |
| `/api/marine-boundaries/eez` | `GET` | `mrgid=8480` | GeoJSON FeatureCollection of Indian EEZ. |
| `/api/marine-boundaries/check` | `GET` | `lat=18.922&lon=72.834` | Geofence containment and distance to border. |
| `/api/geofences` | `GET` | `lat=18.922&lon=72.834` | All active maritime geofences & MPAs. |

---

### 🚨 Journey 3: Emergency SOS Distress Hub
- **Endpoint**: `POST /api/emergency/sos`
- **Request Payload**:
  ```json
  {
    "vessel_name": "Matsya Shakti",
    "registration_no": "IND-MH-01-F-4433",
    "lat": 18.7502,
    "lon": 72.4105,
    "crew_count": 6,
    "emergency_nature": "Engine Failure / Adrift in Rough Seas",
    "emergency_contact": "+91 98765 43210",
    "notes": "Drifting southwest away from Mumbai harbour"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "id": "SOS-892301",
    "status": "ACTIVE_BEACON_DISPATCHED",
    "assigned_mrcc": "MRCC Mumbai",
    "mrcc_contact": "+91-22-24388065",
    "mayday_message": "MAYDAY MAYDAY MAYDAY. THIS IS FISHING VESSEL MATSYA SHAKTI, REG IND-MH-01-F-4433. POSITION 18 DEGREES 45.01 MINUTES NORTH, 072 DEGREES 24.63 MINUTES EAST. NATURE OF DISTRESS: ENGINE FAILURE IN ROUGH SEAS. 6 PERSONS ON BOARD. OVER.",
    "vhf_channel": "VHF Channel 16 / 2182 kHz",
    "timestamp": "2026-08-25T21:30:00Z"
  }
  ```

---

### 🎙️ Journey 4: Multilingual Voice & Speech (Sarvam AI)

| Endpoint | Method | Payload / Format | Output |
| :--- | :---: | :--- | :--- |
| `/api/voice/transcribe` | `POST` | `multipart/form-data` (file: audio.wav) | `{ "transcript": "...", "language_code": "gu" }` |
| `/api/voice/transcribe-base64` | `POST` | `{ "audio_base64": "...", "language_code": "hi" }` | `{ "transcript": "..." }` |
| `/api/voice/speak` | `POST` | `{ "text": "...", "target_language": "gu", "speaker": "meera" }` | `{ "audio_base64": "..." }` |
| `/api/translate` | `POST` | `{ "text": "...", "source_language": "gu", "target_language": "en" }` | `{ "translated_text": "..." }` |
| `/api/detect-language` | `POST` | `{ "text": "..." }` | `{ "detected_language": "gu", "confidence": 0.98 }` |

---

### 🏛️ Government Portal & Super Admin APIs

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/government/announcements` | `GET` | No | Public list of official gazette circulars & ban notices. |
| `/api/government/announcements` | `POST` | `GOVERNMENT` / `ADMIN` | Publish new safety circular or scheme advisory. |
| `/api/government/documents` | `GET` | No | Downloadable policy handbooks and subsidy guides. |
| `/api/admin/system-health` | `GET` | No | Real-time health metrics, RAM, uptime, and upstream latencies. |
| `/api/admin/users` | `GET` | `ADMIN` | View fleet of registered fishermen and mariners. |
| `/api/admin/users/{id}/role` | `PATCH` | `ADMIN` | Modify user permissions (`USER`, `GOVERNMENT`, `SUPER_ADMIN`). |

---

### 📍 Location Validation & Geodetic Checks
- **Endpoint**: `POST /api/location/validate`
- **Request Payload**:
  ```json
  {
    "lat": 18.9220,
    "lon": 72.8347,
    "accuracy_m": 15.0
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "lat": 18.9220,
    "lon": 72.8347,
    "inside_india": true,
    "is_coastal_supported": true,
    "distance_to_coast_km": 0.0,
    "nearest_coastal_point": {
      "lat": 18.9220,
      "lon": 72.8347,
      "name": "Mumbai Port",
      "region": "Maharashtra Coast"
    },
    "coastal_region": "Maharashtra Coast",
    "message": "GPS coordinates verified within Indian coastal waters.",
    "intelligence_radius_km": 100.0
  }
  ```

---

## 🔒 3. Authentication Headers

When a user registers or logs in via `/api/auth/register` or `/api/auth/login`, the backend returns an access token. Include this token in all subsequent protected requests:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
