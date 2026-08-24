import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronDown, ChevronUp, Copy, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, User, ArrowRight } from 'lucide-react';
import { QUICK_PROMPTS, TRANSLATIONS } from '../data/maritimeData';
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
}

export const ConversationalDrawer: React.FC<ConversationalDrawerProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentLang,
  onOpenReasoning,
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

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
      alert('Speech Recognition is not supported by your browser. Please use Chrome/Edge.');
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

  return (
    <div
      className={`glass-panel border border-cyan-500/30 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col z-20 ${
        isExpanded
          ? 'w-full md:w-[460px] h-[580px] max-h-[85vh]'
          : 'w-full md:w-[460px] h-[64px]'
      }`}
    >
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-700/70 flex items-center justify-between bg-navy-950/60 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-navy-950" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-white">ORCA Marine Intelligence</h3>
            <p className="text-[10px] text-slate-400 font-mono">Bhashini Multilingual Decision Support</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Quick Scenario Chips */}
          <div className="px-3 py-2 bg-navy-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap pl-1">
              <Sparkles className="w-3 h-3" /> Quick:
            </span>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.id}
                onClick={() => onSendMessage(p.text)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-slate-800/90 hover:bg-cyan-950 hover:border-cyan-400/60 border border-slate-700 text-slate-300 transition flex items-center gap-1"
              >
                <span>{p.text.length > 32 ? p.text.slice(0, 32) + '...' : p.text}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl">
                  🧭
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-sm">Ask anything about marine conditions</p>
                  <p className="text-[11px] mt-1">
                    Ask in Gujarati, Hindi, Tamil, Telugu, Marathi, or English. ORCA automatically detects your language and provides safety advisories.
                  </p>
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
                        <User className="w-3 h-3 text-cyan-400" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-cyan-400" />
                        <span className="font-bold text-cyan-300">ORCA Multi-Agent Synthesis</span>
                        {msg.languageName && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 border border-cyan-400/40 text-[9px] text-cyan-300 font-mono">
                            🌐 {msg.languageName}
                          </span>
                        )}
                      </>
                    )}
                    <span>• {msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                        : 'glass-card border border-slate-700/70 text-slate-200 rounded-tl-none shadow-lg'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans text-[12px] space-y-1">
                      {msg.text}
                    </div>

                    {/* Operational Action Bar for ORCA responses */}
                    {msg.sender === 'orca' && (
                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSpeak(msg.id, msg.text, msg.language)}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition"
                            title="Listen to audio advisory"
                          >
                            {speakingId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                          </button>

                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedId === msg.id ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>

                        <button
                          onClick={onOpenReasoning}
                          className="text-cyan-300 hover:text-cyan-200 underline font-medium flex items-center gap-1"
                        >
                          <span>🧠 View Agent Proof</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}


            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono p-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Multi-Agents decomposing query & fetching ISRO satellite data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <form onSubmit={handleSubmit} className="p-3 bg-navy-950/80 border-t border-slate-800 rounded-b-2xl">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? t.listening || 'Listening to your voice...' : 'Ask about PFZ, sea safety, route, or geofences...'}
                disabled={isLoading}
                className="flex-1 bg-navy-900 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 border border-cyan-500/30 focus:outline-none focus:border-cyan-400 transition"
              />

              {/* Voice recognition button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-400 shadow-glow-rose animate-pulse'
                    : 'bg-navy-800 hover:bg-navy-700 text-cyan-400 border-slate-700'
                }`}
                title={t.askVoice || 'Tap to Speak Query'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Submit Query button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-cyan"
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
