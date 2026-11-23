import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/orca/i18n";

vi.mock("@/services/api", () => ({
  broadcastSOS: vi.fn(),
  updateSOSDetails: vi.fn(),
  calculateTripEconomics: vi.fn(),
  fetchLunarTideEstimate: vi.fn(),
}));

import {
  broadcastSOS,
  calculateTripEconomics,
  fetchLunarTideEstimate,
} from "@/services/api";
import { IncidentCard } from "@/components/orca/IncidentCard";
import EmergencySOSModal from "@/components/EmergencySOSModal";
import { LunarTideCard } from "@/components/orca/LunarTideCard";
import { TripEconomicsCard } from "@/components/orca/TripEconomicsCard";
import { evaluateProximityAlert } from "@/lib/orca/proximity-alarm";
import type { MarineSnapshot } from "@/lib/orca/snapshot";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SIH 2026 Upgrades", () => {
  it("renders officer SOS triage controls and invokes status callbacks", () => {
    const onStatusChange = vi.fn();
    render(
      <I18nProvider>
        <IncidentCard
          incident={{
            sos_id: "SOS-TEST-01",
            status: "RECEIVED",
            assigned_mrcc: "MRCC Mumbai",
            mayday_message: "MAYDAY MAYDAY MAYDAY TEST",
            recorded_telemetry: {
              lat: 20.9,
              lon: 70.37,
              location_name: "Veraval",
              location_source: "selected",
              notes: "Rudder damaged",
            },
          }}
          onStatusChange={onStatusChange}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark Responding" }));
    expect(onStatusChange).toHaveBeenCalledWith("SOS-TEST-01", "RESPONDING");
    fireEvent.click(screen.getByRole("button", { name: "Mark Resolved" }));
    expect(onStatusChange).toHaveBeenCalledWith("SOS-TEST-01", "RESOLVED");
  });

  it("shows MRCC, MAYDAY transcript and offline SMS fallback inside EmergencySOSModal", async () => {
    vi.mocked(broadcastSOS).mockResolvedValue({
      sos_id: "SOS-2026-99",
      status: "RECEIVED",
      assigned_mrcc: "MRCC Mumbai (West Coast Headquarters) — Tel: 1554",
      mayday_message: "MAYDAY, MAYDAY, MAYDAY.\nPOSITION: 20.9000° N, 70.3700° E.",
    });

    render(
      <I18nProvider>
        <EmergencySOSModal
          isOpen
          onClose={() => {}}
          userLocation={{ lat: 20.9, lon: 70.37 }}
          locationName="Veraval"
          locationSource="selected"
        />
      </I18nProvider>,
    );

    const smsLink = screen.getByRole("link", { name: /SMS 112/i });
    expect(smsLink.getAttribute("href")).toContain("sms:112?body=");

    fireEvent.click(screen.getByRole("button", { name: "Send SOS request" }));
    expect(await screen.findByText(/SOS-2026-99/)).toBeInTheDocument();
    expect(screen.getByText(/MRCC Mumbai/)).toBeInTheDocument();
    expect(screen.getByText(/POSITION: 20.9000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy MAYDAY/i })).toBeInTheDocument();
  });

  it("renders TripEconomicsCard with heuristic notice and PFZ savings", async () => {
    vi.mocked(calculateTripEconomics).mockResolvedValue({
      reliability_tier: "ORCA_HEURISTIC",
      is_navigation_clearance: false,
      vessel_class: "motorized_gillnetter",
      vessel_label: "Motorized Gillnetter",
      fuel_price_inr: 95,
      one_way_distance_km: 18,
      round_trip_distance_km: 36,
      effective_speed_kmh: 14,
      sea_state_drag_factor: 1,
      estimated_transit_hours: 2.57,
      estimated_fuel_liters: 16.71,
      estimated_fuel_cost_inr: 1587.45,
      estimated_co2_kg: 44.78,
      pfz_guided_savings_vs_blind_search: {
        assumed_search_overhead_pct: 35,
        estimated_saved_liters: 5.85,
        estimated_saved_inr: 555.75,
      },
      ranked_pfz_options: [],
      disclaimer: "Planning heuristic based on straight-line geodesic distance.",
    });

    render(
      <I18nProvider>
        <TripEconomicsCard lat={20.9} lon={70.37} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText(/36 km/)).toBeInTheDocument());
    expect(screen.getByText(/16\.71 L/)).toBeInTheDocument();
    expect(screen.getByText(/Save ~₹555\.75/)).toBeInTheDocument();
    expect(screen.getByText(/ORCA Heuristic/i)).toBeInTheDocument();
  });

  it("renders LunarTideCard with non-clearance astronomical disclaimer", async () => {
    vi.mocked(fetchLunarTideEstimate).mockResolvedValue({
      status: "estimated",
      is_authoritative: false,
      reliability_tier: "ASTRONOMICAL_ESTIMATE",
      source: "ORCA Astronomical Lunar Model (M2/S2)",
      date_ist: "2026-11-23",
      lunar_age_days: 14.1,
      illumination_pct: 98.7,
      moon_phase: "Full Moon",
      tidal_regime: "SPRING_TIDE",
      regime_note: "Higher tidal range around Full Moon.",
      estimated_high_tide_windows_ist: ["00:42 IST", "13:07 IST"],
      estimated_low_tide_windows_ist: ["06:54 IST", "19:19 IST"],
      disclaimer: "Astronomical lunar-phase estimate only; do not use for keel clearance.",
    });

    render(
      <I18nProvider>
        <LunarTideCard lat={20.9} lon={70.37} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Full Moon \(98\.7%\)/)).toBeInTheDocument());
    expect(screen.getByText(/SPRING TIDE/)).toBeInTheDocument();
    expect(screen.getByText(/do not use for keel clearance/i)).toBeInTheDocument();
  });

  it("triggers proximity alerts when near EEZ boundary, outside EEZ, or hazard present", () => {
    const safeSnap = {
      boundary: { availability: "available", eez: { name: "Indian EEZ", inside: true }, nearest_boundary_distance: 45, warnings: [], geometry: null, provenance: {} },
      hazards: [],
      risk: { level: "low", reasons: [] },
    } as unknown as MarineSnapshot;
    expect(evaluateProximityAlert(safeSnap).triggered).toBe(false);

    const nearEdge = {
      ...safeSnap,
      boundary: { ...safeSnap.boundary, nearest_boundary_distance: 4.2 },
    } as unknown as MarineSnapshot;
    const edgeAlert = evaluateProximityAlert(nearEdge);
    expect(edgeAlert.triggered).toBe(true);
    expect(edgeAlert.severity).toBe("critical");
    expect(edgeAlert.reason).toContain("4.2 km");

    const outside = {
      ...safeSnap,
      boundary: { ...safeSnap.boundary, eez: { name: "Indian EEZ", inside: false }, nearest_boundary_distance: 3.1 },
    } as unknown as MarineSnapshot;
    expect(evaluateProximityAlert(outside).severity).toBe("critical");

    const unsafeSea = {
      ...safeSnap,
      risk: { level: "unsafe", reasons: ["High waves"] },
    } as unknown as MarineSnapshot;
    expect(evaluateProximityAlert(unsafeSea).severity).toBe("warning");
  });
});
