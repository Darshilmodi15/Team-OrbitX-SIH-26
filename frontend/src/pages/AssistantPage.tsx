import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { answerQuestion } from "@/lib/orca/assistant";
import { useSafetyLabel } from "@/components/orca/SafetyStatus";
import type { ChatMessage } from "@/lib/orca/types";

export default function AssistantPage() {
  const { t } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);
  const levelLabel = useSafetyLabel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    const now = Date.now();
    const reply = answerQuestion(question, {
      location: location ?? null,
      bundle: marine.data ?? null,
      levelLabel,
    });
    setMessages((m) => [
      ...m,
      { id: `u${now}`, role: "user", text: question, at: now },
      { id: `a${now}`, role: "assistant", text: reply, at: now + 1 },
    ]);
    setInput("");
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

        {/* Single chatbot message/input area with send button */}
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
