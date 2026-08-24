import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { PFZEvidenceItem } from '../App';

/**
 * Creates ultra-modern glowing tactical HTML marker icon for INCOIS Potential Fishing Zones (PFZ).
 */
const createPFZIcon = () => {
  return L.divIcon({
    className: 'custom-pfz-marker',
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 cursor-pointer group">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/25 pulse-beacon"></div>
        <div class="absolute w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.5)]"></div>
        <div class="relative w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-300 shadow-[0_0_8px_#34d399] flex items-center justify-center text-[10px]">
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
        <div className="p-2 min-w-[220px] text-xs font-sans">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
              <span className="text-base">🐟</span>
              <span>{zone.name || 'INCOIS PFZ Zone'}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono font-semibold">
              HIGH YIELD
            </span>
          </div>

          <div className="space-y-2 font-mono text-[11px] text-slate-200">
            <div className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">Distance from Vessel:</span>
              <span className="font-bold text-[#22d3ee]">
                {zone.distance_km != null ? `${zone.distance_km} km` : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">Target Water Depth:</span>
              <span className="font-semibold text-slate-200">
                {zone.depth_m != null ? `~${Math.round(zone.depth_m)} m` : '20-40 m'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
              <span className="text-slate-400">Coordinates:</span>
              <span className="text-slate-300">
                {zone.latitude.toFixed(4)}°N, {zone.longitude.toFixed(4)}°E
              </span>
            </div>
          </div>

          {speciesList.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <span>🎯</span> Dominant Pelagic Species:
              </div>
              <div className="flex flex-wrap gap-1">
                {speciesList.map((sp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60 text-[10px]"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Advisory Provenance:</span>
            <span className="text-emerald-400 font-semibold">{zone.source || 'INCOIS-derived'}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
