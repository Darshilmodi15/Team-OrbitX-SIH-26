import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PFZMarker from './PFZMarker';
import type { LocationCoords, PFZEvidenceItem } from '../App';

/**
 * Custom icon for user's vessel location.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full bg-cyan-500/25 animate-ping"></div>
        <div class="absolute w-6 h-6 rounded-full bg-cyan-500/40 border border-cyan-300"></div>
        <div class="relative w-3.5 h-3.5 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff] flex items-center justify-center text-[9px]">
          📍
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

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
}

export default function MarineMap({ userLocation, pfzZones = [] }: MarineMapProps) {
  const userIcon = createUserIcon();

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-[#030712]">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={9}
        zoomControl={true}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

        {/* User Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
          <Popup className="orca-user-popup">
            <div className="p-1 text-xs font-sans">
              <div className="font-bold text-[#00f0ff] text-sm flex items-center gap-1 mb-1">
                <span>📍</span>
                <span>Vessel GPS Position</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                <div>Lat: {userLocation.lat.toFixed(4)}°N</div>
                <div>Lon: {userLocation.lon.toFixed(4)}°E</div>
                <div className="text-slate-400 mt-1">Status: Active Station</div>
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
      <div className="absolute top-3 right-3 z-[1000] bg-[#081124]/90 backdrop-blur-md border border-[#00f0ff]/25 rounded-xl p-3 shadow-xl text-xs font-mono">
        <div className="text-slate-200 font-bold text-[11px] mb-2 flex items-center justify-between gap-4 border-b border-slate-700 pb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff]"></span>
            <span>TACTICAL GIS LAYER</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {pfzZones.length} PFZ Target{pfzZones.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff] inline-block shrink-0"></span>
            <span>Vessel Position ({userLocation.lat.toFixed(2)}, {userLocation.lon.toFixed(2)})</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] inline-block shrink-0"></span>
            <span>INCOIS Potential Fishing Zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}
