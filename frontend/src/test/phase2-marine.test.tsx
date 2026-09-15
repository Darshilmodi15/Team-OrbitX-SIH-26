import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarineBundle, fetchOpenMeteoMarineBundle, normalizeBackendCurrent } from "@/lib/orca/marine";
import { MarineConditions } from "@/components/orca/Conditions";
import { I18nProvider } from "@/lib/orca/i18n";

afterEach(() => vi.unstubAllGlobals());
const now = new Date().toISOString().slice(0, 13) + ":00";
const marine = { latitude: 18.875, longitude: 72.625, hourly: { time: [now], wave_height: [1.2], wave_direction: [229], wave_period: [9.6], sea_surface_temperature: [28.6], swell_wave_height: [0.8], swell_wave_period: [11.6], swell_wave_direction: [200], ocean_current_velocity: [0], ocean_current_direction: [74] } };
const weather = { hourly: { time: [now], wind_speed_10m: [12], temperature_2m: [31], visibility: [12000] } };
function network(m: unknown, w: unknown) {
  const fn = vi.fn(async (url: string) => {
    const data = url.includes("marine-api") ? m : w;
    if (data instanceof Error) throw data;
    return { ok: true, json: async () => structuredClone(data) };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("Marine model fields", () => {
  it("keeps marine data through a weather outage and treats UTC as UTC", async () => {
    const calls = network(marine, new Error("offline"));
    const { current } = await fetchOpenMeteoMarineBundle({lat: 18.9, lon: 72.6});
    expect(current.time).toBe(now + "Z");
    expect(current.oceanCurrentSpeedKmh).toBe(0);
    expect(current.seaTemperatureC).toBe(28.6);
    expect(current.windSpeedKmh).toBeNull();
    expect(current.weatherForecastValidAt).toBeNull();
    expect(current.issuedAt).toBeNull();
    expect(calls.mock.calls[0][0]).toContain("timezone=UTC");
  });
  it("does not replace marine fields with air weather on marine outage", async () => {
    network(new Error("offline"), weather);
    const { current } = await fetchOpenMeteoMarineBundle({lat: 18.9, lon: 72.6});
    expect(current.seaTemperatureC).toBeNull();
    expect(current.airTemperatureC).toBe(31);
    expect(current.swellWaveHeightM).toBeNull();
  });
  it("rejects stale timeline as current", async () => {
    network({ hourly: { time: ["2020-01-01T00:00"], wave_height: [1] } }, {});
    const bundle = await fetchOpenMeteoMarineBundle({lat: 18.9, lon: 72.6});
    expect(bundle.current.dataMode).toBe("unavailable");
    expect(bundle.current.waveHeightM).toBeNull();
    expect(bundle.forecast).toEqual([]);
  });
  it("renders backend swell/current fields and identifies model provenance", () => {
    const current = normalizeBackendCurrent({ source: "open_meteo_marine_api", cache_status: "fresh", wave_direction_deg: 229, swell_wave_height_m: 0.8, swell_wave_period_s: 11.6, swell_wave_direction_deg: 200, ocean_current_speed_kmh: 0, ocean_current_direction_deg: 74, measurement_kind: "model_forecast", marine_forecast_valid_at: now + "Z", grid_lat:18.875, grid_lon:72.625 });
    render(<I18nProvider><MarineConditions data={current}/></I18nProvider>);
    expect(screen.getByText(/Model forecast/)).toBeVisible();
    expect(screen.getByText("0.8 m · 11.6 s · 200 °")).toBeVisible();
    expect(screen.getByText("0.0 km/h · 74 °")).toBeVisible();
    expect(screen.getByText("18.8750, 72.6250")).toBeVisible();
  });
});


it("reaches the direct marine fallback when the backend is unreachable", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (!url.includes("open-meteo.com")) throw new Error("backend offline");
    return { ok: true, json: async () => structuredClone(url.includes("marine-api") ? marine : weather) };
  }));
  const result = await fetchMarineBundle({ lat:18.9, lon:72.6 });
  expect(result.connectivityMode).toBe("direct");
  expect(result.current.swellWaveHeightM).toBe(0.8);
});


it("does not invent forecast or retrieval times from an undated response", () => {
  const current = normalizeBackendCurrent({ cache_status: "fresh", wave_height_m: 1, wind_speed_kmh: 10 });
  expect(current.time).toBe("");
  expect(current.fetchedAt).toBeNull();
  expect(current.dataMode).toBe("unavailable");
});

it("does not invent forecast times for undated or timezone-ambiguous slots", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () =>
    url.includes("/forecast?") ? { forecast_horizon: [
      { wave_height_m: 1 }, { time: "2026-09-14T10:00", wave_height_m: 2 },
      { time: "2026-09-14T10:00:00Z", wave_height_m: 3 },
    ] } : url.includes("/conditions?") ? { forecast_valid_at: "2026-09-14T09:00:00Z", cache_status: "fresh" } : {}
  })));
  const result = await fetchMarineBundle({lat:18.9, lon:72.6});
  expect(result.forecast).toHaveLength(1);
  expect(result.forecast[0].time).toBe("2026-09-14T10:00:00.000Z");
  expect(result.forecast[0].windSpeedKmh).toBeNull();
});


it("uses real fallback after a 200 response with unavailable readings", async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes("marine-api")?structuredClone(marine):url.includes("api.open-meteo")?structuredClone(weather):url.includes("/conditions")?{cache_status:"unavailable",forecast_valid_at:null}:{} })));
 const bundle=await fetchMarineBundle({lat:18.9,lon:72.6});
 expect(bundle.connectivityMode).toBe("direct");
 expect(bundle.current.waveHeightM).toBe(1.2);
 expect(bundle.current.sources).toContain("Open-Meteo Marine");
});
