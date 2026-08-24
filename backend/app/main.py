"""FastAPI Application for ORCA Marine AI with Bhashini Multilingual Service & Geofence Intelligence."""
from datetime import date as dt_date
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.boundary_agent import check_marine_boundary_evidence
from app.agents.geofence_agent import evaluate_geofences
from app.agents.intent_agent import parse_intent
from app.agents.pfz_agent import get_pfz_zones_evidence
from app.agents.risk_agent import assess_risk
from app.agents.weather_agent import get_marine_weather
from app.data.geofence.base import GeofenceProvider
from app.data.geofence.spatial_provider import SpatialGeofenceProvider
from app.data.pfz.base import PFZProvider
from app.data.pfz.mock import MockPFZProvider
from app.data.weather.base import WeatherProvider
from app.data.weather.mock import MockWeatherProvider
from app.data.weather.open_meteo import OpenMeteoWeatherProvider
from app.models.agent_models import (
    AgentResult,
    BoundaryEvidence,
    EvidenceBundle,
    GeofenceEvidence,
    MarineRiskProfile,
    PFZEvidence,
    RiskEvidence,
    WeatherEvidence,
)
from app.routers.auth import router as auth_router, user_router
from app.routers.location import router as location_router
from app.routers.marine_boundaries import router as boundaries_router
from app.routers.pfz import router as pfz_router
from app.routers.voice import router as voice_router
from app.services.language import SUPPORTED_LANGUAGES, language_service
from app.services.bhashini import bhashini_service
from app.services.planner import ExecutionPlan, Planner

# Initialize data providers
weather_provider: WeatherProvider = OpenMeteoWeatherProvider()
pfz_provider: PFZProvider = MockPFZProvider()
geofence_provider: GeofenceProvider = SpatialGeofenceProvider()

app = FastAPI(
    title="ORCA Marine AI Backend",
    description="Autonomous Maritime Intelligence, Multi-Agent Decision Support, Risk Matrix, Sarvam AI Multilingual Layer, and Coastal Safety Platform.",
    version="1.4.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers.notifications import router as notifications_router

# Include API routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(location_router)
app.include_router(notifications_router)
app.include_router(pfz_router)
app.include_router(boundaries_router)
app.include_router(voice_router)


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
    risk_profile: Optional[MarineRiskProfile] = Field(default=None, description="Decomposed risk profile across vectors")
    weather: Optional[WeatherEvidence] = Field(default=None, description="Structured meteorological evidence")
    nearest_pfz: Optional[List[PFZEvidence]] = Field(default=None, description="Structured PFZ evidence items")
    boundary: Optional[BoundaryEvidence] = Field(default=None, description="Marine Boundary & EEZ geofence evaluation")
    geofence: Optional[GeofenceEvidence] = Field(default=None, description="Maritime boundary and geofence intelligence")


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
    risk_profile: Optional[MarineRiskProfile] = None
    weather: Optional[Dict[str, Any]] = None
    nearest_pfz: Optional[List[Dict[str, Any]]] = None
    boundary: Optional[BoundaryEvidence] = None
    geofence: Optional[Dict[str, Any]] = None


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
        "version": "1.3.0",
        "sarvam_configured": language_service.is_configured,
        "bhashini_configured": language_service.is_configured,
        "endpoints": [
            "/query",
            "/api/chat",
            "/api/marine/conditions",
            "/api/marine/risk",
            "/api/marine/forecast",
            "/api/geofences",
            "/api/pfz",
            "/api/languages",
            "/api/detect-language",
            "/api/translate",
            "/api/voice/transcribe",
            "/api/voice/transcribe-base64",
            "/api/voice/speak",
            "/api/voice/speakers",
            "/api/marine-boundaries/info",
            "/api/marine-boundaries/eez",
            "/api/marine-boundaries/check",
        ],
    }


# ==========================================
# Dedicated REST Endpoints for Dashboard
# ==========================================

@app.get("/api/marine/conditions", response_model=WeatherEvidence)
def get_marine_conditions_endpoint(
    lat: float = Query(18.9220, description="Vessel latitude"),
    lon: float = Query(72.8347, description="Vessel longitude"),
    date: Optional[str] = Query(None, description="Forecast date (YYYY-MM-DD)"),
):
    """Direct REST endpoint retrieving normalized marine weather telemetry."""
    q_date = date or dt_date.today().isoformat()
    return get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)


