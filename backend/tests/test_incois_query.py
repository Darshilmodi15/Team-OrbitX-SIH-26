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
        self.assertTrue("Significant Wave Height" in data["answer"] or "0.82" in data["answer"])
        self.assertIn("INCOIS", data["answer"])
        self.assertTrue(any("INCOIS" in s for s in data["sources_used"]))

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
        self.assertIn("Wind Speed", data["answer"])
        self.assertIn("m/s", data["answer"])

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
        self.assertIn("Wind Direction", data["answer"])
        self.assertTrue("W (" in data["answer"] or "270" in data["answer"])

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
        self.assertIn("Significant Wave Height", data["answer"])
        self.assertIn("Wind Speed", data["answer"])
        self.assertIn("Wind Direction", data["answer"])
        self.assertIn("Forecast Time", data["answer"])

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
        self.assertTrue("Potential Fishing Zones" in data["answer"] or "PFZ" in data["answer"])


if __name__ == "__main__":
    unittest.main()
