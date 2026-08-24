import React from 'react';
import { INDIAN_PORTS, REGIONAL_LANGUAGES, TRANSLATIONS } from '../data/maritimeData';
import type { Port, WeatherMetrics } from '../data/maritimeData';
import { Compass, Globe, ShieldAlert, ShieldCheck, Waves, Wind, ExternalLink, Activity } from 'lucide-react';

interface TelemetryBarProps {
  vesselLat: number;
  vesselLon: number;
  selectedPort: Port;
  onSelectPort: (port: Port) => void;
  weather: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  currentLang: string;
  onSelectLang: (lang: string) => void;
  onOpenReasoning: () => void;
  onOpenEcology: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  vesselLat,
  vesselLon,
  selectedPort,
  onSelectPort,
  weather,
  riskLevel,
  currentLang,
  onSelectLang,
  onOpenReasoning,
  onOpenEcology,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const riskBadgeStyles = {
    safe: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20',
    caution: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20',
    unsafe: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20 animate-pulse',
  }[riskLevel];

  const riskLabel = {
    safe: t.safeHeading || 'SAFE FOR NAVIGATION',
    caution: t.cautionHeading || 'CAUTION ADVISED',
    unsafe: t.dangerHeading || 'SEVERE HAZARD',
  }[riskLevel];

  return (
    <header className="w-full bg-white border-b border-slate-200/90 shadow-sm px-5 py-3 flex flex-wrap items-center justify-between gap-4 z-30 transition-colors">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-md shadow-teal-700/15 ring-2 ring-teal-600/20">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base md:text-lg font-bold font-display text-slate-900 tracking-tight">
              {t.appTitle || 'ORCA Marine AI'}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
              SIH 2026 • OrbitX
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            {t.tagline || 'Autonomous Ocean Intelligence & Decision Support'}
          </p>
        </div>
      </div>

      {/* Center Individual Status / Telemetry Cards */}
      <div className="flex items-center flex-wrap gap-3 font-sans">
        {/* GPS Coordinates Card */}
        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 transition shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <Compass className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Vessel GPS</span>
            <span className="text-slate-800 font-mono text-xs font-semibold">
              {vesselLat.toFixed(4)}°N, {vesselLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Wave Height Card */}
        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 transition shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Waves className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Wave Height</span>
            <span className={`text-xs font-semibold ${weather.wave_height_m > 2.0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {weather.wave_height_m}m <span className="text-slate-400 font-normal text-[11px]">({weather.swell_period_s}s swell)</span>
            </span>
          </div>
        </div>

        {/* Wind Speed Card */}
        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl hidden lg:flex items-center gap-2.5 transition shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Wind className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Wind Speed</span>
            <span className="text-slate-800 text-xs font-semibold">
              {weather.wind_speed_kmh} km/h <span className="text-slate-400 font-normal text-[11px]">(245° WSW)</span>
            </span>
          </div>
        </div>

        {/* Operational Risk Status Badge Card */}
        <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-xs ${riskBadgeStyles}`}>
          {riskLevel === 'safe' ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
          <span className="tracking-wide">{riskLabel}</span>
        </div>
      </div>

      {/* Right Controls & Navigation Bar (Proper 12-18px gaps) */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Coastal Location Selector */}
        <div className="relative">
          <select
            value={selectedPort.id}
            onChange={(e) => {
              const port = INDIAN_PORTS.find((p) => p.id === e.target.value);
              if (port) onSelectPort(port);
            }}
            aria-label="Select Coastal Base"
            className="h-9 bg-white text-slate-700 text-xs font-medium rounded-xl pl-3 pr-8 border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-xs cursor-pointer appearance-none transition"
          >
            {INDIAN_PORTS.map((port) => (
              <option key={port.id} value={port.id}>
                📍 {port.name} ({port.state})
              </option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
        </div>

        {/* Indian Regional Language Switcher */}
        <div className="relative flex items-center">
          <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <select
            value={currentLang}
            onChange={(e) => onSelectLang(e.target.value)}
            aria-label="Select Language"
            className="h-9 bg-white text-slate-700 text-xs font-medium rounded-xl pl-8 pr-7 border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-xs cursor-pointer appearance-none transition"
          >
            {REGIONAL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.native} ({lang.name})
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
        </div>

        {/* Swagger API Link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="OpenAPI & Swagger Documentation"
          className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-xs transition"
        >
          <span className="text-sm">⚡</span>
          <span className="hidden sm:inline">Swagger API</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Historical Fish Trend Analytics Button */}
        <button
          onClick={onOpenEcology}
          title="Analyze Historical Fish Catch Decline"
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-semibold shadow-xs transition"
        >
          <Activity className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden xl:inline">Fish Trend Analytics</span>
        </button>

        {/* Explainable AI Trace Button */}
        <button
          onClick={onOpenReasoning}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition shadow-teal-700/20"
        >
          <span>🧠</span>
          <span>Agent Trace</span>
        </button>
      </div>
    </header>
  );
};
