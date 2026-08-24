"""Automated tests for PFZ dataset API endpoints."""
import json
from pathlib import Path
import sys
import urllib.request

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app


def test_health_endpoint():
    """Verify GET / returns healthy status and registered endpoints."""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "/api/pfz" in data["endpoints"]
    print("Health check endpoint test passed.")


def test_pfz_endpoint():
    """Verify GET /api/pfz loads 11 INCOIS records from JSON."""
    client = TestClient(app)
    response = client.get("/api/pfz")
    assert response.status_code == 200
    data = response.json()

    # Source & Region validations
    assert data.get("source") == "INCOIS"
    assert data.get("region") == "Maharashtra"

    # Zone records validation
    zones = data.get("pfz_zones", [])
    assert len(zones) == 11, f"Expected 11 records, got {len(zones)}"

    for z in zones:
        assert "id" in z and z["id"].startswith("pfz_")
        assert "landing_centre" in z
        assert "direction" in z
        assert "bearing_deg" in z and isinstance(z["bearing_deg"], (int, float))
        assert "distance_km" in z and "min" in z["distance_km"] and "max" in z["distance_km"]
        assert "depth_m" in z and "min" in z["depth_m"] and "max" in z["depth_m"]
        assert "latitude" in z and isinstance(z["latitude"], (int, float))
        assert "longitude" in z and isinstance(z["longitude"], (int, float))

    print("GET /api/pfz endpoint test passed with all 11 records validated.")


def test_live_server(base_url="http://127.0.0.1:8000"):
    """Verify live HTTP communication against the running uvicorn instance."""
    # 1. Health check
    with urllib.request.urlopen(f"{base_url}/") as res:
        assert res.getcode() == 200
        health = json.loads(res.read().decode("utf-8"))
        assert health["status"] == "healthy"

    # 2. PFZ endpoint
    with urllib.request.urlopen(f"{base_url}/api/pfz") as res:
        assert res.getcode() == 200
        pfz_data = json.loads(res.read().decode("utf-8"))
        assert pfz_data["source"] == "INCOIS"
        assert pfz_data["region"] == "Maharashtra"
        assert len(pfz_data["pfz_zones"]) == 11
        for z in pfz_data["pfz_zones"]:
            assert "latitude" in z and "longitude" in z

    print(f"Live HTTP tests passed on {base_url}.")


if __name__ == "__main__":
    test_health_endpoint()
    test_pfz_endpoint()
    test_live_server()
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
