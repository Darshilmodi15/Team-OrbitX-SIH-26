import React from 'react';
import { TRANSLATIONS } from '../data/maritimeData';
import type { WeatherMetrics } from '../data/maritimeData';
import { Compass, Waves, Wind, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface TelemetryBarProps {
  vesselLat: number;
  vesselLon: number;
  weather: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  currentLang: string;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  vesselLat,
  vesselLon,
  weather,
  riskLevel,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const riskBadgeConfig = {
    safe: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />,
      label: t.safeStatus || 'Safe',
    },
    caution: {
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
      label: t.cautionStatus || 'Caution',
    },
    unsafe: {
      bg: 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />,
      label: t.dangerStatus || 'Danger',
    },
  }[riskLevel];

  return (
    <header className="w-full bg-white border-b border-slate-200 shadow-xs px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-30 transition-all">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center text-xl shadow-sm ring-2 ring-teal-600/20">
          🌊
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg md:text-xl font-bold font-display text-slate-900 tracking-tight">
              {t.appTitle || 'ORCA Marine AI'}
            </h1>
            <span className="text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              SIH 2026 • ORBITX
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
            {t.tagline || 'Autonomous Marine Intelligence & Decision Support'}
          </p>
        </div>
      </div>

      {/* Right Individual White Status Cards (12–16px gaps, generous spacing) */}
      <div className="flex items-center flex-wrap gap-3.5 font-sans">
        {/* GPS Coordinates Card */}
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              {t.gpsLabel || 'GPS COORDINATES'}
            </span>
            <span className="text-slate-900 font-mono text-xs font-semibold">
              {vesselLat.toFixed(4)}°N, {vesselLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Wave Height Card */}
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Waves className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              {t.waveLabel || 'WAVE HEIGHT'}
            </span>
            <span className={`text-xs font-semibold ${weather.wave_height_m > 2.0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {weather.wave_height_m} m <span className="text-slate-400 font-normal text-[11px]">({weather.swell_period_s}s swell)</span>
            </span>
          </div>
        </div>

        {/* Wind Speed Card */}
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl hidden md:flex items-center gap-3 shadow-xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
            <Wind className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              {t.windLabel || 'WIND SPEED'}
            </span>
            <span className="text-slate-900 text-xs font-semibold">
              {weather.wind_speed_kmh} km/h <span className="text-slate-400 font-normal text-[11px]">(245° WSW)</span>
            </span>
          </div>
        </div>

        {/* Marine Safety Status Card */}
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-xs hover:border-slate-300 transition">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              {t.safetyLabel || 'MARINE SAFETY'}
            </span>
            <div className={`mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${riskBadgeConfig.bg}`}>
              {riskBadgeConfig.icon}
              <span>{riskBadgeConfig.label}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
