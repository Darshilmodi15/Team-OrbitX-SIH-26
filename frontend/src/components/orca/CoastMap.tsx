import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Map as LeafletMap, Marker, Circle, Polyline, LayerGroup } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/orca/i18n";
import { useMarine } from "@/lib/orca/use-marine";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, haversineKm, type Coords } from "@/lib/orca/geo";
import { COASTAL_CITIES } from "@/data/maritimeData";
import { getLocalizedCityName } from "@/data/localizedGeo";
import { fetchGeofences, fetchPFZDataset } from "@/services/api";

type RawPFZZone = {
  id?: string;
  landing_centre?: string;
  latitude?: number | string;
  longitude?: number | string;
  bearing_deg?: number | string | null;
  direction?: string | null;
  depth_m?: number | string | { min?: number; max?: number };
  distance_km?: number | string | { min?: number; max?: number };
  dominant_species?: string;
};

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

function depthValue(depth: RawPFZZone["depth_m"]): number | null {
  if (typeof depth === "object" && depth) {
    const min = asNumber(depth.min);
    const max = asNumber(depth.max);
    if (min != null && max != null) return (min + max) / 2;
    return min ?? max;
  }
  return asNumber(depth);
}

function distanceRangeText(distance: RawPFZZone["distance_km"], fallback: number): string {
  if (typeof distance === "object" && distance) {
    const min = asNumber(distance.min);
    const max = asNumber(distance.max);
    if (min != null && max != null) return `${min}-${max} km`;
  }
  const numeric = asNumber(distance);
  return `${(numeric ?? fallback).toFixed(1)} km`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Tactical Marine GIS Map with Satellite / Satellite-Hybrid Base Layer:
 * - Esri World Satellite Imagery base layer
 * - Coastal & Marine reference boundaries layer
 * - PFZ (Potential Fishing Zone) active hotspot circle & interactive pin
 * - IMBL (International Maritime Boundary Line) dashed boundary polyline & pin
 * - User GPS coastal circle and priority coastal city pins
 * - Multilingual synchronized map markers, tooltips, popups, and city pins
 */
export default function CoastMap({
  center,
  interactive = true,
  height = 420,
  onSelect,
}: {
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
  const pfzMarkerRef = useRef<Marker | null>(null);
  const pfzCircleRef = useRef<Circle | null>(null);
  const imblLineRef = useRef<Polyline | null>(null);
  const imblMarkerRef = useRef<Marker | null>(null);
  const cityLayerRef = useRef<LayerGroup | null>(null);

  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const { t, lang } = useI18n();

  // Retrieve marine conditions for popup tooltips
  const { data: marine } = useMarine(center);
  const { data: pfzDataset } = useQuery({
    queryKey: ["pfz-dataset"],
    queryFn: fetchPFZDataset,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const { data: geofenceDataset } = useQuery({
    queryKey: ["geofences", center.lat.toFixed(2), center.lon.toFixed(2)],
    queryFn: () => fetchGeofences(center.lat, center.lon),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const sst =
    marine?.current.seaTemperatureC != null
      ? `${marine.current.seaTemperatureC.toFixed(1)}°C`
      : "\u2014";

  const nearestPfz = useMemo(() => {
    const zones = ((pfzDataset as { pfz_zones?: RawPFZZone[] } | undefined)?.pfz_zones ?? [])
      .map((zone) => {
        const lat = asNumber(zone.latitude);
        const lon = asNumber(zone.longitude);
        if (lat == null || lon == null) return null;
        const distanceKm = haversineKm(center, { lat, lon });
        return {
          coords: [lat, lon] as [number, number],
          landingCentre: zone.landing_centre ?? "Offshore",
          depthM: depthValue(zone.depth_m),
          distanceKm,
          distanceRange: distanceRangeText(zone.distance_km, distanceKm),
          bearingDeg: asNumber(zone.bearing_deg),
          direction: zone.direction ?? null,
          species: zone.dominant_species ?? "Pelagic aggregation potential",
          source: "INCOIS PFZ advisory dataset",
        };
      })
      .filter(Boolean) as Array<{
        coords: [number, number];
        landingCentre: string;
        depthM: number | null;
        distanceKm: number;
        distanceRange: string;
        bearingDeg: number | null;
        direction: string | null;
        species: string;
        source: string;
      }>;
    zones.sort((a, b) => a.distanceKm - b.distanceKm);
    return zones[0] ?? null;
  }, [center, pfzDataset]);

  const nearestImbl = useMemo(() => {
    const geofences = ((geofenceDataset as { geofences?: RawGeofence[] } | null | undefined)?.geofences ?? [])
      .filter((zone) => zone.category === "IMBL" && Array.isArray(zone.coordinates) && zone.coordinates.length >= 2)
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
    map.setView([center.lat, center.lon], map.getZoom());
    if (markerRef.current) {
      markerRef.current.setLatLng([center.lat, center.lon]);
      markerRef.current.bindTooltip(t("map.yourPin"), { direction: "top", offset: [0, -8] });
    }

    // 2. Update Coastal Buffer Circle
    if (bufferCircleRef.current) {
      bufferCircleRef.current.setLatLng([center.lat, center.lon]);
      bufferCircleRef.current.bindTooltip(`${t("map.coastalZone")} (${COASTAL_BUFFER_KM} km)`);
    }

    // 3. Update PFZ (Potential Fishing Zone)
    const fallbackPfzLat = center.lat + 0.05;
    const fallbackPfzLon = center.lon < 78 ? center.lon - 0.28 : center.lon + 0.28;
    const pfzLat = nearestPfz?.coords[0] ?? fallbackPfzLat;
    const pfzLon = nearestPfz?.coords[1] ?? fallbackPfzLon;
    const pfzDepth = nearestPfz?.depthM == null ? "\u2014" : `~${Math.round(nearestPfz.depthM)}m`;
    const pfzDistance = nearestPfz ? nearestPfz.distanceRange : "estimated display overlay";
    const pfzBearing = nearestPfz?.bearingDeg == null
      ? nearestPfz?.direction ?? "\u2014"
      : `${Math.round(nearestPfz.bearingDeg)}°${nearestPfz.direction ? ` ${nearestPfz.direction}` : ""}`;

    if (pfzCircleRef.current) {
      pfzCircleRef.current.setLatLng([pfzLat, pfzLon]);
      pfzCircleRef.current.setRadius(nearestPfz ? 9000 : 12000);
      pfzCircleRef.current.bindTooltip(t("glossary.pfz.full"));
    }

    if (pfzMarkerRef.current) {
      pfzMarkerRef.current.setLatLng([pfzLat, pfzLon]);
      const pfzPopupHtml = `
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:180px;">
          <b style="color:#059669;font-size:13px;display:block;margin-bottom:2px;">🐟 ${t("glossary.pfz.full")}</b>
          <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">${escapeHtml(nearestPfz?.landingCentre ?? t("map.pfzFront"))}</span>
          <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;">
            <b>${t("map.sstLabel")}:</b> ${sst} · <b>${t("map.pfzDepth")}:</b> ${pfzDepth}<br/>
            <b>Distance:</b> ${escapeHtml(pfzDistance)} · <b>Bearing:</b> ${escapeHtml(pfzBearing)}<br/>
            <b>${t("map.pfzTarget")}:</b> ${escapeHtml(nearestPfz?.species ?? t("map.pfzSpecies"))}<br/>
            <b>${t("state.source")}:</b> ${escapeHtml(nearestPfz?.source ?? "ORCA visual fallback")}
          </div>
        </div>
      `;
      pfzMarkerRef.current.setPopupContent(pfzPopupHtml);
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
  }, [center, lang, nearestImbl, nearestPfz, sst, t]);

  useEffect(() => {
    let disposed = false;

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

      // ─── 1. Satellite Base Layer (Esri World Imagery) ───
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community",
        }
      ).addTo(map);

      // ─── 2. Satellite-Hybrid Coastal Borders & Places Overlay ───
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          opacity: 0.75,
        }
      ).addTo(map);

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

      // ─── 3. PFZ (Potential Fishing Zone) Visual Layer ───
      const pfzLat = center.lat + 0.05;
      const pfzLon = center.lon < 78 ? center.lon - 0.28 : center.lon + 0.28;

      pfzCircleRef.current = L.circle([pfzLat, pfzLon], {
        radius: 12000,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.22,
        weight: 2,
        dashArray: "4, 4",
      }).addTo(map);

      const pfzIcon = L.divIcon({
        className: "orca-pfz-pin",
        html: `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(6,78,59,0.94);color:#34d399;font-size:10px;font-weight:700;padding:2px 7px;border-radius:12px;border:1.5px solid #10b981;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;"><span style="width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 6px #34d399;"></span>🐟 PFZ</div>`,
        iconSize: [90, 22],
        iconAnchor: [45, 11],
      });

      pfzMarkerRef.current = L.marker([pfzLat, pfzLon], { icon: pfzIcon })
        .bindPopup("")
        .addTo(map);

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
      }).addTo(map);

      const imblIcon = L.divIcon({
        className: "orca-imbl-pin",
        html: `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(127,29,29,0.94);color:#fca5a5;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;border:1.5px dashed #ef4444;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;"><span style="width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;"></span>🚨 IMBL</div>`,
        iconSize: [95, 22],
        iconAnchor: [47, 11],
      });

      imblMarkerRef.current = L.marker([imblCoords[1][0], imblCoords[1][1]], {
        icon: imblIcon,
      })
        .bindPopup("")
        .addTo(map);

      // ─── 5. Coastal Cities Layer Group ───
      cityLayerRef.current = L.layerGroup().addTo(map);

      if (interactive) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          selectRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng });
        });
      }

      mapRef.current = map;
      updateMapLayers();
      setTimeout(() => map.invalidateSize(), 60);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map and layers whenever center, language, translations or marine conditions change
  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  return (
    <div
      ref={el}
      style={{ height }}
      className="w-full overflow-hidden rounded-md border border-border shadow-xs"
      role="application"
      aria-label={t("map.title")}
    />
  );
}
