import math
from typing import Any, Dict, List, Tuple
from app.data.geofence import evaluate_vessel_geofences, haversine_km
from app.models.agent_models import GeofenceZoneModel

CARDINAL_16 = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
]


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, str]:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    theta = math.atan2(y, x)
    bearing = (math.degrees(theta) + 360.0) % 360.0

    idx = round(bearing / 22.5) % 16
    cardinal = CARDINAL_16[idx]

    return round(bearing, 1), cardinal


def analyze_geospatial_context(
    vessel_lat: float,
    vessel_lon: float,
    target_lat: float = None,
    target_lon: float = None,
) -> Dict[str, Any]:
    geofences: List[GeofenceZoneModel] = evaluate_vessel_geofences(vessel_lat, vessel_lon)

    result: Dict[str, Any] = {
        'vessel_lat': vessel_lat,
        'vessel_lon': vessel_lon,
        'geofences': [g.model_dump() for g in geofences],
        'proximity_warnings': [g.model_dump() for g in geofences if g.is_proximity_warning],
    }

    if target_lat is not None and target_lon is not None:
        dist = round(haversine_km(vessel_lat, vessel_lon, target_lat, target_lon), 1)
        bearing_deg, bearing_card = calculate_bearing(vessel_lat, vessel_lon, target_lat, target_lon)
        result['target_distance_km'] = dist
        result['target_distance_nm'] = round(dist * 0.539957, 1)
        result['target_bearing_deg'] = bearing_deg
        result['target_bearing_cardinal'] = bearing_card

    return result
