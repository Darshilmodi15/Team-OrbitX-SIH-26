import React from 'react';
import { Compass, Waves, Wind, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { WeatherMetrics } from '../data/maritimeData';
import { TRANSLATIONS } from '../data/maritimeData';

interface TopHeaderProps {
  vesselLat: number;
  vesselLon: number;
  weather: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  currentLang: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  vesselLat,
  vesselLon,
  weather,
  riskLevel,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const safetyConfig = {
    safe: {
      label: t.safeHeading || 'SAFE TO VENTURE',
      icon: ShieldCheck,
      cardClass: 'bg-emerald-50/80 border-emerald-200 text-emerald-800',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      dotClass: 'bg-emerald-500',
    },
    caution: {
      label: t.cautionHeading || 'CAUTION ADVISED',
      icon: AlertTriangle,
      cardClass: 'bg-amber-50/80 border-amber-200 text-amber-900',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-800',
      dotClass: 'bg-amber-500',
    },
    unsafe: {
      label: t.dangerHeading || 'SEVERE HAZARD',
      icon: ShieldAlert,
      cardClass: 'bg-rose-50/80 border-rose-200 text-rose-900',
      iconClass: 'text-rose-600',
      badgeClass: 'bg-rose-100 text-rose-800',
      dotClass: 'bg-rose-500 animate-ping',
    },
  }[riskLevel];

  const SafetyIcon = safetyConfig.icon;

  return (
    <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 select-none">
      {/* Brand Section */}
      <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          {/* Logo Emblem */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-sky-600 flex items-center justify-center text-white text-xl shadow-md border border-teal-500/30 ring-2 ring-teal-100">
            🌊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black font-display text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>{t.appTitle || 'ORCA Marine AI'}</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 tracking-wide">
                {t.sihBadge || 'SIH 2026 • orbitX'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {t.tagline || 'Autonomous Marine Intelligence & Decision Support'}
            </p>
          </div>
        </div>

        <span className="inline-flex sm:hidden items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          SIH 2026
        </span>
      </div>

      {/* 4 Discrete Telemetry & Safety Status Cards */}
      <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 w-full md:w-auto justify-start md:justify-end text-xs">
        {/* Card 1: GPS Coordinates */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.gpsLabel || 'GPS Coordinates'}
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {vesselLat.toFixed(4)}°N, {vesselLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Card 2: Wave Height */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.waveHeightLabel || 'Wave Height'}
            </span>
            <span className={`font-bold text-[11px] ${weather.wave_height_m > 2.0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {weather.wave_height_m.toFixed(1)} m <span className="text-slate-400 font-normal">({weather.swell_period_s}s)</span>
            </span>
          </div>
        </div>

        {/* Card 3: Wind Speed */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.windSpeedLabel || 'Wind Speed'}
            </span>
            <span className="font-bold text-slate-800 text-[11px]">
              {weather.wind_speed_kmh.toFixed(0)} km/h <span className="text-slate-400 font-normal font-sans">({weather.forecast})</span>
            </span>
          </div>
        </div>

        {/* Card 4: Marine Safety Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm ${safetyConfig.cardClass} transition`}>
          <div className="relative flex items-center justify-center">
            <SafetyIcon className={`w-4 h-4 ${safetyConfig.iconClass}`} />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold opacity-70">
              {t.marineSafetyLabel || 'Marine Safety'}
            </span>
            <span className="font-extrabold tracking-wide text-[11px]">
              {safetyConfig.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
