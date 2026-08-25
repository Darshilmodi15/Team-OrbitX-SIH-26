import { useRef, useEffect } from 'react';
import { Bot, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import QueryInput from './QueryInput';
import type { MessageItem } from '../context/AppContext';
import { getStrings } from '../i18n';

interface ChatPanelProps {
  messages: MessageItem[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  currentLang?: string;
  onClearError?: () => void;
  className?: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  error,
  currentLang = 'en',
  onClearError,
  className = 'h-full flex flex-col',
}: ChatPanelProps) {
  const t = getStrings(currentLang);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} currentLang={currentLang} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 px-3 py-2 sm:px-4 animate-fadeIn">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A2540] text-white shadow-2xs">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-bl-xs border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-700 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0D9488] animate-ping" />
                <span className="font-semibold text-slate-800">
                  {t.assistantLoading}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-3 my-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-xs font-bold text-red-800 hover:underline cursor-pointer ml-2"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Query Input Container */}
      <QueryInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        currentLang={currentLang}
      />
    </div>
  );
}
