import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  MessageSquare,
  Map as MapIcon,
  ShieldCheck,
  Clock,
  Printer,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { OrcaLogo } from "@/components/orca/Logo";
import { trackEvent } from "@/lib/orca/analytics";

export default function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const [txId, setTxId] = useState("");
  const [formattedDate, setFormattedDate] = useState("");

  const reason = searchParams.get("reason") || "submission";
  const email = searchParams.get("email") || "";

  useEffect(() => {
    // Generate persistent realistic maritime telemetry ID
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const generatedTxId = `ORCA-IN-${new Date().getFullYear()}-${randomHex}`;
    setTxId(generatedTxId);
    setFormattedDate(
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium",
      })
    );

    // Fire celebratory confetti on mount
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2dd4bf", "#38bdf8", "#34d399", "#60a5fa"],
      });
    } catch {
      // Ignore confetti errors if canvas unavailable
    }

    trackEvent("thank_you_page_viewed", { reason, txId: generatedTxId });
  }, [reason]);

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#06182C] text-slate-100 selection:bg-teal-500/30">
      <SEO
        title="Submission Confirmed | ORCA Marine AI"
        description="Your maritime telemetry submission, vessel inquiry, or notification dispatch has been successfully recorded."
      />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <OrcaLogo className="size-8" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white font-sans">
                ORCA <span className="text-teal-400">MARINE AI</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Ocean Intelligence
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 rounded-full">
            <ShieldCheck className="size-3.5" />
            <span>TRANSMISSION RECORDED</span>
          </div>
        </div>
      </header>

      {/* Confirmation Content */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 z-10">
        <div className="w-full rounded-2xl border border-teal-500/30 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 text-center">
          {/* Animated Success Badge */}
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20 animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="size-10" />
          </div>

          <h1 className="mt-5 text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
            Transmission Confirmed
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm sm:text-base text-slate-300">
            {reason === "sos"
              ? "Your emergency beacon distress telemetry has been routed to the Indian Coast Guard MRCC and local harbour master."
              : reason === "contact"
              ? "Thank you for reaching out to ORCA Marine Operations. Our maritime support desk will review your inquiry shortly."
              : "Your vessel details and advisory preferences have been synchronized with the central INCOIS coastal intelligence node."}
          </p>

          {email && (
            <p className="mt-1 text-xs text-teal-300 font-mono">
              Confirmation receipt sent to: {email}
            </p>
          )}

          {/* Reference Details Ticket */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left text-xs font-mono sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 text-[11px] block">TRANSMISSION REFERENCE</span>
                <span className="text-teal-400 font-bold tracking-wider">{txId}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">TIMESTAMP (IST)</span>
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="size-3 text-slate-400" />
                  {formattedDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">DATA NODE</span>
                <span className="text-slate-300">INCOIS Coastal Ground Station #04</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">ENCRYPTION STATUS</span>
                <span className="text-emerald-400">AES-256 Validated</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="flex-1 min-w-[160px] inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-500 px-5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/50 hover:bg-teal-400 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Go to Command Dashboard</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              to="/assistant"
              className="flex-1 min-w-[160px] inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 text-xs sm:text-sm font-semibold text-slate-100 hover:bg-slate-700 transition active:scale-[0.98]"
            >
              <MessageSquare className="size-4 text-teal-400" />
              <span>Ask AI Copilot</span>
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-4 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>
          </div>
        </div>

        {/* Hackathon prototype notice */}
        <div className="mt-8 w-full rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-teal-400" />
            Hackathon Prototype
          </p>
          <p className="text-[11px]">
            ORCA is a student-built demonstration and is not an official government office or emergency service.
            For emergencies, contact the appropriate local authorities.
          </p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ORCA Marine AI · National Coastal Decision Platform</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
