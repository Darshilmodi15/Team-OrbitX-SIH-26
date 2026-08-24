import React from 'react';
import { Layers } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';

interface MapControlsProps {
  showSST: boolean;
  setShowSST: (val: boolean) => void;
  showChlorophyll: boolean;
  setShowChlorophyll: (val: boolean) => void;
  showWaves: boolean;
  setShowWaves: (val: boolean) => void;
  showWind: boolean;
  setShowWind: (val: boolean) => void;
  showGeofence: boolean;
  setShowGeofence: (val: boolean) => void;
  showPFZ: boolean;
  setShowPFZ: (val: boolean) => void;
  showRoute: boolean;
  setShowRoute: (val: boolean) => void;
  currentLang: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  showSST,
  setShowSST,
  showChlorophyll,
  setShowChlorophyll,
  showWaves,
  setShowWaves,
  showWind,
  setShowWind,
  showGeofence,
  setShowGeofence,
  showPFZ,
  setShowPFZ,
  showRoute,
  setShowRoute,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const toggleButtons = [
    {
      id: 'pfz',
      label: t.pfzLayer || 'Potential Fishing Zones (PFZ)',
      active: showPFZ,
      onClick: () => setShowPFZ(!showPFZ),
      icon: '🐟',
      activeColor: 'bg-emerald-500/30 text-emerald-300 border-emerald-400',
    },
    {
      id: 'geofence',
      label: t.geofenceLayer || 'IMBL & MPA Geofences',
      active: showGeofence,
      onClick: () => setShowGeofence(!showGeofence),
      icon: '🛑',
      activeColor: 'bg-rose-500/30 text-rose-300 border-rose-400',
    },
    {
      id: 'route',
      label: t.routeLayer || 'Weather-Safe Nav Route',
      active: showRoute,
      onClick: () => setShowRoute(!showRoute),
      icon: '🧭',
      activeColor: 'bg-cyan-500/30 text-cyan-300 border-cyan-400',
    },
    {
      id: 'sst',
      label: t.sstLayer || 'SST Thermal Fronts',
      active: showSST,
      onClick: () => setShowSST(!showSST),
      icon: '🌡️',
      activeColor: 'bg-orange-500/30 text-orange-300 border-orange-400',
    },
    {
      id: 'chloro',
      label: t.chloroLayer || 'Chlorophyll-a Blooms',
      active: showChlorophyll,
      onClick: () => setShowChlorophyll(!showChlorophyll),
      icon: '🌿',
      activeColor: 'bg-green-500/30 text-green-300 border-green-400',
    },
    {
      id: 'waves',
      label: t.wavesLayer || 'High Wave Contours',
      active: showWaves,
      onClick: () => setShowWaves(!showWaves),
      icon: '🌊',
      activeColor: 'bg-blue-500/30 text-blue-300 border-blue-400',
    },
    {
      id: 'wind',
      label: t.windLayer || 'Wind Streamlines',
      active: showWind,
      onClick: () => setShowWind(!showWind),
      icon: '💨',
      activeColor: 'bg-teal-500/30 text-teal-300 border-teal-400',
    },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 glass-panel rounded-xl p-2.5 max-w-[260px] shadow-2xl border border-cyan-500/30 space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>GIS Satellite Layers</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-mono">ISRO EO</span>
      </div>

      <div className="space-y-1.5">
        {toggleButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
              btn.active
                ? `${btn.activeColor} shadow-sm font-semibold`
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{btn.icon}</span>
              <span className="truncate">{btn.label}</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                btn.active ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
