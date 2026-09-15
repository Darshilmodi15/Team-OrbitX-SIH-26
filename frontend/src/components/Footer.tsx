import React from 'react';
import { useI18n } from '@/lib/orca/i18n';
import { Link } from 'react-router-dom';
import { openCookieSettings } from './CookieBanner';

interface FooterProps {
  currentLang?: string;
}

export const Footer: React.FC<FooterProps> = () => {
  const { t } = useI18n();

  return (
    <footer className="w-full px-4 py-3 bg-card/90 backdrop-blur-sm border-t border-border text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">ORCA Marine AI</span>
        <span>·</span>
        <span>{t("footer.rights")}</span>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-3">
        <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
        <span>·</span>
        <button
          type="button"
          onClick={openCookieSettings}
          className="hover:text-foreground transition-colors underline-offset-2 hover:underline cursor-pointer"
        >
          {t("footer.cookies")}
        </button>

      </div>
      <div className="flex items-center gap-3 sm:ml-auto"><Link to="/emergency" className="underline">SOS</Link><a className="font-semibold text-foreground underline" href="tel:112">{t("svc.call")} 112</a><a className="font-semibold text-foreground underline" href="tel:1554">1554</a></div>
    </footer>
  );
};
