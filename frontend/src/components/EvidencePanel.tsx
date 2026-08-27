import { useState } from 'react';
import MarineMetrics from './MarineMetrics';
import AgentTrace from './AgentTrace';
import type { OperationalRecommendation } from '../types';

export interface RouteWaypointItem {
  lat: number;
  lon: number;
  name: string;
  segment_distance_km: number;
  wave_height_m?: number | null;
  risk_level?: string;
}

export interface RouteEvidenceItem {
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  distance_km: number;
  distance_nm: number;
  estimated_duration_hours: number;
  waypoints: RouteWaypointItem[];
  risk_assessment: string;
  avoided_zones: string[];
  advisory_notes: string[];
  source: string;
  is_advisory_only: boolean;
}

export interface HazardAlertItem {
  id: string;
  severity: string;
  title: string;
  message: string;
  location_desc?: string;
  timestamp?: string;
  source?: string;
  freshness?: string;
}

export interface SimulationEvidenceItem {
  is_simulation: boolean;
  parameter_modified: string;
  baseline_value: string;
  simulated_value: string;
  baseline_risk: string;
  simulated_risk: string;
  impact_summary: string;
  triggered_factors?: string[];
  source: string;
}

interface EvidencePanelProps {
  weather?: any;
  riskLevel?: string | null;
  plan?: any;
  reasoning?: string[];
  sourcesUsed?: string[];
  recommendations?: OperationalRecommendation[];
  route?: RouteEvidenceItem | null;
  alerts?: HazardAlertItem[];
  simulation?: SimulationEvidenceItem | null;
  connectivityMode?: string;
}

