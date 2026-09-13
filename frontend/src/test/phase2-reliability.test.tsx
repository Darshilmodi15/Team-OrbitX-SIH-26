import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/orca/i18n";
import { PFZAdvisory } from "@/components/orca/PFZAdvisory";
import { fetchPFZDataset, fetchPFZSectors, fetchProviderHealth, fetchSatelliteStatus } from "@/services/api";

const mocks = vi.hoisted(() => ({
  fetchPFZ: vi.fn(),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    fetchPFZDataset: mocks.fetchPFZ,
  };
});

function mount(view: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>{view}</I18nProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Phase 2 — Live data and truthful availability contracts", () => {
  it("displays coverage gap when a coastal sector has no current active advisory", async () => {
    mocks.fetchPFZ.mockResolvedValue({
      source: "unavailable",
      data_mode: "unavailable",
      status: "unavailable",
      issued_at: null,
      valid_until: null,
      sector: "gujarat",
      sector_name: "Gujarat Coastal Sector",
      coverage_status: "coverage_gap",
      pfz_zones: [],
      reason: "No timestamped current PFZ advisory feed is configured",
    });

    mount(<PFZAdvisory />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("No current PFZ advisory available");
      expect(screen.getByRole("status")).toHaveTextContent("Coverage gap — no advisory issued");
    });
  });

  it("allows selecting different coastal sectors via the sector dropdown", async () => {
    mocks.fetchPFZ.mockResolvedValue({
      source: "unavailable",
      data_mode: "unavailable",
      status: "unavailable",
      issued_at: null,
      valid_until: null,
      sector: "maharashtra",
      sector_name: "Maharashtra Coastal Sector",
      coverage_status: "coverage_gap",
      pfz_zones: [],
      reason: "No timestamped current PFZ advisory feed is configured",
    });

    mount(<PFZAdvisory />);

    const select = screen.getByLabelText(/Coastal Sector/i);
    expect(select).toBeInTheDocument();

    await userEvent.selectOptions(select, "maharashtra");
    expect(mocks.fetchPFZ).toHaveBeenCalledWith("maharashtra", undefined, undefined, undefined);
  });

  it("renders verified live advisory points with issuing authority dates", async () => {
    const issued = new Date(Date.now() - 3600000).toISOString();
    const valid = new Date(Date.now() + 86400000).toISOString();
    mocks.fetchPFZ.mockResolvedValue({
      source: "INCOIS PFZ Advisory",
      data_mode: "live",
      issued_at: issued,
      valid_until: valid,
      sector: "maharashtra",
      sector_name: "Maharashtra Coastal Sector",
      issuing_authority: "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
      pfz_zones: [
        { id: "pfz-1", latitude: 18.92, longitude: 72.83, landing_centre: "Sassoon Dock" },
      ],
    });

    mount(<PFZAdvisory showPoints />);

    await waitFor(() => {
      expect(screen.getByText("Current advisory")).toBeInTheDocument();
      expect(screen.getByText("Sassoon Dock")).toBeInTheDocument();
      expect(screen.getByText("INCOIS PFZ Advisory")).toBeInTheDocument();
    });
  });
});
