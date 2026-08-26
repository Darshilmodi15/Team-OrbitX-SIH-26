import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Bell, MapPin, Globe, Settings, ChevronLeft, Landmark } from 'lucide-react';
import { INDIAN_PORTS, REGIONAL_LANGUAGES, TRANSLATIONS } from '../data/maritimeData';
import { getLocalizedPort } from '../data/localizedGeo';
import type { WeatherMetrics, Port } from '../data/maritimeData';

interface TopHeaderProps {
  vesselLat?: number;
  vesselLon?: number;
  weather?: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  currentLang: string;
  currentUser?: any | null;
  unreadAlertsCount?: number;
  selectedPort?: Port;
  onSelectPort?: (port: Port) => void;
  onSelectLang?: (lang: string) => void;
  onOpenNotifications?: () => void;
  onOpenAdmin?: () => void;
  onOpenGovPortal?: () => void;
  onReturnHome?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  riskLevel,
  currentLang,
  currentUser,
  unreadAlertsCount = 0,
  selectedPort,
  onSelectPort,
  onSelectLang,
  onOpenNotifications,
  onOpenAdmin,
  onOpenGovPortal,
  onReturnHome,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const safetyConfig = {
    safe: {
      label: t.safeHeading || 'SAFE',
      icon: ShieldCheck,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
      dot: 'bg-emerald-500',
    },
    caution: {
      label: t.cautionHeading || 'CAUTION',
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      iconColor: 'text-amber-600',
      dot: 'bg-amber-500',
    },
    unsafe: {
      label: t.dangerHeading || 'HAZARD',
      icon: ShieldAlert,
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
      iconColor: 'text-rose-600',
      dot: 'bg-rose-500 animate-pulse',
    },
  }[riskLevel];

  const SafetyIcon = safetyConfig.icon;

  return (
    <header
      className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-5 flex items-center justify-between gap-3 select-none shrink-0 z-40"
      style={{ height: 'var(--header-height)' }}
    >
      {/* LEFT: Logo + Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onReturnHome}
          title="Return to Landing Page"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 hover:opacity-90 transition cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
            ORCA Marine AI
          </h1>
          <p className="text-[10px] text-slate-400 font-medium leading-none">
            Coastal Safety Intelligence
          </p>
        </div>
      </div>

      {/* CENTER: Safety Badge */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${safetyConfig.bg} ${safetyConfig.border} border ${safetyConfig.text}`}>
        <div className={`w-2 h-2 rounded-full ${safetyConfig.dot} shrink-0`} />
        <SafetyIcon className={`w-3.5 h-3.5 ${safetyConfig.iconColor}`} />
        <span className="text-[11px] font-bold tracking-wide uppercase">
          {safetyConfig.label}
        </span>
        {currentUser && (
          <span className="hidden lg:inline text-[10px] font-medium opacity-70 ml-1">
            · {currentUser.role || 'USER'}
          </span>
        )}
      </div>

      {/* RIGHT: Port + Language + Actions */}
      <div className="flex items-center gap-2">
        {/* Port Selector (compact) */}
        {onSelectPort && selectedPort && (
          <div className="hidden md:flex items-center relative">
            <MapPin className="w-3.5 h-3.5 text-teal-700 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedPort.id}
              onChange={(e) => {
                const port = INDIAN_PORTS.find((p) => p.id === e.target.value);
                if (port) onSelectPort(port);
              }}
              aria-label="Select Port"
              className="h-8 bg-white text-slate-700 text-[11px] font-medium rounded-lg pl-7 pr-6 border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 cursor-pointer appearance-none transition max-w-[180px]"
            >
              {INDIAN_PORTS.map((port) => {
                const loc = getLocalizedPort(port, currentLang);
                return (
                  <option key={port.id} value={port.id}>
                    {loc.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Language Selector (compact) */}
        {onSelectLang && (
          <div className="hidden sm:flex items-center relative">
            <Globe className="w-3.5 h-3.5 text-sky-600 absolute left-2.5 pointer-events-none" />
            <select
              value={currentLang}
              onChange={(e) => onSelectLang(e.target.value)}
              aria-label="Select Language"
              className="h-8 bg-white text-slate-700 text-[11px] font-medium rounded-lg pl-7 pr-5 border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-teal-500 cursor-pointer appearance-none transition max-w-[100px]"
            >
              {REGIONAL_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Government Marine Portal */}
        {onOpenGovPortal && (
          <button
            onClick={onOpenGovPortal}
            title="Official Government Portal & Schemes"
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-teal-700 hover:text-teal-900 flex items-center justify-center transition cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Notifications */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            title="Alerts & Advisories"
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition relative cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* Admin/Settings */}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            title="Admin Console"
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
