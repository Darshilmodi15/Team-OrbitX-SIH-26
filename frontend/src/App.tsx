import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import AuthModal from './components/AuthModal';
import LocationPermissionModal from './components/LocationPermissionModal';
import CurrentMarineStatusCard from './components/CurrentMarineStatusCard';
import ForecastHorizonTimeline from './components/ForecastHorizonTimeline';
import TerminologyExplainerModal from './components/TerminologyExplainerModal';
import NotificationCenterModal, { type NotificationItem } from './components/NotificationCenterModal';
import EmergencySOSModal from './components/EmergencySOSModal';
import GovernmentPortalModal from './components/GovernmentPortalModal';
import SuperAdminModal from './components/SuperAdminModal';
import MobileBottomNav, { type MobileTab } from './components/MobileBottomNav';
import { TopHeader } from './components/TopHeader';
import { GisLayersPanel, type GisLayerState } from './components/GisLayersPanel';
import MarineMap from './components/MarineMap';
import ChatPanel from './components/ChatPanel';
import { FishAnalyticsModal } from './components/FishAnalyticsModal';
import { AgentTraceModal } from './components/AgentTraceModal';
import { Footer } from './components/Footer';
import { MessageSquare, X } from 'lucide-react';
import {
  queryORCA,
  fetchMarineConditions,
  fetchMarineRisk,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkLocationSafetyAlerts,
} from './services/api';
import {
  INDIAN_PORTS,
  MOCK_PFZ_ZONES,
  type Port,
  type WeatherMetrics,
} from './data/maritimeData';

export interface LocationCoords {
  lat: number;
  lon: number;
}

export interface PFZEvidenceItem {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  depth_m?: number | null;
  species: string[];
  source?: string;
  is_mock?: boolean;
}

export interface BackendQueryResponse {
  answer: string;
  reasoning: string[];
  sources_used: string[];
  plan: any;
  risk_level?: string | null;
  weather?: any;
  nearest_pfz?: PFZEvidenceItem[] | null;
  language?: string;
  language_name?: string;
  original_question?: string;
  english_question?: string;
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  weather?: any;
  risk_level?: string | null;
  plan?: any;
  reasoning?: string[];
  sources_used?: string[];
}

