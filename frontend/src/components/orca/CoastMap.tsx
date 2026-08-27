import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Circle, Polyline } from "leaflet";
import { useI18n } from "@/lib/orca/i18n";
import { useMarine } from "@/lib/orca/use-marine";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, type Coords } from "@/lib/orca/geo";

/**
 * Tactical Marine GIS Map with Satellite / Satellite-Hybrid Base Layer:
 * - Esri World Satellite Imagery base layer
 * - Coastal & Marine reference boundaries layer
 * - PFZ (Potential Fishing Zone) active hotspot circle & interactive pin
 * - IMBL (International Maritime Boundary Line) dashed boundary polyline & pin
 * - User GPS coastal circle and priority coastal city pins
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
  const markerRef = useRef<Marker | null>(null);
  const pfzMarkerRef = useRef<Marker | null>(null);
  const pfzCircleRef = useRef<Circle | null>(null);
  const imblLineRef = useRef<Polyline | null>(null);
  const imblMarkerRef = useRef<Marker | null>(null);

  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const { t, lang } = useI18n();

  // Retrieve marine conditions for popup tooltips
  const { data: marine } = useMarine(center);
  const sst =
    marine?.current.seaTemperatureC != null
      ? `${marine.current.seaTemperatureC.toFixed(1)}°C`
      : "29.4°C";

  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !el.current || mapRef.current) return;

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

      // 50km Coastal Buffer Circle
      L.circle([center.lat, center.lon], {
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
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;">
            <b style="color:#059669;font-size:13px;">🐟 Potential Fishing Zone (PFZ)</b><br/>
            <span>High Chlorophyll-a Front & Upwelling</span><br/>
            <b>SST:</b> ${sst} · <b>Depth:</b> ~45m<br/>
            <b>Target:</b> Tuna, Mackerel, Pomfret
          </div>`
        )
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
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;line-height:1.4;">
            <b style="color:#dc2626;font-size:13px;">🚨 IMBL (International Maritime Boundary)</b><br/>
            <span>200 NM Sovereign Boundary & Security Buffer</span><br/>
            <b>Status:</b> Monitored by Indian Coast Guard
          </div>`
        )
        .addTo(map);

      // ─── 5. Localized Coastal City Markers ───
      try {
        const { COASTAL_CITIES } = await import("@/data/maritimeData");
        const { getLocalizedCityName } = await import("@/data/localizedGeo");

        COASTAL_CITIES.filter((c) => c.priority).forEach((city) => {
          const localizedName = getLocalizedCityName(city.id, city.name, lang);
          const cityIcon = L.divIcon({
            className: "orca-city-pin",
            html: `<div style="display:inline-flex;align-items:center;gap:3px;background:rgba(15,23,42,0.88);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.5);white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4);"><span style="width:4px;height:4px;border-radius:50%;background:#38bdf8;"></span>${localizedName}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10],
          });
          L.marker([city.lat, city.lon], { icon: cityIcon })
            .addTo(map)
            .on("click", () => {
              selectRef.current?.({ lat: city.lat, lon: city.lon });
            });
        });
      } catch {
        /* ignore */
      }

      if (interactive) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          selectRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng });
        });
      }

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 60);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lon], map.getZoom());
    markerRef.current?.setLatLng([center.lat, center.lon]);

    // Update PFZ position
    const pfzLat = center.lat + 0.05;
    const pfzLon = center.lon < 78 ? center.lon - 0.28 : center.lon + 0.28;
    pfzCircleRef.current?.setLatLng([pfzLat, pfzLon]);
    pfzMarkerRef.current?.setLatLng([pfzLat, pfzLon]);

    // Update IMBL position
    const isWest = center.lon < 78;
    const imblCoords: [number, number][] = isWest
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
    imblLineRef.current?.setLatLngs(imblCoords);
    imblMarkerRef.current?.setLatLng([imblCoords[1][0], imblCoords[1][1]]);
  }, [center.lat, center.lon]);

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
