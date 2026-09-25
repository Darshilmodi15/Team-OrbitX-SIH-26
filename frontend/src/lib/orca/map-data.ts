import { snapshotPFZ, type MarineSnapshot } from "./snapshot";
import type { Coords } from "./geo";

export type MarineMapData = ReturnType<typeof marineMapData>;
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
  const vectors: Array<{lat:number;lon:number;degrees:number;kind:string;convention:string;source:string;validAt:string|null}> = [];
  for (const [field, kind, convention] of [["wind_direction_deg", "Wind", "from"], ["wave_direction_deg", "Wave", "provider bearing"], ["current_direction", "Current", "provider bearing"]] as const) {
    const value = snapshot?.weather[field], source = snapshot?.provenance.fields[`weather.${field}`];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 360 || source?.grid_lat == null || source.grid_lon == null) continue;
    if (!Number.isFinite(source.grid_lat) || !Number.isFinite(source.grid_lon) || Math.abs(source.grid_lat) > 90 || Math.abs(source.grid_lon) > 180) continue;
    vectors.push({lat:source.grid_lat,lon:source.grid_lon,degrees:value,kind,convention,source:source.source,validAt:source.forecast_valid_at});
  }
  return {locations:snapshot ? [snapshot.location] : [], pfz, boundaries:snapshot?.boundary.geometry,
    restrictedAreas:[], vectors, hazards:snapshot?.hazards || []};
}
