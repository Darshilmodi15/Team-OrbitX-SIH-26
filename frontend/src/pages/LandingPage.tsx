import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waves,
  Compass,
  Fish,
  ShieldAlert,
  Phone,
  MessageSquare,
  Globe2,
  ChevronRight,
  ShieldCheck,
  Radio,
  ArrowRight,
  Anchor,
  Activity,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStrings, SUPPORTED_LANGUAGES, getLanguageDisplay } from '../i18n';
import AuthModal from '../components/AuthModal';
import LocationSelectorModal from '../components/LocationSelectorModal';
import EmergencySOSModal from '../components/EmergencySOSModal';

export default function LandingPage() {
  const { currentLang, setCurrentLang, selectedPort, handleSelectPort, handleUpdateUserLocation, userLocation, riskLevel } = useAppContext();
  const t = getStrings(currentLang);
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const capabilities = [
    {
      id: 'safety',
      title: t.capabilitySafety,
      description: t.capabilitySafetyDesc,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      id: 'weather',
      title: t.capabilityWeather,
      description: t.capabilityWeatherDesc,
      icon: Waves,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
    },
    {
      id: 'pfz',
      title: t.capabilityPFZ,
      description: t.capabilityPFZDesc,
      icon: Fish,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    },
    {
      id: 'boundaries',
      title: t.capabilityBoundaries,
      description: t.capabilityBoundariesDesc,
      icon: ShieldAlert,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      id: 'emergency',
      title: t.capabilityEmergency,
      description: t.capabilityEmergencyDesc,
      icon: Phone,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    },
    {
      id: 'assistant',
      title: t.capabilityAssistant,
      description: t.capabilityAssistantDesc,
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-slate-900 font-sans">
      {/* ─── Institutional Top Bar ─── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A2540] text-white shadow-xs">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.74.56-3.35 1.52-4.67l11.15 11.15C15.35 19.44 13.74 20 12 20zm6.48-3.33L7.33 5.52C8.65 4.56 10.26 4 12 4c4.41 0 8 3.59 8 8 0 1.74-.56 3.35-1.52 4.67z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-black tracking-tight text-[#0A2540] sm:text-lg">
                  ORCA
                </span>
                <span className="rounded-sm bg-[#0D9488]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#0D9488]">
                  MARINE AI
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 hidden sm:block">
                {t.descriptor}
              </p>
            </div>
          </div>

          {/* Top Actions: Language Selector & Dashboard CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as any)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:border-[#0D9488] focus:outline-none cursor-pointer"
                aria-label="Select Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.native} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0A2540] px-3.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#081D33] active:scale-95 transition cursor-pointer"
            >
              <span>{t.explorePlatform}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-[#F8FAFC] py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-[#0D9488] mb-4">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span>National Coastal Safety & Decision Intelligence</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0A2540] leading-tight">
                {t.tagline}
              </h1>

              {/* Subtitle */}
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                {t.landingIntro}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="flex items-center gap-2 rounded-xl bg-[#0A2540] px-5 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-95 transition cursor-pointer"
                >
                  <span>{t.getStarted} (Onboarding)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#0F766E] active:scale-95 transition cursor-pointer"
                >
                  <Anchor className="h-4 w-4" />
                  <span>Command Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Compass className="h-4 w-4 text-[#0D9488]" />
                  <span>{t.chooseManual}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  <Phone className="h-4 w-4 text-red-600" />
                  <span>{t.emergencyServices}</span>
                </button>
              </div>
            </div>

            {/* Live Telemetry Snapshot Card */}
            <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-display text-xs sm:text-sm font-bold text-slate-900">
                    Live Coastal Status — {selectedPort.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {userLocation.lat.toFixed(2)}°N, {userLocation.lon.toFixed(2)}°E • INCOIS Wave Model
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">{t.safetyStatus}</p>
                  <p className="font-display text-sm font-bold text-emerald-700 mt-0.5">
                    {t.safe}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">{t.waveHeight}</p>
                  <p className="font-display text-sm font-bold text-slate-900 mt-0.5">
                    1.20 m (Moderate)
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">{t.windSpeed}</p>
                  <p className="font-display text-sm font-bold text-slate-900 mt-0.5">
                    18.5 km/h WSW
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">{t.nearestFishingZone}</p>
                  <p className="font-display text-sm font-bold text-sky-700 mt-0.5">
                    24.5 km (Tuna Front)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Core Capabilities Grid ─── */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0A2540]">
              Complete Coastal Intelligence Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Engineered to support traditional fishers, mechanized fleet masters, and maritime authorities across India's 7,516 km coastline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs hover:border-slate-300 hover:shadow-md transition"
                >
                  <div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cap.bg} ${cap.color} mb-4`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      ORCA Core Engine
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── Institutional Footer ─── */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-[#0D9488]" />
            <span className="font-bold text-slate-800">ORCA Marine AI</span>
            <span>— National Coastal Safety & Marine Decision Support</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span className="font-mono text-[11px]">Telemetry: INCOIS • IMD • Sarvam AI</span>
            <span>|</span>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hover:text-[#0A2540] font-semibold cursor-pointer"
            >
              Command Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => navigate('/dashboard')}
        currentLang={currentLang}
      />
      <LocationSelectorModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        selectedPort={selectedPort}
        onSelectPort={handleSelectPort}
        onUpdateCoords={handleUpdateUserLocation}
        currentLang={currentLang}
      />
      <EmergencySOSModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        userLocation={userLocation}
        currentLang={currentLang}
      />
    </div>
  );
}
