import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import type { Map as LeafletMap, Marker, Circle, Polyline, LayerGroup } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/orca/i18n";
import { usePFZ } from "@/lib/orca/use-pfz";
import { mapCopy } from "@/lib/orca/map-copy";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, type Coords } from "@/lib/orca/geo";
import { COASTAL_CITIES } from "@/data/maritimeData";
import { getLocalizedCityName } from "@/data/localizedGeo";
import { fetchGeofences } from "@/services/api";

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
}: {
  satellite?: boolean;
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
  const imblLineRef = useRef<Polyline | null>(null);
  const imblMarkerRef = useRef<Marker | null>(null);
  const cityLayerRef = useRef<LayerGroup | null>(null);

  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const { t, lang } = useI18n();

  const { advisory } = usePFZ();
  const { data: geofenceDataset } = useQuery({
    queryKey: ["geofences", center.lat.toFixed(2), center.lon.toFixed(2)],
    queryFn: () => fetchGeofences(center.lat, center.lon),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const nearestImbl = useMemo(() => {
    const geofences = ((geofenceDataset as { geofences?: RawGeofence[] } | null | undefined)?.geofences ?? [])
      .filter((zone) => !zone.is_demonstration && zone.category === "IMBL" && Array.isArray(zone.coordinates) && zone.coordinates.length >= 2)
      .map((zone) => ({
        name: zone.name ?? t("glossary.imbl.full"),
        description: zone.description ?? t("map.imblBuffer"),
        distanceToVesselKm: asNumber(zone.distance_to_vessel_km),
        coordinates: zone.coordinates as [number, number][],
        source: zone.source ?? "geospatial_geofence_registry",
      }));
    geofences.sort((a, b) => (a.distanceToVesselKm ?? Infinity) - (b.distanceToVesselKm ?? Infinity));
    return geofences[0] ?? null;
  }, [geofenceDataset, t]);

  // Function to update all localized labels, tooltips, popups & markers
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    // 1. Update view and User Vessel Marker

    if (markerRef.current) {
      markerRef.current.setLatLng([center.lat, center.lon]);
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
      popup.textContent = `${point.name} · ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)} · ${advisory.source}`;
      const tooltip = document.createElement("span");
      tooltip.textContent = point.name;
      const pin = L.circleMarker([point.lat, point.lon], { radius: 7, color: "#047857", fillColor: "#34d399", fillOpacity: 0.9, weight: 2 })
        .bindTooltip(tooltip).bindPopup(popup);
      pfzLayerRef.current?.addLayer(pin);
    }
    for (const layer of [imblLineRef.current, imblMarkerRef.current]) {
      if (layer) { if (nearestImbl) layer.addTo(map); else layer.remove(); }
    }
    // 4. Update IMBL (International Maritime Boundary Line)
    const isWestCoast = center.lon < 78;
    const fallbackImblCoords: [number, number][] = isWestCoast
      ? [
          [center.lat + 1.2, center.lon - 1.35],
          [center.lat, center.lon - 1.45],
          [center.lat - 1.2, center.lon - 1.3],
        ]
      : [
          [center.lat + 1.2, center.lon + 1.35],
          [center.lat, center.lon + 1.45],
          [center.lat - 1.2, center.lon + 1.3],
        ];
    const imblCoords = nearestImbl?.coordinates ?? fallbackImblCoords;
    const imblMidpoint = imblCoords[Math.floor(imblCoords.length / 2)] ?? fallbackImblCoords[1];
    const imblDistance = nearestImbl?.distanceToVesselKm == null
      ? t("map.imblBuffer")
      : `${nearestImbl.distanceToVesselKm.toFixed(1)} km from vessel`;

    if (imblLineRef.current) {
      imblLineRef.current.setLatLngs(imblCoords);
      imblLineRef.current.bindTooltip(t("glossary.imbl.full"));
    }

    if (imblMarkerRef.current) {
      imblMarkerRef.current.setLatLng([imblMidpoint[0], imblMidpoint[1]]);
      const imblPopupHtml = `
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:190px;">
          <b style="color:#dc2626;font-size:13px;display:block;margin-bottom:2px;">🚨 ${escapeHtml(nearestImbl?.name ?? t("glossary.imbl.full"))}</b>
          <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">${escapeHtml(imblDistance)}</span>
          <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;">
            <b>${t("map.imblStatus")}:</b> ${escapeHtml(nearestImbl?.description ?? t("map.imblMonitored"))}<br/>
            <b>${t("state.source")}:</b> ${escapeHtml(nearestImbl?.source ?? "ORCA visual fallback")}
          </div>
        </div>
      `;
      imblMarkerRef.current.setPopupContent(imblPopupHtml);
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
  }, [center, lang, nearestImbl, advisory, t]);

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

      // ─── 4. IMBL (International Maritime Boundary Line) Visual Layer ───
      const isWestCoast = center.lon < 78;
      const imblCoords: [number, number][] = isWestCoast
        ? [
            [center.lat + 1.2, center.lon - 1.35],
            [center.lat, center.lon - 1.45],
            [center.lat - 1.2, center.lon - 1.3],
          ]
        : [
            [center.lat + 1.2, center.lon + 1.35],
            [center.lat, center.lon + 1.45],
            [center.lat - 1.2, center.lon + 1.3],
          ];

      imblLineRef.current = L.polyline(imblCoords, {
        color: "#ef4444",
        weight: 3,
        dashArray: "8, 8",
        opacity: 0.9,
      });

      const imblIcon = L.divIcon({
        className: "orca-imbl-pin",
        html: `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(127,29,29,0.94);color:#fca5a5;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;border:1.5px dashed #ef4444;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;"><span style="width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;"></span>🚨 IMBL</div>`,
        iconSize: [95, 22],
        iconAnchor: [47, 11],
      });

      imblMarkerRef.current = L.marker([imblCoords[1][0], imblCoords[1][1]], {
        icon: imblIcon,
      })
        .bindPopup("");

      // ─── 5. Coastal Cities Layer Group ───
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
      {interactive && <button type="button" disabled={!advisory.points.length} className="min-h-10 rounded-md border px-3 text-sm disabled:opacity-50" onClick={() => {
        const L = leafletRef.current;
        if (L && advisory.points.length) mapRef.current?.fitBounds(L.latLngBounds(advisory.points.map(p => [p.lat, p.lon] as [number, number])), { padding: [28, 28], maxZoom: 10 });
      }}>{mapCopy[lang].fit}</button>}
      {tileError && <p role="status" className="text-sm text-muted-foreground">{mapCopy[lang].tiles}</p>}
      <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-md border border-border shadow-xs" role="region" aria-label={t("map.title")} />
    </div>
  );
}
