import { useState, useRef } from 'react';
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  Cpu,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { synthesizeVoiceAudio } from '../services/api';
import type { MessageItem } from '../context/AppContext';

interface ChatMessageProps {
  message: MessageItem;
  currentLang?: string;
}

export default function ChatMessage({ message, currentLang = 'en' }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoice = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      setAudioLoading(true);
      // Synthesize audio using Sarvam AI Bulbul v3 TTS
      const cleanText = message.text.replace(/[*_#`]/g, '').slice(0, 500);
      const res = await synthesizeVoiceAudio(cleanText, currentLang, 'kavya');
      if (res && res.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${res.audio_base64}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;

        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);

        await audio.play();
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.warn('Sarvam TTS audio synthesis failed:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const hasEvidence =
    (message.reasoning && message.reasoning.length > 0) ||
    (message.sources_used && message.sources_used.length > 0);

  return (
    <div className={`flex gap-3 px-3 py-2.5 sm:px-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A2540] text-white shadow-2xs">
          <Bot className="h-4 w-4" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
            isUser
              ? 'bg-[#0A2540] text-white rounded-br-xs'
              : 'bg-slate-50 border border-slate-200/80 text-slate-900 rounded-bl-xs'
          }`}
        >
          {/* Formatted Message Text */}
          <div className="prose prose-slate prose-xs max-w-none break-words whitespace-pre-wrap">
            {message.text}
          </div>

          {/* Assistant Actions: Audio Playback & Timestamp */}
          {!isUser && (
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayVoice}
                  disabled={audioLoading}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition cursor-pointer"
                  title="Play Sarvam AI Bulbul voice audio"
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-red-600 animate-pulse" />
                      <span className="text-[10px] font-semibold text-red-600">Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-[#0D9488]" />
                      <span className="text-[10px] font-semibold text-slate-700">Listen (Sarvam TTS)</span>
                    </>
                  )}
                </button>

                {hasEvidence && (
                  <button
                    type="button"
                    onClick={() => setShowEvidence(!showEvidence)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#0D9488] hover:bg-teal-50 transition cursor-pointer"
                  >
                    <Cpu className="h-3 w-3" />
                    <span>Decision Evidence</span>
                    {showEvidence ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                  </button>
                )}
              </div>

              <span className="font-mono text-[10px] text-slate-400">
                {message.timestamp}
              </span>
            </div>
          )}
        </div>

        {/* User Timestamp */}
        {isUser && (
          <span className="mt-1 font-mono text-[10px] text-slate-400 pr-1">
            {message.timestamp}
          </span>
        )}

        {/* Expandable Decision Evidence Drawer for Assistant */}
        {!isUser && hasEvidence && showEvidence && (
          <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xs animate-fadeIn text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#0D9488]" />
                <span>Multi-Agent Decision Evidence</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Provenance Verified
              </span>
            </div>

            {/* Reasoning Steps */}
            {message.reasoning && message.reasoning.length > 0 && (
              <div className="mb-2">
                <p className="font-semibold text-slate-700 text-[11px] mb-1">
                  Reasoning Steps:
                </p>
                <ul className="space-y-1">
                  {message.reasoning.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Sources Used */}
            {message.sources_used && message.sources_used.length > 0 && (
              <div>
                <p className="font-semibold text-slate-700 text-[11px] mb-1">
                  Data Sources Queried:
                </p>
                <div className="flex flex-wrap gap-1">
                  {message.sources_used.map((source, srcIdx) => (
                    <span
                      key={srcIdx}
                      className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 shadow-2xs">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
