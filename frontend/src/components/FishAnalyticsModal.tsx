import React from 'react';
import { X, TrendingDown, TrendingUp, Waves, Thermometer, ShieldCheck } from 'lucide-react';

interface FishAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: string;
}

export const FishAnalyticsModal: React.FC<FishAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const speciesTrends = [
    {
      name: 'Indian Oil Sardine (Sardinella longiceps)',
      region: 'Malabar & Konkan Coast',
      trend: '-34% since 2021',
      status: 'Critical Decline',
      statusColor: 'bg-rose-50 text-rose-700 border-rose-200',
      reason: 'El Niño-induced thermal stratification delaying coastal upwelling in Arabian Sea.',
      recommendation: 'Target offshore thermal fronts (>60m depth) rather than nearshore waters.',
    },
    {
      name: 'Silver Pomfret (Pampus argenteus)',
      region: 'Saurashtra & Gulf of Kutch',
      trend: '-22% since 2022',
      status: 'Moderate Decline',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      reason: 'Increased bottom trawling pressure during juvenile migration months.',
      recommendation: 'Utilize INCOIS PFZ Advisories with square-mesh codends.',
    },
    {
      name: 'Yellowfin Tuna (Thunnus albacares)',
      region: 'Deep Arabian Sea (>200m)',
      trend: '+18% since 2023',
      status: 'High Abundance',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: 'Thermal front expansion creating favorable feeding grounds along shelf-edge upwelling.',
      recommendation: 'Ideal for pelagic longlining and drift gillnets outside 30 nautical miles.',
    },
    {
      name: 'Indian Mackerel (Rastrelliger kanagurta)',
      region: 'Goa & Coastal Karnataka',
      trend: '+8% stable',
      status: 'Stable',
      statusColor: 'bg-teal-50 text-teal-700 border-teal-200',
      reason: 'Abundant chlorophyll-a blooms sustained by post-monsoon estuarine runoffs.',
      recommendation: 'Operate purse-seine nets during evening slack tides.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-lg shadow-2xs font-bold">
              🐟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-display text-slate-900">
                  Fish Catch Trend & Ecological Analytics
                </h3>
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  CMFRI & INCOIS Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Multi-decadal fishery productivity dynamics & climate-driven catch shifts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] font-bold">
                <span>Total Marine Landings</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">3.49 MMT</div>
              <div className="text-[10px] text-slate-500 mt-1">-4.8% vs 5-yr coastal average</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] font-bold">
                <span>SST Warming Anomaly</span>
                <Thermometer className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">+0.85°C</div>
              <div className="text-[10px] text-slate-500 mt-1">Driving pelagic shoals offshore</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] font-bold">
                <span>PFZ Hit Ratio</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1">78.4%</div>
              <div className="text-[10px] text-slate-500 mt-1">When fishing inside ORCA advisories</div>
            </div>
          </div>

          {/* Species Breakdown */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 uppercase font-mono tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>📊</span> Regional Species Catch Profiles
            </h4>

            <div className="space-y-2.5">
              {speciesTrends.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs">{s.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono ml-2">({s.region})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700 text-xs">{s.trend}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.statusColor}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs mb-2">
                    <strong className="text-slate-700">Root Cause:</strong> {s.reason}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-xl border border-teal-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span><strong className="text-teal-900">ORCA Recommendation:</strong> {s.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Climate & Upwelling Note */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
            <Waves className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900">
              <h5 className="font-bold text-sky-950 mb-1">INCOIS Ocean Heat Wave Advisory</h5>
              <p className="leading-relaxed">
                Coastal waters between Ratnagiri and Veraval are experiencing prolonged thermal anomalies. Artisanal fishermen are advised to utilize ORCA's real-time Sea Surface Temperature (SST) and Chlorophyll-a layers to navigate directly to active upwelling fronts where fish congregate, reducing diesel fuel consumption by up to 30%.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Data Source: Central Marine Fisheries Research Institute (CMFRI) & INCOIS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Analytics
          </button>
        </div>
      </div>
    </div>
  );
};
