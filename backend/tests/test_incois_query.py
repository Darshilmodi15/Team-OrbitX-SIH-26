"""End-to-end integration tests for ORCA Wave, Wind, and combined multi-agent query pipeline."""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest

from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import IncoisWeatherProvider
from app.main import app, weather_provider


client = TestClient(app)


def test_wave_height_query():
    """Query: 'What is the wave height here?'"""
    mock_csv = (
        "time,station,latitude,longitude,HS,UWND,VWND\n"
        "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.82,4.5,1.2\n"
    )
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv

    with patch("httpx.Client.get", return_value=mock_resp):
        response = client.post(
            "/query",
            json={
                "location": {"lat": 18.9220, "lon": 72.8347},
                "date": "2026-08-24",
                "question": "What is the wave height here?",
                "language": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "Significant Wave Height" in data["answer"] or "0.82" in data["answer"]
    assert "INCOIS" in data["answer"]
    assert any("INCOIS" in s for s in data["sources_used"])


def test_wind_speed_query():
    """Query: 'What is the wind speed near my location?'"""
    mock_csv = (
        "time,station,latitude,longitude,HS,UWND,VWND\n"
        "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.80,6.0,3.0\n"
    )
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv

    with patch("httpx.Client.get", return_value=mock_resp):
        response = client.post(
            "/query",
            json={
                "location": {"lat": 18.9220, "lon": 72.8347},
                "date": "2026-08-24",
                "question": "What is the wind speed near my location?",
                "language": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "Wind Speed" in data["answer"]
    assert "m/s" in data["answer"]


def test_wind_direction_query():
    """Query: 'What is the wind direction?'"""
    mock_csv = (
        "time,station,latitude,longitude,HS,UWND,VWND\n"
        "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.80,6.0,0.0\n"
    )
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv

    with patch("httpx.Client.get", return_value=mock_resp):
        response = client.post(
            "/query",
            json={
                "location": {"lat": 18.9220, "lon": 72.8347},
                "date": "2026-08-24",
                "question": "What is the wind direction?",
                "language": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "Wind Direction" in data["answer"]
    assert "W (" in data["answer"] or "270" in data["answer"]


def test_combined_wave_and_wind_conditions_query():
    """Query: 'What are the current wave and wind conditions?'"""
    mock_csv = (
        "time,station,latitude,longitude,HS,UWND,VWND\n"
        "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,1.15,5.5,2.0\n"
    )
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_csv

    with patch("httpx.Client.get", return_value=mock_resp):
        response = client.post(
            "/query",
            json={
                "location": {"lat": 18.9220, "lon": 72.8347},
                "date": "2026-08-24",
                "question": "What are the current wave and wind conditions?",
                "language": "en",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "Significant Wave Height" in data["answer"]
    assert "Wind Speed" in data["answer"]
    assert "Wind Direction" in data["answer"]
    assert "Forecast Time" in data["answer"]


def test_unrelated_pfz_query_preserves_functionality():
    """Unrelated PFZ query should continue to work cleanly without regressions."""
    response = client.post(
        "/query",
        json={
            "location": {"lat": 18.9220, "lon": 72.8347},
            "date": "2026-08-24",
            "question": "Where is the nearest PFZ fishing zone?",
            "language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "Potential Fishing Zones" in data["answer"] or "PFZ" in data["answer"]
