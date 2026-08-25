import { useState } from 'react';

interface TaskItem {
  agent: string;
  action: string;
  required?: boolean;
}

interface PlanObject {
  intent: string;
  tasks: TaskItem[];
}

interface AgentTraceProps {
  plan?: PlanObject;
  reasoning?: string[];
  sourcesUsed?: string[];
}

export default function AgentTrace({ plan, reasoning, sourcesUsed }: AgentTraceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!plan && (!reasoning || reasoning.length === 0)) {
    return null;
  }

  const getAgentBadge = (agent: string) => {
    switch (agent) {
      case 'intent_agent':
        return { label: 'Intent Agent', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎯' };
      case 'planner':
        return { label: 'Planner', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📋' };
      case 'weather_agent':
        return { label: 'Weather Agent', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: '🌊' };
      case 'risk_agent':
      case 'risk_assessment_agent':
        return { label: 'Risk Agent', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: '🛡️' };
      case 'pfz_agent':
        return { label: 'PFZ Agent', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '🐟' };
      case 'geospatial_agent':
        return { label: 'Geospatial Agent', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '📐' };
      case 'geofence_agent':
        return { label: 'Geofence Agent', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🛑' };
      case 'geofence_spatial_engine':
        return { label: 'Spatial Engine', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🗺️' };
<<<<<<< HEAD
=======
      case 'sarvam_ai_language_service':
        return { label: 'Sarvam AI (Indic NMT & Saaras)', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', icon: '🇮🇳' };
      case 'bhashini_multilingual_service':
        return { label: 'Bhashini / NMT Service', color: 'bg-teal-50 text-teal-800 border-teal-200', icon: '🌐' };
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
      default:
        return { label: agent, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '🤖' };
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 text-xs overflow-hidden shadow-2xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors font-mono text-slate-700 cursor-pointer"
      >
        <span className="flex items-center gap-1.5 font-bold text-xs">
          <span className="text-teal-700">⚡</span> MULTI-AGENT EXECUTION TRACE
        </span>
        <span className="flex items-center gap-2 text-slate-500 text-[11px]">
          {plan?.tasks && (
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-teal-700 font-semibold text-[10px]">
              {plan.tasks.length} tasks
            </span>
          )}
          <span className="text-teal-700 font-bold text-[11px]">{isExpanded ? '▲ Collapse' : '▼ View Trace'}</span>
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-slate-200/80 space-y-3 bg-white">
          {/* Plan section */}
          {plan && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5 flex items-center justify-between font-bold">
                <span>Execution Plan:</span>
                <span className="text-teal-700">Intent: {plan.intent}</span>
              </div>
              {plan.tasks && plan.tasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {plan.tasks.map((task, idx) => {
                    const badge = getAgentBadge(task.agent);
                    return (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{badge.icon}</span>
                          <span className="font-bold text-slate-800 font-mono text-[11px]">
                            {task.agent}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {task.action}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-400 italic text-[11px]">
                  No operational retrieval tasks required for this query.
                </div>
              )}
            </div>
          )}

          {/* Reasoning trace steps */}
          {reasoning && reasoning.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5 font-bold">
                Evidence Trace ({reasoning.length} steps):
              </div>
              <div className="space-y-1.5 pl-2.5 border-l-2 border-teal-500/40">
                {reasoning.map((step, idx) => (
                  <div key={idx} className="text-slate-700 leading-relaxed text-xs font-sans flex items-start gap-1.5">
                    <span className="text-teal-700 font-mono text-[10px] font-bold select-none shrink-0 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources used */}
          {sourcesUsed && sourcesUsed.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5 font-bold">
                Sources Attribution:
              </div>
              <div className="flex flex-wrap gap-1">
                {sourcesUsed.map((src, idx) => {
                  const badge = getAgentBadge(src);
                  return (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono border font-semibold ${badge.color}`}
                    >
                      {src}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
