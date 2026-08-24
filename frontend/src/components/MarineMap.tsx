import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PFZMarker from './PFZMarker';
import type { LocationCoords, PFZEvidenceItem } from '../App';

/**
 * Creates custom glowing tactical icon for user's vessel location.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 cursor-pointer">
        <div class="absolute w-10 h-10 rounded-full bg-cyan-400/20 pulse-beacon"></div>
        <div class="absolute w-7 h-7 rounded-full bg-cyan-500/30 border border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
        <div class="relative w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-200 shadow-[0_0_10px_#22d3ee] flex items-center justify-center text-[10px]">
          📍
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
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

    // Initial resize trigger
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

interface MapBoundsUpdaterProps {
  center: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}

/**
 * Helper component that dynamically bounds or centers map to include all active markers.
 */
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
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 10, animate: true });
    } else {
      map.setView([center.lat, center.lon], 9, { animate: true });
    }
  }, [map, center, pfzZones]);

  return null;
}

export interface MarineMapProps {
  userLocation: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}

export default function MarineMap({ userLocation, pfzZones = [] }: MarineMapProps) {
  const userIcon = createUserIcon();

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden bg-[#020617]">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={9}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
        {/* High-Resolution Ocean / Voyager Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapResizer />
        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

        {/* User Vessel Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
          <Popup className="orca-user-popup">
            <div className="p-2 min-w-[200px] text-xs font-sans">
              <div className="font-bold text-[#22d3ee] text-sm flex items-center gap-1.5 border-b border-slate-700/80 pb-1.5 mb-2">
                <span>📍</span>
                <span>Vessel GPS Station</span>
              </div>
              <div className="text-[11px] text-slate-200 font-mono space-y-1">
                <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded">
                  <span className="text-slate-400">Latitude:</span>
                  <span>{userLocation.lat.toFixed(4)}°N</span>
                </div>
                <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded">
                  <span className="text-slate-400">Longitude:</span>
                  <span>{userLocation.lon.toFixed(4)}°E</span>
                </div>
                <div className="text-emerald-400 font-semibold pt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                  <span>AIS Telemetry Active</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Dynamically Render PFZ Evidence Markers from Backend */}
        {pfzZones.map((zone, idx) => (
          <PFZMarker key={zone.id || `${zone.latitude}-${zone.longitude}-${idx}`} zone={zone} />
        ))}
      </MapContainer>

      {/* Floating Tactical Map Overlay / Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 shadow-2xl text-xs font-mono">
        <div className="text-slate-200 font-bold text-[11px] mb-2.5 flex items-center justify-between gap-4 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]"></span>
            <span className="tracking-wider">TACTICAL GIS RADAR</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-cyan-300 border border-cyan-500/30">
            {pfzZones.length} PFZ Layer{pfzZones.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] inline-block shrink-0"></span>
            <span>Vessel Position ({userLocation.lat.toFixed(2)}°, {userLocation.lon.toFixed(2)}°)</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] inline-block shrink-0"></span>
            <span>INCOIS Potential Fishing Zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}
