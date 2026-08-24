import React, { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({ onSendMessage, isLoading, currentLang = 'en' }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

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

  const placeholderText = t.askPlaceholder || 'Ask ORCA anything about the sea...';

  return (
    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isLoading}
            className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 rounded-xl pl-3.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-sans disabled:opacity-50"
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

