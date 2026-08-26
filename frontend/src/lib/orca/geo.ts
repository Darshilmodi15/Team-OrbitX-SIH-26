/**
 * Geographic services for ORCA Marine AI.
 *
 * The India outline and coastline samples below are coarse cartographic
 * approximations used only for operational-area validation and distance
 * estimation inside the app. They are NOT official boundaries.
 */

export type Coords = { lat: number; lon: number };

export type OperationalArea = "coastal" | "inland" | "outside-india";

export type LocationInfo = {
  coords: Coords;
  label?: string;
  admin?: string;
  distanceToCoastKm: number;
  area: OperationalArea;
  source: "gps" | "manual" | "search";
};

/** Maximum distance from the coastline that ORCA supports (km). */
export const COASTAL_BUFFER_KM = 100;

export const INDIA_BOUNDS = { south: 6.5, west: 68.0, north: 37.6, east: 97.5 };

/** Coarse outline of India (lon/lat pairs), clockwise. Approximate. */
const INDIA_POLYGON: [number, number][] = [
  [77.8, 35.5], [79.5, 34.3], [78.9, 31.3], [81.0, 30.3],
  [83.0, 29.2], [85.8, 28.2], [88.1, 27.9], [88.9, 27.3],
  [89.7, 26.7], [92.0, 27.5], [94.5, 27.6], [96.5, 27.3],
  [97.4, 27.0], [96.2, 25.0], [94.6, 23.9], [93.4, 23.0],
  [92.4, 21.4], [91.0, 22.1], [89.1, 21.6], [87.0, 21.5],
  [86.9, 20.7], [85.1, 19.5], [83.3, 18.1], [81.2, 16.3],
  [80.3, 15.8], [80.2, 13.1], [79.9, 11.9], [79.4, 10.3],
  [79.0, 9.3], [78.2, 8.8], [77.5, 8.05], [76.6, 9.0],
  [75.8, 11.2], [74.8, 13.0], [73.8, 15.5], [72.9, 18.9],
  [72.6, 20.9], [72.7, 21.7], [70.0, 22.3], [68.9, 22.3],
  [68.2, 23.6], [70.0, 24.2], [71.0, 27.8], [73.5, 29.9],
  [74.5, 31.1], [75.3, 32.3], [74.3, 34.5], [76.0, 35.4],
  [77.8, 35.5],
];

/** Extra island territories treated as valid coastal areas. */
const ISLAND_BOXES = [
  { south: 6.6, north: 13.7, west: 92.1, east: 94.3 }, // Andaman & Nicobar
  { south: 8.0, north: 12.5, west: 71.8, east: 74.0 }, // Lakshadweep
];

/** Sampled points along the Indian coastline (approximate). */
const COASTLINE: Coords[] = [
  { lat: 23.6, lon: 68.4 }, { lat: 22.5, lon: 69.1 },
  { lat: 22.2, lon: 70.0 }, { lat: 21.6, lon: 69.6 },
  { lat: 20.9, lon: 70.4 }, { lat: 20.8, lon: 71.5 },
  { lat: 21.2, lon: 72.6 }, { lat: 21.7, lon: 72.6 },
  { lat: 20.7, lon: 72.9 }, { lat: 19.9, lon: 72.8 },
  { lat: 19.07, lon: 72.87 }, { lat: 18.3, lon: 73.0 },
  { lat: 17.0, lon: 73.3 }, { lat: 15.9, lon: 73.6 },
  { lat: 15.3, lon: 73.8 }, { lat: 14.5, lon: 74.3 },
  { lat: 13.35, lon: 74.7 }, { lat: 12.87, lon: 74.84 },
  { lat: 11.87, lon: 75.36 }, { lat: 11.25, lon: 75.78 },
  { lat: 10.0, lon: 76.26 }, { lat: 8.9, lon: 76.6 },
  { lat: 8.4, lon: 76.97 }, { lat: 8.08, lon: 77.55 },
  { lat: 8.8, lon: 78.14 }, { lat: 9.28, lon: 79.31 },
  { lat: 10.3, lon: 79.85 }, { lat: 11.4, lon: 79.8 },
  { lat: 12.0, lon: 79.86 }, { lat: 13.08, lon: 80.29 },
  { lat: 14.0, lon: 80.15 }, { lat: 15.5, lon: 80.3 },
  { lat: 16.0, lon: 81.2 }, { lat: 17.0, lon: 82.25 },
  { lat: 17.69, lon: 83.22 }, { lat: 18.3, lon: 84.1 },
  { lat: 19.3, lon: 85.0 }, { lat: 19.8, lon: 85.83 },
  { lat: 20.3, lon: 86.6 }, { lat: 21.0, lon: 86.9 },
  { lat: 21.6, lon: 87.5 }, { lat: 21.8, lon: 88.3 },
  { lat: 21.6, lon: 89.0 }, { lat: 11.66, lon: 92.75 },
  { lat: 10.57, lon: 72.64 },
];

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inBox(c: Coords, b: { south: number; north: number; west: number; east: number }) {
  return c.lat >= b.south && c.lat <= b.north && c.lon >= b.west && c.lon <= b.east;
}

