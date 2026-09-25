import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSavedLocation, apiFetch } from "@/services/api";
import { useSession } from "./session";
import type { MarineBundle, MarineSnapshot as Readings } from "./types";
import type { PFZAdvisory } from "./pfz";
import { useConnectivity } from "./connectivity";

export type FieldSource = { source: string; issued_at: string | null; forecast_valid_at: string | null; retrieved_at: string | null; grid_lat: number | null; grid_lon: number | null; cache_status: string; parameter?: string; value?: number | null; unit?: string | null; provider?: string; product?: string | null; evidence_type?: string; platform?: string | null; sensor?: string | null; satellite?: string | null; spatial_resolution?: string | null; temporal_resolution?: string | null; source_url?: string | null };
export type PFZZone = {id: string; latitude: number; longitude: number; landing_centre?: string; distance_km: number; species?: string[]; geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null; geometry_meaning?: string | null; search_radius_m?: number | null; radius_meaning?: string | null};
export type MarineSnapshot = {
  snapshot_id: string;
  location: { name: string | null; lat: number; lon: number };
  request: { requested_date: string; requested_time: string };
  weather: Record<string, number | string | null>;
  ocean: { sst_c: number | null; chlorophyll: number | null };
  pfz: { availability: string; advisory_id: string | null; issued_at: string | null; valid_until: string | null; source: string | null; zones: PFZZone[] };
  tide: { availability: string; high_tide: null; low_tide: null };
  boundary: { availability: string; eez: { name: string; inside: boolean } | null; nearest_boundary_distance: number | null; warnings: string[]; geometry: GeoJSON.FeatureCollection | null; geometry_ref?: string; provenance: Record<string, unknown> };
  hazards: Array<{id: string; severity: string; title: string; message: string; timestamp: string | null; source: string}>;
  risk: { level: string; reasons: string[] };
  provenance: { demo_scenario?: string; provider: string[]; source: string[]; issued_at: string | null; forecast_valid_at: string | null; retrieved_at: string; grid_lat: number | null; grid_lon: number | null; cache_status: string; data_age_seconds: number; fallback_used: boolean; fields: Record<string, FieldSource> };
  missing_fields: string[];
  expires_at: string;
  backend_sha: string;
};
const PREFIX = "orca.marine.cache.snapshot.v1.";
export function snapshotExpired(s: MarineSnapshot, now = Date.now()) { return !Number.isFinite(Date.parse(s.expires_at)) || Date.parse(s.expires_at) <= now; }
export async function fetchSnapshot(requestedTime?: string, signal?: AbortSignal, demoScenario?: string): Promise<MarineSnapshot> {
  const params = new URLSearchParams();
  if(requestedTime) params.set("requested_time",requestedTime);
  if(demoScenario) params.set("demo_scenario",demoScenario);
  const response = await apiFetch(`/api/marine/snapshot?${params}`, { signal });
  if (!response.ok) throw Object.assign(new Error("SNAPSHOT_UNAVAILABLE"), { status: response.status, detail: (await response.json().catch(() => ({}))).detail });
  return response.json();
}
export async function fetchSnapshotById(id: string): Promise<MarineSnapshot> {
  const response = await apiFetch(`/api/marine/snapshots/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("SNAPSHOT_UNAVAILABLE");
  return response.json();
}
function readSaved(owner: string, lat?: number, lon?: number): MarineSnapshot | undefined {
  try {
    const s = JSON.parse(sessionStorage.getItem(PREFIX + owner) || "null") as MarineSnapshot | null;
    if (s?.snapshot_id && s.location.lat === lat && s.location.lon === lon && Date.now() - Date.parse(s.provenance.retrieved_at) < 48 * 3600000) return s;
  } catch { /* Storage is optional. */ }
}
export function snapshotPFZ(s?: MarineSnapshot): PFZAdvisory {
  const p = s?.pfz;
  const current = !!p && p.availability === "available" && !!p.valid_until && Date.parse(p.valid_until) > Date.now();
  return { status: current ? "current" : p?.valid_until && Date.parse(p.valid_until) <= Date.now() ? "expired" : "unavailable", source:p?.source ?? null,
    issuedAt:p?.issued_at ?? null, validUntil:p?.valid_until ?? null, points: current ? p.zones.map(z => ({id:z.id, name:z.landing_centre || "PFZ", lat:z.latitude, lon:z.longitude, distanceKm:z.distance_km, species:z.species})) : [] };
}
export function snapshotBundle(s: MarineSnapshot, offline = false): MarineBundle {
  const w=s.weather, p=s.provenance;
  const n=(key: string) => typeof w[key] === "number" ? w[key] as number : null;
  const mode = offline || snapshotExpired(s) || p.cache_status === "stale" ? "stale" : p.cache_status === "unavailable" ? "unavailable" : "cached";
  const current: Readings = { time:p.forecast_valid_at || "", waveHeightM:n("wave_height_m"), wavePeriodS:n("wave_period_s"), waveDirectionDeg:n("wave_direction_deg"),
    windSpeedKmh:n("wind_speed_kmh"), windDirectionDeg:n("wind_direction_deg"), visibilityKm:n("visibility_km"), seaTemperatureC:s.ocean.sst_c,
    airTemperatureC:n("air_temperature_c"), weatherCode:n("weather_code"), windWaveHeightM:n("wind_wave_height_m"), windWavePeriodS:n("wind_wave_period_s"), windWaveDirectionDeg:n("wind_wave_direction_deg"),
    swellWaveHeightM:n("swell_height_m"), swellWavePeriodS:n("swell_period_s"), swellWaveDirectionDeg:n("swell_direction_deg"), oceanCurrentSpeedKmh:n("current_speed"), oceanCurrentDirectionDeg:n("current_direction"),
    sources:p.source, primarySource:p.source.join(", "), dataMode:mode, fetchedAt:Date.parse(p.retrieved_at), retrievedAt:p.retrieved_at, issuedAt:p.issued_at, forecastValidAt:p.forecast_valid_at,
    measurementKind:p.demo_scenario ? "illustrative" : "model_forecast", marineForecastValidAt:p.fields["weather.wave_height_m"]?.forecast_valid_at, weatherForecastValidAt:p.fields["weather.wind_speed_kmh"]?.forecast_valid_at,
    sampledMarineCoords:p.grid_lat != null && p.grid_lon != null ? {lat:p.grid_lat,lon:p.grid_lon}:null };
  return { current, forecast:[], past:[], tide:null, connectivityMode:"backend", snapshot:s,
    alerts:s.hazards.map(h=>({id:h.id,level:h.severity === "critical" ? "danger" : "warning",title:h.title,body:h.message,issuedAt:h.timestamp || "",official:false,source:h.source})) };
}

type ContextValue = { demoScenario: string; setDemoScenario: (value: string) => void; snapshot?: MarineSnapshot; isPending: boolean; isError: boolean; isFetching: boolean; offline: boolean; activate: () => void; refetch: () => Promise<unknown>; adopt: (snapshot: MarineSnapshot) => void; requestedTime?: string; setRequestedTime: (value?: string) => void };
const SnapshotContext = createContext<ContextValue | null>(null);
export function MarineSnapshotProvider({children}: {children:ReactNode}) {
  const connectivity = useConnectivity();
  const {user,location,token,locationReady,setLocation}=useSession();
  const client=useQueryClient();
  const [active,setActive]=useState("");
  const [demoScenario,setDemoScenario]=useState("");
  const [requestedTime,setRequestedTime]=useState<string>();
  const [offline,setOffline]=useState(!navigator.onLine);
  const [clock,setClock]=useState(Date.now());
  const owner=user?.id || "none", lat=location?.coords.lat, lon=location?.coords.lon;
  const key=useMemo(()=>["canonical-snapshot",owner,lat,lon,requestedTime || "current",demoScenario],[owner,lat,lon,requestedTime,demoScenario]);
  const saved=useMemo(()=>readSaved(owner,lat,lon),[owner,lat,lon]);
  const query=useQuery({queryKey:key, enabled:active === `${owner}:${lat}:${lon}` && !!user && !!location && locationReady,
    queryFn:async ({signal})=>{
      const result=await fetchSnapshot(requestedTime,signal,demoScenario);
      if(result.location.lat !== lat || result.location.lon !== lon) {
        const saved = await fetchSavedLocation();
        if(!signal.aborted && saved?.is_coastal_supported) setLocation({coords:{lat:saved.lat,lon:saved.lon},label:`${saved.lat}, ${saved.lon}`,area:"coastal",source:"manual",distanceToCoastKm:saved.distance_to_coast_km});
        throw new Error("SAVED_LOCATION_CHANGED_ON_ANOTHER_DEVICE");
      }
      try { if(!signal.aborted && sessionStorage.getItem("orca.auth.session") === token) sessionStorage.setItem(PREFIX+owner,JSON.stringify(result)); } catch { /* Optional storage. */ }
      return result;
    }, staleTime:300000, refetchInterval: connectivity === "OFFLINE" ? false : connectivity === "DEGRADED" ? 900000 : 300000, retry:1,
    placeholderData:saved && (saved.provenance.demo_scenario || "") === demoScenario && (!requestedTime || saved.request.requested_time === requestedTime) ? saved : undefined});
  useEffect(()=>{setRequestedTime(undefined);},[owner,lat,lon]);
  useEffect(()=>{setDemoScenario("");},[owner]);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);clearInterval(timer);};},[]);
  const activate=useCallback(()=>setActive(`${owner}:${lat}:${lon}`),[owner,lat,lon]);
  const adopt=useCallback((s:MarineSnapshot)=>{
    if(s.location.lat !== lat || s.location.lon !== lon) return;
    const nextKey=["canonical-snapshot",owner,lat,lon,s.request.requested_time,s.provenance.demo_scenario || ""];
    setDemoScenario(s.provenance.demo_scenario || "");
    client.setQueryData(nextKey,s);setRequestedTime(s.request.requested_time);
    try { sessionStorage.setItem(PREFIX+owner,JSON.stringify(s)); } catch { /* Optional storage. */ }
  },[client,owner,lat,lon]);
  const snapshot=query.data;
  const value=useMemo(()=>({demoScenario,setDemoScenario,snapshot,isPending:query.isPending,isError:query.isError,isFetching:query.isFetching,
    offline:offline || query.isError || !!snapshot && snapshotExpired(snapshot,clock),activate,refetch:query.refetch,adopt,requestedTime,setRequestedTime}),[demoScenario,snapshot,query.isPending,query.isError,query.isFetching,query.refetch,offline,clock,activate,adopt,requestedTime]);
  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>;
}
export function useMarineSnapshot(){const value=useContext(SnapshotContext);if(!value)throw new Error("MarineSnapshotProvider required");return value;}
