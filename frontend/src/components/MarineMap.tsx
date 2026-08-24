import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PFZMarker from './PFZMarker';
import type { LocationCoords, PFZEvidenceItem } from '../App';
import type { GisLayerState } from './GisLayersPanel';
import {
  COASTAL_CITIES,
  GEOFENCE_ZONES,
  type CoastalCity,
} from '../data/maritimeData';
import { Satellite, Globe } from 'lucide-react';

/**
 * Creates custom glowing tactical icon for user's vessel location.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-11 h-11 cursor-pointer">
        <div class="absolute w-11 h-11 rounded-full bg-teal-400/30 pulse-beacon"></div>
        <div class="absolute w-8 h-8 rounded-full bg-[#0F766E]/40 border-2 border-teal-300 shadow-[0_0_16px_rgba(15,118,110,0.8)]"></div>
        <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-[#0F766E] to-[#0284C7] shadow-md flex items-center justify-center text-white text-[10px] font-bold border border-white">
          🚢
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

/**
 * Creates subtle label icon for coastal port cities.
 */
const createCityLabelIcon = (city: CoastalCity) => {
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div class="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-slate-700/60 shadow-sm text-slate-200 text-[10px] font-medium whitespace-nowrap">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        <span>${city.name}</span>
      </div>
    `,
    iconSize: [80, 20],
    iconAnchor: [40, 10],
  });
};

/**
 * Helper component that forces Leaflet to invalidate container size
 * and re-render tiles smoothly on mount and window resize.
 */
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

/**
 * Map click handler to relocate vessel GPS station.
 */
function MapClickHandler({ onRelocateVessel }: { onRelocateVessel?: (coords: LocationCoords) => void }) {
  useMapEvents({
    click(e) {
      if (onRelocateVessel) {
        onRelocateVessel({
          lat: Number(e.latlng.lat.toFixed(4)),
          lon: Number(e.latlng.lng.toFixed(4)),
        });
      }
    },
  });
  return null;
}

interface MapBoundsUpdaterProps {
  center: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}

function MapBoundsUpdater({ center, pfzZones }: MapBoundsUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (pfzZones && pfzZones.length > 0) {
      const bounds = L.latLngBounds([[center.lat, center.lon]]);
      pfzZones.forEach((z) => {
        if (typeof z.latitude === 'number' && typeof z.longitude === 'number') {
          bounds.extend([z.latitude, z.longitude]);
        }
      });
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
    } else {
      map.setView([center.lat, center.lon], 9, { animate: true });
    }
  }, [map, center, pfzZones]);

  return null;
}

export interface MarineMapProps {
  userLocation: LocationCoords;
  pfzZones: PFZEvidenceItem[];
  layers?: GisLayerState;
  onRelocateVessel?: (coords: LocationCoords) => void;
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
  },
  onRelocateVessel,
}: MarineMapProps) {
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'standard'>('satellite');
  const userIcon = useMemo(() => createUserIcon(), []);

  // Compute waypoint corridor for weather-safe navigation route
  const targetPfz = pfzZones[0] || { latitude: 19.1200, longitude: 72.6200, name: 'Chlorophyll Plume Sector Charlie' };
  const safeRouteWaypoints = useMemo(() => {
    const midLat = (userLocation.lat + targetPfz.latitude) / 2 + 0.05;
    const midLon = (userLocation.lon + targetPfz.longitude) / 2 - 0.04;
    return [
      [userLocation.lat, userLocation.lon] as [number, number],
      [midLat, midLon] as [number, number],
      [targetPfz.latitude, targetPfz.longitude] as [number, number],
    ];
  }, [userLocation, targetPfz]);

  return (
    <div className="relative w-full h-full min-h-[350px] flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
      {/* 1. Base Map Switcher: Satellite vs Standard Map */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setBaseMapType('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            baseMapType === 'satellite'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setBaseMapType('standard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            baseMapType === 'standard'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Standard Map</span>
        </button>
      </div>

      {/* 2. Interactive Leaflet Map Container */}
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={9}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
        {/* Base Map Tile Layers */}
        {baseMapType === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics, ISRO Oceansat'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
        )}

        <MapResizer />
        <MapClickHandler onRelocateVessel={onRelocateVessel} />
        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

        {/* Coastal City Labels */}
        {COASTAL_CITIES.map((city) => (
          <Marker
            key={city.id}
            position={[city.lat, city.lon]}
            icon={createCityLabelIcon(city)}
            interactive={false}
          />
        ))}

        {/* User Vessel Marker */}
        <Marker
          position={[userLocation.lat, userLocation.lon]}
          icon={userIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onRelocateVessel) {
                onRelocateVessel({
                  lat: Number(position.lat.toFixed(4)),
                  lon: Number(position.lng.toFixed(4)),
                });
              }
            },
          }}
        >
          <Popup className="orca-custom-popup">
            <div className="p-2 min-w-[200px] text-xs font-sans">
              <div className="font-bold text-teal-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                <span>🚢</span>
                <span>Active Vessel GPS Position</span>
              </div>
              <div className="space-y-1 text-slate-700 font-mono text-[11px]">
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                  <span className="text-slate-500 font-sans">Latitude:</span>
                  <span className="font-bold">{userLocation.lat.toFixed(4)}°N</span>
                </div>
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                  <span className="text-slate-500 font-sans">Longitude:</span>
                  <span className="font-bold">{userLocation.lon.toFixed(4)}°E</span>
                </div>
                <div className="text-teal-700 font-sans font-semibold text-[10px] pt-1">
                  💡 Drag icon or click sea to relocate vessel
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* 3. GIS LAYER: Weather-Safe Navigational Route Polyline */}
        {layers.route && (
          <Polyline
            positions={safeRouteWaypoints}
            pathOptions={{
              color: '#06b6d4',
              weight: 3.5,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          />
        )}

        {/* 4. GIS LAYER: Potential Fishing Zones (PFZ) & Concentric Yield Rings */}
        {layers.pfz && (
          <>
            {pfzZones.map((zone, idx) => (
              <PFZMarker key={zone.id || `${zone.latitude}-${zone.longitude}-${idx}`} zone={zone} />
            ))}

            {/* Simulated Yield Potential Circles around Mumbai/Maharashtra coast */}
            <Circle
              center={[19.1200, 72.6200]}
              radius={24000}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.18,
                weight: 1.5,
              }}
            />
            <Circle
              center={[18.7200, 72.5800]}
              radius={28000}
              pathOptions={{
                color: '#14b8a6',
                fillColor: '#14b8a6',
                fillOpacity: 0.14,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            />
            <Circle
              center={[18.9850, 72.4500]}
              radius={20000}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.16,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* 5. GIS LAYER: IMBL & MPA Geofence Boundaries */}
        {layers.geofence && (
          <>
            {GEOFENCE_ZONES.map((zone) => (
              <Polyline
                key={zone.id}
                positions={zone.coordinates}
                pathOptions={{
                  color: zone.color || '#ef4444',
                  weight: 3,
                  dashArray: '6, 6',
                  opacity: 0.85,
                }}
              >
                <Popup>
                  <div className="p-1.5 text-xs">
                    <div className="font-bold text-rose-700">{zone.name}</div>
                    <div className="text-slate-600 text-[11px] mt-1">{zone.description}</div>
                  </div>
                </Popup>
              </Polyline>
            ))}

            {/* High Hazard Offshore Sector Buffer */}
            <Circle
              center={[19.3500, 72.2500]}
              radius={32000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '8, 8',
              }}
            />
            <Circle
              center={[19.1800, 72.4200]}
              radius={22000}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />
          </>
        )}

        {/* 6. GIS LAYER: SST Heatmap Thermal Circles */}
        {layers.sst && (
          <Circle
            center={[18.8500, 72.5000]}
            radius={35000}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        )}

        {/* 7. GIS LAYER: Chlorophyll-a Bloom Plumes */}
        {layers.chlorophyll && (
          <Circle
            center={[19.0500, 72.5500]}
            radius={28000}
            pathOptions={{
              color: '#22c55e',
              fillColor: '#22c55e',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}
      </MapContainer>

      {/* 8. Bottom Helper Prompt */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-md text-[11px] font-sans font-medium text-slate-700 pointer-events-none whitespace-nowrap hidden sm:flex items-center gap-1.5">
        <span className="text-teal-600">💡</span>
        <span>Click anywhere on the sea to relocate vessel GPS | Drag 🚢 icon to simulate position</span>
      </div>

      {/* 9. Bottom Left Tactical Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-[10px] font-sans">
        <div className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[9px]">
          Tactical Map Legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
            <span>Your Vessel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>PFZ Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-500 inline-block"></span>
            <span>Safe Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed inline-block"></span>
            <span>IMBL Boundary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>MPA Reserve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
            <span>Hazard Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
