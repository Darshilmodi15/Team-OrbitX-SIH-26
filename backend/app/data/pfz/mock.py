"""Mock Potential Fishing Zone (PFZ) data provider implementing the PFZProvider interface."""
import hashlib
import math
import random
from typing import Any, Dict, List

from app.data.pfz.base import PFZProvider


class MockPFZProvider(PFZProvider):
    """
    Mock Potential Fishing Zone (PFZ) provider.

    Generates realistic, deterministic mock PFZ advisories based on geographic coordinates.
    Implements the PFZProvider interface to allow future replacement by real marine
    satellite advisory feeds (e.g. INCOIS PFZ maps).
    """

    def get_pfz_zones(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        """
        Returns a mock list of 2-3 nearby Potential Fishing Zones (PFZ)
        with coordinates, distance in kilometers, ocean depth, and dominant species.

        Args:
            lat (float): Latitude coordinate.
            lon (float): Longitude coordinate.

        Returns:
            List[Dict[str, Any]]: List of nearby PFZ zone dictionaries sorted by distance.
        """
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

            # Approximate coordinate offsets (1 deg lat ~ 111 km)
            lat_rad = math.radians(lat if lat != 0 else 1.0)
            d_lat = (distance_km / 111.0) * math.cos(math.radians(bearing_deg))
            d_lon = (distance_km / (111.0 * math.cos(lat_rad))) * math.sin(math.radians(bearing_deg))

            zone_lat = round(lat + d_lat, 4)
            zone_lon = round(lon + d_lon, 4)

            zones.append({
                "zone_id": f"PFZ-{101 + i}",
                "name": zone_names[i % len(zone_names)],
                "lat": zone_lat,
                "lon": zone_lon,
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
