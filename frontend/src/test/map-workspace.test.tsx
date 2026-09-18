import { fireEvent, render as testingRender, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
function render(ui: React.ReactNode) { return testingRender(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{ui}</QueryClientProvider>); }
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/orca/i18n";
import { MapPanel } from "@/components/orca/MapPanel";
const map = vi.hoisted(() => vi.fn());
const network = vi.hoisted(() => ({mode: "GOOD"}));
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orca/connectivity", () => ({useConnectivity: () => network.mode}));
vi.mock("@/services/api", () => ({apiFetch: request}));
vi.mock("@/lib/orca/snapshot", async (original) => ({
  ...(await original<any>()),
  useMarineSnapshot: () => ({ offline: false, activate: vi.fn() }),
}));
vi.mock("@/components/orca/CoastMap", () => ({
  default: (props: any) => {
    map(props);
    return <div>Map tiles mounted</div>;
  },
}));
const snapshot: any = {
  snapshot_id: "test-snapshot",
  location: { lat: 20.9, lon: 70.37 },
  request: { requested_time: "2026-09-16T06:00:00Z" },
  risk: { level: "unknown", reasons: [] },
  expires_at: "2099-09-16T06:05:00Z",
  provenance: {
    cache_status: "cached",
    fields: {},
    retrieved_at: "2026-09-16T06:00:00Z",
    source: [],
  },
  hazards: [],
  pfz: { availability: "unavailable", zones: [] },
  boundary: { availability: "unavailable" },
  weather: {},
  ocean: {},
};
beforeEach(() => {
  localStorage.clear();
  map.mockClear();
  network.mode = "GOOD";
  request.mockReset();
  request.mockResolvedValue({ok:true,json:async()=>({status:"empty",evidence:[],points:[],disclaimer:"Historical only"})});
});
it("requests optional data only on selection and stops tiles in offline mode", async () => {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const ui = () => <QueryClientProvider client={client}><I18nProvider><MapPanel center={snapshot.location} snapshot={snapshot} full /></I18nProvider></QueryClientProvider>;
  const view = testingRender(ui());
  await screen.findByText("Map tiles mounted");
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"Map layers"}));
  fireEvent.click(screen.getByText("Advanced"));
  fireEvent.click(screen.getByRole("checkbox", {name:"Historical species · OBIS"}));
  await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
  await screen.findByText("OBIS: empty");
  fireEvent.click(screen.getByRole("button", {name:"Satellite"}));
  expect(map.mock.lastCall?.[0].satellite).toBe(true);
  network.mode = "DEGRADED"; view.rerender(ui());
  expect(screen.getByText("Low-data mode")).toBeVisible();
  expect(screen.getByRole("button", {name:"Satellite"})).toBeDisabled();
  expect(map.mock.lastCall?.[0].satellite).toBe(false);
  expect(map.mock.lastCall?.[0].species).toBeUndefined();
  network.mode = "OFFLINE"; view.rerender(ui());
  expect(screen.queryByText("Map tiles mounted")).not.toBeInTheDocument();
  expect(screen.getByText(/No map tiles are loaded/)).toBeVisible();
  network.mode = "GOOD"; view.rerender(ui());
  await screen.findByText("Map tiles mounted");
  expect(request).toHaveBeenCalledTimes(1);
});
it("never mounts map tiles in saved text mode and retains snapshot information", () => {
  localStorage.setItem("orca.map.mode", "text");
  render(
    <I18nProvider>
      <MapPanel center={snapshot.location} snapshot={snapshot} full />
    </I18nProvider>,
  );
  expect(map).not.toHaveBeenCalled();
  expect(screen.getByText(/No map tiles are loaded/)).toBeVisible();
  expect(
    screen.getByText("Current verified PFZ advisory unavailable"),
  ).toBeVisible();
});
it("keeps advanced sample points off and disables an unavailable PFZ layer", async () => {
  render(
    <I18nProvider>
      <MapPanel center={snapshot.location} snapshot={snapshot} full />
    </I18nProvider>,
  );
  await screen.findByText("Map tiles mounted");
  expect(map.mock.lastCall?.[0].showConditions).toBe(false);
  fireEvent.click(
    screen.getByRole("button", { name: "Map layers" }),
  );
  expect(
    screen.getByRole("checkbox", { name: "PFZ" }),
  ).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "EEZ · VLIZ" })).toBeDisabled();
});
it("unmounts tiles when switching to text and keeps just one disclosure in compact chat", async () => {
  const { container } = render(
    <I18nProvider>
      <MapPanel center={snapshot.location} snapshot={snapshot} compact />
    </I18nProvider>,
  );
  await screen.findByText("Map tiles mounted");
  fireEvent.click(screen.getByRole("button", { name: "Text only" }));
  expect(screen.queryByText("Map tiles mounted")).not.toBeInTheDocument();
  expect(container.querySelectorAll("details[data-snapshot-id]")).toHaveLength(
    0,
  );
});
