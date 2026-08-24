# ORCA Marine AI 🌊⚓

**ORCA Marine AI** is an intelligent maritime advisory platform that delivers real-time marine weather intelligence, navigational safety risk assessments, and Potential Fishing Zone (PFZ) advisories for artisanal fishermen and commercial mariners.

---

## 🌟 Key Features

- **🧠 Intent Classification Agent**: Powered by Google Gemini (`gemini-2.5-flash`) or Anthropic Claude (`claude-sonnet-4-6`), queries are classified into domain intents (`safety_check`, `nearest_pfz`, `weather_conditions`, `general`) with automatic geographic location hint extraction.
- **🛡️ Marine Safety Risk Assessment Agent**: Evaluates complex marine conditions (wave heights, wind speeds, squall/storm risks) into clear risk tiers (`SAFE`, `CAUTION`, `UNSAFE`) with operational guidance.
- **🐟 Potential Fishing Zones (PFZ) Advisory**: Identifies thermal fronts, chlorophyll blooms, shelf breaks, and upwelling regions with distance calculations, depth estimates, and dominant target species.
- **🔍 Full Reasoning Trace & Source Attribution**: Every advisory response includes an end-to-end reasoning trace and attribution of all services and agents consulted.
- **⚡ High-Performance FastAPI Backend**: RESTful API with automated OpenAPI docs, CORS support, and Pydantic data validation.

---

## 🏗️ Architecture & Pipeline

```mermaid
flowchart TD
    A[User Operational Query] --> B[FastAPI Endpoint: /query]
    B --> C[Intent Classification Agent<br/>Gemini / Claude / Heuristic Fallback]
    C --> D[Deterministic Planner / Orchestrator<br/>Generates Structured ExecutionPlan]
    D --> E{Execute Planned Tasks}
    E -->|weather_agent| F[Marine Weather Provider]
    E -->|risk_agent| G[Risk Assessment Agent]
    E -->|pfz_agent & geospatial_agent| H[PFZ Provider & Distance Engine]
    F --> I[Evidence Layer]
    G --> I
    H --> I
    I --> J[Response Synthesizer<br/>Actionable Verdict + PFZ Coordinates + Reasoning Trace + Plan]
    J --> K[API Response: QueryResponse]
```

---

## 📁 Repository Structure

```
ORCA/
├── README.md                           # Project documentation
├── data/
│   └── pfz/
│       └── pfz_maharashtra.json        # INCOIS-derived PFZ dataset
├── backend/
│   ├── requirements.txt                # Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application & /query orchestrator
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── intent_agent.py         # Intent parsing agent
│   │   │   └── risk_agent.py           # Marine safety risk evaluation agent
│   │   ├── data/
│   │   │   ├── __init__.py             # Provider exports
│   │   │   ├── weather/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py             # Abstract WeatherProvider interface
│   │   │   │   └── mock.py             # MockWeatherProvider implementation
│   │   │   └── pfz/
│   │   │       ├── __init__.py
│   │   │       ├── base.py             # Abstract PFZProvider interface
│   │   │       └── mock.py             # MockPFZProvider implementation
│   │   └── services/
│   │       ├── __init__.py
│   │       └── planner.py              # Deterministic multi-agent Planner
│   └── tests/
│       ├── __init__.py
│       ├── test_planner.py             # Planner unit tests (6 rules)
│       └── test_query.py               # End-to-end /query integration tests
└── frontend/                           # Client interface directory
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Gemini API Key (Free tier from [Google AI Studio](https://aistudio.google.com/app/apikey)) or Anthropic API Key

### 1. Clone & Setup Environment

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in `backend/`:

```bash
# Using Google Gemini API (Free Tier)
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# Alternatively, using Anthropic API
# echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here" > .env
```

> **Note:** If no API key is provided, the intent agent automatically falls back to built-in heuristic pattern matching to ensure zero downtime.

### 3. Run the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive Swagger API docs are accessible at `http://localhost:8000/docs`.

### 4. Test with cURL

```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {"lat": 18.9220, "lon": 72.8347},
    "date": "2026-08-24",
    "question": "Is it safe to fish near Mumbai today, and where are the closest fishing spots?"
  }'
```

---

## 📡 API Reference

### Health Check
- **Endpoint:** `GET /`
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "ORCA Marine AI Backend",
    "endpoints": ["/query"]
  }
  ```

---

### Marine Advisory Query
- **Endpoint:** `POST /query`
- **Request Body:**
  ```json
  {
    "location": {
      "lat": 18.9220,
      "lon": 72.8347
    },
    "date": "2026-08-24",
    "question": "Is it safe to fish near Mumbai today, and where are the closest fishing spots?"
  }
  ```

- **Response:**
  ```json
  {
    "answer": "Operational Advisory for (18.9220, 72.8347) on 2026-08-24:\n\n✅ Conditions are SAFE for navigation and fishing (clear weather, wave height 1.05m, wind speed 20.1 km/h).\n\nNearby Potential Fishing Zones (PFZ):\n- Shelf Break Zone D: 8.8 km away at (18.9612, 72.8941), depth ~65m, likely species: Kingfish & Seer Fish\n- Chlorophyll Bloom Zone B: 12.3 km away at (18.8351, 72.7812), depth ~45m, likely species: Sardines & Anchovies",
    "reasoning": [
      "Detected intent 'safety_check' (location hint: 'Mumbai') for question: 'Is it safe to fish near Mumbai today, and where are the closest fishing spots?'.",
      "Parsed query for location (18.9220, 72.8347) on date '2026-08-24'. Question: 'Is it safe to fish near Mumbai today, and where are the closest fishing spots?'.",
      "Retrieved marine weather data: forecast='clear', wave_height=1.05m, wind_speed=20.1 km/h.",
      "Assessed marine risk level as 'SAFE': SAFE CONDITIONS: Wave height is 1.05m (<=1.5m), wind speed is 20.1 km/h (<=40 km/h), with clear forecast. Normal marine and fishing activities may proceed.",
      "Identified 3 Potential Fishing Zones (PFZ). Nearest: Shelf Break Zone D (8.8 km away, Kingfish & Seer Fish), Chlorophyll Bloom Zone B (12.3 km away, Sardines & Anchovies).",
      "Synthesized advisory answer combining safety verdict, weather metrics, and fishing zone data."
    ],
    "sources_used": [
      "intent_agent",
      "mock_weather_service",
      "risk_assessment_agent",
      "mock_pfz_service"
    ]
  }
  ```

---

## 🎯 Intent Classification Types

| Intent Type | Description |
| :--- | :--- |
| `safety_check` | Queries asking if sea conditions are safe to navigate, sail, or fish. |
| `nearest_pfz` | Queries looking for potential fishing zones, fish aggregations, or productive spots. |
| `weather_conditions` | Queries asking for marine weather forecasts, wind speeds, wave heights, or sea states. |
| `general` | General maritime questions, navigational inquiries, or greetings. |

---

## 🛡️ Risk Assessment Rules

| Risk Level | Threshold Criteria | Recommended Action |
| :--- | :--- | :--- |
| **UNSAFE** | Wave height > 2.5m **OR** wind speed > 50 km/h **OR** `stormy` forecast | Strictly discourage sailing; do not venture to fishing zones. |
| **CAUTION** | Wave height > 1.5m **OR** wind speed > 40 km/h **OR** `rainy` forecast | Small vessels remain near shore; delay departure if necessary. |
| **SAFE** | Wave height ≤ 1.5m **AND** wind speed ≤ 40 km/h **AND** `clear` forecast | Normal maritime and fishing operations may proceed. |

---

## 📄 License

This project is licensed under the MIT License.
