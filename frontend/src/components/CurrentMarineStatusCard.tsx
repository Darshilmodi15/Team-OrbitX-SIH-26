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
      cardBg: 'bg-white',
      borderColor: 'border-emerald-300',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      reasoningText:
        'Wave height is within normal limits (< 1.8m) and sustained winds are below 25 km/h with no imminent severe weather fronts detected.',
    },
    caution: {
      title: 'CAUTION ADVISED',
      subtitle: 'Moderate swell or gusty winds detected. Small craft should exercise vigilance.',
      cardBg: 'bg-white',
      borderColor: 'border-amber-300',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      reasoningText:
        'Wave heights between 1.5m - 2.5m or wind gusts approaching 35-50 km/h elevate vessel capsize risks for non-mechanized and small fiber boats.',
    },
    unsafe: {
      title: 'UNSAFE FOR SAILING',
      subtitle: 'High wave crests, severe gale gusts, or dangerous swell periods detected.',
      cardBg: 'bg-white',
      borderColor: 'border-rose-300',
      badgeBg: 'bg-rose-50 text-rose-900 border-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      reasoningText:
        'Hazardous marine environment: Significant wave height > 2.5m, heavy squalls, or steep chop periods (<5.5s) represent a critical navigational hazard.',
    },
  }[riskLevel];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`w-full rounded-2xl ${statusConfig.cardBg} border ${statusConfig.borderColor} shadow-md p-4 sm:p-5 text-slate-900 transition-all font-sans`}
    >
      {/* Top Bar: Coastal Belt & Terminology Info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#0B3D5B] text-[10px] font-semibold">
            📍 {coastalRegion}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {distanceToCoastKm.toFixed(1)} km from shoreline
          </span>
        </div>

        {onOpenTerminology && (
          <button
            onClick={onOpenTerminology}
            title="Marine Terminology Glossary"
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0F766E] transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terminology</span>
          </button>
        )}
      </div>

      {/* Hero Status Badge */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
          <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${statusConfig.badgeBg}`}>
              {statusConfig.title}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            {statusConfig.subtitle}
          </p>
        </div>
      </div>

      {/* Live Marine Telemetry 4-Pillars Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Metric 1: Wave Height & Swell */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-blue-700 mb-1">
            <Waves className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wave Height</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {weather.wave_height_m.toFixed(1)} m
          </div>
          <div className="text-[10px] text-slate-500">
            Period: {weather.swell_period_s || 7}s
          </div>
        </div>

        {/* Metric 2: Wind Speed & Direction */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-teal-700 mb-1">
            <Wind className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wind Speed</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {weather.wind_speed_kmh.toFixed(0)} km/h
          </div>
          <div className="text-[10px] text-slate-500">
            {weather.wind_direction_cardinal || 'SW'} ({weather.forecast || 'Clear'})
          </div>
        </div>

        {/* Metric 3: Sea Surface Temp & Air */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-amber-700 mb-1">
            <Thermometer className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sea Temp</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {(weather.sst_c || 28.2).toFixed(1)}°C
          </div>
          <div className="text-[10px] text-slate-500">
            Air: {(weather.temperature_c || 29.5).toFixed(1)}°C
          </div>
        </div>

        {/* Metric 4: Visibility & Tide */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-indigo-700 mb-1">
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Visibility</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {weather.visibility_km || 15} km
          </div>
          <div className="text-[10px] text-slate-500">
            Tide: {weather.tide_state || 'Ebb'}
          </div>
        </div>
      </div>

      {/* Expandable "Why this Safety Status?" Accordion */}
      <div className="border-t border-slate-100 pt-2.5">
        <button
          onClick={() => setIsWhyExpanded(!isWhyExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <span>Why this status? (Explain Safety Level)</span>
          {isWhyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isWhyExpanded && (
          <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed animate-fadeIn">
            <p className="font-medium">{statusConfig.reasoningText}</p>
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans">
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-[#0F766E]" />
          <span>INCOIS OSF Live Ocean Telemetry</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Refreshed: Just now</span>
        </span>
      </div>
    </div>
  );
}
