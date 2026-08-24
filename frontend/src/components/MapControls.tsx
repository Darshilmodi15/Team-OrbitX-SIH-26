import React from 'react';
import { Layers, Info } from 'lucide-react';
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

  const layerItems = [
    {
      id: 'pfz',
      label: t.pfzLayer || 'Potential Fishing Zones',
      description: 'ISRO Chlorophyll & SST High-Yield',
      active: showPFZ,
      onToggle: () => setShowPFZ(!showPFZ),
      icon: '🐟',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'geofence',
      label: t.geofenceLayer || 'IMBL & MPA Geofences',
      description: 'International Maritime Boundary & MPAs',
      active: showGeofence,
      onToggle: () => setShowGeofence(!showGeofence),
      icon: '🛑',
      iconBg: 'bg-rose-50 text-rose-600',
    },
    {
      id: 'route',
      label: t.routeLayer || 'Weather-Safe Nav Route',
      description: 'A* Hazard-Evasive Waypoints',
      active: showRoute,
      onToggle: () => setShowRoute(!showRoute),
      icon: '🧭',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'sst',
      label: t.sstLayer || 'SST Thermal Fronts',
      description: 'Sea Surface Temp Ocean Color',
      active: showSST,
      onToggle: () => setShowSST(!showSST),
      icon: '🌡️',
      iconBg: 'bg-orange-50 text-orange-600',
    },
    {
      id: 'chloro',
      label: t.chloroLayer || 'Chlorophyll-a Blooms',
      description: 'Phytoplankton Pelagic Forage',
      active: showChlorophyll,
      onToggle: () => setShowChlorophyll(!showChlorophyll),
      icon: '🌿',
      iconBg: 'bg-green-50 text-green-600',
    },
    {
      id: 'waves',
      label: t.wavesLayer || 'High Wave Contours',
      description: 'Swell & Rough Sea Sectors',
      active: showWaves,
      onToggle: () => setShowWaves(!showWaves),
      icon: '🌊',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'wind',
      label: t.windLayer || 'Wind Streamlines',
      description: 'Surface Wind Vectors (WSW)',
      active: showWind,
      onToggle: () => setShowWind(!showWind),
      icon: '💨',
      iconBg: 'bg-cyan-50 text-cyan-600',
    },
  ];

  return (
    <aside className="w-full lg:w-[275px] xl:w-[290px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between overflow-y-auto shrink-0 transition-all">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">GIS Satellite Layers</h2>
              <p className="text-[10px] text-slate-400 font-mono">ISRO Oceansat & Copernicus</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            Live EO
          </span>
        </div>

        {/* Layer Switches List (10–14px vertical spacing) */}
        <div className="space-y-3">
          {layerItems.map((item) => (
            <div
              key={item.id}
              onClick={item.onToggle}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                item.active
                  ? 'bg-slate-50/90 border-slate-200/90 shadow-xs'
                  : 'bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-100 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs font-semibold truncate ${item.active ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {item.description}
                  </span>
                </div>
              </div>

              {/* Modern iOS-Style Toggle Switch */}
              <div
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  item.active ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    item.active ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Legend & Maritime Advisory Section */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-2.5 text-[11px] font-sans">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Tactical Map Legend</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className="truncate">PFZ Zone</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
            <span className="truncate">IMBL Boundary</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className="truncate">MPA Reserve</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-xs" />
            <span className="truncate">A* Safe Route</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
