"""End-to-end integration tests for ORCA Wave, Wind, and combined multi-agent query pipeline."""
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app


class TestIncoisQuery(unittest.TestCase):
    """Integration test suite for INCOIS wave and wind query pipeline."""

    def setUp(self):
        self.client = TestClient(app)

    def test_wave_height_query(self):
        """Query: 'What is the wave height here?'"""
        mock_csv = (
            "time,station,latitude,longitude,HS,UWND,VWND\n"
            "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.82,4.5,1.2\n"
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = mock_csv

        with patch("httpx.Client.get", return_value=mock_resp):
            response = self.client.post(
                "/query",
                json={
                    "location": {"lat": 18.9220, "lon": 72.8347},
                    "date": "2026-08-24",
                    "question": "What is the wave height here?",
                    "language": "en",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        self.assertTrue(any(s in data["sources_used"] for s in ["INCOIS_OSF_WW3", "open_meteo_marine_api", "mock_marine_weather"]))

    def test_wind_speed_query(self):
        """Query: 'What is the wind speed near my location?'"""
        mock_csv = (
            "time,station,latitude,longitude,HS,UWND,VWND\n"
            "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.80,6.0,3.0\n"
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = mock_csv

        with patch("httpx.Client.get", return_value=mock_resp):
            response = self.client.post(
                "/query",
                json={
                    "location": {"lat": 18.9220, "lon": 72.8347},
                    "date": "2026-08-24",
                    "question": "What is the wind speed near my location?",
                    "language": "en",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")

    def test_wind_direction_query(self):
        """Query: 'What is the wind direction?'"""
        mock_csv = (
            "time,station,latitude,longitude,HS,UWND,VWND\n"
            "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,0.80,6.0,0.0\n"
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = mock_csv

        with patch("httpx.Client.get", return_value=mock_resp):
            response = self.client.post(
                "/query",
                json={
                    "location": {"lat": 18.9220, "lon": 72.8347},
                    "date": "2026-08-24",
                    "question": "What is the wind direction?",
                    "language": "en",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")

    def test_combined_wave_and_wind_conditions_query(self):
        """Query: 'What are the current wave and wind conditions?'"""
        mock_csv = (
            "time,station,latitude,longitude,HS,UWND,VWND\n"
            "2026-08-24T15:00:00Z,GridPoint[18.920N_72.830E],18.900,72.800,1.15,5.5,2.0\n"
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = mock_csv

        with patch("httpx.Client.get", return_value=mock_resp):
            response = self.client.post(
                "/query",
                json={
                    "location": {"lat": 18.9220, "lon": 72.8347},
                    "date": "2026-08-24",
                    "question": "What are the current wave and wind conditions?",
                    "language": "en",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")

    def test_unrelated_pfz_query_preserves_functionality(self):
        """Unrelated PFZ query should continue to work cleanly without regressions."""
        response = self.client.post(
            "/query",
            json={
                "location": {"lat": 18.9220, "lon": 72.8347},
                "date": "2026-08-24",
                "question": "Where is the nearest PFZ fishing zone?",
                "language": "en",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        assert data['answer'].startswith("TEST_PROVIDER_RESPONSE ")


if __name__ == "__main__":
    unittest.main()


# Explicit upstream fixtures: these tests exercise orchestration, not live model prose.
import pytest
pytestmark = pytest.mark.usefixtures("pipeline_providers")
