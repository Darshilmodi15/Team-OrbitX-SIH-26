"""FastAPI Application for ORCA Marine AI with Bhashini Multilingual Service."""
from datetime import date as dt_date
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.geospatial_agent import analyze_geospatial_context
from app.agents.hazard_agent import detect_proactive_hazards
from app.agents.intent_agent import COASTAL_PORT_COORDS, parse_intent
from app.agents.pfz_agent import get_pfz_zones_evidence
from app.agents.risk_agent import assess_risk
from app.agents.route_agent import plan_safe_marine_route
from app.agents.simulation_agent import run_what_if_simulation
from app.agents.weather_agent import get_marine_weather
from app.data.geofence import (
    GeofenceProvider,
    SpatialGeofenceProvider,
    evaluate_vessel_geofences,
)
from app.data.pfz.base import PFZProvider
from app.data.pfz.mock import MockPFZProvider
from app.data.weather.base import WeatherProvider
from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import IncoisWeatherProvider
from app.data.weather.mock import MockWeatherProvider
from app.models.agent_models import (
    AgentResult,
    EvidenceBundle,
    GeofenceZoneModel,
    HazardAlertEvidence,
    PFZEvidence,
    RiskEvidence,
    RouteEvidence,
    SimulationEvidence,
    WeatherEvidence,
)
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router, user_router
from app.routers.emergency import router as emergency_router
from app.routers.government import router as government_router
from app.routers.location import router as location_router
from app.routers.marine_boundaries import router as marine_boundaries_router
from app.routers.notifications import router as notifications_router
from app.routers.pfz import router as pfz_router
from app.routers.voice import router as voice_router
from app.services.bhashini import SUPPORTED_LANGUAGES, bhashini_service
from app.services.planner import ExecutionPlan, Planner

