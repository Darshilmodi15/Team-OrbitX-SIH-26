import React from 'react';
import { X, Cpu, ArrowRight, ShieldCheck, Database, Globe, Compass, Activity } from 'lucide-react';

interface AgentTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: string;
}

export const AgentTraceModal: React.FC<AgentTraceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const agents = [
    {
      name: '1. Bhashini Multilingual Layer',
      icon: Globe,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      badge: 'Bhashini NMT & ASR',
      desc: 'Zero-shot Indian language detection (Gujarati, Hindi, Marathi, Tamil, Telugu, Malayalam, Bengali, etc.) and bidirectional translation.',
    },
    {
      name: '2. Intent Classification Agent',
      icon: Compass,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      badge: 'Intent Router',
      desc: 'Parses maritime intents: PFZ proximity, wave & wind safety risk, safe navigation route, cyclone alert, or ecological decline inquiry.',
    },
    {
      name: '3. Master Task Planner',
      icon: Cpu,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      badge: 'DAG Orchestrator',
      desc: 'Generates parallel execution graphs, dynamically determining which specialized agents must execute for minimum latency.',
    },
    {
      name: '4. INCOIS Weather Agent',
      icon: Activity,
      color: 'bg-sky-50 border-sky-200 text-sky-800',
      badge: 'Live MetOcean Data',
      desc: 'Fetches high-resolution Wave Watch 3 (WW3) significant wave heights, wind vectors, swell period, and sea surface temperature.',
    },
    {
      name: '5. Navigational Risk Assessment Agent',
      icon: ShieldCheck,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badge: 'Safety Decision Engine',
      desc: 'Fuses meteorological thresholds with craft vessel capabilities to generate deterministically audited SAFE / CAUTION / DANGER advisories.',
    },
    {
      name: '6. PFZ & Geospatial Agent',
      icon: Database,
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      badge: 'ISRO OceanSat GIS',
      desc: 'Computes spatial Euclidean / Haversine distances to thermal fronts and chlorophyll blooms, avoiding IMBL and MPA geofence perimeters.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-lg shadow-2xs font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-display text-slate-900">
                  ORCA Multi-Agent Architecture & Execution Trace
                </h3>
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  SIH 2026 OrbitX
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Autonomous multi-agent decision support with Bhashini multilingual orchestration
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
          {/* Architecture Pipeline Flow */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-mono font-extrabold text-slate-400 mb-2">
              END-TO-END PIPELINE FLOW:
            </div>
            <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-bold text-slate-800">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                🗣️ Indic Voice / Text
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 shadow-2xs">
                🌐 Bhashini NMT
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 shadow-2xs">
                🎯 Intent Agent
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 shadow-2xs">
                📋 Planner DAG
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 shadow-2xs">
                🌊 MetOcean & PFZ
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs">
                🛡️ Risk Fusion
              </span>
            </div>
          </div>

          {/* Detailed Agents Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent, idx) => {
              const Icon = agent.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${agent.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-extrabold text-slate-900 text-xs">{agent.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${agent.color}`}>
                      {agent.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {agent.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Formal Contract Compliance */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <h5 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Deterministic Auditing & INCOIS Dataset Provenance</span>
            </h5>
            <p className="leading-relaxed">
              Every ORCA recommendation is backed by a structured EvidenceBundle containing exact timestamps, geographical provenance, wave model runs, and risk assessment audit logs, ensuring zero hallucinations for safety-critical marine operations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            FastAPI Backend: http://localhost:8000/query
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
