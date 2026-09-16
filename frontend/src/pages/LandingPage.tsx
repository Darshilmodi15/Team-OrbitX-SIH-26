import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Waves,
  MapPin,
  AudioLines,
  ShieldCheck,
} from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { LanguageMenu } from "@/components/orca/LanguageMenu";
import { useI18n } from "@/lib/orca/i18n";
import { SEO } from "@/components/SEO";
import { openCookieSettings } from "@/components/CookieBanner";
import "@/components/orca/public-pages.css";
export default function LandingPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const copy =
    lang === "gu"
      ? {
          eyebrow: "દરિયાકાંઠા માટે બુદ્ધિમત્તા",
          title: "દરિયો સમજવા માટે\nએક નવી દિશા.",
          description:
            "દરિયાની સ્થિતિ સમજો, નકશા પર તપાસો અને તમારી ભાષામાં પૂછો. દરેક સલાહ સાથે ઉપલબ્ધ માહિતીના સ્ત્રોત.",
          explore: "પ્લેટફોર્મ જુઓ",
          heading: "એક વાતચીત. વધુ સ્પષ્ટતા.",
          note: "ઉપલબ્ધ માહિતી, તેના સમય અને મર્યાદાઓ સાથે.",
          closing: "તમારી આગલી સફર અહીંથી શરૂ થાય છે.",
        }
      : lang === "hi"
        ? {
            eyebrow: "तटीय जीवन के लिए समुद्री जानकारी",
            title: "समुद्र को समझने का\nएक नया नज़रिया।",
            description:
              "समुद्र की स्थिति समझें, नक्शे पर देखें और अपनी भाषा में पूछें। उपलब्ध जानकारी के स्रोत हर सलाह के साथ।",
            explore: "प्लेटफ़ॉर्म देखें",
            heading: "एक बातचीत। अधिक स्पष्टता।",
            note: "उपलब्ध जानकारी, उसके समय और सीमाओं के साथ।",
            closing: "आपकी अगली यात्रा यहाँ से शुरू होती है।",
          }
        : {
            eyebrow: "MARINE INTELLIGENCE FOR COASTAL LIFE",
            title: "A clearer view\nof the sea.",
            description:
              "Understand sea conditions, explore the coast, and ask in your own language. Available evidence stays connected to every marine answer.",
            explore: "Explore the platform",
            heading: "One conversation. A clearer picture.",
            note: "Available readings, their sources, and their limits. In one place.",
            closing: "Your next journey starts with a question.",
          };
  return (
    <div className="public-page">
      <SEO
        title="ORCA — A clearer view of the sea"
        description="Conversational marine intelligence with source-backed conditions, coastal maps and multilingual voice."
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
            <OrcaLogo className="size-8" />
            <strong>ORCA</strong>
          </Link>
          <a href="#platform" className="public-overview">
            {copy.explore}
          </a>
          <LanguageMenu />
          <Link to="/login" className="public-signin">
            {t("cta.signIn")}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
        <div className="public-hero-word" aria-hidden="true">
          ORCA
        </div>
        <div className="public-hero-bottom">
          <div>
            <p className="public-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="public-description">{copy.description}</p>
            <button
              className="public-primary"
              onClick={() => navigate("/assistant")}
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
          <p className="public-eyebrow">ORCA / {t("land.capabilities")}</p>
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
                to={i === 1 ? "/map" : "/assistant"}
                aria-label={t(key as Parameters<typeof t>[0])}
              >
                <ArrowUpRight size={20} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="public-closing">
        <OrcaLogo className="size-12" />
        <h2>{copy.closing}</h2>
        <Link to="/login" className="public-primary">
          {t("cta.getStarted")}
          <ArrowRight size={18} />
        </Link>
      </section>
      <footer className="public-footer">
        <Link to="/" className="public-brand">
          <OrcaLogo className="size-7" />
          ORCA
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
