/// <reference types="node" />
// @vitest-environment node
import { runInNewContext } from "node:vm";
import { it, expect, vi } from "vitest";
import { offlineTripReader } from "../../tooling/offline-plugin";

function worker(network = vi.fn().mockRejectedValue(new Error("offline"))) {
  const assets: Record<string, string> = {};
  const generate = offlineTripReader().generateBundle;
  if (typeof generate !== "function") throw new Error("Missing build hook");
  generate.call({ emitFile(asset: {fileName: string; source: string}) { assets[asset.fileName] = asset.source; } } as never, {} as never, {}, false);
  const events: Record<string, (event: any) => void> = {};
  const caches = { open: vi.fn().mockResolvedValue({ add: vi.fn().mockResolvedValue(undefined) }), match: vi.fn().mockResolvedValue(new Response("offline reader")), keys: vi.fn().mockResolvedValue(["unrelated", "orca-offline-reader-old"]), delete: vi.fn().mockResolvedValue(true) };
  const claim = vi.fn();
  runInNewContext(assets["trip-worker.js"], { URL, Request, Response, AbortController, setTimeout, clearTimeout, fetch: network, caches, self: { location: {origin:"https://orca.test"}, clients: { claim }, addEventListener: (name: string, fn: (event: any) => void) => { events[name] = fn; } } });
  return { assets, events, caches, network, claim };
}
it("caches a self-contained public reader, never an authenticated app shell", async () => {
  const w = worker();
  expect(w.assets["offline-trip-reader.html"]).toContain('connect-src \'none\'');
  expect(w.assets["offline-trip-reader.html"]).not.toContain("__ORCA_ENCRYPTED_PAYLOAD__");
  let work: Promise<unknown> = Promise.resolve();
  w.events.activate({ waitUntil(p: Promise<unknown>) { work = p; } });
  await work;
  expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("orca-offline-reader-old");
  expect(w.claim).toHaveBeenCalledOnce();
});
it("returns the reader on offline navigation but never intercepts API, POST or external requests", async () => {
  const w = worker();
  const respondWith = vi.fn();
  for (const request of [
    { url: "https://orca.test/api/chat", method: "POST", mode: "navigate" },
    { url: "https://orca.test/api/marine", method: "GET", mode: "navigate" },
    { url: "https://other.test/dashboard", method: "GET", mode: "navigate" },
    { url: "https://orca.test/dashboard", method: "GET", mode: "cors" },
  ]) w.events.fetch({ request, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
  w.events.fetch({ request: {url:"https://orca.test/dashboard", method:"GET", mode:"navigate"}, respondWith });
  const response = await respondWith.mock.calls[0][0];
  expect(await response.text()).toBe("offline reader");
});
it("passes through online server errors without relabelling them as offline", async () => {
  const w = worker(vi.fn().mockResolvedValue(new Response("server error", {status:500})));
  const respondWith = vi.fn();
  w.events.fetch({ request: {url:"https://orca.test/dashboard", method:"GET", mode:"navigate"}, respondWith });
  expect((await respondWith.mock.calls[0][0]).status).toBe(500);
  expect(w.caches.match).not.toHaveBeenCalled();
});

it("fails installation when storage is denied instead of claiming offline readiness", async () => {
  const w = worker();
  w.caches.open.mockRejectedValue(new Error("quota exceeded"));
  let work: Promise<unknown> = Promise.resolve();
  w.events.install({ waitUntil(p: Promise<unknown>) { work = p; } });
  await expect(work).rejects.toThrow("quota exceeded");
  expect(w.claim).not.toHaveBeenCalled();
});
