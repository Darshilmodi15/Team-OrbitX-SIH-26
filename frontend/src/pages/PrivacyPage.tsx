import { Link } from "react-router-dom";
import {
  Shield,
  ArrowLeft,
  Lock,
  Eye,
  Database,
  Building,
  Radio,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { OrcaLogo } from "@/components/orca/Logo";
import { openCookieSettings } from "@/components/CookieBanner";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#06182C] text-slate-100 selection:bg-teal-500/30">
      <SEO
        title="Privacy Policy & Ocean Data Governance | ORCA Marine AI"
        description="Comprehensive privacy policy governing coastal telemetry, GPS logs, fisher registration data, and INCOIS satellite integration under DPDPA 2023."
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Title Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/40 px-3 py-1 text-xs font-mono text-teal-300">
            <Shield className="size-3.5" />
            <span>GOVERNMENT OF INDIA · DPDPA 2023 COMPLIANT</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Privacy Policy & Data Governance
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-mono">
            Effective Date: August 31, 2026 | Version: 2.4 | Applicable across all 9 Coastal States & Union Territories
          </p>
        </div>

        {/* Quick Highlights Box */}
        <div className="my-8 rounded-xl border border-teal-500/20 bg-teal-950/20 p-5 text-sm">
          <h2 className="text-base font-semibold text-teal-300 flex items-center gap-2">
            <FileCheck className="size-4 text-teal-400" />
            Executive Privacy Summary
          </h2>
          <ul className="mt-3 space-y-2 text-slate-300 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <ChevronRight className="size-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Vessel Location:</strong> GPS coordinates are processed exclusively for navigational safety, Potential Fishing Zone (PFZ) advisory calculation, and IMBL geofencing.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="size-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>No Commercial Monetization:</strong> ORCA Marine AI does NOT sell, rent, or commercialize fisher telemetry, catch reports, or voice transcripts to private advertisers.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="size-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Emergency Life-Safety:</strong> Distress SOS telemetry is securely shared in real time with the Indian Coast Guard MRCC and State Marine Police.</span>
            </li>
          </ul>
        </div>

        {/* Structured Legal Clauses */}
        <div className="space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building className="size-5 text-teal-400" />
              1. Institutional Authority & Jurisdiction
            </h2>
            <p>
              ORCA Marine AI is developed and maintained in collaboration with the Indian National Centre for Ocean Information Services (INCOIS), Ministry of Earth Sciences (MoES), and State Fisheries Departments. This policy complies with the Digital Personal Data Protection Act (DPDPA 2023) and the Information Technology (Reasonable Security Practices) Rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="size-5 text-teal-400" />
              2. Categories of Information Collected
            </h2>
            <div className="space-y-2 pl-2">
              <p><strong>A. Fisher Identification Data:</strong> National Marine Fisher ID (NMFD), vessel registration number, master/skipper name, contact telephone number, and home harbour port.</p>
              <p><strong>B. Geospatial & Vessel Telemetry:</strong> Real-time and cached latitude/longitude coordinates, vessel speed over ground (SOG), heading (COG), and depth soundings.</p>
              <p><strong>C. Conversational AI & Audio Logs:</strong> Voice audio recordings, multilingual speech-to-text queries, and dialogue history submitted to the ORCA AI Copilot.</p>
              <p><strong>D. Technical & Diagnostic Telemetry:</strong> Device IP address, offline cache status, network connectivity indicators, and telemetry latency benchmarks.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="size-5 text-teal-400" />
              3. Purpose of Data Processing
            </h2>
            <p>We process your data strictly for legitimate maritime safety and navigational advisory purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Generating optimized, fuel-efficient routes to active Potential Fishing Zones (PFZs).</li>
              <li>Delivering high-urgency cyclone, storm surge, tsunami, and high swell advisories from INCOIS and IMD.</li>
              <li>Providing proactive audio-visual alarms prior to crossing the International Maritime Boundary Line (IMBL).</li>
              <li>Routing emergency SOS beacon coordinates to maritime search and rescue (SAR) centers.</li>
              <li>Enabling multi-lingual conversational speech translation across 9 coastal Indian languages.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="size-5 text-teal-400" />
              4. Third-Party Data Disclosures
            </h2>
            <p>
              Data is disclosed strictly on a need-to-know, life-safety, or statutory basis with authorized government agencies:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Indian Coast Guard (ICG) & Maritime Rescue Coordination Centres (MRCC):</strong> Real-time vessel coordinates during active SOS alerts.</li>
              <li><strong>State Fisheries Departments & Marine Police:</strong> Regulatory compliance, biometric fisher welfare subsidy verification, and harbour clearance.</li>
              <li><strong>INCOIS & Indian Meteorological Department (IMD):</strong> Anonymized ground-truth oceanographic telemetry to calibrate ocean-state forecasting models.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="size-5 text-teal-400" />
              5. Data Security & Offshore Edge Encryption
            </h2>
            <p>
              All data transmissions are protected with Transport Layer Security (TLS 1.3) and AES-256 encryption at rest. Telemetry cached offline in the vessel browser is secured in sandboxed IndexedDB storage and automatically pruned according to user preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">
              6. Cookie and Local Storage Controls
            </h2>
            <p>
              We utilize minimal cookies and local browser storage necessary for offline map rendering, language preferences, and essential authentication. You may adjust or revoke your cookie preferences at any time.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={openCookieSettings}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-950/30 px-4 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/50"
              >
                <span>Open Cookie & Privacy Settings</span>
              </button>
            </div>
          </section>

        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 flex justify-between items-center text-xs text-slate-400">
          <Link to="/terms" className="text-teal-400 hover:underline">
            Read Terms of Service →
          </Link>
          <Link to="/" className="text-slate-300 hover:text-white">
            Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
