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
import { OceanWavesCanvas } from "@/components/orca/OceanWavesCanvas";
import { ThemeToggle } from "@/components/orca/ThemeToggle";
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
      {/* Hero with Animated Ocean Waves & Responsive Mobile Layout */}
      <section className="relative isolate overflow-hidden bg-[#0a1b2e] px-4 pt-4 pb-8 sm:pt-6 sm:pb-16 md:pt-8 md:pb-24 min-h-[560px] sm:min-h-[520px] md:min-h-[540px] flex flex-col justify-between">
        <div className="absolute inset-0 -z-10">
          <OceanWavesCanvas
            className="w-full h-full"
            interactive={true}
            showParticles={true}
            showFoamCrests={true}
            speedMultiplier={1}
          />
        </div>

        {/* Top-Right Language & Theme Controls inside Hero */}
        <div className="mx-auto flex w-full max-w-5xl justify-end items-center gap-2 pb-1 sm:pb-4 relative z-20">
          <ThemeToggle />

          <div ref={dropdownRef} className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              className="inline-flex min-h-10 items-center gap-1.5 sm:gap-2 rounded-md border border-white/30 bg-white/10 px-3 sm:px-3.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 cursor-pointer shadow-sm sm:text-sm"
            >
              <Globe className="size-3.5 text-teal-300 shrink-0 sm:size-4" aria-hidden />
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
                className="absolute right-0 top-full mt-2 z-50 w-56 sm:w-60 max-h-[80vh] sm:max-h-none overflow-y-auto sm:overflow-visible rounded-lg border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl ring-1 ring-black/10"
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
                        "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs sm:text-sm text-left transition-colors",
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
        </div>

        {/* Hero Content */}
        <div className="mx-auto max-w-4xl text-center relative z-10 mt-1 mb-4 sm:my-auto px-2">
          <div className="inline-block drop-shadow-[0_0_15px_rgba(45,212,191,0.35)]">
            <OrcaLogo className="mx-auto size-12 sm:size-16 drop-shadow-md" />
          </div>
          <h1 className="mt-3 sm:mt-6 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
            {t("app.name")}
          </h1>
          <p className="mx-auto mt-2 sm:mt-4 max-w-2xl text-xs sm:text-base md:text-lg text-teal-100/90 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
            {t("app.tagline")}
          </p>
          <p className="mx-auto mt-1.5 sm:mt-3 max-w-xl text-xs sm:text-sm text-slate-200/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] leading-relaxed">
            {t("app.desc")}
          </p>

          {/* Clean CTA Buttons: side-by-side on mobile with compact padding to avoid crowding the waves */}
          <div className="mt-4 sm:mt-8 flex flex-row items-center justify-center gap-2.5 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
            {/* Get Started Button */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="flex-1 sm:flex-none inline-flex min-h-10 sm:min-h-12 cursor-pointer items-center justify-center rounded-md bg-teal-500 hover:bg-teal-400 px-4 sm:px-8 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg shadow-teal-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("cta.getStarted")}
            </button>

            {/* Explore Platform Button */}
            <Link
              to="/dashboard"
              className="flex-1 sm:flex-none inline-flex min-h-10 sm:min-h-12 items-center justify-center rounded-md border border-white/30 bg-white/10 backdrop-blur-sm px-4 sm:px-8 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("cta.explore")}
            </Link>
          </div>
        </div>

        <div className="h-1 sm:h-2" />
      </section>

      {/* Features */}
      <section className="orca-container py-12 sm:py-16">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, desc, Icon }) => (
            <article
              key={key}
              className="rounded-md border border-border bg-card text-card-foreground p-4 sm:p-5 transition hover:shadow-md shadow-xs"
            >
              <Icon className="size-6 sm:size-7 text-secondary" aria-hidden />
              <h3 className="mt-2.5 sm:mt-3 text-sm font-semibold text-foreground">{t(key)}</h3>
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">{t(desc)}</p>
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
