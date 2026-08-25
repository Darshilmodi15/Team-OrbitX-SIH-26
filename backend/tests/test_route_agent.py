import unittest
from app.agents.route_agent import plan_safe_marine_route
from app.models.agent_models import WeatherEvidence


class TestRouteAgent(unittest.TestCase):
    def test_plan_safe_route_dahanu_to_pfz(self):
        # Dahanu: 19.9700 N, 72.7300 E -> Satpati PFZ: 19.7242 N, 72.0794 E
        weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="calm",
            wave_height_m=1.1,
            wind_speed_kmh=18.5,
            is_mock=False,
        )
        route = plan_safe_marine_route(
            origin_lat=19.9700,
            origin_lon=72.7300,
            dest_lat=19.7242,
            dest_lon=72.0794,
            dest_name="INCOIS Zone (Satpati)",
            origin_name="Dahanu Station",
            weather=weather,
        )

        self.assertEqual(route.origin_name, "Dahanu Station")
        self.assertEqual(route.destination_name, "INCOIS Zone (Satpati)")
        self.assertGreater(route.distance_km, 0)
        self.assertGreater(route.distance_nm, 0)
        self.assertGreater(route.estimated_duration_hours, 0)
        self.assertTrue(route.is_advisory_only)
        self.assertEqual(len(route.waypoints), 3)
        self.assertEqual(route.waypoints[0].name, "Departure Station")
        self.assertEqual(route.waypoints[-1].name, "Arrival: INCOIS Zone (Satpati)")
        self.assertIn("SAFE", route.risk_assessment)

    def test_route_avoidance_and_advisory(self):
        weather = WeatherEvidence(
            source="INCOIS_OSF_WW3",
            forecast="rough",
            wave_height_m=2.2,
            wind_speed_kmh=42.0,
            is_mock=False,
        )
        route = plan_safe_marine_route(
            origin_lat=19.9700,
            origin_lon=72.7300,
            dest_lat=19.5000,
            dest_lon=72.1000,
            weather=weather,
        )
        self.assertIn(route.risk_assessment, ["CAUTION", "HIGH RISK"])
        self.assertTrue(any("Headwind" in note or "wind" in note.lower() for note in route.advisory_notes))


if __name__ == "__main__":
    unittest.main()
