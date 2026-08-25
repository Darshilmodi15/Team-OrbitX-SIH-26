import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Check, Edit3, X, CornerDownLeft } from 'lucide-react';
import { getQuickPrompts } from '../data/quickPrompts';
import { transcribeVoiceAudio } from '../services/api';
import { getStrings } from '../i18n';

interface QueryInputProps {
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  currentLang?: string;
}

export default function QueryInput({
  onSendMessage,
  isLoading,
  currentLang = 'en',
}: QueryInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptPending, setTranscriptPending] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = getStrings(currentLang);
  const quickPrompts = getQuickPrompts(currentLang);

  // Auto-expand textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
    setTranscriptPending(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
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
          // Call Sarvam AI Saaras v3 STT
          const result = await transcribeVoiceAudio(audioBlob, currentLang || 'auto');
          if (result && result.transcript) {
            setTranscriptPending(result.transcript);
          }
        } catch (err) {
          console.warn('Sarvam STT fallback to Web Speech:', err);
          handleBrowserSpeechFallback();
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
      console.warn('Microphone permission or hardware error:', err);
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
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recording requires microphone permissions on a supported browser.');
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

  return (
    <div className="border-t border-slate-200 bg-white p-2.5 sm:p-3 shrink-0">
      {/* Voice Status Indicator Banner */}
      {isRecording && (
        <div className="mb-2.5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 animate-pulse">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <span>Listening to Indic Speech (Sarvam Saaras v3)... Tap mic to finish.</span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase text-red-800">
            RECORDING
          </span>
        </div>
      )}

      {isTranscribing && (
        <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <span>Transcribing speech through Sarvam AI Saaras v3...</span>
        </div>
      )}

      {/* Voice Transcript Confirmation Card */}
      {transcriptPending && (
        <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-slate-900 shadow-2xs animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-teal-900 mb-1.5">
            <span>🎤 Transcribed Regional Input:</span>
            <button
              type="button"
              onClick={() => setTranscriptPending(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs font-medium text-slate-800 italic mb-2.5 bg-white p-2 rounded-md border border-teal-100">
            "{transcriptPending}"
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendTranscript}
              className="flex-1 rounded-md bg-[#0D9488] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#0F766E] transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{t.sendQuery}</span>
            </button>
            <button
              type="button"
              onClick={handleEditTranscript}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#0D9488]" />
              <span>{t.editText}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-2.5 w-2.5 text-[#0D9488]" />
        </span>
        {quickPrompts.slice(0, 3).map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendPrompt(prompt.query)}
            disabled={isLoading}
            title={prompt.label}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-[#0D9488] hover:bg-teal-50 hover:text-teal-800 transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            <span className="text-xs">{prompt.icon}</span>
            <span>{prompt.label}</span>
          </button>
        ))}
      </div>

      {/* Main Input Field & Actions */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
        {/* Voice Input Microphone */}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={isLoading || isTranscribing}
          title={isRecording ? 'Stop Recording' : 'Speak in your regional language'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition cursor-pointer ${
            isRecording
              ? 'bg-red-600 text-white border-red-700 shadow-md animate-bounce'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700'
          }`}
        >
          {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>

        {/* Multi-line Auto-Expanding Textarea */}
        <div className="relative flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chatPlaceholder}
            disabled={isLoading}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0D9488]/20 transition leading-relaxed max-h-24"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A2540] text-white shadow-xs hover:bg-[#081D33] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Send query"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
