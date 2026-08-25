import unittest
from app.agents.hazard_agent import detect_proactive_hazards
from app.models.agent_models import WeatherEvidence


class TestHazardAgent(unittest.TestCase):
    def test_detect_high_wave_hazard(self):
        weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="rough",
            wave_height_m=3.2,
            wind_speed_kmh=25.0,
            is_mock=False,
        )
        alerts = detect_proactive_hazards(lat=19.9700, lon=72.7300, weather=weather, location_name="Dahanu")
        self.assertTrue(any(a.severity == "critical" and "High Wave" in a.title for a in alerts))

    def test_detect_gale_wind_hazard(self):
        weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="windy",
            wave_height_m=1.2,
            wind_speed_kmh=55.0,
            is_mock=False,
        )
        alerts = detect_proactive_hazards(lat=19.9700, lon=72.7300, weather=weather, location_name="Dahanu")
        self.assertTrue(any(a.severity == "critical" and "Wind" in a.title for a in alerts))

    def test_calm_conditions_no_weather_alerts(self):
        weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="calm",
            wave_height_m=0.8,
            wind_speed_kmh=12.0,
            is_mock=False,
        )
        alerts = detect_proactive_hazards(lat=18.9220, lon=72.8347, weather=weather, location_name="Mumbai Port")
        weather_alerts = [a for a in alerts if "wave" in a.id or "wind" in a.id or "storm" in a.id]
        self.assertEqual(len(weather_alerts), 0)


if __name__ == "__main__":
    unittest.main()
