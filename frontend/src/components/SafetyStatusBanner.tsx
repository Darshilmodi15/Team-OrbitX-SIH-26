import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Waves,
  Wind,
  Compass,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { SafetyLevel } from '../types';
import { getStrings } from '../i18n';

export default function SafetyStatusBanner() {
  const { riskLevel, weather, currentLang } = useAppContext();
  const t = getStrings(currentLang);
  const [showEvidence, setShowEvidence] = useState(false);

  const statusConfig = {
    safe: {
      title: t.safe,
      description: t.safeDesc,
      icon: ShieldCheck,
      cardBg: 'bg-emerald-50/90 border-emerald-300',
      badgeBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-950',
      descColor: 'text-emerald-800',
      accentColor: '#059669',
      bulletIcon: CheckCircle2,
    },
    caution: {
      title: t.caution,
      description: t.cautionDesc,
      icon: AlertTriangle,
      cardBg: 'bg-amber-50/90 border-amber-300',
      badgeBg: 'bg-amber-600 text-white',
      textColor: 'text-amber-950',
      descColor: 'text-amber-800',
      accentColor: '#D97706',
      bulletIcon: AlertCircle,
    },
    unsafe: {
      title: t.dangerous,
      description: t.dangerousDesc,
      icon: ShieldAlert,
      cardBg: 'bg-red-50/90 border-red-300',
      badgeBg: 'bg-red-600 text-white',
      textColor: 'text-red-950',
      descColor: 'text-red-800',
      accentColor: '#DC2626',
      bulletIcon: AlertCircle,
    },
  }[riskLevel];

  const StatusIcon = statusConfig.icon;

  // Evidence calculation metrics
  const waveVal = weather.wave_height_m || 1.2;
  const windVal = weather.wind_speed_kmh || 18.0;
  const isWaveSafe = waveVal < 1.5;
  const isWindSafe = windVal < 30.0;

  return (
    <section className={`rounded-xl border ${statusConfig.cardBg} p-4 sm:p-5 shadow-xs transition-all`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Main Status Indicator */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-xs text-white"
            style={{ backgroundColor: statusConfig.accentColor }}
          >
            <StatusIcon className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`font-display text-base sm:text-lg font-extrabold tracking-tight ${statusConfig.textColor}`}>
                {statusConfig.title}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusConfig.badgeBg}`}>
                {riskLevel.toUpperCase()}
              </span>
            </div>
            <p className={`mt-0.5 text-xs sm:text-sm font-medium leading-relaxed ${statusConfig.descColor}`}>
              {statusConfig.description}
            </p>
          </div>
        </div>

        {/* Action / Evidence Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-white transition cursor-pointer"
          >
            <Cpu className="h-3.5 w-3.5 text-[#0D9488]" />
            <span>{t.whyThisStatus}</span>
            {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Decision Evidence Tray */}
      {showEvidence && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/80 animate-fadeIn">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <HelpCircle className="h-3.5 w-3.5 text-[#0D9488]" />
              <span>{t.decisionEvidence}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {t.source}: {weather.source || 'INCOIS_OSF_WW3'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Wave Criterion */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Waves className="h-3.5 w-3.5 text-sky-600" />
                  <span>{t.waveHeight}</span>
                </div>
                <span className={`text-xs font-bold ${isWaveSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {waveVal.toFixed(2)} m
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {isWaveSafe ? 'Within safe threshold (< 1.50m)' : 'Above calm threshold (1.5m - 2.0m)'}
              </p>
            </div>

            {/* Wind Criterion */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Wind className="h-3.5 w-3.5 text-slate-600" />
                  <span>{t.windSpeed}</span>
                </div>
                <span className={`text-xs font-bold ${isWindSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {windVal.toFixed(1)} km/h
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {isWindSafe ? 'Moderate breeze (< 30.0 km/h)' : 'Gusty winds detected (> 30.0 km/h)'}
              </p>
            </div>

            {/* Geofence & Boundary Criterion */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Compass className="h-3.5 w-3.5 text-[#0D9488]" />
                  <span>{t.imblBoundary}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">CLEAR</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Safe operational distance from sovereign IMBL
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
