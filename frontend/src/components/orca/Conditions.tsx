import {
  Clock, CloudSun, Eye, Gauge, Thermometer, Waves, Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import { metricInfo } from "@/lib/orca/metric-info";
import { useI18n } from "@/lib/orca/i18n";
import { compassDirection, describeWeather } from "@/lib/orca/marine";
import type { ForecastPoint, MarineSnapshot, MarineTide } from "@/lib/orca/types";
import { marineCopy } from "@/lib/orca/marine-copy";
import { SafetyPill } from "./SafetyStatus";
import type { MarineSnapshot as CanonicalSnapshot, FieldSource } from "@/lib/orca/snapshot";

function Metric({
  Icon, label, value, provenance, info,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  info?: string;
  provenance?: FieldSource | Array<FieldSource | undefined>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open,setOpen] = useState(false);
  useEffect(()=>{if(open) dialog.current?.showModal();},[open]);
  const sources = (Array.isArray(provenance) ? provenance : [provenance]).filter((source): source is FieldSource => !!source);
  return <div className="min-w-0 rounded-md border border-border bg-card p-3 shadow-xs text-xs">
    <div className="flex items-center justify-between gap-2">
      <span><Icon className="inline size-4 mr-2 text-secondary"/>{label}</span>
      <button aria-label={`About ${label}`} onClick={()=>setOpen(true)} className="min-h-9 min-w-9 rounded-full border text-sm">ⓘ</button>
    </div>
    <strong className="mt-1 block text-base">{value}</strong>
    <p className="mt-1 text-muted-foreground">{sources.some(s=>s.cache_status === "simulated") ? "Illustrative Dataset" : "Forecast"} · {[...new Set(sources.map(source=>source.source))].join(" · ") || "Source unavailable"}</p>
    {open && <dialog ref={dialog} onClose={()=>setOpen(false)} className="m-auto max-h-[85dvh] w-[min(92vw,28rem)] overflow-y-auto rounded-xl border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60">
      <div className="flex items-start justify-between gap-4"><h3 className="text-lg font-semibold">{label}</h3><button className="min-h-10 min-w-10 rounded border" aria-label="Close information" onClick={()=>dialog.current?.close()}>×</button></div>
      <p className="my-3 text-sm">{info ? metricInfo[info] : "This value is supplied with the snapshot. Missing measurements are shown as a dash."}</p>
      <p className="font-semibold">{value}</p>
      {sources.map((source,index)=><div key={source.parameter || index} className="mt-3 border-t pt-3 text-xs">
        <p>{source.source}</p><p>Valid: {source.forecast_valid_at || "Not available"}</p>
        <p>Retrieved: {source.retrieved_at || "Not available"} · {source.cache_status}</p>
      </div>)}
      <p className="mt-3 text-xs text-muted-foreground">Educational information; check official advisories before departure.</p>
    </dialog>}
  </div>;
}

const num = (v: number | null | undefined, unit: string, _digits = 1) =>
  v == null || !Number.isFinite(v) ? "\u2014" : `${v} ${unit}`;

function tideTime(time: string | null, height: number | null) {
  if (!time) return "\u2014";
  return height == null ? time : `${time} · ${height.toFixed(1)} m`;
}

export function MarineConditions({ data, tide = null, snapshot }: { data: MarineSnapshot; tide?: MarineTide | null; snapshot?: CanonicalSnapshot }) {
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
          {data.sources.join(", ") || t("chat.unavailable")}
        </p>
      </div>
      {data.measurementKind === "model_forecast" && !snapshot?.provenance.demo_scenario && <div className="rounded-md border p-3 text-xs space-y-2">
        <p className="font-medium">{copy.model} · {data.sources.join(", ")}</p>
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
      {snapshot?.provenance.demo_scenario && <p className="font-semibold text-amber-600">Demo Scenario · Illustrative Dataset · Not live</p>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <Metric Icon={Waves} info="wave_height_m" label={t("marine.wave")} value={num(data.waveHeightM, "m")} provenance={snapshot?.provenance.fields["weather.wave_height_m"]}/>
        <Metric
          Icon={Wind}
          provenance={[snapshot?.provenance.fields["weather.wind_speed_kmh"],snapshot?.provenance.fields["weather.wind_direction_deg"]]}
          info="wind_speed_kmh" label={t("marine.wind")}
          value={
            data.windSpeedKmh == null
              ? "\u2014"
              : `${data.windSpeedKmh} km/h ${compassDirection(data.windDirectionDeg, lang)}`
          }
        />
        <Metric Icon={Wind} info="wind_direction_deg" label={t("marine.windDir")} value={num(data.windDirectionDeg, "°")} provenance={snapshot?.provenance.fields["weather.wind_direction_deg"]}/>
        {data.visibilityKm != null && <Metric Icon={Eye} label={t("marine.visibility")} value={num(data.visibilityKm, "km")} provenance={snapshot?.provenance.fields["weather.visibility_km"]}/>}
        <Metric Icon={Thermometer} info="sst_c" label={t("marine.sst")} value={num(data.seaTemperatureC, "\u00b0C")} provenance={snapshot?.provenance.fields["ocean.sst_c"]}/>
        <Metric Icon={Gauge} info="wave_period_s" label={t("marine.period")} value={num(data.wavePeriodS, "s", 0)} provenance={snapshot?.provenance.fields["weather.wave_period_s"]}/>
        <Metric Icon={Waves} info="wave_direction_deg" label={copy.waveDirection} value={num(data.waveDirectionDeg, "°", 0)} provenance={snapshot?.provenance.fields["weather.wave_direction_deg"]}/>
        <Metric Icon={Waves} label={copy.windWave} value={`${num(data.windWaveHeightM, "m")} · ${num(data.windWavePeriodS, "s")} · ${num(data.windWaveDirectionDeg, "°", 0)}`} provenance={["wind_wave_height_m","wind_wave_period_s","wind_wave_direction_deg"].map(key=>snapshot?.provenance.fields[`weather.${key}`])}/>
        <Metric Icon={Waves} info="swell_height_m" label={copy.swell} value={`${num(data.swellWaveHeightM, "m")} · ${num(data.swellWavePeriodS, "s")} · ${num(data.swellWaveDirectionDeg, "°", 0)}`} provenance={["swell_height_m","swell_period_s","swell_direction_deg"].map(key=>snapshot?.provenance.fields[`weather.${key}`])}/>
        <Metric Icon={Gauge} info="current_speed" label={copy.current} value={`${num(data.oceanCurrentSpeedKmh, "km/h")} · ${num(data.oceanCurrentDirectionDeg, "°", 0)}`} provenance={["current_speed","current_direction"].map(key=>snapshot?.provenance.fields[`weather.${key}`])}/>
        <Metric Icon={CloudSun} label={t("marine.weather")} value={describeWeather(data.weatherCode, lang)} provenance={snapshot?.provenance.fields["weather.weather_code"]}/>

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
