"""Behavioral regression tests for the real ORCA /api/chat orchestration."""
import re
from difflib import SequenceMatcher

from fastapi.testclient import TestClient

from app.main import app
from tests.auth_helpers import authenticate_client


client = authenticate_client(TestClient(app))
VERAVAL = {"lat": 20.9159, "lon": 70.3629}


def ask(message: str, request_id: str, session_id: str = "quality-veraval", history=None):
    if client.get("/api/user/profile").status_code != 200:
        authenticate_client(client)
    response = client.post("/api/chat", json={
        "message": message,
        "location": VERAVAL,
        "language": "en",
        "session_id": session_id,
        "request_id": request_id,
        "history": history or [],
    })
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["answer"].strip()
    assert body["request_id"] == request_id
    assert body["session_id"] == session_id
    assert body["mode"] in {"live", "cached", "degraded", "offline"}
    assert isinstance(body["agents_used"], list)
    assert body["data_timestamp"]
    return body


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text.lower())).strip()


def test_agent_routing_metadata_context_idempotency_and_uniqueness():
    cases = [
        ("Where is the nearest PFZ today?", "pfz_agent"),
        ("Is it safe to go fishing tomorrow morning?", "risk_agent"),
        ("What is the wave height near Veraval?", "weather_agent"),
        ("What are the wind conditions near Veraval?", "weather_agent"),
        ("What is the SST near Veraval?", "weather_agent"),
        ("Are there any hazardous marine conditions near Veraval?", "hazard_agent"),
        ("How far am I from the international maritime boundary?", "boundary_agent"),
        ("What areas should I avoid?", "ocean_analytics_agent"),
        ("Find me a safer fishing route.", "route_agent"),
        ("Why has fish productivity fallen in this area?", "ocean_analytics_agent"),
    ]
    results = []
    for index, (prompt, expected_agent) in enumerate(cases):
        body = ask(prompt, f"quality-{index}", session_id=f"quality-{index}")
        assert expected_agent in body["agents_used"], (prompt, body["intent"], body["agents_used"])
        results.append(body)
    assert {"weather_agent", "hazard_agent", "risk_agent"}.issubset(results[1]["agents_used"])
    assert {"pfz_agent", "geospatial_agent", "weather_agent", "risk_agent", "hazard_agent"}.issubset(results[0]["agents_used"])

    # Different operational intents must not collapse to one canned paragraph.
    unique_answers = {normalized(result["answer"]) for result in results}
    assert len(unique_answers) >= 8
    for i, left in enumerate(results):
        for right in results[i + 1:]:
            if left["intent"] != right["intent"]:
                assert SequenceMatcher(None, normalized(left["answer"]), normalized(right["answer"])).ratio() < 0.96

    # Same request ID is idempotent and returns the same response without another orchestration result.
    first = ask("Tell me the weather near Veraval.", "idempotent-one", "idempotent-session")
    second = ask("This changed text must not execute.", "idempotent-one", "idempotent-session")
    assert second == first

    history = []
    conversation = [
        "Is it safe near Veraval tomorrow?",
        "What about after 4 PM?",
        "Why?",
        "Would a small fishing boat be safe?",
    ]
    for index, prompt in enumerate(conversation):
        body = ask(prompt, f"follow-up-{index}", "follow-up-safety", history)
        history.extend([{"role": "user", "text": prompt}, {"role": "assistant", "text": body["answer"]}])
    assert body["intent"] in {"safety_check", "weather_conditions"}
    assert "risk_agent" in body["agents_used"]
