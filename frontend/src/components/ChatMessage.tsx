import { useState, useRef } from 'react';
import { Volume2, Square, Copy, Check, ShieldCheck } from 'lucide-react';
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
      const synthRes = await synthesizeVoiceAudio(text, currentLang || 'en', 'meera');
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

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2 mb-3">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-[#0F766E] to-[#0284C7] text-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-teal-100 font-mono">
            <span className="font-bold flex items-center gap-1">
              <span>👤</span> Vessel Master
            </span>
            <span className="text-[10px] text-teal-200/80">{message.timestamp}</span>
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

  // Assistant message formatting (Clean card)
  return (
    <div className="flex justify-start items-start gap-2 mb-3">
      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-base shrink-0 shadow-2xs">
        🌊
      </div>

      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-800 p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#0F766E] tracking-tight text-xs font-display">
              ORCA Marine AI
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
              <ShieldCheck className="w-2.5 h-2.5" />
              VERIFIED
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Listen / Voice button */}
            <button
              onClick={() => handleSpeak(message.text)}
              title={isPlayingVoice ? 'Stop Audio' : 'Listen via Sarvam AI Bulbul voice'}
              className={`p-1 rounded-md text-[11px] font-sans flex items-center gap-1 transition cursor-pointer ${
                isPlayingVoice
                  ? 'bg-rose-100 text-rose-700 font-bold animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {isPlayingVoice ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span className="text-[10px] hidden sm:inline">{isPlayingVoice ? 'Stop' : 'Listen'}</span>
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy response"
              className="p-1 rounded-md text-[11px] font-sans flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>

            <span className="text-slate-400 text-[10px]">{message.timestamp}</span>
          </div>
        </div>

        {/* Message body */}
        <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
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