@app.get("/api/marine/risk", response_model=RiskEvidence)
def get_marine_risk_endpoint(
    lat: float = Query(18.9220, description="Vessel latitude"),
    lon: float = Query(72.8347, description="Vessel longitude"),
    date: Optional[str] = Query(None, description="Forecast date (YYYY-MM-DD)"),
):
    """Direct REST endpoint evaluating decomposed environmental risk and trends."""
    q_date = date or dt_date.today().isoformat()
    weather_ev = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    return assess_risk(weather_ev)


@app.get("/api/marine/forecast")
def get_marine_forecast_endpoint(
    lat: float = Query(18.9220, description="Vessel latitude"),
    lon: float = Query(72.8347, description="Vessel longitude"),
    date: Optional[str] = Query(None, description="Forecast date (YYYY-MM-DD)"),
):
    """Direct REST endpoint returning hourly forecast horizon for marine trends."""
    q_date = date or dt_date.today().isoformat()
    weather_ev = get_marine_weather(provider=weather_provider, lat=lat, lon=lon, date=q_date)
    return {
        "location": {"lat": lat, "lon": lon},
        "date": q_date,
        "forecast_horizon": weather_ev.forecast_horizon or [],
        "source": weather_ev.source,
    }


@app.get("/api/geofences")
def get_geofences_endpoint(
    lat: Optional[float] = Query(None, description="Optional vessel latitude to evaluate proximity"),
    lon: Optional[float] = Query(None, description="Optional vessel longitude to evaluate proximity"),
):
    """Direct REST endpoint returning all registered marine boundary zones and spatial evaluation."""
    all_zones = geofence_provider.get_all_geofences()
    if lat is not None and lon is not None:
        evidence = evaluate_geofences(geofence_provider, lat=lat, lon=lon)
        return {
            "vessel_location": {"lat": lat, "lon": lon},
            "status": evidence.model_dump(),
            "geofences": all_zones,
        }
    return {"count": len(all_zones), "geofences": all_zones}


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
    """Detects the Indian regional language of input text using Sarvam AI / Language Service."""
    lang_code = language_service.detect_language(request.text)
    return {
        "language": lang_code,
        "language_name": SUPPORTED_LANGUAGES.get(lang_code, "Unknown"),
    }


