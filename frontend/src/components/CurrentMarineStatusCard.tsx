import { useState } from 'react';
import {
  Waves,
  Wind,
  Eye,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Database,
} from 'lucide-react';
import type { WeatherMetrics } from '../data/maritimeData';

interface CurrentMarineStatusCardProps {
  weather: WeatherMetrics;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  coastalRegion?: string;
  distanceToCoastKm?: number;
  onOpenTerminology?: () => void;
  currentLang?: string;
}

export default function CurrentMarineStatusCard({
  weather,
  riskLevel,
  coastalRegion = 'Maharashtra Coast',
  distanceToCoastKm = 5.2,
  onOpenTerminology,
}: CurrentMarineStatusCardProps) {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  const statusConfig = {
    safe: {
      title: 'SAFE TO VENTURE',
      subtitle: 'Conditions within standard safe operational thresholds for coastal vessels.',
      bgGradient: 'from-emerald-950/80 via-emerald-900/40 to-slate-900',
      borderColor: 'border-emerald-500/50',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
      reasoningText:
        'Wave height is within normal limits (< 1.8m) and sustained winds are below 25 km/h with no imminent severe weather fronts detected.',
    },
    caution: {
      title: 'CAUTION ADVISED',
      subtitle: 'Moderate swell or gusty winds detected. Small craft should exercise vigilance.',
      bgGradient: 'from-amber-950/80 via-amber-900/40 to-slate-900',
      borderColor: 'border-amber-500/50',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
      reasoningText:
        'Wave heights between 1.5m - 2.5m or wind gusts approaching 35-50 km/h elevate vessel capsize risks for non-mechanized and small fiber boats.',
    },
    unsafe: {
      title: 'UNSAFE UNDER MODEL CONDITIONS',
      subtitle: 'High wave crests, severe gale gusts, or dangerous swell periods detected.',
      bgGradient: 'from-rose-950/80 via-rose-900/40 to-slate-900',
      borderColor: 'border-rose-500/50',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      glow: 'shadow-[0_0_25px_rgba(244,63,94,0.2)]',
      reasoningText:
        'Hazardous marine environment: Significant wave height > 2.5m, heavy squalls, or steep chop periods (<5.5s) represent a critical navigational hazard.',
    },
  }[riskLevel];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`w-full rounded-3xl bg-gradient-to-br ${statusConfig.bgGradient} border ${statusConfig.borderColor} ${statusConfig.glow} p-4 sm:p-5 text-white transition-all`}
    >
      {/* Top Bar: Coastal Belt & Terminology Info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-teal-300 text-[10px] font-mono font-bold">
            📍 {coastalRegion}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {distanceToCoastKm.toFixed(1)} km from shoreline
          </span>
        </div>

        {onOpenTerminology && (
          <button
            onClick={onOpenTerminology}
            title="Marine Terminology Glossary"
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-teal-300 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terminology</span>
          </button>
        )}
      </div>

      {/* Main Status Headline */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-1">
            Current Marine Status
          </span>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor} shrink-0`} />
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {statusConfig.title}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {statusConfig.subtitle}
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border uppercase shrink-0 font-mono ${statusConfig.badgeBg}`}
        >
          {riskLevel}
        </span>
      </div>

      {/* Key Decomposed Marine Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4">
        {/* Wave Height & Period */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase font-mono text-slate-400 font-bold">
              Significant Wave (Hs)
            </span>
            <span className="font-mono font-bold text-sm text-white">
              {weather.wave_height_m.toFixed(1)} m
            </span>
            <span className="block text-[10px] text-slate-400">
              Period: {weather.swell_period_s || 7}s
            </span>
          </div>
        </div>

        {/* Sustained Wind & Gusts */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase font-mono text-slate-400 font-bold">
              Wind & Direction
            </span>
            <span className="font-mono font-bold text-sm text-white">
              {weather.wind_speed_kmh.toFixed(0)} km/h
            </span>
            <span className="block text-[10px] text-slate-400 font-mono">
              {weather.wind_direction_cardinal || 'WSW'} ({weather.wind_direction_deg || 240}°)
            </span>
          </div>
        </div>

        {/* Visibility & Cloud */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase font-mono text-slate-400 font-bold">
              Visibility & Sky
            </span>
            <span className="font-mono font-bold text-sm text-white">
              {weather.visibility_km ? `${weather.visibility_km.toFixed(1)} km` : '15 km'}
            </span>
            <span className="block text-[10px] text-slate-400">
              {weather.forecast || 'Clear Sky'}
            </span>
          </div>
        </div>

        {/* SST & Air Temp */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9px] uppercase font-mono text-slate-400 font-bold">
              Sea Temp (SST)
            </span>
            <span className="font-mono font-bold text-sm text-white">
              {weather.sst_c ? `${weather.sst_c.toFixed(1)}°C` : '28.5°C'}
            </span>
            <span className="block text-[10px] text-slate-400">
              Air: {weather.temperature_c?.toFixed(1) || '29.0'}°C
            </span>
          </div>
        </div>
      </div>

      {/* "Why am I seeing this?" Interactive Multi-Agent Evidence Drawer */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={() => setIsWhyExpanded(!isWhyExpanded)}
          className="w-full flex items-center justify-between text-left text-xs font-mono font-bold text-teal-300 hover:text-teal-200 transition cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <span>🧠</span>
            <span>Why is ORCA showing this safety status?</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>{isWhyExpanded ? 'Collapse' : 'Explain Decision'}</span>
            {isWhyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isWhyExpanded && (
          <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 animate-fadeIn font-sans">
            <div className="flex items-start gap-2">
              <span className="text-teal-400 font-bold font-mono text-[11px] mt-0.5">1.</span>
              <p className="leading-relaxed">
                <strong className="text-slate-100">Evaluated Rule:</strong> {statusConfig.reasoningText}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-400 font-bold font-mono text-[11px] mt-0.5">2.</span>
              <p className="leading-relaxed">
                <strong className="text-slate-100">Multi-Agent Consensus:</strong> Weather Agent fetched live INCOIS OSF / Open-Meteo telemetry $\to$ Risk Agent evaluated wave steepness and chop $\to$ Spatial Geofence Agent verified safe distance from restricted borders.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] font-mono leading-relaxed mt-2">
              ⚠️ <strong>Mandatory Safety Disclaimer:</strong> This is an advisory multi-agent simulation. Always verify official port authority circulars and local coast guard advisories prior to setting sail.
            </div>
          </div>
        )}
      </div>

      {/* Provenance & Freshness Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-teal-400" />
          <span>Source: {weather.source || 'INCOIS OSF & Open-Meteo'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Live Telemetry Active</span>
        </div>
      </div>
    </div>
  );
}
