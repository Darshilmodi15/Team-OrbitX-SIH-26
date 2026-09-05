import { Link, useNavigate } from "react-router-dom";
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  Map as MapIcon,
  MessageSquare,
  LifeBuoy,
  Home,
  Radio,
  AlertTriangle,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { OrcaLogo } from "@/components/orca/Logo";
import { trackEvent } from "@/lib/orca/analytics";
import { useEffect } from "react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("404_page_encountered", { path: window.location.pathname });
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#06182C] text-slate-100 selection:bg-teal-500/30 overflow-hidden">
      <SEO
        title="404 — Coordinates Not Found | ORCA Marine AI"
        description="The requested marine waypoint or operational page is off-grid or does not exist. Return to safe navigational coordinates."
      />

      {/* Decorative Ocean/Radar Grid Background */}
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-teal-500/30 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-teal-500/10" />
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <OrcaLogo className="size-8 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white font-sans">
                ORCA <span className="text-teal-400">MARINE AI</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Ocean Intelligence
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono text-teal-400 border border-teal-500/30 bg-teal-950/40 px-3 py-1 rounded-full">
            <Radio className="size-3 animate-pulse" />
            <span>BEACON ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main 404 Hero Content */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 text-center z-10">
        {/* Animated Compass / Radar Icon */}
        <div className="relative mb-6">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-slate-900/80 border border-teal-500/30 shadow-2xl shadow-teal-500/10 backdrop-blur-xl">
            <Compass className="size-12 text-teal-400 animate-[spin_12s_linear_infinite]" />
          </div>
          <div className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400">
            <AlertTriangle className="size-4" />
          </div>
        </div>

        {/* Status code badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/40 px-3.5 py-1 text-xs font-mono font-semibold text-rose-300">
          <span>ERROR 404 // WAYPOINT OUT OF RANGE</span>
        </div>

        <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-white font-sans">
          Vessel Off Course
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
          The requested navigational route or sector coordinates do not exist in our oceanographic registry. Your vessel has drifted off-chart.
        </p>

        {/* Primary Command CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 min-w-[140px] inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="size-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="flex-1 min-w-[140px] inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/60 hover:bg-teal-400 hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <Home className="size-4" />
            <span>Return to Port</span>
          </Link>
        </div>

        {/* Quick Route Shortcuts Grid */}
        <div className="mt-10 w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 text-left">
            Active Navigational Waypoints:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-teal-500/10 hover:border-teal-500/30 transition-colors text-slate-300 hover:text-teal-300"
            >
              <LayoutDashboard className="size-5 text-teal-400" />
              <span className="text-xs font-medium">Dashboard</span>
            </Link>

            <Link
              to="/map"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-sky-500/10 hover:border-sky-500/30 transition-colors text-slate-300 hover:text-sky-300"
            >
              <MapIcon className="size-5 text-sky-400" />
              <span className="text-xs font-medium">GIS Map</span>
            </Link>

            <Link
              to="/assistant"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-teal-500/10 hover:border-teal-500/30 transition-colors text-slate-300 hover:text-teal-300"
            >
              <MessageSquare className="size-5 text-teal-400" />
              <span className="text-xs font-medium">AI Copilot</span>
            </Link>

            <Link
              to="/services"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors text-slate-300 hover:text-amber-300"
            >
              <LifeBuoy className="size-5 text-amber-400" />
              <span className="text-xs font-medium">Services & SOS</span>
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ORCA Marine AI · Hackathon prototype</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
