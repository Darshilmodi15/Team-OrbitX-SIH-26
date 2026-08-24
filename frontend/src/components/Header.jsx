import React from 'react';

export default function Header({ userLocation, currentDate }) {
  return (
    <header className="w-full bg-[#060e1f]/90 border-b border-[#00f0ff]/20 backdrop-blur-md px-4 py-3 flex items-center justify-between z-20 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 to-[#0284c7]/40 border border-[#00f0ff]/40 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(0,240,255,0.25)]">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
              ORCA <span className="text-[#00f0ff] font-light">Marine AI</span>
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-light hidden sm:block">
            Marine Ecosystem Reasoning with Collaborative Agents
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
          <span className="text-[#00f0ff]">📍</span>
          <span>
            {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{currentDate}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold tracking-wide">System Online</span>
        </div>
      </div>
    </header>
  );
}
