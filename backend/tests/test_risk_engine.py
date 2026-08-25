"""Unit tests for ORCA Marine Risk Assessment Engine and MarineRiskProfile."""
import unittest

from app.agents.risk_agent import assess_risk
from app.models.agent_models import MarineRiskProfile, RiskEvidence, WeatherEvidence


class TestRiskEngine(unittest.TestCase):
    """Test suite verifying decomposed environmental risk matrix and trends."""

    def test_calm_safe_conditions(self):
        """Verifies that calm seas and moderate winds produce LOW risk / SAFE status."""
        weather = WeatherEvidence(
            forecast="clear",
            wave_height_m=0.8,
            wave_period_s=8.5,
            wind_speed_kmh=18.0,
            wind_gust_kmh=24.0,
            visibility_km=15.0,
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)

        self.assertEqual(risk.level, "safe")
        self.assertIsNotNone(risk.profile)
        self.assertEqual(risk.profile.overall, "LOW")
        self.assertEqual(risk.profile.status_label, "SAFE")
        self.assertEqual(risk.profile.wave_risk.level, "LOW")
        self.assertEqual(risk.profile.wind_risk.level, "LOW")
        self.assertIn("SAFE TO SAIL", risk.reason)
        self.assertTrue(len(risk.profile.recommendations) > 0)

    def test_moderate_wave_height_caution(self):
        """Verifies that wave heights between 1.5m and 2.5m trigger MODERATE / CAUTION."""
        weather = WeatherEvidence(
            forecast="partly cloudy",
            wave_height_m=1.85,
            wave_period_s=7.0,
            wind_speed_kmh=22.0,
            wind_gust_kmh=30.0,
            visibility_km=12.0,
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)

        self.assertEqual(risk.level, "caution")
        self.assertEqual(risk.profile.overall, "MODERATE")
        self.assertEqual(risk.profile.status_label, "CAUTION")
        self.assertEqual(risk.profile.wave_risk.level, "MODERATE")
        self.assertTrue(any("wave height" in w.lower() for w in risk.profile.warnings))

    def test_steep_chop_wave_period_penalty(self):
        """Verifies that short wave periods (<5.5s) with waves >1.2m elevate wave risk."""
        weather = WeatherEvidence(
            forecast="clear",
            wave_height_m=1.35,
            wave_period_s=4.2,  # steep short period chop
            wind_speed_kmh=24.0,
            wind_gust_kmh=32.0,
            visibility_km=14.0,
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)

        self.assertEqual(risk.level, "caution")
        self.assertEqual(risk.profile.wave_risk.level, "MODERATE")
        self.assertTrue(any("chop" in w.lower() or "period" in w.lower() for w in risk.profile.warnings))

    def test_severe_gale_and_waves_unsafe(self):
        """Verifies that waves >2.5m or gusts >60 km/h produce HIGH risk / UNSAFE."""
        weather = WeatherEvidence(
            forecast="stormy",
            wave_height_m=3.2,
            wave_period_s=6.0,
            wind_speed_kmh=56.0,
            wind_gust_kmh=75.0,
            visibility_km=3.0,
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)

        self.assertEqual(risk.level, "unsafe")
        self.assertEqual(risk.profile.overall, "HIGH")
        self.assertEqual(risk.profile.status_label, "UNSAFE")
        self.assertEqual(risk.profile.storm_risk.level, "HIGH")
        self.assertEqual(risk.profile.gust_risk.level, "HIGH")
        self.assertIn("UNSAFE FOR SAILING", risk.reason)

    def test_forecast_horizon_deterioration_trend(self):
        """Verifies that a deteriorating 6-hour forecast triggers proactive caution."""
        weather = WeatherEvidence(
            forecast="clear",
            wave_height_m=1.1,
            wave_period_s=8.0,
            wind_speed_kmh=20.0,
            wind_gust_kmh=26.0,
            visibility_km=12.0,
            forecast_horizon=[
                {"hour_offset": 1, "wave_height_m": 1.3, "wind_speed_kmh": 22.0},
                {"hour_offset": 2, "wave_height_m": 1.7, "wind_speed_kmh": 28.0},
                {"hour_offset": 3, "wave_height_m": 2.2, "wind_speed_kmh": 36.0},
                {"hour_offset": 4, "wave_height_m": 2.6, "wind_speed_kmh": 42.0},
            ],
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)

        self.assertEqual(risk.profile.forecast_trend, "deteriorating")
        self.assertEqual(risk.level, "caution")
        self.assertTrue(any("deteriorating" in w.lower() for w in risk.profile.warnings))

    def test_disclaimer_presence(self):
        """Verifies that all risk evidence contains mandatory advisory disclaimer."""
        weather = WeatherEvidence(
            forecast="clear",
            wave_height_m=0.7,
            wind_speed_kmh=15.0,
            source="open_meteo_marine_api",
            is_mock=False,
        )
        risk = assess_risk(weather)
        self.assertTrue(len(risk.disclaimer) > 10)
        self.assertIn("ORCA Risk Assessment", risk.disclaimer)


if __name__ == "__main__":
    unittest.main()
