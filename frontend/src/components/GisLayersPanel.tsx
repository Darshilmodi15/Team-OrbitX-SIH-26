import React from 'react';
import { TRANSLATIONS } from '../data/maritimeData';
import {
  Fish,
  Shield,
  Navigation,
  Thermometer,
  Sprout,
  Waves,
  Wind,
  Layers,
  Info,
} from 'lucide-react';

export interface GisLayerState {
  pfz: boolean;
  geofence: boolean;
  route: boolean;
  sst: boolean;
  chlorophyll: boolean;
  waves: boolean;
  wind: boolean;
}

interface GisLayersPanelProps {
  layers: GisLayerState;
  onToggleLayer: (layerKey: keyof GisLayerState) => void;
  currentLang: string;
}

export const GisLayersPanel: React.FC<GisLayersPanelProps> = ({
  layers,
  onToggleLayer,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const layerItems: {
    key: keyof GisLayerState;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgBadge: string;
    activeText: string;
  }[] = [
    {
      key: 'pfz',
      label: t.pfzLayer || 'Potential Fishing Zones',
      icon: Fish,
      color: 'text-emerald-600',
      bgBadge: 'bg-emerald-50 border-emerald-200',
      activeText: 'Active INCOIS Advisory',
    },
    {
      key: 'geofence',
      label: t.geofenceLayer || 'IMBL & MPA Geofences',
      icon: Shield,
      color: 'text-rose-600',
      bgBadge: 'bg-rose-50 border-rose-200',
      activeText: 'Border Alert Active',
    },
    {
      key: 'route',
      label: t.routeLayer || 'Weather-Safe Navigation Route',
      icon: Navigation,
      color: 'text-sky-600',
      bgBadge: 'bg-sky-50 border-sky-200',
      activeText: 'Optimum Nav Vector',
    },
    {
      key: 'sst',
      label: t.sstLayer || 'SST Heatmap',
      icon: Thermometer,
      color: 'text-orange-500',
      bgBadge: 'bg-orange-50 border-orange-200',
      activeText: 'Copernicus Thermal Data',
    },
    {
      key: 'chlorophyll',
      label: t.chloroLayer || 'Chlorophyll-a Bloom',
      icon: Sprout,
      color: 'text-teal-600',
      bgBadge: 'bg-teal-50 border-teal-200',
      activeText: 'ISRO OceanSat Bloom',
    },
    {
      key: 'waves',
      label: t.wavesLayer || 'Wave / Swell Contours',
      icon: Waves,
      color: 'text-blue-600',
      bgBadge: 'bg-blue-50 border-blue-200',
      activeText: 'INCOIS Wave Watch 3',
    },
    {
      key: 'wind',
      label: t.windLayer || 'Wind Vector Streamlines',
      icon: Wind,
      color: 'text-indigo-600',
      bgBadge: 'bg-indigo-50 border-indigo-200',
      activeText: 'ERA5 Oceanic Flow',
    },
  ];

  return (
    <aside className="w-full lg:w-[280px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between select-none overflow-y-auto max-h-[calc(100vh-140px)]">
      <div>
        {/* Panel Header */}
        <div className="pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black font-display text-slate-900 tracking-tight">
                {t.gisPanelTitle || 'GIS Satellite Layers'}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {t.gisPanelSubtitle || 'ISRO OceanSat • Copernicus • Marine Data'}
              </p>
            </div>
          </div>
        </div>

        {/* Layers List */}
        <div className="space-y-2">
          {layerItems.map((item) => {
            const Icon = item.icon;
            const isActive = layers[item.key];

            return (
              <div
                key={item.key}
                onClick={() => onToggleLayer(item.key)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-50 border-slate-300 shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? item.bgBadge : 'bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? item.color : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`block text-xs font-semibold truncate ${
                        isActive ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[9px] text-slate-400 truncate">
                      {isActive ? item.activeText : 'Layer Disabled'}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle */}
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 ${
                    isActive ? 'bg-[#0F766E]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                      isActive ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Map Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400">
              {t.legendTitle || 'TACTICAL MAP LEGEND'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-200 shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendVessel || 'Your Vessel'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendPfz || 'PFZ Zone'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-500 shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendSafeRoute || 'Safe Route'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-3 h-0.5 bg-rose-500 shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendImbl || 'IMBL Boundary'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/60 border border-amber-500 shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendMpa || 'MPA Reserve'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              <span className="text-slate-700 font-medium text-[10px] truncate">
                {t.legendHazard || 'Hazard Zone'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Hint Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-teal-800 bg-teal-50/70 p-2 rounded-xl border border-teal-200/60">
        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
        <span>{t.mapHint || '💡 Click anywhere on the sea to relocate vessel GPS'}</span>
      </div>
    </aside>
  );
};
