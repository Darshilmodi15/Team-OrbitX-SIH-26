"""Spatial geofence provider for evaluating vessel proximity to maritime borders and sanctuaries."""
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.data.geofence.base import GeofenceProvider
from app.models.agent_models import GeofenceEvidence, GeofenceItem

KM_PER_NAUTICAL_MILE = 1.852


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def point_to_segment_distance_km(
    p_lat: float, p_lon: float, a_lat: float, a_lon: float, b_lat: float, b_lon: float
) -> float:
    """
    Calculates minimum distance from a point P to line segment AB in kilometers.
    Uses equirectangular projection approximation for local segment projection.
    """
    # Convert to approximate local Cartesian flat coordinates
    mid_lat_rad = math.radians((a_lat + b_lat) / 2.0)
    kx = 111.320 * math.cos(mid_lat_rad)
    ky = 110.574

    px, py = p_lon * kx, p_lat * ky
    ax, ay = a_lon * kx, a_lat * ky
    bx, by = b_lon * kx, b_lat * ky

    dx = bx - ax
    dy = by - ay
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0.0:
        return haversine_km(p_lat, p_lon, a_lat, a_lon)

    # Parametric projection t
    t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
    t = max(0.0, min(1.0, t))

    proj_lon = (ax + t * dx) / kx
    proj_lat = (ay + t * dy) / ky

    return haversine_km(p_lat, p_lon, proj_lat, proj_lon)


def point_in_polygon(lat: float, lon: float, poly_coords: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if point (lat, lon) is inside polygon.
    poly_coords is a list of [lon, lat] points.
    """
    n = len(poly_coords)
    inside = False
    p1_lon, p1_lat = poly_coords[0]

    for i in range(1, n + 1):
        p2_lon, p2_lat = poly_coords[i % n]
        if lat > min(p1_lat, p2_lat):
            if lat <= max(p1_lat, p2_lat):
                if lon <= max(p1_lon, p2_lon):
                    if p1_lat != p2_lat:
                        xinters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                    if p1_lon == p2_lon or lon <= xinters:
                        inside = not inside
        p1_lon, p1_lat = p2_lon, p2_lat

    return inside


class SpatialGeofenceProvider(GeofenceProvider):
    """
    Spatial Geofence Engine that checks distance and containment against
    authoritative Indian Maritime Boundary Lines and Marine Protected Areas.
    """

    def __init__(self, data_path: Optional[str] = None):
        self.data_path = None
        candidate_paths = [
            Path(data_path) if data_path else None,
            Path(__file__).resolve().parents[4] / "data" / "geofences" / "india_maritime_boundaries.json" if len(Path(__file__).resolve().parents) >= 5 else None,
            Path(__file__).resolve().parents[3] / "data" / "geofences" / "india_maritime_boundaries.json" if len(Path(__file__).resolve().parents) >= 4 else None,
            Path.cwd() / "data" / "geofences" / "india_maritime_boundaries.json",
            Path.cwd().parent / "data" / "geofences" / "india_maritime_boundaries.json",
        ]
        for p in candidate_paths:
            if p and p.exists():
                self.data_path = p
                break

        self.geofences: List[Dict[str, Any]] = self._load_data()

    def _load_data(self) -> List[Dict[str, Any]]:
        if not self.data_path or not self.data_path.exists():
            return []
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def get_all_geofences(self) -> List[Dict[str, Any]]:
        return self.geofences

    def evaluate_boundaries(self, lat: float, lon: float) -> GeofenceEvidence:
        """
        Evaluates vessel position against all registered geofences.
        """
        items: List[GeofenceItem] = []
        has_critical = False

        for gf in self.geofences:
            name = gf.get("name", "Unknown Boundary")
            gf_type = gf.get("type", "RESTRICTED")
            geom_type = gf.get("geometry_type", "LineString")
            threshold_nm = float(gf.get("threshold_nm", 12.0))
            coords: List[List[float]] = gf.get("coordinates", [])

            if not coords:
                continue

            is_inside = False
            min_dist_km = float("inf")

            if geom_type == "Polygon":
                is_inside = point_in_polygon(lat, lon, coords)
                if is_inside:
                    min_dist_km = 0.0
                else:
                    # Minimum distance to any boundary edge
                    for i in range(len(coords) - 1):
                        p1 = coords[i]
                        p2 = coords[i + 1]
                        d = point_to_segment_distance_km(lat, lon, p1[1], p1[0], p2[1], p2[0])
                        if d < min_dist_km:
                            min_dist_km = d
            else:  # LineString
                for i in range(len(coords) - 1):
                    p1 = coords[i]
                    p2 = coords[i + 1]
                    d = point_to_segment_distance_km(lat, lon, p1[1], p1[0], p2[1], p2[0])
                    if d < min_dist_km:
                        min_dist_km = d

            dist_nm = round(min_dist_km / KM_PER_NAUTICAL_MILE, 2)
            alert_active = is_inside or (dist_nm <= threshold_nm)

            # Determine severity
            if is_inside:
                severity = "CRITICAL"
                has_critical = True
            elif dist_nm <= (threshold_nm * 0.4):
                severity = "CRITICAL"
                has_critical = True
            elif dist_nm <= threshold_nm:
                severity = "WARNING" if gf_type == "IMBL" else "ADVISORY"
            else:
                severity = "NORMAL"

            items.append(
                GeofenceItem(
                    name=name,
                    type=gf_type,
                    distance_km=round(min_dist_km, 2),
                    distance_nm=dist_nm,
                    is_inside=is_inside,
                    threshold_nm=threshold_nm,
                    alert_active=alert_active,
                    severity=severity,
                    description=gf.get("description"),
                    coordinates=coords,
                )
            )

        # Sort items by distance
        items.sort(key=lambda x: x.distance_km)
        active_alerts = [it for it in items if it.alert_active]
        nearest_boundary = items[0] if items else None

        return GeofenceEvidence(
            vessel_lat=lat,
            vessel_lon=lon,
            active_alerts=active_alerts,
            nearest_boundary=nearest_boundary,
            has_critical_violation=has_critical,
            source="geofence_spatial_engine",
            is_mock=False,
        )
