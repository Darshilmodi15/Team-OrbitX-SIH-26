import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Wind,
  Fish,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Radio,
} from 'lucide-react';
import type { MessageItem } from '../context/AppContext';
import { useAppContext } from '../context/AppContext';
import EvidencePanel from './EvidencePanel';
import { OrcaLogo } from './orca/Logo';
import { MarkdownRenderer } from './orca/MarkdownRenderer';

interface ChatMessageProps {
  message: MessageItem;
  currentLang?: string;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const { focusOnMapLocation } = useAppContext();

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2.5 mb-4 group animate-fadeIn">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#0A2540] text-white p-3.5 shadow-md border border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-slate-300 font-mono">
            <span className="font-bold flex items-center gap-1">
              <span>👤</span> Vessel Operator
            </span>
            <span className="text-slate-400">{message.timestamp}</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-100 font-sans whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#0A2540] border border-slate-700 flex items-center justify-center text-xs shrink-0 shadow-xs text-white">
          ⚓
        </div>
      </div>
    );
  }

  // Determine safety card badge if present
  const riskBadge = message.risk_level
    ? {
        safe: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: ShieldCheck, label: 'SAFE TO OPERATE' },
        caution: { bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: AlertTriangle, label: 'CAUTION ADVISED' },
        warning: { bg: 'bg-orange-50 text-orange-800 border-orange-300', icon: AlertTriangle, label: 'HAZARD WARNING' },
        unsafe: { bg: 'bg-red-50 text-red-800 border-red-300', icon: ShieldAlert, label: 'DANGER — AVOID SEA' },
        emergency: { bg: 'bg-red-600 text-white border-red-700', icon: ShieldAlert, label: 'CRITICAL DISTRESS' },
      }[message.risk_level.toLowerCase()] || null
    : null;

  return (
    <div className="flex justify-start items-start gap-2.5 mb-4 group animate-fadeIn">
      {/* ORCA Avatar */}
      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-white flex items-center justify-center shrink-0 shadow-xs">
        <OrcaLogo className="size-5.5 shrink-0" />
      </div>

      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-900 p-4 shadow-sm hover:border-slate-300 transition">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0A2540] text-xs">ORCA Marine AI</span>
            <span className="px-1.5 py-0.2 rounded bg-teal-50 text-[#0D9488] font-mono font-bold text-[9px] border border-teal-200">
              INCOIS & SARVAM AI
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">{message.timestamp}</span>
        </div>

        {/* Structured Safety Recommendation Card if risk_level exists */}
        {riskBadge && (
          <div className={`mb-3 p-3 rounded-xl border flex items-center justify-between gap-2 ${riskBadge.bg}`}>
            <div className="flex items-center gap-2">
              <riskBadge.icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-extrabold text-xs tracking-wider">{riskBadge.label}</p>
                <p className="text-[11px] opacity-90">
                  {message.weather?.forecast || 'Real-time coastal safety assessment computed'}
                </p>
              </div>
            </div>
            {message.weather && (
              <span className="text-xs font-mono font-bold shrink-0">
                {message.weather.wave_height_m?.toFixed(1)}m Waves
              </span>
            )}
          </div>
        )}

        {/* Text Message Content */}
        <div className="text-xs sm:text-sm leading-relaxed text-slate-800 break-words font-sans">
          <MarkdownRenderer content={message.text} />
        </div>

        {/* Highlight Map Action if response targeted a specific zone */}
        {message.highlightTarget && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() =>
                focusOnMapLocation(
                  message.highlightTarget!.lat,
                  message.highlightTarget!.lon,
                  message.highlightTarget!.title,
                  message.highlightTarget!.type,
                  message.highlightTarget!.zoom
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-[#0D9488] hover:bg-teal-100 transition cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Show on Satellite Map ({message.highlightTarget.title})</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Attached Evidence, Recommendations & Metrics Panel */}
        <EvidencePanel
          weather={message.weather}
          riskLevel={message.risk_level}
          plan={message.plan}
          reasoning={message.reasoning}
          sourcesUsed={message.sources_used}
          recommendations={message.recommendations}
          route={message.route}
          alerts={message.alerts}
          simulation={message.simulation}
          connectivityMode={message.connectivity_mode}
        />
      </div>
    </div>
  );
}
