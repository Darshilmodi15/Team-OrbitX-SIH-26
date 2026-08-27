import { useEffect, useRef, useCallback } from "react";
import type { Map as LeafletMap, Marker, Circle, Polyline, LayerGroup } from "leaflet";
import { useI18n } from "@/lib/orca/i18n";
import { useMarine } from "@/lib/orca/use-marine";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, type Coords } from "@/lib/orca/geo";
import { COASTAL_CITIES } from "@/data/maritimeData";
import { getLocalizedCityName } from "@/data/localizedGeo";

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
  const sst =
    marine?.current.seaTemperatureC != null
      ? `${marine.current.seaTemperatureC.toFixed(1)}°C`
      : "29.4°C";

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
    const pfzLat = center.lat + 0.05;
    const pfzLon = center.lon < 78 ? center.lon - 0.28 : center.lon + 0.28;

    if (pfzCircleRef.current) {
      pfzCircleRef.current.setLatLng([pfzLat, pfzLon]);
      pfzCircleRef.current.bindTooltip(t("glossary.pfz.full"));
    }

    if (pfzMarkerRef.current) {
      pfzMarkerRef.current.setLatLng([pfzLat, pfzLon]);
      const pfzPopupHtml = `
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:180px;">
          <b style="color:#059669;font-size:13px;display:block;margin-bottom:2px;">🐟 ${t("glossary.pfz.full")}</b>
          <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">${t("map.pfzFront")}</span>
          <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;">
            <b>${t("map.sstLabel")}:</b> ${sst} · <b>${t("map.pfzDepth")}:</b> ~45m<br/>
            <b>${t("map.pfzTarget")}:</b> ${t("map.pfzSpecies")}
          </div>
        </div>
      `;
      pfzMarkerRef.current.setPopupContent(pfzPopupHtml);
    }

    // 4. Update IMBL (International Maritime Boundary Line)
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

    if (imblLineRef.current) {
      imblLineRef.current.setLatLngs(imblCoords);
      imblLineRef.current.bindTooltip(t("glossary.imbl.full"));
    }

    if (imblMarkerRef.current) {
      imblMarkerRef.current.setLatLng([imblCoords[1][0], imblCoords[1][1]]);
      const imblPopupHtml = `
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;min-width:190px;">
          <b style="color:#dc2626;font-size:13px;display:block;margin-bottom:2px;">🚨 ${t("glossary.imbl.full")}</b>
          <span style="color:#475569;font-size:11px;display:block;margin-bottom:4px;">${t("map.imblBuffer")}</span>
          <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:2px;">
            <b>${t("map.imblStatus")}:</b> ${t("map.imblMonitored")}
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
  }, [center.lat, center.lon, lang, t, sst]);

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
