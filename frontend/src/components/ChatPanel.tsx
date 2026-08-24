import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import QueryInput from './QueryInput';
import QuickPromptsGrid from './QuickPromptsGrid';
import type { MessageItem } from '../App';

interface ChatPanelProps {
  messages: MessageItem[];
  isLoading: boolean;
  error: string | null;
  currentLang?: string;
  onSendMessage: (question: string) => void;
  onClearError?: () => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  error,
  currentLang = 'en',
  onSendMessage,
  onClearError,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-[#030a1c]/80 backdrop-blur-2xl border-r border-cyan-500/20 relative overflow-hidden">
      {/* Panel Top Header */}
      <div className="px-4 py-3 bg-[#030a1c]/95 border-b border-cyan-500/20 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
          <span className="text-xs font-bold text-slate-200 tracking-wider font-mono uppercase">
            ORCA OPERATIONAL CONVERSATION
          </span>
        </div>
        <span className="text-[10px] text-cyan-300 font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
          {messages.length} log{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div key={msg.id || index}>
            <ChatMessage message={msg} currentLang={currentLang} />
            {/* Show prominent quick ask grid right after greeting when conversation starts */}
            {index === 0 && messages.length <= 2 && (
              <QuickPromptsGrid
                currentLang={currentLang}
                onSelectPrompt={onSendMessage}
                isLoading={isLoading}
              />
            )}
          </div>
        ))}

        {/* Loading State Animation */}
        {isLoading && (
          <div className="flex justify-start items-start gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-sm shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
              🌊
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-900/90 border border-cyan-500/40 p-4 shadow-xl text-xs font-mono text-cyan-300 flex items-center gap-3">
              <div className="relative flex items-center justify-center w-5 h-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
              </div>
              <span className="animate-pulse tracking-wide font-semibold text-slate-200">
                ORCA is synthesizing marine evidence...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/85 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-rose-300 hover:text-white font-mono px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-[10px] font-bold border border-rose-500/40 cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Query Input */}
      <QueryInput onSendMessage={onSendMessage} isLoading={isLoading} currentLang={currentLang} />
    </div>
  );
}
