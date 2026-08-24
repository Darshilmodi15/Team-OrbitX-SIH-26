import React, { useState } from 'react';
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

  // Language-specific quick prompts for fishermen & navigators
  const quickPromptsByLang: Record<string, { label: string; icon: string; query: string }[]> = {
    gu: [
      { label: 'નજીકનું PFZ ઝોન', icon: '🐟', query: 'નજીકનો સંભવિત માછીમારી વિસ્તાર (PFZ) ક્યાં આવેલો છે?' },
      { label: 'સલામતી ચકાસણી', icon: '🛡️', query: 'શું આજે દરિયામાં માછીમારી કરવા જવું સુરક્ષિત છે?' },
      { label: 'દરિયાઈ હવામાન', icon: '🌊', query: 'આજના દરિયાઈ મોજાં અને પવનની સ્થિતિ જણાવો.' },
      { label: 'નેવિગેશન સલાહ', icon: '🧭', query: 'નાની બોટ માટે સુરક્ષિત નેવિગેશન માર્ગદર્શન આપો.' },
    ],
    hi: [
      { label: 'निकटतम PFZ क्षेत्र', icon: '🐟', query: 'निकटतम संभावित मत्स्य क्षेत्र (PFZ) कहाँ स्थित है?' },
      { label: 'सुरक्षा स्थिति', icon: '🛡️', query: 'क्या आज समुद्र में नौकायन सुरक्षित है?' },
      { label: 'समुद्री मौसम', icon: '🌊', query: 'समुद्री लहरों की ऊंचाई और हवा की गति क्या है?' },
      { label: 'मार्गदर्शन', icon: '🧭', query: 'नाव के लिए सुरक्षित नेविगेशन मार्ग बताएं।' },
    ],
    mr: [
      { label: 'जवळचे PFZ क्षेत्र', icon: '🐟', query: 'जवळचे संभाव्य मासेमारी क्षेत्र (PFZ) कुठे आहे?' },
      { label: 'सुरक्षा तपासणी', icon: '🛡️', query: 'आज समुद्रात जाणे सुरक्षित आहे का?' },
      { label: 'सागरी हवामान', icon: '🌊', query: 'आज समुद्रातील लाटा आणि वाऱ्याचा वेग कसा आहे?' },
      { label: 'नेव्हिगेशन सल्ला', icon: '🧭', query: 'मासेमारी बोटीसाठी सुरक्षित मार्ग सांगा.' },
    ],
    ta: [
      { label: 'அருகிலுள்ள PFZ', icon: '🐟', query: 'அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் எங்குள்ளது?' },
      { label: 'பாதுகாப்பு சோதனை', icon: '🛡️', query: 'இன்று கடலுக்குள் செல்ல பாதுகாப்பானதா?' },
      { label: 'கடல் வானிலை', icon: '🌊', query: 'கடல் அலை உயரம் மற்றும் காற்றின் வேகம் என்ன?' },
      { label: 'வழித்தடம்', icon: '🧭', query: 'பாதுகாப்பான வழித்தட ஆலோசனையை வழங்கவும்.' },
    ],
    ml: [
      { label: 'അടുത്തുള്ള PFZ', icon: '🐟', query: 'ഏറ്റവും അടുത്തുള്ള മത്സ്യബന്ധന മേഖല എവിടെയാണ്?' },
      { label: 'സുരക്ഷാ പരിശോധന', icon: '🛡️', query: 'ഇന്ന് കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?' },
      { label: 'സമുദ്ര കാലാവസ്ഥ', icon: '🌊', query: 'ഇന്നത്തെ തിരമാല ഉയരവും കാറ്റിന്റെ വേഗതയും വ്യക്തമാക്കുക.' },
      { label: 'സുരക്ഷിത പാത', icon: '🧭', query: 'സുരക്ഷിതമായ യാത്രാ മാർഗ്ഗം നിർദ്ദേശിക്കുക.' },
    ],
    en: [
      { label: 'Nearest PFZ', icon: '🐟', query: 'Where is the nearest potential fishing zone?' },
      { label: 'Safety Check', icon: '🛡️', query: 'Is it safe to fish near our current coordinates today?' },
      { label: 'Marine Weather', icon: '🌊', query: 'What are the current wave heights and wind conditions?' },
      { label: 'Sailing Advisory', icon: '🧭', query: 'Can artisanal crafts navigate safely this afternoon?' },
    ],
  };

  const quickPrompts = quickPromptsByLang[currentLang] || quickPromptsByLang.en;

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

  const placeholderText = currentLang === 'gu'
    ? 'દરિયાઈ હવામાન, માછીમારી ઝોન (PFZ) અથવા સુરક્ષા વિશે પૂછો...'
    : currentLang === 'hi'
    ? 'समुद्री मौसम, मत्स्य क्षेत्र (PFZ) या सुरक्षा के बारे में पूछें...'
    : currentLang === 'mr'
    ? 'सागरी हवामान, मासेमारी क्षेत्र (PFZ) किंवा सुरक्षेबद्दल विचारा...'
    : 'Ask ORCA about marine weather, safety risks, or Potential Fishing Zones...';

  return (
    <div className="p-3.5 sm:p-4 bg-[#030a1c]/95 border-t border-cyan-500/20 backdrop-blur-2xl shrink-0">
      {/* Quick Action Tag Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        <span className="text-[10px] font-mono text-cyan-400 uppercase shrink-0 flex items-center gap-1 font-bold">
          <span>⚡</span> Quick:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(p.query)}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 hover:bg-slate-800/90 transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-sans"
          >
            <span>{p.icon}</span>
            <span className="font-semibold">{p.label}</span>
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
            placeholder={placeholderText}
            disabled={isLoading}
            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans disabled:opacity-50 shadow-inner"
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? t.listening || 'Listening...' : t.askVoice || 'Click to Speak'}
            className={`absolute right-3 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isListening ? 'text-rose-400 bg-rose-950/60 animate-pulse' : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            🎤
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
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
