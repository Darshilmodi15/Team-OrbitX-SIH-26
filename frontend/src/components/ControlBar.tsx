import React from 'react';
import { INDIAN_PORTS, REGIONAL_LANGUAGES, TRANSLATIONS } from '../data/maritimeData';
import type { Port } from '../data/maritimeData';
import { Globe, MapPin, ExternalLink, Activity, Cpu } from 'lucide-react';

interface ControlBarProps {
  selectedPort: Port;
  onSelectPort: (port: Port) => void;
  currentLang: string;
  onSelectLang: (lang: string) => void;
  onOpenReasoning: () => void;
  onOpenEcology: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  selectedPort,
  onSelectPort,
  currentLang,
  onSelectLang,
  onOpenReasoning,
  onOpenEcology,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-sans z-20 shadow-2xs">
      {/* LEFT GROUP: Location & Language Selectors (Independent space & min widths) */}
      <div className="flex items-center flex-wrap gap-4 min-w-0">
        {/* Location Dropdown Group */}
        <div className="flex items-center gap-2.5 min-w-[280px]">
          <span className="text-slate-600 font-semibold text-xs whitespace-nowrap shrink-0">
            {t.locationLabel || 'Location'}:
          </span>
          <div className="relative flex-1 min-w-[200px]">
            <MapPin className="w-4 h-4 text-teal-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            <select
              value={selectedPort.id}
              onChange={(e) => {
                const port = INDIAN_PORTS.find((p) => p.id === e.target.value);
                if (port) onSelectPort(port);
              }}
              aria-label="Select Port Location"
              className="w-full h-9 bg-white text-slate-800 text-xs font-medium rounded-xl pl-9 pr-8 border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-2xs cursor-pointer appearance-none transition whitespace-nowrap"
            >
              {INDIAN_PORTS.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name} ({port.state})
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
          </div>
        </div>

        {/* Language Dropdown Group */}
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <span className="text-slate-600 font-semibold text-xs whitespace-nowrap shrink-0">
            {t.languageLabel || 'Language'}:
          </span>
          <div className="relative flex-1 min-w-[120px]">
            <Globe className="w-4 h-4 text-sky-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            <select
              value={currentLang}
              onChange={(e) => onSelectLang(e.target.value)}
              aria-label="Select Global Language"
              className="w-full h-9 bg-white text-slate-800 text-xs font-medium rounded-xl pl-9 pr-8 border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 shadow-2xs cursor-pointer appearance-none transition whitespace-nowrap"
            >
              {REGIONAL_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native} ({lang.name})
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
          </div>
        </div>
      </div>

      {/* RIGHT GROUP: Swagger API, Fish Trend Analytics, Agent Trace Buttons */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Swagger API Button (min 110px) */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="OpenAPI & Swagger Documentation"
          className="min-w-[110px] h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs whitespace-nowrap transition"
        >
          <span className="text-sm">⚡</span>
          <span>{t.swaggerBtn || 'Swagger API'}</span>
          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
        </a>

        {/* Fish Trend Analytics Button (min 150px) */}
        <button
          onClick={onOpenEcology}
          title="Analyze Historical Fish Catch Decline"
          className="min-w-[150px] h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-semibold shadow-2xs whitespace-nowrap transition cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>{t.fishAnalyticsBtn || 'Fish Trend Analytics'}</span>
        </button>

        {/* Agent Trace Button (min 120px) */}
        <button
          onClick={onOpenReasoning}
          title="Inspect Multi-Agent Execution Trace"
          className="min-w-[120px] h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition shadow-teal-800/20 whitespace-nowrap cursor-pointer"
        >
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span>{t.agentTraceBtn || 'Agent Trace'}</span>
        </button>
      </div>
    </div>
  );
};

