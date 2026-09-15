"""Potential Fishing Zone (PFZ) provider with validated current feed records."""
import math
from typing import Any, Dict, List

from app.data.pfz.base import PFZProvider


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the Great Circle distance between two points on Earth in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class IncoisPFZProvider(PFZProvider):
    """
    Potential Fishing Zone provider using only validated current advisories.
    """

    def get_pfz_zones(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        """Queries incois_pfz_service for verified current advisory points for the given coordinates."""
        from app.services.pfz.incois_pfz_service import incois_pfz_service
        advisory = incois_pfz_service.get_advisory(lat=lat, lon=lon)
        if advisory.get("status") == "current":
            return [
                {
                    "zone_id": z.get("id"),
                    "name": f"PFZ - {z.get('landing_centre', 'Offshore')}",
                    "lat": z.get("latitude"),
                    "lon": z.get("longitude"),
                    "distance_km": haversine_km(lat, lon, z["latitude"], z["longitude"]),
                    "source": advisory["source"],
                    "is_mock": False,
                    "depth_m": z.get("depth_m"),
                    "dominant_species": ", ".join(z.get("species", [])),
                    "bearing_deg": None,  # Published harbour bearing is not the vessel bearing.
                    "landing_centre": z.get("landing_centre"),
                }
                for z in advisory.get("pfz_zones", [])
            ]
        return []


class MockPFZProvider(IncoisPFZProvider):
    """Compatibility name; no synthetic data is produced."""
