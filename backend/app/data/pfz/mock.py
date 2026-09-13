"""Potential Fishing Zone (PFZ) provider with INCOIS-derived records and a deterministic fallback."""
import json
import math
import os
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
    Potential Fishing Zone provider using bundled INCOIS-derived advisory coordinates
    when available, with a deterministic synthetic generator fallback.
    """

    def __init__(self):
        self.incois_zones: List[Dict[str, Any]] = []
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "pfz", "pfz_maharashtra.json"),
            os.path.join(os.path.dirname(__file__), "pfz_maharashtra.json"),
            "data/pfz/pfz_maharashtra.json",
        ]
        for p in possible_paths:
            abs_p = os.path.abspath(p)
            if os.path.exists(abs_p):
                try:
                    with open(abs_p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.incois_zones = data.get("pfz_zones", [])
                        break
                except Exception:
                    pass

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
                    "distance_km": z.get("distance_km", 0.0),
                    "depth_m": z.get("depth_m"),
                    "dominant_species": ", ".join(z.get("species", ["Pelagic Species"])),
                    "bearing_deg": z.get("bearing_deg"),
                    "landing_centre": z.get("landing_centre"),
                }
                for z in advisory.get("pfz_zones", [])
            ]
        return []


class MockPFZProvider(IncoisPFZProvider):
    """Compatibility name; no synthetic data is produced."""