export default function EvidencePanel({
  weather,
  riskLevel,
  plan,
  reasoning,
  sourcesUsed,
  recommendations,
  route,
  alerts = [],
  simulation,
  connectivityMode,
}: EvidencePanelProps) {
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  const hasContent =
    weather ||
    plan ||
    (reasoning && reasoning.length > 0) ||
    (recommendations && recommendations.length > 0) ||
    route ||
    (alerts && alerts.length > 0) ||
    simulation;

  if (!hasContent) return null;

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          border: 'border-rose-400/80',
          bg: 'bg-rose-50/50',
          icon: '🔴',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
          border: 'border-amber-400/70',
          bg: 'bg-amber-50/40',
          icon: '🟠',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-teal-100 text-teal-800 border-teal-300 font-semibold',
          border: 'border-teal-400/60',
          bg: 'bg-teal-50/30',
          icon: '🟢',
        };
      default:
        return {
          badge: 'bg-sky-100 text-sky-800 border-sky-300',
          border: 'border-sky-300/60',
          bg: 'bg-sky-50/30',
          icon: 'ℹ️',
        };
    }
  };

  return (
    <div className="space-y-3 mt-3">
      {/* 1. Structured Operational Recommendations with Supporting Evidence & Reasoning */}
      {recommendations && recommendations.length > 0 && (
        <div className="rounded-2xl border border-teal-200 bg-white p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-[#0A2540] flex items-center gap-1.5 font-sans text-xs">
              <span className="text-teal-600">💡</span> RELIABLE OPERATIONAL RECOMMENDATIONS
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {recommendations.length} Action Directives
            </span>
          </div>

          <div className="space-y-2">
            {recommendations.map((rec) => {
              const pStyle = getPriorityStyle(rec.priority);
              const isExpanded = expandedRecId === rec.id;

              return (
                <div
                  key={rec.id}
                  className={`rounded-xl border ${pStyle.border} ${pStyle.bg} p-3 text-xs transition-all`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs">{pStyle.icon}</span>
                      <span className="font-bold text-slate-900 text-[12px]">{rec.title}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/80 border border-slate-200 text-slate-600 font-semibold">
                        {rec.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-mono ${pStyle.badge}`}>
                        {rec.priority}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/90 text-slate-700 text-[9px] font-mono border border-slate-200 font-semibold">
                        {Math.round((rec.confidence_score || 0.95) * 100)}% Verified
                      </span>
                    </div>
                  </div>

                  {/* Directive instruction */}
                  <div className="text-slate-800 font-sans leading-relaxed text-[11px] font-medium bg-white/70 p-2.5 rounded-lg border border-slate-200/80 mb-2">
                    <span className="font-bold text-teal-900 block mb-0.5 text-[10px] uppercase tracking-wider">
                      Action Directive:
                    </span>
                    {rec.directive}
                  </div>

                  {/* Toggle Evidence & Reasoning Trace */}
                  <button
                    type="button"
                    onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                    className="w-full py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-[10px] font-mono text-teal-800 font-bold transition cursor-pointer"
                  >
                    <span>🔬 Supporting Evidence & Reasoning Derivation</span>
                    <span>{isExpanded ? '▲ Hide Derivation' : '▼ View Evidence & Logic'}</span>
                  </button>

                  {/* Expandable Supporting Evidence & Reasoning */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2 bg-white/95 p-2.5 rounded-lg text-[11px]">
                      {/* Supporting Evidence List */}
                      {rec.supporting_evidence && rec.supporting_evidence.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 font-mono text-[10px] uppercase block mb-1">
                            📊 Supporting Telemetry & Observations:
                          </span>
                          <ul className="space-y-1 pl-1">
                            {rec.supporting_evidence.map((ev, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-slate-700">
                                <span className="text-teal-600 font-bold shrink-0">✓</span>
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Deductive Reasoning */}
                      {rec.reasoning && (
                        <div className="pt-1.5 border-t border-slate-100">
                          <span className="font-bold text-slate-700 font-mono text-[10px] uppercase block mb-1">
                            🧠 Step-by-Step Deductive Reasoning:
                          </span>
                          <div className="text-slate-600 font-sans leading-relaxed whitespace-pre-line text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                            {rec.reasoning}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Meteorological Conditions Card */}
      {weather && <MarineMetrics weather={weather} riskLevel={riskLevel} />}

      {/* 3. Route Recommendation Advisory Card */}
      {route && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono text-[11px]">
              <span>🧭</span> SAFE NAVIGATION ROUTE [ADVISORY]
            </span>
            <div className="flex items-center gap-1.5">
              {connectivityMode && (
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[9px] font-mono border border-slate-700">
                  {connectivityMode}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-cyan-900/80 text-cyan-200 border border-cyan-500/30 text-[10px] font-bold">
                {route.risk_assessment}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] mb-2.5">
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Destination</span>
              <span className="font-bold text-slate-100 truncate block">{route.destination_name}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Distance</span>
              <span className="font-bold text-cyan-400">{route.distance_km} km ({route.distance_nm} NM)</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[9px] text-slate-400 block uppercase">Est. Duration</span>
              <span className="font-bold text-slate-100">~{route.estimated_duration_hours} hrs @ 8 kts</span>
            </div>
          </div>

          {route.avoided_zones && route.avoided_zones.length > 0 && (
            <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30 mb-2">
              🛡️ Avoided Hazards / Security Zones: {route.avoided_zones.join(', ')}
            </div>
          )}

          {route.advisory_notes && route.advisory_notes.length > 0 && (
            <div className="text-[10px] text-slate-300 italic space-y-0.5 border-t border-cyan-900/60 pt-1.5">
              {route.advisory_notes.map((note: string, idx: number) => (
                <div key={idx}>• {note}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Proactive Hazard Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs shadow-md space-y-1.5">
          <div className="font-bold text-rose-300 flex items-center gap-1.5 font-mono text-[11px]">
            <span>🚨</span> PROACTIVE HAZARDS & BOUNDARY WARNINGS
          </div>
          {alerts.map((a: HazardAlertItem, idx: number) => (
            <div key={idx} className="p-2 rounded-xl bg-slate-950/80 border border-rose-900/60 text-[11px]">
              <div className="font-bold text-rose-400 flex items-center justify-between">
                <span>{a.title}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 font-mono">
                  {a.severity}
                </span>
              </div>
              <p className="text-slate-300 mt-1">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 5. What-If Counterfactual Simulation Card */}
      {simulation && (
        <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-xs shadow-md font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-purple-300 flex items-center gap-1.5 text-[11px]">
              <span>🔮</span> [SIMULATION] COUNTERFACTUAL SCENARIO
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-500/30 font-bold">
              {simulation.parameter_modified}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Baseline Condition</span>
              <span className="font-bold text-slate-200">{simulation.baseline_value}</span>
              <span className="block text-[10px] text-emerald-400 mt-0.5">[{simulation.baseline_risk}]</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-purple-900/60">
              <span className="text-[9px] text-purple-300 block uppercase">Simulated Scenario</span>
              <span className="font-bold text-purple-300">{simulation.simulated_value}</span>
              <span className="block text-[10px] text-rose-400 mt-0.5">[{simulation.simulated_risk}]</span>
            </div>
          </div>

          <p className="text-slate-300 font-sans text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            {simulation.impact_summary}
          </p>
        </div>
      )}

      {/* 6. Explainable Multi-Agent Execution & Evidence Trace */}
      <AgentTrace plan={plan} reasoning={reasoning} sourcesUsed={sourcesUsed} />
    </div>
  );
}
