"""Unit tests for ORCA Spatial Geofence & Maritime Boundary Engine."""
import unittest

from app.data.geofence.spatial_provider import (
    SpatialGeofenceProvider,
    haversine_km,
    point_in_polygon,
    point_to_segment_distance_km,
)
from app.agents.geofence_agent import evaluate_geofences
from app.models.agent_models import GeofenceEvidence


class TestGeofenceEngine(unittest.TestCase):
    """Test suite verifying spatial boundary calculations and proximity alerts."""

    def setUp(self):
        self.provider = SpatialGeofenceProvider()

    def test_haversine_distance(self):
        """Verifies accurate great-circle distance between Mumbai and Satpati (~90km)."""
        dist = haversine_km(18.9220, 72.8347, 19.7242, 72.0794)
        self.assertAlmostEqual(dist, 119.3, delta=5.0)

    def test_point_in_polygon(self):
        """Verifies ray-casting point containment within Gulf of Mannar sanctuary."""
        # Gulf of Mannar bounding box: [78.5, 8.8] to [79.3, 9.3]
        poly = [
            [78.5, 8.8],
            [79.3, 8.8],
            [79.3, 9.3],
            [78.5, 9.3],
            [78.5, 8.8],
        ]
        inside_point = (9.0, 78.9)
        outside_point = (18.9, 72.8)

        self.assertTrue(point_in_polygon(inside_point[0], inside_point[1], poly))
        self.assertFalse(point_in_polygon(outside_point[0], outside_point[1], poly))

    def test_point_to_segment_distance(self):
        """Verifies perpendicular and endpoint projection distances."""
        # Segment from (0,0) to (0,2) along latitude 0
        d = point_to_segment_distance_km(p_lat=1.0, p_lon=1.0, a_lat=0.0, a_lon=0.0, b_lat=0.0, b_lon=2.0)
        self.assertAlmostEqual(d, 110.574, delta=2.0)

    def test_imbl_sir_creek_proximity_alert(self):
        """Verifies that a vessel near Kutch/Sir Creek (23.4°N, 68.1°E) triggers IMBL alert."""
        vessel_lat, vessel_lon = 23.4000, 68.1000
        evidence = evaluate_geofences(self.provider, lat=vessel_lat, lon=vessel_lon)

        self.assertIsInstance(evidence, GeofenceEvidence)
        self.assertTrue(len(evidence.active_alerts) > 0)
        
        imbl_alert = next((a for a in evidence.active_alerts if a.type == "IMBL"), None)
        self.assertIsNotNone(imbl_alert)
        self.assertIn("Pakistan", imbl_alert.name)
        self.assertLessEqual(imbl_alert.distance_nm, imbl_alert.threshold_nm)

    def test_gulf_of_mannar_mpa_critical_alert(self):
        """Verifies that coordinates inside Gulf of Mannar trigger CRITICAL MPA violation."""
        vessel_lat, vessel_lon = 9.0000, 78.9000
        evidence = evaluate_geofences(self.provider, lat=vessel_lat, lon=vessel_lon)

        self.assertTrue(evidence.has_critical_violation)
        mpa_alert = next((a for a in evidence.active_alerts if a.type == "MPA"), None)
        self.assertIsNotNone(mpa_alert)
        self.assertTrue(mpa_alert.is_inside)
        self.assertEqual(mpa_alert.severity, "CRITICAL")

    def test_mumbai_clear_status(self):
        """Verifies that Mumbai port coordinates have no active alerts."""
        vessel_lat, vessel_lon = 18.9220, 72.8347
        evidence = evaluate_geofences(self.provider, lat=vessel_lat, lon=vessel_lon)

        self.assertFalse(evidence.has_critical_violation)
        self.assertEqual(len(evidence.active_alerts), 0)
        self.assertIsNotNone(evidence.nearest_boundary)


if __name__ == "__main__":
    unittest.main()
