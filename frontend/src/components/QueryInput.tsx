import React, { useState, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Check, Edit3, X } from 'lucide-react';
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
  const [transcriptPending, setTranscriptPending] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = (TRANSLATIONS[currentLang] || TRANSLATIONS.en) as any;
  const quickPrompts = getQuickPrompts(currentLang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    setTranscriptPending(null);
  };

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
        </div>
      )}

      {isTranscribing && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
          <span>Transcribing Indic Speech via Sarvam Saaras v3 STT...</span>
        </div>
      )}

      {/* "You said:" Voice Confirmation & Edit Box */}
      {transcriptPending && (
        <div className="mb-2.5 p-3 rounded-2xl bg-teal-950/90 border border-teal-500/50 text-white shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-teal-300 mb-1">
            <span>🎤 YOU SAID:</span>
            <button
              onClick={() => setTranscriptPending(null)}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-100 font-medium mb-2.5 italic">
            "{transcriptPending}"
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTranscript}
              className="flex-1 py-1.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Send Query</span>
            </button>
            <button
              onClick={handleEditTranscript}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
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
        </button>
      </form>
    </div>
  );
}
