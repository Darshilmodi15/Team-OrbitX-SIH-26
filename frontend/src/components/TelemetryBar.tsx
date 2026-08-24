import React from 'react';
import { INDIAN_PORTS, REGIONAL_LANGUAGES, TRANSLATIONS } from '../data/maritimeData';
import type { Port, WeatherMetrics } from '../data/maritimeData';
import { Compass, Globe, ShieldAlert, ShieldCheck, Waves, Wind, ExternalLink } from 'lucide-react';

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
    safe: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-glow-emerald',
    caution: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    unsafe: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-glow-rose animate-pulse',
  }[riskLevel];

  const riskLabel = {
    safe: t.safeHeading || 'SAFE TO VENTURE',
    caution: t.cautionHeading || 'CAUTION ADVISED',
    unsafe: t.dangerHeading || 'SEVERE HAZARD',
  }[riskLevel];

  return (
    <header className="w-full glass-panel border-b border-cyan-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl shadow-lg border border-cyan-300/40">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold font-display text-white tracking-wide">
              {t.appTitle || 'ORCA Marine AI'}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SIH 2026 • OrbitX
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {t.tagline || 'Autonomous Marine Intelligence & Decision Support'}
          </p>
        </div>
      </div>

      {/* Live Telemetry Meters */}
      <div className="flex items-center flex-wrap gap-2 md:gap-4 text-xs font-mono">
        {/* Vessel GPS */}
        <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-slate-700/60">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <div className="text-[11px]">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">GPS Coordinates</span>
            <span className="text-cyan-300 font-bold">
              {vesselLat.toFixed(4)}°N, {vesselLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Marine Wave Gauge */}
        <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-slate-700/60" title={weather.source ? `Source: ${weather.source} (${weather.cache_status || 'Live'})` : 'Ocean State Forecast'}>
          <Waves className="w-3.5 h-3.5 text-blue-400" />
          <div>
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Sig. Wave Height</span>
            <span className={`font-bold ${weather.wave_height_m > 2.0 ? 'text-rose-400' : 'text-blue-300'}`}>
              {weather.wave_height_m.toFixed(2)}m {weather.cache_status === 'stale' ? '(Stale)' : ''}
            </span>
          </div>
        </div>

        {/* Wind Speed & Direction */}
        <div className="glass-card px-3 py-1.5 hidden lg:flex items-center gap-2 border border-slate-700/60" title={weather.source ? `Source: ${weather.source}` : 'Wind Vector'}>
          <Wind className="w-3.5 h-3.5 text-teal-400" />
          <div>
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Wind Speed & Dir</span>
            <span className="text-teal-300 font-bold">
              {weather.wind_speed_ms !== undefined ? `${weather.wind_speed_ms.toFixed(1)} m/s` : `${weather.wind_speed_kmh} km/h`} ({weather.wind_direction_cardinal || `${weather.wind_direction_deg ?? 0}°`})
            </span>
          </div>
        </div>

        {/* Operational Safety Status Badge */}
        <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${riskBadgeStyles}`}>
          {riskLevel === 'safe' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          <span>{riskLabel}</span>
        </div>
      </div>

      {/* Actions & Configuration Controls */}
      <div className="flex items-center gap-2">
        {/* Coastal Port Selector */}
        <div className="relative">
          <select
            value={selectedPort.id}
            onChange={(e) => {
              const port = INDIAN_PORTS.find((p) => p.id === e.target.value);
              if (port) onSelectPort(port);
            }}
            className="bg-navy-900 text-cyan-300 text-xs rounded-lg px-2.5 py-1.5 border border-cyan-500/30 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {INDIAN_PORTS.map((port) => (
              <option key={port.id} value={port.id} className="bg-navy-950 text-slate-200">
                📍 {port.name} ({port.state})
              </option>
            ))}
          </select>
        </div>

        {/* Indian Regional Language Switcher */}
        <div className="relative flex items-center">
          <Globe className="w-3.5 h-3.5 text-cyan-400 absolute left-2 pointer-events-none" />
          <select
            value={currentLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="bg-navy-900 text-slate-200 text-xs rounded-lg pl-7 pr-2 py-1.5 border border-cyan-500/30 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {REGIONAL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-navy-950 text-slate-200">
                {lang.native} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* Swagger OpenAPI Docs Link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Interactive Swagger & OpenAPI API Documentation"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 text-xs font-bold transition shadow-glow-indigo"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">Swagger API</span>
          <ExternalLink className="w-3 h-3 text-indigo-400" />
        </a>

        {/* Ecological Analysis button */}
        <button
          onClick={onOpenEcology}
          title="Analyze Historical Fish Catch Decline"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
        >
          <span>📊</span>
          <span className="hidden xl:inline">Fish Trend Analytics</span>
        </button>

        {/* Explainable AI Trace button */}
        <button
          onClick={onOpenReasoning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-bold transition shadow-glow-cyan"
        >
          <span>🧠</span>
          <span className="hidden sm:inline">Agent Trace</span>
        </button>
      </div>
    </header>
  );
};
