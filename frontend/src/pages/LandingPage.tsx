import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Anchor,
  Check,
  ChevronDown,
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

  const [selectedLang, setSelectedLang] = useState<LangCode>(lang || "en");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLanguage = LANGUAGES.find((l) => l.code === (selectedLang || lang)) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (code: LangCode) => {
    setSelectedLang(code);
    setDropdownOpen(false);
    setLang(code);
    handleSelectLang(code);
  };

  const handleGetStarted = () => {
    const chosen = selectedLang || lang || "en";
    setLang(chosen);
    handleSelectLang(chosen);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative isolate bg-primary px-4 py-16 text-primary-foreground md:py-24">
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none">
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

          {/* Controls: Compact Language Dropdown + CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Compact Language Dropdown */}
            <div ref={dropdownRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
                className="inline-flex min-h-12 items-center gap-2 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 text-sm font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 cursor-pointer shadow-sm"
              >
                <Globe className="size-4 text-secondary shrink-0" aria-hidden />
                <span className="font-semibold">{activeLanguage.native}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 opacity-80 transition-transform duration-200",
                    dropdownOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {dropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 z-50 w-64 max-h-[80vh] sm:max-h-none overflow-y-auto sm:overflow-visible rounded-lg border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl ring-1 ring-black/10"
                >
                  {LANGUAGES.map((l) => {
                    const isSelected = (selectedLang || lang) === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleLanguageSelect(l.code)}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors",
                          isSelected
                            ? "bg-teal-50 font-semibold text-teal-800"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{l.native}</span>
                          {l.code !== "en" && (
                            <span className="text-xs text-slate-500">({l.english})</span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="size-4 shrink-0 text-teal-600" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Get Started Button */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-md bg-secondary px-8 text-sm font-semibold text-secondary-foreground shadow-lg transition hover:brightness-110 sm:w-auto"
            >
              {t("cta.getStarted")}
            </button>

            {/* Explore Platform Button */}
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