function pointInPolygon(c: Coords, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]!;
    const pj = poly[j]!;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const intersect =
      yi > c.lat !== yj > c.lat && c.lon < ((xj - xi) * (c.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInIndia(c: Coords): boolean {
  if (ISLAND_BOXES.some((b) => inBox(c, b))) return true;
  if (!inBox(c, INDIA_BOUNDS)) return false;
  return pointInPolygon(c, INDIA_POLYGON);
}

/** Approximate distance from a point to the nearest sampled coastline point. */
export function distanceToCoastKm(c: Coords): number {
  let min = Infinity;
  for (const p of COASTLINE) {
    const d = haversineKm(c, p);
    if (d < min) min = d;
  }
  return Math.round(min * 10) / 10;
}

export function classifyLocation(c: Coords): { area: OperationalArea; distanceToCoastKm: number } {
  const distance = distanceToCoastKm(c);
  const offshore = !isInIndia(c);
  if (offshore && distance > COASTAL_BUFFER_KM) {
    return { area: "outside-india", distanceToCoastKm: distance };
  }
  return {
    area: distance <= COASTAL_BUFFER_KM ? "coastal" : "inland",
    distanceToCoastKm: distance,
  };
}

export function nearestCoastPoint(c: Coords): Coords {
  return COASTLINE.reduce<Coords>(
    (best, p) => (haversineKm(c, p) < haversineKm(c, best) ? p : best),
    COASTLINE[0]!,
  );
}

export function formatCoords(c: Coords): string {
  const ns = c.lat >= 0 ? "N" : "S";
  const ew = c.lon >= 0 ? "E" : "W";
  return `${Math.abs(c.lat).toFixed(4)}\u00b0 ${ns}, ${Math.abs(c.lon).toFixed(4)}\u00b0 ${ew}`;
}

export type PlaceResult = { name: string; admin?: string; coords: Coords };

/** Real place search (Open-Meteo geocoding), restricted to India. */
export async function searchIndianPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query,
  )}&count=20&language=en&format=json&countryCode=IN`;
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`geocoding_failed_${res.status}`);
  const json = (await res.json()) as {
    results?: { name: string; admin1?: string; latitude: number; longitude: number }[];
  };
  return (json.results ?? [])
    .map((r) => ({
      name: r.name,
      admin: r.admin1 ?? "",
      coords: { lat: r.latitude, lon: r.longitude },
    }))
    .filter((r) => isInIndia(r.coords));
}

/** Reverse lookup of the nearest named place, used for a human-readable label. */
export async function reverseLabel(c: Coords, signal?: AbortSignal): Promise<string | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${c.lat}&longitude=${c.lon}&count=1&language=en&format=json`;
    const res = await fetch(url, signal ? { signal } : {});
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { name: string; admin1?: string }[] };
    const r = json.results?.[0];
    return r ? [r.name, r.admin1].filter(Boolean).join(", ") : null;
  } catch {
    return null;
  }
}
