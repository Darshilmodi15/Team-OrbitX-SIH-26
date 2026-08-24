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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-xl shadow-xs">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                Marine Ecology & Fish Catch Decline Diagnostics
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase font-bold">
                  Temporal Analytics
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Satellite Earth Observation temporal correlation for {coastalRegionName} coastal corridor.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans">
          {/* Key Metric Anomaly Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 border border-rose-200 bg-rose-50/40 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-medium text-[11px]">SST Anomaly (5-Year)</span>
                <TrendingUp className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold font-display text-rose-700">+0.85°C</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Elevated sea temperature weakening the summer coastal upwelling pump.
              </p>
            </div>

            <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-medium text-[11px]">Chlorophyll-a Plume</span>
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold font-display text-amber-700">-18.4%</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Inshore phytoplankton drop pushing pelagic schools to deeper shelf waters.
              </p>
            </div>

            <div className="p-4 border border-teal-200 bg-teal-50/40 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-medium text-[11px]">Optimal Habitat Shift</span>
                <Compass className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-bold font-display text-teal-700">+16.5 NM Offshore</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fish aggregations now concentrated along the 70m–110m bathymetric shelf break.
              </p>
            </div>
          </div>

          {/* Detailed Reason Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
              Diagnostic Insights & Evidence
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  1. Disruption of Arabian Sea Coastal Upwelling
                </h5>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  ISRO Oceansat scatterometer data reveals irregular south-west monsoon wind stress, leading to a 22-day delay in nutrient-rich bottom water surfacing. Consequently, primary forage species (Oil Sardines & Anchovies) did not form customary near-shore aggregations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  2. Inshore Thermal Stratification & Hypoxia
                </h5>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Warm surface layers (&gt;29.5°C) created a strong thermocline barrier. High-value demersal fish (Pomfret, Croakers) migrated westward towards oxygenated oceanic shelf breaks.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                <h5 className="font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  3. Operational Advisory for Local Fisheries
                </h5>
                <p className="text-teal-950 text-[11px] leading-relaxed">
                  • Shift harvesting routes towards <strong>Shelf Break Sector Bravo (75m–95m depth)</strong> where thermal fronts are active.
                  <br />
                  • Utilize <strong>Drift Longlines & Mid-water Trawls</strong> rather than shallow bottom nets.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>Satellite Ecological Correlator • ISRO Bhuvan / Oceansat Integrated</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
