import type { Coords, LocationInfo } from "./geo";

export type SafetyLevel = "safe" | "caution" | "dangerous" | "emergency";

export type MarineSnapshot = {
  time: string;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  seaTemperatureC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  visibilityKm: number | null;
  airTemperatureC: number | null;
  weatherCode: number | null;
  fetchedAt: number;
  sources: string[];
};

export type ForecastPoint = {
  time: string;
  waveHeightM: number | null;
  windSpeedKmh: number | null;
  level: SafetyLevel;
};

export type MarineBundle = {
  current: MarineSnapshot;
  forecast: ForecastPoint[];
  past: ForecastPoint[];
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

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
};

export type UserRole = "user" | "government" | "admin";

export type OrcaUser = {
  id: string;
  name: string;
  contact: string;
  role: UserRole;
};

export type { Coords, LocationInfo };
