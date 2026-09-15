from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers.pfz import router


def test_unconfigured_feed_does_not_depend_on_historical_files(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/api/pfz")
    assert response.status_code == 200
    expected = {
        "source": "unavailable",
        "data_mode": "unavailable",
        "issued_at": None,
        "valid_until": None,
        "pfz_zones": [],
        "reason": "No timestamped current PFZ advisory feed is configured",
    }

    assert {key: response.json()[key] for key in expected} == expected
    assert response.json()["coverage_status"] == "unconfigured"
