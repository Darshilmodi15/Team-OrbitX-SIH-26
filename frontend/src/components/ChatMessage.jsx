import React from 'react';
import EvidencePanel from './EvidencePanel';

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white p-3.5 shadow-md border border-[#38bdf8]/30">
          <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-sky-200/80 font-mono">
            <span className="font-semibold">You (Vessel Master)</span>
            <span>{message.timestamp}</span>
          </div>
          <p className="text-sm leading-relaxed text-sky-50 whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    );
  }

  // Assistant message formatting
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[95%] w-full rounded-2xl rounded-tl-sm bg-[#0a152e]/85 backdrop-blur-md text-slate-100 p-4 shadow-lg border border-[#00f0ff]/20">
        <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800/80 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#00f0ff]/20 border border-[#00f0ff]/40 flex items-center justify-center text-xs">
              🌊
            </div>
            <span className="font-bold text-[#00f0ff] tracking-wide">ORCA Marine AI</span>
          </div>
          <span className="text-slate-500">{message.timestamp}</span>
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
