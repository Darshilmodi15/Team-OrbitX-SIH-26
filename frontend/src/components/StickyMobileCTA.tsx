import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, PhoneCall, Sparkles, X, LayoutDashboard } from "lucide-react";
import { trackSOS } from "@/lib/orca/analytics";

export function StickyMobileCTA() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide on assistant page (where chat input is already present) or if dismissed
  if (dismissed || location.pathname === "/assistant") {
    return null;
  }

  const handleSOSClick = () => {
    trackSOS(undefined, undefined, "sticky_mobile_cta");
  };

  return (
    <aside
      aria-label="Mobile Quick Command Access"
      className="fixed bottom-16 inset-x-3 z-40 lg:hidden pointer-events-none transition-all duration-300 ease-in-out"
    >
      <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border border-teal-500/30 bg-slate-900/95 p-2 text-slate-100 shadow-2xl shadow-slate-950/80 backdrop-blur-xl ring-1 ring-white/10">
        {/* Quick AI Assistant Trigger */}
        <Link
          to="/assistant"
          className="flex flex-1 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md transition-transform active:scale-95"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-slate-950/20">
            <Sparkles className="size-4 text-slate-950" />
          </div>
          <div className="flex flex-col text-left">
            <span className="leading-none text-[11px] uppercase tracking-wider text-slate-900/70 font-mono">
              AI Copilot
            </span>
            <span className="leading-tight text-xs font-extrabold text-slate-950">
              Ask Ocean AI
            </span>
          </div>
        </Link>

        {/* Quick Emergency SOS Call Action */}
        <a
          href="tel:1554"
          onClick={handleSOSClick}
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/25 active:scale-95"
        >
          <PhoneCall className="size-3.5 text-rose-400 animate-pulse" />
          <span className="font-mono">SOS 1554</span>
        </a>

        {/* Dismiss mini button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss quick actions"
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}
