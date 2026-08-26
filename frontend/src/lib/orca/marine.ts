import type { Coords } from "./geo";
import type { ForecastPoint, MarineBundle, MarineSnapshot, SafetyLevel } from "./types";

/**
 * Live marine + weather data.
 * Source: Open-Meteo Marine and Forecast APIs (no key required, real data).
 */

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

function nearestHourIndex(times: string[]): number {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

export function safetyFrom(waveM: number | null, windKmh: number | null, visKm?: number | null): SafetyLevel {
  const wave = waveM ?? 0;
  const wind = windKmh ?? 0;
  const vis = visKm ?? 10;
  if (wave >= 4 || wind >= 62) return "emergency";
  if (wave >= 2.5 || wind >= 40 || vis < 1) return "dangerous";
  if (wave >= 1.5 || wind >= 25 || vis < 4) return "caution";
  return "safe";
}

type Hourly<T> = Record<string, T>;

export async function fetchMarineBundle(c: Coords, signal?: AbortSignal): Promise<MarineBundle> {
  const common = `latitude=${c.lat.toFixed(3)}&longitude=${c.lon.toFixed(3)}&timezone=auto&past_days=1&forecast_days=2`;

  const [marineRes, weatherRes] = await Promise.all([
    fetch(
      `${MARINE_URL}?${common}&hourly=wave_height,wave_period,sea_surface_temperature`,
      signal ? { signal } : {},
    ),
    fetch(
      `${WEATHER_URL}?${common}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code`,
      signal ? { signal } : {},
    ),
  ]);

  if (!weatherRes.ok) throw new Error(`weather_unavailable_${weatherRes.status}`);

  const weather = (await weatherRes.json()) as {
    hourly: Hourly<(number | null)[]> & { time: string[] };
  };
  const marine = marineRes.ok
    ? ((await marineRes.json()) as { hourly: Hourly<(number | null)[]> & { time: string[] } })
    : null;

  const times = weather.hourly.time;
  const at = (h: Hourly<(number | null)[]> | undefined, key: string, i: number): number | null =>
    (h?.[key]?.[i] as number | null | undefined) ?? null;
  const idx = nearestHourIndex(times);

  const marineTimes = marine?.hourly.time ?? [];
  const marineIdxFor = (iso: string) => marineTimes.indexOf(iso);

  const waveAt = (iso: string) => {
    const i = marineIdxFor(iso);
    return i >= 0 ? at(marine?.hourly, "wave_height", i) : null;
  };

  const sources = ["Open-Meteo Weather"];
  if (marine) sources.push("Open-Meteo Marine");

  const visRaw = at(weather.hourly, "visibility", idx);
  const nowIso = times[idx] ?? new Date().toISOString();
  const marineIdxNow = marineIdxFor(nowIso);

  const current: MarineSnapshot = {
    time: nowIso,
    waveHeightM: waveAt(nowIso),
    wavePeriodS: marineIdxNow >= 0 ? at(marine?.hourly, "wave_period", marineIdxNow) : null,
    seaTemperatureC:
      marineIdxNow >= 0 ? at(marine?.hourly, "sea_surface_temperature", marineIdxNow) : null,
    windSpeedKmh: at(weather.hourly, "wind_speed_10m", idx),
    windDirectionDeg: at(weather.hourly, "wind_direction_10m", idx),
    visibilityKm: visRaw == null ? null : Math.round((visRaw / 1000) * 10) / 10,
    airTemperatureC: at(weather.hourly, "temperature_2m", idx),
    weatherCode: at(weather.hourly, "weather_code", idx),
    fetchedAt: Date.now(),
    sources,
  };

  const point = (i: number): ForecastPoint => {
    const iso = times[i] ?? nowIso;
    const wave = waveAt(iso);
    const wind = at(weather.hourly, "wind_speed_10m", i);
    return { time: iso, waveHeightM: wave, windSpeedKmh: wind, level: safetyFrom(wave, wind) };
  };

  const forecast: ForecastPoint[] = [];
  for (let i = idx; i < Math.min(idx + 13, times.length); i++) forecast.push(point(i));

  const past: ForecastPoint[] = [];
  for (let i = Math.max(0, idx - 24); i < idx; i++) past.push(point(i));

  return { current, forecast, past };
}

export const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 80: "Rain showers", 81: "Heavy showers",
  82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

export function describeWeather(code: number | null): string {
  if (code == null) return "\u2014";
  return WEATHER_CODES[code] ?? "\u2014";
}

export function compassDirection(deg: number | null): string {
  if (deg == null) return "\u2014";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] ?? "\u2014";
}
