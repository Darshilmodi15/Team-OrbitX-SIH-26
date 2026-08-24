import { useState } from 'react';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
}

export default function QueryInput({ onSendMessage, isLoading }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const quickPrompts = [
    { label: 'Nearest PFZ', icon: '🐟', query: 'Where is the nearest potential fishing zone?' },
    { label: 'Safety Check', icon: '🛡️', query: 'Is it safe to fish near Mumbai today?' },
    { label: 'Marine Weather', icon: '🌊', query: 'What are the current marine weather and wave conditions?' },
    { label: 'Sailing Advisory', icon: '🧭', query: 'Can small crafts sail safely this afternoon?' },
  ];

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
      recognition.lang = 'en-US';
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

  return (
    <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-2xl shrink-0">
      {/* Quick Action Tag Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-2.5 no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0 flex items-center gap-1 font-bold">
          <span>⚡</span> Quick:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(p.query)}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-slate-200 hover:text-[#22d3ee] hover:border-[#22d3ee]/50 hover:bg-slate-800/80 transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-sans"
          >
            <span>{p.icon}</span>
            <span className="font-medium">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Floating Input Capsule */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask ORCA about marine conditions, safety risk, or fishing zones..."
            disabled={isLoading}
            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/25 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans disabled:opacity-50 shadow-inner"
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? 'Listening...' : 'Click to Speak'}
            className={`absolute right-3 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isListening ? 'text-rose-400 bg-rose-950/60 animate-pulse' : 'text-slate-400 hover:text-[#22d3ee]'
            }`}
          >
            🎤
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#22d3ee] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              <span>Analyzing</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <span className="text-base font-mono">→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
