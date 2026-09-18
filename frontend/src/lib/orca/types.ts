import type { Coords, LocationInfo } from "./geo";

export type SafetyLevel = "safe" | "caution" | "dangerous" | "emergency" | "unknown";

export type MarineSnapshot = {
  time: string;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  seaTemperatureC: number | null;
  waveDirectionDeg?: number | null;
  windWaveHeightM?: number | null;
  windWaveDirectionDeg?: number | null;
  windWavePeriodS?: number | null;
  swellWaveHeightM?: number | null;
  swellWaveDirectionDeg?: number | null;
  swellWavePeriodS?: number | null;
  oceanCurrentSpeedKmh?: number | null;
  oceanCurrentDirectionDeg?: number | null;
  marineForecastValidAt?: string | null;
  weatherForecastValidAt?: string | null;
  supplementalFields?: Record<string, { source: string; forecast_valid_at: string; retrieved_at: string | null; cache_status: string; grid_lat: number | null; grid_lon: number | null }>;
  measurementKind?: string | null;
  sampledMarineCoords?: Coords | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  visibilityKm: number | null;
  airTemperatureC: number | null;
  weatherCode: number | null;
  fetchedAt: number | null;
  dataMode?: "fresh" | "live" | "cached" | "stale" | "fallback" | "unavailable";
  sources: string[];
  primarySource?: string | null;
  issuedAt?: string | null;
  forecastValidAt?: string | null;
  retrievedAt?: string | null;
};

export type ForecastPoint = {
  time: string;
  waveHeightM: number | null;
  windSpeedKmh: number | null;
  level: SafetyLevel;
};

export type MarineTide = {
  highTideTime: string | null;
  highTideHeightM: number | null;
  lowTideTime: string | null;
  lowTideHeightM: number | null;
  secondaryHighTideTime: string | null;
  secondaryHighTideHeightM: number | null;
  tidalPhase: string;
  tidalRangeM: number | null;
  source: string;
};

export type MarineBundle = {
  snapshot?: import("./snapshot").MarineSnapshot;
  current: MarineSnapshot;
  forecast: ForecastPoint[];
  past: ForecastPoint[];
  tide?: MarineTide | null;
  alerts?: Alert[];
  connectivityMode?: "backend" | "direct";
};

export type Alert = {
  id: string;
  level: "info" | "warning" | "danger";
  title: string;
  body: string;
  issuedAt: string;
  official: boolean;
  source: string;
  area?: string;
};

export type EmergencyService = {
  id: string;
  name: string;
  description: string;
  phone: string;
  source: string;
};

export type ChatEvidence = {
  operational_trace?: Array<{stage:string;provider:string;status:string;latency_ms:number|null;timestamp:string;detail:string|null}>;
  snapshot_id?: string;
  marine_snapshot?: import("./snapshot").MarineSnapshot;
  sources?: string[];
  reasoning?: string[];
  risk_level?: string | null;
  weather?: any;
  nearest_pfz?: any[];
  boundary?: any;
  route?: any;
  alerts?: any[];
  simulation?: any;
  ocean_analytics?: any;
  ecology?: any;
  zone_avoidance?: any;
  tide?: any;
  recommendations?: any[];
  connectivity_mode?: string;
  language?: string;
  language_name?: string;
  plan?: any;
  location?: any;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  evidence?: ChatEvidence | null;
};

export type UserRole = "user" | "government" | "admin";

export type OrcaUser = {
  operationalRegion?: string;
  id: string;
  name: string;
  contact: string;
  role: UserRole;
};

export type { Coords, LocationInfo };
