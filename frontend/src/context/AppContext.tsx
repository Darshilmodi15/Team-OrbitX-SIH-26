import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  queryORCA,
  fetchMarineConditions,
  fetchOceanAnalytics,
  fetchMarineRisk,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkLocationSafetyAlerts,
  validateLocation,
  loginUser,
  registerUser,
} from '../services/api';
import {
  INDIAN_PORTS,
  MOCK_PFZ_ZONES,
  type Port,
  type WeatherMetrics,
} from '../data/maritimeData';
import type { NotificationItem } from '../components/NotificationCenterModal';
import type { GisLayerState } from '../types';
import { computeCoastDistance, type CoastDistanceResult } from '../utils/geospatial';

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

export interface HighlightedMapTarget {
  lat: number;
  lon: number;
  title: string;
  description?: string;
  type?: 'pfz' | 'hazard' | 'port' | 'user' | 'custom';
  zoom?: number;
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
  recommendations?: any[];
  route?: any;
  alerts?: any[];
  simulation?: any;
  boundary?: any;
  ocean_analytics?: any;
  ecology?: any;
  zone_avoidance?: any;
  tide?: any;
  connectivity_mode?: string;
  highlightTarget?: HighlightedMapTarget;
}

export type SafetyLevel = 'safe' | 'caution' | 'warning' | 'emergency';

export interface UserAccount {
  id: string;
  name: string;
  mobile_number?: string;
  email?: string;
  role: 'FISHERMAN' | 'GOVERNMENT' | 'SUPER_ADMIN';
  token?: string;
}

/* ═══════════════════════════════════════════════════
   Context Interface
   ═══════════════════════════════════════════════════ */

