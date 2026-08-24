import React from 'react';
import { Compass, Waves, Wind, ShieldCheck, ShieldAlert, AlertTriangle, Bell } from 'lucide-react';
import type { WeatherMetrics } from '../data/maritimeData';
import { TRANSLATIONS } from '../data/maritimeData';

interface TopHeaderProps {
  vesselLat?: number;
  vesselLon?: number;
  weather?: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  currentLang: string;
  currentUser?: any | null;
  unreadAlertsCount?: number;
  onOpenNotifications?: () => void;
  onReturnHome?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  vesselLat = 18.9220,
  vesselLon = 72.8347,
  weather = {
    wave_height_m: 1.2,
    wind_speed_kmh: 18,
    wind_direction_deg: 240,
    wind_direction_cardinal: 'WSW',
    forecast: 'Clear',
    temperature_c: 29.5,
    sst_c: 28.2,
    swell_period_s: 7,
    tide_state: 'Ebb',
    visibility_km: 15,
    source: 'INCOIS_OSF_LIVE',
  },
  riskLevel,
  currentLang,
  currentUser,
  unreadAlertsCount = 0,
  onOpenNotifications,
  onReturnHome,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const safetyConfig = {
    safe: {
      label: t.safeHeading || 'SAFE TO VENTURE',
      icon: ShieldCheck,
      cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      dotClass: 'bg-emerald-500',
    },
    caution: {
      label: t.cautionHeading || 'CAUTION ADVISED',
      icon: AlertTriangle,
      cardClass: 'bg-amber-50 border-amber-200 text-amber-900',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-800',
      dotClass: 'bg-amber-500',
    },
    unsafe: {
      label: t.dangerHeading || 'SEVERE HAZARD',
      icon: ShieldAlert,
      cardClass: 'bg-rose-50 border-rose-200 text-rose-900',
      iconClass: 'text-rose-600',
      badgeClass: 'bg-rose-100 text-rose-800',
      dotClass: 'bg-rose-500 animate-ping',
    },
  }[riskLevel];

  const SafetyIcon = safetyConfig.icon;

  return (
    <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Brand Section */}
      <div className="flex items-center gap-3.5 min-w-[280px]">
        {/* Logo Emblem / Home Button */}
        <button
          onClick={onReturnHome}
          title="Return to ORCA Landing Page"
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#0284C7] flex items-center justify-center text-white text-2xl shadow-sm border border-teal-500/20 shrink-0 hover:scale-105 transition cursor-pointer"
        >
          🌊
        </button>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black font-display text-slate-900 tracking-tight">
              {t.appTitle || 'ORCA Marine AI'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200/80 tracking-wide uppercase font-mono">
              {t.sihBadge || 'SIH 2026 • ORBITX'}
            </span>
            {currentUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                <span>👤</span>
                <span>{currentUser.role || 'USER'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-normal mt-0.5">
            {t.tagline || 'Autonomous Marine Intelligence & Decision Support'}
          </p>
        </div>
      </div>

      {/* 4 Discrete Telemetry & Safety Status Cards */}
      <div className="flex items-center flex-wrap gap-3 text-xs">
        {/* Card 1: GPS Coordinates */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-teal-100/60 flex items-center justify-center text-teal-700 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.gpsLabel || 'GPS Coordinates'}
            </span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {vesselLat.toFixed(4)}°N, {vesselLon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Card 2: Wave Height */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-sky-100/60 flex items-center justify-center text-sky-700 shrink-0">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.waveHeightLabel || 'Wave Height'}
            </span>
            <span className={`font-bold text-xs ${weather.wave_height_m > 2.0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {weather.wave_height_m.toFixed(1)} m <span className="text-slate-400 font-normal">({weather.swell_period_s || 7}s)</span>
            </span>
          </div>
        </div>

        {/* Card 3: Wind Speed */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
          <div className="w-7 h-7 rounded-lg bg-teal-100/60 flex items-center justify-center text-teal-700 shrink-0">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t.windSpeedLabel || 'Wind Speed'}
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {weather.wind_speed_kmh.toFixed(0)} km/h <span className="text-slate-400 font-normal font-sans">({weather.forecast || 'Clear'})</span>
            </span>
          </div>
        </div>

        {/* Card 4: Marine Safety Status Badge */}
        <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border shadow-2xs ${safetyConfig.cardClass} transition`}>
          <div className="relative flex items-center justify-center shrink-0">
            <SafetyIcon className={`w-4 h-4 ${safetyConfig.iconClass}`} />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold opacity-70">
              {t.marineSafetyLabel || 'Marine Safety'}
            </span>
            <span className="font-black tracking-wide text-xs">
              {safetyConfig.label}
            </span>
          </div>
        </div>

        {/* Notifications Bell Action */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            title="Open Coastal Safety Alerts & Advisories"
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-teal-700 transition relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-mono font-bold animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};

