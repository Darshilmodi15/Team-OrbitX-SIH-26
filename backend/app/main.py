"""FastAPI Application for ORCA Marine AI."""
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.intent_agent import parse_intent
from app.agents.pfz_agent import get_pfz_zones_evidence
from app.agents.risk_agent import assess_risk
from app.agents.weather_agent import get_marine_weather
from app.data.pfz.base import PFZProvider
from app.data.pfz.mock import MockPFZProvider
from app.data.weather.base import WeatherProvider
from app.data.weather.mock import MockWeatherProvider
from app.models.agent_models import (
    AgentResult,
    EvidenceBundle,
    PFZEvidence,
    RiskEvidence,
    WeatherEvidence,
)
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
    agent_results: List[AgentResult] = []

    lat = request.location.lat
    lon = request.location.lon
    date = request.date
    question = request.question

    # Step 1: Intent Classification Agent
    intent_res = parse_intent(question)
    sources_used.append("intent_agent")
    detected_intent = intent_res.get("intent", "general")
    location_hint = intent_res.get("location_hint")
    agent_results.append(
        AgentResult(
            agent="intent_agent",
            action="parse_intent",
            success=True,
            evidence=intent_res,
        )
    )

    if location_hint:
        reasoning.append(
            f"Detected intent '{detected_intent}' (location hint: '{location_hint}') for question: '{question}'."
        )
    else:
        reasoning.append(
            f"Detected intent '{detected_intent}' for question: '{question}'."
        )

    # Step 2: Task Planning & Orchestration
    plan = Planner.plan(
        question=question,
        intent=detected_intent,
        lat=lat,
        lon=lon,
        date=date,
    )
    sources_used.append("planner")
    agent_results.append(
        AgentResult(
            agent="planner",
            action="generate_plan",
            success=True,
            evidence={"task_count": len(plan.tasks), "intent": plan.intent},
        )
    )

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

    weather_evidence: Optional[WeatherEvidence] = None
    risk_evidence: Optional[RiskEvidence] = None
    pfz_evidence_list: List[PFZEvidence] = []
    executed_tasks: List[str] = []
    skipped_tasks: List[str] = []

    # Step 3: Execute planned agent tasks
    # 3a. Weather Agent
    if needs_weather:
        weather_evidence = get_marine_weather(
            provider=weather_provider,
            lat=lat,
            lon=lon,
            date=date,
        )
        sources_used.append(weather_evidence.source)
        executed_tasks.append("weather_agent:get_marine_conditions")
        agent_results.append(
            AgentResult(
                agent="weather_agent",
                action="get_marine_conditions",
                success=True,
                evidence=weather_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (weather_agent): marine forecast='{weather_evidence.forecast}', wave_height={weather_evidence.wave_height_m}m, wind_speed={weather_evidence.wind_speed_kmh} km/h."
        )
    else:
        skipped_tasks.append("weather_agent:get_marine_conditions")

    # 3b. Risk Assessment Agent
    if needs_risk:
        if weather_evidence is None:
            weather_evidence = get_marine_weather(
                provider=weather_provider,
                lat=lat,
                lon=lon,
                date=date,
            )
            sources_used.append(weather_evidence.source)
            agent_results.append(
                AgentResult(
                    agent="weather_agent",
                    action="get_marine_conditions",
                    success=True,
                    evidence=weather_evidence.model_dump(),
                )
            )
        risk_evidence = assess_risk(weather_evidence)
        sources_used.append(risk_evidence.source)
        executed_tasks.append("risk_agent:assess_risk")
        agent_results.append(
            AgentResult(
                agent="risk_agent",
                action="assess_risk",
                success=True,
                evidence=risk_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (risk_agent): assessed safety risk as '{risk_evidence.level.upper()}' -> {risk_evidence.reason}."
        )
    else:
        skipped_tasks.append("risk_agent:assess_risk")

    # 3c. PFZ & Geospatial Agents
    if needs_pfz:
        pfz_evidence_list = get_pfz_zones_evidence(
            provider=pfz_provider,
            lat=lat,
            lon=lon,
        )
        sources_used.append("incois_derived_pfz_dataset")
        executed_tasks.append("pfz_agent:find_nearest_zones")
        agent_results.append(
            AgentResult(
                agent="pfz_agent",
                action="find_nearest_zones",
                success=True,
                evidence={"count": len(pfz_evidence_list)},
            )
        )

        if needs_geospatial:
            sources_used.append("geospatial_agent")
            executed_tasks.append("geospatial_agent:calculate_distance")
            agent_results.append(
                AgentResult(
                    agent="geospatial_agent",
                    action="calculate_distance",
                    success=True,
                    evidence={"nearest_km": pfz_evidence_list[0].distance_km if pfz_evidence_list else None},
                )
            )

        nearest_zones_desc = ", ".join(
            [f"{z.name} ({z.distance_km} km away, {', '.join(z.species)})" for z in pfz_evidence_list[:2]]
        )
        reasoning.append(
            f"Evidence (pfz_agent & geospatial_agent): identified {len(pfz_evidence_list)} Potential Fishing Zones. Nearest: {nearest_zones_desc}."
        )
    else:
        skipped_tasks.append("pfz_agent:find_nearest_zones")
        skipped_tasks.append("geospatial_agent:calculate_distance")

    # Construct EvidenceBundle
    evidence_bundle = EvidenceBundle(
        weather=weather_evidence,
        pfz_zones=pfz_evidence_list,
        risk=risk_evidence,
        location_lat=lat,
        location_lon=lon,
        date=date,
    )

    # Record summary of executed and skipped tasks
    if executed_tasks:
        reasoning.append(f"Executed tasks: {', '.join(executed_tasks)}.")
    if skipped_tasks and plan.tasks:
        reasoning.append(f"Skipped capabilities not requested: {', '.join(skipped_tasks)}.")

    # Step 4: Synthesize operational response from EvidenceBundle
    answer_parts = [
        f"Operational Advisory for ({lat:.4f}, {lon:.4f}) on {date}:"
    ]

    if evidence_bundle.risk and evidence_bundle.weather:
        risk_level = evidence_bundle.risk.level
        risk_reason = evidence_bundle.risk.reason
        wave_h = evidence_bundle.weather.wave_height_m
        wind_spd = evidence_bundle.weather.wind_speed_kmh
        forecast = evidence_bundle.weather.forecast

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
    elif evidence_bundle.weather:
        wave_h = evidence_bundle.weather.wave_height_m
        wind_spd = evidence_bundle.weather.wind_speed_kmh
        forecast = evidence_bundle.weather.forecast
        temp_c = evidence_bundle.weather.temperature_c if evidence_bundle.weather.temperature_c is not None else "N/A"
        vis_km = evidence_bundle.weather.visibility_km if evidence_bundle.weather.visibility_km is not None else "N/A"
        answer_parts.append(
            f"Marine Weather Conditions:\n- Forecast: {forecast.capitalize()}\n- Wave Height: {wave_h}m\n- Wind Speed: {wind_spd} km/h\n- Temperature: {temp_c}°C\n- Visibility: {vis_km} km"
        )

    if evidence_bundle.pfz_zones:
        risk_level = evidence_bundle.risk.level if evidence_bundle.risk else "safe"
        if risk_level == "unsafe":
            answer_parts.append(
                "Due to hazardous marine conditions, traveling to fishing zones is not recommended at this time."
            )
        else:
            pfz_text_lines = [
                f"- {z.name}: {z.distance_km} km away at ({z.latitude}, {z.longitude}), depth ~{int(z.depth_m) if z.depth_m is not None else 30}m, likely species: {', '.join(z.species)}"
                for z in evidence_bundle.pfz_zones
            ]
            answer_parts.append("Nearby Potential Fishing Zones (PFZ):\n" + "\n".join(pfz_text_lines))

    if not evidence_bundle.weather and not evidence_bundle.pfz_zones:
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
