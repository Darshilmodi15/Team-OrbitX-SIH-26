import { describe, it, expect } from "vitest";
import { normalizeBackendCurrent, safetyFrom, describeWeather } from "@/lib/orca/marine";

describe("production marine data integrity", () => {
  it.each(["wave_height_m", "wave_period_s", "wind_speed_kmh", "visibility_km"])("preserves missing %s", (key) => {
    const result = normalizeBackendCurrent({ [key]: null, cache_status: "fresh", temperature_c: 28 });
    expect(result.waveHeightM).toBeNull();
    expect(result.windSpeedKmh).toBeNull();
    expect(result.seaTemperatureC).toBeNull();
    expect(result.wavePeriodS).toBeNull();
    expect(result.weatherCode).toBeNull();
  });
  it.each([["fresh", "fresh"], ["live", "fresh"], ["cached", "cached"], ["hit", "cached"], ["stale", "stale"], ["unavailable", "unavailable"], [undefined, "unavailable"]])("maps %s to %s", (status, expected) => {
    expect(normalizeBackendCurrent({ cache_status: status, forecast_valid_at: "2026-09-14T04:00:00Z" }).dataMode).toBe(expected);
  });
  it("does not turn missing evidence into a calm safety verdict", () => {
    expect(safetyFrom(null, null)).toBe("unknown");
    expect(safetyFrom(0, null)).toBe("unknown");
    expect(safetyFrom(null, 0)).toBe("unknown");
    expect(safetyFrom(0, 0)).toBe("unknown");
    expect(safetyFrom(4, null)).toBe("emergency");
    expect(safetyFrom(null, 45)).toBe("dangerous");
  });
  it("keeps real zero and requires provider weather code for clear sky", () => {
    const result = normalizeBackendCurrent({ wave_height_m: 0, wind_speed_kmh: 0, forecast: "calm / clear" });
    expect(result.waveHeightM).toBe(0);
    expect(result.windSpeedKmh).toBe(0);
    expect(result.weatherCode).toBeNull();
    expect(describeWeather(result.weatherCode)).toBe("—");
    expect(normalizeBackendCurrent({ weather_code: 0 }).weatherCode).toBe(0);
  });
});
