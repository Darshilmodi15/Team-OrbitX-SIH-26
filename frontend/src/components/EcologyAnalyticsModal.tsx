import React from 'react';
import { X, TrendingDown, TrendingUp, AlertCircle, CheckCircle, Compass } from 'lucide-react';

interface EcologyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coastalRegionName: string;
}

export const EcologyAnalyticsModal: React.FC<EcologyAnalyticsModalProps> = ({
  isOpen,
  onClose,
  coastalRegionName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-emerald-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-emerald-500/20 bg-navy-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-xl">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                Marine Ecology & Fish Catch Decline Diagnostics
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                  Temporal Analytics
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Satellite Earth Observation temporal correlation for {coastalRegionName} coastal corridor.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans">
          {/* Key Metric Anomaly Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card p-3.5 border border-rose-500/30 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>SST Anomaly (5-Year)</span>
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl font-bold font-display text-rose-400">+0.85°C</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Elevated sea temperature weakening the summer coastal upwelling pump.
              </p>
            </div>

            <div className="glass-card p-3.5 border border-amber-500/30 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Chlorophyll-a Plume</span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold font-display text-amber-400">-18.4%</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Inshore phytoplankton drop pushing pelagic schools to deeper shelf waters.
              </p>
            </div>

            <div className="glass-card p-3.5 border border-cyan-500/30 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Optimal Habitat Shift</span>
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-xl font-bold font-display text-cyan-400">+16.5 NM Offshore</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Fish aggregations now concentrated along the 70m–110m bathymetric shelf break.
              </p>
            </div>
          </div>

          {/* Detailed Reason Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-emerald-300 uppercase font-mono tracking-wider">
              Diagnostic Insights & Evidence
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-navy-950/60 border border-slate-800 space-y-1">
                <h5 className="font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  1. Disruption of Arabian Sea Coastal Upwelling
                </h5>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  ISRO Oceansat scatterometer data reveals irregular south-west monsoon wind stress, leading to a 22-day delay in nutrient-rich bottom water surfacing. Consequently, primary forage species (Oil Sardines & Anchovies) did not form customary near-shore aggregations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-navy-950/60 border border-slate-800 space-y-1">
                <h5 className="font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  2. Inshore Thermal Stratification & Hypoxia
                </h5>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Warm surface layers (&gt;29.5°C) created a strong thermocline barrier. High-value demersal fish (Pomfret, Croakers) migrated westward towards oxygenated oceanic shelf breaks.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-navy-950/60 border border-emerald-500/30 bg-emerald-950/20 space-y-1">
                <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  3. Operational Advisory for Local Fisheries
                </h5>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  • Shift harvesting routes towards <strong>Shelf Break Sector Bravo (75m–95m depth)</strong> where thermal fronts are active.
                  <br />
                  • Utilize <strong>Drift Longlines & Mid-water Trawls</strong> rather than shallow bottom nets.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-navy-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Satellite Ecological Correlator • ISRO Bhuvan / Oceansat Integrated</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold transition shadow-glow-emerald"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
