import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { snapshotPFZ, type MarineSnapshot } from "@/lib/orca/snapshot";

/** Only provided snapshot geometry is plotted. Tile imagery is a basemap. */
export default function CoastMap({
  center,
  interactive = true,
  height = 420,
  onSelect,
  satellite = false,
  snapshot,
  showPFZ = true,
  showEEZ = true,
  showConditions = false,
  showLocation = true,
  recenter = 0,
  onInspect,
}: {
  center: Coords;
  interactive?: boolean;
  height?: number;
  onSelect?: (c: Coords) => void;
  satellite?: boolean;
  snapshot?: MarineSnapshot;
  showPFZ?: boolean;
  showEEZ?: boolean;
  showConditions?: boolean;
  showLocation?: boolean;
  recenter?: number;
  onInspect?: () => void;
}) {
  const el = useRef<HTMLDivElement>(null),
    mapRef = useRef<LeafletMap | null>(null),
    layers = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null),
    selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const inspectRef = useRef(onInspect);
  inspectRef.current = onInspect;
  const [ready, setReady] = useState(false),
    [tileError, setTileError] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    setReady(false);
    setTileError(false);
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !el.current) return;
      leaflet.current = L;
      const map = L.map(el.current, {
        center: [center.lat, center.lon],
        zoom: 8,
        fadeAnimation: false,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      if (interactive) L.control.zoom({ position: "bottomright" }).addTo(map);
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
      layers.current = L.layerGroup().addTo(map);
      if (interactive)
        map.on("click", (e) =>
          selectRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng }),
        );
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
      mapRef.current?.remove();
      mapRef.current = null;
      layers.current = null;
    };
  }, [interactive, satellite]);
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
    if (showLocation)
      L.circleMarker([center.lat, center.lon], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#0d9488",
        fillOpacity: 1,
      })
        .bindTooltip(text(t("map.yourPin")))
        .bindPopup(text(`${t("map.yourPin")} · ${center.lat}, ${center.lon}`))
        .on("click", () => inspectRef.current?.())
        .addTo(group);
    if (
      snapshot &&
      showEEZ &&
      snapshot.boundary.availability === "available" &&
      snapshot.boundary.geometry
    ) {
      L.geoJSON(snapshot.boundary.geometry, {
        style: { color: "#a16207", weight: 2, fillOpacity: 0.025 },
        onEachFeature: (_f, layer) =>
          layer.bindPopup(
            text(
              "Marine Regions / VLIZ — EEZ reference polygon; edges may include coastlines.",
            ),
          ),
      }).addTo(group);
    }
    if (snapshot && showPFZ)
      for (const p of snapshotPFZ(snapshot).points) {
        const popup = text(
          `PFZ: ${p.name} · ${p.distanceKm ?? "—"} km · ${snapshot.pfz.source ?? ""} · ${snapshot.pfz.issued_at ?? "—"} → ${snapshot.pfz.valid_until ?? "—"}`,
        );
        const link = document.createElement("a");
        link.textContent = t("nav.assistant");
        link.href = `/assistant?snapshot=${encodeURIComponent(snapshot.snapshot_id)}&prompt=${encodeURIComponent(`Explain the available advisory for PFZ ${p.id} (${p.lat}, ${p.lon}).`)}`;
        link.style.display = "block";
        link.style.marginTop = "12px";
        popup.appendChild(link);
        L.circleMarker([p.lat, p.lon], {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: "#059669",
          fillOpacity: 0.95,
        })
          .bindPopup(popup)
          .addTo(group);
      }
    if (snapshot && showConditions) {
      const grids = new Map<
        string,
        { lat: number; lon: number; lines: string[] }
      >();
      for (const [field, label, unit, value] of [
        [
          "weather.wave_height_m",
          t("marine.wave"),
          "m",
          snapshot.weather.wave_height_m,
        ],
        [
          "weather.wind_speed_kmh",
          t("marine.wind"),
          "km/h",
          snapshot.weather.wind_speed_kmh,
        ],
        ["ocean.sst_c", t("marine.sst"), "°C", snapshot.ocean.sst_c],
      ] as const) {
        const source = snapshot.provenance.fields[field];
        if (
          typeof value !== "number" ||
          source?.grid_lat == null ||
          source.grid_lon == null
        )
          continue;
        const description = `${label}: ${value} ${unit} · ${source.source} · ${source.forecast_valid_at ?? ""}`;
        const key = `${source.grid_lat}:${source.grid_lon}`;
        const grid = grids.get(key) ?? {
          lat: source.grid_lat,
          lon: source.grid_lon,
          lines: [],
        };
        grid.lines.push(description);
        grids.set(key, grid);
      }
      for (const grid of grids.values()) {
        const description = grid.lines.join(" · ");
        L.circleMarker([grid.lat, grid.lon], {
          radius: 11,
          color: "#2563eb",
          fillOpacity: 0.12,
        })
          .bindPopup(text(description))
          .bindTooltip(text(description))
          .addTo(group);
      }
    }
  }, [
    ready,
    center.lat,
    center.lon,
    snapshot,
    showPFZ,
    showEEZ,
    showConditions,
    showLocation,
    t,
  ]);
  useEffect(() => {
    if (ready)
      mapRef.current?.setView(
        [center.lat, center.lon],
        mapRef.current.getZoom(),
      );
  }, [ready, center.lat, center.lon, recenter]);
  return (
    <div className="coast-map space-y-2">
      {tileError && (
        <p role="status" className="text-sm">
          Map tiles unavailable. Snapshot values remain available below.
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
