import React from 'react';
import { Link } from 'react-router-dom';
import { openCookieSettings } from './CookieBanner';

interface FooterProps {
  currentLang?: string;
}

export const Footer: React.FC<FooterProps> = () => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <footer className="w-full px-4 py-3 bg-card/90 backdrop-blur-sm border-t border-border text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">ORCA Marine AI</span>
        <span>·</span>
        <span>INCOIS Operations Command, Hyderabad 500090</span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        <span>·</span>
        <button
          type="button"
          onClick={openCookieSettings}
          className="hover:text-foreground transition-colors underline-offset-2 hover:underline cursor-pointer"
        >
          Cookie Settings
        </button>
        <span>·</span>
        <span className="font-mono text-teal-500 dark:text-teal-400">Sync: {timeStr}</span>
      </div>
    </footer>
  );
};
