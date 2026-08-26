import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { useI18n, type LangCode } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { answerQuestion } from "@/lib/orca/assistant";
import { useSafetyLabel } from "@/components/orca/SafetyStatus";
import type { ChatMessage } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

const SPEECH_LANG_MAP: Record<LangCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  gu: "gu-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
  bn: "bn-IN",
  kn: "kn-IN",
  or: "or-IN",
  pa: "pa-IN",
};

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export default function AssistantPage() {
  const { lang, t } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);
  const levelLabel = useSafetyLabel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    if (isListening) {
      stopListening();
    }
    const now = Date.now();
    const reply = answerQuestion(question, {
      location: location ?? null,
      bundle: marine.data ?? null,
      levelLabel,
      lang: (lang as LangCode) || "en",
    });
    setMessages((m) => [
      ...m,
      { id: `u${now}`, role: "user", text: question, at: now },
      { id: `a${now}`, role: "assistant", text: reply, at: now + 1 },
    ]);
    setInput("");
    setSpeechStatus(null);
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
      setSpeechStatus(null);
      return;
    }

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechStatus("Speech recognition is not supported in this browser.");
      setTimeout(() => setSpeechStatus(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[(lang as LangCode) || "en"] || "en-IN";

      const initialInput = input ? input.trim() + " " : "";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus("Listening... speak your question");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(initialInput + transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechStatus("Microphone permission denied. Please allow microphone access.");
        } else if (event.error !== "no-speech") {
          setSpeechStatus(`Audio input error: ${event.error}`);
        }
        setTimeout(() => setSpeechStatus(null), 4500);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechStatus(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setSpeechStatus("Could not start microphone.");
      setTimeout(() => setSpeechStatus(null), 4000);
    }
  }

  const suggestions = [t("chat.s1"), t("chat.s2"), t("chat.s3"), t("chat.s4")];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <header>
          <h1 className="text-xl font-semibold">{t("chat.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("chat.subtitle")}</p>
        </header>

        {/* Suggested question chips */}
        <ul className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => ask(s)}
                className="cursor-pointer rounded-full border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>

        {/* Conversation messages */}
        {messages.length > 0 && (
          <div className="mt-4 flex-1 space-y-3" aria-live="polite">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                    : "mr-auto max-w-[92%] whitespace-pre-line rounded-md border border-border bg-card px-3 py-2 text-sm"
                }
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}

        {/* Listening / speech status banner if active */}
        {speechStatus && (
          <div
            role="status"
            className={cn(
              "mt-3 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              isListening
                ? "border border-teal-200 bg-teal-50 text-teal-800 animate-pulse"
                : "border border-border bg-muted text-muted-foreground",
            )}
          >
            {isListening && (
              <span className="size-2 rounded-full bg-teal-600 animate-ping" aria-hidden />
            )}
            <span>{speechStatus}</span>
          </div>
        )}

        {/* Single chatbot message/input area with mic + send buttons */}
        <form
          className="sticky bottom-20 mt-4 flex items-end gap-2 rounded-md border border-border bg-card p-2 lg:bottom-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            className="max-h-40 min-h-11 flex-1 resize-y break-words border-0 bg-transparent text-base shadow-none outline-none"
          />

          {/* Voice input microphone button */}
          <button
            type="button"
            onClick={toggleListening}
            aria-pressed={isListening}
            aria-label={isListening ? "Stop listening" : "Voice input"}
            className={cn(
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all",
              isListening
                ? "bg-red-500 text-white shadow-md ring-2 ring-red-300 animate-pulse"
                : "border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            title={isListening ? "Listening... Click to stop" : "Speak your question"}
          >
            {isListening ? (
              <MicOff className="size-4 text-white" aria-hidden />
            ) : (
              <Mic className="size-4" aria-hidden />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-secondary text-secondary-foreground transition hover:brightness-110"
            aria-label={t("chat.send")}
          >
            <Send className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
