import { Link, useInRouterContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Compass,
  Crosshair,
  Layers,
  MapPin,
  Maximize2,
  Thermometer,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from "lucide-react";
import {
  announceProximityWarning,
  evaluateProximityAlert,
  playMaritimeAlarmTone,
} from "@/lib/orca/proximity-alarm";
import { askAssistantLabel } from "@/lib/brand";
import { mapPanelCopy, safetyCopy } from "@/lib/orca/ui-copy";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { mapCopy } from "@/lib/orca/map-copy";
import { compassLabel } from "@/lib/orca/map-data";
import {
  snapshotBundle,
  snapshotPFZ,
  useMarineSnapshot,
  type MarineSnapshot,
} from "@/lib/orca/snapshot";
import type { CursorReadout } from "./CoastMap";
import { MarineConditions } from "./Conditions";
import { SnapshotDetails } from "./SnapshotDetails";
import "./workspace.css";
import { useConnectivity } from "@/lib/orca/connectivity";
import {
  useOptionalEvidence,
  type SpeciesResult,
  type EarthResult,
} from "@/lib/orca/intelligence";

const CoastMap = lazy(() => import("./CoastMap"));

type Props = {
  center: Coords;
  interactive?: boolean;
  height?: number;
  onSelect?: (c: Coords) => void;
  snapshot?: MarineSnapshot;
  compact?: boolean;
  full?: boolean;
  /** False in the picker until a person explicitly chooses a location. */
  hasSelection?: boolean;
};

export function MapPanel({
  center,
  interactive = false,
  height = 240,
  onSelect,
  snapshot: provided,
  compact = false,
  full = false,
  hasSelection = true,
}: Props) {
  const { t, lang } = useI18n();
  const inRouter = useInRouterContext();
  const network = useConnectivity();
  const state = useMarineSnapshot();
  const { activate } = state;
  useEffect(() => {
    if (!onSelect && !provided) activate();
  }, [onSelect, provided, activate]);
  const s = provided ?? (onSelect ? undefined : state.snapshot);

  const [alarmArmed, setAlarmArmed] = useState(() => {
    try {
      return localStorage.getItem("orca.alarm.armed") === "true";
    } catch {
      return false;
    }
  });
  const [alarmNotice, setAlarmNotice] = useState("");
  const lastAlarmKeyRef = useRef("");
  const proximity = useMemo(() => evaluateProximityAlert(s), [s]);
  useEffect(() => {
    if (!alarmArmed || !proximity.triggered) return;
    const key = `${s?.snapshot_id ?? "none"}:${proximity.reason}`;
    if (lastAlarmKeyRef.current === key) return;
    lastAlarmKeyRef.current = key;
    playMaritimeAlarmTone();
    announceProximityWarning(proximity.reason, lang);
  }, [alarmArmed, proximity, s?.snapshot_id, lang]);

  const [preferredMode, setMode] = useState<"text" | "map" | "satellite">(() => {
    try {
      return !onSelect && localStorage.getItem("orca.map.mode") === "text"
        ? "text"
        : "map";
    } catch {
      return "map";
    }
  });
  const mode =
    network === "OFFLINE" && !onSelect
      ? "text"
      : network === "DEGRADED" && preferredMode === "satellite"
        ? "map"
        : preferredMode;

  const [vectors, setVectors] = useState(false),
    [showSpecies, setShowSpecies] = useState(false),
    [showEarth, setShowEarth] = useState(false);
  const optionalAllowed =
    !onSelect &&
    network !== "OFFLINE" &&
    network !== "DEGRADED" &&
    !s?.provenance.demo_scenario;
  const species = useOptionalEvidence<SpeciesResult>(
    "species",
    s?.snapshot_id,
    showSpecies && optionalAllowed,
  );
  const earth = useOptionalEvidence<EarthResult>(
    "earth-observation",
    s?.snapshot_id,
    showEarth && optionalAllowed,
  );

  const [pfz, setPFZ] = useState(true),
    [eez, setEEZ] = useState(true),
    [conditions, setConditions] = useState(false),
    [pin, setPin] = useState(true),
    [rangeRings, setRangeRings] = useState(true),
    [seamarks, setSeamarks] = useState(false);

  const seamarksAllowed =
    !onSelect && mode !== "text" && network !== "DEGRADED" && network !== "OFFLINE";
  const seamarksActive = seamarks && seamarksAllowed;
  const rangeRingsActive = rangeRings && !onSelect && !compact && hasSelection && pin;

  const displayGeometry = useQuery({
    queryKey: ["eez-display", s?.boundary.geometry_ref],
    enabled:
      !!s?.boundary.geometry_ref &&
      eez &&
      mode !== "text" &&
      network !== "OFFLINE",
    queryFn: async ({ signal }) => {
      const response = await apiFetch("/api/marine-boundaries/eez/display", {
        signal,
      });
      if (!response.ok) throw new Error("EEZ_UNAVAILABLE");
      return response.json() as Promise<GeoJSON.FeatureCollection>;
    },
    staleTime: 86400000,
    gcTime: 300000,
    retry: 1,
  });
  const geometry = s?.boundary.geometry ?? displayGeometry.data;

  const [layersOpen, setLayersOpen] = useState(false),
    [infoOpen, setInfoOpen] = useState(false),
    [recenter, setRecenter] = useState(0),
    [fitSignal, setFitSignal] = useState(0),
    [cursorInfo, setCursorInfo] = useState<CursorReadout | null>(null);

  const advisory = snapshotPFZ(s);
  const askLabel = askAssistantLabel(lang);
  const copy = { ...(mapPanelCopy[lang] ?? mapPanelCopy.en), ask: askLabel };
  const safety = safetyCopy[lang] ?? safetyCopy.en;
  const askHref = `/assistant?${s ? `snapshot=${encodeURIComponent(s.snapshot_id)}&` : ""}prompt=${encodeURIComponent(`${t("chat.s2")} (${center.lat}, ${center.lon})`)}`;
  const unavailable =
    lang === "en"
      ? "No current verified PFZ advisory"
      : mapCopy[lang][advisory.status];

  const networkLabel =
    network === "DEGRADED"
      ? copy.lowDataMode
      : network === "OFFLINE"
        ? copy.offlineSaved
        : network === "FULL"
          ? copy.fullConnection
          : copy.connected;

  const riskText =
    s?.risk.level === "low"
      ? safety.safeAssessed
      : s?.risk.level === "caution"
        ? t("status.caution")
        : s?.risk.level === "unsafe"
          ? t("status.dangerous")
          : safety.insufficientLive;

  const riskTone =
    s?.risk.level === "low"
      ? "low"
      : s?.risk.level === "caution"
        ? "caution"
        : s?.risk.level === "unsafe"
          ? "unsafe"
          : "unknown";

  const windDirDeg =
    typeof s?.weather.wind_direction_deg === "number"
      ? s.weather.wind_direction_deg
      : null;
  const windCardinal = windDirDeg != null ? compassLabel(windDirDeg) : "";
  const canFitLayers =
    !onSelect &&
    !compact &&
    mode !== "text" &&
    hasSelection &&
    (advisory.points.length > 0 || conditions || vectors);

  const details = () => (
    <>
      <div className="map-info-heading">
        <span className="map-eyebrow">{t("loc.current")}</span>
        {mode !== "text" && (
          <button
            className="workspace-icon"
            aria-label="Close location details"
            onClick={() => setInfoOpen(false)}
          >
            <X size={17} />
          </button>
        )}
      </div>
      <h2>
        {s?.location.name ||
          `${center.lat.toFixed(4)}°, ${center.lon.toFixed(4)}°`}
      </h2>
      <p className="map-coordinate">
        {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
      </p>
      {s ? (
        <>
          <div className="map-risk">
            <span>{t("marine.title")}</span>
            <strong>{riskText}</strong>
          </div>
          {mode === "text" ? (
            <MarineConditions
              data={snapshotBundle(s, state.offline).current}
              snapshot={s}
            />
          ) : (
            <>
              <div className="map-reading-grid">
                {[
                  [t("marine.wave"), s.weather.wave_height_m, "m"],
                  [t("marine.wind"), s.weather.wind_speed_kmh, "km/h"],
                  [t("marine.sst"), s.ocean.sst_c, "°C"],
                  [t("glossary.swell.full"), s.weather.swell_height_m, "m"],
                ].map(([label, value, unit]) => (
                  <div key={String(label)}>
                    <span>{label}</span>
                    <strong>
                      {typeof value === "number"
                        ? `${value.toFixed(1)} ${unit}`
                        : t("chat.unavailable")}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="map-reading-source">
                {s.provenance.source.join(" · ")}
              </p>
              <p className="map-reading-source">
                {t("state.updated")}:{" "}
                {Number.isFinite(Date.parse(s.provenance.retrieved_at))
                  ? new Date(s.provenance.retrieved_at).toLocaleString(lang)
                  : t("chat.unavailable")}
              </p>
            </>
          )}
          {!compact && (
            <SnapshotDetails
              snapshot={s}
              offline={provided ? undefined : state.offline}
            />
          )}
        </>
      ) : (
        <p role="status">
          {t(state.isError ? "chat.unavailable" : "state.loading")}
        </p>
      )}
      {inRouter ? (
        <Link to={askHref} className="map-ask">
          {copy.ask}
          <ArrowUpRight size={17} />
        </Link>
      ) : (
        <a href={askHref} className="map-ask">
          {copy.ask}
          <ArrowUpRight size={17} />
        </a>
      )}
    </>
  );

  return (
    <div
      className={`orca-workspace marine-map-panel ${full ? "full-map" : ""} ${compact ? "compact-map" : ""}`}
      data-snapshot-id={s?.snapshot_id}
      data-network-mode={network}
    >
      {s?.provenance.demo_scenario && (
        <div
          role="status"
          className="border-b border-amber-500 p-3 text-sm font-semibold"
        >
          Demo Scenario · Illustrative Dataset · Not live
        </div>
      )}
      <div className="map-toolbar">
        <span className="map-network-status" role="status">
          <i className={`map-net-dot map-net-${network.toLowerCase()}`} aria-hidden="true" />
          {networkLabel}
        </span>
        <div className="map-mode" role="group" aria-label={t("map.layers")}>
          {(["map", "satellite", "text"] as const)
            .filter((x) => !onSelect || x !== "text")
            .map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => {
                  setMode(x);
                  try {
                    localStorage.setItem("orca.map.mode", x);
                  } catch {
                    /* Optional preference. */
                  }
                }}
                aria-pressed={mode === x}
                disabled={
                  x === "satellite" &&
                  (network === "DEGRADED" || network === "OFFLINE")
                }
              >
                {mapCopy[lang][x]}
              </button>
            ))}
        </div>
        <div className="map-toolbar-actions">
          {!onSelect && !compact && (
            <button
              type="button"
              className="map-tool"
              aria-pressed={alarmArmed}
              onClick={() => {
                const next = !alarmArmed;
                setAlarmArmed(next);
                try {
                  localStorage.setItem("orca.alarm.armed", String(next));
                } catch {
                  /* optional preference */
                }
                if (next) {
                  playMaritimeAlarmTone();
                  if (proximity.triggered) {
                    announceProximityWarning(proximity.reason, lang);
                    setAlarmNotice("");
                  } else {
                    setAlarmNotice(
                      "Proximity audio guard armed (monitoring EEZ & critical hazards).",
                    );
                    window.setTimeout(() => setAlarmNotice(""), 3000);
                  }
                } else {
                  setAlarmNotice("");
                }
              }}
              title="Audio boundary and hazard proximity guard"
            >
              {alarmArmed ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {alarmArmed ? copy.guardOn : copy.guardOff}
            </button>
          )}
          {!onSelect && mode !== "text" && (
            <button
              type="button"
              className="map-tool"
              aria-expanded={layersOpen}
              onClick={() => {
                setLayersOpen(!layersOpen);
                if (!layersOpen) setInfoOpen(false);
              }}
            >
              <Layers size={16} />
              {t("map.layers")}
            </button>
          )}
          {canFitLayers && (
            <button
              type="button"
              className="workspace-icon"
              title={copy.fitLayers}
              aria-label={copy.fitLayers}
              onClick={() => setFitSignal((x) => x + 1)}
            >
              <Maximize2 size={16} />
            </button>
          )}
          {mode !== "text" && hasSelection && (
            <button
              type="button"
              className="workspace-icon"
              title={copy.recenter}
              aria-label={copy.recenter}
              onClick={() => setRecenter((x) => x + 1)}
            >
              <Crosshair size={19} />
            </button>
          )}
        </div>
      </div>

      {/* Rounded-rectangle live sea telemetry bar above the full map canvas */}
      {full && !onSelect && !compact && mode !== "text" && s && (
        <div className="map-telemetry-strip" aria-label={t("marine.title")}>
          <button
            type="button"
            className={`map-telemetry-card map-telemetry-risk map-risk-${riskTone}`}
            onClick={() => setInfoOpen(true)}
          >
            <span className="map-telemetry-dot" aria-hidden="true" />
            <span className="map-telemetry-text">
              <small>{t("marine.title")}</small>
              <strong>{riskText}</strong>
            </span>
          </button>

          <button
            type="button"
            className="map-telemetry-card"
            onClick={() => setInfoOpen(true)}
          >
            <Waves size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <span className="map-telemetry-text">
              <small>{t("marine.wave")}</small>
              <strong>
                {typeof s.weather.wave_height_m === "number"
                  ? `${s.weather.wave_height_m.toFixed(1)} m`
                  : "—"}
              </strong>
            </span>
          </button>

          <button
            type="button"
            className="map-telemetry-card"
            onClick={() => setInfoOpen(true)}
          >
            <Wind size={15} className="text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
            <span className="map-telemetry-text">
              <small>{t("marine.wind")}</small>
              <strong>
                {typeof s.weather.wind_speed_kmh === "number"
                  ? `${s.weather.wind_speed_kmh.toFixed(0)} km/h${windCardinal ? ` · ${windCardinal}` : ""}`
                  : "—"}
              </strong>
            </span>
          </button>

          <button
            type="button"
            className="map-telemetry-card"
            onClick={() => setInfoOpen(true)}
          >
            <Thermometer size={15} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span className="map-telemetry-text">
              <small>{t("marine.sst")}</small>
              <strong>
                {typeof s.ocean.sst_c === "number"
                  ? `${s.ocean.sst_c.toFixed(1)} °C`
                  : "—"}
              </strong>
            </span>
          </button>

          {s.boundary.availability === "available" && s.boundary.eez && (
            <button
              type="button"
              className="map-telemetry-card"
              onClick={() => setInfoOpen(true)}
            >
              <Compass size={15} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span className="map-telemetry-text">
                <small>EEZ · VLIZ</small>
                <strong>
                  {s.boundary.eez.inside ? copy.eezInside : copy.eezOutside}
                </strong>
              </span>
            </button>
          )}
        </div>
      )}

      {alarmArmed && proximity.triggered && !onSelect && !compact && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"
        >
          <AlertTriangle size={15} className="shrink-0" aria-hidden />
          <span>{proximity.reason}</span>
        </div>
      )}
      {alarmNotice && !onSelect && !compact && (
        <p
          role="status"
          className="border-b border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs"
        >
          {alarmNotice}
        </p>
      )}
      {mode !== "text" ? (
        <div
          className="map-canvas"
          style={{ "--map-height": `${height}px` } as React.CSSProperties}
        >
          <Suspense
            fallback={
              <div className="map-loading" style={{ height }}>
                {t("state.loading")}
              </div>
            }
          >
            <CoastMap
              center={center}
              interactive={interactive}
              height={height}
              onSelect={onSelect}
              onInspect={!onSelect ? () => setInfoOpen(true) : undefined}
              onCursorMove={
                full && !onSelect && !compact ? setCursorInfo : undefined
              }
              satellite={mode === "satellite"}
              snapshot={s}
              boundaryGeometry={geometry}
              showPFZ={pfz}
              showEEZ={eez}
              showConditions={conditions}
              showLocation={pin && hasSelection}
              showRangeRings={rangeRingsActive}
              showSeamarks={seamarksActive}
              zoom={onSelect ? (hasSelection ? 8 : 4) : undefined}
              recenter={recenter}
              fitSignal={fitSignal}
              showVectors={vectors}
              species={
                showSpecies && optionalAllowed ? species.data : undefined
              }
              earth={showEarth && optionalAllowed ? earth.data : undefined}
            />
          </Suspense>
          {!onSelect && (
            <>
              <button
                type="button"
                className="map-location-chip"
                onClick={() => {
                  setInfoOpen(!infoOpen);
                  if (!infoOpen) setLayersOpen(false);
                }}
                aria-expanded={infoOpen}
              >
                <MapPin size={15} />
                {s?.location.name || t("map.yourPin")}
                <span>
                  {center.lat.toFixed(2)}, {center.lon.toFixed(2)}
                </span>
              </button>

              {full && !compact && !layersOpen && !infoOpen && (
                <div className="map-compass-badge" aria-hidden="true">
                  <Compass size={14} />
                  <span>N</span>
                </div>
              )}

              {layersOpen && (
                <section
                  className="map-layer-panel"
                  aria-label={t("map.layers")}
                >
                  <header>
                    <strong>{t("map.layers")}</strong>
                    <button
                      type="button"
                      className="workspace-icon"
                      aria-label="Close layers"
                      onClick={() => setLayersOpen(false)}
                    >
                      <X size={17} />
                    </button>
                  </header>
                  <p className="map-layer-group-title">{copy.groupNav}</p>
                  <label>
                    <span>
                      <i className="legend-dot pin" />
                      {t("map.yourPin")}
                    </span>
                    <input
                      type="checkbox"
                      checked={pin}
                      onChange={(e) => setPin(e.target.checked)}
                    />
                  </label>
                  {!compact && (
                    <label>
                      <span>
                        <i className="legend-ring" />
                        {copy.rangeRings}
                      </span>
                      <input
                        type="checkbox"
                        checked={rangeRings}
                        disabled={!pin}
                        onChange={(e) => setRangeRings(e.target.checked)}
                      />
                    </label>
                  )}
                  <label>
                    <span>
                      <i className="legend-pfz-pill" />
                      {s?.provenance.demo_scenario ? "Demo PFZ" : "PFZ"}
                    </span>
                    <input
                      type="checkbox"
                      checked={pfz && advisory.points.length > 0}
                      disabled={!advisory.points.length}
                      onChange={(e) => setPFZ(e.target.checked)}
                    />
                  </label>
                  {!advisory.points.length && <p>{unavailable}</p>}
                  {advisory.points.length > 0 && (
                    <p>
                      Point halos are symbols, not distance or confidence
                      boundaries. Only supplied advisory geometry is drawn to
                      scale.
                    </p>
                  )}
                  <label>
                    <span>
                      <i className="legend-line" />
                      EEZ · VLIZ
                    </span>
                    <input
                      type="checkbox"
                      checked={
                        eez &&
                        !!(s?.boundary.geometry || s?.boundary.geometry_ref)
                      }
                      disabled={
                        !(s?.boundary.geometry || s?.boundary.geometry_ref)
                      }
                      onChange={(e) => setEEZ(e.target.checked)}
                    />
                  </label>
                  {(!(s?.boundary.geometry || s?.boundary.geometry_ref) ||
                    displayGeometry.isError) && (
                    <p role="status">EEZ: {t("chat.unavailable")}</p>
                  )}
                  <label>
                    <span>
                      <i className="legend-seamark" />
                      {copy.seamarks}
                    </span>
                    <input
                      type="checkbox"
                      checked={seamarksActive}
                      disabled={!seamarksAllowed}
                      onChange={(e) => setSeamarks(e.target.checked)}
                    />
                  </label>
                  <details>
                    <summary>{copy.advanced}</summary>
                    <label>
                      <span>
                        <i className="legend-arrow" aria-hidden="true">
                          ↗
                        </i>
                        {copy.vectors}
                      </span>
                      <input
                        type="checkbox"
                        checked={vectors}
                        onChange={(e) => setVectors(e.target.checked)}
                      />
                    </label>
                    <label>
                      <span>
                        <i className="legend-rect" />
                        {copy.grid}
                      </span>
                      <input
                        type="checkbox"
                        checked={conditions}
                        onChange={(e) => setConditions(e.target.checked)}
                      />
                    </label>
                    <p>
                      MPA / restricted areas: unavailable without verified
                      geometry.
                    </p>
                    <p>
                      Hazards: {s?.hazards.length || 0} snapshot alerts. No
                      affected-area geometry supplied.
                    </p>
                    <p>
                      Species evidence classes: official advisory, habitat
                      suitability model, and historical occurrence. Official
                      species advisories and a validated suitability model are
                      not available here.
                    </p>
                    <label>
                      <span>
                        <i className="legend-diamond" />
                        Historical species · OBIS
                      </span>
                      <input
                        type="checkbox"
                        checked={showSpecies}
                        disabled={!optionalAllowed || !s}
                        onChange={(e) => setShowSpecies(e.target.checked)}
                      />
                    </label>
                    {showSpecies && (
                      <div role="status">
                        <p>
                          {species.isPending
                            ? "Loading historical records…"
                            : species.isError
                              ? "Historical records unavailable"
                              : `OBIS: ${species.data?.status}`}
                        </p>
                        {species.data && (
                          <>
                            <p>{species.data.disclaimer}</p>
                            <p>
                              Retrieved {species.data.retrieved_at} ·{" "}
                              {species.data.cache_status}
                            </p>
                            {species.data.evidence.slice(0, 8).map((item) => (
                              <p key={item.scientific_name}>
                                <strong>{item.scientific_name}</strong>
                                <br />
                                {item.occurrence_count} records in returned
                                sample · latest{" "}
                                {item.data_period.latest_in_sample ||
                                  "Unavailable"}
                                <br />
                                Historical occurrence
                              </p>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    <label>
                      <span>
                        <i className="legend-rain" />
                        Flood context · Experimental
                      </span>
                      <input
                        type="checkbox"
                        checked={showEarth}
                        disabled={!optionalAllowed || !s}
                        onChange={(e) => setShowEarth(e.target.checked)}
                      />
                    </label>
                    {showEarth && (
                      <div role="status">
                        <p>
                          {earth.isPending
                            ? "Loading Earth Engine context…"
                            : earth.isError
                              ? "Earth Engine unavailable"
                              : `Earth Engine: ${earth.data?.status}`}
                        </p>
                        {earth.data && (
                          <>
                            <p>{earth.data.limitations}</p>
                            <p>
                              Rainfall observation:{" "}
                              {earth.data.observation_period?.start ||
                                "Unavailable"}{" "}
                              · age at retrieval{" "}
                              {earth.data.observation_age_hours ??
                                "Unavailable"}{" "}
                              hours
                            </p>
                            <p>
                              Retrieved {earth.data.retrieved_at} ·{" "}
                              {earth.data.cache_status}
                            </p>
                            <p>
                              Analysis cells: rainfall rate, mm/h. Pale: 0;
                              blue: 10 or more. Not flood extent.
                            </p>
                            {earth.data.datasets.map((dataset) => (
                              <p key={dataset.dataset_id}>
                                <a
                                  href={dataset.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {dataset.organization}
                                </a>
                                <br />
                                {dataset.spatial_resolution} ·{" "}
                                {dataset.temporal_resolution}
                              </p>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    {!optionalAllowed && (
                      <p>
                        Optional online layers pause in low-data and offline
                        modes.
                      </p>
                    )}
                  </details>
                </section>
              )}

              {!compact && (
                <div className="map-legend" aria-label={t("map.legend")}>
                  {pin && (
                    <span>
                      <i className="legend-dot pin" />
                      {t("map.yourPin")}
                    </span>
                  )}
                  {rangeRingsActive && (
                    <span>
                      <i className="legend-ring" />
                      5/10/20 NM
                    </span>
                  )}
                  {advisory.points.length > 0 && pfz && (
                    <span>
                      <i className="legend-pfz-pill" />
                      {s?.provenance.demo_scenario ? "Demo PFZ" : "PFZ"}
                    </span>
                  )}
                  {geometry && eez && (
                    <span>
                      <i className="legend-line" />
                      EEZ · VLIZ
                    </span>
                  )}
                  {seamarksActive && (
                    <span>
                      <i className="legend-seamark" />
                      {copy.seamarks}
                    </span>
                  )}
                  {conditions && (
                    <span>
                      <i className="legend-rect" />
                      {copy.grid}
                    </span>
                  )}
                  {vectors && (
                    <span>
                      <i className="legend-arrow" aria-hidden="true">
                        ↗
                      </i>
                      {copy.vectors}
                    </span>
                  )}
                  {showSpecies &&
                    optionalAllowed &&
                    species.data?.status === "available" && (
                      <span>
                        <i className="legend-diamond" />
                        {copy.speciesShort}
                      </span>
                    )}
                  {showEarth &&
                    optionalAllowed &&
                    earth.data?.status === "available" && (
                      <span>
                        <i className="legend-rain" />
                        {copy.rainfallShort}
                      </span>
                    )}
                </div>
              )}

              {!compact && (
                <button
                  type="button"
                  className="map-details-toggle"
                  onClick={() => {
                    setInfoOpen(!infoOpen);
                    if (!infoOpen) setLayersOpen(false);
                  }}
                  aria-expanded={infoOpen}
                >
                  <Waves size={17} />
                  {copy.details}
                </button>
              )}

              {full && !compact && cursorInfo && (
                <div className="map-cursor-readout" aria-live="off">
                  <span>
                    {cursorInfo.lat.toFixed(3)}°, {cursorInfo.lon.toFixed(3)}°
                  </span>
                  <strong>
                    {cursorInfo.distanceKm.toFixed(1)} km ({cursorInfo.distanceNm.toFixed(1)} NM) ·{" "}
                    {cursorInfo.bearingDeg.toFixed(0)}° {cursorInfo.cardinal}
                  </strong>
                </div>
              )}

              {infoOpen && !compact && (
                <section className="map-info-panel" aria-label={copy.details}>
                  {details()}
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="map-text-view">
          <p className="map-text-intro">{copy.noTiles}</p>
          {details()}
          {advisory.points.length > 0 && (
            <ul>
              {advisory.points.map((p) => (
                <li key={p.id}>
                  {p.name}: {p.lat}, {p.lon} · {p.distanceKm ?? "—"} km
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!onSelect && (
        <div className="map-status-strip">
          <span role="status">
            {advisory.status === "current"
              ? `${t("glossary.pfz.full")}: ${advisory.points.length}`
              : unavailable}
          </span>
          {mode === "satellite" && <span>{copy.reference}</span>}
        </div>
      )}
      {s && !compact && !full && mode !== "text" && (
        <SnapshotDetails snapshot={s} offline={state.offline} />
      )}
    </div>
  );
}
