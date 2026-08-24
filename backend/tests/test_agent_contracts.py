"""Unit tests for structured agent contracts and EvidenceBundle models."""
import unittest
from pydantic import ValidationError

from app.models.agent_models import (
    AgentResult,
    EvidenceBundle,
    PFZEvidence,
    RiskEvidence,
    WeatherEvidence,
)


class TestAgentContracts(unittest.TestCase):
    """Test suite validating Pydantic models for agent evidence exchange."""

    def test_1_weather_evidence_validation(self):
        """Validates WeatherEvidence construction and schema enforcement."""
        weather = WeatherEvidence(
            forecast="clear",
            wave_height_m=1.2,
            wind_speed_kmh=18.5,
            temperature_c=29.0,
            visibility_km=15.0,
            source="mock_marine_weather",
            is_mock=True,
        )
        self.assertEqual(weather.forecast, "clear")
        self.assertEqual(weather.wave_height_m, 1.2)
        self.assertEqual(weather.wind_speed_kmh, 18.5)
        self.assertEqual(weather.temperature_c, 29.0)
        self.assertTrue(weather.is_mock)

        # Missing required fields should raise ValidationError
        with self.assertRaises(ValidationError):
            WeatherEvidence(forecast="clear", wave_height_m=1.0)  # missing wind_speed_kmh & source

    def test_2_pfz_evidence_validation(self):
        """Validates PFZEvidence construction and species list handling."""
        pfz = PFZEvidence(
            name="INCOIS Zone (Satpati)",
            latitude=19.7242,
            longitude=72.0794,
            distance_km=18.4,
            depth_m=35.0,
            species=["Mackerel", "Pomfret", "Sardines"],
            source="incois_derived_pfz_dataset",
            is_mock=False,
        )
        self.assertEqual(pfz.name, "INCOIS Zone (Satpati)")
        self.assertEqual(pfz.distance_km, 18.4)
        self.assertEqual(len(pfz.species), 3)
        self.assertFalse(pfz.is_mock)
        self.assertEqual(pfz.source, "incois_derived_pfz_dataset")

        # Invalid types should raise ValidationError
        with self.assertRaises(ValidationError):
            PFZEvidence(
                name="Zone A",
                latitude="not-a-float",
                longitude=72.0,
                distance_km=10.0,
                species=[],
                source="test",
            )

    def test_3_risk_evidence_validation(self):
        """Validates RiskEvidence construction with risk levels and triggers."""
        risk = RiskEvidence(
            level="caution",
            reason="CAUTION ADVISED: wave height exceeds threshold",
            factors=["wave height of 1.80m exceeds safety threshold (>1.5m)"],
            source="risk_assessment_agent",
        )
        self.assertEqual(risk.level, "caution")
        self.assertIn("CAUTION", risk.reason)
        self.assertEqual(len(risk.factors), 1)
        self.assertEqual(risk.source, "risk_assessment_agent")

    def test_4_agent_result_success_and_failure(self):
        """Validates AgentResult envelope for success and error states."""
        # Successful result
        res_ok = AgentResult(
            agent="weather_agent",
            action="get_marine_conditions",
            success=True,
            evidence={"forecast": "clear", "wave_height_m": 1.1},
        )
        self.assertTrue(res_ok.success)
        self.assertIsNone(res_ok.error)
        self.assertEqual(res_ok.evidence["forecast"], "clear")

        # Failed result
        res_fail = AgentResult(
            agent="weather_agent",
            action="get_marine_conditions",
            success=False,
            error="Timeout connecting to data provider",
        )
        self.assertFalse(res_fail.success)
        self.assertIsNone(res_fail.evidence)
        self.assertEqual(res_fail.error, "Timeout connecting to data provider")

    def test_5_evidence_bundle_construction(self):
        """Validates unified EvidenceBundle composition."""
        weather = WeatherEvidence(
            forecast="rainy",
            wave_height_m=1.8,
            wind_speed_kmh=42.0,
            source="mock_marine_weather",
            is_mock=True,
        )
        pfz = PFZEvidence(
            name="Zone D",
            latitude=18.8675,
            longitude=72.8956,
            distance_km=8.8,
            depth_m=65.0,
            species=["Kingfish", "Seer Fish"],
            source="incois_derived_pfz_dataset",
            is_mock=False,
        )
        risk = RiskEvidence(
            level="caution",
            reason="Reduced visibility and squalls",
            factors=["forecast is rainy", "wind speed 42.0 km/h > 40 km/h"],
            source="risk_assessment_agent",
        )

        bundle = EvidenceBundle(
            weather=weather,
            pfz_zones=[pfz],
            risk=risk,
            location_lat=18.9220,
            location_lon=72.8347,
            date="2026-08-24",
        )

        self.assertIsNotNone(bundle.weather)
        self.assertEqual(bundle.weather.forecast, "rainy")
        self.assertEqual(len(bundle.pfz_zones), 1)
        self.assertEqual(bundle.pfz_zones[0].name, "Zone D")
        self.assertEqual(bundle.risk.level, "caution")
        self.assertEqual(bundle.location_lat, 18.9220)
        self.assertEqual(bundle.date, "2026-08-24")


if __name__ == "__main__":
    unittest.main()
