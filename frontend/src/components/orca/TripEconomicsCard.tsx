import { useEffect, useState } from "react";
import { Fuel } from "lucide-react";
import { calculateTripEconomics, type TripEconomicsResult } from "@/services/api";
import type { PFZZone } from "@/lib/orca/snapshot";

const VESSEL_LABELS: Record<string, string> = {
  traditional_canoe: "Traditional Canoe (<8 m)",
  motorized_gillnetter: "Motorized Gillnetter (8–14 m)",
  mechanized_trawler: "Mechanized Trawler (>14 m)",
  standard: "Standard Craft (10–12 m)",
};

export function TripEconomicsCard({
  lat,
  lon,
  defaultVesselClass,
  pfzZones = [],
  waveHeightM,
  windSpeedKmh,
}: {
  lat: number;
  lon: number;
  defaultVesselClass?: string | null;
  pfzZones?: PFZZone[];
  waveHeightM?: number | null;
  windSpeedKmh?: number | null;
}) {
  const [vesselOverride, setVesselOverride] = useState<string | null>(null);
  const vesselClass = vesselOverride ?? defaultVesselClass ?? "motorized_gillnetter";
  const [fuelPrice, setFuelPrice] = useState("95");
  const [distanceKm, setDistanceKm] = useState(
    pfzZones[0]?.distance_km ? String(Math.round(pfzZones[0].distance_km)) : "18",
  );
  const [result, setResult] = useState<TripEconomicsResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const price = Number(fuelPrice);
    const dist = Number(distanceKm);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(dist) || dist <= 0) {
      return;
    }
    calculateTripEconomics({
      origin_lat: lat,
      origin_lon: lon,
      vessel_class: vesselClass,
      fuel_price_inr: price,
      one_way_distance_km: dist,
      wave_height_m: waveHeightM ?? undefined,
      wind_speed_kmh: windSpeedKmh ?? undefined,
      pfz_zones: pfzZones.slice(0, 5).map((z) => ({
        id: z.id,
        landing_centre: z.landing_centre,
        latitude: z.latitude,
        longitude: z.longitude,
        distance_km: z.distance_km,
      })),
    })
      .then((res) => {
        if (!cancelled) {
          setError(false);
          setResult(res);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, vesselClass, fuelPrice, distanceKm, waveHeightM, windSpeedKmh, pfzZones]);

  return (
    <section
      aria-labelledby="trip-economics-heading"
      className="space-y-3 rounded-md border border-border bg-card p-4 text-card-foreground shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fuel className="size-4 text-secondary" aria-hidden />
          <h2 id="trip-economics-heading" className="text-sm font-semibold text-foreground">
            Trip &amp; Fuel ROI Planner (Estimate)
          </h2>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
          ORCA Heuristic
        </span>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-muted-foreground">Vessel Class</span>
          <select
            value={vesselClass}
            onChange={(e) => setVesselOverride(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2.5 text-xs"
          >
            {Object.entries(VESSEL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">One-way distance (km)</span>
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2.5 text-xs"
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Fuel Price (INR / L)</span>
          <input
            type="number"
            min={10}
            max={500}
            step={1}
            value={fuelPrice}
            onChange={(e) => setFuelPrice(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2.5 text-xs"
          />
        </label>
      </div>

      {error ? (
        <p className="text-xs text-muted-foreground">Trip estimator temporarily unavailable offline.</p>
      ) : result ? (
        <div className="space-y-2 text-xs">
          <dl className="grid gap-2 sm:grid-cols-4">
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Round Trip</dt>
              <dd className="mt-0.5 font-semibold">{result.round_trip_distance_km} km</dd>
            </div>
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Est. Steaming</dt>
              <dd className="mt-0.5 font-semibold">{result.estimated_transit_hours} hrs</dd>
            </div>
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Est. Fuel Cost</dt>
              <dd className="mt-0.5 font-semibold">
                {result.estimated_fuel_liters} L · ₹{result.estimated_fuel_cost_inr}
              </dd>
            </div>
            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <dt className="text-muted-foreground">PFZ Direct Savings (~35%)</dt>
              <dd className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                Save ~₹{result.pfz_guided_savings_vs_blind_search.estimated_saved_inr} (
                {result.pfz_guided_savings_vs_blind_search.estimated_saved_liters} L)
              </dd>
            </div>
          </dl>
          <p className="text-[11px] text-muted-foreground">{result.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
