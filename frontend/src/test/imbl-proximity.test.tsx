import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/orca/i18n";
import CoastMap from "@/components/orca/CoastMap";

const mocks = vi.hoisted(() => ({
  fetchGeofences: vi.fn(),
  fetchPFZDataset: vi.fn(),
  fetchInternationalBoundaries: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  fetchGeofences: mocks.fetchGeofences,
  fetchPFZDataset: mocks.fetchPFZDataset,
  fetchInternationalBoundaries: mocks.fetchInternationalBoundaries,
}));

function mountMap(center: { lat: number; lon: number }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <CoastMap center={center} interactive={false} height={300} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe("IMBL Map Visualization & Proximity Warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPFZDataset.mockResolvedValue({ data_mode: "unavailable", pfz_zones: [] });
    mocks.fetchInternationalBoundaries.mockResolvedValue(null);
  });

  it("displays no intrusive warning when the vessel is in safe waters (>25 km away)", async () => {
    mocks.fetchGeofences.mockResolvedValue({
      geofences: [
        {
          id: "imbl-pakistan",
          name: "India - Pakistan Maritime Boundary (Sir Creek Buffer)",
          category: "IMBL",
          distance_to_vessel_km: 150.4,
          coordinates: [[23.60, 67.80], [23.35, 68.10]],
          is_proximity_warning: false,
          is_inside: false,
        },
      ],
    });

    mountMap({ lat: 18.92, lon: 72.83 });
    // In safe waters, no CRITICAL or WARNING alert banner should be rendered
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/CRITICAL IMBL WARNING/)).not.toBeInTheDocument();
    expect(screen.queryByText(/APPROACHING IMBL/)).not.toBeInTheDocument();
  });

  it("displays an amber warning banner when the vessel enters the WARNING buffer (<=25 km)", async () => {
    mocks.fetchGeofences.mockResolvedValue({
      geofences: [
        {
          id: "imbl-pakistan",
          name: "India - Pakistan Maritime Boundary (Sir Creek Buffer)",
          category: "IMBL",
          distance_to_vessel_km: 18.2,
          coordinates: [[23.60, 67.80], [23.35, 68.10]],
          is_proximity_warning: true,
          is_inside: false,
        },
      ],
    });

    mountMap({ lat: 23.40, lon: 68.10 });
    const alert = await screen.findByRole("alert");
    expect(alert).toBeVisible();
    expect(screen.getByText("APPROACHING IMBL")).toBeVisible();
    expect(screen.getByText(/18.2 km/)).toBeVisible();
    expect(screen.getByText(/India - Pakistan Maritime Boundary/)).toBeVisible();
  });

  it("displays an urgent red critical alert banner when critically close (<=10 km)", async () => {
    mocks.fetchGeofences.mockResolvedValue({
      geofences: [
        {
          id: "imbl-srilanka",
          name: "India - Sri Lanka International Maritime Boundary Line (IMBL)",
          category: "IMBL",
          distance_to_vessel_km: 4.8,
          coordinates: [[10.08, 79.86], [9.95, 79.62]],
          is_proximity_warning: true,
          is_inside: false,
        },
      ],
    });

    mountMap({ lat: 9.35, lon: 79.28 });
    const alert = await screen.findByRole("alert");
    expect(alert).toBeVisible();
    expect(screen.getByText("CRITICAL IMBL WARNING")).toBeVisible();
    expect(screen.getByText(/4.8 km/)).toBeVisible();
    expect(screen.getByText(/Move away from the boundary immediately/)).toBeVisible();
  });

  it("successfully loads international boundaries for target sovereign pairs without error", async () => {
    mocks.fetchGeofences.mockResolvedValue({ geofences: [] });
    mocks.fetchInternationalBoundaries.mockResolvedValue({
      type: "FeatureCollection",
      features: [
        {
          id: "eez_boundaries.1",
          properties: { line_name: "Pakistan - India", line_type: "Median line", sovereign1: "Pakistan", sovereign2: "India" },
          geometry: { type: "LineString", coordinates: [[68.16, 23.50], [67.00, 21.50]] },
        },
        {
          id: "eez_boundaries.2",
          properties: { line_name: "Sri Lanka - India", line_type: "Treaty", sovereign1: "Sri Lanka", sovereign2: "India" },
          geometry: { type: "LineString", coordinates: [[79.53, 9.10], [77.17, 5.00]] },
        },
        {
          id: "eez_boundaries.3",
          properties: { line_name: "India - Bangladesh", line_type: "Median line", sovereign1: "India", sovereign2: "Bangladesh" },
          geometry: { type: "LineString", coordinates: [[89.15, 21.60], [88.50, 19.50]] },
        },
        {
          id: "eez_boundaries.4",
          properties: { line_name: "Maldives - India", line_type: "Treaty", sovereign1: "Maldives", sovereign2: "India" },
          geometry: { type: "LineString", coordinates: [[73.00, 6.00], [74.50, 7.50]] },
        },
        {
          id: "eez_boundaries.5",
          properties: { line_name: "Indonesia - Andaman and Nicobar (India)", line_type: "Treaty", sovereign1: "Indonesia", sovereign2: "India" },
          geometry: { type: "LineString", coordinates: [[94.00, 6.50], [95.50, 7.00]] },
        },
        {
          id: "eez_boundaries.6",
          properties: { line_name: "Andaman and Nicobar (India) - Myanmar", line_type: "Treaty", sovereign1: "India", sovereign2: "Myanmar" },
          geometry: { type: "LineString", coordinates: [[93.00, 13.50], [94.00, 14.00]] },
        },
        {
          id: "eez_boundaries.7",
          properties: { line_name: "Thailand - Andaman and Nicobar (India)", line_type: "Treaty", sovereign1: "Thailand", sovereign2: "India" },
          geometry: { type: "LineString", coordinates: [[96.00, 7.50], [97.00, 8.50]] },
        },
      ],
    });

    const { container } = mountMap({ lat: 18.92, lon: 72.83 });
    expect(container).toBeInTheDocument();
  });
});
