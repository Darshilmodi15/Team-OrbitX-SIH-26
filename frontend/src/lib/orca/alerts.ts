import type { Alert, MarineBundle } from "./types";

/**
 * Advisories derived from live observed marine conditions.
 * Every advisory is produced from a measured value returned by the
 * marine/weather service for the user's own coordinates.
 */
export function deriveAdvisories(bundle: MarineBundle | null): Alert[] {
  if (!bundle) return [];
  const c = bundle.current;
  const at = new Date(bundle.current.fetchedAt || Date.now()).toISOString();
  const out: Alert[] = [];

  if (c.waveHeightM != null && c.waveHeightM >= 2.5) {
    out.push({
      id: "wave-high",
      level: c.waveHeightM >= 3.5 ? "danger" : "warning",
      title: "High wave conditions",
      body: `Observed significant wave height is ${c.waveHeightM.toFixed(1)} m at your location. Small craft should avoid going out.`,
      issuedAt: at,
      official: false,
      source: "Open-Meteo Marine (observed/forecast)",
    });
  }

  if (c.windSpeedKmh != null && c.windSpeedKmh >= 35) {
    out.push({
      id: "wind-strong",
      level: c.windSpeedKmh >= 50 ? "danger" : "warning",
      title: "Strong winds",
      body: `Wind speed is ${Math.round(c.windSpeedKmh)} km/h. Handling and return to shore may become difficult.`,
      issuedAt: at,
      official: false,
      source: "Open-Meteo Weather (observed/forecast)",
    });
  }

  if (c.visibilityKm != null && c.visibilityKm < 2) {
    out.push({
      id: "visibility-low",
      level: "warning",
      title: "Low visibility",
      body: `Visibility is about ${c.visibilityKm} km. Navigation and collision risk increases sharply.`,
      issuedAt: at,
      official: false,
      source: "Open-Meteo Weather (observed/forecast)",
    });
  }

  const worsening = bundle.forecast.find((p) => p.level === "dangerous" || p.level === "emergency");
  if (worsening) {
    out.push({
      id: "forecast-deterioration",
      level: "warning",
      title: "Conditions expected to worsen",
      body: `Forecast conditions become unsafe around ${new Date(worsening.time).toLocaleString()}. Plan your return before then.`,
      issuedAt: at,
      official: false,
      source: "Open-Meteo forecast",
    });
  }

  return out;
}
