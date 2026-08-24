import React, { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { getQuickPrompts } from '../data/quickPrompts';
import { Sparkles, Mic, ArrowRight } from 'lucide-react';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({ onSendMessage, isLoading, currentLang = 'en' }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
<<<<<<< HEAD
  const quickPrompts = getQuickPrompts(currentLang);
=======
>>>>>>> e8bf8c9d1355fa57659125424ea05e5574ea5102

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in your browser.');
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
        or: 'or-IN',
        pa: 'pa-IN',
        en: 'en-IN',
      };
      recognition.lang = langCodes[currentLang] || 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

<<<<<<< HEAD
  const placeholderText = currentLang === 'gu'
    ? 'દરિયાઈ હવામાન, માછીમારી ઝોન (PFZ) અથવા સુરક્ષા વિશે પૂછો...'
    : currentLang === 'hi'
    ? 'समुद्री मौसम, मत्स्य क्षेत्र (PFZ) या सुरक्षा के बारे में पूछें...'
    : currentLang === 'mr'
    ? 'सागरी हवामान, मासेमारी क्षेत्र (PFZ) किंवा सुरक्षेबद्दल विचारा...'
    : currentLang === 'ta'
    ? 'கடல் வானிலை, மீன்பிடி மண்டலம் (PFZ) அல்லது பாதுகாப்பு பற்றி கேளுங்கள்...'
    : currentLang === 'ml'
    ? 'കാലാവസ്ഥ, മത്സ്യബന്ധന മേഖല (PFZ), സുരക്ഷ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...'
    : 'Ask ORCA about marine weather, safety risks, or Potential Fishing Zones...';

  return (
    <div className="p-3.5 sm:p-4 bg-[#030a1c]/95 border-t border-cyan-500/25 backdrop-blur-2xl shrink-0 transition-all">
      {/* Prominent, Clean & Minimalistic Quick Inquiries Row */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
              Quick Inquiries
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">Click to ask immediately</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
          {quickPrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPrompt(p.query)}
              title={p.query}
              className="group text-xs px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-cyan-950/50 border border-slate-700/80 hover:border-cyan-400 text-slate-200 hover:text-cyan-200 transition-all duration-200 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 active:scale-95 cursor-pointer font-sans"
            >
              <span className="text-sm group-hover:scale-110 transition-transform">{p.icon}</span>
              <span className="font-semibold text-slate-100 group-hover:text-cyan-300">{p.label}</span>
              <span className="text-[10px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-cyan-400">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Input Capsule */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 relative">
=======
  const placeholderText = t.askPlaceholder || 'Ask ORCA anything about the sea...';

  return (
    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
>>>>>>> e8bf8c9d1355fa57659125424ea05e5574ea5102
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isLoading}
<<<<<<< HEAD
            className="w-full bg-slate-900/95 border border-slate-700/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans disabled:opacity-50 shadow-inner"
=======
            className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 rounded-xl pl-3.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-sans disabled:opacity-50"
>>>>>>> e8bf8c9d1355fa57659125424ea05e5574ea5102
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? t.listening || 'Listening...' : t.askVoice || 'Click to Speak'}
            className={`absolute right-2.5 p-1 rounded-lg text-xs transition cursor-pointer ${
              isListening
                ? 'text-rose-600 bg-rose-100 animate-pulse'
                : 'text-slate-400 hover:text-teal-700 hover:bg-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="h-11 px-4 rounded-xl bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
        >
          {isLoading ? (
<<<<<<< HEAD
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              <span className="hidden sm:inline">Analyzing</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <ArrowRight className="w-4 h-4" />
=======
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3.5 h-3.5" />
>>>>>>> e8bf8c9d1355fa57659125424ea05e5574ea5102
            </>
          )}
        </button>
      </form>
    </div>
  );
}

