import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { fetchLunarTideEstimate, type LunarTideEstimate } from "@/services/api";
import { MatsyaLoader } from "./MatsyaLoader";
import { useI18n } from "@/lib/orca/i18n";

export function LunarTideCard({ lat, lon }: { lat: number; lon: number }) {
  const { t } = useI18n();
  const [estimate, setEstimate] = useState<LunarTideEstimate | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLunarTideEstimate(lat, lon)
      .then((res) => {
        if (!cancelled) {
          setError(false);
          setEstimate(res);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return (
    <section
      aria-labelledby="lunar-tide-heading"
      className="space-y-2.5 rounded-md border border-border bg-card p-4 text-card-foreground shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="size-4 text-secondary" aria-hidden />
          <h2 id="lunar-tide-heading" className="text-sm font-semibold text-foreground">
            Astronomical Lunar Tide Window (Estimate)
          </h2>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          Astronomical Estimate · Not Gauge Clearance
        </span>
      </div>

      {error ? (
        <p className="text-xs text-muted-foreground">{t("chat.unavailable")}</p>
      ) : !estimate ? (
        <MatsyaLoader variant="compact" message={t("state.loading")} />
      ) : (
        <div className="space-y-2 text-xs">
          <dl className="grid gap-2 sm:grid-cols-3">
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Moon Phase</dt>
              <dd className="mt-0.5 font-semibold">
                {estimate.moon_phase} ({estimate.illumination_pct}%)
              </dd>
            </div>
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Tidal Regime</dt>
              <dd className="mt-0.5 font-semibold">
                {estimate.tidal_regime.replace("_", " ")}
              </dd>
            </div>
            <div className="rounded border border-border bg-background/60 p-2.5">
              <dt className="text-muted-foreground">Est. High / Low (IST)</dt>
              <dd className="mt-0.5 font-semibold">
                H: {estimate.estimated_high_tide_windows_ist.join(", ") || "—"} · L:{" "}
                {estimate.estimated_low_tide_windows_ist.join(", ") || "—"}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground">{estimate.regime_note}</p>
          <p className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-300">
            {estimate.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
