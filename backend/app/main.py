"""FastAPI Application for ORCA Marine AI."""
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.intent_agent import parse_intent
from app.agents.risk_agent import assess_risk
from app.data.pfz.base import PFZProvider
from app.data.pfz.mock import MockPFZProvider
from app.data.weather.base import WeatherProvider
from app.data.weather.mock import MockWeatherProvider

# Initialize data providers (can be swapped with real INCOIS/marine dataset providers)
weather_provider: WeatherProvider = MockWeatherProvider()
pfz_provider: PFZProvider = MockPFZProvider()

app = FastAPI(
    title="ORCA Marine AI Backend",
    description="Maritime weather intelligence, safety risk assessment, and potential fishing zones advisory.",
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Location(BaseModel):
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")


class QueryRequest(BaseModel):
    location: Location
    date: str = Field(..., description="Date of forecast / inquiry (e.g. 'YYYY-MM-DD')")
    question: str = Field(..., description="User question or operational query")


class QueryResponse(BaseModel):
    answer: str
    reasoning: List[str]
    sources_used: List[str]


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "ORCA Marine AI Backend",
        "endpoints": ["/query"],
    }


@app.post("/query", response_model=QueryResponse)
def handle_query(request: QueryRequest) -> QueryResponse:
    reasoning: List[str] = []
    sources_used: List[str] = []

    lat = request.location.lat
    lon = request.location.lon
    date = request.date
    question = request.question

    # Step 1: Detect user intent
    intent_res = parse_intent(question)
    sources_used.append("intent_agent")
    detected_intent = intent_res.get("intent", "general")
    location_hint = intent_res.get("location_hint")
    if location_hint:
        reasoning.append(
            f"Detected intent '{detected_intent}' (location hint: '{location_hint}') for question: '{question}'."
        )
    else:
        reasoning.append(
            f"Detected intent '{detected_intent}' for question: '{question}'."
        )

    # Step 2: Query ingestion
    reasoning.append(
        f"Parsed query for location ({lat:.4f}, {lon:.4f}) on date '{date}'. Question: '{question}'."
    )

    # Step 3: Retrieve marine weather data
    weather_data = weather_provider.get_weather(lat=lat, lon=lon, date=date)
    sources_used.append("mock_weather_service")
    wave_h = weather_data["wave_height_m"]
    wind_spd = weather_data["wind_speed_kmh"]
    forecast = weather_data["forecast"]
    reasoning.append(
        f"Retrieved marine weather data: forecast='{forecast}', wave_height={wave_h}m, wind_speed={wind_spd} km/h."
    )

    # Step 4: Run risk assessment agent
    risk_assessment = assess_risk(weather_data)
    sources_used.append("risk_assessment_agent")
    risk_level = risk_assessment["level"]
    risk_reason = risk_assessment["reason"]
    reasoning.append(
        f"Assessed marine risk level as '{risk_level.upper()}': {risk_reason}"
    )

    # Step 5: Retrieve potential fishing zones (PFZ)
    pfz_zones = pfz_provider.get_pfz_zones(lat=lat, lon=lon)
    sources_used.append("mock_pfz_service")
    nearest_zones_desc = ", ".join(
        [f"{z['name']} ({z['distance_km']} km away, {z['dominant_species']})" for z in pfz_zones[:2]]
    )
    reasoning.append(
        f"Identified {len(pfz_zones)} Potential Fishing Zones (PFZ). Nearest: {nearest_zones_desc}."
    )

    # Step 6: Formulate final answer based on safety risk & query context
    if risk_level == "unsafe":
        safety_summary = f"⚠️ Sea conditions are UNSAFE ({forecast}, wave height {wave_h}m, wind speed {wind_spd} km/h). {risk_reason}"
    elif risk_level == "caution":
        safety_summary = f"⚠️ CAUTION ADVISED: {risk_reason} (Wave height: {wave_h}m, Wind: {wind_spd} km/h, Forecast: {forecast})."
    else:
        safety_summary = f"✅ Conditions are SAFE for navigation and fishing ({forecast} weather, wave height {wave_h}m, wind speed {wind_spd} km/h)."

    # Format PFZ details
    pfz_text_lines = [
        f"- {z['name']}: {z['distance_km']} km away at ({z['lat']}, {z['lon']}), depth ~{z['depth_m']}m, likely species: {z['dominant_species']}"
        for z in pfz_zones
    ]
    pfz_summary = "Nearby Potential Fishing Zones (PFZ):\n" + "\n".join(pfz_text_lines)

    # Combine into comprehensive response
    answer_parts = [
        f"Operational Advisory for ({lat:.4f}, {lon:.4f}) on {date}:",
        safety_summary,
        pfz_summary if risk_level != "unsafe" else "Due to hazardous marine conditions, traveling to fishing zones is not recommended at this time.",
    ]

    answer = "\n\n".join(answer_parts)
    reasoning.append("Synthesized advisory answer combining safety verdict, weather metrics, and fishing zone data.")

    return QueryResponse(
        answer=answer,
        reasoning=reasoning,
        sources_used=sources_used,
    )
