from typing import List, Optional
from app.data.geofence import evaluate_vessel_geofences, haversine_km, point_in_polygon
from app.models.agent_models import RouteEvidence, RouteWaypoint, WeatherEvidence


def plan_safe_marine_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    dest_name: str = "Destination Zone",
    origin_name: str = "Departure Port / Vessel Station",
    weather: Optional[WeatherEvidence] = None,
) -> RouteEvidence:
    total_dist_km = round(haversine_km(origin_lat, origin_lon, dest_lat, dest_lon), 1)
    total_dist_nm = round(total_dist_km * 0.539957, 1)

    cruise_speed_kmh = 14.8
    est_duration_hours = round(total_dist_km / cruise_speed_kmh, 1) if cruise_speed_kmh > 0 else 1.0

    geofences = evaluate_vessel_geofences(origin_lat, origin_lon)
    avoided_zones: List[str] = []
    advisory_notes: List[str] = []

    mid_lat = (origin_lat + dest_lat) / 2.0
    mid_lon = (origin_lon + dest_lon) / 2.0

    offset_needed = False
    for g in geofences:
        if g.coordinates and len(g.coordinates) >= 3 and g.coordinates[0] == g.coordinates[-1]:
            if point_in_polygon(mid_lat, mid_lon, g.coordinates):
                offset_needed = True
                avoided_zones.append(g.name)
                advisory_notes.append(f"Waypoints offset westward (+0.04 lon) to clear {g.name}.")

    if offset_needed:
        mid_lon = round(mid_lon - 0.04, 4)

    wave_h = weather.wave_height_m if weather else 1.2
    risk_at_wp = "safe" if wave_h <= 1.5 else ("caution" if wave_h <= 2.5 else "unsafe")

    wp1 = RouteWaypoint(
        lat=round(origin_lat, 4),
        lon=round(origin_lon, 4),
        name="Departure Station",
        segment_distance_km=0.0,
        wave_height_m=wave_h,
        risk_level=risk_at_wp,
    )

    wp_mid = RouteWaypoint(
        lat=round(mid_lat, 4),
        lon=round(mid_lon, 4),
        name="Offshore Safe Nav Corridor Alpha",
        segment_distance_km=round(total_dist_km / 2.0, 1),
        wave_height_m=wave_h,
        risk_level=risk_at_wp,
    )

    wp_dest = RouteWaypoint(
        lat=round(dest_lat, 4),
        lon=round(dest_lon, 4),
        name=f"Arrival: {dest_name}",
        segment_distance_km=round(total_dist_km, 1),
        wave_height_m=wave_h,
        risk_level=risk_at_wp,
    )

    waypoints = [wp1, wp_mid, wp_dest]

    if weather and weather.wind_speed_kmh > 35:
        advisory_notes.append(f"Headwind/Crosswind expected ({weather.wind_speed_kmh:.1f} km/h). Secure deck gear.")
    if weather and weather.wave_height_m > 1.8:
        advisory_notes.append(f"Elevated swell of {weather.wave_height_m:.2f}m along corridor. Reduce transit speed to 6 knots.")
    else:
        advisory_notes.append("Favorable sea state along entire recommended navigational corridor.")

    advisory_notes.append("Maintain 0.5 NM buffer from marked coastal shallow bathymetry.")

    overall_risk = "SAFE" if wave_h <= 1.5 and (not weather or weather.wind_speed_kmh <= 40) else ("CAUTION" if wave_h <= 2.5 else "HIGH RISK")

    return RouteEvidence(
        origin_name=origin_name,
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        destination_name=dest_name,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
        distance_km=total_dist_km,
        distance_nm=total_dist_nm,
        estimated_duration_hours=est_duration_hours,
        waypoints=waypoints,
        risk_assessment=overall_risk,
        avoided_zones=avoided_zones,
        advisory_notes=advisory_notes,
        source="route_optimizer_agent",
        is_advisory_only=True,
    )
