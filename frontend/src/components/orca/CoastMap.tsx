import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, TileLayer } from "leaflet";
import { askAssistantLabel } from "@/lib/brand";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { type MarineSnapshot } from "@/lib/orca/snapshot";
import {
  bearing,
  compassLabel,
  haversineKm,
  kmToNm,
  marineMapData,
} from "@/lib/orca/map-data";
import type { SpeciesResult, EarthResult } from "@/lib/orca/intelligence";

export type CursorReadout = {
  lat: number;
  lon: number;
  distanceKm: number;
  distanceNm: number;
  bearingDeg: number;
  cardinal: string;
};

const RANGE_RINGS_NM = [
  { nm: 5, meters: 9260, kmLabel: "9 km" },
  { nm: 10, meters: 18520, kmLabel: "19 km" },
  { nm: 20, meters: 37040, kmLabel: "37 km" },
] as const;

function createSvgElement(
  tag: string,
  attrs: Record<string, string>,
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function buildFishBadge(label: string): HTMLElement {
  const pill = document.createElement("div");
  pill.className = "orca-pfz-badge-inner";
  const svg = createSvgElement("svg", {
    viewBox: "0 0 20 14",
    width: "14",
    height: "10",
    fill: "none",
    "aria-hidden": "true",
  });
  svg.appendChild(
    createSvgElement("path", {
      d: "M1.5 7C4.2 3 8.8 2 13 4.4L17.8 2.2L16.3 7L17.8 11.8L13 9.6C8.8 12 4.2 11 1.5 7Z",
      fill: "currentColor",
    }),
  );
  svg.appendChild(
    createSvgElement("circle", {
      cx: "5.2",
      cy: "6.4",
      r: "1",
      fill: "#064e3b",
    }),
  );
  const textNode = document.createElement("span");
  textNode.textContent = label;
  pill.appendChild(svg);
  pill.appendChild(textNode);
  return pill;
}

function buildVectorBadge(
  kind: "Wind" | "Wave" | "Current",
  degrees: number,
  magnitude: number | null,
  unit: string,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = `orca-vector-pill orca-vector-${kind.toLowerCase()}`;

  const ring = document.createElement("span");
  ring.className = "orca-vector-circle";

  const svg = createSvgElement("svg", {
    viewBox: "0 0 20 20",
    width: "14",
    height: "14",
    fill: "none",
    "aria-hidden": "true",
  });
  svg.style.transform = `rotate(${degrees}deg)`;
  svg.appendChild(
    createSvgElement("path", {
      d: "M10 2.5L15 14.5L10 11.8L5 14.5L10 2.5Z",
      fill: "currentColor",
    }),
  );
  ring.appendChild(svg);
  wrap.appendChild(ring);

  const caption = document.createElement("span");
  caption.className = "orca-vector-tag";
  caption.textContent =
    magnitude != null
      ? `${kind[0]} ${magnitude.toFixed(kind === "Wave" ? 1 : 0)}${unit === "m" ? "m" : ""}`
      : `${kind[0]} ${degrees.toFixed(0)}°`;
  wrap.appendChild(caption);

  return wrap;
}

function buildGridMetricCard(
  items: Array<{ code: string; value: string; tone: string }>,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "orca-grid-badge-inner";
  for (const item of items) {
    const chip = document.createElement("span");
    chip.className = `orca-grid-chip orca-grid-chip-${item.tone}`;
    const dot = document.createElement("i");
    dot.className = "orca-grid-chip-dot";
    const strong = document.createElement("strong");
    strong.textContent = item.value;
    const label = document.createElement("em");
    label.textContent = item.code;
    chip.appendChild(dot);
    chip.appendChild(label);
    chip.appendChild(strong);
    card.appendChild(chip);
  }
  return card;
}

/** Only provided snapshot geometry is plotted. Tile imagery is a basemap. */
export default function CoastMap({
  center,
  interactive = true,
  height = 420,
  onSelect,
  satellite = false,
  snapshot,
  boundaryGeometry,
  showPFZ = true,
  showEEZ = true,
  showConditions = false,
  showLocation = true,
  showRangeRings = false,
  showSeamarks = false,
  recenter = 0,
  fitSignal = 0,
  onInspect,
  onCursorMove,
  showVectors = false,
  species,
  earth,
  zoom,
}: {
  center: Coords;
  interactive?: boolean;
  height?: number;
  onSelect?: (c: Coords) => void;
  satellite?: boolean;
  snapshot?: MarineSnapshot;
  boundaryGeometry?: GeoJSON.FeatureCollection | null;
  showPFZ?: boolean;
  showEEZ?: boolean;
  showConditions?: boolean;
  showLocation?: boolean;
  showRangeRings?: boolean;
  showSeamarks?: boolean;
  recenter?: number;
  fitSignal?: number;
  onInspect?: () => void;
  onCursorMove?: (info: CursorReadout | null) => void;
  showVectors?: boolean;
  species?: SpeciesResult;
  earth?: EarthResult;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null),
    mapRef = useRef<LeafletMap | null>(null),
    layers = useRef<LayerGroup | null>(null),
    seamarkLayer = useRef<TileLayer | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null),
    selectRef = useRef(onSelect),
    inspectRef = useRef(onInspect),
    cursorRef = useRef(onCursorMove),
    centerRef = useRef(center);
  const previousZoom = useRef(zoom);
  const initialCoords = useRef({
    lat: center.lat,
    lon: center.lon,
    zoom: zoom ?? 8,
  });

  useEffect(() => {
    selectRef.current = onSelect;
    inspectRef.current = onInspect;
    cursorRef.current = onCursorMove;
    centerRef.current = center;
    initialCoords.current = {
      lat: center.lat,
      lon: center.lon,
      zoom: zoom ?? 8,
    };
  });

  const [ready, setReady] = useState(false),
    [tileError, setTileError] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !el.current) return;
      const init = initialCoords.current;
      if (!Number.isFinite(init.lat) || !Number.isFinite(init.lon)) return;
      leaflet.current = L;
      const map = L.map(el.current, {
        center: [init.lat, init.lon],
        zoom: init.zoom,
        fadeAnimation: false,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      if (interactive) {
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control
          .scale({ position: "bottomright", metric: true, imperial: false, maxWidth: 110 })
          .addTo(map);
      }
      L.tileLayer(
        satellite
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 18,
          attribution: satellite
            ? "Tiles © Esri — reference imagery"
            : "© OpenStreetMap contributors",
        },
      )
        .on("tileerror", () => {
          if (!cancelled) setTileError(true);
        })
        .addTo(map);
      setTileError(false);
      layers.current = L.layerGroup().addTo(map);
      if (interactive) {
        map.on("click", (e) =>
          selectRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng }),
        );
        map.on("mousemove", (e) => {
          if (!cursorRef.current) return;
          const origin = centerRef.current;
          const target = { lat: e.latlng.lat, lon: e.latlng.lng };
          const distanceKm = haversineKm(origin, target);
          const bearingDeg = bearing(origin, target);
          cursorRef.current({
            lat: target.lat,
            lon: target.lon,
            distanceKm,
            distanceNm: kmToNm(distanceKm),
            bearingDeg,
            cardinal: compassLabel(bearingDeg),
          });
        });
        map.on("mouseout", () => {
          cursorRef.current?.(null);
        });
      }
      setReady(true);
      map.invalidateSize();
      if (typeof ResizeObserver !== "undefined") {
        resize = new ResizeObserver(() => map.invalidateSize());
        resize.observe(el.current);
      }
    })().catch(() => {
      if (!cancelled) setTileError(true);
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      seamarkLayer.current?.remove();
      seamarkLayer.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layers.current = null;
    };
  }, [interactive, satellite]);

  useEffect(() => {
    const L = leaflet.current,
      map = mapRef.current;
    if (!ready || !L || !map) return;
    if (showSeamarks) {
      if (!seamarkLayer.current) {
        seamarkLayer.current = L.tileLayer(
          "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
          {
            maxZoom: 18,
            opacity: 0.9,
            attribution: "Seamarks © OpenSeaMap contributors",
          },
        ).addTo(map);
      }
    } else if (seamarkLayer.current) {
      seamarkLayer.current.remove();
      seamarkLayer.current = null;
    }
  }, [ready, showSeamarks]);

  useEffect(() => {
    const L = leaflet.current,
      group = layers.current,
      map = mapRef.current;
    if (!ready || !L || !group || !map) return;
    group.clearLayers();
    const text = (value: string) => {
      const node = document.createElement("div");
      node.textContent = value;
      return node;
    };
    const hasCoords = Number.isFinite(center.lat) && Number.isFinite(center.lon);

    // 1. Nautical distance range rings (5 / 10 / 20 NM concentric dashed circles)
    if (showRangeRings && showLocation && hasCoords) {
      const ringColor = satellite ? "#38bdf8" : "#0f766e";
      for (const ring of RANGE_RINGS_NM) {
        L.circle([center.lat, center.lon], {
          radius: ring.meters,
          color: ringColor,
          weight: 1.35,
          opacity: satellite ? 0.8 : 0.55,
          dashArray: "6 6",
          fill: false,
          interactive: false,
        }).addTo(group);

        const northLat = center.lat + ring.meters / 1000 / 111.32;
        if (Math.abs(northLat) < 89.5) {
          const pill = document.createElement("span");
          pill.className = "orca-ring-label-pill";
          pill.textContent = `${ring.nm} NM · ${ring.kmLabel}`;
          L.marker([northLat, center.lon], {
            interactive: false,
            icon: L.divIcon({
              html: pill,
              className: "orca-ring-label",
              iconSize: [86, 18],
              iconAnchor: [43, 9],
            }),
          }).addTo(group);
        }
      }
    }

    // 2. EEZ reference polygon (distinct dashed gold/amber maritime boundary)
    if (
      snapshot &&
      showEEZ &&
      snapshot.boundary.availability === "available" &&
      (boundaryGeometry || snapshot.boundary.geometry)
    ) {
      L.geoJSON((boundaryGeometry || snapshot.boundary.geometry)!, {
        style: {
          color: "#d97706",
          weight: 2.4,
          dashArray: "10 6",
          fillColor: "#f59e0b",
          fillOpacity: satellite ? 0.08 : 0.04,
        },
        onEachFeature: (_f, layer) =>
          layer.bindPopup(
            text(
              "Marine Regions / VLIZ — simplified EEZ reference polygon (0.002° tolerance); edges may include coastlines. Not for navigation; backend calculations use the original geometry.",
            ),
          ),
      }).addTo(group);
    }

    // 3. Experimental rainfall analysis cells (color-ramp rectangular GeoJSON cells)
    if (earth?.status === "available" && earth.geometry) {
      L.geoJSON(earth.geometry, {
        style: (feature) => {
          const rate = feature?.properties?.rainfall_mm_h;
          return {
            color: "#1d4ed8",
            weight: 1.25,
            fillColor:
              typeof rate !== "number"
                ? "#94a3b8"
                : rate >= 10
                  ? "#1e40af"
                  : rate >= 2
                    ? "#3b82f6"
                    : "#bfdbfe",
            fillOpacity: 0.4,
          };
        },
        onEachFeature: (feature, layer) =>
          layer.bindPopup(
            text(
              `Experimental analysis cell, not flood extent. Rainfall: ${feature.properties?.rainfall_mm_h ?? "Unavailable"} mm/h; historical water occurrence: ${feature.properties?.historical_water_occurrence_pct ?? "Unavailable"}%; elevation: ${feature.properties?.elevation_m ?? "Unavailable"} m. Rainfall time: ${earth.observation_period?.start || "Unavailable"}. Aggregation: 1 km; native rainfall resolution approximately 11 km.`,
            ),
          ),
      }).addTo(group);
    }

    // 4. Model weather / ocean sample grid cells (rectangular footprint + rounded metric badge)
    if (snapshot && showConditions) {
      const grids = new Map<
        string,
        {
          lat: number;
          lon: number;
          lines: string[];
          chips: Array<{ code: string; value: string; tone: string }>;
        }
      >();
      for (const [field, label, shortCode, unit, tone, value] of [
        [
          "weather.wave_height_m",
          t("marine.wave"),
          "WV",
          "m",
          "teal",
          snapshot.weather.wave_height_m,
        ],
        [
          "weather.wind_speed_kmh",
          t("marine.wind"),
          "WD",
          "km/h",
          "sky",
          snapshot.weather.wind_speed_kmh,
        ],
        [
          "ocean.sst_c",
          t("marine.sst"),
          "SST",
          "°C",
          "amber",
          snapshot.ocean.sst_c,
        ],
      ] as const) {
        const source = snapshot.provenance.fields[field];
        if (
          typeof value !== "number" ||
          source?.grid_lat == null ||
          source.grid_lon == null
        )
          continue;
        const formatted = value.toFixed(1);
        const description = `${label}: ${formatted} ${unit} · ${source.source} · ${source.forecast_valid_at ?? ""}`;
        const key = `${source.grid_lat}:${source.grid_lon}`;
        const grid = grids.get(key) ?? {
          lat: source.grid_lat,
          lon: source.grid_lon,
          lines: [],
          chips: [],
        };
        grid.lines.push(description);
        grid.chips.push({ code: shortCode, value: `${formatted}${unit === "km/h" ? "k" : unit}`, tone });
        grids.set(key, grid);
      }

      for (const grid of grids.values()) {
        const popup = document.createElement("section");
        popup.className = "orca-popup";
        const heading = document.createElement("strong");
        heading.textContent = `Model sample cell (${grid.lat.toFixed(3)}, ${grid.lon.toFixed(3)})`;
        popup.appendChild(heading);
        for (const line of grid.lines) {
          popup.appendChild(text(line));
        }
        const footnote = document.createElement("small");
        footnote.textContent =
          "Reference grid cell footprint (~9 km) at provider sample point; not spatial interpolation.";
        popup.appendChild(footnote);

        // Crisp rectangular cell outline (~0.08 deg square)
        const halfDeg = 0.04;
        L.rectangle(
          [
            [grid.lat - halfDeg, grid.lon - halfDeg],
            [grid.lat + halfDeg, grid.lon + halfDeg],
          ],
          {
            color: "#2563eb",
            weight: 1.8,
            dashArray: "4 4",
            fillColor: "#3b82f6",
            fillOpacity: satellite ? 0.18 : 0.11,
          },
        )
          .bindPopup(popup.cloneNode(true) as HTMLElement)
          .addTo(group);

        // Rounded-rectangle live metric pill right at the model sample cell
        const badgeEl = buildGridMetricCard(grid.chips);
        L.marker([grid.lat, grid.lon], {
          icon: L.divIcon({
            html: badgeEl,
            className: "orca-grid-badge",
            iconSize: [Math.max(76, grid.chips.length * 64), 26],
            iconAnchor: [Math.max(38, grid.chips.length * 32), 13],
          }),
        })
          .bindPopup(popup)
          .bindTooltip(text(grid.lines.join(" · ")))
          .addTo(group);
      }
    }

    // 5. PFZ advisories (scaled polygon/radius + dashed course bearing line + rounded fish badge)
    const data = marineMapData(snapshot);
    if (snapshot && showPFZ) {
      for (const p of data.pfz) {
        const popup = document.createElement("section");
        popup.className = "orca-popup";
        const hasBearing =
          typeof p.bearing === "number" && Number.isFinite(p.bearing);
        const bearingText = hasBearing
          ? `${p.bearing.toFixed(0)}° ${compassLabel(p.bearing)}`
          : "Unavailable";
        for (const line of [
          "Potential Fishing Zone",
          `Reference: ${p.landing_centre || p.id}`,
          `Distance: ${p.distance_km ?? "Unavailable"} km · bearing ${bearingText}`,
          `Issued: ${snapshot.pfz.issued_at || "Unavailable"}`,
          `Valid until: ${snapshot.pfz.valid_until || "Unavailable"}`,
          `Source: ${snapshot.pfz.source || "Unavailable"}`,
          `Geometry: ${p.geometry?.type || "Point"}`,
          `Data type: ${snapshot.provenance.demo_scenario ? "Demo Scenario / Illustrative Dataset — not live" : "Verified advisory"}`,
          p.radius
            ? `Advisory search radius: ${p.radius} m`
            : "Symbol halo only; no geographic range implied.",
        ]) {
          popup.appendChild(text(line));
        }
        const link = document.createElement("a");
        link.textContent = askAssistantLabel(
          typeof document !== "undefined" ? document.documentElement.lang : "en",
        );
        link.href = `/assistant?snapshot=${encodeURIComponent(snapshot.snapshot_id)}&prompt=${encodeURIComponent(`Explain the available advisory for PFZ ${p.id} (${p.latitude}, ${p.longitude}).`)}`;
        link.style.display = "block";
        link.style.marginTop = "10px";
        popup.appendChild(link);

        if (p.geometry) {
          L.geoJSON(p.geometry, {
            style: {
              color: "#059669",
              weight: 2.2,
              fillColor: "#10b981",
              fillOpacity: 0.16,
              dashArray: "8 5",
            },
          })
            .bindPopup(popup.cloneNode(true) as HTMLElement)
            .addTo(group);
        }
        if (p.radius) {
          L.circle([p.latitude, p.longitude], {
            radius: p.radius,
            color: "#059669",
            weight: 2,
            fillColor: "#10b981",
            fillOpacity: 0.1,
          })
            .bindPopup(popup.cloneNode(true) as HTMLElement)
            .addTo(group);
        }

        // Course bearing line from selected pin to PFZ point
        if (showLocation && hasCoords) {
          L.polyline(
            [
              [center.lat, center.lon],
              [p.latitude, p.longitude],
            ],
            {
              color: "#059669",
              weight: 1.75,
              dashArray: "5 7",
              opacity: 0.85,
              interactive: false,
            },
          ).addTo(group);

          const distKm =
            typeof p.distance_km === "number" && Number.isFinite(p.distance_km)
              ? p.distance_km
              : haversineKm(
                  { lat: center.lat, lon: center.lon },
                  { lat: p.latitude, lon: p.longitude },
                );
          if (distKm >= 0.5) {
            const legEl = document.createElement("span");
            legEl.className = "orca-pfz-leg-pill";
            legEl.textContent = `${distKm.toFixed(1)} km · ${bearingText}`;
            L.marker(
              [(center.lat + p.latitude) / 2, (center.lon + p.longitude) / 2],
              {
                interactive: false,
                icon: L.divIcon({
                  html: legEl,
                  className: "orca-pfz-leg-label",
                  iconSize: [116, 20],
                  iconAnchor: [58, 10],
                }),
              },
            ).addTo(group);
          }
        }

        // Concentric symbol halo + distinct rounded-pill PFZ fish badge
        L.circleMarker([p.latitude, p.longitude], {
          radius: 22,
          color: "#10b981",
          weight: 1.5,
          fillColor: "#10b981",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(group);
        L.circleMarker([p.latitude, p.longitude], {
          radius: 14,
          color: "#059669",
          weight: 1,
          fillColor: "#10b981",
          fillOpacity: 0.16,
          interactive: false,
        }).addTo(group);

        const badgeLabel = snapshot.provenance.demo_scenario ? "Demo PFZ" : "PFZ";
        L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            html: buildFishBadge(badgeLabel),
            className: "orca-pfz-badge",
            iconSize: [badgeLabel.length > 4 ? 86 : 56, 24],
            iconAnchor: [badgeLabel.length > 4 ? 43 : 28, 12],
          }),
        })
          .bindPopup(popup)
          .bindTooltip(text(`${badgeLabel} · ${p.landing_centre || p.id}`))
          .addTo(group);
      }
    }

    // 6. Directional samples (color-coded rotated SVG compass arrow badges)
    if (showVectors) {
      for (const vector of data.vectors) {
        const degrees = Number.isFinite(vector.degrees) ? vector.degrees : 0;
        const badgeEl = buildVectorBadge(
          vector.kind,
          degrees,
          vector.magnitude,
          vector.unit,
        );
        const magStr =
          vector.magnitude != null ? ` (${vector.magnitude.toFixed(1)} ${vector.unit})` : "";
        const description = `${vector.kind}${magStr}: ${degrees.toFixed(0)}° ${compassLabel(degrees)} (${vector.convention}) · ${vector.source} · valid ${vector.validAt || "Unavailable"}. Compass bearing at a model sample point, not a movement animation or spatial vector field.`;
        const offsetX =
          vector.kind === "Wind" ? -38 : vector.kind === "Wave" ? 0 : 38;
        L.marker([vector.lat, vector.lon], {
          icon: L.divIcon({
            html: badgeEl,
            className: "orca-vector",
            iconSize: [52, 42],
            iconAnchor: [26 - offsetX, 21],
          }),
        })
          .bindPopup(text(description))
          .bindTooltip(
            text(`${vector.kind}${magStr} · ${degrees.toFixed(0)}° ${compassLabel(degrees)}`),
          )
          .addTo(group);
      }
    }

    // 7. OBIS historical species (distinct violet diamond markers)
    if (species?.status === "available") {
      for (const point of species.points) {
        const diamond = document.createElement("span");
        diamond.className = "orca-species-diamond-inner";
        L.marker([point.lat, point.lon], {
          icon: L.divIcon({
            html: diamond,
            className: "orca-species-diamond",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindPopup(
            text(
              `${point.scientific_name} · ${point.event_date || "Date unavailable"} · OBIS historical occurrence; not live fish detection.`,
            ),
          )
          .bindTooltip(text(`${point.scientific_name} (OBIS)`))
          .addTo(group);
      }
    }

    // 8. Selected location beacon (round pulsing target pin, placed on top!)
    if (showLocation && hasCoords) {
      L.circleMarker([center.lat, center.lon], {
        radius: 17,
        color: "#14b8a6",
        weight: 1.5,
        fillColor: "#14b8a6",
        fillOpacity: 0.16,
        interactive: false,
      }).addTo(group);
      L.circleMarker([center.lat, center.lon], {
        radius: 8.5,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#0d9488",
        fillOpacity: 1,
      })
        .bindTooltip(text(t("map.yourPin")))
        .bindPopup(
          text(
            `${t("map.yourPin")} · ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
          ),
        )
        .on("click", () => inspectRef.current?.())
        .addTo(group);
      L.circleMarker([center.lat, center.lon], {
        radius: 2.8,
        color: "#ffffff",
        weight: 0,
        fillColor: "#ffffff",
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    }
  }, [
    ready,
    satellite,
    center.lat,
    center.lon,
    snapshot,
    boundaryGeometry,
    showPFZ,
    showEEZ,
    showConditions,
    showLocation,
    showRangeRings,
    showVectors,
    species,
    earth,
    t,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !ready ||
      !map ||
      !Number.isFinite(center.lat) ||
      !Number.isFinite(center.lon)
    )
      return;
    // Zoom in on the first explicit selection, then preserve user zoom
    // while they fine-tune their pin with subsequent map clicks.
    const nextZoom =
      previousZoom.current !== zoom ? (zoom ?? map.getZoom()) : map.getZoom();
    previousZoom.current = zoom;
    map.setView([center.lat, center.lon], nextZoom);
  }, [ready, center.lat, center.lon, recenter, zoom]);

  useEffect(() => {
    const L = leaflet.current,
      map = mapRef.current;
    if (!ready || !L || !map || fitSignal <= 0) return;
    const coords: Array<[number, number]> = [];
    if (Number.isFinite(center.lat) && Number.isFinite(center.lon)) {
      coords.push([center.lat, center.lon]);
    }
    const data = marineMapData(snapshot);
    if (showPFZ) {
      for (const p of data.pfz) {
        if (Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) {
          coords.push([p.latitude, p.longitude]);
        }
      }
    }
    if (showConditions && snapshot) {
      for (const field of [
        "weather.wave_height_m",
        "weather.wind_speed_kmh",
        "ocean.sst_c",
      ]) {
        const src = snapshot.provenance.fields[field];
        if (src?.grid_lat != null && src.grid_lon != null) {
          coords.push([src.grid_lat, src.grid_lon]);
        }
      }
    }
    if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [52, 52], maxZoom: 11 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 9);
    }
  }, [ready, fitSignal, center.lat, center.lon, snapshot, showPFZ, showConditions]);

  return (
    <div className="coast-map">
      {tileError && (
        <p role="status" className="mb-2 text-sm">
          {onSelect
            ? "Map tiles unavailable. You can still search or enter coordinates."
            : "Map tiles unavailable. Snapshot values remain available below."}
        </p>
      )}
      <div
        ref={el}
        style={{ height }}
        className="w-full rounded-md border"
        role="region"
        aria-label={t("map.title")}
      />
    </div>
  );
}
