import { useState } from 'react';
import { Layers, Fish, ShieldAlert, Compass, Eye, Check, ChevronRight } from 'lucide-react';
import type { GisLayerState } from '../types';
import { getStrings } from '../i18n';

export interface GisLayersPanelProps {
  layers: GisLayerState;
  onToggleLayer: (key: keyof GisLayerState) => void;
  currentLang: string;
}

export function GisLayersPanel({
  layers,
  onToggleLayer,
  currentLang,
}: GisLayersPanelProps) {
  const t = getStrings(currentLang);
  const [isOpen, setIsOpen] = useState(false);

  const layerItems: {
    key: keyof GisLayerState;
    label: string;
    description: string;
    icon: typeof Fish;
    color: string;
  }[] = [
    {
      key: 'pfz',
      label: t.potentialFishingZone,
      description: 'INCOIS Chlorophyll & SST fronts',
      icon: Fish,
      color: 'text-sky-600',
    },
    {
      key: 'geofence',
      label: t.imblBoundary,
      description: 'Sir Creek & Palk Strait sovereign lines',
      icon: ShieldAlert,
      color: 'text-red-600',
    },
    {
      key: 'sst',
      label: t.marineProtectedAreas,
      description: 'Gulf of Mannar, Kutch, Gahirmatha',
      icon: Compass,
      color: 'text-amber-600',
    },
    {
      key: 'route',
      label: t.coastalBoundary,
      description: 'Territorial baseline (12 NM / EEZ)',
      icon: Eye,
      color: 'text-teal-600',
    },
  ];

  return (
    <div className="absolute top-3 left-3 z-20">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-xs hover:bg-white transition cursor-pointer"
        aria-expanded={isOpen}
      >
        <Layers className="h-4 w-4 text-[#0D9488]" />
        <span>{t.mapLayers}</span>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Layer Options Drawer */}
      {isOpen && (
        <div className="mt-2 w-72 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-md animate-scaleIn">
          <div className="px-2 py-1 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Chart Layers
            </p>
          </div>

          <div className="space-y-1">
            {layerItems.map((item) => {
              const active = !!layers[item.key];
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggleLayer(item.key)}
                  className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition cursor-pointer ${
                    active ? 'bg-slate-50 border border-slate-200/60' : 'hover:bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      active
                        ? 'border-[#0D9488] bg-[#0D9488] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GisLayersPanel;
