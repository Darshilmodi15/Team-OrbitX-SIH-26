import type { SafetyLevel } from '../types';

export const formatNumber = (
  value: number | null | undefined,
  fractionDigits = 1,
  fallback = 'Unavailable'
) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(fractionDigits) : fallback);

export const formatCoords = (lat?: number, lon?: number) => {
  if (typeof lat !== 'number' || typeof lon !== 'number') return 'Location unavailable';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
};

export const formatUpdatedAt = (date: Date | null) => {
  if (!date) return 'Not updated';
  const deltaMs = Date.now() - date.getTime();
  const deltaMin = Math.max(0, Math.round(deltaMs / 60000));
  if (deltaMin < 1) return 'Just now';
  if (deltaMin === 1) return '1 min ago';
  if (deltaMin < 60) return `${deltaMin} min ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const normalizeSafetyLevel = (riskLevel?: string | null): SafetyLevel => {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized === 'safe') return 'safe';
  if (normalized === 'caution' || normalized === 'moderate') return 'caution';
  if (normalized === 'unsafe' || normalized === 'danger' || normalized === 'dangerous' || normalized === 'high') {
    return 'dangerous';
  }
  if (normalized === 'emergency' || normalized === 'critical') return 'emergency';
  return 'unknown';
};

export const sourceLabel = (source?: string | null) => {
  if (!source) return 'Connected data source';
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};
