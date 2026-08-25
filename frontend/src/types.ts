import type { WeatherMetrics } from './data/maritimeData';
export type { WeatherMetrics };

export interface GisLayerState {
  pfz: boolean;
  geofence: boolean;
  eez: boolean;
  sst: boolean;
  chlorophyll: boolean;
  wind: boolean;
  waves: boolean;
  ports: boolean;
  vessels: boolean;
  route: boolean;
}

export interface LocationCoords {
  lat: number;
  lon: number;
}

export interface LocationValidationInfo {
  lat: number;
  lon: number;
  inside_india: boolean;
  is_coastal_supported: boolean;
  distance_to_coast_km: number;
  nearest_coastal_point?: {
    lat: number;
    lon: number;
    name: string;
    region: string;
  };
  coastal_region?: string | null;
  message: string;
  intelligence_radius_km: number;
}

export interface PFZEvidenceItem {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  depth_m?: number | null;
  species: string[];
  source?: string;
  is_mock?: boolean;
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  weather?: WeatherMetrics | null;
  risk_level?: string | null;
  plan?: unknown;
  reasoning?: string[];
  sources_used?: string[];
}

export type SafetyLevel = 'safe' | 'caution' | 'dangerous' | 'emergency' | 'unknown';

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

export interface ForecastPoint {
  hour_offset: number;
  time_label?: string;
  wave_height_m?: number | null;
  wind_speed_kmh?: number | null;
  wind_gusts_kmh?: number | null;
  precipitation_probability?: number | null;
  condition?: string | null;
  risk?: 'safe' | 'caution' | 'unsafe' | null;
}
