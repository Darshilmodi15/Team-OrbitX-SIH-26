import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * Creates custom styled HTML marker icon for Potential Fishing Zones (PFZ).
 */
const createPFZIcon = (name) => {
  return L.divIcon({
    className: 'custom-pfz-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-7 h-7 rounded-full bg-emerald-500/20 animate-ping"></div>
        <div class="absolute w-5 h-5 rounded-full bg-emerald-500/40 border border-emerald-400"></div>
        <div class="relative w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] flex items-center justify-center text-[8px]">
          🐟
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export default function PFZMarker({ zone }) {
  if (!zone || typeof zone.latitude !== 'number' || typeof zone.longitude !== 'number') {
    return null;
  }

  const icon = createPFZIcon(zone.name);

  // Normalize species into an array
  let speciesList = [];
  if (Array.isArray(zone.species)) {
    speciesList = zone.species;
  } else if (typeof zone.species === 'string') {
    speciesList = zone.species.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (zone.dominant_species) {
    speciesList = Array.isArray(zone.dominant_species)
      ? zone.dominant_species
      : zone.dominant_species.replace('(INCOIS Advisory)', '').split('&').map((s) => s.trim()).filter(Boolean);
  }

  return (
    <Marker position={[zone.latitude, zone.longitude]} icon={icon}>
      <Popup className="orca-pfz-popup">
        <div className="p-1 min-w-[200px] text-xs font-sans">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm border-b border-slate-700/80 pb-1.5 mb-2">
            <span>🐟</span>
            <span>{zone.name || 'Potential Fishing Zone'}</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Distance:</span>
              <span className="font-semibold text-[#00f0ff]">
                {zone.distance_km != null ? `${zone.distance_km} km` : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Depth:</span>
              <span className="font-semibold text-slate-200">
                {zone.depth_m != null ? `~${Math.round(zone.depth_m)} m` : '20-40 m'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Coordinates:</span>
              <span className="text-slate-300">
                {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          {speciesList.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                Dominant Species:
              </div>
              <ul className="list-disc list-inside text-slate-200 space-y-0.5 text-[11px]">
                {speciesList.map((sp, idx) => (
                  <li key={idx}>{sp}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-right text-slate-400">
            Source: <span className="text-emerald-400 font-semibold">{zone.source || 'INCOIS-derived'}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