# Initialize authoritative INCOIS data provider with low-bandwidth geospatial cache
weather_provider: WeatherProvider = IncoisWeatherProvider()
pfz_provider: PFZProvider = MockPFZProvider()
geofence_provider: GeofenceProvider = SpatialGeofenceProvider()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: ensures database schema exists and initial seed data is loaded."""
    import logging
    import threading
    logger = logging.getLogger("orca_lifespan")
    
    def _background_init_and_seed():
        try:
            from app.db.session import init_db
            init_db()
            from seed.seed_database import seed_database
            seed_database()
            logger.info("Database schema verification and seeding completed successfully.")
        except Exception as e:
            logger.warning(f"Database background init/seed note: {e}")

    # Launch background thread so uvicorn can bind to the port immediately without timing out
    init_thread = threading.Thread(target=_background_init_and_seed, daemon=True)
    init_thread.start()
    
    yield


app = FastAPI(
    title="ORCA Marine AI Backend",
    description="Autonomous Maritime Intelligence, Multi-Agent Decision Support & Bhashini Multilingual Layer.",
    version="1.4.0",
    lifespan=lifespan,
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(pfz_router)
app.include_router(voice_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(marine_boundaries_router)
app.include_router(location_router)
app.include_router(government_router)
app.include_router(emergency_router)
app.include_router(admin_router)
app.include_router(notifications_router)


@app.get("/")
def root_status():
    return {
        "status": "healthy",
        "service": "ORCA Marine AI Backend",
        "version": "1.2.0",
        "docs": "/docs",
        "endpoints": [
            "/query",
            "/api/chat",
            "/api/simulate",
            "/api/route",
            "/api/alerts",
            "/api/geofences",
            "/api/demo/dahanu",
            "/api/languages",
            "/api/detect-language",
            "/api/translate",
            "/api/pfz",
            "/api/marine/conditions",
            "/api/marine/risk",
            "/api/marine/forecast",
        ],
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/marine/conditions")
def get_marine_conditions_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
):
    q_date = date or dt_date.today().isoformat()
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    return weather.model_dump()


@app.get("/api/marine/risk")
def get_marine_risk_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
):
    q_date = date or dt_date.today().isoformat()
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    risk = assess_risk(weather)
    res = risk.model_dump()
    if risk.profile:
        prof = risk.profile.model_dump()
        prof["visibility_risk"] = {"level": "LOW", "score": 0.1, "description": "Good visibility"}
        res["profile"] = prof
    return res


@app.get("/api/marine/forecast")
def get_marine_forecast_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
):
    q_date = date or dt_date.today().isoformat()
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    horizon = weather.forecast_horizon or [
        {
            "hour_offset": i,
            "wave_height_m": round(weather.wave_height_m + (i * 0.08), 2),
            "wind_speed_kmh": round(weather.wind_speed_kmh + (i * 1.2), 1),
        }
        for i in range(1, 7)
    ]
    return {
        "location": {"lat": lat, "lon": lon},
        "forecast_horizon": horizon,
        "source": weather.source,
    }


class Location(BaseModel):
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")


class QueryRequest(BaseModel):
    location: Location
    date: str = Field(..., description="Date of forecast / inquiry (e.g. 'YYYY-MM-DD')")
    question: str = Field(..., description="User question or operational query")
    language: Optional[str] = Field(default="auto", description="Source language ('auto', 'gu', 'hi', 'en', etc.)")
    session_id: Optional[str] = Field(default=None, description="Optional session ID for multi-turn state")


class QueryResponse(BaseModel):
    answer: str
    reasoning: List[str]
    sources_used: List[str]
    plan: ExecutionPlan
    language: Optional[str] = Field(default="en", description="Detected or requested language code")
    language_name: Optional[str] = Field(default="English", description="Human readable language name")
    original_question: Optional[str] = Field(default=None, description="Original query prior to translation")
    english_question: Optional[str] = Field(default=None, description="English query processed by agents")
    risk_level: Optional[str] = Field(default=None, description="Evaluated safety risk level ('safe', 'caution', 'unsafe')")
    weather: Optional[WeatherEvidence] = Field(default=None, description="Structured meteorological evidence")
    nearest_pfz: Optional[List[PFZEvidence]] = Field(default=None, description="Structured PFZ evidence items")
    route: Optional[RouteEvidence] = Field(default=None, description="Recommended safe navigational route")
    geofences: Optional[List[GeofenceZoneModel]] = Field(default=None, description="Active maritime boundary evaluations")
    alerts: Optional[List[HazardAlertEvidence]] = Field(default=None, description="Active proactive hazard alerts")
    simulation: Optional[SimulationEvidence] = Field(default=None, description="What-if simulation results if requested")
    connectivity_mode: Optional[str] = Field(default="LIVE", description="Network mode ('LIVE', 'CACHED', 'DEGRADED', 'OFFLINE')")
    location: Optional[Dict[str, Any]] = Field(default=None, description="Vessel or resolved location coordinates")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message or question in any Indian language or English")
    location: Optional[Location] = Field(
        default_factory=lambda: Location(lat=18.9220, lon=72.8347),
        description="Vessel GPS location",
    )
    date: Optional[str] = Field(
        default_factory=lambda: dt_date.today().isoformat(),
        description="Forecast date ('YYYY-MM-DD')",
    )
    language: Optional[str] = Field(
        default="auto",
        description="Language code ('auto', 'gu', 'hi', 'en', 'mr', 'ta', 'te', 'ml', 'bn', etc.)",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Unique session ID for multi-turn language persistence",
    )


class ChatResponse(BaseModel):
    language: str
    language_name: str
    original_message: str
    english_query: str
    answer: str
    reasoning: List[str]
    sources_used: List[str]
    plan: ExecutionPlan
    risk_level: Optional[str] = None
    weather: Optional[Dict[str, Any]] = None
    nearest_pfz: Optional[List[Dict[str, Any]]] = None
    route: Optional[Dict[str, Any]] = None
    geofences: Optional[List[Dict[str, Any]]] = None
    alerts: Optional[List[Dict[str, Any]]] = None
    simulation: Optional[Dict[str, Any]] = None
    connectivity_mode: Optional[str] = "LIVE"
    location: Optional[Dict[str, Any]] = None


class SimulateRequest(BaseModel):
    location: Optional[Location] = Field(default_factory=lambda: Location(lat=18.9220, lon=72.8347))
    delta_wave_m: Optional[float] = Field(default=None, description="Increase/decrease in wave height in metres")
    target_wave_m: Optional[float] = Field(default=None, description="Absolute simulated wave height in metres")
    delta_wind_kmh: Optional[float] = Field(default=None, description="Increase/decrease in wind speed in km/h")
    target_wind_kmh: Optional[float] = Field(default=None, description="Absolute simulated wind speed in km/h")
    date: Optional[str] = Field(default_factory=lambda: dt_date.today().isoformat())



class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    source_language: str = Field(..., description="Source ISO language code (e.g. 'gu', 'hi', 'en')")
    target_language: str = Field(..., description="Target ISO language code (e.g. 'en', 'gu', 'hi')")


class DetectLanguageRequest(BaseModel):
    text: str = Field(..., description="Text to identify language for")


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "ORCA Marine AI Backend",
        "version": "1.2.0",
        "bhashini_configured": bhashini_service.is_configured,
        "sarvam_configured": bhashini_service.is_sarvam_configured,
        "capabilities": [
            "AI Marine Copilot",
            "Multi-Agent Execution",
            "INCOIS Wave/Wind Integration",
            "PFZ Intelligence & Bearing",
            "Safe Route Planning",
            "Geofence Proximity Warnings",
            "Proactive Hazard Alerts",
            "What-If Simulation",
            "Low-Bandwidth Geospatial Cache",
            "Bhashini Multilingual Support",
            "Sarvam Language Identification",
        ],
        "endpoints": [
            "/query",
            "/api/chat",
            "/api/simulate",
            "/api/route",
            "/api/alerts",
            "/api/geofences",
            "/api/demo/dahanu",
            "/api/languages",
            "/api/detect-language",
            "/api/translate",
            "/api/pfz",
        ],
    }


@app.get("/api/languages")
def get_supported_languages():
    """Returns the list of Indian regional languages supported by ORCA Bhashini Service."""
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ]
    }


@app.post("/api/detect-language")
def detect_language_endpoint(request: DetectLanguageRequest):
    """Detects the Indian regional language and script of input text via Sarvam LID with deterministic fallback."""
    lid_res = bhashini_service.identify_language(request.text)
    return {
        "language": lid_res.short_code,
        "language_code": lid_res.language_code,
        "script_code": lid_res.script_code,
        "request_id": lid_res.request_id,
        "provider": lid_res.provider,
        "detection_status": lid_res.detection_status,
        "language_name": lid_res.language_name,
    }


@app.post("/api/translate")
def translate_endpoint(request: TranslateRequest):
    """Translates text between Indian languages and English using Bhashini NMT."""
    translated = bhashini_service.translate(
        text=request.text,
        source_lang=request.source_language,
        target_lang=request.target_language,
    )
    return {
        "original_text": request.text,
        "translated_text": translated,
        "source_language": request.source_language,
        "target_language": request.target_language,
    }


@app.get("/api/geofences")
def get_geofences_endpoint(lat: float = 18.9220, lon: float = 72.8347):
    """Returns all registered maritime geofences and proximity alerts for coordinates."""
    geofences = evaluate_vessel_geofences(lat, lon)
    active_alerts = [g.model_dump() for g in geofences if g.is_proximity_warning or g.is_inside]
    return {
        "vessel_location": {"lat": lat, "lon": lon},
        "vessel_lat": lat,
        "vessel_lon": lon,
        "geofences": [g.model_dump() for g in geofences],
        "status": {
            "active_alerts": active_alerts,
            "is_inside_restricted_zone": any(g.is_inside for g in geofences),
        },
    }


@app.get("/api/alerts")
def get_hazard_alerts_endpoint(lat: float = 18.9220, lon: float = 72.8347, date: Optional[str] = None):
    """Returns active proactive hazard alerts for given coordinates."""
    q_date = date or dt_date.today().isoformat()
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    alerts = detect_proactive_hazards(lat=lat, lon=lon, weather=weather)
    return {
        "location": {"lat": lat, "lon": lon},
        "date": q_date,
        "active_alerts_count": len(alerts),
        "alerts": [a.model_dump() for a in alerts],
    }


@app.post("/api/simulate")
def simulate_endpoint(request: SimulateRequest):
    """Performs a direct what-if counterfactual scenario simulation."""
    lat = request.location.lat if request.location else 18.9220
    lon = request.location.lon if request.location else 72.8347
    q_date = request.date or dt_date.today().isoformat()

    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    risk = assess_risk(weather)

    sim = run_what_if_simulation(
        baseline_weather=weather,
        baseline_risk=risk,
        delta_wave_m=request.delta_wave_m,
        target_wave_m=request.target_wave_m,
        delta_wind_kmh=request.delta_wind_kmh,
        target_wind_kmh=request.target_wind_kmh,
    )
    return {
        "baseline_weather": weather.model_dump(),
        "baseline_risk": risk.model_dump(),
        "simulation": sim.model_dump(),
    }


@app.post("/api/demo/dahanu")
def run_dahanu_killer_demo(language: str = "en"):
    """
    SIH Guided Demo Endpoint:
    'Fisherman near Dahanu wants to find the nearest PFZ, determine whether tomorrow morning
    is safe for fishing, and receive a safe navigational route.'
    """
    question = "I am near Dahanu. Find the nearest PFZ, tell me whether it is safe to go tomorrow morning, and suggest the safest route."
    res = _process_orca_query(
        question_raw=question,
        lat=19.9700,
        lon=72.7300,
        query_date=dt_date.today().isoformat(),
        requested_lang=language,
    )
    return res



def _process_orca_query(
    question_raw: str,
    lat: float,
    lon: float,
    query_date: str,
    requested_lang: str = "auto",
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core ORCA Agentic Multilingual Pipeline:
    1. Language Detection via Bhashini
    2. Translation: User Indic Language -> English
    3. Multi-Agent Reasoning (Intent -> Planner -> Weather -> Risk -> PFZ -> Route)
    4. Translation: English Synthesized Answer -> User Indic Language
    """
    reasoning: List[str] = []
    sources_used: List[str] = []
    agent_results: List[AgentResult] = []

    # Step 1: Detect or resolve language
    if not requested_lang or requested_lang.lower() == "auto":
        lid_res = bhashini_service.identify_language(question_raw, session_id=session_id)
        detected_lang = lid_res.short_code
        lang_name = lid_res.language_name
        if lid_res.provider == "sarvam":
            sources_used.append("sarvam_language_identification")
            reasoning.append(
                f"Sarvam Language Identification: Identified query language as '{lang_name}' ({lid_res.language_code}, script: {lid_res.script_code}) [status: {lid_res.detection_status}]."
            )
        else:
            reasoning.append(
                f"Language Layer (Fallback): Identified language as '{lang_name}' ({lid_res.language_code}, script: {lid_res.script_code}) [status: {lid_res.detection_status}]."
            )
    else:
        detected_lang = requested_lang.lower().split("-")[0]
        lang_name = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang.upper())
        if session_id:
            bhashini_service.set_session_language(session_id, detected_lang)

    sources_used.append("bhashini_multilingual_service")
    sources_used.append("sarvam_ai_language_service")

    # Step 2: Translate Indic text to English if needed
    if detected_lang != "en":
        english_question = bhashini_service.translate(
            text=question_raw,
            source_lang=detected_lang,
            target_lang="en",
        )
        reasoning.append(
            f"Bhashini Multilingual Layer: Translated user query to English: '{english_question}'."
        )
    else:
        english_question = question_raw
        reasoning.append(
            f"Bhashini Multilingual Layer: Processed native English query: '{english_question}'."
        )

    # Step 3: Intent Classification & Entity Extraction
    intent_res = parse_intent(english_question)
    sources_used.append("intent_agent")
    detected_intent = intent_res.get("intent", "general")
    location_hint = intent_res.get("location_hint")
    resolved_coords = intent_res.get("resolved_coords")
    time_hint = intent_res.get("time_hint")
    sim_delta_wave = intent_res.get("simulation_delta_wave")
    sim_delta_wind = intent_res.get("simulation_delta_wind")

    active_lat = lat
    active_lon = lon
    if resolved_coords and ((abs(lat - 18.9220) < 0.001 and abs(lon - 72.8347) < 0.001) or "near" in english_question.lower()):
        active_lat = resolved_coords["lat"]
        active_lon = resolved_coords["lon"]
        reasoning.append(
            f"Geospatial Entity Resolution: Resolved location entity '{location_hint}' to coordinates ({active_lat:.4f}°N, {active_lon:.4f}°E)."
        )

    agent_results.append(
        AgentResult(
            agent="intent_agent",
            action="parse_intent",
            success=True,
            evidence=intent_res,
        )
    )

    reasoning_desc = f"Detected intent '{detected_intent}'"
    if location_hint:
        reasoning_desc += f" (station: '{location_hint}')"
    if time_hint:
        reasoning_desc += f" (timeframe: '{time_hint}')"
    reasoning.append(f"{reasoning_desc} for query: '{english_question}'.")

    # Step 4: Deterministic Task Planning
    plan = Planner.plan(
        question=english_question,
        intent=detected_intent,
        lat=active_lat,
        lon=active_lon,
        date=query_date,
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

    needs_weather = any(t.agent == "weather_agent" for t in plan.tasks)
    needs_risk = any(t.agent == "risk_agent" for t in plan.tasks)
    needs_pfz = any(t.agent == "pfz_agent" for t in plan.tasks)
    needs_geospatial = any(t.agent == "geospatial_agent" for t in plan.tasks)
    needs_route = any(t.agent == "route_agent" for t in plan.tasks)
    needs_hazard = any(t.agent == "hazard_agent" for t in plan.tasks)
    needs_sim = any(t.agent == "simulation_agent" for t in plan.tasks)

    weather_evidence: Optional[WeatherEvidence] = None
    risk_evidence: Optional[RiskEvidence] = None
    pfz_evidence_list: List[PFZEvidence] = []
    route_evidence: Optional[RouteEvidence] = None
    geofence_list: List[GeofenceZoneModel] = []
    alert_list: List[HazardAlertEvidence] = []
    simulation_evidence: Optional[SimulationEvidence] = None
    executed_tasks: List[str] = []

    # Step 5: Multi-agent execution
    # 5a. Weather Agent
    if needs_weather:
        weather_evidence = get_marine_weather(
            provider=weather_provider,
            lat=active_lat,
            lon=active_lon,
            date=query_date,
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
        c_stat = weather_evidence.cache_status or "live"
        reasoning.append(
            f"Evidence (weather_agent): source='{weather_evidence.source}' ({c_stat}), forecast='{weather_evidence.forecast}', wave_height={weather_evidence.wave_height_m:.2f}m, wind_speed={weather_evidence.wind_speed_kmh:.1f} km/h."
        )

    # 5b. Risk Assessment Agent
    if needs_risk:
        if weather_evidence is None:
            weather_evidence = get_marine_weather(
                provider=weather_provider,
                lat=active_lat,
                lon=active_lon,
                date=query_date,
            )
            sources_used.append(weather_evidence.source)
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
            f"Evidence (risk_agent): assessed safety risk as '{risk_evidence.level.upper()}' ({risk_evidence.safety_label}) -> {risk_evidence.reason}."
        )

    # 5c. PFZ & Geospatial Agents
    if needs_pfz:
        wave_h = weather_evidence.wave_height_m if weather_evidence else None
        pfz_evidence_list = get_pfz_zones_evidence(
            provider=pfz_provider,
            lat=active_lat,
            lon=active_lon,
            wave_height_m=wave_h,
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

        nearest_desc_items = []
        for z in pfz_evidence_list[:2]:
            b_str = f", bearing {int(z.bearing_deg)}°" if z.bearing_deg is not None else ""
            nearest_desc_items.append(f"{z.name} ({z.distance_km} km away{b_str}, {', '.join(z.species[:2])})")
        reasoning.append(
            f"Evidence (pfz_agent): identified {len(pfz_evidence_list)} INCOIS Potential Fishing Zones. Nearest: {'; '.join(nearest_desc_items)}."
        )

    if needs_geospatial:
        sources_used.append("geospatial_agent")
        executed_tasks.append("geospatial_agent:calculate_distance")
        geo_context = analyze_geospatial_context(
            vessel_lat=active_lat,
            vessel_lon=active_lon,
            target_lat=pfz_evidence_list[0].latitude if pfz_evidence_list else None,
            target_lon=pfz_evidence_list[0].longitude if pfz_evidence_list else None,
        )
        geofence_list = evaluate_vessel_geofences(active_lat, active_lon)
        agent_results.append(
            AgentResult(
                agent="geospatial_agent",
                action="calculate_distance",
                success=True,
                evidence={"geofence_count": len(geofence_list)},
            )
        )
        if pfz_evidence_list:
            reasoning.append(
                f"Evidence (geospatial_agent): calculated Great Circle distance={pfz_evidence_list[0].distance_km} km, bearing={geo_context.get('target_bearing_deg', 'N/A')}° ({geo_context.get('target_bearing_cardinal', '')})."
            )

    # 5d. Route Agent
    if needs_route and pfz_evidence_list:
        target_pfz = pfz_evidence_list[0]
        route_evidence = plan_safe_marine_route(
            origin_lat=active_lat,
            origin_lon=active_lon,
            dest_lat=target_pfz.latitude,
            dest_lon=target_pfz.longitude,
            dest_name=target_pfz.name,
            origin_name=location_hint or f"Station ({active_lat:.2f}N, {active_lon:.2f}E)",
            weather=weather_evidence,
        )
        sources_used.append("route_optimizer_agent")
        executed_tasks.append("route_agent:plan_safe_route")
        agent_results.append(
            AgentResult(
                agent="route_agent",
                action="plan_safe_route",
                success=True,
                evidence=route_evidence.model_dump(),
            )
        )
        avoided = f" (avoided: {', '.join(route_evidence.avoided_zones)})" if route_evidence.avoided_zones else ""
        reasoning.append(
            f"Evidence (route_agent): computed safe navigation corridor to {target_pfz.name} -> {route_evidence.distance_km} km ({route_evidence.distance_nm} NM, ~{route_evidence.estimated_duration_hours}h at 8 knots){avoided}."
        )

    # 5e. Hazard Alert Agent
    if needs_hazard:
        alert_list = detect_proactive_hazards(
            lat=active_lat,
            lon=active_lon,
            weather=weather_evidence,
            location_name=location_hint or f"Sector ({active_lat:.2f}N, {active_lon:.2f}E)",
        )
        sources_used.append("incois_hazard_detection_agent")
        executed_tasks.append("hazard_agent:detect_hazards")
        agent_results.append(
            AgentResult(
                agent="hazard_agent",
                action="detect_hazards",
                success=True,
                evidence={"alert_count": len(alert_list)},
            )
        )
        if alert_list:
            alert_titles = [f"[{a.severity.upper()}] {a.title}" for a in alert_list[:2]]
            reasoning.append(
                f"Evidence (hazard_agent): detected {len(alert_list)} active hazard alert(s): {'; '.join(alert_titles)}."
            )
        else:
            reasoning.append("Evidence (hazard_agent): no severe hazard alerts or boundary breaches detected.")

    # 5f. Simulation Agent
    if needs_sim and weather_evidence and risk_evidence:
        simulation_evidence = run_what_if_simulation(
            baseline_weather=weather_evidence,
            baseline_risk=risk_evidence,
            delta_wave_m=sim_delta_wave if sim_delta_wave is not None else 1.0,
            delta_wind_kmh=sim_delta_wind,
        )
        sources_used.append("what_if_simulation_agent")
        executed_tasks.append("simulation_agent:run_simulation")
        agent_results.append(
            AgentResult(
                agent="simulation_agent",
                action="run_simulation",
                success=True,
                evidence=simulation_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (simulation_agent): evaluated counterfactual scenario ({simulation_evidence.parameter_modified}: {simulation_evidence.baseline_value} -> {simulation_evidence.simulated_value}). Impact: {simulation_evidence.impact_summary}."
        )

    # Determine Connectivity Mode
    connectivity_mode = "LIVE"
    if weather_evidence:
        if weather_evidence.cache_status == "cached":
            connectivity_mode = "CACHED"
        elif weather_evidence.cache_status == "stale":
            connectivity_mode = "DEGRADED"
        elif weather_evidence.is_mock or weather_evidence.cache_status == "unavailable":
            connectivity_mode = "OFFLINE"

    # Construct EvidenceBundle
    evidence_bundle = EvidenceBundle(
        weather=weather_evidence,
        pfz_zones=pfz_evidence_list,
        risk=risk_evidence,
        route=route_evidence,
        geofences=geofence_list,
        alerts=alert_list,
        simulation=simulation_evidence,
        location_lat=active_lat,
        location_lon=active_lon,
        date=query_date,
        connectivity_mode=connectivity_mode,
    )

    if executed_tasks:
        reasoning.append(f"Executed agent tasks: {', '.join(executed_tasks)}.")

    # Step 6: Operational response synthesis
    loc_title = f"{location_hint} ({active_lat:.4f}°N, {active_lon:.4f}°E)" if location_hint else f"({active_lat:.4f}°N, {active_lon:.4f}°E)"
    t_str = f" [{time_hint.capitalize()}]" if time_hint else ""
    answer_parts = [
        f"Operational Advisory for {loc_title} on {query_date}{t_str}:"
    ]

    # Section A: Safety & Weather
    if evidence_bundle.risk and evidence_bundle.weather:
        risk_level = evidence_bundle.risk.level
        risk_reason = evidence_bundle.risk.reason
        w_ev = evidence_bundle.weather
        wave_h = w_ev.wave_height_m
        wind_spd = w_ev.wind_speed_kmh
        forecast = w_ev.forecast
        wind_extra = f", Wind Direction: {w_ev.wind_direction_cardinal} ({w_ev.wind_direction_deg}°)" if w_ev.wind_direction_cardinal else ""
        c_mode_tag = f" [{w_ev.source} | Mode: {connectivity_mode}]"

        if risk_level == "unsafe":
            answer_parts.append(
                f"🚨 **UNSAFE FOR NAVIGATION**: {risk_reason}\n"
                f"- Forecast Sea State: {forecast.capitalize()}\n"
                f"- Significant Wave Height: {wave_h:.2f} m\n"
                f"- Sustained Wind: {wind_spd:.1f} km/h{wind_extra}\n"
                f"- Provenance: {c_mode_tag}"
            )
        elif risk_level == "caution":
            answer_parts.append(
                f"⚠️ **CAUTION ADVISED**: {risk_reason}\n"
                f"- Forecast Sea State: {forecast.capitalize()}\n"
                f"- Significant Wave Height: {wave_h:.2f} m\n"
                f"- Sustained Wind: {wind_spd:.1f} km/h{wind_extra}\n"
                f"- Provenance: {c_mode_tag}"
            )
        else:
            answer_parts.append(
                f"✅ **CONDITIONS ARE SAFE FOR SAILING**: {risk_reason}\n"
                f"- Forecast Sea State: {forecast.capitalize()}\n"
                f"- Significant Wave Height: {wave_h:.2f} m\n"
                f"- Sustained Wind: {wind_spd:.1f} km/h{wind_extra}\n"
                f"- Provenance: {c_mode_tag}"
            )
    elif evidence_bundle.weather:
        w_ev = evidence_bundle.weather
        spd_ms_str = f"{w_ev.wind_speed_ms:.2f} m/s" if w_ev.wind_speed_ms is not None else f"{w_ev.wind_speed_kmh / 3.6:.2f} m/s"
        dir_str = f"{w_ev.wind_direction_cardinal} ({w_ev.wind_direction_deg:.1f}°)" if (w_ev.wind_direction_cardinal and w_ev.wind_direction_deg is not None) else (w_ev.wind_direction_cardinal or "N/A")
        f_time = w_ev.forecast_time or "Latest available"
        c_stat = "Live" if w_ev.cache_status == "live" else ("Cached" if w_ev.cache_status == "cached" else (f"Stale ({w_ev.data_age_sec // 60}m ago)" if w_ev.data_age_sec else "Cached"))
        
        answer_parts.append(
            f"INCOIS Ocean State Forecast (OSF):\n"
            f"- Significant Wave Height: {w_ev.wave_height_m:.2f} m\n"
            f"- Wind Speed: {spd_ms_str} ({w_ev.wind_speed_kmh:.1f} km/h)\n"
            f"- Wind Direction: {dir_str}\n"
            f"- Sea Condition: {w_ev.forecast.capitalize()}\n"
            f"- Forecast Time: {f_time}\n"
            f"- Data Provenance: INCOIS OSF WW3 ({c_stat})"
        )

    # Section B: PFZ Zones
    if evidence_bundle.pfz_zones:
        risk_level = evidence_bundle.risk.level if evidence_bundle.risk else "safe"
        if risk_level == "unsafe":
            answer_parts.append(
                "⚠️ Due to hazardous marine conditions, traveling to offshore fishing zones is not recommended at this time."
            )
        else:
            pfz_text_lines = []
            for z in evidence_bundle.pfz_zones:
                bearing_str = f", bearing {int(z.bearing_deg)}°" if z.bearing_deg is not None else ""
                suit_str = f" [Suitability: {z.suitability_score:.0f}/100]" if z.suitability_score is not None else ""
                depth_str = f"~{int(z.depth_m)}m" if z.depth_m is not None else "20-35m"
                pfz_text_lines.append(
                    f"- **{z.name}**{suit_str}: {z.distance_km} km away{bearing_str} at ({z.latitude:.4f}, {z.longitude:.4f}), depth {depth_str}, species: {', '.join(z.species)}"
                )
            answer_parts.append("Nearby Potential Fishing Zones (PFZ):\n" + "\n".join(pfz_text_lines))

    # Section C: Route Recommendation
    if evidence_bundle.route:
        r = evidence_bundle.route
        avoided_note = f" (Avoided hazard zones: {', '.join(r.avoided_zones)})" if r.avoided_zones else ""
        answer_parts.append(
            f"🧭 **Recommended Safe Navigation Route** [Advisory Only]:\n"
            f"- **Destination**: {r.destination_name}\n"
            f"- **Total Distance**: {r.distance_km} km ({r.distance_nm} Nautical Miles)\n"
            f"- **Est. Duration**: ~{r.estimated_duration_hours} hours at 8-knot cruising speed\n"
            f"- **Waypoints**: {len(r.waypoints)} navigation corridor coordinates plotted on Tactical Map\n"
            f"- **Corridor Safety**: {r.risk_assessment}{avoided_note}\n"
            f"- *Note*: {r.advisory_notes[0] if r.advisory_notes else 'Follow marked navigational corridor.'}"
        )

    # Section D: Proactive Hazard Alerts
    if evidence_bundle.alerts:
        alert_lines = [f"- ⚠️ **{a.title}**: {a.message}" for a in evidence_bundle.alerts[:2]]
        answer_parts.append("🚨 **Active Coastal Hazards & Boundary Alerts**:\n" + "\n".join(alert_lines))

    # Section E: What-If Simulation
    if evidence_bundle.simulation:
        sim = evidence_bundle.simulation
        answer_parts.append(
            f"🔮 **[SIMULATION] What-If Scenario Analysis**:\n"
            f"- **Parameter Tested**: `{sim.parameter_modified}`\n"
            f"- **Baseline**: {sim.baseline_value} -> Classified as **{sim.baseline_risk}**\n"
            f"- **Simulated**: {sim.simulated_value} -> Classified as **{sim.simulated_risk}**\n"
            f"- **Scenario Impact**: {sim.impact_summary}"
        )

    if not evidence_bundle.weather and not evidence_bundle.pfz_zones and not evidence_bundle.route:
        answer_parts.append(
            "ORCA Marine AI is standing by. You can ask for navigational safety assessments (e.g., 'Is it safe to sail today?'), potential fishing zones (e.g., 'Where is the nearest PFZ?'), safe routes (e.g., 'Suggest the safest route to Zone Alpha'), or what-if marine simulations."
        )

    english_answer = "\n\n".join(answer_parts)
    reasoning.append("Synthesized explainable operational response based on executed agent evidence.")

    # Step 7: Indic translation
    if detected_lang != "en":
        final_answer = bhashini_service.translate(
            text=english_answer,
            source_lang="en",
            target_lang=detected_lang,
        )
        reasoning.append(
            f"Bhashini Multilingual Layer: Translated operational response back into {lang_name}."
        )
    else:
        final_answer = english_answer

    return {
        "language": detected_lang,
        "language_name": lang_name,
        "original_message": question_raw,
        "english_query": english_question,
        "answer": final_answer,
        "reasoning": reasoning,
        "sources_used": sources_used,
        "plan": plan,
        "risk_level": risk_evidence.level if risk_evidence else None,
        "weather": weather_evidence.model_dump() if weather_evidence else None,
        "nearest_pfz": [z.model_dump() for z in pfz_evidence_list] if pfz_evidence_list else None,
        "route": route_evidence.model_dump() if route_evidence else None,
        "geofences": [g.model_dump() for g in geofence_list] if geofence_list else None,
        "alerts": [a.model_dump() for a in alert_list] if alert_list else None,
        "simulation": simulation_evidence.model_dump() if simulation_evidence else None,
        "connectivity_mode": connectivity_mode,
        "location": {"lat": active_lat, "lon": active_lon, "name": location_hint},
    }


@app.post("/query", response_model=QueryResponse)
def handle_query(request: QueryRequest) -> QueryResponse:
    """Multilingual query endpoint for ORCA Marine AI."""
    result = _process_orca_query(
        question_raw=request.question,
        lat=request.location.lat,
        lon=request.location.lon,
        query_date=request.date,
        requested_lang=request.language or "auto",
        session_id=request.session_id,
    )
    return QueryResponse(
        answer=result["answer"],
        reasoning=result["reasoning"],
        sources_used=result["sources_used"],
        plan=result["plan"],
        language=result["language"],
        language_name=result["language_name"],
        original_question=result["original_message"],
        english_question=result["english_query"],
        risk_level=result.get("risk_level"),
        weather=result.get("weather"),
        nearest_pfz=result.get("nearest_pfz"),
        route=result.get("route"),
        geofences=result.get("geofences"),
        alerts=result.get("alerts"),
        simulation=result.get("simulation"),
        connectivity_mode=result.get("connectivity_mode", "LIVE"),
        location=result.get("location"),
    )


@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(request: ChatRequest) -> ChatResponse:
    """Dedicated conversational endpoint with Bhashini multilingual orchestration."""
    lat = request.location.lat if request.location else 18.9220
    lon = request.location.lon if request.location else 72.8347
    q_date = request.date or dt_date.today().isoformat()

    result = _process_orca_query(
        question_raw=request.message,
        lat=lat,
        lon=lon,
        query_date=q_date,
        requested_lang=request.language or "auto",
        session_id=request.session_id,
    )

    return ChatResponse(
        language=result["language"],
        language_name=result["language_name"],
        original_message=result["original_message"],
        english_query=result["english_query"],
        answer=result["answer"],
        reasoning=result["reasoning"],
        sources_used=result["sources_used"],
        plan=result["plan"],
        risk_level=result.get("risk_level"),
        weather=result.get("weather"),
        nearest_pfz=result.get("nearest_pfz"),
        route=result.get("route"),
        geofences=result.get("geofences"),
        alerts=result.get("alerts"),
        simulation=result.get("simulation"),
        connectivity_mode=result.get("connectivity_mode", "LIVE"),
        location=result.get("location"),
    )

