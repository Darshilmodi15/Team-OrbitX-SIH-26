"""Vessel trip duration, fuel burn, and PFZ economic comparison estimator.

Always returns explicit ORCA_HEURISTIC estimates and non-clearance disclaimers.
"""
import math
from typing import Any, Dict, List, Optional

from app.data.pfz.mock import haversine_km

VESSEL_ECONOMICS_SPECS: Dict[str, Dict[str, Any]] = {
    "traditional_canoe": {
        "label": "Traditional / Non-Motorized or Small OBM Canoe (<8 m)",
        "speed_kmh": 6.5,
        "fuel_liters_per_hour": 2.5,
        "fuel_type": "Petrol / Kerosene OBM (0 L if oar/sail)",
    },
    "motorized_gillnetter": {
        "label": "Motorized Gillnetter / FRP Boat (8–14 m)",
        "speed_kmh": 14.0,
        "fuel_liters_per_hour": 6.5,
        "fuel_type": "Diesel / Kerosene",
    },
    "mechanized_trawler": {
        "label": "Mechanized Trawler / Deep-Sea Vessel (>14 m)",
        "speed_kmh": 16.5,
        "fuel_liters_per_hour": 22.0,
        "fuel_type": "Marine Diesel",
    },
    "standard": {
        "label": "Standard Coastal Craft (10–12 m)",
        "speed_kmh": 14.0,
        "fuel_liters_per_hour": 7.0,
        "fuel_type": "Marine Diesel",
    },
}


def normalize_vessel_class(vessel_class: Optional[str]) -> str:
    if not vessel_class:
        return "motorized_gillnetter"
    cleaned = vessel_class.strip().lower()
    if cleaned in VESSEL_ECONOMICS_SPECS:
        return cleaned
    return "motorized_gillnetter"


def calculate_trip_economics(
    *,
    origin_lat: float,
    origin_lon: float,
    vessel_class: Optional[str] = None,
    fuel_price_inr: float = 95.0,
    target_lat: Optional[float] = None,
    target_lon: Optional[float] = None,
    one_way_distance_km: Optional[float] = None,
    wave_height_m: Optional[float] = None,
    wind_speed_kmh: Optional[float] = None,
    pfz_zones: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    vclass = normalize_vessel_class(vessel_class)
    spec = VESSEL_ECONOMICS_SPECS[vclass]

    if target_lat is not None and target_lon is not None:
        base_one_way = haversine_km(origin_lat, origin_lon, target_lat, target_lon)
    elif one_way_distance_km is not None:
        base_one_way = float(one_way_distance_km)
    else:
        base_one_way = 18.0  # Default illustrative 18 km nearshore trip if neither target nor distance passed

    if not math.isfinite(base_one_way) or base_one_way < 0:
        base_one_way = 0.0

    # Sea-state drag adjustment heuristic when weather telemetry is available
    drag_factor = 1.0
    if wave_height_m is not None and math.isfinite(wave_height_m) and wave_height_m > 1.2:
        drag_factor += min(0.35, (wave_height_m - 1.2) * 0.12)
    if wind_speed_kmh is not None and math.isfinite(wind_speed_kmh) and wind_speed_kmh > 25.0:
        drag_factor += min(0.25, (wind_speed_kmh - 25.0) * 0.008)

    effective_speed_kmh = max(2.0, spec["speed_kmh"] / drag_factor)
    round_trip_km = round(base_one_way * 2.0, 2)
    transit_hours = round(round_trip_km / effective_speed_kmh, 2) if effective_speed_kmh > 0 else 0.0
    fuel_liters = round(transit_hours * spec["fuel_liters_per_hour"] * drag_factor, 2)
    fuel_cost_inr = round(fuel_liters * fuel_price_inr, 2)
    co2_kg = round(fuel_liters * 2.68, 2)

    # Naive blind-search comparison heuristic: unguided search typically adds ~35% extra steaming track
    blind_search_factor = 1.35
    blind_fuel_liters = round(fuel_liters * blind_search_factor, 2)
    estimated_saved_liters = round(max(0.0, blind_fuel_liters - fuel_liters), 2)
    estimated_saved_inr = round(estimated_saved_liters * fuel_price_inr, 2)

    ranked_zones: List[Dict[str, Any]] = []
    for zone in pfz_zones or []:
        z_lat = zone.get("latitude")
        z_lon = zone.get("longitude")
        if z_lat is None or z_lon is None:
            continue
        dist = float(zone.get("distance_km") or haversine_km(origin_lat, origin_lon, float(z_lat), float(z_lon)))
        rt_dist = dist * 2.0
        z_hours = rt_dist / effective_speed_kmh
        z_liters = z_hours * spec["fuel_liters_per_hour"] * drag_factor
        ranked_zones.append({
            "id": zone.get("id"),
            "name": zone.get("landing_centre") or zone.get("name") or "PFZ Sector",
            "one_way_km": round(dist, 2),
            "round_trip_km": round(rt_dist, 2),
            "estimated_hours": round(z_hours, 2),
            "estimated_fuel_liters": round(z_liters, 2),
            "estimated_cost_inr": round(z_liters * fuel_price_inr, 2),
        })
    ranked_zones.sort(key=lambda item: item["estimated_cost_inr"])

    return {
        "reliability_tier": "ORCA_HEURISTIC",
        "is_navigation_clearance": False,
        "vessel_class": vclass,
        "vessel_label": spec["label"],
        "fuel_price_inr": round(fuel_price_inr, 2),
        "one_way_distance_km": round(base_one_way, 2),
        "round_trip_distance_km": round_trip_km,
        "effective_speed_kmh": round(effective_speed_kmh, 2),
        "sea_state_drag_factor": round(drag_factor, 2),
        "estimated_transit_hours": transit_hours,
        "estimated_fuel_liters": fuel_liters,
        "estimated_fuel_cost_inr": fuel_cost_inr,
        "estimated_co2_kg": co2_kg,
        "pfz_guided_savings_vs_blind_search": {
            "assumed_search_overhead_pct": 35,
            "estimated_saved_liters": estimated_saved_liters,
            "estimated_saved_inr": estimated_saved_inr,
        },
        "ranked_pfz_options": ranked_zones[:5],
        "disclaimer": (
            "Planning heuristic based on straight-line geodesic distance and nominal vessel burn rates. "
            "Actual fuel use varies with hull fouling, catch load, currents, and harbour approaches."
        ),
    }
