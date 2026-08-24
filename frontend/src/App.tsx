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
import { ControlBar } from './components/ControlBar';
import { GisLayersPanel, type GisLayerState } from './components/GisLayersPanel';
import MarineMap from './components/MarineMap';
import ChatPanel from './components/ChatPanel';
import { FishAnalyticsModal } from './components/FishAnalyticsModal';
import { AgentTraceModal } from './components/AgentTraceModal';
import { Footer } from './components/Footer';
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
  // App Navigation Flow Stage
  const [appStage, setAppStage] = useState<'landing' | 'dashboard'>('landing');
  const [mobileTab, setMobileTab] = useState<MobileTab>('status');

  // Modals for Onboarding, Notifications & Reference
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isTerminologyModalOpen, setIsTerminologyModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isGovPortalOpen, setIsGovPortalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Operational Location & Telemetry
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]); // Mumbai Sassoon Dock
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });

  const [currentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [currentLang, setCurrentLang] = useState<string>('en');

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [activeCriticalToast, setActiveCriticalToast] = useState<NotificationItem | null>(null);

  // Baseline / Live Telemetry Weather & Safety
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

  // GIS Layer Switches State
  const [gisLayers, setGisLayers] = useState<GisLayerState>({
    pfz: true,
    geofence: true,
    route: true,
    sst: true,
    chlorophyll: true,
    waves: true,
    wind: true,
  });

  // Modal visibility states
  const [isEcologyModalOpen, setIsEcologyModalOpen] = useState(false);
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);

  // Active PFZ Zones on Map
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

  // Initial welcome greeting
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-greeting',
      sender: 'assistant',
      text: '🌊 **Welcome to ORCA Marine AI Coastal Safety Console.**\n\nI provide real-time maritime intelligence, navigational safety assessments, and INCOIS-derived Potential Fishing Zone (PFZ) advisories.\n\nUse voice input or ask about sea conditions, wind & wave risks, or boundary geofences in Gujarati (ગુજરાતી), Hindi (हिन्दी), Marathi (मराठी), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), or English.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize Live Telemetry & Check Location Safety Alerts
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

            // Pop up critical toast if critical alert exists
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
    return () => {
      isMounted = false;
    };
  }, [userLocation, currentDate, currentUser]);

  // Handle Notifications
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadAlertsCount((c) => Math.max(0, c - 1));
      if (activeCriticalToast?.id === id) {
        setActiveCriticalToast(null);
      }
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

  // Onboarding Handlers
  const handleStartOnboarding = () => {
    setIsLanguageModalOpen(true);
  };

  const handleLanguageContinue = () => {
    setIsLanguageModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (userProfile: any) => {
    setCurrentUser(userProfile);
    if (userProfile.preferred_language) {
      setCurrentLang(userProfile.preferred_language);
    }
    setIsAuthModalOpen(false);
    setIsLocationModalOpen(true);
  };

  const handleLocationApproved = (loc: LocationCoords) => {
    setUserLocation(loc);
    setIsLocationModalOpen(false);
    setAppStage('dashboard');
  };

  const handleDirectDemo = () => {
    setAppStage('dashboard');
  };

  // Handle Global Language Switching
  const handleSelectLang = (lang: string) => {
    setCurrentLang(lang);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const langGreetings: Record<string, string> = {
      gu: '🌐 **ભાષા બદલાઈ ગઈ છે**: ગુજરાતી (Gujarati). ઓર્કા મરીન એઆઇ હવે તમને ગુજરાતીમાં દરિયાઈ હવામાન, મોજાં, સુરક્ષા અને માછીમારી વિસ્તાર (PFZ) ની માહિતી આપશે.',
      hi: '🌐 **भाषा बदल दी गई है**: हिन्दी (Hindi). ओर्का मरीन एआई अब आपको हिन्दी में समुद्री मौसम, लहरों की स्थिति, सुरक्षा और मत्स्य क्षेत्रों (PFZ) की जानकारी प्रदान करेगा।',
      mr: '🌐 **भाषा बदलली आहे**: मराठी (Marathi). ऑर्का मरीन एआय आता तुम्हाला मराठीत सागरी हवामान, लाटांची स्थिती आणि मासेमारी क्षेत्राची माहिती देईल.',
      ta: '🌐 **மொழி மாற்றப்பட்டது**: தமிழ் (Tamil). ஆர்கா மரைன் ஏஐ இப்போது கடல் வானிலை, அலை உயரம் மற்றும் மீன்பிடி மண்டல தகவல்களை தமிழில் வழங்கும்.',
      ml: '🌐 **ഭാഷ മാറ്റി**: മലയാളം (Malayalam). ഓർക്ക മറൈൻ എഐ ഇനി കടൽ കാലാവസ്ഥയും സുരക്ഷാ മുന്നറിയിപ്പുകളും മലയാളത്തിൽ ലഭ്യമാക്കും.',
      te: '🌐 **భాష మార్చబడింది**: తెలుగు (Telugu). ఓర్కా మెరైన్ ఏఐ ఇప్పుడు సముద్ర వాతావరణం మరియు చేపల వేట మండల సమాచారాన్ని తెలుగులో అందిస్తుంది.',
      bn: '🌐 **ভাষা পরিবর্তিত হয়েছে**: বাংলা (Bengali). ওর্কা মেরিন এআই এখন বাংলায় সামুদ্রিক আবহাওয়া ও নিরাপত্তা তথ্য প্রদান করবে।',
      en: '🌐 **Language switched**: English. ORCA Marine AI will now provide marine weather, wave safety, and fishing zone intelligence in English.',
    };

    setMessages((prev) => [
      ...prev,
      {
        id: `lang-change-${Date.now()}`,
        sender: 'assistant',
        text: langGreetings[lang] || langGreetings.en,
        timestamp: timeNow,
      },
    ]);
  };

  // Handle User Selecting a Standard Coastal Port
  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    setUserLocation({ lat: port.lat, lon: port.lon });

    if (port.defaultWeather) {
      setWeather(port.defaultWeather);
    }

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `port-change-${Date.now()}`,
        sender: 'assistant',
        text: `⚓ **Vessel Port Changed**: Location updated to **${port.name} (${port.state})** at \`${port.lat.toFixed(4)}°N, ${port.lon.toFixed(4)}°E\`.\n\nLive marine radar and INCOIS telemetry re-centered for this coastal sector.`,
        timestamp: timeNow,
      },
    ]);
  };

  // Main Handler for Chat/Query Submission
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

      if (response.risk_level) {
        setRiskLevel(response.risk_level as any);
      }

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
      console.error('Error querying ORCA backend:', err);
      const errMsg = err?.message || 'Failed to connect to ORCA backend. Please ensure the backend is running.';
      setError(errMsg);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Connection Error**: ${errMsg}\n\nPlease check that the ORCA backend server is active at \`http://localhost:8000\`.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Onboarding & Navigation Flow */}
      {appStage === 'landing' ? (
        <LandingPage
          onGetStarted={handleStartOnboarding}
          onExploreDemo={handleDirectDemo}
          onSelectLanguage={() => setIsLanguageModalOpen(true)}
          currentLang={currentLang}
        />
      ) : (
        /* Mobile-First Operational Safety & Marine Intelligence Dashboard */
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
          {/* Top Bar with Branding, Health Status & Persona Badge */}
          <TopHeader
            vesselLat={userLocation.lat}
            vesselLon={userLocation.lon}
            weather={weather}
            riskLevel={riskLevel}
            currentLang={currentLang}
            currentUser={currentUser}
            unreadAlertsCount={unreadAlertsCount}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
            onReturnHome={() => setAppStage('landing')}
          />

          {/* Control Bar: Location, Language, Modals */}
          <ControlBar
            selectedPort={selectedPort}
            onSelectPort={handleSelectPort}
            currentLang={currentLang}
            onSelectLang={handleSelectLang}
            onOpenReasoning={() => setIsReasoningModalOpen(true)}
            onOpenEcology={() => setIsEcologyModalOpen(true)}
            onOpenGovPortal={() => setIsGovPortalOpen(true)}
          />

          {/* GIS Layer Toggles */}
          <GisLayersPanel
            layers={gisLayers}
            onToggleLayer={(k) => setGisLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
            currentLang={currentLang}
          />

          {/* Floating Critical Toast Alert */}
          {activeCriticalToast && (
            <div className="z-30 px-4 py-2 bg-rose-950/90 border-b border-rose-500/50 flex items-center justify-between text-xs text-rose-200 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                <span><strong>{activeCriticalToast.title}:</strong> {activeCriticalToast.message}</span>
              </div>
              <button
                onClick={() => handleMarkRead(activeCriticalToast.id)}
                className="ml-3 px-2 py-0.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-mono text-[10px] shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Body: Responsive Desktop Grid & Mobile Tab Switching */}
          <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0 bg-slate-950 pb-14 md:pb-0">
            {/* Desktop Left (60%): Tactical Map */}
            <div className={`w-full md:w-[60%] lg:w-[63%] xl:w-[65%] h-full relative flex-col min-h-0 ${
              mobileTab === 'map' ? 'flex' : 'hidden md:flex'
            }`}>
              <MarineMap
                userLocation={userLocation}
                pfzZones={gisLayers.pfz ? pfzZones : []}
                layers={gisLayers}
              />
            </div>

            {/* Desktop Right (40%) / Mobile Status & Chat */}
            <div className={`w-full md:w-[40%] lg:w-[37%] xl:w-[35%] h-full flex flex-col min-h-0 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-xl z-10 overflow-y-auto ${
              mobileTab === 'map' ? 'hidden md:flex' : 'flex'
            }`}>
              {/* Mobile Tab Conditionals */}
              {mobileTab === 'status' && (
                <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto">
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

                  {/* Ask ORCA Quick Prompt Section on Mobile */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
                    <div className="font-bold text-slate-200 mb-2 flex items-center justify-between">
                      <span>💬 Ask ORCA Safety AI</span>
                      <button
                        onClick={() => setMobileTab('chat')}
                        className="text-teal-400 font-mono text-[11px] hover:underline cursor-pointer"
                      >
                        Open Full Chat →
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Ask questions in Gujarati, Hindi, Marathi, Tamil, Telugu, Malayalam, or English.
                    </p>
                    <button
                      onClick={() => setMobileTab('chat')}
                      className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer text-center"
                    >
                      Open AI Maritime Assistant
                    </button>
                  </div>
                </div>
              )}

              {/* Chat View */}
              {(mobileTab === 'chat' || window.innerWidth >= 768) && mobileTab !== 'status' && (
                <div className="flex-1 flex flex-col min-h-0 bg-white">
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

              {/* Desktop Dual Mode (Always Show Chat on Desktop) */}
              <div className="hidden md:flex flex-1 flex-col min-h-0 bg-white">
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
          </main>

          {/* Desktop Status Footer */}
          <div className="hidden md:block">
            <Footer currentLang={currentLang} />
          </div>

          {/* Mobile Bottom Navigation Bar */}
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

          {/* Modals */}
          <FishAnalyticsModal
            isOpen={isEcologyModalOpen}
            onClose={() => setIsEcologyModalOpen(false)}
            currentLang={currentLang}
          />

          <AgentTraceModal
            isOpen={isReasoningModalOpen}
            onClose={() => setIsReasoningModalOpen(false)}
            currentLang={currentLang}
          />

          <TerminologyExplainerModal
            isOpen={isTerminologyModalOpen}
            onClose={() => setIsTerminologyModalOpen(false)}
            currentLang={currentLang}
          />

          <NotificationCenterModal
            isOpen={isNotificationsModalOpen}
            onClose={() => setIsNotificationsModalOpen(false)}
            notifications={notifications}
            unreadCount={unreadAlertsCount}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            currentLang={currentLang}
          />

          <EmergencySOSModal
            isOpen={isEmergencyModalOpen}
            onClose={() => setIsEmergencyModalOpen(false)}
            userLocation={userLocation}
            currentLang={currentLang}
          />

          <GovernmentPortalModal
            isOpen={isGovPortalOpen}
            onClose={() => setIsGovPortalOpen(false)}
            currentUser={currentUser}
            currentLang={currentLang}
          />

          <SuperAdminModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            userLocation={userLocation}
            currentLang={currentLang}
          />
        </div>
      )}

      {/* Onboarding Modals */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        currentLang={currentLang}
        onSelectLang={(code) => setCurrentLang(code)}
        onContinue={handleLanguageContinue}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onAuthSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
        currentLang={currentLang}
      />

      <LocationPermissionModal
        isOpen={isLocationModalOpen}
        onLocationApproved={handleLocationApproved}
        currentLang={currentLang}
      />
    </>
  );
}
