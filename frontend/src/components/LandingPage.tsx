import { Waves, Shield, Fish, AlertTriangle, ArrowRight, Compass, Anchor, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-[#030a1c] text-white flex flex-col justify-between font-sans selection:bg-teal-500/30">
      {/* Top Navbar */}
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(20,184,166,0.5)]">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-white bg-clip-text text-transparent">
              ORCA Marine AI
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/30 text-teal-300 font-mono">
              SIH 2026 Coastal Safety
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language pill */}
          <button
            onClick={onSelectLanguage}
            title="Change Interface Language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            <span>🌐</span>
            <span>{langNames[currentLang] || 'English'}</span>
          </button>

          <button
            onClick={onGetStarted}
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto text-center w-full">
        {/* Coastal Safety Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs font-mono font-semibold mb-6 shadow-sm animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Mobile-First Coastal Safety & Marine Intelligence Platform</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.15] mb-4">
          Safe Sailing & Intelligent Advisory for{' '}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
            India's Coastal Waters
          </span>
        </h1>

        {/* Short explanation */}
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed mb-8 font-normal">
          Live ocean state telemetry from INCOIS, decomposed 6-hour marine risk matrices,
          Potential Fishing Zone (PFZ) coordinates, and international boundary geofences—empowering coastal fishermen and authorities.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-12">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-bold shadow-[0_0_25px_rgba(13,148,136,0.45)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Get Started with GPS</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Direct Operational View</span>
          </button>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 w-full text-left">
          {/* Card 1: Live Weather */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/50 transition-all group backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
              <Waves className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Live Marine Conditions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time wave height, chop period, sustained wind, gusts, and Sea Surface Temperature from INCOIS & Open-Meteo.
            </p>
          </div>

          {/* Card 2: Coastal Safety */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition-all group backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Coastal Safety Alerts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-vector risk engine evaluating sea severity, steep chop, and 6-hour forecast trends before vessel departure.
            </p>
          </div>

          {/* Card 3: PFZ Intelligence */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-all group backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Fish className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Fishing Zone Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              INCOIS-derived Potential Fishing Zones (PFZ) mapping distance, depth, and target pelagic fish species.
            </p>
          </div>

          {/* Card 4: Emergency Assistance */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-rose-500/50 transition-all group backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Emergency & Geofencing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Proactive alerts for India-Pak / Sri Lanka IMBL boundaries, Marine Sanctuaries (MPA), and emergency numbers.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 ORCA Marine AI • Team OrbitX (SIH-2026)</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-teal-400">INCOIS OSF</span>
          <span>•</span>
          <span className="text-cyan-400">Sarvam AI</span>
          <span>•</span>
          <span className="text-sky-400">Open-Meteo</span>
          <span>•</span>
          <span className="text-indigo-400">VLIZ Marine Regions</span>
        </div>
      </footer>
    </div>
  );
}
