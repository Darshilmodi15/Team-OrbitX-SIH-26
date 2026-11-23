from typing import List, Optional
from app.data.geofence import evaluate_vessel_geofences, haversine_km, point_in_polygon
from app.data.geofence.spatial_provider import point_to_segment_distance_km
from app.models.agent_models import RouteEvidence, RouteWaypoint, WeatherEvidence


def _ccw(ax: float, ay: float, bx: float, by: float, cx: float, cy: float) -> float:
    return (cy - ay) * (bx - ax) - (by - ay) * (cx - ax)


def _segments_intersect(
    a_lat: float,
    a_lon: float,
    b_lat: float,
    b_lon: float,
    c_lat: float,
    c_lon: float,
    d_lat: float,
    d_lon: float,
) -> bool:
    if (
        max(a_lat, b_lat) < min(c_lat, d_lat)
        or max(c_lat, d_lat) < min(a_lat, b_lat)
        or max(a_lon, b_lon) < min(c_lon, d_lon)
        or max(c_lon, d_lon) < min(a_lon, b_lon)
    ):
        return False
    d1 = _ccw(a_lon, a_lat, b_lon, b_lat, c_lon, c_lat)
    d2 = _ccw(a_lon, a_lat, b_lon, b_lat, d_lon, d_lat)
    d3 = _ccw(c_lon, c_lat, d_lon, d_lat, a_lon, a_lat)
    d4 = _ccw(c_lon, c_lat, d_lon, d_lat, b_lon, b_lat)
    return (d1 * d2 <= 0) and (d3 * d4 <= 0)


def _route_hits_geofence(
    a_lat: float,
    a_lon: float,
    b_lat: float,
    b_lon: float,
    coords: List[List[float]],
) -> bool:
    if len(coords) < 2:
        return False
    is_poly = len(coords) >= 3 and coords[0] == coords[-1]
    if is_poly and (
        point_in_polygon(a_lat, a_lon, coords)
        or point_in_polygon(b_lat, b_lon, coords)
    ):
        return True
    for i in range(len(coords) - 1):
        p1, p2 = coords[i], coords[i + 1]
        if _segments_intersect(a_lat, a_lon, b_lat, b_lon, p1[0], p1[1], p2[0], p2[1]):
            return True
        if not is_poly:
            for pt_lat, pt_lon in (
                (a_lat, a_lon),
                ((a_lat + b_lat) / 2.0, (a_lon + b_lon) / 2.0),
                (b_lat, b_lon),
            ):
                if point_to_segment_distance_km(pt_lat, pt_lon, p1[0], p1[1], p2[0], p2[1]) <= 5.0:
                    return True
    return False


def plan_safe_marine_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    dest_name: str = "Destination Zone",
    origin_name: str = "Departure Port / Vessel Station",
    weather: Optional[WeatherEvidence] = None,
) -> RouteEvidence:
    cruise_speed_kmh = 14.8

    geofences = evaluate_vessel_geofences(origin_lat, origin_lon)
    avoided_zones: List[str] = []
    advisory_notes: List[str] = []
    critical_geofence_hit = False
    restricted_geofence_hit = False

    mid_lat = (origin_lat + dest_lat) / 2.0
    mid_lon = (origin_lon + dest_lon) / 2.0

    for g in geofences:
        if not g.coordinates:
            continue
        is_poly = len(g.coordinates) >= 3 and g.coordinates[0] == g.coordinates[-1]
        hit_direct = _route_hits_geofence(origin_lat, origin_lon, dest_lat, dest_lon, g.coordinates)
        hit_mid = is_poly and point_in_polygon(mid_lat, mid_lon, g.coordinates)
        if hit_direct or hit_mid:
            avoided_zones.append(g.name)
            if is_poly and hit_mid:
                mid_lon = round(mid_lon - 0.04, 4)
                advisory_notes.append(f"Waypoints offset westward (-0.04 lon) to clear {g.name}.")
            else:
                advisory_notes.append(f"Planned corridor intersects or nears restricted zone {g.name}; manual reroute required.")
            if g.category == "IMBL" or g.risk_level == "CRITICAL_DANGER":
                critical_geofence_hit = True
            else:
                restricted_geofence_hit = True

    d1_km = round(haversine_km(origin_lat, origin_lon, mid_lat, mid_lon), 1)
    d2_km = round(haversine_km(mid_lat, mid_lon, dest_lat, dest_lon), 1)
    total_dist_km = round(d1_km + d2_km, 1)
    total_dist_nm = round(total_dist_km * 0.539957, 1)
    est_duration_hours = round(total_dist_km / cruise_speed_kmh, 1) if cruise_speed_kmh > 0 else 1.0

    wave_h = weather.wave_height_m if weather else None
    wind_spd = weather.wind_speed_kmh if weather else None
    weather_usable = (
        weather is not None
        and not weather.is_mock
        and weather.cache_status not in {"stale", "unavailable"}
        and wave_h is not None
        and wind_spd is not None
    )

    if not weather_usable:
        risk_at_wp = "unknown"
    elif wave_h > 2.5 or wind_spd > 50.0 or critical_geofence_hit:
        risk_at_wp = "unsafe"
    elif wave_h > 1.5 or wind_spd > 40.0 or restricted_geofence_hit:
        risk_at_wp = "caution"
    else:
        risk_at_wp = "safe"

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
        segment_distance_km=d1_km,
        wave_height_m=wave_h,
        risk_level=risk_at_wp,
    )

    wp_dest = RouteWaypoint(
        lat=round(dest_lat, 4),
        lon=round(dest_lon, 4),
        name=f"Arrival: {dest_name}",
        segment_distance_km=total_dist_km,
        wave_height_m=wave_h,
        risk_level=risk_at_wp,
    )

    waypoints = [wp1, wp_mid, wp_dest]

    if not weather_usable:
        advisory_notes.append("Verified live weather data is unavailable along this corridor; exercise heightened caution.")
    else:
        if wind_spd > 35.0:
            advisory_notes.append(f"Headwind/Crosswind expected ({wind_spd:.1f} km/h). Secure deck gear.")
        if wave_h > 1.8:
            advisory_notes.append(f"Elevated swell of {wave_h:.2f}m along corridor. Reduce transit speed to 6 knots.")
        elif wind_spd <= 30.0:
            advisory_notes.append("Favorable sea state along entire recommended navigational corridor.")

    advisory_notes.append("Consult official hydrographic charts and local port notices before departure.")

    if critical_geofence_hit:
        overall_risk = "HIGH RISK"
    elif not weather_usable:
        overall_risk = "UNKNOWN"
    elif wave_h > 2.5 or wind_spd > 50.0:
        overall_risk = "HIGH RISK"
    elif wave_h > 1.5 or wind_spd > 40.0 or restricted_geofence_hit:
        overall_risk = "CAUTION"
    else:
        overall_risk = "SAFE"

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
