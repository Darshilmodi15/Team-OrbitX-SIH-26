import { useState } from 'react';
import EvidencePanel from './EvidencePanel';
import type { MessageItem } from '../App';

interface ChatMessageProps {
  message: MessageItem;
  currentLang?: string;
}

export default function ChatMessage({ message, currentLang = 'en' }: ChatMessageProps) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const isUser = message.sender === 'user';

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 350);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;

    const langVoiceMap: Record<string, string> = {
      gu: 'gu-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      ml: 'ml-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      en: 'en-IN',
    };

    const targetCode = langVoiceMap[currentLang] || 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang === targetCode || v.lang.startsWith(currentLang)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setIsPlayingVoice(true);
    utterance.onend = () => setIsPlayingVoice(false);
    utterance.onerror = () => setIsPlayingVoice(false);

    window.speechSynthesis.speak(utterance);
  };

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2.5 mb-4 group animate-fadeIn">
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
    <div className="flex justify-start items-start gap-2.5 mb-4 group animate-fadeIn">
      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/40 border border-cyan-400/50 flex items-center justify-center text-sm shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
        🌊
      </div>

      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-sm bg-slate-900/85 backdrop-blur-xl text-slate-100 p-4 shadow-xl border border-slate-800 hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-800 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-300 tracking-wide text-xs">ORCA Marine AI</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[9px] font-semibold">
              EVIDENCE VERIFIED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSpeak(message.text)}
              title={isPlayingVoice ? 'Stop Voice' : 'Listen in Regional Language'}
              className={`p-1 rounded-md text-xs transition cursor-pointer ${
                isPlayingVoice
                  ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700'
              }`}
            >
              {isPlayingVoice ? '⏹️ Stop' : '🔊 Voice'}
            </button>
            <span className="text-slate-400 text-[10px]">{message.timestamp}</span>
          </div>
        </div>

        {/* Message body with Markdown line breaks */}
        <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
          {message.text}
        </div>

        {/* Attached multi-agent evidence, metrics, and reasoning */}
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
