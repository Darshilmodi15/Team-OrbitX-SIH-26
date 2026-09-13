"""FastAPI Application for ORCA Marine AI with Bhashini Multilingual Service."""
from datetime import date as dt_date, datetime, timezone
import os
import re
import threading
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.agents.boundary_agent import check_marine_boundary_evidence
from app.agents.geospatial_agent import analyze_geospatial_context
from app.agents.hazard_agent import detect_proactive_hazards
from app.agents.intent_agent import parse_intent
from app.agents.ocean_analytics_agent import (
    analyze_chlorophyll_and_sst,
    analyze_productivity_decline,
    evaluate_zone_avoidance,
)
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
from app.data.pfz.mock import IncoisPFZProvider
from app.data.weather.base import WeatherProvider
from app.data.weather.incois import IncoisWeatherProvider
from app.services.temporal import resolve_query_time, TemporalResolution
from app.models.agent_models import (
    AgentResult,
    BoundaryEvidence,
    EcologyEvidence,
    EvidenceBundle,
    GeofenceZoneModel,
    HazardAlertEvidence,
    OceanAnalyticsEvidence,
    OperationalRecommendation,
    PFZEvidence,
    RiskEvidence,
    RouteEvidence,
    SimulationEvidence,
    TideInfo,
    WeatherEvidence,
    ZoneAvoidanceEvidence,
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
from app.routers.chat import router as chat_router
from app.routers.auth import get_current_user_from_header
from app.db.session import get_db
from app.db.models import Conversation
from app.models.user_models import UserProfile
from app.services.chat_service import chat_storage_service
from app.services.rate_limit import rate_limiter
from app.services.bhashini import BHASHINI_MODELS, SUPPORTED_LANGUAGES, bhashini_service
from app.services.dialogue_synthesizer import DialogueSynthesizer
from app.services.provider_health import ProviderUnavailable, snapshot
from app.services.planner import ExecutionPlan, Planner
from app.services.recommendation_engine import RecommendationReasoningEngine

# Initialize authoritative INCOIS data provider with low-bandwidth geospatial cache
weather_provider: WeatherProvider = IncoisWeatherProvider()
pfz_provider: PFZProvider = IncoisPFZProvider()
geofence_provider: GeofenceProvider = SpatialGeofenceProvider()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: ensures database schema exists, seeds baseline data, and runs periodic INCOIS ingestion."""
    import asyncio
    import logging
    import threading
    from app.services.ingestion.incois_ingestion_service import continuous_incois_ingestion_loop
    logger = logging.getLogger("orca_lifespan")
    
    def _background_init_and_seed():
        try:
            # Run alembic migrations first to ensure all schema changes are applied
            try:
                from alembic.config import Config
                from alembic import command
                alembic_cfg = Config(os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini"))
                command.upgrade(alembic_cfg, "head")
                logger.info("Alembic migrations applied successfully.")
            except Exception as mig_err:
                logger.warning(f"Alembic migration note (falling back to create_all): {mig_err}")
            # Fallback: create any tables that may still be missing
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

    # Launch continuous background INCOIS ingestion task
    ingestion_task = asyncio.create_task(
        continuous_incois_ingestion_loop(provider=weather_provider)
    )
    
    yield

    # Clean shutdown of background ingestion
    ingestion_task.cancel()
    try:
        await ingestion_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="ORCA Marine AI Backend",
    description="Autonomous Maritime Intelligence, Multi-Agent Decision Support & Bhashini Multilingual Layer.",
    version="1.4.1",
    lifespan=lifespan,
)

@app.exception_handler(ProviderUnavailable)
async def unavailable_provider_handler(request, exc):
    return JSONResponse(status_code=503, content={"detail": "AI_PROVIDER_UNAVAILABLE"})

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    """Catch-all: ensures 500 errors return JSON with CORS headers instead of bare text."""
    import logging
    logging.getLogger("orca").error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

frontend_origins = {
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGIN",
        "https://team-orbit-x-sih-26.vercel.app,http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
}
frontend_origins.update([
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
    "https://team-orbit-x-sih-26.vercel.app",
    "https://team-orbitx-sih-26.vercel.app",
])
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(frontend_origins),
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?",
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
app.include_router(chat_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/health/providers")
def get_providers_health():
    """Returns non-secret public health and data provenance for all marine providers."""
    providers = ["incois", "incois_pfz", "open_meteo", "gemini", "isro_mosdac", "sarvam_stt", "sarvam_tts", "sarvam_translation"]
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "providers": {p: snapshot(p) for p in providers},
    }


@app.get("/api/marine/conditions")
def get_marine_conditions_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
    time_hint: Optional[str] = Query(None),
):
    temporal_res = resolve_query_time(text=time_hint or "", request_date=date)
    weather = get_marine_weather(
        provider=weather_provider,
        lat=lat,
        lon=lon,
        date=temporal_res.target_date,
        time_hint=temporal_res.time_hint,
        temporal_res=temporal_res,
    )
    return weather.model_dump()


@app.get("/api/marine/risk")
def get_marine_risk_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
    time_hint: Optional[str] = Query(None),
):
    temporal_res = resolve_query_time(text=time_hint or "", request_date=date)
    weather = get_marine_weather(
        provider=weather_provider,
        lat=lat,
        lon=lon,
        date=temporal_res.target_date,
        time_hint=temporal_res.time_hint,
        temporal_res=temporal_res,
    )
    risk = assess_risk(weather)
    res = risk.model_dump()
    if risk.profile:
        prof = risk.profile.model_dump()
        res["profile"] = prof
    return res


@app.get("/api/marine/forecast")
def get_marine_forecast_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
    time_hint: Optional[str] = Query(None),
):
    temporal_res = resolve_query_time(text=time_hint or "", request_date=date)
    weather = get_marine_weather(
        provider=weather_provider,
        lat=lat,
        lon=lon,
        date=temporal_res.target_date,
        time_hint=temporal_res.time_hint,
        temporal_res=temporal_res,
    )
    horizon = weather.forecast_horizon or []
    return {
        "location": {"lat": lat, "lon": lon},
        "forecast_horizon": horizon,
        "source": getattr(weather, "source", None),
        "issued_at": getattr(weather, "issued_at", None),
        "forecast_valid_at": getattr(weather, "forecast_valid_at", getattr(weather, "forecast_time", None)),
        "retrieved_at": getattr(weather, "retrieved_at", getattr(weather, "retrieval_time", None)),
        "target_period": getattr(weather, "target_period", None),
    }


class Location(BaseModel):
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")


class QueryRequest(BaseModel):
    location: Location
    date: Optional[str] = Field(
        default_factory=lambda: dt_date.today().isoformat(),
        description="Date of forecast / inquiry (e.g. 'YYYY-MM-DD')",
    )
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
    boundary: Optional[BoundaryEvidence] = Field(default=None, description="Marine Regions EEZ boundary evaluation")
    simulation: Optional[SimulationEvidence] = Field(default=None, description="What-if simulation results if requested")
    ocean_analytics: Optional[OceanAnalyticsEvidence] = Field(default=None, description="Ocean color and SST thermal front analytics")
    ecology: Optional[EcologyEvidence] = Field(default=None, description="Fish productivity decline ecological diagnostics")
    zone_avoidance: Optional[ZoneAvoidanceEvidence] = Field(default=None, description="Hazard and geofence zone avoidance evaluation")
    tide: Optional[TideInfo] = Field(default=None, description="Tidal height and timing predictions")
    recommendations: Optional[List[OperationalRecommendation]] = Field(default=None, description="Reliable operational recommendations with supporting evidence and reasoning")
    connectivity_mode: Optional[str] = Field(default="LIVE", description="Network mode ('LIVE', 'CACHED', 'DEGRADED', 'OFFLINE')")
    location: Optional[Dict[str, Any]] = Field(default=None, description="Vessel or resolved location coordinates")


class ChatHistoryItem(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    text: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(..., min_length=1, max_length=8000, description="User message or question in any Indian language or English")
    location: Optional[Location] = Field(
        default=None,
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
    history: Optional[List[ChatHistoryItem]] = Field(
        default=None,
        description="Previous conversation turns for context-aware multi-turn reasoning",
    )
    request_id: Optional[str] = Field(default=None, max_length=128)


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
    boundary: Optional[Dict[str, Any]] = None
    simulation: Optional[Dict[str, Any]] = None
    ocean_analytics: Optional[Dict[str, Any]] = None
    ecology: Optional[Dict[str, Any]] = None
    zone_avoidance: Optional[Dict[str, Any]] = None
    tide: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    connectivity_mode: Optional[str] = "LIVE"
    location: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    intent: str = "general"
    mode: str = "live"
    agents_used: List[str] = Field(default_factory=list)
    data_timestamp: str
    fallback_used: bool = False


_chat_idempotency_cache: Dict[str, ChatResponse] = {}
_chat_idempotency_lock = threading.Lock()


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
def root_status():
    return {
        "status": "healthy",
        "service": "ORCA Marine AI Backend",
        "version": app.version,
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
            "/api/marine/conditions",
            "/api/marine/risk",
            "/api/marine/forecast",
            "/api/marine/tide",
            "/api/recommendations",
            "/api/analytics/ocean",
            "/api/analytics/productivity",
            "/api/analytics/zone-avoidance",
            "/api/emergency/contacts",
            "/api/emergency/sos",
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


class BhashiniTranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate via Bhashini")
    source_language: str = Field(default="en", description="Source ISO language code (e.g. 'en', 'gu', 'hi')")
    target_language: str = Field(default="gu", description="Target ISO language code (e.g. 'gu', 'hi', 'en')")
    service_id: Optional[str] = Field(default=None, description="Optional custom Bhashini Service ID")


@app.get("/api/bhashini/status")
def bhashini_status_endpoint():
    """Returns configuration status, credential checks, and supported Service IDs for Bhashini."""
    return {
        "is_configured": bhashini_service.is_configured,
        "has_user_id": bool(bhashini_service.user_id),
        "user_id_preview": (bhashini_service.user_id[:6] + "..." + bhashini_service.user_id[-4:]) if bhashini_service.user_id else None,
        "has_api_key": bool(bhashini_service.api_key),
        "has_inference_key": bool(bhashini_service.inference_api_key),
        "pipeline_id": bhashini_service.pipeline_id,
        "service_ids": BHASHINI_MODELS,
    }


@app.post("/api/bhashini/translate")
def bhashini_translate_endpoint(request: BhashiniTranslateRequest):
    """
    Directly tests Bhashini translation (MeitY ULCA / Dhruva inference).
    Use this endpoint to verify live credentials and model responses.
    """
    if not bhashini_service.is_configured:
        raise HTTPException(
            status_code=400,
            detail="Bhashini credentials not configured. Please set BHASHINI_USER_ID, BHASHINI_API_KEY, and/or BHASHINI_INFERENCE_API_KEY in backend/.env",
        )
    translated = bhashini_service.translate_bhashini(
        text=request.text,
        source_lang=request.source_language,
        target_lang=request.target_language,
        service_id=request.service_id,
    )
    if translated is None:
        raise HTTPException(
            status_code=502,
            detail="Bhashini inference call failed. Verify network connectivity, API key validity, or serviceId.",
        )
    return {
        "status": "success",
        "provider": "bhashini",
        "original_text": request.text,
        "translated_text": translated,
        "source_language": request.source_language,
        "target_language": request.target_language,
        "service_id": request.service_id or BHASHINI_MODELS["translation"]["default"],
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
    lat = request.location.lat if request.location else None
    lon = request.location.lon if request.location else None
    q_date = request.date or dt_date.today().isoformat()

    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    risk = assess_risk(weather)
    if weather.wave_height_m is None or weather.wind_speed_kmh is None or weather.cache_status not in {"fresh", "live", "cached"}:
        raise HTTPException(status_code=503, detail="Current baseline measurements unavailable")

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
    history: Optional[List[Dict[str, str]]] = None,
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

    # Step 1: Detect or resolve language using Language Priority Rule
    # Priority 1: Direct analysis of user input text (native Indic script or Romanized Indic)
    lid_res = bhashini_service.identify_language(question_raw, session_id=None)
    
    # Check if the query is explicitly written in English
    is_explicit_english = False
    if lid_res.short_code == "en":
        eng_words = set(re.findall(r"\b[a-zA-Z']+\b", question_raw.lower()))
        common_eng = {
            "what", "is", "the", "how", "far", "can", "i", "weather", "wind", "wave",
            "safe", "where", "tell", "me", "are", "there", "any", "which", "should",
            "help", "forecast", "sea", "ocean", "tide", "alert", "warning", "temperature",
            "sst", "pfz", "route", "direction", "speed", "height", "today", "tomorrow"
        }
        if lid_res.provider == "sarvam" or len(eng_words.intersection(common_eng)) >= 1 or len(eng_words) >= 2:
            is_explicit_english = True

    if lid_res.short_code != "en":
        detected_lang = lid_res.short_code
        lang_name = lid_res.language_name
        if session_id:
            bhashini_service.set_session_language(session_id, detected_lang)
        if lid_res.provider == "sarvam":
            sources_used.append("sarvam_language_identification")
            reasoning.append(
                f"Sarvam Language Identification: Identified query language as '{lang_name}' ({lid_res.language_code}, script: {lid_res.script_code}) [status: {lid_res.detection_status}]."
            )
        else:
            reasoning.append(
                f"Language Layer (Script/Romanized Analysis): Identified query language as '{lang_name}' ({lid_res.language_code}, script: {lid_res.script_code}) [status: {lid_res.detection_status}]."
            )
    elif is_explicit_english:
        detected_lang = "en"
        lang_name = "English"
        if session_id:
            bhashini_service.set_session_language(session_id, "en")
        reasoning.append("Language Layer: User query explicitly in English -> Responding in English.")
    else:
        # Priority 2: If user asked in dashboard-selected language (and not 'auto' or 'en')
        if requested_lang and requested_lang.lower() not in ("auto", "en"):
            detected_lang = requested_lang.lower().split("-")[0]
            lang_name = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang.upper())
            if session_id:
                bhashini_service.set_session_language(session_id, detected_lang)
            reasoning.append(
                f"Dashboard Preference: Using selected language '{lang_name}' for response."
            )
        else:
            detected_lang = "en"
            lang_name = "English"
            reasoning.append("Language Layer: Processing query in English.")

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

    # Step 3: Intent Classification & Entity Extraction (with multi-turn context resolution)
    intent_res = parse_intent(english_question, history=history)
    sources_used.append("intent_agent")
    detected_intent = intent_res.get("intent", "general")
    location_hint = intent_res.get("location_hint")
    resolved_coords = intent_res.get("resolved_coords")
    time_hint = intent_res.get("time_hint")
    temporal_res = resolve_query_time(text=english_question, request_date=query_date)
    time_hint = temporal_res.time_hint or time_hint
    active_date = temporal_res.target_date
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
    elif not location_hint:
        try:
            from app.services.location.coastal_distance import coastal_distance_service
            c_info = coastal_distance_service.calculate_coastal_distance(active_lat, active_lon)
            if c_info and c_info.get("nearest_coastal_point"):
                np_name = c_info["nearest_coastal_point"]["name"]
                c_reg = c_info.get("coastal_region")
                location_hint = f"{np_name} Coast, {c_reg}" if c_reg and c_reg not in np_name else np_name
                reasoning.append(
                    f"Coastal Georeferencing: Station at ({active_lat:.4f}°N, {active_lon:.4f}°E) georeferenced to {location_hint}."
                )
        except Exception:
            pass

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
        reasoning_desc += f" (timeframe: '{temporal_res.description}')"
    reasoning.append(f"{reasoning_desc} for query: '{english_question}'.")

    # Step 4: Deterministic Task Planning
    plan = Planner.plan(
        question=english_question,
        intent=detected_intent,
        lat=active_lat,
        lon=active_lon,
        date=active_date,
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

    needs_weather = any(t.agent == "weather_agent" for t in plan.tasks) or detected_intent in ["weather_conditions", "safety_check", "chlorophyll_sst_analytics", "zone_avoidance"]
    needs_risk = any(t.agent == "risk_agent" for t in plan.tasks)
    needs_pfz = any(t.agent == "pfz_agent" for t in plan.tasks) or detected_intent in ["nearest_pfz", "chlorophyll_sst_analytics", "zone_avoidance"]
    needs_geospatial = any(t.agent == "geospatial_agent" for t in plan.tasks)
    needs_route = any(t.agent == "route_agent" for t in plan.tasks)
    needs_hazard = any(t.agent == "hazard_agent" for t in plan.tasks) or detected_intent in ["hazard_alerts", "zone_avoidance"]
    needs_boundary = any(t.agent == "boundary_agent" for t in plan.tasks) or detected_intent == "marine_boundary" or any(k in english_question.lower() for k in ["eez", "exclusive economic zone", "maritime boundary", "territorial water", "international water"])
    needs_sim = any(t.agent == "simulation_agent" for t in plan.tasks)
    needs_ocean_analytics = any(t.agent == "ocean_analytics_agent" and t.action == "analyze_chlorophyll_sst" for t in plan.tasks) or detected_intent == "chlorophyll_sst_analytics"
    needs_ecology = any(t.agent == "ocean_analytics_agent" and t.action == "analyze_productivity_decline" for t in plan.tasks) or detected_intent == "fish_productivity_decline"
    needs_zone_avoidance = any(t.agent == "ocean_analytics_agent" and t.action == "evaluate_zone_avoidance" for t in plan.tasks) or detected_intent == "zone_avoidance"

    weather_evidence: Optional[WeatherEvidence] = None
    risk_evidence: Optional[RiskEvidence] = None
    pfz_evidence_list: List[PFZEvidence] = []
    route_evidence: Optional[RouteEvidence] = None
    geofence_list: List[GeofenceZoneModel] = []
    alert_list: List[HazardAlertEvidence] = []
    boundary_evidence: Optional[BoundaryEvidence] = None
    simulation_evidence: Optional[SimulationEvidence] = None
    ocean_analytics_evidence: Optional[OceanAnalyticsEvidence] = None
    ecology_evidence: Optional[EcologyEvidence] = None
    zone_avoidance_evidence: Optional[ZoneAvoidanceEvidence] = None
    tide_evidence: Optional[TideInfo] = None
    executed_tasks: List[str] = []

    # Step 5: Multi-agent execution
    # 5a. Weather Agent
    if needs_weather or needs_risk or needs_ocean_analytics or needs_zone_avoidance:
        weather_evidence = get_marine_weather(
            provider=weather_provider,
            lat=active_lat,
            lon=active_lon,
            date=active_date,
            time_hint=time_hint,
            temporal_res=temporal_res,
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
        c_stat = weather_evidence.cache_status or "unavailable"
        reasoning.append(
            f"Evidence (weather_agent): source='{weather_evidence.source}' ({c_stat}), target_period='{temporal_res.description}', forecast_valid_at={weather_evidence.forecast_valid_at or 'UNAVAILABLE'}, issued_at={weather_evidence.issued_at or 'N/A'}, retrieved_at={weather_evidence.retrieved_at or 'N/A'}, forecast='{weather_evidence.forecast}', wave_height={weather_evidence.wave_height_m}m, wind_speed={weather_evidence.wind_speed_kmh} km/h."
        )

        # Tide data is deliberately omitted until a timestamped authoritative provider is configured.

    # 5b. Risk Assessment Agent
    if needs_risk:
        if weather_evidence is None:
            weather_evidence = get_marine_weather(
                provider=weather_provider,
                lat=active_lat,
                lon=active_lon,
                date=active_date,
                time_hint=time_hint,
                temporal_res=temporal_res,
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
    if needs_pfz or needs_ocean_analytics or needs_zone_avoidance:
        wave_h = weather_evidence.wave_height_m if weather_evidence else None
        pfz_evidence_list = get_pfz_zones_evidence(
            provider=pfz_provider,
            lat=active_lat,
            lon=active_lon,
            wave_height_m=wave_h,
        )
        sources_used.append(pfz_evidence_list[0].source if pfz_evidence_list else "pfz_unavailable")
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

    if needs_geospatial or needs_zone_avoidance or needs_boundary:
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
    if needs_route and pfz_evidence_list and weather_evidence and weather_evidence.wave_height_m is not None and weather_evidence.wind_speed_kmh is not None and weather_evidence.cache_status in {"fresh", "live", "cached"}:
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
    if needs_hazard or needs_zone_avoidance:
        alert_list = detect_proactive_hazards(
            lat=active_lat,
            lon=active_lon,
            weather=weather_evidence,
            location_name=location_hint or f"Sector ({active_lat:.2f}N, {active_lon:.2f}E)",
        )
        sources_used.append("orca_hazard_heuristic")
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
            reasoning.append("Evidence (hazard_agent): no threshold alerts produced from available inputs; coverage may be incomplete.")

    # 5f. Simulation Agent
    if needs_sim and weather_evidence and risk_evidence and weather_evidence.wave_height_m is not None and weather_evidence.wind_speed_kmh is not None and weather_evidence.cache_status in {"fresh", "live", "cached"}:
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

    # 5g. Boundary Agent (Marine Regions EEZ)
    if needs_boundary:
        boundary_evidence = check_marine_boundary_evidence(lat=active_lat, lon=active_lon)
        sources_used.append(boundary_evidence.source)
        executed_tasks.append("boundary_agent:check_marine_boundary")
        agent_results.append(
            AgentResult(
                agent="boundary_agent",
                action="check_marine_boundary",
                success=True,
                evidence=boundary_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (boundary_agent): {boundary_evidence.status_message} (source: {boundary_evidence.source}, {boundary_evidence.dataset_version})."
        )

    # 5h. Ocean Analytics Agent (Chlorophyll & SST)
    if needs_ocean_analytics or needs_ecology:
        reasoning.append("Satellite ocean colour and historical catch observations are unavailable; no measured trend can be reported.")

    if needs_zone_avoidance:
        zone_avoidance_evidence = evaluate_zone_avoidance(
            lat=active_lat,
            lon=active_lon,
            weather=weather_evidence,
            geofences=geofence_list,
            candidate_pfz=pfz_evidence_list,
        )
        sources_used.append(zone_avoidance_evidence.source)
        executed_tasks.append("ocean_analytics_agent:evaluate_zone_avoidance")
        agent_results.append(
            AgentResult(
                agent="ocean_analytics_agent",
                action="evaluate_zone_avoidance",
                success=True,
                evidence=zone_avoidance_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (ocean_analytics_agent): classified {len(zone_avoidance_evidence.avoided_zones)} zone(s) to avoid ({zone_avoidance_evidence.overall_avoidance_status}) with {len(zone_avoidance_evidence.safe_alternative_zones)} safe alternative grounds."
        )

    # Data freshness is separate from whether an AI/network request succeeded.
    connectivity_mode = {"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(
        weather_evidence.cache_status if weather_evidence and not weather_evidence.is_mock else None, "UNAVAILABLE"
    )

    # Construct EvidenceBundle
    evidence_bundle = EvidenceBundle(
        weather=weather_evidence,
        pfz_zones=pfz_evidence_list,
        risk=risk_evidence,
        route=route_evidence,
        geofences=geofence_list,
        alerts=alert_list,
        boundary=boundary_evidence,
        simulation=simulation_evidence,
        ocean_analytics=ocean_analytics_evidence,
        ecology=ecology_evidence,
        zone_avoidance=zone_avoidance_evidence,
        tide=tide_evidence,
        location_lat=active_lat,
        location_lon=active_lon,
        date=query_date,
        connectivity_mode=connectivity_mode,
    )

    # Generate Reliable Operational Recommendations with Supporting Evidence & Reasoning Derivation
    recommendations = RecommendationReasoningEngine.generate_recommendations(
        bundle=evidence_bundle,
        user_question=english_question,
        intent=detected_intent,
    )
    evidence_bundle.recommendations = recommendations
    if recommendations:
        reasoning.append(
            f"Reliable Recommendation Engine: Generated {len(recommendations)} evidence-backed recommendation(s) with transparent reasoning traces."
        )

    if executed_tasks:
        reasoning.append(f"Executed agent tasks: {', '.join(executed_tasks)}.")

    # Step 6: Dynamic Conversational & Operational Response Synthesis
    loc_title = f"{location_hint} ({active_lat:.4f}°N, {active_lon:.4f}°E)" if location_hint else f"Station ({active_lat:.4f}°N, {active_lon:.4f}°E)"

    synthesized_answer = DialogueSynthesizer.synthesize_response(
        user_query=question_raw,
        english_query=english_question,
        detected_intent=detected_intent,
        evidence=evidence_bundle,
        location_title=loc_title,
        target_lang=detected_lang,
        history=history,
    )
    reasoning.append("Response generated by Gemini from the supplied evidence and conversation history.")
    localized_reasoning = reasoning
    final_answer = synthesized_answer

    return {
        "language": detected_lang,
        "language_name": lang_name,
        "original_message": question_raw,
        "english_query": english_question,
        "answer": final_answer,
        "reasoning": localized_reasoning,
        "sources_used": sources_used,
        "plan": plan,
        "risk_level": risk_evidence.level if risk_evidence else None,
        "weather": weather_evidence.model_dump() if weather_evidence else None,
        "nearest_pfz": [z.model_dump() for z in pfz_evidence_list] if pfz_evidence_list else None,
        "route": route_evidence.model_dump() if route_evidence else None,
        "geofences": [g.model_dump() for g in geofence_list] if geofence_list else None,
        "alerts": [a.model_dump() for a in alert_list] if alert_list else None,
        "boundary": boundary_evidence.model_dump() if boundary_evidence else None,
        "simulation": simulation_evidence.model_dump() if simulation_evidence else None,
        "ocean_analytics": ocean_analytics_evidence.model_dump() if ocean_analytics_evidence else None,
        "ecology": ecology_evidence.model_dump() if ecology_evidence else None,
        "zone_avoidance": zone_avoidance_evidence.model_dump() if zone_avoidance_evidence else None,
        "tide": tide_evidence.model_dump() if tide_evidence else None,
        "recommendations": [r.model_dump() for r in recommendations],
        "connectivity_mode": connectivity_mode,
        "location": {"lat": active_lat, "lon": active_lon, "name": location_hint},
        "intent": detected_intent,
        "agents_used": list(dict.fromkeys(task.split(":", 1)[0] for task in executed_tasks)),
        "data_timestamp": (weather_evidence.retrieval_time if weather_evidence and weather_evidence.retrieval_time else datetime.now(timezone.utc).isoformat()),
        "fallback_used": connectivity_mode != "LIVE",
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
        boundary=result.get("boundary"),
        simulation=result.get("simulation"),
        ocean_analytics=result.get("ocean_analytics"),
        ecology=result.get("ecology"),
        zone_avoidance=result.get("zone_avoidance"),
        tide=result.get("tide"),
        recommendations=result.get("recommendations"),
        connectivity_mode=result.get("connectivity_mode", "LIVE"),
        location=result.get("location"),
    )


def generate_operational_fallback(question: str, lang: str, loc_title: str) -> str:
    raise ProviderUnavailable("LEGACY_SYNTHETIC_TEMPLATE_DISABLED")
    q_low = question.lower()
    is_gujarati = lang == "gu" or any('\u0A80' <= c <= '\u0AFF' for c in question)
    is_hindi = lang == "hi" or (any('\u0900' <= c <= '\u097F' for c in question) and not any(k in question for k in ["आहे", "नाही", "काय"]))
    is_marathi = lang == "mr" or any(k in question for k in ["आहे", "नाही", "काय", "करावे"])

    # 1. Emergency SOS
    if any(k in q_low for k in ["emergency", "sos", "help", "contact", "police", "coast guard", "નંબર", "ઇમરજન્સી", "કટોકટી", "મદદ", "સહાય", "मदद", "नंबर", "आपातकालीन"]):
        if is_gujarati:
            return (
                "🚨 **દરિયાઈ કટોકટી અને બચાવ સહાય નંબરો (24/7 કાર્યરત)**:\n\n"
                "• **ભારતીય કોસ્ટ ગાર્ડ (Indian Coast Guard)**: **1554** (ટોલ-ફ્રી)\n"
                "• **દરિયાઈ સુરક્ષા પોલીસ (Coastal Security Police)**: **1093**\n"
                "• **રાષ્ટ્રીય આપત્તિ કટોકટી (National Emergency)**: **112**\n"
                "• **VHF મરીન રેડિયો**: ચેનલ **16** (Mayday / Pan-Pan કટોકટી કોલ)\n\n"
                "દરિયામાં બોટનું એન્જિન બંધ પડે કે કોઈ કટોકટી સર્જાય ત્યારે તુરંત જ લંગર (Anchor) નાખો જેથી બોટ આંતરરાષ્ટ્રીય સરહદ તરફ ન તણાય અને VHF Ch 16 પર તાત્કાલિક સંદેશ આપો."
            )
        elif is_hindi or is_marathi:
            return (
                "🚨 **समुद्री आपातकालीन एवं बचाव संपर्क नंबर (24x7 सक्रिय)**:\n\n"
                "• **भारतीय तटरक्षक बल (Indian Coast Guard)**: **1554** (टोल-फ्री)\n"
                "• **तटीय सुरक्षा पुलिस (Coastal Police)**: **1093**\n"
                "• **राष्ट्रीय आपातकाल (National Emergency)**: **112**\n"
                "• **VHF मरीन रेडियो**: चैनल **16** (Mayday / Pan-Pan कॉल)\n\n"
                "यदि समुद्र में नाव का इंजन खराब हो या आपातकाल हो, तो तुरंत लंगर (Anchor) डालें ताकि नाव अंतरराष्ट्रीय सीमा की ओर न बहे, और VHF चैनल 16 पर सहायता मांगें।"
            )
        else:
            return (
                "🚨 **Maritime Emergency Distress & Search-and-Rescue Directory**:\n\n"
                "• **Indian Coast Guard**: **1554** (24/7 Toll-Free)\n"
                "• **Coastal Security Police**: **1093**\n"
                "• **National Emergency Service**: **112**\n"
                "• **VHF Marine Radio Watch**: Channel **16** (Distress / Mayday / Pan-Pan)\n\n"
                "If experiencing engine failure or distress, immediately drop anchor to prevent drifting toward hazards or international borders, activate your DAT-SG transponder, and broadcast on VHF Ch 16."
            )

    # 2. Wind & Sea State
    if any(k in q_low for k in ["wind", "speed", "breeze", "પવન", "ઝડપ", "ગતિ", "हवा", "रफ्तार", "वार"]):
        if is_gujarati:
            return (
                f"**{loc_title} નજીક વર્તમાન પવન અને દરિયાઈ સ્થિતિ**:\n\n"
                "• **પવનની ઝડપ**: ૧૩ થી ૧૮ કિમી/કલાક (હળવાથી મધ્યમ પવન)\n"
                "• **પવનની દિશા**: પશ્ચિમ-દક્ષિણપશ્ચિમ (WSW) તરફથી\n"
                "• **મોજાની ઊંચાઈ**: ૦.૭ થી ૧.૧ મીટર (સામાન્ય અને અનુકૂળ)\n"
                "• **દૃશ્યતા**: ૧૪-૧૬ કિમી (ચોખ્ખું વાતાવરણ)\n\n"
                "પવનની ગતિ સામાન્ય મર્યાદામાં છે અને તમામ પ્રકારની માછીમારી બોટ માટે સ્થિતિ અનુકૂળ છે."
            )
        elif is_hindi or is_marathi:
            return (
                f"**{loc_title} के पास वर्तमान हवा और समुद्री स्थिति**:\n\n"
                "• **हवा की गति**: 13 से 18 किमी/घंटा (मध्यम और अनुकूल)\n"
                "• **हवा की दिशा**: पश्चिम / दक्षिण-पश्चिम\n"
                "• **लहरों की ऊंचाई**: 0.7 से 1.1 मीटर (शांत समुद्र)\n"
                "• **दृश्यता**: लगभग 15 किमी (साफ मौसम)\n\n"
                "हवा की गति सुरक्षित सीमा में है और नाव संचालन के लिए समुद्र अनुकूल है।"
            )
        else:
            return (
                f"**Current Wind & Oceanographic Telemetry near {loc_title}**:\n\n"
                "• **Wind Speed**: 13 to 18 km/h (Light to Moderate breeze)\n"
                "• **Wind Direction**: West-Southwest (WSW ~250°)\n"
                "• **Significant Wave Height**: 0.7 to 1.1 m (Favorable sea state)\n"
                "• **Surface Visibility**: ~15 km (Clear)\n\n"
                "Current surface wind speeds are well within safe operating limits for mechanized and artisanal fishing vessels."
            )

    # 3. PFZ (Potential Fishing Zone)
    if any(k in q_low for k in ["pfz", "fish", "zone", "ઝોન", "માછલી", "મત્સ્ય", "मछली", "ज़ोन"]):
        if is_gujarati:
            return (
                f"**પોટેન્શિયલ ફિશિંગ ઝોન (PFZ - Potential Fishing Zone)**:\n\n"
                "ISRO અને INCOIS ઉપગ્રહ દ્વારા સમુદ્રમાં **ક્લોરોફિલ-a (પ્લેન્કટોન)** અને **સમુદ્ર સપાટી તાપમાન (SST Fronts)** નું પૃથક્કરણ કરીને માછલીઓનો મોટો જથ્થો મળવાની શક્યતા ધરાવતા વિસ્તારો નક્કી કરવામાં આવે છે.\n\n"
                "• **મુખ્ય લાભો**: નિર્દેશિત PFZ કોઓર્ડિનેટ્સ પર સીધા જવાથી ડીઝલના વપરાશમાં ૩૦% થી ૫૦% ની બચત થાય છે અને ટુના, પાપલેટ, બંગડા જેવી ગુણવત્તાયુક્ત માછલીઓ વધુ પ્રમાણમાં પકડાય છે.\n"
                f"• {loc_title} નજીકના સક્રિય PFZ ઝોન તમે ORCA ટેક્ટિકલ મેપ પર સીધા જોઈ શકો છો."
            )
        elif is_hindi or is_marathi:
            return (
                f"**पोटेंशियल फिशिंग ज़ोन (PFZ - Potential Fishing Zone)**:\n\n"
                "इसरो (ISRO) और इनकोइस (INCOIS) उपग्रह डेटा द्वारा समुद्र में क्लोरोफिल और थर्मल फ्रन्ट्स (SST) के आधार पर उच्च मछली घनत्व वाले क्षेत्रों की पहचान की जाती है।\n\n"
                "• **लाभ**: सीधे PFZ निर्देशांकों पर जाने से नौका के डीजल में 30% से 50% तक की बचत होती है और बेहतर मछली पकड़ मिलती है।\n"
                f"• {loc_title} के पास सक्रिय PFZ क्षेत्र ORCA मैप पर देख सकते हैं।"
            )
        else:
            return (
                f"**Potential Fishing Zones (PFZ) Overview near {loc_title}**:\n\n"
                "Potential Fishing Zones are ocean sectors identified via ISRO Ocean Colour and Sea Surface Temperature (SST) satellite observations where ocean upwelling concentrates nutrient-rich plankton and pelagic fish schools.\n\n"
                "• **Fishermen Benefits**: Direct navigation to advisory coordinates reduces search time and diesel consumption by 30–50% while significantly boosting target catch (Tuna, Mackerel, Pomfret).\n"
                "• View real-time plotted PFZ zones directly on the ORCA Tactical Map."
            )

    # 4. Default: Safety to Fish / Sail
    if is_gujarati:
        return (
            f"✅ **માછીમારી અને સફર માટે દરિયાઈ સ્થિતિ સંપૂર્ણ સલામત છે**\n\n"
            f"{loc_title} નજીકના સેટેલાઇટ દરિયાઈ નિરીક્ષણ મુજબ સ્થિતિ સામાન્ય અને અનુકૂળ છે:\n"
            "• **મોજાની ઊંચાઈ**: **૦.૭ થી ૧.૧ મીટર** (સલામત મર્યાદામાં)\n"
            "• **પવનની ઝડપ**: **૧૩ થી ૧૮ કિમી/કલાક** (પશ્ચિમ દિશા તરફથી)\n"
            "• **દૃશ્યતા**: **૧૫ કિમી** (ચોખ્ખું વાતાવરણ)\n"
            "• **સમુદ્ર તાપમાન**: **૨૮.૫°C**\n\n"
            "**સલામતી સૂચનાઓ**:\n"
            "1. બોટ રવાના કરતાં પહેલાં તમામ ક્રૂ સભ્યોએ લાઈફ જેકેટ પહેરેલું હોવું ફરજિયાત છે.\n"
            "2. VHF મરીન રેડિયો ચેનલ 16 પર નિયમિત મોનિટરિંગ રાખો.\n"
            "3. આપત્તિ ચેતવણી ટ્રાન્સપોન્ડર (DAT-SG) ચાલુ રાખો."
        )
    elif is_hindi or is_marathi:
        return (
            f"✅ **मछली पकड़ने और नौकायन के लिए समुद्र सामान्य एवं सुरक्षित है**\n\n"
            f"{loc_title} के पास वर्तमान समुद्री टेलीमेट्री के अनुसार स्थिति अनुकूल है:\n"
            "• **लहरों की ऊंचाई**: **0.7 से 1.1 मीटर** (सुरक्षित सीमा में)\n"
            "• **हवा की गति**: **13 से 18 किमी/घंटा** (पश्चिम से)\n"
            "• **दृश्यता**: **15 किमी** (साफ मौसम)\n"
            "• **समुद्री सतह तापमान**: **28.5°C**\n\n"
            "**सुरक्षा दिशानिर्देश**:\n"
            "1. प्रस्थान से पहले सभी कर्मी अनिवार्य रूप से लाइफ जैकेट पहनें।\n"
            "2. वीएचएफ मरीन रेडियो चैनल 16 पर निरंतर संपर्क बनाए रखें।\n"
            "3. आपातकालीन ट्रांसपोंडर (DAT-SG) की जांच कर लें।"
        )
    else:
        return (
            f"✅ **CONDITIONS ARE GENERALLY SAFE FOR FISHING & SAILING**\n\n"
            f"Based on operational oceanographic telemetry near {loc_title}, conditions are favorable for marine activities:\n"
            "• **Significant Wave Height**: **0.7 to 1.1 m** (Well within safe operating limits)\n"
            "• **Wind Speed & Direction**: **13 to 18 km/h** from West-Southwest\n"
            "• **Surface Visibility**: **~15 km** (Clear atmosphere)\n"
            "• **Sea Surface Temperature**: **28.5°C**\n\n"
            "**Standard Precautions**:\n"
            "1. All crew must wear certified life jackets before casting off.\n"
            "2. Maintain continuous watch on VHF Marine Radio Channel 16.\n"
            "3. Verify fuel, emergency rations, and distress beacon battery before leaving harbor."
        )


@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(request: ChatRequest, user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)) -> ChatResponse:
    """Dedicated conversational endpoint with Bhashini multilingual orchestration."""
    rate_limiter.check("chat", user.id, limit=30)
    if not request.session_id:
        conversation = chat_storage_service.create(db, user.id, request.message[:80])
        db.commit()
        request.session_id = conversation.id
    history_dicts = chat_storage_service.context(db, user.id, request.session_id)
    if history_dicts is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    cache_key = f"{user.id}:{request.session_id}:{request.request_id}" if request.request_id else None
    if cache_key:
        with _chat_idempotency_lock:
            cached = _chat_idempotency_cache.get(cache_key)
        if cached:
            return cached

    lat = request.location.lat if request.location else None
    lon = request.location.lon if request.location else None
    q_date = request.date or dt_date.today().isoformat()

    # Never trust client-supplied history; context is loaded from the authenticated user's conversation.
    chat_storage_service.append(db, user.id, request.session_id, "user", request.message, request.language or "auto")

    db.commit()  # Persist the user turn even when the provider is unavailable.
    try:
        if request.location is None:
            lid = bhashini_service.identify_language(request.message, session_id=None)
            response_lang = lid.short_code
            if not any(character.isalpha() for character in request.message):
                preferred = (request.language or "en").lower().split("-")[0]
                response_lang = preferred if preferred in SUPPORTED_LANGUAGES else "en"
            evidence = EvidenceBundle(date=q_date, connectivity_mode="UNAVAILABLE")
            answer = DialogueSynthesizer.synthesize_response(
                user_query=request.message, english_query=request.message, detected_intent="general",
                evidence=evidence, location_title="Not selected. Ask the user to choose a location for local conditions; provide general explanations only.",
                target_lang=response_lang, history=history_dicts,
            )
            result = {"language": response_lang, "language_name": SUPPORTED_LANGUAGES.get(response_lang, response_lang), "original_message": request.message,
                      "english_query": request.message, "answer": answer, "reasoning": [], "sources_used": [],
                      "plan": ExecutionPlan(intent="general", tasks=[]), "connectivity_mode": "UNAVAILABLE", "location": None}
        else:
            result = _process_orca_query(
                question_raw=request.message,
                lat=lat,
                lon=lon,
                query_date=q_date,
                requested_lang=request.language or "auto",
                session_id=request.session_id,
                history=history_dicts,
            )
    except ProviderUnavailable:
        # Preserve the user turn, but never store a scripted safety answer as AI output.
        raise

    response = ChatResponse(
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
        boundary=result.get("boundary"),
        simulation=result.get("simulation"),
        ocean_analytics=result.get("ocean_analytics"),
        ecology=result.get("ecology"),
        zone_avoidance=result.get("zone_avoidance"),
        tide=result.get("tide"),
        recommendations=result.get("recommendations"),
        connectivity_mode=result.get("connectivity_mode", "LIVE"),
        location=result.get("location"),
        session_id=request.session_id,
        request_id=request.request_id,
        intent=result.get("intent", "general"),
        mode=result.get("connectivity_mode", "LIVE").lower(),
        agents_used=result.get("agents_used", []),
        data_timestamp=result.get("data_timestamp", datetime.now(timezone.utc).isoformat()),
        fallback_used=result.get("fallback_used", False),
    )
    if cache_key:
        with _chat_idempotency_lock:
            if len(_chat_idempotency_cache) >= 512:
                _chat_idempotency_cache.pop(next(iter(_chat_idempotency_cache)))
            _chat_idempotency_cache[cache_key] = response
    chat_storage_service.append(db, user.id, request.session_id, "assistant", response.answer, response.language, {
        "sources": response.sources_used,
        "risk_level": response.risk_level,
        "connectivity_mode": response.connectivity_mode,
        "language": response.language,
        "weather": response.weather,
        "nearest_pfz": response.nearest_pfz,
        "boundary": response.boundary,
    })
    conversation = chat_storage_service._owned(db, user.id, request.session_id)
    if conversation and conversation.title == "New conversation":
        conversation.title = request.message[:80]
    db.commit()
    return response


@app.get("/api/recommendations")
def get_recommendations_endpoint(
    lat: float = Query(18.9220),
    lon: float = Query(72.8347),
    date: Optional[str] = Query(None),
    question: Optional[str] = Query(None),
):
    """Delivers reliable operational recommendations together with the supporting evidence and reasoning used to derive each response."""
    q_date = date or dt_date.today().isoformat()
    q_text = question or "Provide comprehensive marine safety, fishing, and navigational recommendations."
    res = _process_orca_query(
        question_raw=q_text,
        lat=lat,
        lon=lon,
        query_date=q_date,
        requested_lang="en",
    )
    return {
        "location": {"lat": lat, "lon": lon},
        "date": q_date,
        "recommendations": res.get("recommendations", []),
        "evidence_summary": {
            "weather": res.get("weather"),
            "risk_level": res.get("risk_level"),
            "nearest_pfz": res.get("nearest_pfz"),
            "route": res.get("route"),
            "geofences": res.get("geofences"),
            "alerts": res.get("alerts"),
            "boundary": res.get("boundary"),
            "ocean_analytics": res.get("ocean_analytics"),
            "ecology": res.get("ecology"),
            "zone_avoidance": res.get("zone_avoidance"),
            "tide": res.get("tide"),
        },
        "reasoning_trace": res.get("reasoning", []),
        "sources_used": res.get("sources_used", []),
    }


@app.get("/api/analytics/ocean")
def get_ocean_analytics_endpoint(lat: float = Query(18.9220), lon: float = Query(72.8347), region: Optional[str] = Query(None)):
    """Returns satellite ocean color, chlorophyll-a concentration, and thermal front analytics."""
    from app.services.satellite.mosdac_service import mosdac_service
    if mosdac_service.is_configured:
        obs = mosdac_service.get_satellite_observations(lat=lat, lon=lon)
        if obs.get("status") == "HEALTHY":
            return obs
    raise HTTPException(status_code=503, detail="SATELLITE_OBSERVATIONS_UNAVAILABLE")


@app.get("/api/satellite/status")
def get_satellite_status():
    """Returns status and metadata for ISRO MOSDAC satellite integration."""
    from app.services.satellite.mosdac_service import mosdac_service
    return mosdac_service.get_satellite_observations(lat=18.9220, lon=72.8347)



@app.get("/api/analytics/productivity")
def get_productivity_decline_endpoint(region: str = Query("Maharashtra Coast"), lat: float = Query(18.9220), lon: float = Query(72.8347)):
    """Returns marine ecological root-cause analysis for fish productivity and catch decline."""
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=dt_date.today().isoformat())
    raise HTTPException(status_code=503, detail="HISTORICAL_CATCH_OBSERVATIONS_UNAVAILABLE")



@app.get("/api/analytics/zone-avoidance")
def get_zone_avoidance_endpoint(lat: float = Query(18.9220), lon: float = Query(72.8347)):
    """Returns evaluated zones to avoid due to hazardous marine conditions or geofencing restrictions."""
    weather = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=dt_date.today().isoformat())
    geofences = evaluate_vessel_geofences(lat, lon)
    pfz_zones = get_pfz_zones_evidence(provider=pfz_provider, lat=lat, lon=lon, wave_height_m=weather.wave_height_m)
    evidence = evaluate_zone_avoidance(lat=lat, lon=lon, weather=weather, geofences=geofences, candidate_pfz=pfz_zones)
    return evidence.model_dump()


@app.get("/api/marine/tide")
def get_marine_tide_endpoint(lat: float = Query(18.9220), lon: float = Query(72.8347)):
    """Returns tidal predictions, high/low tide timings, and tidal ranges."""
    raise HTTPException(status_code=503, detail="TIDE_FEED_UNAVAILABLE")
