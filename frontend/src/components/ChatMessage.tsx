import { useState, useRef } from 'react';
import { Volume2, Square, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import EvidencePanel from './EvidencePanel';
import type { MessageItem } from '../App';
import { synthesizeVoiceAudio } from '../services/api';

interface ChatMessageProps {
  message: MessageItem;
  currentLang?: string;
}

export default function ChatMessage({ message, currentLang = 'en' }: ChatMessageProps) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoice(false);
  };

  const handleSpeak = async (text: string) => {
    if (isPlayingVoice) {
      stopAudio();
      return;
    }

    setIsPlayingVoice(true);

    try {
      // 1. Try Sarvam AI Bulbul v3 Neural Voice Synthesis
      const synthRes = await synthesizeVoiceAudio(text, currentLang || 'en', 'kavya');
      if (synthRes && synthRes.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${synthRes.audio_base64}`;
        const audio = new Audio(audioSrc);
        audioPlayerRef.current = audio;

        audio.onended = () => {
          setIsPlayingVoice(false);
          audioPlayerRef.current = null;
        };
        audio.onerror = () => {
          fallbackWebSpeech(text);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('Sarvam TTS synthesis unavailable, falling back to Web Speech:', err);
    }

    // 2. Fallback to Browser Web Speech API
    fallbackWebSpeech(text);
  };

  const fallbackWebSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsPlayingVoice(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 400);

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

  // Render formatted markdown text blocks with high readability
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
            const content = line.replace(/^[-•*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">•</span>
                <span>{renderInlineBold(content)}</span>
              </div>
            );
          }

          // Bold title lines or headings
          if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('**')) {
            const clean = line.replace(/^#+\s*/, '');
            return (
              <div key={idx} className="font-semibold text-slate-900 pt-1">
                {renderInlineBold(clean)}
              </div>
            );
          }

          return <div key={idx}>{renderInlineBold(line)}</div>;
        })}
      </div>
    );
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-teal-800 border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2 mb-3">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-teal-700 to-sky-700 text-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-teal-100 font-mono">
            <span className="font-bold flex items-center gap-1">
              <span>👤</span> Vessel Master
            </span>
            <span className="text-teal-200/80">{message.timestamp}</span>
          </div>
          <p className="text-xs leading-relaxed text-white font-sans whitespace-pre-wrap font-medium">
            {message.text}
          </p>
        </div>
        <div className="w-7 h-7 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 text-xs shrink-0 font-bold">
          ⚓
        </div>
      </div>
    );
  }

  // Assistant message formatting (Clean white floating card)
  return (
    <div className="flex justify-start items-start gap-2 mb-3">
      <div className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-sm shrink-0 shadow-2xs font-bold mt-0.5">
        🌊
      </div>

      <div className="max-w-[94%] flex-1 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-800 p-3.5 shadow-xs">
        {/* Top Header inside message */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-teal-800 tracking-tight text-xs font-display flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>ORCA Multi-Agent</span>
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>INCOIS</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Listen / Voice button */}
            <button
              onClick={() => handleSpeak(message.text)}
              title={isPlayingVoice ? 'Stop Audio' : 'Listen via Regional Voice'}
              className={`px-2 py-0.5 rounded-md text-[10px] font-sans font-medium flex items-center gap-1 transition cursor-pointer ${
                isPlayingVoice
                  ? 'bg-rose-100 text-rose-700 font-bold animate-pulse border border-rose-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isPlayingVoice ? <Square className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
              <span>{isPlayingVoice ? 'Stop' : 'Listen'}</span>
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy advisory"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>

            <span className="text-slate-400 text-[10px] pl-1">{message.timestamp}</span>
          </div>
        </div>

        {/* Message body */}
        <div className="py-0.5">
          {renderFormattedText(message.text)}
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
