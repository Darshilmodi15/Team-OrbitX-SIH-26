import { useState } from 'react';
import type { LocationCoords } from '../App';
import { REGIONAL_LANGUAGES, TRANSLATIONS } from '../data/maritimeData';

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
  { name: 'Porbandar Marine Jetty', region: 'Gujarat', coords: { lat: 21.6417, lon: 69.6093 } },
  { name: 'Kochi (Cochin)', region: 'Kerala', coords: { lat: 9.9312, lon: 76.2673 } },
  { name: 'Mangaluru Old Port', region: 'Karnataka', coords: { lat: 12.8596, lon: 74.8364 } },
  { name: 'Chennai Port', region: 'Tamil Nadu', coords: { lat: 13.0827, lon: 80.2707 } },
  { name: 'Visakhapatnam Harbor', region: 'Andhra Pradesh', coords: { lat: 17.6868, lon: 83.2185 } },
];

interface HeaderProps {
  userLocation: LocationCoords;
  currentDate: string;
  currentLang: string;
  onSelectLang: (lang: string) => void;
  onSelectPort?: (coords: LocationCoords) => void;
}

export default function Header({
  userLocation,
  currentDate,
  currentLang,
  onSelectLang,
  onSelectPort,
}: HeaderProps) {
  const [selectedPortName, setSelectedPortName] = useState<string>('Mumbai Port');
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const handlePortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const port = PRESET_PORTS.find((p) => p.name === e.target.value);
    if (port && onSelectPort) {
      setSelectedPortName(port.name);
      onSelectPort(port.coords);
    }
  };

  return (
    <header className="w-full bg-[#030a1c]/90 border-b border-cyan-500/20 backdrop-blur-2xl px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 shadow-2xl shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-cyan-300/40 flex items-center justify-center text-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] shrink-0">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-wide flex items-center gap-1.5 font-display">
              {t.appTitle || 'ORCA Marine AI'}
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-bold">
              SIH 2026 • OrbitX
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
            {t.tagline || 'Autonomous Marine Intelligence & Decision Support'}
          </p>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-xs">
        {/* Coastal Port Station Selector */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-slate-300 shadow-sm">
          <span className="text-cyan-400 font-sans font-medium">⚓ Port:</span>
          <select
            value={selectedPortName}
            onChange={handlePortChange}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer pr-1"
          >
            {PRESET_PORTS.map((p) => (
              <option key={p.name} value={p.name} className="bg-slate-950 text-slate-100">
                {p.name} ({p.region})
              </option>
            ))}
          </select>
        </div>

        {/* Coastal Indian Language Switcher */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-slate-200 shadow-sm">
          <span className="text-sm">🌐</span>
          <select
            value={currentLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
          >
            {REGIONAL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-100">
                {lang.native} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* GPS Telemetry Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-slate-300">
          <span className="text-cyan-400 animate-pulse text-sm">📍</span>
          <span className="font-semibold text-cyan-200">
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
          title="Open FastAPI Swagger Interactive Docs"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 hover:text-indigo-200 transition-all font-sans text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          <span>⚡</span>
          <span className="font-semibold">Swagger Docs</span>
        </a>

        {/* System Online Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
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
