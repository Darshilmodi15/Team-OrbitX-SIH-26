import React from 'react';
import { TRANSLATIONS } from '../data/maritimeData';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  currentLang?: string;
}

export const Footer: React.FC<FooterProps> = ({ currentLang = 'en' }) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <footer className="w-full bg-white border-t border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-sans z-20 shrink-0 select-none shadow-2xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-slate-800 flex items-center gap-1 font-display">
          <span>🌊</span>
          <span>{t.footerTitle || 'ORCA Marine AI'}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="font-semibold text-slate-600">
          {t.footerTeam || 'Team orbitX • Smart India Hackathon 2026'}
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="text-slate-500 hidden sm:inline">
          {t.footerMission || 'Safer Seas • Smarter Decisions • Stronger Communities'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-medium">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-teal-700 transition flex items-center gap-1"
        >
          <span>{t.footerDocs || 'API Docs'}</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
        <a
          href="https://incois.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-teal-700 transition flex items-center gap-1"
        >
          <span>INCOIS Live</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
        <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3 h-3" />
          <span>v1.2 Live</span>
        </div>
      </div>
    </footer>
  );
};
