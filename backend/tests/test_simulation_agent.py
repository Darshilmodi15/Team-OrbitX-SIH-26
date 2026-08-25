import unittest
from app.agents.risk_agent import assess_risk
from app.agents.simulation_agent import run_what_if_simulation
from app.models.agent_models import WeatherEvidence


class TestSimulationAgent(unittest.TestCase):
    def test_run_wave_height_simulation_escalation(self):
        baseline_weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="calm",
            wave_height_m=1.0,
            wind_speed_kmh=15.0,
            is_mock=False,
        )
        baseline_risk = assess_risk(baseline_weather)
        self.assertEqual(baseline_risk.level, "safe")

        # Simulate +2.0m increase in wave height (total 3.0m)
        sim = run_what_if_simulation(
            baseline_weather=baseline_weather,
            baseline_risk=baseline_risk,
            delta_wave_m=2.0,
        )
        self.assertTrue(sim.is_simulation)
        self.assertEqual(sim.baseline_risk, "SAFE")
        self.assertEqual(sim.simulated_risk, "UNSAFE")
        self.assertIn("escalated", sim.impact_summary.lower())

    def test_run_wind_speed_simulation(self):
        baseline_weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="calm",
            wave_height_m=0.8,
            wind_speed_kmh=10.0,
            is_mock=False,
        )
        baseline_risk = assess_risk(baseline_weather)

        sim = run_what_if_simulation(
            baseline_weather=baseline_weather,
            baseline_risk=baseline_risk,
            target_wind_kmh=45.0,
        )
        self.assertEqual(sim.baseline_risk, "SAFE")
        self.assertIn(sim.simulated_risk, ["CAUTION", "UNSAFE"])


if __name__ == "__main__":
    unittest.main()
