import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Compass,
  Copy,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  Trash2,
  User,
  Waves,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { answerQuestion } from "@/lib/orca/assistant";
import { useSafetyLabel } from "@/components/orca/SafetyStatus";
import type { ChatMessage } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = "orca_assistant_threads_v1";

function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveThreads(threads: ChatThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // ignore
  }
}

export default function AssistantPage() {
  const { t, lang } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);
  const levelLabel = useSafetyLabel();

  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    const existing = loadThreads();
    return existing.length > 0 ? existing[0].id : "default";
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active thread
  const currentThread = threads.find((th) => th.id === activeThreadId) || {
    id: activeThreadId,
    title: t("chat.title"),
    updatedAt: Date.now(),
    messages: [],
  };

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [currentThread.messages.length]);

  function createNewThread() {
    const newId = `thread_${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: `${t("chat.title")} ${threads.length + 1}`,
      updatedAt: Date.now(),
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setInput("");
    inputRef.current?.focus();
  }

  function deleteThread(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const filtered = threads.filter((th) => th.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      setActiveThreadId(filtered.length > 0 ? filtered[0].id : "default");
    }
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;

    const now = Date.now();
    const reply = answerQuestion(question, {
      location: location ?? null,
      bundle: marine.data ?? null,
      levelLabel,
      lang,
    });

    const userMsg: ChatMessage = { id: `u_${now}`, role: "user", text: question, at: now };
    const botMsg: ChatMessage = { id: `a_${now + 1}`, role: "assistant", text: reply, at: now + 1 };

    setThreads((prev) => {
      const idx = prev.findIndex((th) => th.id === activeThreadId);
      if (idx >= 0) {
        const updated = [...prev];
        const isFirst = updated[idx].messages.length === 0;
        updated[idx] = {
          ...updated[idx],
          title: isFirst ? (question.length > 28 ? `${question.slice(0, 28)}...` : question) : updated[idx].title,
          updatedAt: now,
          messages: [...updated[idx].messages, userMsg, botMsg],
        };
        return updated;
      } else {
        const newThread: ChatThread = {
          id: activeThreadId,
          title: question.length > 28 ? `${question.slice(0, 28)}...` : question,
          updatedAt: now,
          messages: [userMsg, botMsg],
        };
        return [newThread, ...prev];
      }
    });

    setInput("");
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const suggestions = [
    { label: t("chat.s1"), icon: ShieldCheck },
    { label: t("chat.s2"), icon: Compass },
    { label: t("chat.s3"), icon: Waves },
    { label: t("chat.s4"), icon: AlertTriangle },
  ];

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-8.5rem)] w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Left ChatGPT-Style Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-surface/80 transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-64 sm:w-72" : "w-0 overflow-hidden border-r-0",
          )}
        >
          {/* Top New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={createNewThread}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 px-3.5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <MessageSquarePlus className="size-4" />
                <span>New Chat</span>
              </span>
              <Sparkles className="size-3.5 opacity-80" />
            </button>
          </div>

          {/* History Thread List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Conversations
            </p>
            {threads.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-muted-foreground italic">No past conversations</p>
            ) : (
              threads.map((th) => {
                const isActive = th.id === activeThreadId;
                return (
                  <div
                    key={th.id}
                    onClick={() => setActiveThreadId(th.id)}
                    className={cn(
                      "group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/30"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MessageSquare className={cn("size-3.5 shrink-0", isActive ? "text-teal-400" : "text-muted-foreground")} />
                      <span className="truncate">{th.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteThread(th.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity p-1 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer Info */}
          <div className="border-t border-border p-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>ORCA Maritime Copilot</span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-mono">v2.4</span>
          </div>
        </aside>

        {/* Right Main Chat Panel */}
        <section className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Chat Header */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xs sm:text-sm font-bold text-foreground">
                  {currentThread.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-[11px] font-medium text-teal-400">
                <Bot className="size-3" />
                Live Ocean LLM
              </span>
              {currentThread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setThreads((prev) =>
                      prev.map((th) => (th.id === activeThreadId ? { ...th, messages: [] } : th)),
                    );
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-red-400"
                >
                  <Trash2 className="size-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </header>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {currentThread.messages.length === 0 ? (
              /* ChatGPT-Style Empty State */
              <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shadow-md">
                  <Bot className="size-7" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{t("chat.title")}</h2>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground">{t("chat.subtitle")}</p>

                {/* 4 Interactive Starting Cards */}
                <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {suggestions.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(label)}
                      className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-xs font-medium text-foreground transition-all hover:border-teal-500/50 hover:bg-muted shadow-xs active:scale-[0.98]"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-teal-400 group-hover:scale-110 transition-transform" />
                      <span className="leading-snug">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Bubbles */
              currentThread.messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border",
                      m.role === "user"
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-teal-500/15 border-teal-500/30 text-teal-400",
                    )}
                  >
                    {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>

                  {/* Message Content Body */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {m.role === "user" ? "You" : "ORCA Marine Intelligence"}
                      </span>
                      {m.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, m.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="Copy message"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="size-3 text-teal-400" />
                              <span className="text-teal-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs",
                        m.role === "user"
                          ? "bg-secondary text-secondary-foreground font-medium"
                          : "border border-border bg-card text-foreground",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Bottom Docked ChatGPT-Style Input */}
          <div className="border-t border-border bg-card/90 p-3 sm:p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl space-y-2">
              {/* Quick suggestion chips */}
              {currentThread.messages.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {suggestions.map(({ label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(label)}
                      className="cursor-pointer shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted hover:border-teal-500/40 shadow-xs"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box */}
              <form
                className="flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-inner focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  rows={1}
                  placeholder={t("chat.placeholder")}
                  aria-label={t("chat.placeholder")}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0"
                />

                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("chat.send")}
                >
                  <Send className="size-4" />
                </button>
              </form>

              <p className="text-center text-[10px] text-muted-foreground">
                ORCA Marine AI is grounded on live oceanographic sensors. Always follow official VHF maritime advisories.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
