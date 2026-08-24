"""INCOIS and Mock Potential Fishing Zone (PFZ) data provider implementing the PFZProvider interface."""
import hashlib
import json
import math
import os
import random
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


class MockPFZProvider(PFZProvider):
    """
    Potential Fishing Zone (PFZ) provider using real INCOIS datasets when available,
    with synthetic generator fallback.
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
        """
        Returns nearby Potential Fishing Zones (PFZ).
        Uses real INCOIS dataset if available, calculated by Haversine distance.
        """
        if self.incois_zones:
            results = []
            for z in self.incois_zones:
                z_lat = float(z["latitude"])
                z_lon = float(z["longitude"])
                dist = round(haversine_km(lat, lon, z_lat, z_lon), 1)

                min_d = z.get("depth_m", {}).get("min", 20)
                max_d = z.get("depth_m", {}).get("max", 30)
                avg_depth = int((min_d + max_d) / 2)

                landing = z.get("landing_centre", "Offshore")
                results.append({
                    "zone_id": z.get("id", "PFZ-INCOIS"),
                    "name": f"INCOIS Zone ({landing})",
                    "lat": z_lat,
                    "lon": z_lon,
                    "distance_km": dist,
                    "depth_m": avg_depth,
                    "dominant_species": "Mackerel, Pomfret & Sardines (INCOIS Advisory)",
                })

            results.sort(key=lambda item: item["distance_km"])
            return results[:3]

        # Synthetic fallback if JSON dataset is absent
        seed_str = f"pfz_{round(lat, 2)}_{round(lon, 2)}"
        seed = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest(), 16) % (10**8)
        rng = random.Random(seed)

        count = rng.choice([2, 3])
        zone_names = [
            "Thermal Front Sector A",
            "Chlorophyll Bloom Zone B",
            "Coastal Upwelling Region C",
            "Shelf Break Zone D",
        ]
        rng.shuffle(zone_names)

        zones: List[Dict[str, Any]] = []
        for i in range(count):
            distance_km = round(rng.uniform(6.0, 32.0), 1)
            bearing_deg = rng.uniform(0, 360)
            lat_rad = math.radians(lat if lat != 0 else 1.0)
            d_lat = (distance_km / 111.0) * math.cos(math.radians(bearing_deg))
            d_lon = (distance_km / (111.0 * math.cos(lat_rad))) * math.sin(math.radians(bearing_deg))

            zones.append({
                "zone_id": f"PFZ-{101 + i}",
                "name": zone_names[i % len(zone_names)],
                "lat": round(lat + d_lat, 4),
                "lon": round(lon + d_lon, 4),
                "distance_km": distance_km,
                "depth_m": rng.randint(30, 110),
                "dominant_species": rng.choice([
                    "Mackerel & Tuna",
                    "Sardines & Anchovies",
                    "Kingfish & Seer Fish",
                    "Pomfret & Ribbon Fish",
                ]),
            })

        zones.sort(key=lambda z: z["distance_km"])
        return zones
