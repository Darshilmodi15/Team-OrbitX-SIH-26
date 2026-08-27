# ORCA Marine AI 🌊⚓

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Tests](https://img.shields.io/badge/Pytest-254%20Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)
[![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-Voice_%26_Indic_AI-orange.svg)](https://sarvam.ai)
[![INCOIS Live](https://img.shields.io/badge/INCOIS-Ocean_State_Forecast-blue.svg)](https://incois.gov.in)
[![ISRO](https://img.shields.io/badge/ISRO-Satellite_Earth_Observation-purple.svg)](https://isro.gov.in)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ORCA Marine AI** is a production-grade autonomous maritime intelligence platform and conversational copilot engineered for artisanal fishermen, commercial mariners, coastal communities, and maritime security agencies. Built on a deterministic **11-agent multi-agent architecture**, ORCA fuses real-time **INCOIS** ocean state forecasts, **ISRO** satellite ocean productivity telemetry, decomposed 4-vector safety risk assessments, **Potential Fishing Zone (PFZ)** advisories, **Flanders Marine Institute (VLIZ) World EEZ v12** boundaries & **IMBL geofencing**, 1-click **SOS distress broadcasting** with automated **IMO MAYDAY VHF Channel 16 generation**, government gazette circulars, and a regional voice & multilingual dialogue engine spanning **11 Indian coastal languages + English** with full **Romanized Indic script transliteration recognition**.

---

## 🌟 Key Capabilities & Architectural Innovations

- **🌊 Authoritative INCOIS Ocean State Forecast (OSF)**: Programmatic retrieval of Significant Wave Height ($HS$ in metres), Wind Speed ($UWND/VWND$ magnitude in $m/s$ and $km/h$), and Wind Direction (16-point cardinal & meteorological degrees) directly from the official **INCOIS NetCDF Subset Service (NCSS) / THREDDS catalog** with Open-Meteo marine numerical fallback.
- **🛰️ ISRO Satellite Earth Observation & Ocean Analytics**: Ingests Chlorophyll-a bloom densities ($mg/m^3$), Sea Surface Temperature (SST) thermal front gradients, upwelling indices, and Sea Surface Height Anomalies (SSHA) to track primary productivity and diagnose multi-factorial fish catch declines.
- **🛡️ Decomposed 4-Vector Marine Risk Engine**: Analyzes sea states across 4 independent physical vectors—Significant Wave Height, Wind & Squall Risk, Swell Period ($T_p$), and Forecast Weather Severity—producing standardized operational safety tiers (`SAFE`, `CAUTION`, `UNSAFE`) calibrated for artisanal fiber crafts vs commercial trawlers.
- **🗺️ Marine Boundaries & EEZ Integration (Marine Regions / VLIZ)**: Official Exclusive Economic Zone (EEZ) boundaries from Flanders Marine Institute (VLIZ) World EEZ v12 via Web Feature Service (WFS) with pure-Python ray-casting containment testing and automated geofence proximity monitoring.
- **🚧 Real-Time IMBL & MPA Buffer Geofencing**: Proactive monitoring of the International Maritime Boundary Line (IMBL - India/Pakistan/Sri Lanka) and Marine Protected Areas (MPAs like Gulf of Mannar, Malvan, Sundarbans) with tiered buffer warnings (`SAFE`, `WARNING`, `CRITICAL`) to prevent accidental international border crossings.
- **🐟 Potential Fishing Zones (PFZ) & Bathymetric Ecology**: Identifies thermal fronts, chlorophyll-a blooms, shelf breaks, and upwelling zones with distance/bearing calculations, depth estimates, and dominant target species (Kingfish, Seer Fish, Tuna, Mackerel, Sardines, Pomfret).
- **🎙️ Sarvam AI & Bhashini Voice & Multilingual Stack**:
  - **Speech-to-Text (STT)**: Sarvam Saaras v3 / v2 supporting speech in 22+ Indic languages + English.
  - **Text-to-Speech (TTS)**: Sarvam Bulbul v3 neural voice synthesis with authentic Indian voice personas (*Meera*, *Arvind*, *Kavya*, *Amartya*, *Ratan*, *Shashi*).
  - **Neural Machine Translation (NMT)** & Language Identification across 11 coastal languages (Gujarati, Hindi, Marathi, Tamil, Telugu, Malayalam, Bengali, Odia, Kannada, Punjabi, English).
  - **Romanized Indic Language Recognition**: Automatic identification and native handling of Indian languages transliterated into Latin script (e.g. *"Kya main kal machhli pakadne ja sakta hoon?"*, *"shu hu kale machhimari karva jai shaku?"*, *"naalai meen pidikka pogalama?"*).
  - **Language Priority Rule**: User input language dynamically overrides dashboard default on every conversational turn.
  - **Dual Fallback Integration**: Resilient fallbacks between Sarvam AI, MeitY Bhashini, and domain-specific offline marine dictionaries.
- **🚨 Maritime Emergency SOS & Search and Rescue (SAR) Hub**: Instant one-click SOS distress broadcasting with GPS routing to Maritime Rescue Coordination Centres (**MRCC Mumbai, MRCC Chennai, MRCC Port Blair**), automated **IMO-standard MAYDAY VHF Channel 16 transmission script** generation, and 24x7 maritime helplines (Coast Guard 1554, Coastal Police 1093, NDRF 1078, National Emergency 112).
- **📜 Government Circulars & Fisheries Policy Portal**: Interactive gazette notices, seasonal monsoon fishing ban advisories, PMMSY (Pradhan Mantri Matsya Sampada Yojana) subsidy schemes, Kisan Credit Card (KCC) for fisheries, transponder mandates, and official circular publishing with Role-Based Access Control (`USER`, `GOVERNMENT`, `SUPER_ADMIN`).
- **⚡ Low-Bandwidth Resilient Coastal Geospatial Cache**: Ultra-compact query payloads (~130–160 bytes) with 0.05° (~5.5 km) spatial grid binning and spiral coastal land-mask search, Redis caching with in-memory fallback, allowing nearby vessels on 2G/3G maritime edge connections to reuse forecasts with sub-millisecond retrieval latencies.
- **🧭 Tactical GIS Dashboard & Responsive Web AppShell (React 19 + Vite 8 + Leaflet + Tailwind v4)**: Interactive nautical chart with multi-layer overlays (PFZ hotspots, EEZ boundary lines, international boundary buffer zones, SST heatmaps, chlorophyll distributions, wind barbs, wave vectors, vessel breadcrumbs), full reasoning trace inspection, ChatGPT-style AI Assistant with voice microphone input & audio playback, and mobile bottom navigation.
- **📊 Super Admin Diagnostics & Fleet Operations**: Real-time service health monitoring, upstream latencies (INCOIS, Open-Meteo, Sarvam AI, VLIZ, Redis), user fleet management with RBAC, and Before-vs-After historical oceanographic telemetry comparisons.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Tactical GIS Dashboard (React 19 + Vite 8 + Leaflet + Tailwind v4)"]
        UI[User Interface & Tactical Map]
        AppShell[Responsive AppShell & Navigation]
        VoiceInput[Voice Input / Microphone STT]
        AudioOutput[Audio Playback / Bulbul TTS]
        AssistantPanel[ChatGPT-Style AI Copilot Drawer]
        Modals[Emergency SOS / Govt Portal / Admin / Trace]
    end

    subgraph API_Gateway["FastAPI Application Layer (v1.4.0)"]
        RouterMain["Core Router (/query, /api/chat)"]
        RouterVoice["Voice & Speech Router (/api/voice/*)"]
        RouterMarine["Marine Telemetry Router (/api/marine/*)"]
        RouterBoundaries["Boundary & EEZ Router (/api/marine-boundaries/*)"]
        RouterEmergency["Emergency SOS Router (/api/emergency/*)"]
        RouterGovt["Government Portal Router (/api/government/*)"]
        RouterAdmin["Super Admin Router (/api/admin/*)"]
        RouterAuth["Auth & User Profile Router (/api/auth/*, /api/user/*)"]
        RouterLoc["Location & Notifications Router (/api/location/*, /api/notifications/*)"]
    end

    subgraph Intelligence_Core["Multi-Agent Autonomous Orchestrator"]
        LangLayer["Language Layer (Sarvam Saaras STT, NMT, Romanized Indic Parser)"]
        IntentAgent["Intent Classification Agent (Gemini / Claude / Heuristic)"]
        Planner["Deterministic Task Planner (6 Operational Rules)"]
        
        subgraph Specialized_Agents["11 Domain Specialist AI Agents"]
            WeatherAgent["Weather Agent (INCOIS OSF / Open-Meteo)"]
            RiskAgent["Risk Agent (4-Vector Marine Safety Matrix)"]
            PFZAgent["PFZ Agent (Potential Fishing Zones & Bathymetry)"]
            GeospatialAgent["Geospatial Agent (Geodetic Math & Distance)"]
            BoundaryAgent["Boundary Agent (VLIZ World EEZ v12)"]
            GeofenceAgent["Geofence Agent (IMBL & MPA Buffer Warnings)"]
            HazardAgent["Hazard Agent (Proactive Storm / Swell / Surge Alerts)"]
            OceanAnalyticsAgent["Ocean Analytics Agent (ISRO Chl-a & SST Fronts)"]
            RouteAgent["Route Agent (Safe Navigational Waypoints)"]
            SimulationAgent["Simulation Agent (Counterfactual Sea State Forecasts)"]
        end
        
        RecEngine["Reliable Recommendation & Reasoning Engine"]
        Synthesizer["Contextual Dialogue Synthesizer & Deductive Reasoning"]
    end

    subgraph Data_Providers["Authoritative Data & External Services"]
        INCOIS["INCOIS OSF / THREDDS NCSS"]
        ISRO["ISRO Satellite Ocean Telemetry"]
        OpenMeteo["Open-Meteo Marine Numerical API"]
        VLIZ["Marine Regions / VLIZ World EEZ v12"]
        SarvamService["Sarvam AI (Saaras STT & Bulbul TTS)"]
        BhashiniService["Bhashini Multilingual Platform"]
        RedisCache["Low-Bandwidth Geospatial Cache (Redis / In-Memory)"]
        GeoJSON["Local EEZ, IMBL & MPA GeoJSON Store"]
        PostgreSQL["Database & Persistence (PostgreSQL / SQLite + Alembic)"]
    end

    %% Client to API
    UI -->|REST / JSON| RouterMain
    VoiceInput -->|Audio Bytes / Base64| RouterVoice
    RouterVoice -->|Audio Stream| AudioOutput
    AssistantPanel -->|REST / JSON| RouterMain
    Modals -->|REST Endpoints| API_Gateway

    %% API to Intelligence Core
    RouterMain --> LangLayer
    RouterVoice --> LangLayer
    LangLayer --> IntentAgent
    IntentAgent --> Planner
    Planner --> Specialized_Agents
    
    %% Agents to Data Providers
    WeatherAgent --> INCOIS
    WeatherAgent -.->|Fallback| OpenMeteo
    WeatherAgent --> RedisCache
    OceanAnalyticsAgent --> ISRO
    RiskAgent --> WeatherAgent
    PFZAgent --> RedisCache
    BoundaryAgent --> VLIZ
    BoundaryAgent --> GeoJSON
    GeofenceAgent --> GeoJSON
    LangLayer --> SarvamService
    LangLayer -.->|Fallback| BhashiniService
    API_Gateway --> PostgreSQL

    %% Synthesizer back to Response
    Specialized_Agents --> RecEngine
    RecEngine --> Synthesizer
    Synthesizer --> LangLayer
    LangLayer --> RouterMain
```

---

## 🤖 11-Agent Collaborative Decision Framework

ORCA operates on a deterministic, contract-driven multi-agent architecture where specialist agents execute in parallel to produce verifiable operational guidance.

```mermaid
sequenceDiagram
    autonumber
    actor Fisher as Fisherman / Mariner
    participant API as FastAPI Orchestrator
    participant Lang as Sarvam AI Language Layer
    participant Intent as Intent Classification Agent
    participant Planner as Deterministic Planner
    participant Weather as Weather Agent (INCOIS OSF)
    participant Ocean as Ocean Analytics Agent (ISRO)
    participant Risk as 4-Vector Risk Engine
    participant PFZ as PFZ Advisory Agent
    participant Geofence as Boundary & Geofence Agent
    participant Route as Safe Route Agent
    participant Rec as Recommendation Engine
    participant Synth as Dialogue Synthesizer

    Fisher->>API: Query in Regional Language / Romanized / Voice ("kya main kal fishing ja sakta hoon?")
    API->>Lang: Detect Language & Transcribe (Sarvam Saaras STT + Romanized Indic Analyzer)
    Lang-->>API: English Translation ('Can I go fishing tomorrow?') + Detected Language ('hi')
    API->>Intent: Parse Maritime Intent (safety_check, port_coords, time_offset)
    Intent-->>API: Structured Intent + Resolved Coordinates
    API->>Planner: Generate ExecutionPlan(lat, lon, date, intent)
    Planner-->>API: Execution Tasks List
    
    par Parallel Evidence Retrieval
        API->>Weather: get_marine_conditions(lat, lon, date)
        Weather-->>API: WeatherEvidence (Wave height: 1.05m, Wind: 20.1 km/h WSW, SST: 28.5°C)
        API->>Ocean: analyze_chlorophyll_and_sst(lat, lon)
        Ocean-->>API: OceanAnalyticsEvidence (Chl-a: 0.85 mg/m³, Thermal front: Strong)
        API->>Geofence: evaluate_vessel_geofences(lat, lon)
        Geofence-->>API: BoundaryEvidence (Inside Indian EEZ, 42 km to IMBL, SAFE)
    end
    
    API->>Risk: assess_risk(WeatherEvidence)
    Risk-->>API: RiskEvidence (Verdict: SAFE, 4-Vector scores: Wave=0.2, Wind=0.3, Weather=0.1, Swell=0.2)
    
    opt If Fishing Query or Safe Conditions
        API->>PFZ: get_pfz_zones_evidence(lat, lon)
        PFZ-->>API: PFZEvidence (Shelf Break Zone D: 8.8 km, Bearing: 285°, Kingfish/Seer Fish)
        API->>Route: plan_safe_route(start, destination, hazards)
        Route-->>API: RouteEvidence (Waypoints, Distance: 8.8 km, Skirts shoals)
    end
    
    API->>Rec: generate_recommendations(EvidenceBundle)
    Rec-->>API: Evidence-backed Operational Recommendations + Reasoning Traces
    API->>Synth: Synthesize Dialogue + Evidence Summary + Source Attributions
    Synth-->>API: English Advisory Markdown
    API->>Lang: Translate to Regional Indic Language (Sarvam NMT / Bulbul TTS)
    Lang-->>API: Localized Advisory Response (+ Audio URL if TTS requested)
    API-->>Fisher: QueryResponse (Native Script Text, Risk Tier, PFZ coords, Waypoints, Reasoning Trace)
```

---

## 📁 Repository Structure

```
ORCA/
├── README.md                                   # Master project documentation
├── API_INTEGRATION_CONTRACT.md                 # OpenAPI & data provider specifications
├── FIELD_TESTING_GUIDE.md                      # Coastal field deployment & validation protocols
├── SIH_DEMO_SCRIPT.md                          # Smart India Hackathon guided evaluation script
├── data/
│   ├── geofences/
│   │   └── india_maritime_boundaries.json       # Indian Maritime Boundaries, IMBL & MPAs
│   ├── marine_regions/
│   │   └── eez_mrgid_8480.geojson               # VLIZ World EEZ v12 India GeoJSON cache
│   └── pfz/
│       └── pfz_maharashtra.json                 # INCOIS-derived PFZ coordinates & target species
├── backend/
│   ├── requirements.txt                        # Python backend dependencies
│   ├── pytest.ini                              # Pytest configuration
│   ├── alembic.ini                             # Alembic database migration config
│   ├── benchmark_performance.py                # Latency & throughput benchmarking script
│   ├── alembic/
│   │   └── versions/
│   │       └── 0001_initial_orca_schema.py      # SQLAlchemy schema migration
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                             # FastAPI core application & /query orchestrator
│   │   ├── agents/                             # 11 Domain Specialist AI Agents
│   │   │   ├── __init__.py
│   │   │   ├── boundary_agent.py               # VLIZ EEZ & territorial boundary agent
│   │   │   ├── geofence_agent.py               # IMBL & Marine Protected Area geofence agent
│   │   │   ├── geospatial_agent.py             # Geodetic math & distance calculator
│   │   │   ├── hazard_agent.py                 # Proactive marine hazard detection agent
│   │   │   ├── intent_agent.py                 # Multilingual intent parser & entity resolver
│   │   │   ├── ocean_analytics_agent.py        # ISRO Chlorophyll-a & SST front analytics agent
│   │   │   ├── pfz_agent.py                    # Potential Fishing Zone evidence agent
│   │   │   ├── risk_agent.py                   # Decomposed 4-vector marine safety risk engine
│   │   │   ├── route_agent.py                  # Navigational waypoint routing agent
│   │   │   ├── simulation_agent.py             # Counterfactual "what-if" sea state simulator
│   │   │   └── weather_agent.py                # INCOIS OSF & ocean state collector
│   │   ├── data/                               # Data providers & spatial caching
│   │   │   ├── __init__.py
│   │   │   ├── geofence/                       # Spatial boundary providers
│   │   │   │   ├── base.py
│   │   │   │   └── spatial_provider.py         # Point-in-polygon ray-casting engine
│   │   │   ├── pfz/                            # Potential Fishing Zone data providers
│   │   │   │   ├── base.py
│   │   │   │   └── mock.py                     # INCOIS PFZ dataset provider
│   │   │   └── weather/                        # Marine ocean state providers
│   │   │       ├── base.py                     # Abstract WeatherProvider interface
│   │   │       ├── cache.py                    # 0.05° spatial-binning resilient cache
│   │   │       ├── incois.py                   # Live INCOIS OSF NCSS / THREDDS provider
│   │   │       ├── mock.py                     # MockWeatherProvider for unit tests
│   │   │       └── open_meteo.py               # Open-Meteo Marine numerical model provider
│   │   ├── db/                                 # Database connectivity & models
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── models.py                       # SQLAlchemy ORM entities
│   │   │   └── session.py                      # Database engine & session maker
│   │   ├── models/                             # Pydantic schema contracts
│   │   │   ├── __init__.py
│   │   │   ├── admin_models.py                 # System health & historical comparison models
│   │   │   ├── agent_models.py                 # Structured evidence contracts & risk models
│   │   │   ├── emergency_models.py             # SOS distress & emergency contact schemas
│   │   │   ├── government_models.py            # Government circulars & policy document models
│   │   │   ├── notification_models.py          # Safety notification & hazard alert models
│   │   │   └── user_models.py                  # User profile, auth, & location models
│   │   ├── routers/                            # Dedicated REST API routers
│   │   │   ├── __init__.py
│   │   │   ├── admin.py                        # Super Admin diagnostics & user fleet management
│   │   │   ├── auth.py                         # JWT authentication & user profile endpoints
│   │   │   ├── emergency.py                    # SOS distress broadcasting & MRCC routing
│   │   │   ├── government.py                   # Policy circulars & announcement management
│   │   │   ├── location.py                     # GPS coastal validation & coordinate updates
│   │   │   ├── marine_boundaries.py            # VLIZ World EEZ v12 boundary endpoints
│   │   │   ├── notifications.py                # Safety alerts & notification center
│   │   │   ├── pfz.py                          # PFZ hotspot discovery & analytics
│   │   │   └── voice.py                        # Sarvam AI STT & Bulbul TTS speech endpoints
│   │   └── services/                           # Business logic & external service connectors
│   │       ├── __init__.py
│   │       ├── bhashini.py                     # Bhashini multilingual translation service
│   │       ├── dialogue_synthesizer.py         # Dynamic conversational dialogue synthesizer
│   │       ├── marine_boundaries.py            # WFS client & ray-casting boundary engine
│   │       ├── planner.py                      # Deterministic 6-rule Multi-Agent Task Planner
│   │       ├── recommendation_engine.py        # Reliable recommendation reasoning engine
│   │       ├── sarvam.py                       # Sarvam AI Saaras STT & Bulbul TTS service
│   │       ├── admin/                          # Super Admin health monitoring service
│   │       ├── auth/                           # Password hashing & JWT token service
│   │       ├── emergency/                      # SOS coordinator & MAYDAY VHF script generator
│   │       ├── government/                     # Policy circulars & document repository
│   │       ├── ingestion/                      # INCOIS NetCDF ingestion & caching service
│   │       ├── language/                       # Unified multilingual service layer
│   │       ├── location/                       # Geodetic validation & coastal distance service
│   │       └── notifications/                  # Automated safety alert evaluator
│   └── tests/                                  # 36 Test Modules (254 Unit & Integration Tests)
│       ├── test_admin_and_historical.py
│       ├── test_agent_contracts.py
│       ├── test_assistant_pipeline_comprehensive.py
│       ├── test_auth.py
│       ├── test_bhashini.py
│       ├── test_chat.py
│       ├── test_database.py
│       ├── test_demo_scenario.py
│       ├── test_emergency.py
│       ├── test_geofence.py
│       ├── test_geofence_agent.py
│       ├── test_government.py
│       ├── test_hazard_agent.py
│       ├── test_historical_observations.py
│       ├── test_incois_provider.py
│       ├── test_incois_query.py
│       ├── test_ingestion_service.py
│       ├── test_location_validation.py
│       ├── test_marine_boundaries.py
│       ├── test_marine_cache.py
│       ├── test_marine_endpoints.py
│       ├── test_multilingual_assistant_upgrade.py
│       ├── test_notifications.py
│       ├── test_ocean_analytics_and_isro_queries.py
│       ├── test_pfz_api.py
│       ├── test_planner.py
│       ├── test_query.py
│       ├── test_recommendations_and_reasoning.py
│       ├── test_resilient_cache.py
│       ├── test_risk_engine.py
│       ├── test_route_agent.py
│       ├── test_sarvam_language.py
│       ├── test_sarvam_lid.py
│       ├── test_sarvam_live.py
│       ├── test_simulation_agent.py
│       └── test_weather_provider.py
└── frontend/                                   # React 19 + Vite 8 + Leaflet + Tailwind CSS v4
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx                             # Application root, routing, & state hub
    │   ├── main.tsx                            # React DOM entry point
    │   ├── types.ts                            # Frontend TypeScript interface contracts
    │   ├── i18n.ts                             # 11-language Indic localization dictionary
    │   ├── context/                            # Global state management
    │   │   ├── AppContext.tsx
    │   │   └── GlobalContext.tsx
    │   ├── pages/                              # Dedicated application views
    │   │   ├── LandingPage.tsx                 # Government-grade landing hero with live ticker
    │   │   ├── DashboardPage.tsx               # Tactical ocean state dashboard & telemetry
    │   │   ├── MapPage.tsx                     # Full tactical GIS chart with multi-layer GIS
    │   │   ├── AssistantPage.tsx               # ChatGPT-style maritime copilot with voice STT/TTS
    │   │   ├── AlertsPage.tsx                  # Proactive maritime hazard & IMBL alerts
    │   │   ├── ServicesPage.tsx                # Marine services, emergency SOS & policy circulars
    │   │   ├── SettingsPage.tsx                # Vessel config, 11-language switcher & theme toggle
    │   │   ├── LocationPage.tsx                # GPS coordinate picker & coastal validator
    │   │   ├── AuthPage.tsx                    # User login, registration & role selector
    │   │   ├── TermsPage.tsx                   # Terms of service & maritime advisory disclaimer
    │   │   └── PrivacyPage.tsx                 # Privacy policy & data protection terms
    │   ├── components/                         # Tactical UI & modal components
    │   │   ├── AgentTraceModal.tsx             # Full reasoning trace & source attribution inspector
    │   │   ├── AuthModal.tsx                   # User authentication & registration modal
    │   │   ├── ChatPanel.tsx                   # Conversational drawer with audio recording & TTS
    │   │   ├── ControlBar.tsx                  # Quick actions & port selector bar
    │   │   ├── CurrentMarineStatusCard.tsx     # Ocean state telemetry summary card
    │   │   ├── EmergencySOSModal.tsx           # SOS distress broadcast modal & MAYDAY generator
    │   │   ├── FishAnalyticsModal.tsx          # PFZ species distribution & bathymetry modal
    │   │   ├── ForecastHorizonTimeline.tsx     # Hourly forecast timeline (24h/48h)
    │   │   ├── GisLayersPanel.tsx              # Multi-layer GIS overlay controls
    │   │   ├── GovernmentPortalModal.tsx       # Gazette notices & policy document viewer
    │   │   ├── LanguageSelectorModal.tsx       # Indic regional language selector modal
    │   │   ├── LocationPermissionModal.tsx     # GPS permission & coastal verification
    │   │   ├── MarineMap.tsx                   # Leaflet nautical chart with dynamic GIS layers
    │   │   ├── MarineMetricsGrid.tsx           # Oceanographic telemetry grid
    │   │   ├── MobileBottomNav.tsx             # Mobile bottom tab navigation
    │   │   ├── NotificationCenterModal.tsx     # Safety alerts center modal
    │   │   ├── QuickPromptsGrid.tsx            # High-frequency operational prompt shortcuts
    │   │   ├── SuperAdminModal.tsx             # Fleet management & historical telemetry comparison
    │   │   ├── TerminologyExplainerModal.tsx   # Oceanographic terminology glossary
    │   │   └── TopHeader.tsx                   # Global navigation header with live badges
    │   ├── components/orca/                    # ORCA AppShell design system components
    │   │   ├── AppShell.tsx                    # Responsive navigation frame & header
    │   │   ├── CoastMap.tsx                    # Coastal locator map
    │   │   ├── Conditions.tsx                  # MetOcean conditions summary badge
    │   │   ├── LanguageMenu.tsx                # Dropdown language selector
    │   │   ├── Logo.tsx                        # Official ORCA brand logo
    │   │   ├── MapPanel.tsx                    # Integrated map container
    │   │   ├── MarkdownRenderer.tsx            # Formatted markdown renderer (headings, bold, lists)
    │   │   ├── OceanWavesCanvas.tsx            # High-fidelity realistic ocean swell canvas
    │   │   ├── SafetyStatus.tsx                # Operational safety badge
    │   │   └── ThemeToggle.tsx                 # Dark/light mode switcher
    │   ├── lib/orca/                           # Utility libraries & custom React hooks
    │   │   ├── assistant.ts                    # Assistant messaging helpers
    │   │   ├── alerts.ts                       # Safety alerts logic
    │   │   ├── geo.ts                          # Geodesic calculation utilities
    │   │   ├── i18n.tsx                        # React i18n context provider
    │   │   ├── marine.ts                       # Oceanographic math & conversions
    │   │   ├── reference.ts                    # Maritime reference standards
    │   │   ├── session.tsx                     # Session state provider
    │   │   ├── theme.tsx                       # Theme mode provider
    │   │   ├── types.ts                        # Domain interfaces
    │   │   └── use-marine.ts                   # Custom marine data fetching hook
    │   └── services/
    │       └── api.ts                          # Axios/Fetch API client for ORCA backend
```

---

## 📡 Complete REST API Reference

The backend provides interactive OpenAPI documentation at `/docs` (Swagger UI) and `/redoc`.

### 1. Operational Advisory & Conversational Copilot

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/query` | Executes full multi-agent workflow: intent classification, planning, parallel retrieval, risk synthesis, recommendations, and Indic translation. |
| `POST` | `/api/chat` | Multi-turn conversational chat with session memory, Romanized Indic script understanding, language persistence, and structured reasoning. |
| `POST` | `/api/demo/dahanu` | SIH Guided Demo Endpoint: executes the signature Dahanu multi-agent PFZ + safety + safe route scenario. |
| `POST` | `/api/simulate` | Counterfactual "what-if" scenario simulation (evaluates impact of simulated delta wave/wind on voyage safety). |
| `GET` | `/` | Service health status, active upstream providers, and registered endpoints. |
| `GET` | `/health` | Health check probe for container orchestrators. |

#### Example `/query` Request:

```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {"lat": 18.9220, "lon": 72.8347},
    "date": "2026-08-27",
    "question": "ક્યાં માછીમારી કરવી સુરક્ષિત છે અને નજીકના ઝોન કયા છે?",
    "language": "gu"
  }'
```

#### Example `/query` Response:

```json
{
  "answer": "તારીખ 2026-08-27 ના રોજ (18.9220, 72.8347) માટે ઓપરેશનલ સલાહ:\n\n✅ સમુદ્રની સ્થિતિ નેવિગેશન અને માછીમારી માટે સુરક્ષિત (SAFE) છે (તરંગ ઊંચાઈ: 1.05m, પવન ગતિ: 20.1 km/h).\n\nનજીકના સંભવિત માછીમારી ઝોન (PFZ):\n• Shelf Break Zone D: 8.8 km દૂર (દિશામાન: 285°, ઊંડાઈ: ~65m, મુખ્ય માછલી: કિંગફિશ અને સુરમાઈ)\n• Chlorophyll Bloom Zone B: 12.3 km દૂર (ઊંડાઈ: ~45m, મુખ્ય માછલી: તારલી અને ઓલીયા)\n\nભલામણ કરેલ સુરક્ષિત નેવિગેશન માર્ગ: પશ્ચિમ-દક્ષિણપશ્ચિમ તરફ સલામત નેવિગેશન વેપોઇન્ટ્સ અનુસરો.",
  "language": "gu",
  "language_name": "Gujarati",
  "original_question": "ક્યાં માછીમારી કરવી સુરક્ષિત છે અને નજીકના ઝોન કયા છે?",
  "english_question": "Where is it safe to fish and what are the nearest zones?",
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
    "wind_direction_deg": 245.0,
    "sea_surface_temperature_c": 28.5,
    "forecast": "clear",
    "source": "INCOIS_OSF_LIVE",
    "is_mock": false,
    "cache_status": "live"
  },
  "nearest_pfz": [
    {
      "name": "Shelf Break Zone D",
      "latitude": 18.9612,
      "longitude": 72.8941,
      "distance_km": 8.8,
      "bearing_deg": 285.0,
      "depth_m": 65,
      "species": ["Kingfish", "Seer Fish"]
    }
  ],
  "reasoning": [
    "Language Layer (Sarvam AI): Identified query language as 'Gujarati' (gu-IN, script: Gujr). Translated to English: 'Where is it safe to fish and what are the nearest zones?'.",
    "Intent Agent: Detected intent 'safety_check' with location hint 'Mumbai' (18.9220°N, 72.8347°E).",
    "Deterministic Planner: Generated execution plan with 5 tasks (weather, risk, pfz, boundary, route).",
    "Weather Agent (INCOIS): Retrieved ocean state forecast (wave_height=1.05m, wind_speed=20.1 km/h, SST=28.5°C).",
    "Risk Agent: Assessed composite marine risk as 'SAFE' across all 4 physical vectors.",
    "PFZ Agent: Identified 3 active Potential Fishing Zones. Nearest: Shelf Break Zone D (8.8 km).",
    "Boundary Agent (VLIZ): Verified coordinates are inside Indian EEZ (distance to border: 185 km).",
    "Reliable Recommendation Engine: Generated 2 evidence-backed operational recommendations.",
    "Dialogue Synthesizer: Synthesized structured advisory combining safety verdict, weather metrics, and PFZ coordinates.",
    "Language Layer: Translated synthesized advisory into native Gujarati."
  ],
  "sources_used": [
    "sarvam_ai_language_service",
    "bhashini_multilingual_service",
    "intent_agent",
    "planner",
    "incois_osf_provider",
    "risk_assessment_agent",
    "pfz_provider",
    "marine_boundaries_service",
    "route_agent"
  ]
}
```

---

### 2. Marine Conditions & Ocean State Telemetry

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/marine/conditions?lat=18.922&lon=72.834` | Returns normalized Significant Wave Height ($HS$), wind vectors, SST, visibility, and tidal state. |
| `GET` | `/api/marine/risk?lat=18.922&lon=72.834` | Evaluates decomposed 4-vector environmental risk matrix with trend diagnosis. |
| `GET` | `/api/marine/forecast?lat=18.922&lon=72.834` | Returns hourly forecast horizon (24h/48h) for wave and wind conditions. |
| `GET` | `/api/marine/historical-comparison?lat=18.922&lon=72.834&period_hours=24` | Before-vs-After oceanographic comparison metrics and variance analysis. |

---

### 3. Voice & Multilingual Speech (Sarvam AI / Bhashini)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/voice/transcribe` | Transcribes uploaded multipart audio file via **Sarvam Saaras STT** (supports 22+ Indic languages). |
| `POST` | `/api/voice/transcribe-base64` | Transcribes Base64-encoded audio payload from web/mobile clients. |
| `POST` | `/api/voice/speak` | Synthesizes regional Indic speech using **Sarvam Bulbul v3** neural voices (*Meera*, *Arvind*, *Kavya*). |
| `GET` | `/api/voice/speakers` | Lists available Sarvam voice personas and supported language mappings. |
| `GET` | `/api/languages` | Returns list of supported Indian coastal languages. |
| `POST` | `/api/detect-language` | Detects language of input text with ISO and BCP-47 codes. |
| `POST` | `/api/translate` | Translates text between Indic languages and English. |

---

### 4. Marine Boundaries, EEZ & Geofencing (Marine Regions / VLIZ)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/marine-boundaries/info` | Returns dataset version (`World EEZ v12`), provenance, and WFS endpoint details. |
| `GET` | `/api/marine-boundaries/eez?mrgid=8480` | Returns GeoJSON FeatureCollection for the Indian Exclusive Economic Zone. |
| `GET` | `/api/marine-boundaries/check?lat=18.922&lon=72.500` | Evaluates coordinates, distance to boundary, and geofence status (`SAFE`, `WARNING`, `CRITICAL`). |
| `POST` | `/api/marine-boundaries/check` | JSON POST evaluation for vessel coordinate monitoring. |
| `GET` | `/api/geofences?lat=18.922&lon=72.500` | Returns spatial evaluation for all registered maritime boundaries, IMBL buffer zones, and MPAs. |

---

### 5. Emergency SOS & Maritime Search and Rescue (SAR)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/emergency/contacts?region=Maharashtra` | Returns official 24x7 distress helplines (Coast Guard 1554, Coastal Police 1093, NDRF 1078, MRCC desks). |
| `POST` | `/api/emergency/sos` | Broadcasts instant SOS distress signal with MRCC routing and automated IMO MAYDAY VHF Channel 16 script generation. |
| `GET` | `/api/emergency/sos/active` | Lists active SOS distress beacons for maritime search & rescue monitoring desks. |

#### Example `/api/emergency/sos` Payload:

```json
{
  "vessel_id": "IND-MH-01-9823",
  "vessel_name": "Matsya Kanya III",
  "lat": 18.7502,
  "lon": 72.4105,
  "nature_of_distress": "Engine Failure & Flooding in Rough Seas",
  "persons_on_board": 5,
  "emergency_contact": "+91 98765 43210"
}
```

---

### 6. Government Circulars & Fisheries Policy Portal

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/government/announcements?state=Gujarat` | Lists official circulars from Ministry of Fisheries, Coast Guard, IMD, and State departments. |
| `GET` | `/api/government/announcements/{id}` | Retrieves full gazette text, validity period, and category metadata for an announcement. |
| `POST` | `/api/government/announcements` | Publishes a new government circular (Requires `GOVERNMENT` or `SUPER_ADMIN` role). |
| `GET` | `/api/government/documents` | Returns official policy handbooks, PMMSY guidelines, and maritime regulations. |

---

### 7. Super Admin Diagnostics & Fleet Operations

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/system-health` | Returns real-time service health, upstream latencies (INCOIS, Open-Meteo, Sarvam AI, Redis), memory usage, and uptime. |
| `GET` | `/api/admin/users` | Lists registered fishermen, mariners, and officials. |
| `PATCH` | `/api/admin/users/{user_id}/role` | Updates account role (`USER`, `GOVERNMENT`, `SUPER_ADMIN`). |

---

### 8. Location & Safety Notifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/location/validate` | Validates GPS coordinates against India boundary and coastal belt ($\le 100\text{ km}$). |
| `POST` | `/api/location/update` | Updates active vessel location for session. |
| `GET` | `/api/notifications` | Retrieves active safety alerts (IMBL warnings, storm alerts, MPA notifications). |
| `PATCH` | `/api/notifications/{id}/read` | Marks a specific notification as read. |
| `POST` | `/api/notifications/read-all` | Marks all notifications as read for current user. |
| `POST` | `/api/notifications/check` | Evaluates coordinates against safety thresholds and returns fresh alerts. |

---

## 🛡️ Risk Assessment Rules & Operational Thresholds

ORCA evaluates four independent physical risk vectors to construct the composite risk verdict:

| Metric | Safe Tier (🟢) | Caution Tier (🟡) | Unsafe Tier (🔴) | Severe / Storm Tier (🚨) |
| :--- | :--- | :--- | :--- | :--- |
| **Significant Wave Height ($HS$)** | $\le 1.5\text{ m}$ | $1.5\text{ m} < HS \le 2.5\text{ m}$ | $2.5\text{ m} < HS \le 4.0\text{ m}$ | $> 4.0\text{ m}$ |
| **Wind Speed** | $\le 40\text{ km/h}$ ($\le 11\text{ m/s}$) | $40\text{ km/h} < W \le 50\text{ km/h}$ | $50\text{ km/h} < W \le 65\text{ km/h}$ | $> 65\text{ km/h}$ ($> 18\text{ m/s}$) |
| **Swell Period ($T_p$)** | $6\text{s} - 12\text{s}$ (Normal) | $12\text{s} - 16\text{s}$ (High Energy) | $> 16\text{s}$ (Heavy Long Swell) | Severe breaker hazard |
| **Forecast State** | `clear`, `calm` | `choppy`, `moderate`, `rainy` | `squally`, `rough`, `stormy` | `cyclonic`, `gale` |
| **Recommended Action** | Normal operations permitted. | Small craft exercise caution; remain within 10 NM. | Strictly discourage sailing; recall vessels. | Complete harbour shutdown; deploy SAR standby. |

---

## 🌐 Supported Indian Coastal Languages

| Language Code | Language Name | Native Script | Voice STT (Saaras) | Voice TTS (Bulbul) | NMT Translation | Romanized Indic |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `gu` | Gujarati | ગુજરાતી | ✅ | ✅ | ✅ | ✅ |
| `hi` | Hindi | हिन्दी | ✅ | ✅ | ✅ | ✅ |
| `mr` | Marathi | मराठी | ✅ | ✅ | ✅ | ✅ |
| `ta` | Tamil | தமிழ் | ✅ | ✅ | ✅ | ✅ |
| `te` | Telugu | తెలుగు | ✅ | ✅ | ✅ | ✅ |
| `ml` | Malayalam | മലയാളം | ✅ | ✅ | ✅ | ✅ |
| `bn` | Bengali | বাংলা | ✅ | ✅ | ✅ | ✅ |
| `or` / `od` | Odia | ଓડ଼િଆ | ✅ | ✅ | ✅ | ✅ |
| `kn` | Kannada | ಕನ್ನಡ | ✅ | ✅ | ✅ | ✅ |
| `pa` | Punjabi | ਪੰਜਾਬੀ | ✅ | ✅ | ✅ | ✅ |
| `en` | English | English | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Getting Started & Setup Guide

### Prerequisites

- **Python 3.10+** (Tested on Python 3.11, 3.12, 3.14)
- **Node.js 18+** & **npm**
- (Optional) **Sarvam AI API Key** for production-grade Indic STT, TTS, and NMT.
- (Optional) **Google Gemini API Key** or **Anthropic API Key** for LLM intent parsing.
- (Optional) **Redis Server** for distributed caching (defaults to high-performance in-memory cache).

> **Zero-Downtime Resilience:** If external API keys or network connections are unavailable, ORCA automatically switches to built-in heuristic intent classification, local Indic translation dictionaries, in-memory spatial caching, and open fallback data providers.

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt
```

#### Environment Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```ini
# ==========================================
# ORCA Marine AI Backend Configuration
# ==========================================

# LLM Providers (Optional - Deterministic rule-based fallback available)
GEMINI_API_KEY=your_gemini_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Sarvam AI Voice & Multilingual Service (Optional - Bhashini/Dictionary fallback available)
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_TIMEOUT_SEC=10.0

# Bhashini / ULCA Credentials (Optional fallback)
# BHASHINI_USER_ID=your_bhashini_user_id
# BHASHINI_API_KEY=your_bhashini_api_key
# BHASHINI_INFERENCE_API_KEY=your_inference_api_key

# INCOIS Ocean State Forecast Settings
INCOIS_BASE_URL=https://incois.gov.in
INCOIS_TIMEOUT_SEC=4.0

# Database & Cache Settings
DATABASE_URL=sqlite:///./orca_marine.db
REDIS_URL=redis://localhost:6379/0

# Security & Coastal Validation
ORCA_JWT_SECRET=orca_marine_ai_jwt_secret_key_sih_2026_coastal_safety
ORCA_INTELLIGENCE_RADIUS_KM=100.0
```

#### Database Setup (Optional Alembic Migration)

```bash
# Run schema migrations
alembic upgrade head
```

#### Run the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Swagger documentation is at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend tactical GIS dashboard will be live at `http://localhost:5173`.

---

## 🧪 Testing & Quality Assurance

The ORCA backend contains a comprehensive test suite of **254 unit and integration tests across 36 test modules** (100% passing) verifying multi-agent planning, ISRO satellite ocean analytics, PFZ discovery, 4-vector risk assessment, VLIZ EEZ boundary ray-casting, IMBL geofencing, multilingual translations across 11 Indic languages, proactive hazard alerts, Romanized Indic script understanding, and the reliable recommendations & reasoning engine.

```bash
# Run all backend tests
cd backend
python3 -m pytest
```

```
============================= test session starts ==============================
platform darwin -- Python 3.14.4, pytest-9.0.3, pluggy-1.6.0
rootdir: /Users/darshilmodi/Desktop/ORCA/backend
configfile: pytest.ini
testpaths: tests
plugins: langsmith-0.7.26, anyio-4.13.0
collected 254 items

tests/test_admin_and_historical.py .......                               [  2%]
tests/test_agent_contracts.py .....                                      [  4%]
tests/test_assistant_pipeline_comprehensive.py ................          [ 11%]
tests/test_auth.py .......                                               [ 13%]
tests/test_bhashini.py ............                                      [ 18%]
tests/test_chat.py .......                                               [ 21%]
tests/test_database.py ..........                                        [ 25%]
tests/test_demo_scenario.py ....                                         [ 26%]
tests/test_emergency.py ........                                         [ 29%]
tests/test_geofence.py ......                                            [ 32%]
tests/test_geofence_agent.py ....                                        [ 33%]
tests/test_government.py .........                                       [ 37%]
tests/test_hazard_agent.py ...                                           [ 38%]
tests/test_historical_observations.py ...                                [ 39%]
tests/test_incois_provider.py ........                                   [ 42%]
tests/test_incois_query.py .....                                         [ 44%]
tests/test_ingestion_service.py ..                                       [ 45%]
tests/test_location_validation.py .......                                [ 48%]
tests/test_marine_boundaries.py ..........                               [ 52%]
tests/test_marine_cache.py ....                                          [ 53%]
tests/test_marine_endpoints.py .....                                     [ 55%]
tests/test_multilingual_assistant_upgrade.py ................            [ 62%]
tests/test_notifications.py .......                                      [ 64%]
tests/test_ocean_analytics_and_isro_queries.py .............             [ 70%]
tests/test_pfz_api.py ..                                                 [ 70%]
tests/test_planner.py ......                                             [ 73%]
tests/test_query.py ......                                               [ 75%]
tests/test_recommendations_and_reasoning.py .........                    [ 79%]
tests/test_resilient_cache.py .......                                    [ 81%]
tests/test_risk_engine.py ......                                         [ 84%]
tests/test_route_agent.py ..                                             [ 85%]
tests/test_sarvam_language.py .............                              [ 90%]
tests/test_sarvam_lid.py ..............                                  [ 95%]
tests/test_sarvam_live.py ....                                           [ 97%]
tests/test_simulation_agent.py ..                                        [ 98%]
tests/test_weather_provider.py .....                                     [100%]

================== 254 passed, 1 warning in 198.05s (0:03:18) ==================
```

---

## 🏛️ Institutional Data Attributions

- **INCOIS (Indian National Centre for Ocean Information Services)**: Ministry of Earth Sciences, Govt. of India (Ocean State Forecast WW3 NCSS services & Potential Fishing Zone advisories).
- **ISRO (Indian Space Research Organisation)**: Oceansat-2 / INSAT-3D ocean color, chlorophyll density, and thermal sensor observations.
- **Marine Regions / Flanders Marine Institute (VLIZ)**: World EEZ v12 dataset (MRGID 8480, Creative Commons Attribution 4.0 International).
- **Sarvam AI**: Saaras Speech-to-Text & Bulbul Neural Text-to-Speech models for Indian regional languages.
- **Digital India Bhashini Division**: Ministry of Electronics and Information Technology (MeitY), Govt. of India.
- **Open-Meteo**: Global marine weather numerical models (Copernicus Marine / ECMWF).

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.


