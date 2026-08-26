import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useI18n } from "@/lib/orca/i18n";
import { COASTAL_BUFFER_KM, INDIA_BOUNDS, type Coords } from "@/lib/orca/geo";

/**
 * Lightweight India-focused Leaflet map. Loaded lazily so the
 * tile library never blocks the first paint on a slow connection.
 */
export default function CoastMap({
  center,
  interactive = true,
  height = 240,
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
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const { t, lang } = useI18n();

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

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 16,
        attribution: "\u00a9 OpenStreetMap",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:oklch(0.55 0.085 205);box-shadow:0 0 0 4px oklch(0.55 0.085 205 / 0.3),0 0 0 1px white"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([center.lat, center.lon], { icon, title: t("map.yourPin") }).addTo(map);
      L.circle([center.lat, center.lon], {
        radius: COASTAL_BUFFER_KM * 1000,
        color: "oklch(0.55 0.085 205)",
        weight: 1,
        fillOpacity: 0.06,
      }).addTo(map);

      // Add Localized Coastal City Markers
      try {
        const { COASTAL_CITIES } = await import("@/data/maritimeData");
        const { getLocalizedCityName } = await import("@/data/localizedGeo");
        
        COASTAL_CITIES.filter((c) => c.priority).forEach((city) => {
          const localizedName = getLocalizedCityName(city.id, city.name, lang);
          const cityIcon = L.divIcon({
            className: "orca-city-pin",
            html: `<div style="display:inline-flex;align-items:center;gap:3px;background:rgba(15,23,42,0.85);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:10px;border:1px solid rgba(255,255,255,0.4);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);"><span style="width:4px;height:4px;border-radius:50%;background:#38bdf8;"></span>${localizedName}</div>`,
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
  }, [center.lat, center.lon]);

  return (
    <div
      ref={el}
      style={{ height }}
      className="w-full overflow-hidden rounded-md border border-border"
      role="application"
      aria-label={t("map.title")}
    />
  );
}
