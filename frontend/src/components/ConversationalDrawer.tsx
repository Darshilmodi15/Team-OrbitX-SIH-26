import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronDown, ChevronUp, Copy, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, User, ArrowRight, RotateCcw, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { speakText } from '../services/apiService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'orca';
  text: string;
  timestamp: string;
  riskLevel?: 'safe' | 'caution' | 'unsafe';
  reasoningCount?: number;
  language?: string;
  languageName?: string;
}

interface ConversationalDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  currentLang: string;
  onOpenReasoning: () => void;
  onClearChat?: () => void;
}

export const ConversationalDrawer: React.FC<ConversationalDrawerProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentLang,
  onOpenReasoning,
  onClearChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // 6 Quick Options organized in EXACT 2-button-per-row grid (3 rows)
  const quickOptions = [
    { id: 'pfz', label: t.optNearestPfz || 'Nearest PFZ', icon: '🐟', query: t.starterQ1 || 'Where is the nearest Potential Fishing Zone?' },
    { id: 'safety', label: t.optIsSafe || 'Is it safe?', icon: '🛡️', query: t.starterQ2 || 'Is it safe to venture into the sea tomorrow?' },
    { id: 'tide', label: t.optTideWeather || 'Tide & Weather', icon: '🌤️', query: t.starterQ3 || 'What are the tide and weather conditions?' },
    { id: 'conditions', label: t.optSeaConditions || 'Sea Conditions', icon: '🌊', query: 'What are the current sea conditions, wave height, and swell?' },
    { id: 'cyclone', label: t.optCycloneAlerts || 'Cyclone Alerts', icon: '🌀', query: t.starterQ4 || 'Are there any cyclone or lightning alerts?' },
    { id: 'route', label: t.optSafeRoute || 'Safe Route', icon: '🧭', query: t.starterQ5 || 'Suggest a safe route for my fishing vessel.' },
  ];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Setup Web Speech API for voice recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLang === 'en' || currentLang === 'auto' ? 'en-IN' : `${currentLang}-IN`;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onSendMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [currentLang, onSendMessage]);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSpeak = (msgId: string, text: string, msgLang?: string) => {
    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      setSpeakingId(msgId);
      const voiceLang = msgLang && msgLang !== 'auto' ? msgLang : (currentLang !== 'auto' ? currentLang : 'en');
      speakText(text, voiceLang);
    }
  };

  const handleCopy = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render formatted AI text
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return (
      <div className="space-y-1.5 font-sans text-xs leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Heading with Emoji
          if (trimmed.startsWith('🌊') || trimmed.startsWith('🎯') || trimmed.startsWith('🛑') || trimmed.startsWith('🧭') || trimmed.startsWith('✅') || trimmed.startsWith('⚠️') || trimmed.startsWith('🚨')) {
            return (
              <div key={idx} className="font-semibold text-slate-900 pt-1 pb-0.5">
                {trimmed}
              </div>
            );
          }

          // Bullet item
          if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
            return (
              <div key={idx} className="pl-2.5 text-slate-700 flex items-start gap-1.5">
                <span className="text-teal-700 font-bold">•</span>
                <span>{trimmed.replace(/^[-•]\s*/, '')}</span>
              </div>
            );
          }

          return (
            <p key={idx} className="text-slate-700">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`w-full lg:w-[400px] xl:w-[440px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
        isExpanded ? 'h-full' : 'h-[60px]'
      }`}
    >
      {/* 1. Chatbot Header (Fixed) */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Bot className="w-4 h-4" />
            </div>
            {/* Online pulsing green dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs md:text-sm font-bold font-display text-slate-900 leading-none truncate">
                {t.chatHeaderTitle || 'ORCA Marine Intelligence'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t.onlineStatus || 'Online'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
              {t.chatHeaderSubtitle || 'Agentic Decision Support Engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onClearChat && messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Clear Conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 2. Chatbot Quick Actions: TWO BUTTONS PER ROW (3 Rows = 6 Buttons) */}
          <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-700" />
                {t.quickOptionsTitle || 'Quick Options'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onSendMessage(opt.query)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-center transition shadow-2xs cursor-pointer truncate"
                  title={opt.query}
                >
                  <span className="text-xs shrink-0">{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Conversation Stream Area (Only this area scrolls) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs bg-slate-50/30">
            {messages.length === 0 ? (
              /* Chatbot Welcome Screen */
              <div className="h-full flex flex-col justify-center text-center p-4 text-slate-500 space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-2xl mx-auto shadow-xs">
                  🌊
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm whitespace-pre-line">
                    {t.welcomeGreeting || "Hello! I'm ORCA,\nyour marine intelligence assistant."}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {t.welcomeIntro || 'You can ask me about PFZ, sea safety, weather, tides, waves, cyclone alerts, geofences and safe routes.'}
                  </p>
                </div>

                {/* Example Questions List */}
                <div className="text-left bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    {t.welcomeDetails || 'Example questions:'}
                  </span>
                  {[
                    t.starterQ1 || 'Where is the nearest Potential Fishing Zone?',
                    t.starterQ2 || 'Is it safe to venture into the sea tomorrow?',
                    t.starterQ3 || 'What are the tide and weather conditions?',
                    t.starterQ4 || 'Are there any cyclone or lightning alerts?',
                    t.starterQ5 || 'Suggest a safe route for my fishing vessel.',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(q)}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-900 text-slate-700 text-[11px] font-medium flex items-center justify-between group transition cursor-pointer"
                    >
                      <span className="truncate">{q}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-teal-700 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                    {msg.sender === 'user' ? (
                      <>
                        <span>You</span>
                        <User className="w-3 h-3 text-teal-700" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-teal-700" />
                        <span className="font-bold text-teal-800">ORCA Marine AI</span>
                        {msg.languageName && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200 text-[9px] text-teal-800 font-mono">
                            🌐 {msg.languageName}
                          </span>
                        )}
                      </>
                    )}
                    <span>• {msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[94%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-teal-700 text-white rounded-tr-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {/* Safety Badge for ORCA response if present */}
                    {msg.sender === 'orca' && msg.riskLevel && (
                      <div className="mb-2">
                        {msg.riskLevel === 'safe' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            {t.safeStatus || 'Safe Navigation'}
                          </span>
                        )}
                        {msg.riskLevel === 'caution' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            {t.cautionStatus || 'Caution Advised'}
                          </span>
                        )}
                        {msg.riskLevel === 'unsafe' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-bold text-[10px]">
                            <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                            {t.dangerStatus || 'Severe Weather Hazard'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    {msg.sender === 'user' ? (
                      <p className="font-sans text-xs">{msg.text}</p>
                    ) : (
                      renderFormattedText(msg.text)
                    )}

                    {/* Operational Action Bar for ORCA responses */}
                    {msg.sender === 'orca' && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSpeak(msg.id, msg.text, msg.language)}
                            className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium transition cursor-pointer"
                            title="Listen to audio speech synthesis"
                          >
                            {speakingId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>{speakingId === msg.id ? (t.stopListenBtn || 'Stop') : (t.listenBtn || 'Listen')}</span>
                          </button>

                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 font-medium transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedId === msg.id ? (t.copiedBtn || 'Copied!') : (t.copyBtn || 'Copy')}</span>
                          </button>
                        </div>

                        <button
                          onClick={onOpenReasoning}
                          className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>🧠 {t.viewAgentProof || 'View Agent Proof'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 bg-white border border-teal-200 text-teal-800 text-xs font-mono p-2.5 rounded-xl shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping shrink-0" />
                <span>{t.loadingAgents || 'Multi-Agents decomposing query & fetching ISRO satellite data...'}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 4. Fixed Chat Input Bar */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? (t.listeningText || 'Listening to your voice...') : (t.chatInputPlaceholder || 'Ask ORCA anything about the sea...')}
                disabled={isLoading}
                className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition"
              />

              {/* Microphone Voice Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2.5 rounded-xl border transition shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Tap to speak in any Indian language"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

