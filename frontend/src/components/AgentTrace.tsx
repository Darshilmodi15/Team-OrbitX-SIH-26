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
        return { label: 'Intent Agent', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40', icon: '🎯' };
      case 'planner':
        return { label: 'Planner', color: 'bg-blue-950/80 text-blue-300 border-blue-500/40', icon: '📋' };
      case 'weather_agent':
        return { label: 'Weather Agent', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40', icon: '🌊' };
      case 'risk_agent':
      case 'risk_assessment_agent':
        return { label: 'Risk Agent', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40', icon: '🛡️' };
      case 'pfz_agent':
        return { label: 'PFZ Agent', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40', icon: '🐟' };
      case 'geospatial_agent':
        return { label: 'Geospatial Agent', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40', icon: '📐' };
      default:
        return { label: agent, color: 'bg-slate-800 text-slate-300 border-slate-700', icon: '🤖' };
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-xs overflow-hidden shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors font-mono text-slate-300 cursor-pointer"
      >
        <span className="flex items-center gap-2 font-bold text-[11px] tracking-wide">
          <span className="text-[#22d3ee]">⚡</span> MULTI-AGENT EXECUTION & EVIDENCE TRACE
        </span>
        <span className="flex items-center gap-2 text-slate-400 text-[11px]">
          {plan?.tasks && (
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[#22d3ee] font-semibold text-[10px]">
              {plan.tasks.length} task{plan.tasks.length === 1 ? '' : 's'}
            </span>
          )}
          <span className="text-[10px] text-cyan-400 font-semibold">{isExpanded ? '▲ Collapse' : '▼ Expand Trace'}</span>
        </span>
      </button>

      {isExpanded && (
        <div className="p-3.5 border-t border-slate-800/80 space-y-3 bg-slate-900/30">
          {/* Plan section */}
          {plan && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Generated Execution Plan:</span>
                <span className="text-[#22d3ee] font-bold">Intent: {plan.intent}</span>
              </div>
              {plan.tasks && plan.tasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.tasks.map((task, idx) => {
                    const badge = getAgentBadge(task.agent);
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{badge.icon}</span>
                          <span className="font-bold text-slate-200 font-mono text-[11px]">
                            {task.agent}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {task.action}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 italic text-[11px]">
                  No operational retrieval tasks required for this query.
                </div>
              )}
            </div>
          )}

          {/* Reasoning trace steps */}
          {reasoning && reasoning.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-2 font-semibold">
                Evidence Trace ({reasoning.length} steps):
              </div>
              <div className="space-y-2 pl-3 border-l-2 border-[#22d3ee]/40">
                {reasoning.map((step, idx) => (
                  <div key={idx} className="text-slate-200 leading-relaxed text-[11px] font-sans flex items-start gap-2">
                    <span className="text-[#22d3ee] font-mono text-[10px] font-bold select-none shrink-0 mt-0.5 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
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
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-2 font-semibold">
                Sources Attribution:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sourcesUsed.map((src, idx) => {
                  const badge = getAgentBadge(src);
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border font-semibold ${badge.color}`}
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
