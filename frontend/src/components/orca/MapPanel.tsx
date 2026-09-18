import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Crosshair,
  Layers,
  MapPin,
  Waves,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { mapCopy } from "@/lib/orca/map-copy";
import {
  snapshotBundle,
  snapshotPFZ,
  useMarineSnapshot,
  type MarineSnapshot,
} from "@/lib/orca/snapshot";
import { MarineConditions } from "./Conditions";
import { SnapshotDetails } from "./SnapshotDetails";
import "./workspace.css";
import { useConnectivity } from "@/lib/orca/connectivity";
import { useOptionalEvidence, type SpeciesResult, type EarthResult } from "@/lib/orca/intelligence";
const CoastMap = lazy(() => import("./CoastMap"));
type Props = {
  center: Coords;
  interactive?: boolean;
  height?: number;
  onSelect?: (c: Coords) => void;
  snapshot?: MarineSnapshot;
  compact?: boolean;
  full?: boolean;
};
export function MapPanel({
  center,
  interactive = false,
  height = 240,
  onSelect,
  snapshot: provided,
  compact = false,
  full = false,
}: Props) {
  const { t, lang } = useI18n();
  const network = useConnectivity();
  const state = useMarineSnapshot();
  useEffect(() => {
    if (!onSelect && !provided) state.activate();
  }, [onSelect, provided, state.activate]);
  const s = provided ?? (onSelect ? undefined : state.snapshot);
  const [preferredMode, setMode] = useState<"text" | "map" | "satellite">(() => {
    try {
      return !onSelect && localStorage.getItem("orca.map.mode") === "text"
        ? "text"
        : "map";
    } catch {
      return "map";
    }
  });
  const mode = network === "OFFLINE" && !onSelect ? "text" : network === "DEGRADED" && preferredMode === "satellite" ? "map" : preferredMode;
  const [vectors, setVectors] = useState(false), [showSpecies, setShowSpecies] = useState(false), [showEarth, setShowEarth] = useState(false);
  const optionalAllowed = !onSelect && network !== "OFFLINE" && network !== "DEGRADED";
  const species = useOptionalEvidence<SpeciesResult>("species", s?.snapshot_id, showSpecies && optionalAllowed);
  const earth = useOptionalEvidence<EarthResult>("earth-observation", s?.snapshot_id, showEarth && optionalAllowed);
  const [pfz, setPFZ] = useState(true),
    [eez, setEEZ] = useState(true),
    [conditions, setConditions] = useState(false),
    [pin, setPin] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false),
    [infoOpen, setInfoOpen] = useState(false),
    [recenter, setRecenter] = useState(0);
  const advisory = snapshotPFZ(s);
  const copy =
    lang === "gu"
      ? {
          grid: "મોડેલના નમૂના બિંદુઓ",
          details: "સ્થાનની વિગતો",
          ask: "ORCA ને પૂછો",
          reference: "ઉપગ્રહ આધાર નકશો · જીવંત માપન નથી",
          noTiles: "ઓછા ડેટા માટે લખાણ દૃશ્ય",
          advanced: "અદ્યતન",
          recenter: "પસંદ કરેલું સ્થાન બતાવો",
        }
      : lang === "hi"
        ? {
            grid: "मॉडल नमूना बिंदु",
            details: "स्थान का विवरण",
            ask: "ORCA से पूछें",
            reference: "उपग्रह आधार मानचित्र · लाइव माप नहीं",
            noTiles: "कम डेटा के लिए पाठ दृश्य",
            advanced: "उन्नत",
            recenter: "चुना हुआ स्थान दिखाएँ",
          }
        : {
            grid: "Model sample points",
            details: "Location details",
            ask: "Ask ORCA",
            reference:
              "Satellite basemap · reference imagery, not live measurements",
            noTiles: "A lighter view. No map tiles are loaded.",
            advanced: "Advanced",
            recenter: "Recenter on selected location",
          };
  const askHref = `/assistant?${s ? `snapshot=${encodeURIComponent(s.snapshot_id)}&` : ""}prompt=${encodeURIComponent(`${t("chat.s2")} (${center.lat}, ${center.lon})`)}`;
  const unavailable =
    lang === "en"
      ? "Current verified PFZ advisory unavailable"
      : mapCopy[lang][advisory.status];
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
            <strong>{s.risk.level}</strong>
          </div>
          {mode === "text" ? (
            <MarineConditions data={snapshotBundle(s, state.offline).current} snapshot={s} />
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
                {new Date(s.provenance.retrieved_at).toLocaleString(lang)}
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
      <a href={askHref} className="map-ask">
        {copy.ask}
        <ArrowUpRight size={17} />
      </a>
    </>
  );
  return (
    <div
      className={`orca-workspace marine-map-panel ${full ? "full-map" : ""} ${compact ? "compact-map" : ""}`}
      data-snapshot-id={s?.snapshot_id}
      data-network-mode={network}
    >
      <div className="map-toolbar">
        <span className="map-network-status" role="status">{network === "DEGRADED" ? "Low-data mode" : network === "OFFLINE" ? "Offline · saved information" : network === "FULL" ? "Full connection" : "Connected"}</span>
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
                disabled={x === "satellite" && (network === "DEGRADED" || network === "OFFLINE")}
              >
                {mapCopy[lang][x]}
              </button>
            ))}
        </div>
        <div className="map-toolbar-actions">
          {!onSelect && mode !== "text" && (
            <button
              className="map-tool"
              aria-expanded={layersOpen}
              onClick={() => setLayersOpen(!layersOpen)}
            >
              <Layers size={16} />
              {t("map.layers")}
            </button>
          )}
          {mode !== "text" && (
            <button
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
              satellite={mode === "satellite"}
              snapshot={s}
              showPFZ={pfz}
              showEEZ={eez}
              showConditions={conditions}
              showLocation={pin}
              recenter={recenter}
              showVectors={vectors}
              species={showSpecies && optionalAllowed ? species.data : undefined}
              earth={showEarth && optionalAllowed ? earth.data : undefined}
            />
          </Suspense>
          {!onSelect && (
            <>
              <button
                className="map-location-chip"
                onClick={() => setInfoOpen(!infoOpen)}
                aria-expanded={infoOpen}
              >
                <MapPin size={15} />
                {s?.location.name || t("map.yourPin")}
                <span>
                  {center.lat.toFixed(2)}, {center.lon.toFixed(2)}
                </span>
              </button>
              {layersOpen && (
                <section
                  className="map-layer-panel"
                  aria-label={t("map.layers")}
                >
                  <header>
                    <strong>{t("map.layers")}</strong>
                    <button
                      className="workspace-icon"
                      aria-label="Close layers"
                      onClick={() => setLayersOpen(false)}
                    >
                      <X size={17} />
                    </button>
                  </header>
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
                  <label>
                    <span>
                      <i className="legend-dot pfz" />
                      PFZ
                    </span>
                    <input
                      type="checkbox"
                      checked={pfz && advisory.points.length > 0}
                      disabled={!advisory.points.length}
                      onChange={(e) => setPFZ(e.target.checked)}
                    />
                  </label>
                  {!advisory.points.length && <p>{unavailable}</p>}
                  {advisory.points.length > 0 && <p>Point halos are symbols, not distance or confidence boundaries. Only supplied advisory geometry is drawn to scale.</p>}
                  <label>
                    <span>
                      <i className="legend-line" />
                      EEZ · VLIZ
                    </span>
                    <input
                      type="checkbox"
                      checked={eez && !!s?.boundary.geometry}
                      disabled={!s?.boundary.geometry}
                      onChange={(e) => setEEZ(e.target.checked)}
                    />
                  </label>
                  {!s?.boundary.geometry && <p>EEZ: {t("chat.unavailable")}</p>}
                  <details>
                    <summary>{copy.advanced}</summary>
                    <label><span>Direction samples</span><input type="checkbox" checked={vectors} onChange={e=>setVectors(e.target.checked)} /></label>
                    <label>
                      <span>{copy.grid}</span>
                      <input
                        type="checkbox"
                        checked={conditions}
                        onChange={(e) => setConditions(e.target.checked)}
                      />
                    </label>
                    <p>MPA / restricted areas: unavailable without verified geometry.</p>
                    <p>Hazards: {s?.hazards.length || 0} snapshot alerts. No affected-area geometry supplied.</p>
                    <p>Species evidence classes: official advisory, habitat suitability model, and historical occurrence. Official species advisories and a validated suitability model are not available here.</p>
                    <label><span>Historical species · OBIS</span><input type="checkbox" checked={showSpecies} disabled={!optionalAllowed || !s} onChange={e=>setShowSpecies(e.target.checked)} /></label>
                    {showSpecies && <div role="status">
                      <p>{species.isPending ? "Loading historical records…" : species.isError ? "Historical records unavailable" : `OBIS: ${species.data?.status}`}</p>
                      {species.data && <><p>{species.data.disclaimer}</p><p>Retrieved {species.data.retrieved_at} · {species.data.cache_status}</p>
                        {species.data.evidence.slice(0,8).map(item=><p key={item.scientific_name}><strong>{item.scientific_name}</strong><br/>{item.occurrence_count} records in returned sample · latest {item.data_period.latest_in_sample || "Unavailable"}<br/>Historical occurrence</p>)}</>}
                    </div>}
                    <label><span>Flood context · Experimental</span><input type="checkbox" checked={showEarth} disabled={!optionalAllowed || !s} onChange={e=>setShowEarth(e.target.checked)} /></label>
                    {showEarth && <div role="status"><p>{earth.isPending ? "Loading Earth Engine context…" : earth.isError ? "Earth Engine unavailable" : `Earth Engine: ${earth.data?.status}`}</p>
                      {earth.data && <><p>{earth.data.limitations}</p><p>Rainfall observation: {earth.data.observation_period?.start || "Unavailable"} · age at retrieval {earth.data.observation_age_hours ?? "Unavailable"} hours</p><p>Retrieved {earth.data.retrieved_at} · {earth.data.cache_status}</p><p>Analysis cells: rainfall rate, mm/h. Pale: 0; blue: 10 or more. Not flood extent.</p>
                        {earth.data.datasets.map(dataset=><p key={dataset.dataset_id}><a href={dataset.source_url} target="_blank" rel="noreferrer">{dataset.organization}</a><br/>{dataset.spatial_resolution} · {dataset.temporal_resolution}</p>)}</>}
                    </div>}
                    {!optionalAllowed && <p>Optional online layers pause in low-data and offline modes.</p>}
                  </details>
                </section>
              )}
              {!compact && (
                <div className="map-legend" aria-label={t("map.legend")}>
                  <span>
                    <i className="legend-dot pin" />
                    {t("map.yourPin")}
                  </span>
                  {advisory.points.length > 0 && pfz && (
                    <span>
                      <i className="legend-dot pfz" />
                      PFZ
                    </span>
                  )}
                  {s?.boundary.geometry && eez && (
                    <span>
                      <i className="legend-line" />
                      EEZ · VLIZ
                    </span>
                  )}
                  {conditions && (
                    <span>
                      <i className="legend-dot grid" />
                      {copy.grid}
                    </span>
                  )}
                  {vectors && <span>↑ Direction samples</span>}
                  {showSpecies && optionalAllowed && species.data?.status === "available" && <span><i className="legend-dot" style={{background:"#7c3aed"}} />Historical species</span>}
                  {showEarth && optionalAllowed && earth.data?.status === "available" && <span><i className="legend-line" style={{background:"#2563eb"}} />Rainfall cells · experimental</span>}
                </div>
              )}
              {!compact && (
                <button
                  className="map-details-toggle"
                  onClick={() => setInfoOpen(!infoOpen)}
                  aria-expanded={infoOpen}
                >
                  <Waves size={17} />
                  {copy.details}
                </button>
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
