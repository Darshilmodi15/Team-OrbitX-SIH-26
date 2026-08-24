import React, { useState } from 'react';

export default function QueryInput({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('');

  const quickPrompts = [
    'Where is the nearest potential fishing zone?',
    'Is it safe to fish near Mumbai today?',
    'What are the marine weather conditions?',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (prompt) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="p-3 bg-[#060e1f]/95 border-t border-[#00f0ff]/20 backdrop-blur-md">
      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Quick:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-300 hover:text-[#00f0ff] hover:border-[#00f0ff]/40 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ORCA anything about marine conditions, safety, or fishing zones..."
          disabled={isLoading}
          className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]/60 focus:ring-1 focus:ring-[#00f0ff]/40 transition-all font-sans disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] text-slate-950 font-semibold text-sm shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
