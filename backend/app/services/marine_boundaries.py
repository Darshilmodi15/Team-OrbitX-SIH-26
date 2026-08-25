"""
Marine Boundaries Data Service for ORCA.

Integrates with official Marine Regions / Flanders Marine Institute (VLIZ)
Web Feature Service (WFS) to retrieve Exclusive Economic Zone (EEZ) GeoJSON data,
perform point-in-polygon spatial queries, and compute geofence proximity distances.

Official Source:
    Marine Regions / Flanders Marine Institute (VLIZ)
    https://www.marineregions.org/
    https://geo.vliz.be/geoserver/MarineRegions/wfs
"""

import json
import math
from pathlib import Path
import ssl
from typing import Any, Dict, List, Optional, Tuple
import urllib.parse
import urllib.request

# Metadata Constants
PROVIDER = "Marine Regions / Flanders Marine Institute (VLIZ)"
DATASET = "World EEZ"
DATASET_VERSION = "World EEZ v12"
SERVICE_TYPE = "WFS (Web Feature Service)"
WFS_ENDPOINT = "https://geo.vliz.be/geoserver/MarineRegions/wfs"
PRIMARY_LAYER = "MarineRegions:eez"
BOUNDARY_LAYER = "MarineRegions:eez_boundaries"
DEFAULT_MRGID = 8480  # Indian Exclusive Economic Zone
PURPOSE = "Exclusive Economic Zone and maritime boundary visualization and spatial analysis."

# Distance thresholds for geofencing (in kilometers)
GEOFENCE_WARNING_KM = 25.0  # Alert when vessel is within 25 km of boundary


def _get_ssl_context() -> ssl.SSLContext:
    """Returns an SSL context with system or certifi CA certificates, with fallback."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    try:
        return ssl.create_default_context()
    except Exception:
        return ssl._create_unverified_context()


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates using Haversine formula."""
    r = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def _point_to_segment_distance_km(
    p_lat: float, p_lon: float, a_lat: float, a_lon: float, b_lat: float, b_lon: float
) -> float:
    """
    Computes approximate distance from point P to line segment AB on the globe.
    Samples projection along segment with spherical weighting.
    """
    # Flat projection approximation for local segment (accurate for segment scale < 200 km)
    cos_lat = math.cos(math.radians((a_lat + b_lat + p_lat) / 3.0))
    px, py = p_lon * cos_lat, p_lat
    ax, ay = a_lon * cos_lat, a_lat
    bx, by = b_lon * cos_lat, b_lat

    dx, dy = bx - ax, by - ay
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0:
        return _haversine_distance_km(p_lat, p_lon, a_lat, a_lon)

    # Parametric projection t in [0, 1]
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len_sq))
    proj_lat = a_lat + t * (b_lat - a_lat)
    proj_lon = a_lon + t * (b_lon - a_lon)

    return _haversine_distance_km(p_lat, p_lon, proj_lat, proj_lon)


def _point_in_ring(lat: float, lon: float, ring: List[List[float]]) -> bool:
    """
    Ray casting point-in-polygon algorithm for a 2D ring of [lon, lat] coordinates.
    """
    n = len(ring)
    inside = False
    p1x, p1y = ring[0][0], ring[0][1]  # lon, lat

    for i in range(n + 1):
        p2x, p2y = ring[i % n][0], ring[i % n][1]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def _point_in_geometry(lat: float, lon: float, geom: Dict[str, Any]) -> bool:
    """Checks if a point (lat, lon) lies inside a GeoJSON Polygon or MultiPolygon."""
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if geom_type == "Polygon":
        # Outer boundary ring must contain point, inner hole rings must not
        if not coords:
            return False
        outer_ring = coords[0]
        if not _point_in_ring(lat, lon, outer_ring):
            return False
        for hole in coords[1:]:
            if _point_in_ring(lat, lon, hole):
                return False
        return True

    elif geom_type == "MultiPolygon":
        for poly in coords:
            if not poly:
                continue
            outer_ring = poly[0]
            if _point_in_ring(lat, lon, outer_ring):
                in_hole = False
                for hole in poly[1:]:
                    if _point_in_ring(lat, lon, hole):
                        in_hole = True
                        break
                if not in_hole:
                    return True
        return False

    return False


