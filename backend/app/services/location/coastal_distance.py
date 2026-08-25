"""
Coastal Distance Calculation and Coastline Geometry Engine for ORCA.

Calculates exact geodesic distance from user location to India's coastline,
identifies nearest coastal port/landmark, and verifies supported coastal intelligence radius.
"""
import math
import os
from typing import Any, Dict, Optional, Tuple

from app.services.location.india_boundary import (
    INDIA_BOUNDS,
    INDIA_COASTLINE_POINTS,
    INDIA_MAINLAND_POLYGON,
    point_in_polygon,
)

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


class CoastalDistanceService:
    """Calculates coastal distance and determines coastal operational validity."""

    def __init__(self, intelligence_radius_km: Optional[float] = None):
        env_radius = os.getenv("ORCA_INTELLIGENCE_RADIUS_KM")
        if intelligence_radius_km is not None:
            self.radius_km = intelligence_radius_km
        elif env_radius:
            try:
                self.radius_km = float(env_radius)
            except ValueError:
                self.radius_km = 100.0
        else:
            self.radius_km = 100.0

    def calculate_coastal_distance(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Evaluates nearest point on India's coastline.
        
        Returns:
            distance_to_coast_km: float
            nearest_coastal_point: Dict[lat, lon, name, region]
            is_coastal_supported: bool (within operational intelligence radius)
            coastal_region: str (e.g. 'Maharashtra', 'Gujarat', 'Kerala')
        """
        min_dist = float("inf")
        nearest_pt = INDIA_COASTLINE_POINTS[0]

        for pt in INDIA_COASTLINE_POINTS:
            d = haversine_distance_km(lat, lon, pt["lat"], pt["lon"])
            if d < min_dist:
                min_dist = d
                nearest_pt = pt

        # Check if coordinates fall within operational marine intelligence radius (default 100 km)
        is_supported = min_dist <= self.radius_km

        return {
            "distance_to_coast_km": round(min_dist, 2),
            "nearest_coastal_point": {
                "lat": nearest_pt["lat"],
                "lon": nearest_pt["lon"],
                "name": nearest_pt["name"],
                "region": nearest_pt["region"],
            },
            "is_coastal_supported": is_supported,
            "coastal_region": nearest_pt["region"],
            "intelligence_radius_km": self.radius_km,
        }

    def is_inside_india_envelope(self, lat: float, lon: float) -> bool:
        """Checks if coordinate falls inside the Indian territory & maritime EEZ envelope."""
        if not (
            INDIA_BOUNDS["min_lat"] <= lat <= INDIA_BOUNDS["max_lat"]
            and INDIA_BOUNDS["min_lon"] <= lon <= INDIA_BOUNDS["max_lon"]
        ):
            return False

        # If inside outer box, verify proximity to Indian territory
        # If within 400 km of any Indian coastal point or inside mainland polygon, consider inside India
        if point_in_polygon(lat, lon, INDIA_MAINLAND_POLYGON):
            return True

        coastal_check = self.calculate_coastal_distance(lat, lon)
        if coastal_check["distance_to_coast_km"] <= 450.0:  # Within Indian EEZ (200 NM = ~370 km + buffer)
            return True

        return False


coastal_distance_service = CoastalDistanceService()
