import { snapshotPFZ, type MarineSnapshot } from "./snapshot";
import type { Coords } from "./geo";

export type MarineMapData = ReturnType<typeof marineMapData>;

const CARDINALS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
] as const;

export function compassLabel(degrees: number): string {
  if (!Number.isFinite(degrees)) return "";
  const idx = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return CARDINALS[idx];
}

export function haversineKm(from: Coords, to: Coords): number {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLon = (to.lon - from.lon) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmToNm(km: number): number {
  return km / 1.852;
}

export function bearing(from: Coords, to: Coords) {
  const radians = Math.PI / 180, a = from.lat * radians, b = to.lat * radians, delta = (to.lon-from.lon) * radians;
  return (Math.atan2(Math.sin(delta)*Math.cos(b), Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(delta)) / radians + 360) % 360;
}
export function marineMapData(snapshot?: MarineSnapshot) {
  const current = snapshotPFZ(snapshot).status === "current";
  const pfz = snapshot && current ? snapshot.pfz.zones.map(point => ({...point,
    bearing: bearing(snapshot.location, {lat:point.latitude,lon:point.longitude}),
    geometry: (["official_advisory_area", "search_region"].includes(point.geometry_meaning || "") || !!snapshot.provenance.demo_scenario && point.geometry_meaning === "illustrative_search_region") ? point.geometry : null,
    radius: point.radius_meaning === "advisory_search_radius" && Number.isFinite(point.search_radius_m) && point.search_radius_m! > 0 ? point.search_radius_m : null,
  })) : [];
  const vectors: Array<{
    lat: number;
    lon: number;
    degrees: number;
    kind: "Wind" | "Wave" | "Current";
    convention: string;
    source: string;
    validAt: string | null;
    magnitude: number | null;
    unit: string;
  }> = [];
  for (const [field, magField, unit, kind, convention] of [
    ["wind_direction_deg", "wind_speed_kmh", "km/h", "Wind", "from"],
    ["wave_direction_deg", "wave_height_m", "m", "Wave", "provider bearing"],
    ["current_direction", "current_speed", "km/h", "Current", "provider bearing"],
  ] as const) {
    const value = snapshot?.weather[field], source = snapshot?.provenance.fields[`weather.${field}`];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 360 || source?.grid_lat == null || source.grid_lon == null) continue;
    if (!Number.isFinite(source.grid_lat) || !Number.isFinite(source.grid_lon) || Math.abs(source.grid_lat) > 90 || Math.abs(source.grid_lon) > 180) continue;
    const rawMag = snapshot?.weather[magField];
    const magnitude = typeof rawMag === "number" && Number.isFinite(rawMag) ? rawMag : null;
    vectors.push({lat:source.grid_lat,lon:source.grid_lon,degrees:value,kind,convention,source:source.source,validAt:source.forecast_valid_at,magnitude,unit});
  }
  return {locations:snapshot ? [snapshot.location] : [], pfz, boundaries:snapshot?.boundary.geometry,
    restrictedAreas:[], vectors, hazards:snapshot?.hazards || []};
}
