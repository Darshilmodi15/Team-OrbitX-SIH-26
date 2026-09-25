from datetime import datetime, timezone
import json
from fastapi.testclient import TestClient
from app.main import app
from app.agents.risk_agent import assess_risk
from app.services.demo_scenarios import DemoScenarioProvider, LiveProvider, SCENARIOS, validate_demo
from app.models.marine_snapshot import MarineSnapshot, SnapshotWeather
from app.services.display_geometry import reference_geometry
from app.data.weather.cache import MarineWeatherCache
from tests.auth_helpers import authenticate_client
import pytest


def base_snapshot(location):
    now=datetime.now(timezone.utc)
    return MarineSnapshot(snapshot_id="test",location=location,
        request={"requested_date":now.date().isoformat(),"requested_time":now.isoformat()},
        weather=SnapshotWeather(),ocean={"sst_c":None},pfz={"zones":[]},tide={"availability":"unavailable"},
        boundary={"geometry":None},hazards=[],risk={},provenance={"cache_status":"unavailable"},
        missing_fields=[],expires_at=now.isoformat(),backend_sha="test")


def test_demo_requires_explicit_server_config(monkeypatch):
    monkeypatch.delenv("DEMO_MODE",raising=False)
    validate_demo(None)
    with pytest.raises(Exception) as error: validate_demo("mumbai")
    assert error.value.status_code == 403


@pytest.mark.parametrize("scenario",SCENARIOS)
def test_demo_is_separate_labelled_and_deterministic(scenario):
    source=base_snapshot(SCENARIOS[scenario])
    provider=DemoScenarioProvider(LiveProvider(lambda:source),scenario,datetime.now(timezone.utc))
    result=provider.snapshot()
    assert source.weather.wave_height_m is None
    assert result.provenance["demo_scenario"] == scenario
    assert result.provenance["cache_status"] == "simulated"
    assert all("SIMULATION" in f["source"] for f in result.provenance["fields"].values())
    assert result.risk["assessment_type"] == "ORCA_SIMULATION"
    assert result.pfz["zones"][0]["geometry_meaning"] == "illustrative_search_region"
    assert result.weather == provider.snapshot().weather


def test_complete_live_data_wins():
    source=base_snapshot(SCENARIOS["mumbai"])
    demo=DemoScenarioProvider(LiveProvider(lambda:source),"mumbai",datetime.now(timezone.utc)).snapshot()
    demo.provenance={"cache_status":"cached"}
    result=DemoScenarioProvider(LiveProvider(lambda:demo),"mumbai",datetime.now(timezone.utc)).snapshot()
    assert result is demo and "demo_scenario" not in result.provenance


def test_partial_current_risk_and_stale_guard():
    data={"wave_height_m":.8,"wind_speed_kmh":15,"wave_period_s":8,"cache_status":"fresh","is_mock":False}
    result=assess_risk(data)
    assert result.level == "low" and result.evidence_completeness == "partial"
    assert "weather_code" in result.missing_evidence
    assert assess_risk({**data,"cache_status":"stale"}).level == "unknown"
    assert assess_risk({**data,"swell_wave_height_m":3}).level == "unsafe"


def test_weather_cache_is_bounded():
    cache=MarineWeatherCache(capacity=4)
    stamp=datetime.now(timezone.utc).isoformat()
    for i in range(20): cache.set(18+i,72,{"wave_height_m":1},forecast_valid_at=stamp)
    assert cache.size() <= 4


def test_display_geometry_copy_does_not_mutate_cached_source():
    geo={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}}]}
    first=reference_geometry(geo)
    first["features"].clear()
    assert len(reference_geometry(geo)["features"]) == 1
    assert len(geo["features"]) == 1


def test_sidebar_summaries_and_complete_owned_history():
    client=authenticate_client(TestClient(app))
    a=client.post("/api/conversations",json={"title":"Video A"}).json()["id"]
    b=client.post("/api/conversations",json={"title":"Video B"}).json()["id"]
    from app.db.session import get_db_context
    from app.services.chat_service import chat_storage_service
    from app.db.models import Conversation
    with get_db_context() as db:
        row=db.query(Conversation).filter_by(id=a).first()
        owner=row.user_id
        for i in range(3):
            chat_storage_service.append(db,owner,a,"user","A "+str(i))
        chat_storage_service.append(db,owner,b,"user","B")
        db.commit()
    rows=client.get("/api/conversations").json()
    assert all(not r["messages"] for r in rows)
    assert [m["content"] for m in client.get("/api/conversations/"+a).json()["messages"]] == ["A 0","A 1","A 2"]
    assert client.get("/api/conversations/"+b).json()["messages"][0]["content"] == "B"
    other=authenticate_client(TestClient(app))
    assert other.get("/api/conversations/"+a).status_code == 404
