import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Anchor,
  Check,
  CloudSun,
  Globe,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/orca/i18n";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const FEATURES = [
  { key: "land.f1" as const, desc: "land.f1d" as const, Icon: ShieldCheck },
  { key: "land.f2" as const, desc: "land.f2d" as const, Icon: CloudSun },
  { key: "land.f3" as const, desc: "land.f3d" as const, Icon: Anchor },
  { key: "land.f4" as const, desc: "land.f4d" as const, Icon: MessageSquare },
];

export default function LandingPage() {
  const { lang, setLang, t } = useI18n();
  const { handleSelectLang } = useAppContext();
  const navigate = useNavigate();

  const [selectedLang, setSelectedLang] = useState<LangCode | null>(lang || "en");
  const [error, setError] = useState<string | null>(null);

  const handleLanguageSelect = (code: LangCode) => {
    setSelectedLang(code);
    setError(null);
    setLang(code);
    handleSelectLang(code);
  };

  const handleGetStarted = () => {
    if (!selectedLang) {
      setError("Please select your language first.");
      return;
    }
    setLang(selectedLang);
    handleSelectLang(selectedLang);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary px-4 py-16 text-primary-foreground md:py-24">
        <div className="absolute inset-0 -z-10 opacity-20">
          <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0,200 Q200,80 400,200 T800,200 V400 H0Z" fill="currentColor" opacity="0.15" />
            <path d="M0,240 Q200,140 400,240 T800,240 V400 H0Z" fill="currentColor" opacity="0.1" />
          </svg>
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <OrcaLogo className="mx-auto size-16" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
            {t("app.name")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/80 md:text-lg">
            {t("app.tagline")}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/60">
            {t("app.desc")}
          </p>

          {/* Compact Language Selector */}
          <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground/80 sm:text-sm">
              <Globe className="size-4 text-secondary" aria-hidden />
              <span>{t("lang.title")}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {LANGUAGES.map((l) => {
                const isSelected = selectedLang === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleLanguageSelect(l.code)}
                    aria-pressed={isSelected}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all sm:px-3.5 sm:py-1.5 sm:text-sm",
                      isSelected
                        ? "scale-105 bg-secondary font-semibold text-secondary-foreground shadow-md ring-1 ring-secondary"
                        : "border border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground",
                    )}
                  >
                    {isSelected && (
                      <Check className="size-3.5 text-secondary-foreground" aria-hidden />
                    )}
                    <span>{l.native}</span>
                    {l.code !== "en" && (
                      <span
                        className={cn(
                          "text-[10px] opacity-75",
                          isSelected ? "text-secondary-foreground" : "text-primary-foreground/60",
                        )}
                      >
                        ({l.english})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 inline-block rounded-md bg-destructive/90 px-3 py-1 text-xs font-medium text-destructive-foreground shadow-sm"
              >
                {error}
              </p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleGetStarted}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-md bg-secondary px-8 text-sm font-semibold text-secondary-foreground shadow-lg transition hover:brightness-110 sm:w-auto"
            >
              {t("cta.getStarted")}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-primary-foreground/30 px-8 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10 sm:w-auto"
            >
              {t("cta.explore")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="orca-container py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, desc, Icon }) => (
            <article
              key={key}
              className="rounded-md border border-border bg-card p-5 transition hover:shadow-md"
            >
              <Icon className="size-7 text-secondary" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">{t(key)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(desc)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted-foreground">
        <div className="orca-container flex flex-wrap items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
          <Link to="/terms" className="hover:text-foreground">{t("footer.terms")}</Link>
          <span>{t("footer.rights")}</span>
        </div>
      </footer>
    </div>
  );
}