export interface AppContextValue {
  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (val: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;

  // Auth
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  authenticateWithOtp: (phone: string, otp: string, role?: string, name?: string) => Promise<boolean>;
  logoutUser: () => void;

  // Location & Geospatial
  selectedPort: Port;
  setSelectedPort: (port: Port) => void;
  userLocation: LocationCoords;
  setUserLocation: (loc: LocationCoords) => void;
  coastInfo: CoastDistanceResult;
  farFromCoastThresholdKm: number;
  setFarFromCoastThresholdKm: (val: number) => void;
  showFarFromCoastWarning: boolean;
  dismissFarFromCoastWarning: () => void;
  handleUpdateUserLocation: (coords: LocationCoords) => void;
  handleSelectPort: (port: Port) => void;

  // Language
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  handleSelectLang: (lang: string) => void;

  // Weather & Safety
  weather: WeatherMetrics;
  setWeather: (w: WeatherMetrics | ((prev: WeatherMetrics) => WeatherMetrics)) => void;
  riskLevel: SafetyLevel;
  setRiskLevel: (r: SafetyLevel) => void;
  lastUpdated: Date | null;
  dataFreshnessText: string;

  // Map & AI Bi-Directional Interaction
  highlightedMapTarget: HighlightedMapTarget | null;
  setHighlightedMapTarget: (target: HighlightedMapTarget | null) => void;
  focusOnMapLocation: (lat: number, lon: number, title: string, type?: HighlightedMapTarget['type'], zoom?: number) => void;

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

  // GIS Layers
  gisLayers: GisLayerState;
  toggleGisLayer: (key: keyof GisLayerState) => void;

  // Chat
  messages: MessageItem[];
  isLoading: boolean;
  error: string | null;
  handleSendMessage: (question: string) => Promise<void>;
  clearError: () => void;

  // System Date
  currentDate: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

/* ═══════════════════════════════════════════════════
   Provider Implementation
   ═══════════════════════════════════════════════════ */

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Onboarding State ──
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState<boolean>(() => {
    const saved = localStorage.getItem('orca_onboarding_completed');
    return saved === 'true';
  });

  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    const saved = localStorage.getItem('orca_onboarding_completed');
    return saved === 'true' ? 7 : 1;
  });

  const setHasCompletedOnboarding = useCallback((val: boolean) => {
    setHasCompletedOnboardingState(val);
    localStorage.setItem('orca_onboarding_completed', val ? 'true' : 'false');
  }, []);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboardingState(false);
    setOnboardingStep(1);
    localStorage.removeItem('orca_onboarding_completed');
  }, []);

  // ── Auth ──
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => {
    const savedUser = localStorage.getItem('orca_current_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setCurrentUser = useCallback((user: UserAccount | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('orca_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('orca_current_user');
      localStorage.removeItem('orca_auth_token');
    }
  }, []);

  const logoutUser = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const authenticateWithOtp = useCallback(
    async (_phone: string, _otp: string, _role = 'FISHERMAN', _name = 'Vessel Master'): Promise<boolean> => {
      // OTP delivery and verification are intentionally unavailable until a real provider is configured.
      return false;
    }, []
  );

  // ── Language ──
  const [currentLang, setCurrentLangState] = useState<string>(() => {
    const saved = localStorage.getItem('orca-lang');
    return saved || 'en';
  });

  const setCurrentLang = useCallback((lang: string) => {
    setCurrentLangState(lang);
    localStorage.setItem('orca-lang', lang);
  }, []);

  // ── Location & Coast Calculation ──
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]);
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });
  const [hasExplicitLocation, setHasExplicitLocation] = useState(false);

  const [farFromCoastThresholdKm, setFarFromCoastThresholdKm] = useState<number>(100.0);
  const [showFarFromCoastWarning, setShowFarFromCoastWarning] = useState<boolean>(false);

  const [coastInfo, setCoastInfo] = useState<CoastDistanceResult>(() =>
    computeCoastDistance(INDIAN_PORTS[0].lat, INDIAN_PORTS[0].lon, 100.0)
  );

  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // ── Telemetry Freshness & Last Updated ──
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [dataFreshnessText, setDataFreshnessText] = useState<string>('LIVE DATA');

  useEffect(() => {
    const updateFreshness = () => {
      if (!lastUpdated) {
        setDataFreshnessText('LIVE DATA');
        return;
      }
      const deltaMinutes = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      if (deltaMinutes < 1) {
        setDataFreshnessText('LIVE DATA');
      } else if (deltaMinutes === 1) {
        setDataFreshnessText('UPDATED 1 MIN AGO');
      } else if (deltaMinutes < 60) {
        setDataFreshnessText(`UPDATED ${deltaMinutes} MIN AGO`);
      } else {
        const timeStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setDataFreshnessText(`LAST DATA FROM ${timeStr}`);
      }
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // ── Weather & Safety ──
  const [weather, setWeather] = useState<WeatherMetrics>({ forecast: 'Unavailable' });

  const [riskLevel, setRiskLevel] = useState<SafetyLevel>('safe');

  // ── Map & AI Interactive Integration ──
  const [highlightedMapTarget, setHighlightedMapTarget] = useState<HighlightedMapTarget | null>(null);

  const focusOnMapLocation = useCallback(
    (lat: number, lon: number, title: string, type: HighlightedMapTarget['type'] = 'custom', zoom = 10) => {
      setHighlightedMapTarget({ lat, lon, title, type, zoom });
    },
    []
  );

  // ── GIS Layers ──
  const [gisLayers, setGisLayers] = useState<GisLayerState>({
    pfz: true,
    geofence: true,
    route: true,
    sst: false,
    chlorophyll: false,
    waves: false,
    wind: false,
    eez: true,
    ports: true,
    vessels: false,
  });

  const toggleGisLayer = useCallback((key: keyof GisLayerState) => {
    setGisLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── PFZ Intelligence ──
  const [pfzZones, setPfzZones] = useState<PFZEvidenceItem[]>(
    MOCK_PFZ_ZONES.map((z) => ({
      id: z.id,
      name: z.name,
      latitude: z.lat,
      longitude: z.lon,
      distance_km: z.distance_km || 24.5,
      depth_m: z.depth_m,
      species: [z.dominant_species],
      source: 'INCOIS_PFZ_ADVISORY',
    }))
  );

  // ── Notifications ──
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Ocean State Forecast Active',
      message: 'INCOIS wave model reporting favorable sea conditions along the coastal corridor.',
      severity: 'INFO',
      category: 'WEATHER',
      source: 'INCOIS OSF',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_read: false,
    },
  ]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(1);
  const [activeCriticalToast, setActiveCriticalToast] = useState<NotificationItem | null>(null);

  // ── Chat & Messages ──
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-greeting',
      sender: 'assistant',
      text: '🌊 **Welcome to ORCA Marine AI.**\n\nI am your intelligent marine safety and potential fishing zone companion. Ask me anything about current sea conditions, safe routes, or fishing locations in plain language.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Geodesic Coast Recalculation on Location Change ──
  const recalculateGeospatial = useCallback(
    (coords: LocationCoords) => {
      const result = computeCoastDistance(coords.lat, coords.lon, farFromCoastThresholdKm);
      setCoastInfo(result);

      if (result.isFarFromCoast) {
        setShowFarFromCoastWarning(true);
      } else {
        setShowFarFromCoastWarning(false);
      }

      // Re-evaluate nearest port
      let nearestPort = INDIAN_PORTS[0];
      let minDistance = Infinity;
      for (const p of INDIAN_PORTS) {
        const d = Math.hypot(p.lat - coords.lat, p.lon - coords.lon);
        if (d < minDistance) {
          minDistance = d;
          nearestPort = p;
        }
      }
      setSelectedPort(nearestPort);

      // Recompute dynamic PFZ distances to newly selected location
      setPfzZones((prev) =>
        prev.map((z) => {
          const dist = computeCoastDistance(z.latitude, z.longitude);
          const directDist = Math.round(
            Math.hypot(z.latitude - coords.lat, z.longitude - coords.lon) * 111.0 * 10
          ) / 10;
          return {
            ...z,
            distance_km: directDist,
          };
        })
      );
    },
    [farFromCoastThresholdKm]
  );

  const handleUpdateUserLocation = useCallback(
    (coords: LocationCoords) => {
      setUserLocation(coords);
      setHasExplicitLocation(true);
      recalculateGeospatial(coords);
      setLastUpdated(new Date());

      // Async check with backend validate endpoint if available
      validateLocation(coords.lat, coords.lon).catch(() => null);
    },
    [recalculateGeospatial]
  );

  const handleSelectPort = useCallback(
    (port: Port) => {
      setSelectedPort(port);
      const coords = { lat: port.lat, lon: port.lon };
      setUserLocation(coords);
      setHasExplicitLocation(true);
      recalculateGeospatial(coords);
      if (port.defaultWeather) {
        setWeather(port.defaultWeather);
      }
      setLastUpdated(new Date());
    },
    [recalculateGeospatial]
  );

  const dismissFarFromCoastWarning = useCallback(() => {
    setShowFarFromCoastWarning(false);
  }, []);

  // ── Live Telemetry & Alerts Fetcher ──
  useEffect(() => {
    let isMounted = true;

    async function loadTelemetryAndAlerts() {
      if (!hasExplicitLocation) {
        return;
      }

      try {
        const [condData, oceanData, riskData, alertsData] = await Promise.all([
          fetchMarineConditions(userLocation.lat, userLocation.lon, currentDate).catch(() => null),
          fetchOceanAnalytics(userLocation.lat, userLocation.lon).catch(() => null),
          fetchMarineRisk(userLocation.lat, userLocation.lon, currentDate).catch(() => null),
          checkLocationSafetyAlerts(userLocation.lat, userLocation.lon, undefined, undefined, currentUser?.id).catch(
            () => null
          ),
        ]);

        if (isMounted) {
          if (condData) {
            setWeather((prev) => ({
              ...prev,
              ...condData,
              wave_height_m: condData.wave_height_m ?? prev.wave_height_m,
              wind_speed_kmh: condData.wind_speed_kmh ?? prev.wind_speed_kmh,
              wind_direction_deg: condData.wind_direction_deg ?? prev.wind_direction_deg,
              wind_direction_cardinal: condData.wind_direction_cardinal ?? prev.wind_direction_cardinal,
              forecast: condData.forecast ?? prev.forecast,
              temperature_c: condData.temperature_c ?? prev.temperature_c,
              sst_c: condData.sea_surface_temperature_c ?? prev.sst_c,
              swell_period_s: condData.wave_period_s ?? prev.swell_period_s,
              visibility_km: condData.visibility_km ?? prev.visibility_km,
              source: condData.source ?? prev.source,
            }));
            if (oceanData?.mean_chlorophyll_mg_m3 != null) {
              setWeather((prev) => ({
                ...prev,
                chlorophyll_mg_m3: oceanData.mean_chlorophyll_mg_m3,
                chlorophyll_source: oceanData.satellite_source,
              }));
            }
            setLastUpdated(new Date());
          }

          if (riskData?.risk_level) {
            const raw = String(riskData.risk_level).toLowerCase();
            if (raw.includes('emergency') || raw.includes('critical')) setRiskLevel('emergency');
            else if (raw.includes('danger') || raw.includes('unsafe') || raw.includes('warning')) setRiskLevel('warning');
            else if (raw.includes('caution') || raw.includes('moderate')) setRiskLevel('caution');
            else setRiskLevel('safe');
          }

          if (alertsData?.notifications && alertsData.notifications.length > 0) {
            setNotifications(alertsData.notifications);
            setUnreadAlertsCount(alertsData.unread_count || alertsData.notifications.filter((n: any) => !n.is_read).length);
            const criticalAlert = alertsData.notifications.find(
              (n: any) => (n.severity === 'CRITICAL' || n.severity === 'HIGH') && !n.is_read
            );
            if (criticalAlert) setActiveCriticalToast(criticalAlert);
          }
        }
      } catch (err) {
        console.warn('Telemetry refresh background notice:', err);
      }
    }

    loadTelemetryAndAlerts();
    return () => {
      isMounted = false;
    };
  }, [userLocation, currentDate, currentUser, hasExplicitLocation]);

  // ── Notification Handlers ──
  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id).catch(() => null);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadAlertsCount((c) => Math.max(0, c - 1));
      setActiveCriticalToast((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      console.warn('Mark read error:', err);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead(currentUser?.id).catch(() => null);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadAlertsCount(0);
      setActiveCriticalToast(null);
    } catch (err) {
      console.warn('Mark all read error:', err);
    }
  }, [currentUser]);

  const dismissCriticalToast = useCallback(() => {
    setActiveCriticalToast(null);
  }, []);

  // ── Language Handler ──
  const handleSelectLang = useCallback(
    (lang: string) => {
      setCurrentLang(lang);
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const langGreetings: Record<string, string> = {
        gu: 'ભાષા પસંદ કરેલ છે: **ગુજરાતી**. ઓર્કા મરીન AI દરિયાઈ સુરક્ષા અને માછીમારી સહાય માટે તૈયાર છે.',
        hi: 'भाषा चुनी गई: **हिन्दी**। ओर्का मरीन AI समुद्री सुरक्षा और मत्स्य क्षेत्र सहायता के लिए तैयार है।',
        mr: 'भाषा निवडली: **मराठी**. ऑर्का मरीन AI सागरी सुरक्षा आणि मासेमारी सहाय्यासाठी सज्ज आहे.',
        ta: 'மொழி தேர்ந்தெடுக்கப்பட்டது: **தமிழ்**. ஆர்கா மரைன் AI கடல் பாதுகாப்பு மற்றும் மீன்பிடி தகவல் வழங்க தயாராக உள்ளது.',
        ml: 'ഭാഷ തിരഞ്ഞെടുത്തു: **മലയാളം**. ഓർക്ക മറൈൻ AI കടൽ സുരക്ഷാ സേവനങ്ങൾക്ക് സജ്ജമാണ്.',
        te: 'భాష ఎంచుకోబడింది: **తెలుగు**. ఓర్కా మెరైన్ AI సముద్ర భద్రత మరియు మత్స్య సమాచారం అందించడానికి సిద్ధంగా ఉంది.',
        bn: 'ভাষা নির্বাচিত: **বাংলা**। ওর্কা মেরিন AI সামুদ্রিক সুরক্ষা তথ্যের জন্য প্রস্তুত।',
        en: 'Language set to: **English**. ORCA Marine AI is ready for marine safety queries.',
        kn: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ: **ಕನ್ನಡ**. ORCA ಮರೈನ್ AI ಸಮುದ್ರ ಸುರಕ್ಷತಾ ಮಾಹಿತಿಗೆ ಸಿದ್ಧವಾಗಿದೆ.',
        or: 'ଭାଷା ଚୟନ ହୋଇଛି: **ଓଡ଼ିଆ**। ORCA ମରିନ AI ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସୂଚନା ପାଇଁ ପ୍ରସ୍ତୁତ.',
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
    },
    [setCurrentLang]
  );

  // ── Chat / Query Handler with Bi-Directional Map Triggers ──
  const handleSendMessage = useCallback(
    async (questionText: string) => {
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

      // Detect transliterated input: user selected a non-English language
      // but typed in Latin/Roman script (e.g. "Kale bahar nikali shakay?" for Gujarati)
      let processedQuestion = questionText;
      const langNames: Record<string, string> = {
        gu: 'Gujarati', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
        ml: 'Malayalam', bn: 'Bengali', kn: 'Kannada', or: 'Odia', pa: 'Punjabi',
      };

      if (currentLang !== 'en' && langNames[currentLang]) {
        // Check if text is predominantly Latin/ASCII (transliterated)
        const latinChars = questionText.replace(/[\s\d\p{P}\p{S}]/gu, '');
        const isLatinScript = latinChars.length > 0 && /^[a-zA-Z]+$/.test(latinChars);

        if (isLatinScript) {
          // The user typed in Roman script but their language is non-English
          // Add a transliteration context hint for the backend LLM
          processedQuestion = `[User is writing in ${langNames[currentLang]} language using English/Roman alphabet (transliterated). Please understand this as ${langNames[currentLang]} and respond in ${langNames[currentLang]} script.] ${questionText}`;
        }
      }

      try {
        const response = await queryORCA({
          location: userLocation,
          date: currentDate,
          question: processedQuestion,
          language: currentLang,
        });

        // If backend returned PFZs, update and focus map
        let highlightTarget: HighlightedMapTarget | undefined;
        if (response.nearest_pfz && response.nearest_pfz.length > 0) {
          setPfzZones(response.nearest_pfz);
          const topPfz = response.nearest_pfz[0];
          highlightTarget = {
            lat: topPfz.latitude,
            lon: topPfz.longitude,
            title: topPfz.name,
            description: `Dominant Species: ${topPfz.species?.join(', ') || 'Pelagic'} • Depth: ${topPfz.depth_m || 45}m`,
            type: 'pfz',
            zoom: 10,
          };
          setHighlightedMapTarget(highlightTarget);
        }

        // If backend updated weather
        if (response.weather) {
          setWeather((prev) => ({
            ...prev,
            wave_height_m: response.weather.wave_height_m ?? prev.wave_height_m,
            wind_speed_kmh: response.weather.wind_speed_kmh ?? prev.wind_speed_kmh,
            wind_direction_deg: response.weather.wind_direction_deg || prev.wind_direction_deg,
            wind_direction_cardinal: response.weather.wind_direction_cardinal || prev.wind_direction_cardinal,
            forecast: response.weather.forecast || prev.forecast,
            temperature_c: response.weather.temperature_c || prev.temperature_c,
            sst_c: response.weather.sea_surface_temperature_c || prev.sst_c,
            swell_period_s: response.weather.wave_period_s || prev.swell_period_s,
            visibility_km: response.weather.visibility_km || prev.visibility_km,
            source: response.weather.source || 'INCOIS_OSF_LIVE',
          }));
          setLastUpdated(new Date());
        }

        // If backend returned risk level
        if (response.risk_level) {
          const raw = String(response.risk_level).toLowerCase();
          if (raw.includes('emergency') || raw.includes('critical')) setRiskLevel('emergency');
          else if (raw.includes('danger') || raw.includes('unsafe') || raw.includes('warning')) setRiskLevel('warning');
          else if (raw.includes('caution') || raw.includes('moderate')) setRiskLevel('caution');
          else setRiskLevel('safe');
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
          recommendations: response.recommendations,
          route: response.route,
          alerts: response.alerts,
          simulation: response.simulation,
          boundary: response.boundary,
          ocean_analytics: response.ocean_analytics,
          ecology: response.ecology,
          zone_avoidance: response.zone_avoidance,
          tide: response.tide,
          connectivity_mode: response.connectivity_mode || 'LIVE',
          highlightTarget,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to connect to ORCA intelligence backend.';
        setError(errMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ **Connection Note**: ${errMsg}\n\nPlease verify backend connectivity. Real-time telemetry is running on local cached models.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, userLocation, currentDate, currentLang]
  );

  const clearError = useCallback(() => setError(null), []);

  const value: AppContextValue = {
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    onboardingStep,
    setOnboardingStep,
    resetOnboarding,
    currentUser,
    setCurrentUser,
    authenticateWithOtp,
    logoutUser,
    selectedPort,
    setSelectedPort,
    userLocation,
    setUserLocation,
    coastInfo,
    farFromCoastThresholdKm,
    setFarFromCoastThresholdKm,
    showFarFromCoastWarning,
    dismissFarFromCoastWarning,
    handleUpdateUserLocation,
    handleSelectPort,
    currentLang,
    setCurrentLang,
    handleSelectLang,
    weather,
    setWeather,
    riskLevel,
    setRiskLevel,
    lastUpdated,
    dataFreshnessText,
    highlightedMapTarget,
    setHighlightedMapTarget,
    focusOnMapLocation,
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
    currentDate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
