import { useEffect, useState, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Polygon,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  Radio,
  Fish,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Wind,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';
import type { LocationCoords, PFZEvidenceItem, HighlightedMapTarget } from '../context/AppContext';
import { COASTAL_CITIES, INDIAN_PORTS, type Port } from '../data/maritimeData';
import {
  getLocalizedCityName,
  getLocalizedPort,
  getLocalizedGeofence,
  getLocalizedSeaName,
} from '../data/localizedGeo';
import { computeCoastDistance } from '../utils/geospatial';

/* ═══════════════════════════════════════════════════
   High-Contrast Outdoor & Sunlight-Safe Icon Factories
   ═══════════════════════════════════════════════════ */

const createUserVesselIcon = () =>
  L.divIcon({
    className: 'custom-vessel-marker',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 cursor-pointer">
        <div class="absolute w-10 h-10 rounded-full bg-cyan-400/30 animate-ping"></div>
        <div class="absolute w-7 h-7 rounded-full bg-[#0A2540] border-2 border-[#22d3ee] shadow-lg flex items-center justify-center">
          <span class="text-white text-xs">⚓</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const createSelectedPinIcon = () =>
  L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 cursor-pointer">
        <div class="w-8 h-8 rounded-full bg-[#0D9488] border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-bold">
          📍
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

const createPFZIcon = (yieldLevel = 'High') =>
  L.divIcon({
    className: 'custom-pfz-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-400/20 group-hover:scale-125 transition"></div>
        <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold">
          🐟
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createPortMarkerIcon = (portName?: string) =>
  L.divIcon({
    className: 'custom-port-marker',
    html: `
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0A2540]/90 backdrop-blur-xs border border-cyan-400/80 shadow-md cursor-pointer hover:scale-110 hover:border-cyan-300 transition">
        <span class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-white text-[8px] font-bold">⚓</span>
        ${portName ? `<span class="text-[10px] font-sans font-bold text-cyan-100 whitespace-nowrap leading-none">${portName}</span>` : ''}
      </div>
    `,
    iconSize: [110, 24],
    iconAnchor: [15, 12],
  });

const createCityLabelIcon = (cityName: string, isPriority: boolean) =>
  L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-xs border ${
        isPriority ? 'border-amber-400/80 shadow-amber-500/20' : 'border-slate-400/60'
      } shadow-md whitespace-nowrap cursor-pointer hover:scale-110 hover:border-teal-300 hover:bg-slate-900 transition">
        <span class="w-1.5 h-1.5 rounded-full ${isPriority ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'} shrink-0"></span>
        <span class="text-[10.5px] font-sans font-bold text-white tracking-wide leading-none">${cityName}</span>
      </div>
    `,
    iconSize: [90, 22],
    iconAnchor: [45, 11],
  });

/* ═══════════════════════════════════════════════════
   Map Helper Subcomponents
   ═══════════════════════════════════════════════════ */

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

interface MapControllerProps {
  center: LocationCoords;
  highlightTarget: HighlightedMapTarget | null;
}

function MapController({ center, highlightTarget }: MapControllerProps) {
  const map = useMap();

  // If AI focused on a specific target (e.g. PFZ or Hazard), fly to it smoothly
  useEffect(() => {
    if (!map) return;
    if (highlightTarget && highlightTarget.lat && highlightTarget.lon) {
      map.flyTo([highlightTarget.lat, highlightTarget.lon], highlightTarget.zoom || 10, {
        duration: 1.2,
      });
    }
  }, [map, highlightTarget]);

  return null;
}

interface MapEventsHandlerProps {
  onMapClick: (lat: number, lon: number) => void;
}

function MapEventsHandler({ onMapClick }: MapEventsHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ═══════════════════════════════════════════════════
   Main MarineMap Component Props & Interface
   ═══════════════════════════════════════════════════ */

export interface MarineMapProps {
  userLocation?: LocationCoords;
  pfzZones?: PFZEvidenceItem[];
  route?: any;
  geofences?: any[];
  alerts?: any[];
  layers?: any;
  onSelectCoords?: (lat: number, lon: number) => void;
  className?: string;
  isInteractive?: boolean;
}

export default function MarineMap({
  userLocation: propUserLocation,
  pfzZones: propPfzZones,
  route: propRoute,
  geofences: propGeofences,
  alerts: propAlerts,
  onSelectCoords,
  className = 'h-full w-full',
  isInteractive = true,
}: MarineMapProps) {
  const {
    userLocation: contextUserLocation,
    handleUpdateUserLocation,
    pfzZones: contextPfzZones,
    highlightedMapTarget,
    setHighlightedMapTarget,
    dataFreshnessText,
    currentLang,
    coastInfo,
    showFarFromCoastWarning,
    dismissFarFromCoastWarning,
    handleSendMessage,
  } = useAppContext();

  const t = getStrings(currentLang);
  const activeUserLocation = propUserLocation || contextUserLocation;
  const activePfzZones = propPfzZones || contextPfzZones;

  // ── Basemap State (Satellite vs Standard) ──
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'standard'>('satellite');

  // ── Layer Toggles ──
  const [showPFZ, setShowPFZ] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showWeatherVectors, setShowWeatherVectors] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Bottom Sheet / Contextual Panel Selection ──
  const [selectedZone, setSelectedZone] = useState<PFZEvidenceItem | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<any | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Real Satellite Basemap (Esri World Imagery) vs Standard Voyager
  const tileUrl =
    baseMapType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const tileAttribution =
    baseMapType === 'satellite'
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
      : '&copy; OpenStreetMap contributors &copy; CARTO';

  // Map Click Handler: Updates coordinates and computes real coast distance
  const handleMapClick = (lat: number, lon: number) => {
    if (!isInteractive) return;
    if (onSelectCoords) {
      onSelectCoords(lat, lon);
    } else {
      handleUpdateUserLocation({ lat, lon });
    }
  };

  const handleToggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen?.().catch(() => null);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => null);
      setIsFullscreen(false);
    }
  };

  // Indian Sovereign Boundary and Geofences Data
  const defaultGeofences = useMemo(
    () => [
      {
        id: 'sir-creek',
        name: 'Sir Creek IMBL Buffer Zone',
        risk_level: 'CRITICAL_DANGER',
        category: 'IMBL',
        description: 'International Maritime Boundary with Pakistan. Commercial fishing restricted.',
        coordinates: [
          [23.7, 68.1],
          [23.6, 68.3],
          [23.2, 68.2],
          [23.3, 67.9],
          [23.7, 68.1],
        ],
      },
      {
        id: 'palk-strait',
        name: 'Palk Strait Sovereign Boundary',
        risk_level: 'CRITICAL_DANGER',
        category: 'IMBL',
        description: 'International boundary between India and Sri Lanka.',
        coordinates: [
          [10.1, 79.8],
          [9.8, 79.9],
          [9.3, 79.5],
          [9.5, 79.2],
          [10.1, 79.8],
        ],
      },
      {
        id: 'malvan-mpa',
        name: 'Malvan Coral Marine Sanctuary',
        risk_level: 'RESTRICTED_MPA',
        category: 'MPA',
        description: 'Ecologically sensitive marine protected area. Commercial trawling prohibited.',
        coordinates: [
          [16.1, 73.4],
          [16.1, 73.55],
          [15.95, 73.55],
          [15.95, 73.4],
          [16.1, 73.4],
        ],
      },
      {
        id: 'gulf-of-mannar',
        name: 'Gulf of Mannar Marine Biosphere Reserve',
        risk_level: 'RESTRICTED_MPA',
        category: 'MPA',
        description: 'National Marine Park covering 21 coral islands. Regulated artisanal fishing only.',
        coordinates: [
          [9.3, 79.0],
          [9.3, 79.3],
          [8.8, 78.4],
          [8.8, 78.1],
          [9.3, 79.0],
        ],
      },
    ],
    []
  );

  const activeGeofences = propGeofences || defaultGeofences;

  return (
    <div
      ref={mapContainerRef}
      className={`relative overflow-hidden bg-[#0A192F] select-none ${className}`}
    >
      <MapContainer
        center={[activeUserLocation.lat, activeUserLocation.lon]}
        zoom={8}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="h-full w-full z-0"
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />
        <MapResizer />
        <MapController center={activeUserLocation} highlightTarget={highlightedMapTarget} />
        <MapEventsHandler onMapClick={handleMapClick} />

        {/* ── 1. User Vessel GPS Station Marker ── */}
        <Marker
          position={[activeUserLocation.lat, activeUserLocation.lon]}
          icon={createUserVesselIcon()}
        />

        {/* ── 2. Potential Fishing Zones (PFZ) ── */}
        {showPFZ &&
          activePfzZones.map((zone, idx) => (
            <Marker
              key={zone.id || `pfz-${idx}`}
              position={[zone.latitude, zone.longitude]}
              icon={createPFZIcon()}
              eventHandlers={{
                click: () => {
                  setSelectedZone(zone);
                  setHighlightedMapTarget({
                    lat: zone.latitude,
                    lon: zone.longitude,
                    title: zone.name,
                    type: 'pfz',
                    zoom: 10,
                  });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="text-xs font-sans p-1 bg-white rounded-md text-slate-900 shadow-md">
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <span>🐟</span> {zone.name}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Depth: {zone.depth_m || 45}m • {zone.species?.join(', ') || 'Pelagic'}
                  </p>
                </div>
              </Tooltip>
            </Marker>
          ))}

        {/* ── 3. Maritime Geofences & Sovereign Boundaries ── */}
        {showGeofences &&
          activeGeofences.map((g: any) => {
            if (!g.coordinates || g.coordinates.length < 3) return null;
            const color = g.risk_level === 'CRITICAL_DANGER' ? '#DC2626' : '#D97706';
            const positions: [number, number][] = g.coordinates.map((c: any) => [c[0], c[1]]);

            return (
              <Polygon
                key={`geo-${g.id}`}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: 2,
                  dashArray: '6, 6',
                  fillColor: color,
                  fillOpacity: 0.18,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedHazard(g);
                  },
                }}
              >
                <Tooltip direction="center" opacity={0.95}>
                  <div className="text-xs font-sans font-bold p-1" style={{ color }}>
                    ⚠️ {g.name}
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* ── 4. Indian Coastal Ports & Stations ── */}
        {showPorts &&
          INDIAN_PORTS.map((port) => (
            <Marker
              key={port.id}
              position={[port.lat, port.lon]}
              icon={createPortMarkerIcon()}
              eventHandlers={{
                click: () => {
                  handleUpdateUserLocation({ lat: port.lat, lon: port.lon });
                },
              }}
            >
              <Tooltip direction="bottom" offset={[0, 8]} opacity={0.9}>
                <div className="text-[10px] font-sans font-bold text-slate-800 p-0.5">
                  ⚓ {port.name}
                </div>
              </Tooltip>
            </Marker>
          ))}

        {/* ── 5. Optional Weather Vector Arrows ── */}
        {showWeatherVectors && (
          <CircleMarker
            center={[activeUserLocation.lat + 0.05, activeUserLocation.lon + 0.05]}
            radius={24}
            pathOptions={{
              color: '#0EA5E9',
              fillColor: '#0EA5E9',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '3, 3',
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <div className="text-xs font-sans font-bold text-sky-800 p-1">
                💨 Wind: 18.5 km/h WSW • Waves: 1.2m
              </div>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {/* ═════════════════════════════════════════════════════
          FLOATING HIGH-CONTRAST TOUCH CONTROLS
          ═════════════════════════════════════════════════════ */}

      {/* Top-Left: Live Data Freshness Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-xl bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono font-bold text-white border border-slate-700/60 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="tracking-wider">{dataFreshnessText}</span>
        <span className="text-slate-400 font-normal">|</span>
        <span className="text-teal-300 font-sans font-semibold">
          {coastInfo.distanceKm.toFixed(1)} km from Coast
        </span>
      </div>

      {/* Top-Right: Satellite vs Standard Map Mode Toggle */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md p-0.5 border border-slate-700/60 shadow-lg text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setBaseMapType('satellite')}
          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
            baseMapType === 'satellite'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={() => setBaseMapType('standard')}
          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
            baseMapType === 'standard'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Nautical
        </button>
      </div>

      {/* Left-Side Floating Action Controls (Cleanly positioned on left so right side is free for assistant & info panel) */}
      <div className="absolute left-3 top-14 z-20 flex flex-col gap-1.5">
        {/* Layer Manager Toggle */}
        <button
          type="button"
          onClick={() => setShowLayersMenu(!showLayersMenu)}
          title="Toggle Marine Layers"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 shadow-md hover:bg-white hover:text-[#0D9488] active:scale-95 transition cursor-pointer"
        >
          <Layers className="h-4 w-4" />
        </button>

        {/* Recenter / GPS Detect */}
        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                handleUpdateUserLocation({
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                });
              });
            }
          }}
          title="Recenter GPS Position"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 shadow-md hover:bg-white hover:text-[#0D9488] active:scale-95 transition cursor-pointer"
        >
          <Navigation className="h-4 w-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 shadow-md hover:bg-white hover:text-[#0D9488] active:scale-95 transition cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Expandable Layer Manager Popout */}
      {showLayersMenu && (
        <div className="absolute left-12 top-14 z-20 w-56 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 shadow-2xl text-xs text-white animate-scaleIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#22d3ee]" />
              <span>ORCA GIS Layers</span>
            </span>
            <button
              type="button"
              onClick={() => setShowLayersMenu(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPFZ(!showPFZ)}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                showPFZ ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Fish className="h-4 w-4 text-emerald-400" />
                <span>Fishing Zones (PFZ)</span>
              </span>
              <span className="font-mono text-[10px] font-bold">{showPFZ ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGeofences(!showGeofences)}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                showGeofences ? 'bg-rose-950/70 border border-rose-500/40 text-rose-300' : 'bg-slate-800/60 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>Geofences & IMBL</span>
              </span>
              <span className="font-mono text-[10px] font-bold">{showGeofences ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPorts(!showPorts)}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                showPorts ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300' : 'bg-slate-800/60 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span>Coastal Ports & Harbors</span>
              </span>
              <span className="font-mono text-[10px] font-bold">{showPorts ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWeatherVectors(!showWeatherVectors)}
              className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                showWeatherVectors ? 'bg-sky-950/70 border border-sky-500/40 text-sky-300' : 'bg-slate-800/60 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-sky-400" />
                <span>Wind Vectors (Opt-in)</span>
              </span>
              <span className="font-mono text-[10px] font-bold">{showWeatherVectors ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          BOTTOM SHEET: TAP PFZ / GEOSPATIAL INTELLIGENCE
          ═════════════════════════════════════════════════════ */}
      {selectedZone && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-20 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 shadow-2xl text-white animate-fadeIn">
          <div className="flex items-start justify-between pb-2 border-b border-slate-800 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                <Fish className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">{selectedZone.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedZone.latitude.toFixed(2)}°N, {selectedZone.longitude.toFixed(2)}°E
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedZone(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Distance to Vessel</span>
              <span className="font-bold text-emerald-400 text-sm">
                {selectedZone.distance_km?.toFixed(1) || '24.5'} km
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Depth Profile</span>
              <span className="font-bold text-slate-200 text-sm">{selectedZone.depth_m || 45} m</span>
            </div>
          </div>

          <div className="mb-3 text-xs text-slate-300">
            <span className="text-slate-400">Target Species:</span>{' '}
            <strong className="text-white">{selectedZone.species?.join(', ') || 'Pelagic Fish'}</strong>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleSendMessage(`Tell me the sea conditions and optimal route to reach ${selectedZone.name}.`);
                setSelectedZone(null);
              }}
              className="flex-1 rounded-xl bg-[#0D9488] py-2 text-xs font-bold text-white shadow-md hover:bg-[#0F766E] transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Ask ORCA in Chat</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          FAR-FROM-COAST WARNING OVERLAY
          ═════════════════════════════════════════════════════ */}
      {showFarFromCoastWarning && (
        <div className="absolute top-16 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-20 rounded-xl bg-amber-950/90 backdrop-blur-xl border border-amber-500/50 p-3 text-white shadow-2xl animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-amber-200 text-sm">Far from Coast Warning</h4>
              <p className="text-slate-200 mt-1 leading-relaxed">
                Your selected location is <strong>{coastInfo.distanceKm} km</strong> from the coastline (threshold: 100 km).
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={dismissFarFromCoastWarning}
                  className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                >
                  Confirm Position
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateUserLocation({ lat: 18.9220, lon: 72.8347 }); // Recenter Mumbai
                    dismissFarFromCoastWarning();
                  }}
                  className="text-xs text-amber-200 underline hover:text-white"
                >
                  Reset to Coastal Port
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
