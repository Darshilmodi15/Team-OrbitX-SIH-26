import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Globe,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/orca/i18n";
import { useAppContext } from "@/context/AppContext";
import { ThemeToggle } from "@/components/orca/ThemeToggle";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    key: "land.f1" as const,
    desc: "land.f1d" as const,
    tag: "01 // REAL-TIME",
    Icon: ShieldCheck,
    badgeColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "land.f2" as const,
    desc: "land.f2d" as const,
    tag: "02 // METEOROLOGY",
    Icon: Activity,
    badgeColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    key: "land.f3" as const,
    desc: "land.f3d" as const,
    tag: "03 // ADVISORIES",
    Icon: Bell,
    badgeColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "land.f4" as const,
    desc: "land.f4d" as const,
    tag: "04 // MULTILINGUAL",
    Icon: Sparkles,
    badgeColor: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
  },
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
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-teal-500/30">
      {/* Hero Section — Government/Defence Grade Maritime Command */}
      <section className="relative isolate overflow-hidden bg-[#071526] px-4 pt-4 pb-12 sm:pt-6 sm:pb-20 md:pt-8 md:pb-24 min-h-[580px] sm:min-h-[560px] md:min-h-[600px] flex flex-col justify-between border-b border-slate-800">
        {/* Realistic High-Resolution Ocean Photography Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src="/hero-ocean.jpg"
            alt="Deep Ocean Maritime Surveillance Background"
            className="w-full h-full object-cover object-center"
          />
          {/* Professional Deep Navy Gradient & Vignette Overlay for High Legibility */}
          <div className="absolute inset-0 bg-[#071526]/75 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071526]/90 via-[#071526]/60 to-[#071526]" />
        </div>

        {/* Top Command Bar inside Hero */}
        <div className="mx-auto flex w-full max-w-6xl justify-between items-center pb-2 relative z-20">
          {/* Mission Tag / Status */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-950/40 text-[11px] font-mono font-medium text-teal-300 tracking-wider backdrop-blur-md">
            <Radio className="size-3 text-teal-400 animate-pulse" />
            <span>NATIONAL COASTAL SAFETY NETWORK</span>
          </div>

          {/* Top-Right Language & Theme Controls */}
          <div className="flex items-center gap-2.5 ml-auto">
            <ThemeToggle />

            {/* Compact Language Selector */}
            <div ref={dropdownRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
                className="inline-flex min-h-10 items-center gap-1.5 sm:gap-2 rounded-md border border-slate-700/80 bg-slate-900/80 px-3 sm:px-3.5 text-xs font-medium text-slate-100 backdrop-blur-md transition-all hover:bg-slate-800 hover:border-slate-600 cursor-pointer shadow-sm sm:text-sm font-sans"
              >
                <Globe className="size-3.5 text-teal-400 shrink-0 sm:size-4" aria-hidden />
                <span className="font-semibold">{activeLanguage.native}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 text-slate-400 transition-transform duration-200",
                    dropdownOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {dropdownOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-2 z-50 w-56 sm:w-60 max-h-[80vh] sm:max-h-none overflow-y-auto sm:overflow-visible rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-100 shadow-2xl ring-1 ring-black/40 backdrop-blur-xl"
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
                          "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs sm:text-sm text-left transition-colors font-sans",
                          isSelected
                            ? "bg-teal-500/20 font-semibold text-teal-300 border border-teal-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{l.native}</span>
                          {l.code !== "en" && (
                            <span className="text-xs text-slate-400">({l.english})</span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="size-4 shrink-0 text-teal-400" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Content — Executive Presentation Grade */}
        <div className="mx-auto max-w-4xl text-center relative z-10 my-auto px-4 py-4 sm:py-6">
          {/* Logo Brand Mark */}
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-teal-500/10 to-teal-500/0 border border-teal-500/20 mb-4 shadow-inner">
            <OrcaLogo className="size-12 sm:size-16 drop-shadow-[0_0_20px_rgba(45,212,191,0.4)]" />
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm font-sans">
            {t("app.name")}
          </h1>

          {/* Subtitle / Platform Mission */}
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-lg md:text-xl text-teal-300/90 font-medium tracking-normal leading-relaxed">
            {t("app.tagline")}
          </p>

          {/* High-legibility Mission Description */}
          <p className="mx-auto mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm md:text-base text-slate-300/85 leading-relaxed font-normal">
            {t("app.desc")}
          </p>

          {/* Executive CTA Command Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto">
            {/* Get Started Button */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="flex-1 inline-flex min-h-11 sm:min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-teal-500 hover:bg-teal-400 px-5 sm:px-8 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t("cta.getStarted")}</span>
              <ArrowRight className="size-4" />
            </button>

            {/* Explore Platform Button */}
            <Link
              to="/dashboard"
              className="flex-1 inline-flex min-h-11 sm:min-h-12 items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 backdrop-blur-md px-5 sm:px-8 text-xs sm:text-sm font-semibold text-slate-100 transition-all hover:bg-slate-800 hover:border-slate-600 hover:text-white active:scale-[0.98]"
            >
              {t("cta.explore")}
            </Link>
          </div>

          {/* Telemetry Metrics Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal-400" />
              7,516 KM Coastline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal-400" />
              11 Indian Languages
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal-400" />
              Real-Time Marine Radar
            </span>
          </div>
        </div>

        <div className="h-1 sm:h-2" />
      </section>

      {/* Feature Cards Section — Command & Decision Modules */}
      <section className="orca-container py-12 sm:py-16">
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-secondary">
            OPERATIONAL CAPABILITIES
          </p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-foreground">
            Integrated Coastal Intelligence Architecture
          </h2>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, desc, tag, Icon, badgeColor }) => (
            <article
              key={key}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 sm:p-6 transition-all duration-200 hover:border-slate-400/50 hover:shadow-lg dark:hover:border-slate-700 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-md bg-secondary/10 border border-secondary/20 text-secondary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded border", badgeColor)}>
                    {tag}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground tracking-tight">{t(key)}</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
                  {t(desc)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer — Official & Minimal */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted-foreground">
        <div className="orca-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="font-semibold text-foreground">ORCA Marine AI</span>
            <span>—</span>
            <span>National Coastal Safety & Decision Intelligence Platform</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 mx-auto sm:mx-0">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {t("footer.terms")}
            </Link>
            <span>{t("footer.rights")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
