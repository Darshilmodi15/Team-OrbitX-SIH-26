import React, { useState } from 'react';
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
  X,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const layerItems: {
    key: keyof GisLayerState;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    { key: 'pfz', label: t.pfzLayer || 'PFZ Zones', icon: Fish, color: 'text-emerald-600' },
    { key: 'geofence', label: t.geofenceLayer || 'Geofences', icon: Shield, color: 'text-rose-500' },
    { key: 'route', label: t.routeLayer || 'Routes', icon: Navigation, color: 'text-sky-600' },
    { key: 'sst', label: t.sstLayer || 'SST', icon: Thermometer, color: 'text-orange-500' },
    { key: 'chlorophyll', label: t.chloroLayer || 'Chlorophyll', icon: Sprout, color: 'text-green-600' },
    { key: 'waves', label: t.wavesLayer || 'Waves', icon: Waves, color: 'text-blue-500' },
    { key: 'wind', label: t.windLayer || 'Wind', icon: Wind, color: 'text-teal-600' },
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-3 left-3 z-20 w-9 h-9 rounded-lg glass-light border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white transition cursor-pointer group"
        style={{ boxShadow: 'var(--shadow-md)' }}
        title="Toggle Map Layers"
      >
        <Layers className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Floating Panel */}
      {isExpanded && (
        <div
          className="absolute top-14 left-3 z-20 w-48 glass-light border border-slate-200/80 rounded-xl p-2 animate-fadeInUp"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Map Layers
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {layerItems.map(({ key, label, icon: Icon, color }) => {
              const isActive = layers[key];
              return (
                <button
                  key={key}
                  onClick={() => onToggleLayer(key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-teal-50/80 text-teal-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? color : 'text-slate-400'}`} />
                  <span className="flex-1 text-left truncate">{label}</span>
                  <div
                    className={`w-7 h-4 rounded-full relative transition-colors ${
                      isActive ? 'bg-teal-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                        isActive ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
