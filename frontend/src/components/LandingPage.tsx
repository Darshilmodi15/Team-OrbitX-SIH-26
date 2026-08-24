import { Waves, Shield, Fish, AlertTriangle, ArrowRight, Compass, Anchor, Globe } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
  onSelectLanguage: () => void;
  currentLang: string;
}

export default function LandingPage({
  onGetStarted,
  onExploreDemo,
  onSelectLanguage,
  currentLang,
}: LandingPageProps) {
  const langNames: Record<string, string> = {
    en: 'English',
    hi: 'हिन्दी',
    gu: 'ગુજરાતી',
    mr: 'मराठी',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    ml: 'മലയാളം',
    bn: 'বাংলা',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B4A72] flex items-center justify-center text-white shadow-sm">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                ORCA Marine AI
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-semibold font-mono">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              National Coastal Safety & Decision Intelligence Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language selector button */}
          <button
            onClick={onSelectLanguage}
            title="Change Interface Language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-700" />
            <span>{langNames[currentLang] || 'English'}</span>
          </button>

          <button
            onClick={onGetStarted}
            className="px-4 py-1.5 rounded-lg bg-[#0B4A72] hover:bg-[#083857] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* Hero Section - Perfectly Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 max-w-5xl mx-auto text-center w-full">
        {/* Coastal Safety Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          <span>Government & Fishermen Coastal Safety Architecture</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-[1.15] mb-4">
          Safe Sailing & Marine Intelligence for{' '}
          <span className="text-[#0B4A72]">
            India's Coastal Waters
          </span>
        </h1>

        {/* Subtitle / Description */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed mb-8 font-normal">
          Real-time ocean state telemetry from INCOIS, decomposed 6-hour safety matrices,
          Potential Fishing Zone (PFZ) advisories, and maritime boundary geofences—designed for fishermen and coastal authorities.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-14">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0B4A72] hover:bg-[#083857] text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Get Started with GPS</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-sm font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-blue-700" />
            <span>Open Operational Console</span>
          </button>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full text-left">
          {/* Card 1: Live Weather */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B4A72] mb-3">
              <Waves className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Live Ocean Telemetry</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time wave height, peak chop period, sustained wind, gusts, and Sea Surface Temperature from INCOIS.
            </p>
          </div>

          {/* Card 2: Coastal Safety */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">6-Hour Risk Forecast</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated multi-vector safety assessment detecting sea deterioration and rough conditions before departure.
            </p>
          </div>

          {/* Card 3: PFZ Intelligence */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
              <Fish className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Potential Fishing Zones</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              INCOIS thermal and chlorophyll ocean fronts mapping distance, depth, and target commercial fish species.
            </p>
          </div>

          {/* Card 4: Emergency Assistance */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">IMBL & Emergency SOS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Geofence warnings for border limits (IMBL), marine sanctuaries, Coast Guard 1554, and Coastal Police 1093.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 font-sans flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-medium">© 2026 ORCA Marine AI • Team OrbitX (Smart India Hackathon 2026)</span>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <span>INCOIS OSF</span>
          <span>•</span>
          <span>Sarvam AI</span>
          <span>•</span>
          <span>Indian Coast Guard</span>
          <span>•</span>
          <span>Open-Meteo</span>
        </div>
      </footer>
    </div>
  );
}
