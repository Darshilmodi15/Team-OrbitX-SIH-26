import math
from typing import List, Tuple
from app.models.agent_models import GeofenceZoneModel

GEOFENCE_REGISTRY = [
    {
        "id": "imbl-srilanka",
        "name": "India - Sri Lanka International Maritime Boundary Line (IMBL)",
        "category": "IMBL",
        "risk_level": "CRITICAL_DANGER",
        "description": "Strict international maritime boundary across Palk Bay. Crossing or proximity risks immediate detention by foreign naval authorities.",
        "is_demonstration": False,
        "coordinates": [
            [10.08, 79.86],
            [9.95, 79.62],
            [9.67, 79.43],
            [9.35, 79.30],
            [9.10, 79.25],
            [8.85, 79.05],
            [8.50, 78.90],
        ],
    },
    {
        "id": "imbl-pakistan",
        "name": "India - Pakistan Maritime Boundary (Sir Creek Buffer)",
        "category": "IMBL",
        "risk_level": "CRITICAL_DANGER",
        "description": "High-security contested maritime border off Kutch coast. Fishing vessels must maintain minimum 10 NM safety buffer.",
        "is_demonstration": False,
        "coordinates": [
            [23.60, 67.80],
            [23.35, 68.10],
            [23.15, 68.35],
            [22.80, 68.60],
        ],
    },
    {
        "id": "mpa-gulf-mannar",
        "name": "Gulf of Mannar Marine National Park (MPA)",
        "category": "MPA",
        "risk_level": "RESTRICTED_MPA",
        "description": "Ecologically sensitive coral reef and Dugong sanctuary. Commercial bottom trawling and mechanized fishing prohibited under Wildlife Protection Act 1972.",
        "is_demonstration": False,
        "coordinates": [
            [9.25, 79.15],
            [9.30, 79.35],
            [9.15, 79.40],
            [8.95, 79.10],
            [9.05, 78.85],
            [9.25, 79.15],
        ],
    },
    {
        "id": "mpa-sundarbans",
        "name": "Sundarbans Biosphere Reserve Marine Buffer (MPA)",
        "category": "MPA",
        "risk_level": "RESTRICTED_MPA",
        "description": "UNESCO World Heritage mangrove estuary buffer. Motorized trawling restricted to designated channels to protect estuarine breeding grounds.",
        "is_demonstration": False,
        "coordinates": [
            [21.80, 88.60],
            [21.85, 89.10],
            [21.40, 89.15],
            [21.35, 88.50],
            [21.80, 88.60],
        ],
    },
    {
        "id": "sec-tarapur",
        "name": "Tarapur Coastal Security Exclusion Zone",
        "category": "SECURITY",
        "risk_level": "CRITICAL_DANGER",
        "description": "Demonstration security exclusion perimeter surrounding critical coastal infrastructure off Palghar/Dahanu coast. All unauthorized vessels prohibited.",
        "is_demonstration": True,
        "coordinates": [
            [19.86, 72.64],
            [19.89, 72.69],
            [19.84, 72.72],
            [19.81, 72.66],
            [19.86, 72.64],
        ],
    },
    {
        "id": "sec-mumbai-high",
        "name": "Mumbai High Offshore Operational Perimeter",
        "category": "SECURITY",
        "risk_level": "BUFFER_ALERT",
        "description": "Demonstration 500m safety exclusion zones around offshore energy platforms. Trawling restricted to prevent undersea umbilical snagging.",
        "is_demonstration": True,
        "coordinates": [
            [19.45, 71.30],
            [19.55, 71.45],
            [19.35, 71.55],
            [19.25, 71.40],
            [19.45, 71.30],
        ],
    },
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def point_in_polygon(lat: float, lon: float, polygon: List[List[float]]) -> bool:
    if len(polygon) < 3:
        return False
    inside = False
    n = len(polygon)
    p1_lat, p1_lon = polygon[0]
    for i in range(1, n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if min(p1_lon, p2_lon) < lon <= max(p1_lon, p2_lon):
            if lat <= max(p1_lat, p2_lat):
                if p1_lon != p2_lon:
                    xinters = (lon - p1_lon) * (p2_lat - p1_lat) / (p2_lon - p1_lon) + p1_lat
                if p1_lat == p2_lat or lat <= xinters:
                    inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon
    return inside


def min_distance_to_boundary(lat: float, lon: float, coords: List[List[float]]) -> float:
    min_d = float("inf")
    for pt in coords:
        d = haversine_km(lat, lon, pt[0], pt[1])
        if d < min_d:
            min_d = d
    for i in range(len(coords) - 1):
        mid_lat = (coords[i][0] + coords[i + 1][0]) / 2.0
        mid_lon = (coords[i][1] + coords[i + 1][1]) / 2.0
        d_mid = haversine_km(lat, lon, mid_lat, mid_lon)
        if d_mid < min_d:
            min_d = d_mid
    return round(min_d, 1)


def evaluate_vessel_geofences(lat: float, lon: float) -> List[GeofenceZoneModel]:
    results: List[GeofenceZoneModel] = []
    for g in GEOFENCE_REGISTRY:
        coords = g["coordinates"]
        is_poly = len(coords) >= 3 and coords[0] == coords[-1]
        is_inside = point_in_polygon(lat, lon, coords) if is_poly else False
        dist = min_distance_to_boundary(lat, lon, coords)
        is_warning = is_inside or dist <= 20.0

        results.append(
            GeofenceZoneModel(
                id=g["id"],
                name=g["name"],
                category=g["category"],
                risk_level=g["risk_level"],
                description=g["description"],
                distance_to_vessel_km=dist,
                is_inside=is_inside,
                is_proximity_warning=is_warning,
                coordinates=coords,
                source="geospatial_geofence_registry",
                is_demonstration=g.get("is_demonstration", False),
            )
        )
    return results
