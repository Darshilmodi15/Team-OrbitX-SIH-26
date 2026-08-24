import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import QueryInput from './QueryInput';

export default function ChatPanel({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearError,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-[#040915] border-r border-[#00f0ff]/15 relative overflow-hidden">
      {/* Panel Top Header */}
      <div className="px-4 py-2.5 bg-[#060e1f]/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-200 tracking-wide font-mono">
            ORCA OPERATIONAL CONVERSATION
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, index) => (
          <ChatMessage key={msg.id || index} message={msg} />
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="rounded-2xl rounded-tl-sm bg-[#0a152e]/80 border border-[#00f0ff]/30 p-4 shadow-lg text-xs font-mono text-[#00f0ff] flex items-center gap-3">
              <div className="relative flex items-center justify-center w-5 h-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00f0ff]"></span>
              </div>
              <span className="animate-pulse tracking-wide font-medium">
                ORCA is analyzing marine conditions...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-rose-400 hover:text-white font-mono px-2 py-0.5 rounded bg-rose-900/50"
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
