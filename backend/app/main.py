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
from app.routers.pfz import router as pfz_router
from app.services.planner import ExecutionPlan, Planner

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

# Include API routers
app.include_router(pfz_router)


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
    plan: ExecutionPlan


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "ORCA Marine AI Backend",
        "endpoints": ["/query", "/api/pfz"],
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

    # Step 2: Generate execution plan via deterministic Planner
    plan = Planner.plan(
        question=question,
        intent=detected_intent,
        lat=lat,
        lon=lon,
        date=date,
    )
    sources_used.append("planner")

    task_signatures = [f"{t.agent}:{t.action}" for t in plan.tasks]
    if task_signatures:
        reasoning.append(
            f"Generated execution plan with {len(plan.tasks)} task(s): {', '.join(task_signatures)}."
        )
    else:
        reasoning.append(
            f"Generated execution plan (0 tasks): no operational retrieval tasks required for '{detected_intent}' intent."
        )

    # Inspect planned tasks
    needs_weather = any(t.agent == "weather_agent" and t.action == "get_marine_conditions" for t in plan.tasks)
    needs_risk = any(t.agent == "risk_agent" and t.action == "assess_risk" for t in plan.tasks)
    needs_pfz = any(t.agent == "pfz_agent" and t.action == "find_nearest_zones" for t in plan.tasks)
    needs_geospatial = any(t.agent == "geospatial_agent" and t.action == "calculate_distance" for t in plan.tasks)

    weather_data = None
    risk_assessment = None
    pfz_zones = None
    executed_tasks: List[str] = []
    skipped_tasks: List[str] = []

    # Step 3: Execute planned tasks and collect evidence
    # 3a. Weather conditions
    if needs_weather:
        weather_data = weather_provider.get_weather(lat=lat, lon=lon, date=date)
        sources_used.append("mock_marine_weather")
        executed_tasks.append("weather_agent:get_marine_conditions")
        wave_h = weather_data.get("wave_height_m", 0.0)
        wind_spd = weather_data.get("wind_speed_kmh", 0.0)
        forecast = weather_data.get("forecast", "unknown")
        reasoning.append(
            f"Evidence (weather_agent): marine forecast='{forecast}', wave_height={wave_h}m, wind_speed={wind_spd} km/h."
        )
    else:
        skipped_tasks.append("weather_agent:get_marine_conditions")

    # 3b. Risk assessment
    if needs_risk:
        if weather_data is None:
            weather_data = weather_provider.get_weather(lat=lat, lon=lon, date=date)
            sources_used.append("mock_marine_weather")
        risk_assessment = assess_risk(weather_data)
        sources_used.append("risk_assessment_agent")
        executed_tasks.append("risk_agent:assess_risk")
        risk_level = risk_assessment["level"]
        risk_reason = risk_assessment["reason"]
        reasoning.append(
            f"Evidence (risk_agent): assessed safety risk as '{risk_level.upper()}' -> {risk_reason}."
        )
    else:
        skipped_tasks.append("risk_agent:assess_risk")

    # 3c. Potential fishing zones & geospatial calculation
    if needs_pfz:
        pfz_zones = pfz_provider.get_pfz_zones(lat=lat, lon=lon)
        sources_used.append("incois_derived_pfz_dataset")
        executed_tasks.append("pfz_agent:find_nearest_zones")

        if needs_geospatial:
            sources_used.append("geospatial_agent")
            executed_tasks.append("geospatial_agent:calculate_distance")

        nearest_zones_desc = ", ".join(
            [f"{z['name']} ({z['distance_km']} km away, {z['dominant_species']})" for z in pfz_zones[:2]]
        )
        reasoning.append(
            f"Evidence (pfz_agent & geospatial_agent): identified {len(pfz_zones)} Potential Fishing Zones. Nearest: {nearest_zones_desc}."
        )
    else:
        skipped_tasks.append("pfz_agent:find_nearest_zones")
        skipped_tasks.append("geospatial_agent:calculate_distance")

    # Record summary of executed and skipped tasks
    if executed_tasks:
        reasoning.append(f"Executed tasks: {', '.join(executed_tasks)}.")
    if skipped_tasks and plan.tasks:
        reasoning.append(f"Skipped capabilities not requested: {', '.join(skipped_tasks)}.")

    # Step 4: Synthesize operational response from executed evidence
    answer_parts = [
        f"Operational Advisory for ({lat:.4f}, {lon:.4f}) on {date}:"
    ]

    if risk_assessment:
        risk_level = risk_assessment["level"]
        risk_reason = risk_assessment["reason"]
        wave_h = weather_data["wave_height_m"]
        wind_spd = weather_data["wind_speed_kmh"]
        forecast = weather_data["forecast"]

        if risk_level == "unsafe":
            answer_parts.append(
                f"⚠️ Sea conditions are UNSAFE ({forecast}, wave height {wave_h}m, wind speed {wind_spd} km/h). {risk_reason}"
            )
        elif risk_level == "caution":
            answer_parts.append(
                f"⚠️ CAUTION ADVISED: {risk_reason} (Wave height: {wave_h}m, Wind: {wind_spd} km/h, Forecast: {forecast})."
            )
        else:
            answer_parts.append(
                f"✅ Conditions are SAFE for navigation and fishing ({forecast} weather, wave height {wave_h}m, wind speed {wind_spd} km/h)."
            )
    elif weather_data:
        wave_h = weather_data["wave_height_m"]
        wind_spd = weather_data["wind_speed_kmh"]
        forecast = weather_data["forecast"]
        temp_c = weather_data.get("temperature_c", "N/A")
        vis_km = weather_data.get("visibility_km", "N/A")
        answer_parts.append(
            f"Marine Weather Conditions:\n- Forecast: {forecast.capitalize()}\n- Wave Height: {wave_h}m\n- Wind Speed: {wind_spd} km/h\n- Temperature: {temp_c}°C\n- Visibility: {vis_km} km"
        )

    if pfz_zones:
        risk_level = risk_assessment.get("level") if risk_assessment else "safe"
        if risk_level == "unsafe":
            answer_parts.append(
                "Due to hazardous marine conditions, traveling to fishing zones is not recommended at this time."
            )
        else:
            pfz_text_lines = [
                f"- {z['name']}: {z['distance_km']} km away at ({z['lat']}, {z['lon']}), depth ~{z['depth_m']}m, likely species: {z['dominant_species']}"
                for z in pfz_zones
            ]
            answer_parts.append("Nearby Potential Fishing Zones (PFZ):\n" + "\n".join(pfz_text_lines))

    if not weather_data and not pfz_zones:
        answer_parts.append(
            "ORCA Marine AI is standing by. You can ask for navigational safety assessments (e.g., 'Is it safe to sail today?'), potential fishing zones (e.g., 'Where is the nearest PFZ?'), or marine weather forecasts."
        )

    answer = "\n\n".join(answer_parts)
    reasoning.append("Synthesized operational response based on executed agent evidence.")

    return QueryResponse(
        answer=answer,
        reasoning=reasoning,
        sources_used=sources_used,
        plan=plan,
    )
