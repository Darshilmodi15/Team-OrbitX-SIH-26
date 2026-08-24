import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import QueryInput from './QueryInput';
import type { MessageItem } from '../App';

interface ChatPanelProps {
  messages: MessageItem[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (question: string) => void;
  onClearError?: () => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  error,
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
    <div className="flex flex-col h-full bg-slate-950/70 backdrop-blur-2xl border-r border-slate-800/80 relative overflow-hidden">
      {/* Panel Top Header */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] animate-pulse"></span>
          <span className="text-xs font-bold text-slate-200 tracking-wider font-mono uppercase">
            ORCA OPERATIONAL ADVISORY CONSOLE
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
          {messages.length} log{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.map((msg, index) => (
          <ChatMessage key={msg.id || index} message={msg} />
        ))}

        {/* Loading State Animation */}
        {isLoading && (
          <div className="flex justify-start items-start gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-sm shrink-0">
              🌊
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-900/90 border border-cyan-500/40 p-4 shadow-xl text-xs font-mono text-[#22d3ee] flex items-center gap-3">
              <div className="relative flex items-center justify-center w-5 h-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22d3ee]"></span>
              </div>
              <span className="animate-pulse tracking-wide font-semibold text-slate-200">
                ORCA is analyzing marine conditions...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
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
      <QueryInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
}
