import {
  CloudSun, Eye, Gauge, Thermometer, Waves, Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import { useI18n } from "@/lib/orca/i18n";
import { compassDirection, describeWeather } from "@/lib/orca/marine";
import type { ForecastPoint, MarineSnapshot } from "@/lib/orca/types";
import { SafetyPill } from "./SafetyStatus";

function Metric({
  Icon, label, value,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-md border border-border bg-card p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}

const num = (v: number | null, unit: string, digits = 1) =>
  v == null ? "\u2014" : `${v.toFixed(digits)} ${unit}`;

export function MarineConditions({ data }: { data: MarineSnapshot }) {
  const { t } = useI18n();
  const mins = Math.max(0, Math.round((Date.now() - data.fetchedAt) / 60000));

  return (
    <section aria-labelledby="marine-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="marine-heading" className="text-base font-semibold">
          {t("marine.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("state.live")} · {t("state.updated")} {mins} {t("state.minsAgo")} · {t("state.source")}:{" "}
          {data.sources.join(", ")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <Metric Icon={Waves} label={t("marine.wave")} value={num(data.waveHeightM, "m")} />
        <Metric
          Icon={Wind}
          label={t("marine.wind")}
          value={
            data.windSpeedKmh == null
              ? "\u2014"
              : `${Math.round(data.windSpeedKmh)} km/h ${compassDirection(data.windDirectionDeg)}`
          }
        />
        <Metric Icon={Eye} label={t("marine.visibility")} value={num(data.visibilityKm, "km")} />
        <Metric Icon={Thermometer} label={t("marine.sst")} value={num(data.seaTemperatureC, "\u00b0C")} />
        <Metric Icon={Gauge} label={t("marine.period")} value={num(data.wavePeriodS, "s", 0)} />
        <Metric Icon={CloudSun} label={t("marine.weather")} value={describeWeather(data.weatherCode)} />
      </div>
    </section>
  );
}

export function ForecastTimeline({ points }: { points: ForecastPoint[] }) {
  const { t } = useI18n();
  if (!points.length) return null;

  return (
    <section aria-labelledby="forecast-heading" className="space-y-3">
      <h2 id="forecast-heading" className="text-base font-semibold">
        {t("forecast.title")}
      </h2>
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1">
        {points.map((p, i) => (
          <li
            key={p.time}
            className="w-28 shrink-0 snap-start rounded-md border border-border bg-card p-2.5"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {i === 0
                ? t("forecast.now")
                : new Date(p.time).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {p.waveHeightM == null ? "\u2014" : `${p.waveHeightM.toFixed(1)} m`}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.windSpeedKmh == null ? "\u2014" : `${Math.round(p.windSpeedKmh)} km/h`}
            </p>
            <div className="mt-1.5">
              <SafetyPill level={p.level} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
