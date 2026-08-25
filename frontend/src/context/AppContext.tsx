import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  queryORCA,
  fetchMarineConditions,
  fetchMarineRisk,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkLocationSafetyAlerts,
} from '../services/api';
import {
  INDIAN_PORTS,
  MOCK_PFZ_ZONES,
  type Port,
  type WeatherMetrics,
} from '../data/maritimeData';
import type { NotificationItem } from '../components/NotificationCenterModal';
import type { GisLayerState } from '../types';

export type { WeatherMetrics, GisLayerState };

/* ═══════════════════════════════════════════════════
   Type Definitions
   ═══════════════════════════════════════════════════ */

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

export type SafetyLevel = 'safe' | 'caution' | 'unsafe';

/* ═══════════════════════════════════════════════════
   Context Interface
   ═══════════════════════════════════════════════════ */

export interface AppContextValue {
  // Auth
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;

  // Location
  selectedPort: Port;
  setSelectedPort: (port: Port) => void;
  userLocation: LocationCoords;
  setUserLocation: (loc: LocationCoords) => void;

  // Language
  currentLang: string;
  setCurrentLang: (lang: string) => void;

  // Weather & Safety
  weather: WeatherMetrics;
  setWeather: (w: WeatherMetrics) => void;
  riskLevel: SafetyLevel;
  setRiskLevel: (r: SafetyLevel) => void;

  // Notifications
  notifications: NotificationItem[];
  unreadAlertsCount: number;
  activeCriticalToast: NotificationItem | null;
  handleMarkRead: (id: string) => void;
  handleMarkAllRead: () => void;
  dismissCriticalToast: () => void;

  // PFZ
  pfzZones: PFZEvidenceItem[];
  setPfzZones: (zones: PFZEvidenceItem[]) => void;

  // GIS
  gisLayers: GisLayerState;
  toggleGisLayer: (key: keyof GisLayerState) => void;

  // Chat
  messages: MessageItem[];
  isLoading: boolean;
  error: string | null;
  handleSendMessage: (question: string) => Promise<void>;
  clearError: () => void;

  // Port/Language handlers
  handleSelectPort: (port: Port) => void;
  handleSelectLang: (lang: string) => void;
  handleUpdateUserLocation: (coords: LocationCoords) => void;

