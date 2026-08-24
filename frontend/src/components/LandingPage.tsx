import { Waves, Shield, Fish, ArrowRight, Compass, Anchor, Globe, Bot } from 'lucide-react';
import { REGIONAL_LANGUAGES } from '../data/maritimeData';

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
  const currentLangObj = REGIONAL_LANGUAGES.find((l) => l.code === currentLang);
  const langDisplay = currentLangObj ? `${currentLangObj.native} (${currentLangObj.name})` : 'English';

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0F172A] flex flex-col justify-between font-sans selection:bg-[#0F766E]/20 selection:text-[#0B3D5B]">
      {/* Top Navbar */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B3D5B] flex items-center justify-center text-white shadow-sm">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-[#0B3D5B] tracking-tight">
                ORCA Marine AI
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] font-semibold">
                Official Operational Portal
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium">
              National Coastal Safety & Decision Intelligence Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language selector button */}
          <button
            onClick={onSelectLanguage}
            title="Select Language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-semibold text-[#334155] transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{langDisplay}</span>
          </button>

          <button
            onClick={onGetStarted}
            className="px-4 py-1.5 rounded-lg bg-[#0B3D5B] hover:bg-[#082C42] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 max-w-5xl mx-auto text-center w-full">
        {/* Government Trust Badges */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block"></span>
          <span>Ministry of Earth Sciences • INCOIS • Indian Coast Guard Integration</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0B3D5B] max-w-3xl leading-[1.15] mb-4">
          Safe Sailing & Maritime Intelligence for{' '}
          <span className="text-[#0F766E]">
            India's Coastal Waters
          </span>
        </h1>

        {/* Executive Subtitle */}
        <p className="text-sm sm:text-base text-[#475569] max-w-2xl leading-relaxed mb-8 font-normal">
          Real-time ocean state telemetry from INCOIS, 6-hour decomposed safety matrices,
          Potential Fishing Zone (PFZ) intelligence, and international maritime boundary (IMBL) geofences—empowering coastal fishers, travelers, and maritime authorities.
        </p>

        {/* Primary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-14">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0B3D5B] hover:bg-[#082C42] text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Begin Setup with GPS</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] text-sm font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-[#0F766E]" />
            <span>Open Operational Console</span>
          </button>
        </div>

        {/* 4 Core Operational Capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full text-left">
          {/* Card 1: Live Ocean Telemetry */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#94A3B8] hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D] mb-3">
              <Waves className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Live Ocean Telemetry</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Real-time wave height, peak chop period, sustained wind, gusts, and Sea Surface Temperature from INCOIS.
            </p>
          </div>

          {/* Card 2: 6-Hour Risk Forecast */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#94A3B8] hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#B45309] mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">6-Hour Risk Forecast</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Automated multi-vector safety assessment detecting sea deterioration and steep chop before vessel departure.
            </p>
          </div>

          {/* Card 3: PFZ Intelligence */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#94A3B8] hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#0F766E] mb-3">
              <Fish className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Potential Fishing Zones</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              INCOIS thermal and chlorophyll ocean fronts mapping distance, depth, and target commercial fish species.
            </p>
          </div>

          {/* Card 4: Multilingual AI Assistant */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#94A3B8] hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8] mb-3">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Multilingual AI Assistant</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Real-time maritime voice & text queries in 11 Indian coastal languages powered by Sarvam AI neural speech.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Institutional Footer */}
      <footer className="w-full px-6 py-4 border-t border-[#E2E8F0] bg-white text-center text-xs text-[#64748B] font-sans flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-medium">
          © 2026 ORCA Marine AI • National Coastal Safety & Decision Intelligence Platform
        </span>
        <div className="flex items-center gap-3 text-[11px] font-medium text-[#475569]">
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