@app.post("/api/translate")
def translate_endpoint(request: TranslateRequest):
    """Translates text between Indian languages and English using Sarvam AI / Language Service."""
    translated = language_service.translate(
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


# ==========================================
# Core Multi-Agent Orchestrator
# ==========================================

def _process_orca_query(
    question_raw: str,
    lat: float,
    lon: float,
    query_date: str,
    requested_lang: str = "auto",
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core ORCA Agentic Multilingual & Decision Pipeline:
    1. Language Detection via Sarvam AI / Language Service
    2. Intent Classification Agent
    3. Deterministic Task Planner
    4. Execution: Weather Agent -> Risk Engine -> PFZ Agent -> Spatial Geofence Agent
    5. Operational Response Synthesis & Translation to User Indic Language
    """
    reasoning: List[str] = []
    sources_used: List[str] = []
    agent_results: List[AgentResult] = []

    # Step 1: Detect or resolve language
    if not requested_lang or requested_lang.lower() == "auto":
        detected_lang = language_service.detect_language(question_raw, session_id=session_id)
    else:
        detected_lang = requested_lang.lower()
        if session_id:
            language_service.set_session_language(session_id, detected_lang)

    lang_name = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang.upper())
    sources_used.append("sarvam_ai_language_service")
    sources_used.append("bhashini_multilingual_service")

    # Step 2: Translate Indic text to English if needed
    if detected_lang != "en":
        english_question = language_service.translate(
            text=question_raw,
            source_lang=detected_lang,
            target_lang="en",
        )
        reasoning.append(
            f"Language Layer (Sarvam AI): Identified language as '{lang_name}' ({detected_lang}). "
            f"Translated user query to English: '{english_question}'."
        )
    else:
        english_question = question_raw
        reasoning.append(
            f"Language Layer (Sarvam AI): Processed native English query: '{english_question}'."
        )

    # Step 3: Intent Classification Agent
    intent_res = parse_intent(english_question)
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
            f"Detected intent '{detected_intent}' (location hint: '{location_hint}') for question: '{english_question}'."
        )
    else:
        reasoning.append(
            f"Detected intent '{detected_intent}' for question: '{english_question}'."
        )

    # Step 4: Task Planning & Orchestration
    plan = Planner.plan(
        question=english_question,
        intent=detected_intent,
        lat=lat,
        lon=lon,
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

    # Inspect planned tasks
    needs_weather = any(t.agent == "weather_agent" and t.action == "get_marine_conditions" for t in plan.tasks)
    needs_risk = any(t.agent == "risk_agent" and t.action == "assess_risk" for t in plan.tasks)
    needs_pfz = any(t.agent == "pfz_agent" and t.action == "find_nearest_zones" for t in plan.tasks)
    needs_geospatial = any(t.agent == "geospatial_agent" and t.action == "calculate_distance" for t in plan.tasks)
    needs_boundary = any(t.agent == "boundary_agent" and t.action == "check_boundary" for t in plan.tasks)
    needs_geofence = any(t.agent == "geofence_agent" and t.action == "evaluate_boundaries" for t in plan.tasks)

    weather_evidence: Optional[WeatherEvidence] = None
    risk_evidence: Optional[RiskEvidence] = None
    pfz_evidence_list: List[PFZEvidence] = []
    boundary_evidence: Optional[BoundaryEvidence] = None
    geofence_evidence: Optional[GeofenceEvidence] = None
    executed_tasks: List[str] = []
    skipped_tasks: List[str] = []

    # Step 5: Execute planned agent tasks
    # 5a. Weather Agent
    if needs_weather:
        weather_evidence = get_marine_weather(
            provider=weather_provider,
            lat=lat,
            lon=lon,
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
        reasoning.append(
            f"Evidence (weather_agent): marine forecast='{weather_evidence.forecast}', wave_height={weather_evidence.wave_height_m}m, wind_speed={weather_evidence.wind_speed_kmh} km/h (gusts: {weather_evidence.wind_gust_kmh or 'N/A'} km/h)."
        )
    else:
        skipped_tasks.append("weather_agent:get_marine_conditions")

    # 5b. Risk Assessment Agent
    if needs_risk:
        if weather_evidence is None:
            weather_evidence = get_marine_weather(
                provider=weather_provider,
                lat=lat,
                lon=lon,
                date=query_date,
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

    # 5c. PFZ & Geospatial Agents
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

    # 5d. Marine Boundaries Agent (Marine Regions / VLIZ World EEZ v12)
    if needs_boundary:
        boundary_evidence = check_marine_boundary_evidence(lat=lat, lon=lon)
        sources_used.append(boundary_evidence.source)
        executed_tasks.append("boundary_agent:check_boundary")
        agent_results.append(
            AgentResult(
                agent="boundary_agent",
                action="check_boundary",
                success=True,
                evidence=boundary_evidence.model_dump(),
            )
        )
        reasoning.append(
            f"Evidence (boundary_agent): jurisdiction='{boundary_evidence.country}' ({boundary_evidence.zone_name}), "
            f"distance_to_boundary={boundary_evidence.distance_to_boundary_km} km, geofence_status='{boundary_evidence.geofence_status.upper()}' "
            f"[Source: {boundary_evidence.source}]."
        )
    else:
        skipped_tasks.append("boundary_agent:check_boundary")

    # 5e. Geofence & Boundary Agent (IMBL & MPAs)
    if needs_geofence:
        geofence_evidence = evaluate_geofences(
            provider=geofence_provider,
            lat=lat,
            lon=lon,
        )
        sources_used.append(geofence_evidence.source)
        executed_tasks.append("geofence_agent:evaluate_boundaries")
        agent_results.append(
            AgentResult(
                agent="geofence_agent",
                action="evaluate_boundaries",
                success=True,
                evidence=geofence_evidence.model_dump(),
            )
        )
        if geofence_evidence.active_alerts:
            alerts_desc = ", ".join([f"{a.name} ({a.distance_nm} NM, {a.severity})" for a in geofence_evidence.active_alerts])
            reasoning.append(f"Evidence (geofence_agent): {len(geofence_evidence.active_alerts)} boundary alert(s) active: {alerts_desc}.")
        else:
            nearest_str = f"Nearest: {geofence_evidence.nearest_boundary.name} ({geofence_evidence.nearest_boundary.distance_nm} NM)" if geofence_evidence.nearest_boundary else "Clear"
            reasoning.append(f"Evidence (geofence_agent): clear of all restricted zones. {nearest_str}.")
    else:
        skipped_tasks.append("geofence_agent:evaluate_boundaries")

    # Construct EvidenceBundle
    evidence_bundle = EvidenceBundle(
        weather=weather_evidence,
        pfz_zones=pfz_evidence_list,
        risk=risk_evidence,
        boundary=boundary_evidence,
        geofence=geofence_evidence,
        location_lat=lat,
        location_lon=lon,
        date=query_date,
    )

    # Record summary of executed and skipped tasks
    if executed_tasks:
        reasoning.append(f"Executed tasks: {', '.join(executed_tasks)}.")
    if skipped_tasks and plan.tasks:
        reasoning.append(f"Skipped capabilities not requested: {', '.join(skipped_tasks)}.")

    # Step 6: Synthesize English operational response from EvidenceBundle
    answer_parts = [
        f"Operational Advisory for ({lat:.4f}, {lon:.4f}) on {query_date}:"
    ]

    # Geofence alerts if triggered
    if evidence_bundle.geofence and evidence_bundle.geofence.active_alerts:
        alert_lines = []
        for al in evidence_bundle.geofence.active_alerts:
            icon = "🚨" if al.severity == "CRITICAL" else "⚠️"
            status_text = "INSIDE RESTRICTED ZONE" if al.is_inside else f"{al.distance_nm} NM away (Threshold: {al.threshold_nm} NM)"
            alert_lines.append(f"- {icon} **{al.name}** [{al.type}]: {status_text}. {al.description or ''}")
        answer_parts.append("🚨 MARITIME GEOFENCE / BOUNDARY ALERT:\n" + "\n".join(alert_lines))

    # Risk & Weather Assessment
    if evidence_bundle.risk and evidence_bundle.weather:
        w_ev = evidence_bundle.weather
        r_ev = evidence_bundle.risk
        profile = r_ev.profile

        wind_extra = f", Wind Direction: {w_ev.wind_direction_cardinal or 'N/A'}"
        if w_ev.wind_gust_kmh:
            wind_extra += f", Gusts: {w_ev.wind_gust_kmh} km/h"
        
        cloud_str = f", Cloud: {w_ev.cloud_category} ({int(w_ev.cloud_cover_pct)}%)" if w_ev.cloud_cover_pct is not None else ""
        vis_str = f", Visibility: {w_ev.visibility_km} km ({w_ev.visibility_category})" if w_ev.visibility_km is not None else ""
        provenance = f" [Source: {w_ev.source}]"

        status_emoji = "🚨" if r_ev.level == "unsafe" else ("⚠️" if r_ev.level == "caution" else "🟢")
        answer_parts.append(
            f"{status_emoji} **ORCA Risk Assessment: {profile.overall if profile else r_ev.level.upper()}**\n"
            f"- Significant Wave Height: {w_ev.wave_height_m:.2f}m (Period: {w_ev.wave_period_s or 'N/A'}s)\n"
            f"- Wind Speed: {w_ev.wind_speed_kmh:.1f} km/h{wind_extra}\n"
            f"- Atmosphere: {w_ev.forecast.capitalize()}{cloud_str}{vis_str}\n"
            f"- Model Assessment: {r_ev.reason}{provenance}"
        )

        if profile and profile.warnings:
            answer_parts.append("**Active Hazard Warnings:**\n" + "\n".join([f"• {w}" for w in profile.warnings]))

        if profile and profile.recommendations:
            answer_parts.append("**Operational Recommendations:**\n" + "\n".join([f"• {r}" for r in profile.recommendations]))

        answer_parts.append(f"_{r_ev.disclaimer}_")

    elif evidence_bundle.weather:
        w_ev = evidence_bundle.weather
        spd_ms_str = f"{w_ev.wind_speed_ms:.2f} m/s" if w_ev.wind_speed_ms is not None else f"{w_ev.wind_speed_kmh / 3.6:.2f} m/s"
        dir_str = f"{w_ev.wind_direction_cardinal} ({w_ev.wind_direction_deg:.1f}°)" if (w_ev.wind_direction_cardinal and w_ev.wind_direction_deg is not None) else (w_ev.wind_direction_cardinal or "N/A")
        f_time_desc = f"- Forecast Time: {w_ev.forecast_time or 'Latest available'}\n"
        cloud_desc = f"- Cloud Cover: {w_ev.cloud_category} ({w_ev.cloud_cover_pct}%)\n" if w_ev.cloud_cover_pct is not None else ""
        vis_desc = f"- Visibility: {w_ev.visibility_km} km ({w_ev.visibility_category})\n" if w_ev.visibility_km is not None else ""
        sst_desc = f"- Sea Surface Temp: {w_ev.sea_surface_temperature_c}°C\n" if w_ev.sea_surface_temperature_c is not None else ""

        answer_parts.append(
            f"Marine Meteorological Conditions:\n"
            f"- Forecast: {w_ev.forecast.capitalize()}\n"
            f"- Significant Wave Height: {w_ev.wave_height_m:.2f} m (Period: {w_ev.wave_period_s or 'N/A'}s)\n"
            f"- Wind Speed: {spd_ms_str} ({w_ev.wind_speed_kmh:.1f} km/h)\n"
            f"- Wind Gusts: {w_ev.wind_gust_kmh or 'N/A'} km/h\n"
            f"- Wind Direction: {dir_str}\n"
            f"{f_time_desc}{cloud_desc}{vis_desc}{sst_desc}"
            f"[Source: {w_ev.source}]"
        )

    if evidence_bundle.pfz_zones:
        risk_level = evidence_bundle.risk.level if evidence_bundle.risk else "safe"
        if risk_level == "unsafe":
            answer_parts.append(
                "Due to hazardous marine conditions, traveling to fishing zones is strictly discouraged at this time."
            )
        else:
            pfz_text_lines = [
                f"- {z.name}: {z.distance_km} km away at ({z.latitude}, {z.longitude}), depth ~{int(z.depth_m) if z.depth_m is not None else 30}m, likely species: {', '.join(z.species)}"
                for z in evidence_bundle.pfz_zones
            ]
            answer_parts.append("Nearby Potential Fishing Zones (PFZ):\n" + "\n".join(pfz_text_lines))

    # Boundary & EEZ section
    if evidence_bundle.boundary:
        b_ev = evidence_bundle.boundary
        b_icon = "🛡️" if b_ev.geofence_status == "safe" else ("⚠️" if b_ev.geofence_status == "warning" else "🚨")
        answer_parts.append(
            f"Maritime Boundary Status ({b_ev.dataset_version} - {b_ev.source}):\n"
            f"- Zone: {b_ev.zone_name} (MRGID: {b_ev.mrgid})\n"
            f"- Sovereign Jurisdiction: {b_ev.country}\n"
            f"- Distance to Maritime Boundary: {b_ev.distance_to_boundary_km} km\n"
            f"- Geofence Alert: {b_icon} {b_ev.geofence_status.upper()} ({b_ev.status_message})"
        )

    if not evidence_bundle.weather and not evidence_bundle.pfz_zones and not evidence_bundle.boundary and not evidence_bundle.geofence:
        answer_parts.append(
            "ORCA Marine AI is standing by. You can ask for navigational safety assessments (e.g., 'Is it safe to sail today?'), potential fishing zones (e.g., 'Where is the nearest PFZ?'), boundary alerts (e.g., 'Am I near the IMBL?'), or marine weather forecasts."
        )

    english_answer = "\n\n".join(answer_parts)
    reasoning.append("Synthesized operational response based on executed agent evidence.")

    # Step 7: Translate English response back to target Indic language
    if detected_lang != "en":
        final_answer = language_service.translate(
            text=english_answer,
            source_lang="en",
            target_lang=detected_lang,
        )
        reasoning.append(
            f"Language Layer (Sarvam AI): Translated operational response back into {lang_name}."
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
        "risk_profile": risk_evidence.profile if risk_evidence else None,
        "weather": weather_evidence.model_dump() if weather_evidence else None,
        "nearest_pfz": [z.model_dump() for z in pfz_evidence_list] if pfz_evidence_list else None,
        "boundary": boundary_evidence,
        "geofence": geofence_evidence.model_dump() if geofence_evidence else None,
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
        risk_profile=result.get("risk_profile"),
        weather=result.get("weather"),
        nearest_pfz=result.get("nearest_pfz"),
        boundary=result.get("boundary"),
        geofence=result.get("geofence"),
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
        risk_profile=result.get("risk_profile"),
        weather=result.get("weather"),
        nearest_pfz=result.get("nearest_pfz"),
        boundary=result.get("boundary"),
        geofence=result.get("geofence"),
    )