  // Date
  currentDate: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

/* ═══════════════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════════════ */

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Location
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]);
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });

  // Language — initialize from localStorage
  const [currentLang, setCurrentLangState] = useState<string>(() => {
    const saved = localStorage.getItem('orca-lang');
    return saved || 'en';
  });

  const setCurrentLang = useCallback((lang: string) => {
    setCurrentLangState(lang);
    localStorage.setItem('orca-lang', lang);
  }, []);

  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
  const [riskLevel, setRiskLevel] = useState<SafetyLevel>('safe');

  // GIS
  const [gisLayers, setGisLayers] = useState<GisLayerState>({
    pfz: true,
    geofence: true,
    route: true,
    sst: true,
    chlorophyll: true,
    waves: true,
    wind: true,
    eez: true,
    ports: true,
    vessels: true,
  });

  const toggleGisLayer = useCallback((key: keyof GisLayerState) => {
    setGisLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // PFZ
  const [pfzZones, setPfzZones] = useState<PFZEvidenceItem[]>(
    MOCK_PFZ_ZONES.map(z => ({
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
      text: '**Welcome to ORCA Marine AI.**\n\nI provide real-time maritime intelligence, safety assessments, and Potential Fishing Zone (PFZ) advisories.\n\nAsk me about sea conditions, wave safety, fishing zones, or coastal navigation in any supported Indian language.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
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
            setWeather(prev => ({
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
          if (riskData?.risk_level) {
            setRiskLevel(riskData.risk_level as SafetyLevel);
          }
          if (alertsData?.notifications) {
            setNotifications(alertsData.notifications);
            setUnreadAlertsCount(alertsData.unread_count || 0);
            const criticalAlert = alertsData.notifications.find(
              (n: any) => (n.severity === 'CRITICAL' || n.severity === 'HIGH') && !n.is_read
            );
            if (criticalAlert) setActiveCriticalToast(criticalAlert);
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
  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadAlertsCount(c => Math.max(0, c - 1));
      setActiveCriticalToast(prev => (prev?.id === id ? null : prev));
    } catch (err) {
      console.warn('Mark read error:', err);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead(currentUser?.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadAlertsCount(0);
      setActiveCriticalToast(null);
    } catch (err) {
      console.warn('Mark all read error:', err);
    }
  }, [currentUser]);

  const dismissCriticalToast = useCallback(() => {
    setActiveCriticalToast(null);
  }, []);

  // ═══ Port & Language Handlers ═══
  const handleSelectPort = useCallback((port: Port) => {
    setSelectedPort(port);
    setUserLocation({ lat: port.lat, lon: port.lon });
    if (port.defaultWeather) setWeather(port.defaultWeather);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      {
        id: `port-change-${Date.now()}`,
        sender: 'assistant',
        text: `**Location updated** to **${port.name}** (${port.state}) at \`${port.lat.toFixed(4)}°N, ${port.lon.toFixed(4)}°E\`.\n\nMarine telemetry re-centered for this coastal sector.`,
        timestamp: timeNow,
      },
    ]);
  }, []);

  const handleUpdateUserLocation = useCallback((coordsOrLat: LocationCoords | number, maybeLon?: number) => {
    let coords: LocationCoords;
    if (typeof coordsOrLat === 'number' && typeof maybeLon === 'number') {
      coords = { lat: coordsOrLat, lon: maybeLon };
    } else if (typeof coordsOrLat === 'object' && coordsOrLat !== null) {
      coords = coordsOrLat;
    } else {
      return;
    }
    setUserLocation(coords);
    // Find nearest port
    let nearestPort = INDIAN_PORTS[0];
    let minDist = Infinity;
    for (const p of INDIAN_PORTS) {
      const d = Math.hypot(p.lat - coords.lat, p.lon - coords.lon);
      if (d < minDist) {
        minDist = d;
        nearestPort = p;
      }
    }
    setSelectedPort(nearestPort);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      {
        id: `loc-update-${Date.now()}`,
        sender: 'assistant',
        text: `**Coordinates updated** to \`${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E\` near **${nearestPort.name}**.\n\nOceanographic telemetry and boundary geofences refreshed.`,
        timestamp: timeNow,
      },
    ]);
  }, []);

  const handleSelectLang = useCallback((lang: string) => {
    setCurrentLang(lang);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const langGreetings: Record<string, string> = {
      gu: '**ભાષા બદલાઈ ગઈ છે**: ગુજરાતી. ઓર્કા મરીન AI હવે તમને ગુજરાતીમાં માહિતી આપશે.',
      hi: '**भाषा बदल दी गई है**: हिन्दी. ओर्का मरीन AI अब हिन्दी में जानकारी प्रदान करेगा।',
      mr: '**भाषा बदलली आहे**: मराठी. ऑर्का मरीन AI आता मराठीत माहिती देईल.',
      ta: '**மொழி மாற்றப்பட்டது**: தமிழ். ஆர்கா மரைன் AI தமிழில் தகவல்களை வழங்கும்.',
      ml: '**ഭാഷ മാറ്റി**: മലയാളം. ഓർക്ക മറൈൻ AI മലയാളത്തിൽ ലഭ്യമാക്കും.',
      te: '**భాష మార్చబడింది**: తెలుగు. ఓర్కా మెరైన్ AI తెలుగులో సమాచారం అందిస్తుంది.',
      bn: '**ভাষা পরিবর্তিত হয়েছে**: বাংলা. ওর্কা মেরিন AI বাংলায় তথ্য প্রদান করবে।',
      en: '**Language switched**: English. ORCA Marine AI will now respond in English.',
      kn: '**ಭಾಷೆ ಬದಲಾಗಿದೆ**: ಕನ್ನಡ. ORCA ಮರೈನ್ AI ಕನ್ನಡದಲ್ಲಿ ಮಾಹಿತಿ ನೀಡುತ್ತದೆ.',
      or: '**ଭାଷା ପରିବର୍ତ୍ତିତ ହୋଇଛି**: ଓଡ଼ିଆ. ORCA ମରିନ AI ଓଡ଼ିଆରେ ତଥ୍ୟ ପ୍ରଦାନ କରିବ.',
      pa: '**ਭਾਸ਼ਾ ਬਦਲੀ ਗਈ ਹੈ**: ਪੰਜਾਬੀ. ORCA ਮਰੀਨ AI ਪੰਜਾਬੀ ਵਿੱਚ ਜਾਣਕਾਰੀ ਪ੍ਰਦਾਨ ਕਰੇਗਾ.',
    };
    setMessages(prev => [
      ...prev,
      {
        id: `lang-change-${Date.now()}`,
        sender: 'assistant',
        text: langGreetings[lang] || langGreetings.en,
        timestamp: timeNow,
      },
    ]);
  }, [setCurrentLang]);

  // ═══ Chat/Query Handler ═══
  const handleSendMessage = useCallback(async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: questionText,
      timestamp: timeNow,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await queryORCA({
        location: userLocation,
        date: currentDate,
        question: questionText,
        language: currentLang,
      });

      if (response.nearest_pfz?.length) {
        setPfzZones(response.nearest_pfz);
      }
      if (response.weather) {
        setWeather(prev => ({
          ...prev,
          wave_height_m: response.weather.wave_height_m || prev.wave_height_m,
          wind_speed_kmh: response.weather.wind_speed_kmh || prev.wind_speed_kmh,
          wind_direction_deg: response.weather.wind_direction_deg || prev.wind_direction_deg,
          wind_direction_cardinal: response.weather.wind_direction_cardinal || prev.wind_direction_cardinal,
          forecast: response.weather.forecast || prev.forecast,
          temperature_c: response.weather.temperature_c || prev.temperature_c,
          sst_c: response.weather.sea_surface_temperature_c || prev.sst_c,
          swell_period_s: response.weather.wave_period_s || prev.swell_period_s,
          visibility_km: response.weather.visibility_km || prev.visibility_km,
          source: response.weather.source || 'INCOIS_OSF_LIVE',
        }));
      }
      if (response.risk_level) setRiskLevel(response.risk_level as SafetyLevel);

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
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to connect to ORCA backend.';
      setError(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `**Connection Error**: ${errMsg}\n\nPlease check that the backend is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userLocation, currentDate, currentLang]);

  const clearError = useCallback(() => setError(null), []);

  const value: AppContextValue = {
    currentUser,
    setCurrentUser,
    selectedPort,
    setSelectedPort,
    userLocation,
    setUserLocation,
    currentLang,
    setCurrentLang,
    weather,
    setWeather,
    riskLevel,
    setRiskLevel,
    notifications,
    unreadAlertsCount,
    activeCriticalToast,
    handleMarkRead,
    handleMarkAllRead,
    dismissCriticalToast,
    pfzZones,
    setPfzZones,
    gisLayers,
    toggleGisLayer,
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearError,
    handleSelectPort,
    handleUpdateUserLocation,
    handleSelectLang,
    currentDate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
