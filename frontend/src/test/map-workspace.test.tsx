import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/orca/i18n";
import { MapPanel } from "@/components/orca/MapPanel";
const map = vi.hoisted(() => vi.fn());
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
