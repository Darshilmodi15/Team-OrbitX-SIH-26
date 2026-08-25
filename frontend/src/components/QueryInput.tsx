<<<<<<< HEAD
import React, { useState } from 'react';
import { Send, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { getQuickPrompts } from '../data/quickPrompts';
=======
import React, { useState, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Check, Edit3, X } from 'lucide-react';
import { TRANSLATIONS } from '../data/maritimeData';
import { getQuickPrompts } from '../data/quickPrompts';
import { transcribeVoiceAudio } from '../services/api';
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({ onSendMessage, isLoading, currentLang = 'en' }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptPending, setTranscriptPending] = useState<string | null>(null);

<<<<<<< HEAD
=======
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
  const t = (TRANSLATIONS[currentLang] || TRANSLATIONS.en) as any;
  const quickPrompts = getQuickPrompts(currentLang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    setTranscriptPending(null);
  };

<<<<<<< HEAD
  const handleQuickPrompt = (query: string) => {
    if (isLoading) return;
    onSendMessage(query);
  };

  const handleVoiceInput = () => {
=======
  const handleSendPrompt = (promptText: string) => {
    if (isLoading) return;
    onSendMessage(promptText);
  };

  const handleSendTranscript = () => {
    if (!transcriptPending || isLoading) return;
    onSendMessage(transcriptPending);
    setTranscriptPending(null);
    setInput('');
  };

  const handleEditTranscript = () => {
    if (transcriptPending) {
      setInput(transcriptPending);
      setTranscriptPending(null);
    }
  };

  const startRecording = async () => {
    setTranscriptPending(null);
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
            setTranscriptPending(result.transcript);
          }
        } catch (err) {
          console.warn('Sarvam STT failed, falling back to Web Speech API:', err);
        } finally {
          setIsTranscribing(false);
          setIsRecording(false);
          stream.getTracks().forEach((trk) => trk.stop());
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission denied or not supported:', err);
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
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
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
        if (transcript) {
          setTranscriptPending(transcript);
        }
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

<<<<<<< HEAD
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
=======
  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const placeholderText =
    currentLang === 'gu'
      ? 'દરિયાઈ હવામાન, PFZ માછીમારી ઝોન અથવા સુરક્ષા વિશે પૂછો...'
      : currentLang === 'hi'
      ? 'समुद्री मौसम, PFZ मत्स्य क्षेत्र या सुरक्षा के बारे में पूछें...'
      : currentLang === 'mr'
      ? 'सागरी हवामान, PFZ मासेमारी क्षेत्र किंवा सुरक्षेबद्दल विचारा...'
      : currentLang === 'ta'
      ? 'கடல் வானிலை, PFZ மீன்பிடி மண்டலம் பற்றி கேளுங்கள்...'
      : currentLang === 'ml'
      ? 'കാലാവസ്ഥ, PFZ മത്സ്യബന്ധന മേഖല എന്നിവ ചോദിക്കുക...'
      : t.askPlaceholder || 'Ask ORCA anything about the sea...';

  return (
    <div className="p-3 bg-white border-t border-slate-200 shrink-0 font-sans">
      {/* Voice Status Indicator Pill */}
      {isRecording && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-ping"></span>
            <span>Recording Indian Regional Audio (Sarvam AI)... Click mic to finish.</span>
          </span>
          <span className="font-mono font-bold text-[11px] text-rose-800">LISTENING</span>
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
        </div>
      )}

<<<<<<< HEAD
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
=======
      {isTranscribing && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
          <span>Transcribing Indic Speech via Sarvam Saaras v3 STT...</span>
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
        </div>
      )}

      {/* "You said:" Voice Confirmation & Edit Box */}
      {/* Voice Transcript Preview Card (Light Maritime Theme) */}
      {transcriptPending && (
        <div className="mb-2.5 p-3 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0F172A] shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#0F766E] mb-1">
            <span>🎤 Voice Recognition Result:</span>
            <button
              onClick={() => setTranscriptPending(null)}
              className="text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#1E293B] font-medium mb-2.5 italic">
            "{transcriptPending}"
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTranscript}
              className="flex-1 py-1.5 px-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Send Query</span>
            </button>
            <button
              onClick={handleEditTranscript}
              className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#334155] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Edit Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>Quick:</span>
        </span>
        {quickPrompts.slice(0, 4).map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendPrompt(prompt.query)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] text-slate-700 hover:text-teal-900 transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt.icon} {prompt.label}
          </button>
        ))}
      </div>

<<<<<<< HEAD
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
=======
      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        {/* Voice Input Button */}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={isLoading || isTranscribing}
          title={isRecording ? 'Stop Recording' : 'Speak in your regional language'}
          className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
            isRecording
              ? 'bg-rose-600 text-white border-rose-700 shadow-[0_0_12px_rgba(225,29,72,0.5)] animate-bounce'
              : 'bg-slate-100 hover:bg-teal-50 border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Text Input Field */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholderText}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
        />

        {/* Submit Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
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
