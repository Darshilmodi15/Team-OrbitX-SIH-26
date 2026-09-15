import reader from "./reader.html?raw";
import type { LocationInfo, MarineBundle, MarineSnapshot } from "../types";
import type { PFZAdvisory } from "../pfz";

const HOUR = 3600000;
const fields: [keyof MarineSnapshot, string, string, string][] = [
  ["waveHeightM", "Wave height", "m", "wave_height_m"],
  ["wavePeriodS", "Wave period", "s", "wave_period_s"],
  ["waveDirectionDeg", "Wave direction (from)", "°", "wave_direction_deg"],
  ["windSpeedKmh", "Wind speed", "km/h", "wind_speed_kmh"],
  ["windDirectionDeg", "Wind direction (from)", "°", "wind_direction_deg"],
  ["seaTemperatureC", "Sea surface temperature", "°C", "sea_surface_temperature_c"],
  ["windWaveHeightM", "Wind-wave height", "m", "wind_wave_height_m"],
  ["windWavePeriodS", "Wind-wave period", "s", "wind_wave_period_s"],
  ["windWaveDirectionDeg", "Wind-wave direction (from)", "°", "wind_wave_direction_deg"],
  ["swellWaveHeightM", "Swell height", "m", "swell_wave_height_m"],
  ["swellWavePeriodS", "Swell period", "s", "swell_wave_period_s"],
  ["swellWaveDirectionDeg", "Swell direction (from)", "°", "swell_wave_direction_deg"],
  ["oceanCurrentSpeedKmh", "Current speed", "km/h", "ocean_current_speed_kmh"],
  ["oceanCurrentDirectionDeg", "Current direction (towards)", "°", "ocean_current_direction_deg"],
];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const timestamp = (value: unknown) => typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;

export function prepareTripPack(location: LocationInfo, bundle: MarineBundle, advisory: PFZAdvisory, now = Date.now()) {
  if (!finite(now) || !finite(location.coords.lat) || !finite(location.coords.lon) || Math.abs(location.coords.lat) > 90 || Math.abs(location.coords.lon) > 180) throw new Error("Invalid trip location");
  const current = bundle.current;
  const expiresAt = now + 48 * HOUR;
  const readings = fields.flatMap(([key, label, unit, backendKey]) => {
    const value = current[key];
    const provenance = current.supplementalFields?.[backendKey];
    const isWind = backendKey.startsWith("wind_") && !backendKey.startsWith("wind_wave_");
    const validAt = timestamp(provenance?.forecast_valid_at ?? (isWind ? current.weatherForecastValidAt : current.marineForecastValidAt) ?? current.forecastValidAt ?? current.time);
    const retrievedAt = timestamp(provenance?.retrieved_at ?? current.retrievedAt);
    if (!finite(value) || !finite(validAt) || now - validAt >= 3 * HOUR || validAt > now + HOUR || ["unavailable", "stale"].includes(current.dataMode ?? "unavailable")) return [];
    return [{ label, value, unit, source: provenance?.source ?? current.primarySource ?? (current.sources.includes("Open-Meteo Marine") ? (isWind ? "Open-Meteo Weather" : "Open-Meteo Marine") : current.sources.join(", ")), validAt,
      retrievedAt: finite(retrievedAt) ? retrievedAt : null, issuedAt: provenance ? null : current.issuedAt ?? null,
      grid: provenance ? { lat: provenance.grid_lat, lon: provenance.grid_lon } : isWind ? null : current.sampledMarineCoords ?? null, expiresAt: Math.min(validAt + 3 * HOUR, expiresAt), mode: "saved copy" }];
  });
  const pfzCurrent = advisory.status === "current" && advisory.source && finite(timestamp(advisory.issuedAt)) && timestamp(advisory.issuedAt) <= now && timestamp(advisory.validUntil) > now && timestamp(advisory.validUntil) > timestamp(advisory.issuedAt);
  const pfz: PFZAdvisory = { status: pfzCurrent ? "current" : "unavailable", source: advisory.source,
    issuedAt: advisory.issuedAt, validUntil: advisory.validUntil, sector: advisory.sector,
    sectorName: advisory.sectorName, issuingAuthority: advisory.issuingAuthority, coverageStatus: advisory.coverageStatus,
    points: pfzCurrent ? advisory.points.filter(p => finite(p.lat) && finite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180).slice(0, 1000).map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })) : [] };
  if (pfz.status === "current" && pfz.points.length === 0 && pfz.coverageStatus !== "no_advisory_issued") pfz.status = "unavailable";
  const forecast = ["stale", "unavailable"].includes(current.dataMode ?? "unavailable") ? [] : bundle.forecast.flatMap(row => {
    const time = timestamp(row.time);
    if (!finite(time) || time < now || time >= expiresAt) return [];
    return [{ time, waveHeightM: finite(row.waveHeightM) ? row.waveHeightM : null, windSpeedKmh: finite(row.windSpeedKmh) ? row.windSpeedKmh : null }];
  }).slice(0, 48);
  return { version: 1, savedAt: now, expiresAt, location: { label: location.label ?? "Selected trip location", lat: location.coords.lat, lon: location.coords.lon }, readings, forecast, forecastSources: current.sources, pfz };
}

export type TripPack = ReturnType<typeof prepareTripPack>;
const base64 = (bytes: Uint8Array) => {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
};
export async function encryptTripPack(pack: TripPack, password: string): Promise<string> {
  if (password.length < 12) throw new Error("Use a trip password of at least 12 characters.");
  const plain = new TextEncoder().encode(JSON.stringify(pack));
  if (plain.byteLength > 1000000) throw new Error("Trip pack is too large.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("ORCA-TRIP-1") }, key, plain);
  const payload = JSON.stringify({ version: 1, salt: base64(salt), iv: base64(iv), cipher: base64(new Uint8Array(cipher)) });
  return reader.replace("__ORCA_ENCRYPTED_PAYLOAD__", payload);
}
