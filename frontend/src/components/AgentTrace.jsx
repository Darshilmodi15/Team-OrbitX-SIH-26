import React, { useState } from 'react';

export default function AgentTrace({ plan, reasoning, sourcesUsed }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!plan && (!reasoning || reasoning.length === 0)) {
    return null;
  }

  const getAgentBadge = (agent) => {
    switch (agent) {
      case 'intent_agent':
        return { label: 'Intent Agent', color: 'bg-purple-950/60 text-purple-300 border-purple-500/30', icon: '🎯' };
      case 'planner':
        return { label: 'Planner', color: 'bg-blue-950/60 text-blue-300 border-blue-500/30', icon: '📋' };
      case 'weather_agent':
        return { label: 'Weather Agent', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30', icon: '🌊' };
      case 'risk_agent':
      case 'risk_assessment_agent':
        return { label: 'Risk Agent', color: 'bg-amber-950/60 text-amber-300 border-amber-500/30', icon: '🛡️' };
      case 'pfz_agent':
        return { label: 'PFZ Agent', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30', icon: '🐟' };
      case 'geospatial_agent':
        return { label: 'Geospatial Agent', color: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30', icon: '📐' };
      default:
        return { label: agent, color: 'bg-slate-800 text-slate-300 border-slate-700', icon: '🤖' };
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors font-mono text-slate-300"
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className="text-[#00f0ff]">⚡</span> Multi-Agent Execution & Evidence Trace
        </span>
        <span className="flex items-center gap-2 text-slate-400 text-[11px]">
          {plan?.tasks && (
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[#00f0ff]">
              {plan.tasks.length} task{plan.tasks.length === 1 ? '' : 's'}
            </span>
          )}
          <span>{isExpanded ? '▲ Hide' : '▼ View Trace'}</span>
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-950/40">
          {/* Plan section */}
          {plan && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Execution Plan</span>
                <span className="text-[#00f0ff] font-semibold">Intent: {plan.intent}</span>
              </div>
              {plan.tasks && plan.tasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {plan.tasks.map((task, idx) => {
                    const badge = getAgentBadge(task.agent);
                    return (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{badge.icon}</span>
                          <span className="font-semibold text-slate-200 font-mono text-[11px]">
                            {task.agent}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
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
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">
                Evidence Trace ({reasoning.length} steps)
              </div>
              <div className="space-y-1.5 pl-2 border-l-2 border-[#00f0ff]/30">
                {reasoning.map((step, idx) => (
                  <div key={idx} className="text-slate-300 leading-relaxed text-[11px] font-sans flex items-start gap-2">
                    <span className="text-[#00f0ff] font-mono text-[10px] select-none shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources used */}
          {sourcesUsed && sourcesUsed.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">
                Sources Used
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sourcesUsed.map((src, idx) => {
                  const badge = getAgentBadge(src);
                  return (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badge.color}`}
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
