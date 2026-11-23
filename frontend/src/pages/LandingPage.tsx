import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Waves,
  MapPin,
  AudioLines,
  ShieldCheck,
} from "lucide-react";
import { APP_NAME, POWERED_BY, getLocalizedAppName } from "@/lib/brand";
import { MatsyaLogo } from "@/components/orca/Logo";
import { LanguageMenu } from "@/components/orca/LanguageMenu";
import { AppearanceMenu } from "@/components/orca/AppearanceMenu";
import { useI18n } from "@/lib/orca/i18n";
import { landingCopy } from "@/lib/orca/ui-copy";
import { SEO } from "@/components/SEO";
import { openCookieSettings } from "@/lib/orca/cookies";
import "@/components/orca/public-pages.css";
export default function LandingPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const appName = getLocalizedAppName(lang);
  const copy = landingCopy[lang] ?? landingCopy.en;
  return (
    <div className="public-page">
      <SEO
        title={`${APP_NAME} — A clearer view of the sea`}
        description="Matsya, powered by ORCA — conversational marine intelligence with source-backed conditions, coastal maps and multilingual voice."
      />
      <section className="public-hero">
        <img
          className="public-hero-photo"
          src="/hero-ocean-surface.webp"
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <nav className="public-nav" aria-label="Primary">
          <Link to="/" className="public-brand">
            <MatsyaLogo className="size-8" />
            <strong>{appName}</strong>
          </Link>
          <a href="#platform" className="public-overview">
            {copy.explore}
          </a>
          <LanguageMenu />
          <AppearanceMenu />
          <Link to="/login" className="public-signin">
            {t("cta.signIn")}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
        <div className="public-hero-word" aria-hidden="true">
          {appName}
        </div>
        <div className="public-hero-bottom">
          <div>
            <p className="public-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="public-description">{copy.description}</p>
            <button
              className="public-primary"
              onClick={() => navigate("/dashboard")}
            >
              {t("cta.getStarted")}
              <ArrowRight size={19} />
            </button>
          </div>
          <a href="#platform" className="public-scroll">
            <span>{copy.explore}</span>
            <span>↓</span>
          </a>
        </div>
      </section>
      <section id="platform" className="public-platform">
        <div className="public-section-title">
          <p className="public-eyebrow">{appName} · {POWERED_BY} / {t("land.capabilities")}</p>
          <h2>{copy.heading}</h2>
          <p>{copy.note}</p>
        </div>
        <div className="public-feature-grid">
          {[
            { Icon: Waves, key: "land.f2", desc: "land.f2d" },
            { Icon: MapPin, key: "nav.map", desc: "loc.why" },
            { Icon: AudioLines, key: "land.f4", desc: "land.f4d" },
            {
              Icon: ShieldCheck,
              key: "chat.evidence",
              desc: "footer.prototype",
            },
          ].map(({ Icon, key, desc }, i) => (
            <article key={key}>
              <div>
                <Icon size={24} />
                <span>0{i + 1}</span>
              </div>
              <h3>{t(key as Parameters<typeof t>[0])}</h3>
              <p>{i === 3 ? copy.note : t(desc as Parameters<typeof t>[0])}</p>
              <Link
                to={i === 1 ? "/map" : i === 2 ? "/assistant" : "/dashboard"}
                aria-label={t(key as Parameters<typeof t>[0])}
              >
                <ArrowUpRight size={20} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="public-closing">
        <MatsyaLogo className="size-12" />
        <h2>{copy.closing}</h2>
        <Link to="/login" className="public-primary">
          {t("cta.getStarted")}
          <ArrowRight size={18} />
        </Link>
      </section>
      <footer className="public-footer">
        <Link to="/" className="public-brand">
          <MatsyaLogo className="size-7" />
          {appName}
        </Link>
        <p>{t("footer.prototype")}</p>
        <div>
          <Link to="/privacy">{t("footer.privacy")}</Link>
          <Link to="/terms">{t("footer.terms")}</Link>
          <button onClick={openCookieSettings}>{t("footer.cookies")}</button>
        </div>
      </footer>
    </div>
  );
}