export default function App() {
  // Navigation
  const [appStage, setAppStage] = useState<'landing' | 'dashboard'>('landing');
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');

  // Modals
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isTerminologyModalOpen, setIsTerminologyModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isGovPortalOpen, setIsGovPortalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEcologyModalOpen, setIsEcologyModalOpen] = useState(false);
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);

  // Chat drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);

  // User
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Location
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]);
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });
  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentLang, setCurrentLang] = useState<string>('en');

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [activeCriticalToast, setActiveCriticalToast] = useState<NotificationItem | null>(null);

  // Weather & Safety
  const [weather, setWeather] = useState<WeatherMetrics>(
    INDIAN_PORTS[0].defaultWeather || {
      wave_height_m: 1.2,
      wind_speed_kmh: 18,
      wind_direction_deg: 240,
      wind_direction_cardinal: 'WSW',
      forecast: 'Clear',
      temperature_c: 29.5,
      sst_c: 28.2,
      swell_period_s: 7,
      tide_state: 'Ebb',
      visibility_km: 15,
      source: 'INCOIS_OSF_LIVE',
    }
  );
  const [riskLevel, setRiskLevel] = useState<'safe' | 'caution' | 'unsafe'>('safe');

  // GIS Layers
  const [gisLayers, setGisLayers] = useState<GisLayerState>({
    pfz: true,
    geofence: true,
    route: true,
    sst: true,
    chlorophyll: true,
    waves: true,
    wind: true,
  });

  // PFZ Zones
  const [pfzZones, setPfzZones] = useState<PFZEvidenceItem[]>(
    MOCK_PFZ_ZONES.map((z) => ({
      name: z.name,
      latitude: z.lat,
      longitude: z.lon,
      distance_km: z.distance_km || 28.5,
      depth_m: z.depth_m,
      species: [z.dominant_species],
      source: 'INCOIS_PFZ_ADVISORY',
    }))
  );

  // Messages
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-greeting',
      sender: 'assistant',
      text: '🌊 **Welcome to ORCA Marine AI.**\n\nI provide real-time maritime intelligence, navigational safety assessments, and INCOIS-derived Potential Fishing Zone (PFZ) advisories.\n\nAsk me about sea conditions, wave safety, fishing zones, or coastal navigation in any Indian language.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ═══ Live Telemetry & Alerts ═══
  useEffect(() => {
    let isMounted = true;

    async function refreshTelemetryAndAlerts() {
      try {
        const [condData, riskData, alertsData] = await Promise.all([
          fetchMarineConditions(userLocation.lat, userLocation.lon, currentDate).catch(() => null),
          fetchMarineRisk(userLocation.lat, userLocation.lon, currentDate).catch(() => null),
          checkLocationSafetyAlerts(userLocation.lat, userLocation.lon, undefined, undefined, currentUser?.id).catch(() => null),
        ]);

        if (isMounted) {
          if (condData) {
            setWeather((prev) => ({
              ...prev,
              wave_height_m: condData.wave_height_m || prev.wave_height_m,
              wind_speed_kmh: condData.wind_speed_kmh || prev.wind_speed_kmh,
              wind_direction_deg: condData.wind_direction_deg || prev.wind_direction_deg,
              wind_direction_cardinal: condData.wind_direction_cardinal || prev.wind_direction_cardinal,
              forecast: condData.forecast || prev.forecast,
              temperature_c: condData.temperature_c || prev.temperature_c,
              sst_c: condData.sea_surface_temperature_c || prev.sst_c,
              swell_period_s: condData.wave_period_s || prev.swell_period_s,
              visibility_km: condData.visibility_km || prev.visibility_km,
              source: condData.source || prev.source,
            }));
          }
          if (riskData && riskData.risk_level) {
            setRiskLevel(riskData.risk_level as any);
          }
          if (alertsData && alertsData.notifications) {
            setNotifications(alertsData.notifications);
            setUnreadAlertsCount(alertsData.unread_count || 0);
            const criticalAlert = alertsData.notifications.find(
              (n: any) => (n.severity === 'CRITICAL' || n.severity === 'HIGH') && !n.is_read
            );
            if (criticalAlert) {
              setActiveCriticalToast(criticalAlert);
            }
          }
        }
      } catch (err) {
        console.warn('Telemetry/alerts refresh fallback:', err);
      }
    }

    refreshTelemetryAndAlerts();
    return () => { isMounted = false; };
  }, [userLocation, currentDate, currentUser]);

  // ═══ Notification Handlers ═══
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadAlertsCount((c) => Math.max(0, c - 1));
      if (activeCriticalToast?.id === id) setActiveCriticalToast(null);
    } catch (err) {
      console.warn('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(currentUser?.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadAlertsCount(0);
      setActiveCriticalToast(null);
    } catch (err) {
      console.warn('Mark all read error:', err);
    }
  };

  // ═══ Onboarding Flow ═══
  const handleStartOnboarding = () => setIsLanguageModalOpen(true);
  const handleLanguageContinue = () => { setIsLanguageModalOpen(false); setIsAuthModalOpen(true); };

  const handleAuthSuccess = (userProfile: any) => {
    setCurrentUser(userProfile);
    if (userProfile.preferred_language) setCurrentLang(userProfile.preferred_language);
    setIsAuthModalOpen(false);
    setIsLocationModalOpen(true);
  };

  const handleLocationApproved = (loc: LocationCoords) => {
    setUserLocation(loc);
    setIsLocationModalOpen(false);
    setAppStage('dashboard');
  };

  const handleDirectDemo = () => setAppStage('dashboard');

  // ═══ Language & Port Selection ═══
  const handleSelectLang = (lang: string) => {
    setCurrentLang(lang);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const langGreetings: Record<string, string> = {
      gu: '🌐 **ભાષા બદલાઈ ગઈ છે**: ગુજરાતી. ઓર્કા મરીન AI હવે તમને ગુજરાતીમાં માહિતી આપશે.',
      hi: '🌐 **भाषा बदल दी गई है**: हिन्दी. ओर्का मरीन AI अब हिन्दी में जानकारी प्रदान करेगा।',
      mr: '🌐 **भाषा बदलली आहे**: मराठी. ऑर्का मरीन AI आता मराठीत माहिती देईल.',
      ta: '🌐 **மொழி மாற்றப்பட்டது**: தமிழ். ஆர்கா மரைன் AI தமிழில் தகவல்களை வழங்கும்.',
      ml: '🌐 **ഭാഷ മാറ്റി**: മലയാളം. ഓർക്ക മറൈൻ AI മലയാളത്തിൽ ലഭ്യമാക്കും.',
      te: '🌐 **భాష మార్చబడింది**: తెలుగు. ఓర్కా మెరైన్ AI తెలుగులో సమాచారం అందిస్తుంది.',
      bn: '🌐 **ভাষা পরিবর্তিত হয়েছে**: বাংলা. ওর্কা মেরিন AI বাংলায় তথ্য প্রদান করবে।',
      en: '🌐 **Language switched**: English. ORCA Marine AI will now respond in English.',
    };
    setMessages((prev) => [...prev, {
      id: `lang-change-${Date.now()}`,
      sender: 'assistant',
      text: langGreetings[lang] || langGreetings.en,
      timestamp: timeNow,
    }]);
  };

  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    setUserLocation({ lat: port.lat, lon: port.lon });
    if (port.defaultWeather) setWeather(port.defaultWeather);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, {
      id: `port-change-${Date.now()}`,
      sender: 'assistant',
      text: `⚓ **Location updated** to **${port.name}** (${port.state}) at \`${port.lat.toFixed(4)}°N, ${port.lon.toFixed(4)}°E\`.\n\nMarine telemetry re-centered for this coastal sector.`,
      timestamp: timeNow,
    }]);
  };

  // ═══ Chat/Query Handler ═══
  const handleSendMessage = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: questionText,
      timestamp: timeNow,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await queryORCA({
        location: userLocation,
        date: currentDate,
        question: questionText,
        language: currentLang,
      });

      if (response.nearest_pfz && Array.isArray(response.nearest_pfz) && response.nearest_pfz.length > 0) {
        setPfzZones(response.nearest_pfz);
      }
      if (response.weather) {
        setWeather({
          wave_height_m: response.weather.wave_height_m || weather.wave_height_m,
          wind_speed_kmh: response.weather.wind_speed_kmh || weather.wind_speed_kmh,
          wind_direction_deg: response.weather.wind_direction_deg || weather.wind_direction_deg,
          wind_direction_cardinal: response.weather.wind_direction_cardinal || weather.wind_direction_cardinal,
          forecast: response.weather.forecast || weather.forecast,
          temperature_c: response.weather.temperature_c || weather.temperature_c,
          sst_c: response.weather.sea_surface_temperature_c || weather.sst_c,
          swell_period_s: response.weather.wave_period_s || weather.swell_period_s,
          tide_state: 'Ebb',
          visibility_km: response.weather.visibility_km || weather.visibility_km,
          source: response.weather.source || 'INCOIS_OSF_LIVE',
        });
      }
      if (response.risk_level) setRiskLevel(response.risk_level as any);

      const assistantMsg: MessageItem = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        weather: response.weather,
        risk_level: response.risk_level,
        plan: response.plan,
        reasoning: response.reasoning,
        sources_used: response.sources_used,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to connect to ORCA backend.';
      setError(errMsg);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Connection Error**: ${errMsg}\n\nPlease check that the backend is running at \`http://localhost:8000\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <>
      {appStage === 'landing' ? (
        <LandingPage
          onGetStarted={handleStartOnboarding}
          onExploreDemo={handleDirectDemo}
          onSelectLanguage={() => setIsLanguageModalOpen(true)}
          currentLang={currentLang}
        />
      ) : (
        /* ═══════ DASHBOARD: Map-First Layout ═══════ */
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
          {/* Compact Header */}
          <TopHeader
            vesselLat={userLocation.lat}
            vesselLon={userLocation.lon}
            weather={weather}
            riskLevel={riskLevel}
            currentLang={currentLang}
            currentUser={currentUser}
            unreadAlertsCount={unreadAlertsCount}
            selectedPort={selectedPort}
            onSelectPort={handleSelectPort}
            onSelectLang={handleSelectLang}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
            onOpenGovPortal={() => setIsGovPortalOpen(true)}
            onReturnHome={() => setAppStage('landing')}
          />

          {/* Critical Alert Toast */}
          {activeCriticalToast && (
            <div className="z-40 px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 animate-slideDown">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span><strong>{activeCriticalToast.title}:</strong> {activeCriticalToast.message}</span>
              </div>
              <button
                onClick={() => handleMarkRead(activeCriticalToast.id)}
                className="ml-3 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold text-[10px] shrink-0 cursor-pointer transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ═══ Main Content Area: Full-Width Map + Floating Overlays ═══ */}
          <main className="flex-1 relative overflow-hidden min-h-0 pb-14 md:pb-0">
            {/* Full Map Background */}
            <div className={`absolute inset-0 ${mobileTab === 'map' || typeof window !== 'undefined' && window.innerWidth >= 768 ? 'block' : 'hidden md:block'}`}>
              <MarineMap
                userLocation={userLocation}
                pfzZones={gisLayers.pfz ? pfzZones : []}
                layers={gisLayers}
              />

              {/* GIS Layer Panel (floating on map) */}
              <GisLayersPanel
                layers={gisLayers}
                onToggleLayer={(k) => setGisLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
                currentLang={currentLang}
              />
            </div>

            {/* ═══ Floating Status Card (top-right on desktop) ═══ */}
            <div className={`absolute top-3 right-3 z-20 hidden md:block`}>
              <div
                className="glass-light border border-slate-200/80 rounded-xl overflow-hidden animate-fadeIn"
                style={{ width: 'var(--status-card-width)', boxShadow: 'var(--shadow-lg)' }}
              >
                {/* Toggle Header */}
                <button
                  onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-white/60 transition cursor-pointer"
                >
                  <span>Marine Status</span>
                  <span className="text-[10px] text-slate-400">{isStatusExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                </button>

                {isStatusExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    <CurrentMarineStatusCard
                      weather={weather}
                      riskLevel={riskLevel}
                      coastalRegion={selectedPort.state}
                      distanceToCoastKm={4.8}
                      onOpenTerminology={() => setIsTerminologyModalOpen(true)}
                      currentLang={currentLang}
                    />
                    <ForecastHorizonTimeline
                      userLocation={userLocation}
                      baseWeather={weather}
                      currentLang={currentLang}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Mobile Status View ═══ */}
            {mobileTab === 'status' && (
              <div className="absolute inset-0 z-10 bg-slate-50 overflow-y-auto p-4 space-y-3 md:hidden">
                <CurrentMarineStatusCard
                  weather={weather}
                  riskLevel={riskLevel}
                  coastalRegion={selectedPort.state}
                  distanceToCoastKm={4.8}
                  onOpenTerminology={() => setIsTerminologyModalOpen(true)}
                  currentLang={currentLang}
                />
                <ForecastHorizonTimeline
                  userLocation={userLocation}
                  baseWeather={weather}
                  currentLang={currentLang}
                />
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-center">
                  <button
                    onClick={() => { setMobileTab('chat'); setIsChatOpen(true); }}
                    className="px-6 py-2.5 rounded-xl text-white text-sm font-bold transition active:scale-[0.97] cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
                  >
                    💬 Open AI Assistant
                  </button>
                </div>
              </div>
            )}

            {/* ═══ Chat Drawer (Desktop: bottom-right floating panel) ═══ */}
            {/* Desktop floating chat */}
            {isChatOpen && (
              <div
                className="absolute bottom-3 right-3 z-30 hidden md:flex flex-col glass-light border border-slate-200/80 rounded-xl overflow-hidden animate-slideUp"
                style={{
                  width: 'var(--chat-drawer-width)',
                  height: 'calc(100% - 24px)',
                  boxShadow: 'var(--shadow-float)',
                }}
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 bg-white/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: 'linear-gradient(135deg, #0B3D5B, #0F766E)' }}>
                      🌊
                    </div>
                    <span className="text-xs font-bold text-slate-800">ORCA AI Assistant</span>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 bg-white/80">
                  <ChatPanel
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    error={error}
                    currentLang={currentLang}
                    onClearError={() => setError(null)}
                  />
                </div>
              </div>
            )}

            {/* Desktop Chat Toggle Pill (when chat is closed) */}
            {!isChatOpen && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.97] cursor-pointer animate-fadeIn"
                style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask ORCA</span>
              </button>
            )}

            {/* ═══ Mobile Chat View ═══ */}
            {mobileTab === 'chat' && (
              <div className="absolute inset-0 z-10 bg-white flex flex-col md:hidden">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  error={error}
                  currentLang={currentLang}
                  onClearError={() => setError(null)}
                />
              </div>
            )}
          </main>

          {/* Desktop Footer */}
          <div className="hidden md:block">
            <Footer currentLang={currentLang} />
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activeTab={mobileTab}
            unreadCount={unreadAlertsCount}
            onTabChange={(tab) => {
              if (tab === 'ecology') {
                setIsEcologyModalOpen(true);
              } else if (tab === 'emergency') {
                setIsEmergencyModalOpen(true);
              } else {
                setMobileTab(tab);
              }
            }}
          />

          {/* ═══ All Modals ═══ */}
          <FishAnalyticsModal isOpen={isEcologyModalOpen} onClose={() => setIsEcologyModalOpen(false)} currentLang={currentLang} />
          <AgentTraceModal isOpen={isReasoningModalOpen} onClose={() => setIsReasoningModalOpen(false)} currentLang={currentLang} />
          <TerminologyExplainerModal isOpen={isTerminologyModalOpen} onClose={() => setIsTerminologyModalOpen(false)} currentLang={currentLang} />
          <NotificationCenterModal isOpen={isNotificationsModalOpen} onClose={() => setIsNotificationsModalOpen(false)} notifications={notifications} unreadCount={unreadAlertsCount} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} currentLang={currentLang} />
          <EmergencySOSModal isOpen={isEmergencyModalOpen} onClose={() => setIsEmergencyModalOpen(false)} userLocation={userLocation} currentLang={currentLang} />
          <GovernmentPortalModal isOpen={isGovPortalOpen} onClose={() => setIsGovPortalOpen(false)} currentUser={currentUser} currentLang={currentLang} />
          <SuperAdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} userLocation={userLocation} currentLang={currentLang} />
        </div>
      )}

      {/* Onboarding Modals */}
      <LanguageSelectorModal isOpen={isLanguageModalOpen} currentLang={currentLang} onSelectLang={(code) => setCurrentLang(code)} onContinue={handleLanguageContinue} />
      <AuthModal isOpen={isAuthModalOpen} onAuthSuccess={handleAuthSuccess} onClose={() => setIsAuthModalOpen(false)} currentLang={currentLang} />
      <LocationPermissionModal isOpen={isLocationModalOpen} onLocationApproved={handleLocationApproved} currentLang={currentLang} />
    </>
  );
}
