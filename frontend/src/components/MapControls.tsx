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
      label: t.layerPfz || 'Potential Fishing Zones',
      description: t.layerPfzDesc || 'ISRO Chlorophyll & SST High-Yield',
      active: showPFZ,
      onToggle: () => setShowPFZ(!showPFZ),
      icon: '🐟',
      iconBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'geofence',
      label: t.layerGeofence || 'IMBL & MPA Geofences',
      description: t.layerGeofenceDesc || 'International Maritime Boundary & MPAs',
      active: showGeofence,
      onToggle: () => setShowGeofence(!showGeofence),
      icon: '🛑',
      iconBg: 'bg-rose-50 text-rose-700',
    },
    {
      id: 'route',
      label: t.layerRoute || 'Weather-Safe Nav Route',
      description: t.layerRouteDesc || 'A* Hazard-Evasive Waypoints',
      active: showRoute,
      onToggle: () => setShowRoute(!showRoute),
      icon: '🧭',
      iconBg: 'bg-teal-50 text-teal-700',
    },
    {
      id: 'sst',
      label: t.layerSst || 'SST Heatmap',
      description: t.layerSstDesc || 'Sea Surface Temp Ocean Color',
      active: showSST,
      onToggle: () => setShowSST(!showSST),
      icon: '🌡️',
      iconBg: 'bg-orange-50 text-orange-700',
    },
    {
      id: 'chloro',
      label: t.layerChloro || 'Chlorophyll-a Bloom',
      description: t.layerChloroDesc || 'Phytoplankton Pelagic Forage',
      active: showChlorophyll,
      onToggle: () => setShowChlorophyll(!showChlorophyll),
      icon: '🌿',
      iconBg: 'bg-green-50 text-green-700',
    },
    {
      id: 'waves',
      label: t.layerWaves || 'Wave / Swell Contours',
      description: t.layerWavesDesc || 'Swell & Rough Sea Sectors',
      active: showWaves,
      onToggle: () => setShowWaves(!showWaves),
      icon: '🌊',
      iconBg: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'wind',
      label: t.layerWind || 'Wind Vector Streamlines',
      description: t.layerWindDesc || 'Surface Wind Vectors (WSW)',
      active: showWind,
      onToggle: () => setShowWind(!showWind),
      icon: '💨',
      iconBg: 'bg-cyan-50 text-cyan-700',
    },
  ];

  return (
    <aside className="w-full lg:w-[270px] xl:w-[290px] bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-all">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                {t.gisTitle || 'GIS Satellite Layers'}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                {t.gisSubtitle || 'ISRO OceanSat • Copernicus • Marine Data'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            {t.liveEoBadge || 'Live EO'}
          </span>
        </div>

        {/* Layer Switches List (Spacious & Clean) */}
        <div className="space-y-2.5">
          {layerItems.map((item) => (
            <div
              key={item.id}
              onClick={item.onToggle}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                item.active
                  ? 'bg-slate-50/80 border-slate-200 shadow-2xs'
                  : 'bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-100 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs font-semibold truncate ${item.active ? 'text-slate-900' : 'text-slate-500'}`}>
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
                  item.active ? 'bg-teal-700' : 'bg-slate-200'
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

      {/* Tactical Map Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11px] font-sans">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.tacticalLegend || 'TACTICAL MAP LEGEND'}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-2xs" />
            <span className="truncate">{t.legendVessel || 'Your Vessel'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="truncate">{t.legendPfz || 'PFZ Zone'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-2xs" />
            <span className="truncate">{t.legendRoute || 'Safe Route'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
            <span className="truncate">{t.legendImbl || 'IMBL Boundary'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            <span className="truncate">{t.legendMpa || 'MPA Reserve'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-2xs" />
            <span className="truncate">{t.legendHazard || 'Hazard Zone'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
