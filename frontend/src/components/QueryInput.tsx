import React, { useState, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { getQuickPrompts } from '../data/quickPrompts';
import { transcribeVoiceAudio } from '../services/api';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({ onSendMessage, isLoading, currentLang = 'en' }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = (TRANSLATIONS[currentLang] || TRANSLATIONS.en) as any;
  const quickPrompts = getQuickPrompts(currentLang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (query: string) => {
    if (isLoading) return;
    onSendMessage(query);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsTranscribing(true);
        try {
          // Call Sarvam Saaras Speech-to-Text API endpoint
          const result = await transcribeVoiceAudio(audioBlob, currentLang || 'auto');
          if (result && result.transcript) {
            setInput(result.transcript);
          }
        } catch (err) {
          console.warn('Sarvam STT failed, falling back to Web Speech API:', err);
        } finally {
          setIsTranscribing(false);
          setIsRecording(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission denied or not supported:', err);
      // Fallback to Web Speech Recognition API
      handleBrowserSpeechFallback();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  const handleBrowserSpeechFallback = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recording requires microphone permissions or Chrome/Edge browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langCodes: Record<string, string> = {
        gu: 'gu-IN',
        hi: 'hi-IN',
        mr: 'mr-IN',
        ta: 'ta-IN',
        ml: 'ml-IN',
        te: 'te-IN',
        bn: 'bn-IN',
        kn: 'kn-IN',
        en: 'en-IN',
      };
      recognition.lang = langCodes[currentLang] || 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) setInput(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const placeholderText =
    currentLang === 'gu'
      ? 'દરિયાઈ હવામાન, માછીમારી ઝોન (PFZ) અથવા સુરક્ષા વિશે પૂછો...'
      : currentLang === 'hi'
      ? 'समुद्री मौसम, मत्स्य क्षेत्र (PFZ) या सुरक्षा के बारे में पूछें...'
      : currentLang === 'mr'
      ? 'सागरी हवामान, मासेमारी क्षेत्र (PFZ) किंवा सुरक्षेबद्दल विचारा...'
      : currentLang === 'ta'
      ? 'கடல் வானிலை, மீன்பிடி மண்டலம் (PFZ) அல்லது பாதுகாப்பு பற்றி கேளுங்கள்...'
      : currentLang === 'ml'
      ? 'കാലാവസ്ഥ, മത്സ്യബന്ധന മേഖല (PFZ), സുരക്ഷ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...'
      : t.askPlaceholder || 'Ask ORCA about marine weather, safety risks, or Potential Fishing Zones...';

  return (
    <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0 transition-all font-sans">
      {/* Quick Prompts Row */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-teal-800 font-semibold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-700 animate-pulse" />
            <span>{t.quickInquiries || 'QUICK INQUIRIES'}</span>
          </div>
          <span className="text-[10px] text-slate-600">Sarvam AI Speech & NMT Active</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {quickPrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPrompt(p.query)}
              title={p.query}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition-all duration-150 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs font-medium"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
              <span className="text-[10px] text-teal-600">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Status Pill */}
      {isRecording && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-ping"></span>
            <span>Recording Indian Regional Audio (Sarvam Saaras v3)... Click mic to finish.</span>
          </span>
          <span className="text-[10px] font-mono font-bold uppercase">{currentLang}</span>
        </div>
      )}

      {isTranscribing && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
          <span>Transcribing dialect speech via Sarvam AI...</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isLoading || isTranscribing}
            className="w-full h-11 bg-slate-50 border border-slate-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 rounded-xl pl-3.5 pr-11 text-xs text-slate-900 placeholder-slate-600 focus:outline-none transition-all font-sans disabled:opacity-50"
          />

          {/* Sarvam AI Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoice}
            disabled={isLoading || isTranscribing}
            title={isRecording ? 'Stop Recording' : 'Speak in Regional Language (Sarvam AI Saaras)'}
            className={`absolute right-2 p-1.5 rounded-lg text-xs transition cursor-pointer ${
              isRecording
                ? 'text-rose-600 bg-rose-100 hover:bg-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                : 'text-slate-500 hover:text-teal-800 hover:bg-slate-200'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isTranscribing}
          className="h-11 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-2xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
