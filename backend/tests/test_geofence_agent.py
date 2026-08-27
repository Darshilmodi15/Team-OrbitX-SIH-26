import unittest
from app.agents.geospatial_agent import analyze_geospatial_context, calculate_bearing
from app.data.geofence import evaluate_vessel_geofences, point_in_polygon


class TestGeofenceAgent(unittest.TestCase):
    def test_calculate_bearing(self):
        # Due north
        bearing, cardinal = calculate_bearing(18.0, 72.0, 19.0, 72.0)
        self.assertEqual(bearing, 0.0)
        self.assertEqual(cardinal, "N")

        # Due east
        bearing_e, cardinal_e = calculate_bearing(18.0, 72.0, 18.0, 73.0)
        self.assertAlmostEqual(bearing_e, 90.0, delta=1.0)
        self.assertEqual(cardinal_e, "E")

    def test_point_in_polygon(self):
        polygon = [
            [10.0, 10.0],
            [10.0, 20.0],
            [20.0, 20.0],
            [20.0, 10.0],
            [10.0, 10.0],
        ]
        self.assertTrue(point_in_polygon(15.0, 15.0, polygon))
        self.assertFalse(point_in_polygon(5.0, 5.0, polygon))

    def test_evaluate_geofences_near_dahanu(self):
        # Dahanu Station: 19.9700 N, 72.7300 E (near Tarapur security zone)
        geofences = evaluate_vessel_geofences(19.9700, 72.7300)
        self.assertGreater(len(geofences), 0)

        tarapur = next((g for g in geofences if g.id == "sec-tarapur"), None)
        self.assertIsNotNone(tarapur)
        self.assertTrue(tarapur.is_demonstration)
        self.assertIsNotNone(tarapur.distance_to_vessel_km)

    def test_analyze_geospatial_context(self):
        ctx = analyze_geospatial_context(
            vessel_lat=19.9700,
            vessel_lon=72.7300,
            target_lat=19.7242,
            target_lon=72.0794,
        )
        self.assertEqual(ctx["vessel_lat"], 19.9700)
        self.assertIn("target_distance_km", ctx)
        self.assertIn("target_bearing_deg", ctx)
        self.assertIn("target_bearing_cardinal", ctx)


if __name__ == "__main__":
    unittest.main()