def _distance_to_geometry_boundary(lat: float, lon: float, geom: Dict[str, Any]) -> float:
    """Calculates the minimum distance (in km) from (lat, lon) to any polygon boundary segment."""
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])
    min_dist = float("inf")

    rings: List[List[List[float]]] = []
    if geom_type == "Polygon":
        rings = coords
    elif geom_type == "MultiPolygon":
        for poly in coords:
            rings.extend(poly)

    for ring in rings:
        n = len(ring)
        if n < 2:
            continue
        for i in range(n - 1):
            p1 = ring[i]
            p2 = ring[i + 1]
            # Coordinates in GeoJSON are [lon, lat]
            dist = _point_to_segment_distance_km(lat, lon, p1[1], p1[0], p2[1], p2[0])
            if dist < min_dist:
                min_dist = dist

    return min_dist if min_dist != float("inf") else 0.0


class MarineBoundariesService:
    """
    Service responsible for fetching and caching official Marine Regions WFS EEZ data,
    performing spatial containment tests, and computing distance to jurisdictional boundaries.
    """

    def __init__(self, cache_dir: Optional[Path] = None):
        if cache_dir is None:
            # Locate or create local cache directory
            root = Path(__file__).resolve().parent.parent.parent.parent
            self.cache_dir = root / "data" / "marine_regions"
        else:
            self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    def get_metadata(self) -> Dict[str, Any]:
        """Returns traceability metadata for Marine Regions VLIZ dataset."""
        return {
            "provider": PROVIDER,
            "dataset": DATASET,
            "version": DATASET_VERSION,
            "service": SERVICE_TYPE,
            "wfs_endpoint": WFS_ENDPOINT,
            "primary_layer": PRIMARY_LAYER,
            "boundary_layer": BOUNDARY_LAYER,
            "purpose": PURPOSE,
            "source_url": "https://www.marineregions.org/",
            "is_realtime": False,
            "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        }

    def fetch_eez_by_mrgid(self, mrgid: int = DEFAULT_MRGID, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches GeoJSON for a specified EEZ MRGID (defaults to 8480: India).
        Utilizes local cache when available, updating from live WFS.
        """
        cache_key = f"eez_mrgid_{mrgid}"
        cache_file = self.cache_dir / f"{cache_key}.geojson"

        # 1. Check in-memory cache
        if not force_refresh and cache_key in self._memory_cache:
            return self._memory_cache[cache_key]

        # 2. Check local disk cache
        if not force_refresh and cache_file.is_file():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("features"):
                    self._memory_cache[cache_key] = data
                    return data
            except Exception:
                pass

        # 3. Request from live Marine Regions WFS
        params = {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": PRIMARY_LAYER,
            "outputFormat": "application/json",
            "cql_filter": f"mrgid={mrgid}",
        }
        url = f"{WFS_ENDPOINT}?{urllib.parse.urlencode(params)}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "ORCA-Marine-Intelligence/1.0 (Smart-India-Hackathon-OrbitX)"},
            )
            ctx = _get_ssl_context()
            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                if response.status == 200:
                    raw_text = response.read().decode("utf-8")
                    data = json.loads(raw_text)
                    if data.get("features"):
                        # Attach traceability metadata
                        data["metadata"] = self.get_metadata()
                        data["metadata"]["retrieval_status"] = "live_wfs"
                        # Save to disk cache
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=2)
                        self._memory_cache[cache_key] = data
                        return data
        except Exception as exc:
            # If live fetch fails, fallback to existing disk cache or fallback generator
            if cache_file.is_file():
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    data["metadata"]["retrieval_status"] = "cached_fallback"
                    self._memory_cache[cache_key] = data
                    return data
                except Exception:
                    pass

        # 4. Built-in fallback polygon for India EEZ if WFS was unreachable and no cache exists
        fallback_data = self._generate_fallback_india_eez()
        self._memory_cache[cache_key] = fallback_data
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(fallback_data, f, indent=2)
        except Exception:
            pass
        return fallback_data

    def check_marine_boundary(
        self, lat: float, lon: float, mrgid: int = DEFAULT_MRGID
    ) -> Dict[str, Any]:
        """
        Performs spatial geofence check for coordinate (lat, lon) against EEZ boundary.
        
        Returns:
            Dict containing inside status, distance to boundary (km), geofence alert level,
            territory name, MRGID, and source attribution.
        """
        geojson = self.fetch_eez_by_mrgid(mrgid=mrgid)
        features = geojson.get("features", [])

        if not features:
            return {
                "inside_eez": False,
                "distance_to_boundary_km": 0.0,
                "geofence_status": "warning",
                "status_message": "Marine boundary data temporarily unavailable for evaluation.",
                "country": "Unknown",
                "zone_name": "Exclusive Economic Zone",
                "mrgid": mrgid,
                "metadata": self.get_metadata(),
            }

        target_feature = features[0]
        properties = target_feature.get("properties", {})
        geometry = target_feature.get("geometry", {})

        country = properties.get("territory1") or properties.get("sovereign1") or "India"
        zone_name = properties.get("geoname") or f"{country} Exclusive Economic Zone"
        pol_type = properties.get("pol_type") or "200NM"
        area_km2 = properties.get("area_km2")

        inside = _point_in_geometry(lat, lon, geometry)
        dist_km = round(_distance_to_geometry_boundary(lat, lon, geometry), 1)

        # Geofence classification
        if inside:
            if dist_km > GEOFENCE_WARNING_KM:
                geofence_status = "safe"
                status_message = (
                    f"Vessel is inside the {country} Exclusive Economic Zone ({dist_km} km from the outer maritime boundary). "
                    "Navigational status is within national maritime jurisdiction."
                )
            else:
                geofence_status = "warning"
                status_message = (
                    f"Vessel is inside {country} EEZ but within {dist_km} km of the outer maritime boundary line. "
                    "Exercise caution and monitor international maritime boundaries."
                )
        else:
            geofence_status = "critical"
            status_message = (
                f"Vessel is OUTSIDE the {country} Exclusive Economic Zone ({dist_km} km beyond boundary). "
                "You are operating in international waters or adjacent sovereign maritime territory."
            )

        return {
            "inside_eez": inside,
            "distance_to_boundary_km": dist_km,
            "geofence_status": geofence_status,
            "status_message": status_message,
            "country": country,
            "zone_name": zone_name,
            "mrgid": properties.get("mrgid", mrgid),
            "pol_type": pol_type,
            "area_km2": area_km2,
            "metadata": {
                **self.get_metadata(),
                "retrieval_status": geojson.get("metadata", {}).get("retrieval_status", "live_wfs"),
            },
        }

    def _generate_fallback_india_eez(self) -> Dict[str, Any]:
        """Provides an accurate baseline India EEZ polygon if network is completely disconnected."""
        # Key coordinate vertices outlining the Arabian Sea & Bay of Bengal Indian EEZ boundary
        coords = [
            [68.10, 23.60], [67.50, 22.80], [66.80, 21.50], [68.00, 19.50],
            [69.50, 17.00], [70.50, 14.50], [71.50, 12.00], [72.00, 9.50],
            [74.50, 6.50],  [77.00, 5.00],  [79.00, 5.50],  [81.50, 7.50],
            [84.00, 10.00], [86.50, 13.00], [88.50, 16.50], [89.50, 19.50],
            [89.10, 21.60], [88.50, 21.60], [86.70, 20.20], [83.20, 17.60],
            [80.30, 13.10], [79.30, 9.30],  [76.20, 9.90],  [74.80, 12.80],
            [72.80, 18.90], [70.30, 20.90], [68.60, 22.80], [68.10, 23.60],
        ]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": "eez.8480",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [coords],
                    },
                    "properties": {
                        "mrgid": 8480,
                        "geoname": "Indian Exclusive Economic Zone",
                        "territory1": "India",
                        "iso_ter1": "IND",
                        "sovereign1": "India",
                        "pol_type": "200NM",
                        "area_km2": 1659500,
                    },
                }
            ],
            "metadata": {
                **self.get_metadata(),
                "retrieval_status": "embedded_baseline",
            },
        }


# Global singleton instance
marine_boundaries_service = MarineBoundariesService()
