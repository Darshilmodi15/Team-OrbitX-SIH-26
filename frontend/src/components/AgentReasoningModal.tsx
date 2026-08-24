import React from 'react';
import type { AgentStep } from '../services/apiService';
import { X, CheckCircle2, AlertTriangle, Cpu, Database, Radio } from 'lucide-react';

interface AgentReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasoning: string[];
  sources: string[];
  agentSteps: AgentStep[];
}

export const AgentReasoningModal: React.FC<AgentReasoningModalProps> = ({
  isOpen,
  onClose,
  reasoning,
  sources,
  agentSteps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-cyan-400/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-navy-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-xl">
              🧠
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                Explainable Multi-Agent Reasoning Trace
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase">
                  Audit Verified
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Transparent decision-support chain demonstrating collaborative autonomous AI agents.
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
          {/* Agent Collaboration Workflow Graph */}
          <div>
            <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Specialized Agent Execution Pipeline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {agentSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`glass-card p-3 border rounded-xl relative flex flex-col justify-between ${
                    step.status === 'alert'
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : 'border-cyan-500/20 hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-[10px] font-mono text-slate-400">{step.timestamp}</span>
                  </div>

                  <div>
                    <h5 className="font-bold text-white text-xs">{step.agentName}</h5>
                    <p className="text-[10px] text-cyan-400 font-mono">{step.role}</p>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">{step.detail}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Status</span>
                    {step.status === 'alert' ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Alert Triggered
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sequential Step-by-Step Chain of Thought */}
          <div>
            <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              Step-by-Step Chain of Thought Reasoning
            </h4>

            <div className="space-y-2 font-mono text-[11px]">
              {reasoning.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-navy-950/60 border border-slate-800 text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources & Attribution */}
          <div>
            <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider mb-2.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" />
              Ingested Sources & Public Marine Feeds
            </h4>

            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-navy-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>ORCA Marine Multi-Agent Architecture • SIH 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold transition shadow-glow-cyan"
          >
            Close Audit Trace
          </button>
        </div>
      </div>
    </div>
  );
};
