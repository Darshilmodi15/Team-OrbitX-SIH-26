"""Chat resolves intent first and explains only canonical snapshot evidence."""
import re
from time import perf_counter
from datetime import datetime, timezone
from fastapi import HTTPException
from app.models.agent_models import EvidenceBundle
from app.services.bhashini import bhashini_service, SUPPORTED_LANGUAGES
from app.services.dialogue_synthesizer import DialogueSynthesizer
from app.services.planner import ExecutionPlan, ExecutionTask
from app.services.temporal import resolve_query_time
from app.services.marine_snapshot_service import marine_snapshot_service, request_time, stamp
from app.agents.intent_agent import _fallback_intent


def simple_conversation(text):
    return bool(re.fullmatch(r"(?:hello|hi|hey|thanks|thank you|good morning|good evening|namaste|namaskar|નમસ્તે|નમસ્કાર|હેલો|આભાર|नमस्ते|नमस्कार|धन्यवाद)[!.?\s]*", text.strip(), re.I))


def process_snapshot_chat(request, user, db, provider, history):
    trace = []
    started = perf_counter()
    def event(stage, provider_name, status="complete", detail=None):
        nonlocal started
        now = perf_counter()
        trace.append({"stage":stage, "provider":provider_name, "status":status,
            "latency_ms":round((now-started)*1000, 1),
            "timestamp":datetime.now(timezone.utc).isoformat(), "detail":detail})
        started = now
    decision = bhashini_service.determine_query_language(text=request.message,
        requested_lang=request.language or "auto", session_id=request.session_id)
    event("Language selection", "ORCA language layer", detail=decision.response_language)
    english = decision.english_normalized_query or request.message
    general = simple_conversation(request.message) or simple_conversation(english)
    intent = "general" if general else _fallback_intent(english).get("intent", "general")
    definition = bool(re.search(r"\b(?:what (?:does|is)|define|meaning of)\s+(?:(?:a|an|the)\s+)?(?:pfz|sst|eez|imbl|swell|chlorophyll)\b", english, re.I)) and not re.search(r"\b(now|today|tomorrow|near|current|my|here)\b", english, re.I)
    # Unknown follow-ups inherit marine context only when a previous assistant
    # actually used it; greetings and definitions remain provider independent.
    previous = chat_snapshot_from_history(db, user.id, request.session_id)
    marine = not general and not definition and (intent != "general" or previous is not None or request.snapshot_id is not None)
    event("Intent routing", "ORCA intent rules", detail=intent)
    snap = None
    evidence = EvidenceBundle(date=request.date, connectivity_mode="UNAVAILABLE")
    if marine:
        target = resolve_query_time(text=english, request_date=request.date)
        explicit = bool(target.time_hint) and target.time_hint != "today"
        try:
            if explicit:
                snap = marine_snapshot_service.resolve(db, user.id, provider, target.target_utc.isoformat())
            elif request.snapshot_id:
                snap = marine_snapshot_service.get_by_id(db, user.id, request.snapshot_id, require_current=True)
                if request.requested_time and request_time(request.requested_time) != stamp(snap.request.requested_time):
                    raise HTTPException(status_code=409, detail="SNAPSHOT_REQUESTED_TIME_MISMATCH")
            else:
                try:
                    snap = marine_snapshot_service.resolve(db, user.id, provider, request.requested_time)
                except HTTPException as exc:
                    if exc.detail != "SAVED_LOCATION_REQUIRED":
                        raise
        except HTTPException as exc:
            if exc.detail != "SAVED_LOCATION_REQUIRED":
                raise
        if snap:
            evidence = marine_snapshot_service.evidence(snap)
    event("Evidence retrieval", ", ".join(snap.provenance["source"]) if snap else "None",
          "complete" if snap else "skipped" if not marine else "unavailable",
          detail="Owned canonical snapshot" if snap else "No local marine evidence used")
    if snap:
        trace.append({"stage":"Risk assessment", "provider":"ORCA deterministic risk engine", "status":"snapshot_result",
                      "latency_ms":None, "timestamp":snap.provenance["retrieved_at"], "detail":snap.risk["level"]})
    location_title = (f"{snap.location.name}; requested time {snap.request.requested_time}" if snap else
        "No marine evidence requested for this conversational turn. Do not infer whether the user has a saved location." if general or definition else
        "No marine evidence available. Give general explanations only; ask for a saved location before local advice.")
    answer = DialogueSynthesizer.synthesize_response(user_query=request.message, english_query=english,
        detected_intent=intent, evidence=evidence, location_title=location_title,
        target_lang=decision.response_language, history=history if snap else [])
    event("Response generation", getattr(answer, "model", None) or "Configured language model", detail=decision.response_language)
    result = {"language":decision.response_language, "language_name":SUPPORTED_LANGUAGES.get(decision.response_language, decision.response_language),
        "original_message":request.message, "english_query":english, "answer":str(answer),
        "ai_model":getattr(answer, "model", None), "ai_fallback_used":getattr(answer, "fallback_used", False),
        "reasoning": ["Explained canonical snapshot " + snap.snapshot_id] if snap else ["General conversation; marine providers not requested."],
        "sources_used":snap.provenance["source"] if snap else [],
        "plan":ExecutionPlan(intent=intent, tasks=[ExecutionTask(agent="marine_snapshot_service",action="read_snapshot")] if snap else []),
        "risk_level":snap.risk["level"] if snap else None,
        "weather":evidence.weather.model_dump() if evidence.weather else None,
        "nearest_pfz":[z.model_dump() for z in evidence.pfz_zones] or None,
        "connectivity_mode":evidence.connectivity_mode, "location":snap.location.model_dump() if snap else None,
        "snapshot_id":snap.snapshot_id if snap else None, "marine_snapshot":snap,
        "intent":intent, "data_timestamp":snap.provenance["retrieved_at"] if snap else None,
        "original_transcript":decision.original_transcript, "detected_languages":decision.detected_languages,
        "dominant_language":decision.dominant_language, "response_language":decision.response_language,
        "english_normalized_query":english, "language_confidence":decision.language_confidence,
        "transcription_provider":decision.transcription_provider, "operational_trace":trace}
    return result


def chat_snapshot_from_history(db, user_id, conversation_id):
    from app.db.models import ChatHistory
    import json
    row = db.query(ChatHistory).filter_by(user_id=user_id, conversation_id=conversation_id, role="assistant").order_by(ChatHistory.created_at.desc()).first()
    return json.loads(row.sources_used_json or "{}").get("snapshot_id") if row else None
