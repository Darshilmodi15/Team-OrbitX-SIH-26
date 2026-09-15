import {
  Clock, CloudSun, Eye, Gauge, Thermometer, Waves, Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { useI18n } from "@/lib/orca/i18n";
import { compassDirection, describeWeather } from "@/lib/orca/marine";
import type { ForecastPoint, MarineSnapshot, MarineTide } from "@/lib/orca/types";
import { marineCopy } from "@/lib/orca/marine-copy";
import { SafetyPill } from "./SafetyStatus";

function Metric({
  Icon, label, value,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-md border border-border bg-card p-3 shadow-xs">
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
      <div className="min-w-0">
        <p className="break-words text-xs font-medium text-muted-foreground">{label}</p>
        <p className="break-words text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

const num = (v: number | null | undefined, unit: string, digits = 1) =>
  v == null || !Number.isFinite(v) ? "\u2014" : `${v.toFixed(digits)} ${unit}`;

function tideTime(time: string | null, height: number | null) {
  if (!time) return "\u2014";
  return height == null ? time : `${time} · ${height.toFixed(1)} m`;
}

export function MarineConditions({ data, tide = null }: { data: MarineSnapshot; tide?: MarineTide | null }) {
  const { lang, t } = useI18n();
  const copy = marineCopy[lang] ?? marineCopy.en;
  const stamp = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(lang, { timeZoneName: "short" }) : "—";
  const mode = data.dataMode === "unavailable" ? "unavailable" : Date.now() - Date.parse(data.time) > 3 * 3600000 ? "stale" : data.dataMode;
  const updatedAt = useMemo(
    () => data.fetchedAt != null && Number.isFinite(data.fetchedAt) ? new Date(data.fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—",
    [data.fetchedAt],
  );

  return (
    <section aria-labelledby="marine-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="marine-heading" className="text-base font-semibold text-foreground">
          {t("marine.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(mode === "stale" ? "health.stale" : mode === "cached" ? "health.cached" : mode === "fallback" ? "health.fallback" : (mode === "fresh" || mode === "live") ? "state.live" : "chat.unavailable")} · {t("state.updated")} {updatedAt} · {t("state.source")}:{" "}
          {data.sources.join(", ")}
        </p>
      </div>
      {data.measurementKind === "model_forecast" && <div className="rounded-md border p-3 text-xs space-y-2">
        <p className="font-medium">{copy.model} · <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo</a> · <a href="https://www.dwd.de/EN/Home/home_node.html" target="_blank" rel="noopener noreferrer" className="underline">DWD</a> · <a href="https://marine.copernicus.eu/" target="_blank" rel="noopener noreferrer" className="underline">Copernicus Marine</a></p>
        <p>{copy.notice}</p>
        <dl className="grid gap-2 sm:grid-cols-3">
          <div><dt className="text-muted-foreground">{copy.marineTime}</dt><dd>{stamp(data.marineForecastValidAt)}</dd></div>
          <div><dt className="text-muted-foreground">{copy.weatherTime}</dt><dd>{stamp(data.weatherForecastValidAt)}</dd></div>
          <div><dt className="text-muted-foreground">{copy.grid}</dt><dd>{data.sampledMarineCoords ? `${data.sampledMarineCoords.lat.toFixed(4)}, ${data.sampledMarineCoords.lon.toFixed(4)}` : "—"}</dd></div>
        </dl>
      </div>}
      {data.supplementalFields && Object.keys(data.supplementalFields).length > 0 && <details className="rounded-md border p-3 text-xs space-y-2">
        <summary>{t("state.source")}: INCOIS + Open-Meteo Marine</summary>
        <p>{copy.notice}</p>
        <p><a href="https://open-meteo.com/en/docs/marine-weather-api" className="underline">Open-Meteo</a> · DWD · Copernicus Marine</p>
        <ul className="space-y-2">{Object.entries(data.supplementalFields).map(([field, info]) => <li key={field}>
          {field.replaceAll("_", " ")}: {info.source} · {copy.marineTime}: {stamp(info.forecast_valid_at)} · {t("state.updated")}: {stamp(info.retrieved_at)} · {info.cache_status} · {copy.grid}: {info.grid_lat ?? "—"}, {info.grid_lon ?? "—"}
        </li>)}</ul>
      </details>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <Metric Icon={Waves} label={t("marine.wave")} value={num(data.waveHeightM, "m")} />
        <Metric
          Icon={Wind}
          label={t("marine.wind")}
          value={
            data.windSpeedKmh == null
              ? "\u2014"
              : `${Math.round(data.windSpeedKmh)} km/h ${compassDirection(data.windDirectionDeg, lang)}`
          }
        />
        <Metric Icon={Eye} label={t("marine.visibility")} value={num(data.visibilityKm, "km")} />
        <Metric Icon={Thermometer} label={t("marine.sst")} value={num(data.seaTemperatureC, "\u00b0C")} />
        <Metric Icon={Gauge} label={t("marine.period")} value={num(data.wavePeriodS, "s", 0)} />
        <Metric Icon={Waves} label={copy.waveDirection} value={num(data.waveDirectionDeg, "°", 0)} />
        <Metric Icon={Waves} label={copy.windWave} value={`${num(data.windWaveHeightM, "m")} · ${num(data.windWavePeriodS, "s")} · ${num(data.windWaveDirectionDeg, "°", 0)}`} />
        <Metric Icon={Waves} label={copy.swell} value={`${num(data.swellWaveHeightM, "m")} · ${num(data.swellWavePeriodS, "s")} · ${num(data.swellWaveDirectionDeg, "°", 0)}`} />
        <Metric Icon={Gauge} label={copy.current} value={`${num(data.oceanCurrentSpeedKmh, "km/h")} · ${num(data.oceanCurrentDirectionDeg, "°", 0)}`} />
        <Metric Icon={CloudSun} label={t("marine.weather")} value={describeWeather(data.weatherCode, lang)} />
        {tide && (
          <>
            <Metric Icon={Clock} label={t("marine.highTide")} value={tideTime(tide.highTideTime, tide.highTideHeightM)} />
            <Metric Icon={Clock} label={t("marine.lowTide")} value={tideTime(tide.lowTideTime, tide.lowTideHeightM)} />
            <Metric Icon={Waves} label={t("marine.tideRange")} value={num(tide.tidalRangeM, "m")} />
            <Metric Icon={Gauge} label={t("marine.tidePhase")} value={tide.tidalPhase} />
          </>
        )}
      </div>
    </section>
  );
}

export function ForecastTimeline({ points }: { points: ForecastPoint[] }) {
  const { t } = useI18n();
  if (!points.length) return null;

  return (
    <section aria-labelledby="forecast-heading" className="space-y-3">
      <h2 id="forecast-heading" className="text-base font-semibold text-foreground">
        {t("forecast.title")}
      </h2>
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1">
        {points.map((p, i) => (
          <li
            key={p.time}
            className="w-28 shrink-0 snap-start rounded-md border border-border bg-card p-2.5 shadow-xs"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {i === 0
                ? t("forecast.now")
                : new Date(p.time).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
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
