import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { PFZEvidenceItem } from '../App';

/**
 * Creates glowing tactical HTML marker icon for INCOIS Potential Fishing Zones (PFZ).
 */
const createPFZIcon = () => {
  return L.divIcon({
    className: 'custom-pfz-marker',
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 cursor-pointer group">
        <div class="absolute w-9 h-9 rounded-full bg-emerald-500/20 pulse-beacon"></div>
        <div class="absolute w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"></div>
        <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-md flex items-center justify-center text-white text-[10px] font-bold">
          🐟
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

interface PFZMarkerProps {
  zone: PFZEvidenceItem;
}

export default function PFZMarker({ zone }: PFZMarkerProps) {
  if (!zone || typeof zone.latitude !== 'number' || typeof zone.longitude !== 'number') {
    return null;
  }

  const icon = createPFZIcon();

  // Normalize species into an array
  let speciesList: string[] = [];
  if (Array.isArray(zone.species)) {
    speciesList = zone.species;
  } else if (typeof zone.species === 'string') {
    speciesList = (zone.species as string).split(',').map((s) => s.trim()).filter(Boolean);
  }

  return (
    <Marker position={[zone.latitude, zone.longitude]} icon={icon}>
      <Popup className="orca-pfz-popup">
        <div className="p-2.5 min-w-[240px] text-xs font-sans text-slate-800">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-800 text-sm">
              <span className="text-base">🐟</span>
              <span>{zone.name || 'INCOIS PFZ Zone'}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold">
              HIGH YIELD
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span className="text-slate-500">Distance from Vessel:</span>
              <span className="font-bold text-teal-700">
                {zone.distance_km != null ? `${zone.distance_km} km` : 'Near Vessel'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span className="text-slate-500">Water Depth:</span>
              <span className="font-semibold text-slate-700">
                {zone.depth_m != null ? `~${Math.round(zone.depth_m)} m` : '35 - 65 m'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span className="text-slate-500">Coordinates:</span>
              <span className="text-slate-700">
                {zone.latitude.toFixed(4)}°N, {zone.longitude.toFixed(4)}°E
              </span>
            </div>
          </div>

          {speciesList.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 flex items-center gap-1 font-bold">
                <span>🎯</span> Dominant Pelagic Species:
              </div>
              <div className="flex flex-wrap gap-1">
                {speciesList.map((sp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-medium"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Advisory Source:</span>
            <span className="text-emerald-700 font-bold">{zone.source || 'INCOIS OceanSat-3'}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

