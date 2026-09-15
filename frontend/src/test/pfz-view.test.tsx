import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/orca/i18n";
import { PFZAdvisory } from "@/components/orca/PFZAdvisory";
import { MapPanel } from "@/components/orca/MapPanel";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), map: vi.fn() }));
vi.mock("@/services/api", () => ({ fetchPFZDataset: mocks.fetch }));
vi.mock("@/components/orca/CoastMap", () => ({ default: (props: { selectedSector?: string }) => { mocks.map(props); return <div>Map loaded</div>; } }));
function mount(view: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const result = render(<QueryClientProvider client={client}><I18nProvider>{view}</I18nProvider></QueryClientProvider>);
  return { ...result, client };
}
afterEach(() => { vi.useRealTimers(); mocks.map.mockClear(); });
describe("PFZ map reading flow", () => {
  it("remembers text mode without rendering the map, then switches on demand", async () => {
    localStorage.setItem("orca.map.mode", "text");
    mocks.fetch.mockResolvedValue({ data_mode: "unavailable", pfz_zones: [] });
    mount(<MapPanel center={{ lat: 19, lon: 72 }} interactive />);
    expect(await screen.findByText(/No current PFZ advisory available/)).toBeVisible();
    expect(mocks.map).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Text only" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /^Map$/ }));
    expect(await screen.findByText("Map loaded")).toBeVisible();
  });
  it("keeps map selection available when text mode was previously saved", async () => {
    localStorage.setItem("orca.map.mode", "text");
    mount(<MapPanel center={{ lat: 19, lon: 72 }} onSelect={() => {}} />);
    expect(await screen.findByText("Map loaded")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Text only" })).not.toBeInTheDocument();
  });
  it("renders all advisory points in text mode", async () => {
    const expiry = Date.now() + 60_000;
    mocks.fetch.mockResolvedValue({ source: "test-provider", data_mode: "cached", issued_at: new Date(Date.now() - 60_000).toISOString(), valid_until: new Date(expiry).toISOString(), pfz_zones: [{ latitude: 19, longitude: 72, landing_centre: "Harbour one" }, { latitude: 18, longitude: 71, landing_centre: "Harbour two" }] });
    mount(<PFZAdvisory showPoints />);
    expect(await screen.findByText("Harbour two")).toBeVisible();
    expect(screen.getByText("Harbour one")).toBeVisible();

  });
  it("expires a mounted cached advisory on its timer", async () => {
    vi.useFakeTimers();
    const expiry = Date.now() + 1000;
    mocks.fetch.mockResolvedValue({ source: "test-provider", data_mode: "cached", issued_at: new Date(Date.now() - 1000).toISOString(), valid_until: new Date(expiry).toISOString(), pfz_zones: [{ latitude: 19, longitude: 72, landing_centre: "Test point" }] });
    mount(<PFZAdvisory showPoints />);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText("Test point")).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText("Advisory expired")).toBeVisible();
    expect(screen.queryByText("Test point")).not.toBeInTheDocument();
  });
  it("uses the selected UI language for availability and guide", async () => {
    localStorage.setItem("orca.lang", "hi");
    mocks.fetch.mockResolvedValue({ data_mode: "unavailable", pfz_zones: [] });
    mount(<PFZAdvisory />);
    await waitFor(() => expect(screen.getByText(/वर्तमान PFZ परामर्श उपलब्ध नहीं/)).toBeVisible());
    expect(screen.getByText("यह मानचित्र कैसे पढ़ें")).toBeVisible();
  });
});


it("passes the same selected sector to the map and advisory request", async () => {
  mocks.fetch.mockResolvedValue({ data_mode: "unavailable", pfz_zones: [] });
  mount(<MapPanel center={{ lat: 19, lon: 72 }} />);
  await screen.findByText("Map loaded");
  await userEvent.selectOptions(screen.getByLabelText(/Coastal Sector/), "nicobar");
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("nicobar", undefined, undefined, "en"));
  expect(mocks.map).toHaveBeenLastCalledWith(expect.objectContaining({ selectedSector: "nicobar" }));
});
