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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-xl shadow-xs">
              🧠
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                Explainable Multi-Agent Reasoning Trace
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase font-bold">
                  Audit Verified
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Transparent decision-support chain demonstrating collaborative autonomous AI agents.
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
          {/* Agent Collaboration Workflow Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-600" />
              Specialized Agent Execution Pipeline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 border rounded-xl relative flex flex-col justify-between shadow-2xs ${
                    step.status === 'alert'
                      ? 'border-rose-300 bg-rose-50/60'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/50 transition'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-[10px] font-mono text-slate-400">{step.timestamp}</span>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">{step.agentName}</h5>
                    <p className="text-[10px] text-teal-700 font-mono font-medium">{step.role}</p>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{step.detail}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Status</span>
                    {step.status === 'alert' ? (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Alert Triggered
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sequential Step-by-Step Chain of Thought */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-teal-600" />
              Step-by-Step Chain of Thought Reasoning
            </h4>

            <div className="space-y-2 font-mono text-[11px]">
              {reasoning.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
                >
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 font-sans leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources & Attribution */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider mb-2.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-600" />
              Ingested Sources & Public Marine Feeds
            </h4>

            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-sans flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>ORCA Marine Multi-Agent Architecture • SIH 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs"
          >
            Close Audit Trace
          </button>
        </div>
      </div>
    </div>
  );
};
