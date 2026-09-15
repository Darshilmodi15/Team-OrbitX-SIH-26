/// <reference types="node" />
// @vitest-environment node
import { writeFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";
import { describe, it, expect, vi, afterEach } from "vitest";
import { prepareTripPack, encryptTripPack } from "@/lib/orca/offline/trip-pack";
import type { MarineBundle, LocationInfo } from "@/lib/orca/types";
import type { PFZAdvisory } from "@/lib/orca/pfz";

const now = Date.now();
const location: LocationInfo = { coords: { lat: 18.9, lon: 72.6 }, label: "TEST ONLY — public Mumbai reference", distanceToCoastKm: 1, area: "coastal", source: "manual" };
const bundle: MarineBundle = { current: { time: new Date(now).toISOString(), forecastValidAt: new Date(now).toISOString(), retrievedAt: new Date(now).toISOString(), waveHeightM: 1, wavePeriodS: null, seaTemperatureC: null, windSpeedKmh: 10, windDirectionDeg: null, visibilityKm: null, airTemperatureC: null, weatherCode: null, fetchedAt: now, sources: ["TEST ONLY provider"], dataMode: "fresh" }, forecast: [{time: new Date(now + 3600000).toISOString(), waveHeightM: null, windSpeedKmh: 15, level: "unknown"}], past: [] };
const pfz: PFZAdvisory = { status: "unavailable", source: null, issuedAt: null, validUntil: null, points: [] };
afterEach(() => vi.unstubAllGlobals());

async function viewer(password = "test-password-long", change?: (pack: ReturnType<typeof prepareTripPack>) => void, tamper = false, usePicker = false) {
  vi.stubGlobal("crypto", webcrypto);
  const pack = prepareTripPack(location, bundle, pfz, now);
  change?.(pack);
  let html = await encryptTripPack(pack, "test-password-long");
  if (tamper) html = html.replace(/"cipher":"(.)/, (_, first) => '"cipher":"' + (first === "A" ? "B" : "A"));
  const readerHtml = usePicker ? html.replace(/(<script id="payload" type="application\/json">)[^<]+/, "$1{}") : html;
  const dom = new JSDOM(readerHtml, { runScripts: "dangerously", beforeParse(window) {
    Object.defineProperty(window, "crypto", { value: webcrypto });
    Object.assign(window, { TextEncoder, TextDecoder });
  } });
  if (usePicker) {
    const file = dom.window.document.querySelector<HTMLInputElement>("#file")!;
    Object.defineProperty(file, "files", { value: [{ size: html.length, text: async () => html + "<script>window.untrustedExecuted=true</script>" }] });
    await file.onchange!({ target: file } as unknown as Event);
  }
  const input = dom.window.document.querySelector<HTMLInputElement>("#password")!;
  input.value = password;
  await dom.window.document.querySelector<HTMLFormElement>("form")!.onsubmit!({ preventDefault() {} } as SubmitEvent);
  return { dom, html, pack };
}

describe("offline trip pack", () => {
  it("whitelists data without exporting account/session/chat or safety claims", () => {
    const data = prepareTripPack(location, { ...bundle, token: "SECRET", chat: ["private"] } as MarineBundle, pfz, now);
    expect(JSON.stringify(data)).not.toMatch(/SECRET|private|safe|level/);
    expect(data.readings).toHaveLength(2);
    expect(data.forecast[0].waveHeightM).toBeNull();
    expect(data.expiresAt - data.savedAt).toBe(48 * 3600000);
  });
  it("drops stale readings, expired PFZ points and invalid or past forecast slots", () => {
    const old = { ...bundle, current: { ...bundle.current, time: "2020-01-01T00:00:00Z", forecastValidAt: "2020-01-01T00:00:00Z", dataMode: "stale" as const } };
    const data = prepareTripPack(location, old, { ...pfz, status: "expired", points: [{ id: "secret", name: "old", lat: 19, lon: 73 }] }, now);
    expect(data.readings).toEqual([]); expect(data.forecast).toEqual([]); expect(data.pfz.points).toEqual([]);
  });
  it("encrypts location, opens with password, renders safely and locks", async () => {
    const { dom, html } = await viewer("test-password-long", pack => { pack.location.label = "<img src=x onerror=alert(1)>"; });
    try {
      expect(html).not.toContain("TEST ONLY provider"); expect(html).not.toContain("18.9");
      expect(dom.window.document.querySelector("#content")!.textContent).toContain("Wave height: 1 m");
      expect(dom.window.document.querySelector("#content img")).toBeNull();
      dom.window.document.querySelector<HTMLButtonElement>("#lock")!.click();
      expect(dom.window.document.querySelector("#content")!.textContent).toBe("");
    } finally { dom.window.close(); }
  });
  it("rejects wrong passwords", async () => {
    const { dom, html } = await viewer("wrong-password");
    if (process.env.ORCA_TRIP_ARTIFACT) await writeFile(process.env.ORCA_TRIP_ARTIFACT, html);
    try { expect(dom.window.document.querySelector("#status")!.textContent).toContain("Cannot unlock"); }
    finally { dom.window.close(); }
  });
  it("hides all time-sensitive content after the 48-hour pack limit", async () => {
    const { dom } = await viewer("test-password-long", pack => { pack.savedAt -= 49 * 3600000; pack.expiresAt -= 49 * 3600000; });
    try {
      expect(dom.window.document.querySelector("#status")!.textContent).toContain("Expired pack");
      expect(dom.window.document.querySelector("#content")!.textContent).toBe("");
    } finally { dom.window.close(); }
  });
  it("rejects tampered ciphertext without showing any data", async () => {
    const { dom } = await viewer("test-password-long", undefined, true);
    try {
      expect(dom.window.document.querySelector("#status")!.textContent).toContain("Cannot unlock");
      expect(dom.window.document.querySelector("#content")!.textContent).toBe("");
    } finally { dom.window.close(); }
  });
  it("hides individual expired readings and PFZ while preserving future slots", async () => {
    const { dom } = await viewer("test-password-long", pack => {
      pack.readings.forEach(reading => { reading.expiresAt = now - 1; });
      pack.pfz = { ...pfz, status: "current", source: "TEST", issuedAt: new Date(now - 7200000).toISOString(), validUntil: new Date(now - 1000).toISOString(), points: [{ id: "old", name: "EXPIRED TARGET", lat: 19, lon: 73 }] };
    });
    try {
      const text = dom.window.document.querySelector("#content")!.textContent!;
      expect(text).toContain("No unexpired marine readings");
      expect(text).toContain("Points are hidden");
      expect(text).not.toContain("EXPIRED TARGET");
      expect(text).toContain("wind 15 km/h");
    } finally { dom.window.close(); }
  });
  it("rechecks expiry when an already-open pack resumes", async () => {
    const { dom, pack } = await viewer();
    try {
      expect(dom.window.document.querySelector("#content")!.textContent).toContain("Wave height");
      dom.window.Date.now = () => pack.expiresAt + 1;
      dom.window.dispatchEvent(new dom.window.Event("pageshow"));
      expect(dom.window.document.querySelector("#content")!.textContent).toBe("");
      expect(dom.window.document.querySelector("#status")!.textContent).toContain("Expired pack");
    } finally { dom.window.close(); }
  });
  it("opens the encrypted payload through the offline file picker without executing file scripts", async () => {
    const { dom } = await viewer("test-password-long", undefined, false, true);
    try {
      expect(dom.window.document.querySelector("#content")!.textContent).toContain("Wave height: 1 m");
      expect((dom.window as unknown as { untrustedExecuted?: boolean }).untrustedExecuted).toBeUndefined();
    } finally { dom.window.close(); }
  });
  it("rejects short passwords", async () => {
    await expect(encryptTripPack(prepareTripPack(location, bundle, pfz, now), "short")).rejects.toThrow("12");
  });
});
