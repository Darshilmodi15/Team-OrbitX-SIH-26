import { useState } from 'react';
import type { LocationCoords } from '../App';

export interface PortOption {
  name: string;
  region: string;
  coords: LocationCoords;
}

export const PRESET_PORTS: PortOption[] = [
  { name: 'Mumbai Port', region: 'Maharashtra', coords: { lat: 18.9220, lon: 72.8347 } },
  { name: 'Satpati / Palghar', region: 'Maharashtra', coords: { lat: 19.7242, lon: 72.0794 } },
  { name: 'Ratnagiri Harbor', region: 'Maharashtra', coords: { lat: 16.9902, lon: 73.3120 } },
  { name: 'Veraval Port', region: 'Gujarat', coords: { lat: 20.9000, lon: 70.3667 } },
  { name: 'Kochi (Cochin)', region: 'Kerala', coords: { lat: 9.9312, lon: 76.2673 } },
  { name: 'Chennai Port', region: 'Tamil Nadu', coords: { lat: 13.0827, lon: 80.2707 } },
];

interface HeaderProps {
  userLocation: LocationCoords;
  currentDate: string;
  onSelectPort?: (coords: LocationCoords) => void;
}

export default function Header({ userLocation, currentDate, onSelectPort }: HeaderProps) {
  const [selectedPortName, setSelectedPortName] = useState<string>('Mumbai Port');

  const handlePortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const port = PRESET_PORTS.find((p) => p.name === e.target.value);
    if (port && onSelectPort) {
      setSelectedPortName(port.name);
      onSelectPort(port.coords);
    }
  };

  return (
    <header className="w-full bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-2xl px-5 py-3 flex items-center justify-between z-30 shadow-2xl shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(34,211,238,0.35)] shrink-0">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-1.5 font-display">
              ORCA <span className="text-[#22d3ee] font-medium">Marine AI</span>
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 text-[#22d3ee] border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.15)] font-semibold">
              Tactical Operations
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal hidden sm:block">
            Autonomous Maritime Intelligence & INCOIS Evidence Engine
          </p>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-3 font-mono text-xs">
        {/* Port Station Selector */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
          <span className="text-cyan-400">⚓ Port:</span>
          <select
            value={selectedPortName}
            onChange={handlePortChange}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer pr-1"
          >
            {PRESET_PORTS.map((p) => (
              <option key={p.name} value={p.name} className="bg-slate-900 text-slate-100">
                {p.name} ({p.region})
              </option>
            ))}
          </select>
        </div>

        {/* GPS Telemetry Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
          <span className="text-[#22d3ee] text-sm animate-pulse">📍</span>
          <span>
            {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{currentDate}</span>
        </div>

        {/* Swagger API Docs Button */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Open FastAPI Swagger Documentation"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-all font-sans text-xs"
        >
          <span>📜</span>
          <span className="font-semibold">API Docs</span>
        </a>

        {/* System Online Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="font-bold tracking-wider text-[11px]">System Online</span>
        </div>
      </div>
    </header>
  );
}
