import EvidencePanel from './EvidencePanel';
import type { MessageItem } from '../App';

interface ChatMessageProps {
  message: MessageItem;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2.5 mb-4 group">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-3.5 shadow-lg border border-cyan-400/30">
          <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-cyan-100 font-mono">
            <span className="font-bold flex items-center gap-1">
              <span>👤</span> Vessel Master
            </span>
            <span className="text-[10px] text-cyan-200/75">{message.timestamp}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-50 font-sans whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 border border-cyan-400/50 flex items-center justify-center text-xs shrink-0 shadow-md">
          ⚓
        </div>
      </div>
    );
  }

  // Assistant message formatting
  return (
    <div className="flex justify-start items-start gap-2.5 mb-4 group">
      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/40 border border-cyan-400/50 flex items-center justify-center text-sm shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
        🌊
      </div>

      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-sm bg-slate-900/80 backdrop-blur-xl text-slate-100 p-4 shadow-xl border border-slate-800 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-800 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#22d3ee] tracking-wide text-xs">ORCA Marine AI</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-[#22d3ee] border border-cyan-500/30 text-[9px] font-semibold">
              AGENT REASONING
            </span>
          </div>
          <span className="text-slate-400 text-[10px]">{message.timestamp}</span>
        </div>

        {/* Message body */}
        <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
          {message.text}
        </div>

        {/* Attached evidence & metrics if present */}
        <EvidencePanel
          weather={message.weather}
          riskLevel={message.risk_level}
          plan={message.plan}
          reasoning={message.reasoning}
          sourcesUsed={message.sources_used}
        />
      </div>
    </div>
  );
}
