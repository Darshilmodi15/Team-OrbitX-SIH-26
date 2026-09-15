import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import type { Map as LeafletMap, Marker, Circle, Polyline, LayerGroup } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/orca/i18n";
import { usePFZ } from "@/lib/orca/use-pfz";
import { mapCopy } from "@/lib/orca/map-copy";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, type Coords } from "@/lib/orca/geo";
import { COASTAL_CITIES } from "@/data/maritimeData";
import { getLocalizedCityName } from "@/data/localizedGeo";
import { fetchGeofences, fetchInternationalBoundaries } from "@/services/api";

type RawGeofence = {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  distance_to_vessel_km?: number | string | null;
  coordinates?: Array<[number, number]>;
  source?: string;
  is_demonstration?: boolean;
};

type BoundaryFeatureRender = {
  id: string;
  name: string;
  countryPair: string;
  lineType: string;
  description?: string;
  source: string;
  docDate?: string;
  lengthKm?: number;
  distanceToVesselKm?: number | null;
  coordinates: Array<[number, number]>;
  isPrimaryRepresentative?: boolean;
};

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Reference map: provider points do not imply a navigable route or zone extent. */
export default function CoastMap({
  center,
  interactive = true,
  height = 420,
  onSelect,
  satellite = false,
  selectedSector,
}: {
  satellite?: boolean;
  selectedSector?: string;
  center: Coords;
  interactive?: boolean | undefined;
  height?: number | undefined;
  onSelect?: ((c: Coords) => void) | undefined;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const bufferCircleRef = useRef<Circle | null>(null);
  const pfzLayerRef = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const imblLayerRef = useRef<LayerGroup | null>(null);
  const cityLayerRef = useRef<LayerGroup | null>(null);

  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const { t, lang } = useI18n();

  const { advisory } = usePFZ(selectedSector || undefined, selectedSector ? undefined : center, lang);
  const { data: geofenceDataset } = useQuery({
    queryKey: ["geofences", center.lat.toFixed(2), center.lon.toFixed(2)],
    queryFn: () => fetchGeofences(center.lat, center.lon),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const { data: boundariesDataset } = useQuery({
    queryKey: ["international-boundaries"],
    queryFn: () => fetchInternationalBoundaries(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const imblZones = useMemo(() => {
    const rawZones = ((geofenceDataset as { geofences?: RawGeofence[] } | null | undefined)?.geofences ?? []);
    return rawZones
      .filter((zone) => !zone.is_demonstration && zone.category === "IMBL" && Array.isArray(zone.coordinates) && zone.coordinates.length >= 2)
      .map((zone) => ({
        id: zone.id ?? "imbl",
        name: zone.name ?? t("glossary.imbl.full"),
        description: zone.description ?? t("map.imblBuffer"),
        distanceToVesselKm: asNumber(zone.distance_to_vessel_km),
        coordinates: zone.coordinates as [number, number][],
        source: zone.source ?? "geospatial_geofence_registry",
        is_inside: Boolean((zone as any).is_inside),
        is_proximity_warning: Boolean((zone as any).is_proximity_warning),
      }));
  }, [geofenceDataset, t]);

  const nearestImbl = useMemo(() => {
    if (!imblZones.length) return null;
    const sorted = [...imblZones].sort((a, b) => (a.distanceToVesselKm ?? Infinity) - (b.distanceToVesselKm ?? Infinity));
    return sorted[0] ?? null;
  }, [imblZones]);

  const imblProximityStatus = useMemo(() => {
    if (!nearestImbl || nearestImbl.distanceToVesselKm == null) return null;
    const dist = nearestImbl.distanceToVesselKm;
    if (nearestImbl.is_inside || dist <= 10.0) return "CRITICAL" as const;
    if (nearestImbl.is_proximity_warning || dist <= 25.0) return "WARNING" as const;
    return "SAFE" as const;
  }, [nearestImbl]);

  const allBoundarySegments = useMemo<BoundaryFeatureRender[]>(() => {
    const geojson = boundariesDataset as { features?: any[] } | null | undefined;
    if (geojson && Array.isArray(geojson.features) && geojson.features.length > 0) {
      const list: BoundaryFeatureRender[] = [];
      const longestSegmentByPair: Record<string, { idx: number; length: number }> = {};

      for (const feature of geojson.features) {
        const props = feature.properties || {};
        const geom = feature.geometry;
        if (!geom) continue;

        const sov1 = props.sovereign1 || props.territory1 || "";
        const sov2 = props.sovereign2 || props.territory2 || "";
        const lineName = props.line_name || "";
        const lineType = props.line_type || "International Boundary";

        if (sov1 === "India" && !sov2 && lineType === "200 NM") {
          continue;
        }
        if (lineType === "Straight baseline") {
          continue;
        }

        let countryPair = lineName;
        if (sov1 && sov2 && sov1 !== sov2) {
          const other = (sov1 === "India" || sov1.includes("India") || sov1.includes("Andaman")) ? sov2 : sov1;
          countryPair = `India — ${other}`;
        } else if (lineName.includes(" - ")) {
          countryPair = lineName.replace(" - ", " — ");
        } else if (!countryPair) {
          countryPair = t("glossary.imbl.full");
        }

        let coordLines: Array<Array<[number, number]>> = [];
        if (geom.type === "LineString" && Array.isArray(geom.coordinates)) {
          coordLines.push(geom.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]));
        } else if (geom.type === "MultiLineString" && Array.isArray(geom.coordinates)) {
          for (const line of geom.coordinates) {
            if (Array.isArray(line)) {
              coordLines.push(line.map((pt: [number, number]) => [pt[1], pt[0]]));
            }
          }
        }

        for (let i = 0; i < coordLines.length; i++) {
          const coords = coordLines[i];
          if (coords.length >= 2) {
            const listIdx = list.length;
            const segLen = coords.length;
            if (!longestSegmentByPair[countryPair] || segLen > longestSegmentByPair[countryPair].length) {
              longestSegmentByPair[countryPair] = { idx: listIdx, length: segLen };
            }

            list.push({
              id: `${feature.id || props.line_id || "boundary"}_${i}`,
              name: `${countryPair}${lineType ? ` (${lineType})` : ""}`,
              countryPair,
              lineType,
              description: props.source1 || props.source2 || "International Maritime Boundary",
              source: props.source1 || props.source2 || "Marine Regions / Flanders Marine Institute (VLIZ)",
              docDate: props.doc_date,
              lengthKm: props.length_km ? Number(props.length_km) : undefined,
              coordinates: coords,
            });
          }
        }
      }

      if (list.length > 0) {
        // Tag primary representative segment for label pin
        Object.values(longestSegmentByPair).forEach(({ idx }) => {
          if (list[idx]) {
            list[idx].isPrimaryRepresentative = true;
          }
        });
        return list;
      }
    }

    return imblZones.map((z) => ({
      id: z.id,
      name: z.name,
      countryPair: z.name,
      lineType: "IMBL",
      description: z.description,
      source: z.source,
      distanceToVesselKm: z.distanceToVesselKm,
      coordinates: z.coordinates,
      isPrimaryRepresentative: true,
    }));
  }, [boundariesDataset, imblZones, t]);

  // Function to update all localized labels, tooltips, popups & markers
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    // 1. Update view and User Vessel Marker
    if (markerRef.current) {
      markerRef.current.setLatLng([center.lat, center.lon]);
      let vesselIconHtml = `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:oklch(0.55 0.085 205);box-shadow:0 0 0 4px oklch(0.55 0.085 205 / 0.3),0 0 0 1px white"></span>`;
      let iconSize: [number, number] = [16, 16];
      let iconAnchor: [number, number] = [8, 8];

      if (imblProximityStatus === "CRITICAL") {
        vesselIconHtml = `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,0.4),0 0 0 1px white;"></span>`;
        iconSize = [20, 20];
        iconAnchor = [10, 10];
      } else if (imblProximityStatus === "WARNING") {
        vesselIconHtml = `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#f59e0b;box-shadow:0 0 0 5px rgba(245,158,11,0.35),0 0 0 1px white;"></span>`;
        iconSize = [18, 18];
        iconAnchor = [9, 9];
      }

      const vesselIcon = L.divIcon({
        className: "",
        html: vesselIconHtml,
        iconSize,
        iconAnchor,
      });
      markerRef.current.setIcon(vesselIcon);
      markerRef.current.getElement()?.setAttribute("title", t("map.yourPin"));
      markerRef.current.getElement()?.setAttribute("aria-label", t("map.yourPin"));
      markerRef.current.bindTooltip(t("map.yourPin"), { direction: "top", offset: [0, -8] });
    }

    // 2. Update Coastal Buffer Circle
    if (bufferCircleRef.current) {
      bufferCircleRef.current.setLatLng([center.lat, center.lon]);
      bufferCircleRef.current.bindTooltip(`${t("map.coastalZone")} (${COASTAL_BUFFER_KM} km)`);
    }

    pfzLayerRef.current?.clearLayers();
    for (const point of advisory.points) {
      // A point advisory does not establish a fishing-zone radius or polygon.
      const popup = document.createElement("div");
      const details = [
        point.distanceKm != null ? `${point.distanceKm} km` : null,
        point.bearingDeg != null ? `${point.bearingDeg}°` : null,
        point.depthM != null ? `${point.depthM} m depth` : null,
        point.species && point.species.length > 0 ? point.species.join(", ") : null,
      ].filter(Boolean).join(" · ");
      popup.innerHTML = `
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:180px;">
          <b style="color:#047857;font-size:13px;display:block;margin-bottom:2px;">🐟 ${escapeHtml(point.name)}</b>
          <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">${point.lat.toFixed(4)}°N, ${point.lon.toFixed(4)}°E</span>
          ${details ? `<div style="color:#334155;font-size:11px;margin-bottom:4px;">${escapeHtml(details)}</div>` : ""}
          <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;font-size:10px;color:#64748b;">
            <b>Source:</b> ${escapeHtml(advisory.source ?? "INCOIS PFZ Advisory")}
          </div>
        </div>
      `;
      const tooltip = document.createElement("span");
      tooltip.textContent = `🐟 ${point.name}`;

      // 1. Translucent outer circular zone / area-of-interest with subtle dashed boundary
      const zone = L.circleMarker([point.lat, point.lon], {
        radius: 20,
        color: "#10b981",
        weight: 1.2,
        opacity: 0.65,
        dashArray: "4, 4",
        fillColor: "#059669",
        fillOpacity: 0.20,
      }).bindTooltip(tooltip).bindPopup(popup);

      // 2. Soft inner radial glow around the center
      const glow = L.circleMarker([point.lat, point.lon], {
        radius: 10,
        color: "#34d399",
        weight: 1,
        opacity: 0.35,
        fillColor: "#34d399",
        fillOpacity: 0.25,
        interactive: false,
      });

      // 3. Bright green/teal center point marker with crisp light outline
      const centerPin = L.circleMarker([point.lat, point.lon], {
        radius: 4.5,
        color: "#ffffff",
        weight: 1.5,
        opacity: 1,
        fillColor: "#10b981",
        fillOpacity: 1,
      }).bindTooltip(tooltip).bindPopup(popup);

      pfzLayerRef.current?.addLayer(zone);
      pfzLayerRef.current?.addLayer(glow);
      pfzLayerRef.current?.addLayer(centerPin);
    }

    // 4. Update IMBL (International Maritime Boundary Line) Visual Layers
    if (imblLayerRef.current) {
      imblLayerRef.current.clearLayers();
      for (const segment of allBoundarySegments) {
        const polyline = L.polyline(segment.coordinates, {
          color: "#ef4444",
          weight: 2.5,
          dashArray: "6, 6",
          opacity: 0.85,
        });

        const midIdx = Math.floor(segment.coordinates.length / 2);
        const midPt = segment.coordinates[midIdx] ?? segment.coordinates[0];
        const distInfo = segment.distanceToVesselKm != null
          ? `${segment.distanceToVesselKm.toFixed(1)} km from vessel`
          : (nearestImbl && nearestImbl.name.includes(segment.countryPair.split("—")[1]?.trim() || "") && nearestImbl.distanceToVesselKm != null)
          ? `${nearestImbl.distanceToVesselKm.toFixed(1)} km from vessel`
          : null;

        const imblPopupHtml = `
          <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:200px;">
            <b style="color:#dc2626;font-size:13px;display:block;margin-bottom:2px;">🚨 International Maritime Boundary</b>
            <span style="font-weight:700;color:#0f172a;font-size:12px;display:block;margin-bottom:2px;">${escapeHtml(segment.countryPair)}</span>
            <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">
              <b>Type:</b> ${escapeHtml(segment.lineType)}${segment.lengthKm ? ` · ${segment.lengthKm.toFixed(1)} km` : ""}
              ${distInfo ? `<br/><span style="color:#dc2626;font-weight:600;">${escapeHtml(distInfo)}</span>` : ""}
            </span>
            <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;font-size:10px;color:#64748b;">
              <b>Source:</b> ${escapeHtml(segment.source)}<br/>
              ${segment.docDate ? `<b>Date:</b> ${escapeHtml(segment.docDate.replace("Z", ""))}` : ""}
            </div>
          </div>
        `;

        polyline.bindTooltip(`🚨 ${segment.countryPair}${segment.lineType ? ` (${segment.lineType})` : ""}${distInfo ? ` · ${distInfo}` : ""}`, {
          sticky: true,
          direction: "top",
        });
        polyline.bindPopup(imblPopupHtml);
        imblLayerRef.current.addLayer(polyline);

        if (segment.isPrimaryRepresentative && midPt) {
          const imblIcon = L.divIcon({
            className: "orca-imbl-pin",
            html: `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(127,29,29,0.94);color:#fca5a5;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;border:1.5px dashed #ef4444;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;"><span style="width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;"></span>🚨 ${escapeHtml(segment.countryPair)}</div>`,
            iconSize: [120, 22],
            iconAnchor: [60, 11],
          });

          const pinMarker = L.marker([midPt[0], midPt[1]], { icon: imblIcon }).bindPopup(imblPopupHtml);
          imblLayerRef.current.addLayer(pinMarker);
        }
      }
    }

    // 5. Update Localized Coastal Cities
    if (cityLayerRef.current) {
      cityLayerRef.current.clearLayers();
      COASTAL_CITIES.filter((c) => c.priority).forEach((city) => {
        const localizedName = getLocalizedCityName(city.id, city.name, lang);
        const cityIcon = L.divIcon({
          className: "orca-city-pin",
          html: `<div style="display:inline-flex;align-items:center;gap:3px;background:rgba(15,23,42,0.88);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.5);white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"><span style="width:4px;height:4px;border-radius:50%;background:#38bdf8;"></span>${localizedName}</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        });
        const marker = L.marker([city.lat, city.lon], { icon: cityIcon, title: localizedName }).on(
          "click",
          () => {
            selectRef.current?.({ lat: city.lat, lon: city.lon });
          }
        );
        cityLayerRef.current?.addLayer(marker);
      });
    }
  }, [center, lang, allBoundarySegments, nearestImbl, imblProximityStatus, advisory, t]);

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setTileError(false);

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !el.current || mapRef.current) return;

      leafletRef.current = L;

      const map = L.map(el.current, {
        center: [center.lat, center.lon],
        zoom: interactive ? 8 : 7,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
        attributionControl: true,
        maxBounds: [
          [INDIA_BOUNDS.south - 4, INDIA_BOUNDS.west - 4],
          [INDIA_BOUNDS.north + 2, INDIA_BOUNDS.east + 4],
        ],
        maxBoundsViscosity: 1,
        minZoom: 4,
      });

      const tiles = L.tileLayer(satellite
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        updateWhenIdle: true,
        keepBuffer: 1,
        attribution: satellite ? "Tiles &copy; Esri" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => { if (!disposed) setTileError(true); });
      tiles.addTo(map);

      // User Vessel Pin
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:oklch(0.55 0.085 205);box-shadow:0 0 0 4px oklch(0.55 0.085 205 / 0.3),0 0 0 1px white"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([center.lat, center.lon], {
        icon,
        title: t("map.yourPin"),
      }).addTo(map);

      // Coastal Buffer Circle (100km)
      bufferCircleRef.current = L.circle([center.lat, center.lon], {
        radius: COASTAL_BUFFER_KM * 1000,
        color: "oklch(0.55 0.085 205)",
        weight: 1,
        fillOpacity: 0.08,
      }).addTo(map);

      pfzLayerRef.current = L.layerGroup().addTo(map);
      imblLayerRef.current = L.layerGroup().addTo(map);
      cityLayerRef.current = L.layerGroup().addTo(map);

      if (interactive) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          selectRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng });
        });
      }

      mapRef.current = map;
      setReady(true);
      map.invalidateSize();
    })().catch(() => { if (!disposed) setTileError(true); });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellite, interactive]);

  // Update map and layers whenever center, language, translations or marine conditions change
  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers, ready, satellite]);

  useEffect(() => { mapRef.current?.setView([center.lat, center.lon], mapRef.current.getZoom()); }, [center.lat, center.lon, ready, satellite]);

  return (
    <div className="space-y-2">
      {/* ── IMBL Proximity Warning Banners ── */}
      {nearestImbl && nearestImbl.distanceToVesselKm != null && imblProximityStatus === "CRITICAL" && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-md border border-red-500/80 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300 shadow-xs"
        >
          <span className="text-lg shrink-0" aria-hidden="true">🚨</span>
          <div>
            <p className="font-bold text-red-800 dark:text-red-200">
              CRITICAL IMBL WARNING
            </p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
              Vessel is critically close ({nearestImbl.distanceToVesselKm.toFixed(1)} km) to the {nearestImbl.name}. Move away from the boundary immediately.
            </p>
          </div>
        </div>
      )}
      {nearestImbl && nearestImbl.distanceToVesselKm != null && imblProximityStatus === "WARNING" && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-md border border-amber-500/80 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200 shadow-xs"
        >
          <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100">
              APPROACHING IMBL
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
              You are approximately {nearestImbl.distanceToVesselKm.toFixed(1)} km from the {nearestImbl.name}. Proceed with caution and remain within permitted maritime boundaries.
            </p>
          </div>
        </div>
      )}

      {interactive && <button type="button" disabled={!advisory.points.length} className="min-h-10 rounded-md border px-3 text-sm disabled:opacity-50" onClick={() => {
        const L = leafletRef.current;
        if (L && advisory.points.length) mapRef.current?.fitBounds(L.latLngBounds(advisory.points.map(p => [p.lat, p.lon] as [number, number])), { padding: [28, 28], maxZoom: 10 });
      }}>{mapCopy[lang].fit}</button>}
      {tileError && <p role="status" className="text-sm text-muted-foreground">{mapCopy[lang].tiles}</p>}
      <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-md border border-border shadow-xs" role="region" aria-label={t("map.title")} />
    </div>
  );
}
