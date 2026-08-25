import React, { useState } from 'react';
import { Send, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { getQuickPrompts } from '../data/quickPrompts';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({ onSendMessage, isLoading, currentLang = 'en' }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

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

  const placeholderText =
    currentLang === 'gu'
      ? 'દરિયાઈ હવામાન, સુરક્ષા અથવા માછીમારી વિસ્તાર (PFZ) વિશે પૂછો...'
      : currentLang === 'hi'
      ? 'समुद्री मौसम, सुरक्षा या मत्स्य क्षेत्र (PFZ) के बारे में पूछें...'
      : currentLang === 'mr'
      ? 'सागरी हवामान, सुरक्षा किंवा मासेमारी क्षेत्राबद्दल विचारा...'
      : currentLang === 'ta'
      ? 'கடல் வானிலை, பாதுகாப்பு அல்லது PFZ மண்டலம் பற்றி கேளுங்கள்...'
      : currentLang === 'ml'
      ? 'കാലാവസ്ഥ, സുരക്ഷ അല്ലെങ്കിൽ PFZ മേഖലയെക്കുറിച്ച് ചോദിക്കുക...'
      : t.askPlaceholder || 'Ask ORCA about marine weather, safety risks, or Potential Fishing Zones...';

  return (
    <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200/90 shadow-[0_-6px_24px_rgba(0,0,0,0.03)] shrink-0 select-none">
      {/* 1. Quick Inquiries Row */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
          <div className="flex items-center gap-1.5 text-[#0F766E]">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span className="text-[11px] font-mono font-extrabold tracking-wider uppercase">
              Quick Inquiries
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
            Click to ask immediately
          </span>
        </div>

        {/* Scrollable Quick Action Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-teal-600/20 scrollbar-track-transparent">
          {quickPrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPrompt(p.query)}
              title={p.query}
              className="group min-h-[38px] text-xs px-3.5 py-1.5 rounded-xl bg-slate-50/90 hover:bg-teal-50/80 border border-slate-200/90 hover:border-teal-400 text-slate-800 hover:text-teal-900 transition-all duration-200 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer font-sans"
            >
              <span className="text-sm group-hover:scale-110 transition-transform">{p.icon}</span>
              <span className="font-semibold">{p.label}</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. Spacious & Highly Visible Question Input Capsule */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Main Input Field */}
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isLoading}
            className="w-full h-14 sm:h-15 bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm sm:text-base rounded-2xl pl-5 pr-14 border-2 border-slate-200/90 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 focus:outline-none transition-all shadow-inner disabled:opacity-50"
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? t.listening || 'Listening...' : t.askVoice || 'Click to Speak (Voice Input)'}
            className={`absolute right-3.5 p-2 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'text-rose-600 bg-rose-100 ring-2 ring-rose-400 animate-pulse'
                : 'text-slate-400 hover:text-teal-700 hover:bg-teal-50 active:scale-95'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Send Button Sized Proportionally */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Send Query"
          className="h-14 sm:h-15 min-w-[95px] sm:min-w-[110px] px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#0284C7] hover:from-teal-800 hover:to-sky-700 text-white font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg shadow-teal-950/15 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
        >
          {isLoading ? (
            <>
              <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span className="hidden sm:inline font-semibold">Analyzing</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4.5 h-4.5" />
            </>
          )}
        </button>
      </form>

      {/* 3. Helper Cue */}
      <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400 font-sans">
        <div className="flex items-center gap-1.5 text-teal-700 font-medium">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>Multilingual Ocean Intelligence</span>
        </div>
        <span className="hidden sm:inline text-slate-400">Press Enter ↵ to send</span>
      </div>
    </div>
  );
}
