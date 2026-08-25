import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Anchor,
  Fish,
  AlertTriangle,
  Shield,
  Layers,
  MapPin,
  Compass,
} from 'lucide-react';
import type { LocationCoords, PFZEvidenceItem, GisLayerState } from '../context/AppContext';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';

// Fix Leaflet default marker icon paths in Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Vessel SVG Icon with animated pulse beacon
const createVesselIcon = () =>
  L.divIcon({
    className: 'custom-vessel-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(13, 148, 136, 0.25); animation: radar-pulse-glow 2s infinite;"></div>
        <div style="width: 22px; height: 22px; border-radius: 50%; background: #0A2540; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 7px; height: 7px; border-radius: 50%; background: #0D9488;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

// Custom PFZ Fish Icon
const createPFZIcon = () =>
  L.divIcon({
    className: 'custom-pfz-marker',
    html: `
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0284C7; border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/>
          <path d="M18 12v.5"/>
          <path d="m16 10-.5 4"/>
          <path d="m3 5 3 7-3 7"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

// Custom Harbor Port Icon
const createPortIcon = (isCurrent: boolean) =>
  L.divIcon({
    className: 'custom-port-marker',
    html: `
      <div style="display: flex; align-items: center; gap: 4px; background: ${isCurrent ? '#0D9488' : '#FFFFFF'}; color: ${isCurrent ? '#FFFFFF' : '#0F172A'}; padding: 3px 8px; border-radius: 12px; border: 1.5px solid ${isCurrent ? '#FFFFFF' : '#CBD5E1'}; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 11px; font-weight: 700; white-space: nowrap;">
        <span>⚓</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

// Map Controller to smoothly re-center on vessel
function MapRecenter({ coords }: { coords: LocationCoords }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([coords.lat, coords.lon], Math.max(map.getZoom(), 8), {
      duration: 1.2,
    });
  }, [coords.lat, coords.lon, map]);
  return null;
}

// Map Click Handler for selecting coordinates
function MapClickHandler({ onSelectCoords }: { onSelectCoords?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onSelectCoords) {
        onSelectCoords(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface MarineMapProps {
  userLocation: LocationCoords;
  pfzZones?: PFZEvidenceItem[];
  layers?: GisLayerState;
  onSelectCoords?: (lat: number, lon: number) => void;
  className?: string;
}

export default function MarineMap({
  userLocation,
  pfzZones = [],
  layers = {
    pfz: true,
    geofence: true,
    route: true,
    sst: true,
    chlorophyll: true,
    waves: true,
    wind: true,
    eez: true,
    ports: true,
    vessels: true,
  },
  onSelectCoords,
  className = 'h-full w-full',
}: MarineMapProps) {
  const [mapType, setMapType] = useState<'carto' | 'satellite' | 'osm'>('carto');

  // Authoritative IMBL Boundary lines (Sir Creek & Palk Strait)
  const imblSirCreek: [number, number][] = [
    [23.65, 68.05],
    [23.35, 68.0],
    [23.0, 67.9],
    [22.5, 67.8],
  ];

  const imblPalkStrait: [number, number][] = [
    [9.8, 79.55],
    [9.35, 79.25],
    [9.0, 79.05],
    [8.8, 78.9],
  ];

  // Marine Protected Areas (Gulf of Mannar, Gulf of Kutch)
  const mpaGulfOfMannar: [number, number][] = [
    [8.85, 78.85],
    [9.15, 79.15],
    [9.25, 79.35],
    [8.95, 79.05],
  ];

  const mpaGulfOfKutch: [number, number][] = [
    [22.45, 69.5],
    [22.65, 69.9],
    [22.8, 70.2],
    [22.55, 69.8],
  ];

  const vesselIcon = useMemo(() => createVesselIcon(), []);
  const pfzIcon = useMemo(() => createPFZIcon(), []);

  // Tile layers
  const tileConfig = {
    carto: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
  }[mapType];

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 ${className}`}>
      {/* Map Style Selector Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setMapType('carto')}
          className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
            mapType === 'carto' ? 'bg-[#0A2540] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Nautical
        </button>
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
            mapType === 'satellite' ? 'bg-[#0A2540] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={8}
        minZoom={4}
        maxZoom={18}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
        <MapRecenter coords={userLocation} />
        {onSelectCoords && <MapClickHandler onSelectCoords={onSelectCoords} />}

        {/* ─── 1. Vessel Current Location Marker ─── */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={vesselIcon}>
          <Popup className="orca-map-popup">
            <div className="p-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs mb-1">
                <Anchor className="h-4 w-4 text-[#0D9488]" />
                <span>Active Vessel Station</span>
              </div>
              <p className="text-[11px] font-mono text-slate-600">
                Coordinates: {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
              </p>
              <span className="mt-1.5 inline-block rounded-sm bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                Operational Anchor
              </span>
            </div>
          </Popup>
        </Marker>

        {/* ─── 2. Potential Fishing Zones (PFZ Fronts) ─── */}
        {layers.pfz &&
          pfzZones.map((zone, idx) => (
            <Marker key={zone.id || idx} position={[zone.latitude, zone.longitude]} icon={pfzIcon}>
              <Popup>
                <div className="p-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900 text-xs mb-1">
                    <Fish className="h-4 w-4 text-sky-600" />
                    <span>{zone.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Depth: <strong className="text-slate-800">{zone.depth_m || 45} m</strong>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Target Species:{' '}
                    <strong className="text-slate-800">
                      {Array.isArray(zone.species) ? zone.species.join(', ') : 'Tuna, Mackerel'}
                    </strong>
                  </p>
                  <span className="mt-1.5 inline-block rounded-sm bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[10px] font-bold">
                    INCOIS PFZ Mission
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* ─── 3. International Boundary (IMBL) Lines ─── */}
        {layers.geofence && (
          <>
            {/* Sir Creek IMBL Line (Red Alert) */}
            <Polyline
              positions={imblSirCreek}
              pathOptions={{
                color: '#DC2626',
                weight: 3.5,
                dashArray: '8, 8',
              }}
            >
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold text-red-700">
                    India-Pakistan IMBL (Sir Creek)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sovereign International Boundary. Crossing strictly prohibited by law.
                  </p>
                </div>
              </Popup>
            </Polyline>

            {/* Palk Strait IMBL Line */}
            <Polyline
              positions={imblPalkStrait}
              pathOptions={{
                color: '#DC2626',
                weight: 3.5,
                dashArray: '8, 8',
              }}
            >
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold text-red-700">
                    India-Sri Lanka IMBL (Palk Strait)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    International Maritime Boundary Line. Strict surveillance by Indian Coast Guard.
                  </p>
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* ─── 4. Marine Protected Areas (MPAs) ─── */}
        {layers.geofence && (
          <>
            <Polygon
              positions={mpaGulfOfMannar}
              pathOptions={{
                color: '#D97706',
                fillColor: '#F59E0B',
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold text-amber-800">
                    Gulf of Mannar Marine National Park
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Protected coral biosphere. Commercial trawling prohibited.
                  </p>
                </div>
              </Popup>
            </Polygon>

            <Polygon
              positions={mpaGulfOfKutch}
              pathOptions={{
                color: '#D97706',
                fillColor: '#F59E0B',
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold text-amber-800">
                    Marine National Park (Gulf of Kutch)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Mangrove and coral marine sanctuary. Regulated maritime zone.
                  </p>
                </div>
              </Popup>
            </Polygon>
          </>
        )}
      </MapContainer>
    </div>
  );
}
