import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { INDIAN_PORTS, MOCK_PFZ_ZONES, type Port, type WeatherMetrics } from '../data/maritimeData';
import { queryORCA } from '../services/api';

import type { LocationCoords, PFZEvidenceItem, MessageItem, GisLayerState } from '../types';
export type { LocationCoords, PFZEvidenceItem, MessageItem, GisLayerState };

interface GlobalContextProps {
  selectedPort: Port;
  setSelectedPort: (port: Port) => void;
  userLocation: LocationCoords;
  setUserLocation: (coords: LocationCoords) => void;
  currentDate: string;
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  weather: WeatherMetrics;
  setWeather: (weather: WeatherMetrics | ((prev: WeatherMetrics) => WeatherMetrics)) => void;
  riskLevel: 'safe' | 'caution' | 'unsafe';
  setRiskLevel: (level: 'safe' | 'caution' | 'unsafe') => void;
  gisLayers: GisLayerState;
  setGisLayers: (layers: GisLayerState | ((prev: GisLayerState) => GisLayerState)) => void;
  pfzZones: PFZEvidenceItem[];
  setPfzZones: (zones: PFZEvidenceItem[]) => void;
  messages: MessageItem[];
  setMessages: (messages: MessageItem[] | ((prev: MessageItem[]) => MessageItem[])) => void;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  handleSelectLang: (lang: string) => void;
  handleSelectPort: (port: Port) => void;
  handleRelocateVessel: (coords: LocationCoords) => void;
  handleToggleLayer: (layerKey: keyof GisLayerState) => void;
  handleSendMessage: (question: string) => Promise<void>;
  resetChat: () => void;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]);
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });

  const [currentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentLang, setCurrentLang] = useState<string>('en');

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

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-greeting',
      sender: 'assistant',
      text: '🌊 **Welcome aboard ORCA Marine AI Autonomous Operations Console.**\n\nI provide real-time maritime intelligence, navigational safety assessments, and INCOIS-derived Potential Fishing Zone (PFZ) advisories.\n\nUse the quick actions below or ask about sea conditions, wind & wave risks, or optimal fishing locations in English, Gujarati (ગુજરાતી), Hindi (हिन्दी), Marathi (मराठी), Tamil (தமிழ்), Telugu (తెలుగు), or Malayalam (മലയാളം).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectLang = (lang: string) => {
    setCurrentLang(lang);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const langGreetings: Record<string, string> = {
      gu: '🌐 **ભાષા બદલાઈ ગઈ છે**: ગુજરાતી (Gujarati). ઓર્કા મરીન એઆઇ હવે તમને ગુજરાતીમાં દરિયાઈ હવામાન, મોજાં, સુરક્ષા અને માછીમારી વિસ્તાર (PFZ) ની માહિતી આપશે.',
      hi: '🌐 **भाषा परिवर्तित**: हिन्दी (Hindi). ऑर्का समुद्री एआई अब आपको हिन्दी में समुद्री मौसम, लहरों, सुरक्षा और मत्स्य क्षेत्र (PFZ) की जानकारी प्रदान करेगा।',
      mr: '🌐 **भाषा बदलली**: मराठी (Marathi). ऑर्का सागरी एઆઇ आता तुम्हाला मराठीमध्ये सागरी हवामान, लाटा, सुरक्षा आणि मासेमारी क्षेत्राची माहिती देईल.',
      ta: '🌐 **மொழி மாற்றப்பட்டது**: தமிழ் (Tamil). ஆர்கா கடல்சார் AI இப்போது உங்களுக்கு தமிழில் கடல் வானிலை, அலைகள் மற்றும் மீன்பிடி மண்டல தகவல்களை வழங்கும்.',
      te: '🌐 **భాష మార్చబడింది**: తెలుగు (Telugu). ఓర్కా మెరైన్ AI ఇప్పుడు మీకు తెలుగులో సముద్ర వాతావరణం, అలలు మరియు చేపల వేట ప్రాంతాల సమాచారం అందిస్తుంది.',
      ml: '🌐 **ഭാഷ മാറ്റി**: മലയാളം (Malayalam). ഓർക്ക മറൈൻ AI ഇപ്പോൾ നിങ്ങൾക്ക് മലയാളത്തിൽ സമുദ്ര കാലാവസ്ഥ, തിരമാലകൾ, സുരക്ഷ വിവരങ്ങൾ നൽകും.',
      bn: '🌐 **ভাষা পরিবর্তিত**: বাংলা (Bengali). অরকা সামুদ্রিক এআই আপনাকে বাংলায় আবহাওয়া এবং মাছ ধরার অঞ্চলের তথ্য দেবে।',
      kn: '🌐 **ಭಾಷೆ ಬದಲಾಯಿಸಲಾಗಿದೆ**: ಕನ್ನಡ (Kannada). ಆರ್ಕಾ ಸಾಗರ AI ಕನ್ನಡದಲ್ಲಿ ಹವಾಮಾನ ಮತ್ತು ಮೀನುಗಾರಿಕೆ ವಲಯದ ಮಾಹಿತಿ ನೀಡುತ್ತದೆ.',
      or: '🌐 **ଭାଷା ପରିବର୍ତ୍ତିତ**: ଓଡ଼ିଆ (Odia). ଓର୍କା ସାମୁଦ୍ରିକ AI ଓଡ଼ିଆରେ ପାଣିପାଗ ଏବଂ ମାଛ ଧରିବା କ୍ଷେତ୍ରର ସୂଚନା ପ୍ରଦାନ କରିବ।',
      pa: '🌐 **ਭਾਸ਼ਾ ਬਦਲ ਗਈ ਹੈ**: ਪੰਜਾਬੀ (Punjabi). ਓਰਕਾ ਸਮੁੰਦਰੀ ਏਆਈ ਪੰਜਾਬੀ ਵਿੱਚ ਜਾਣਕਾਰੀ ਦੇਵੇਗਾ।',
      en: '🌐 **Language Switched**: English. ORCA Marine AI is ready for operational maritime intelligence queries.',
    };

    const text = langGreetings[lang] || `🌐 **Language Switched**: ${lang.toUpperCase()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: `lang-${Date.now()}`,
        sender: 'assistant',
        text,
        timestamp: timeNow,
      },
    ]);
  };

  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    setUserLocation({ lat: port.lat, lon: port.lon });

    if (port.defaultWeather) {
      setWeather(port.defaultWeather);
      const waveHeight = port.defaultWeather.wave_height_m;
      const windSpeed = port.defaultWeather.wind_speed_kmh;
      const isUnsafe = (waveHeight != null && waveHeight > 2.5) || (windSpeed != null && windSpeed > 50);
      const isCaution = !isUnsafe && ((waveHeight != null && waveHeight > 1.5) || (windSpeed != null && windSpeed > 35));
      setRiskLevel(isUnsafe ? 'unsafe' : isCaution ? 'caution' : 'safe');
    }

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `port-${Date.now()}`,
        sender: 'assistant',
        text: `⚓ **Vessel Station Set to ${port.name} (${port.state})**\nCoordinates: \`${port.lat.toFixed(4)}°N, ${port.lon.toFixed(4)}°E\`\nTactical GIS radar and PFZ proximity algorithms synchronized for this sector.`,
        timestamp: timeNow,
      },
    ]);
  };

  const handleRelocateVessel = (coords: LocationCoords) => {
    setUserLocation(coords);
  };

  const handleToggleLayer = (layerKey: keyof GisLayerState) => {
    setGisLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const handleSendMessage = async (question: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: timeNow,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    const qLower = question.toLowerCase();
    if (qLower.includes('pfz') || qLower.includes('fish') || qLower.includes('ઝોન') || qLower.includes('मत्स्य')) {
      setGisLayers((prev) => ({ ...prev, pfz: true }));
    }
    if (qLower.includes('route') || qLower.includes('मार्ग') || qLower.includes('માર્ગ')) {
      setGisLayers((prev) => ({ ...prev, route: true }));
    }
    if (qLower.includes('imbl') || qLower.includes('border') || qLower.includes('સરહદ') || qLower.includes('सीमा')) {
      setGisLayers((prev) => ({ ...prev, geofence: true }));
    }

    try {
      let processedQuestion = question;
      const langNames: Record<string, string> = {
        gu: 'Gujarati', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
        ml: 'Malayalam', bn: 'Bengali', kn: 'Kannada', or: 'Odia', pa: 'Punjabi',
      };

      if (currentLang !== 'en' && langNames[currentLang]) {
        const latinChars = question.replace(/[\s\d\p{P}\p{S}]/gu, '');
        const isLatinScript = latinChars.length > 0 && /^[a-zA-Z]+$/.test(latinChars);
        if (isLatinScript) {
          processedQuestion = `[User is writing in ${langNames[currentLang]} language using English/Roman alphabet (transliterated). Please understand this as ${langNames[currentLang]} and respond in ${langNames[currentLang]} script.] ${question}`;
        }
      }

      const payload: any = {
        location: {
          lat: userLocation.lat,
          lon: userLocation.lon,
        },
        date: currentDate,
        question: processedQuestion,
        language: currentLang,
      };

      const response = (await queryORCA(payload)) as any;

      if (response.nearest_pfz && Array.isArray(response.nearest_pfz) && response.nearest_pfz.length > 0) {
        setPfzZones(response.nearest_pfz);
      }

      if (response.weather) {
        setWeather((prev) => ({
          ...prev,
          wave_height_m: response.weather.wave_height_m ?? prev.wave_height_m,
          wind_speed_kmh: response.weather.wind_speed_kmh ?? prev.wind_speed_kmh,
          forecast: response.weather.forecast ?? prev.forecast,
          temperature_c: response.weather.temperature_c ?? prev.temperature_c,
          visibility_km: response.weather.visibility_km ?? prev.visibility_km,
          source: response.weather.source || 'INCOIS_OSF_LIVE',
        }));
      }

      if (response.risk_level === 'unsafe' || response.risk_level === 'caution' || response.risk_level === 'safe') {
        setRiskLevel(response.risk_level);
      }

      const assistantMsg: MessageItem = {
        id: `orca-${Date.now()}`,
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
      const errorMessage = err?.message || 'Unable to reach ORCA backend. Please try again.';
      setError(errorMessage);

      const errorAssistantMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Connection Note**: ${errorMessage}\n\nPlease ensure the FastAPI backend is running at \`http://localhost:8000\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: '🌊 **Conversation Reset**. ORCA Marine AI is standing by for your questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <GlobalContext.Provider
      value={{
        selectedPort,
        setSelectedPort,
        userLocation,
        setUserLocation,
        currentDate,
        currentLang,
        setCurrentLang,
        weather,
        setWeather,
        riskLevel,
        setRiskLevel,
        gisLayers,
        setGisLayers,
        pfzZones,
        setPfzZones,
        messages,
        setMessages,
        isLoading,
        error,
        setError,
        handleSelectLang,
        handleSelectPort,
        handleRelocateVessel,
        handleToggleLayer,
        handleSendMessage,
        resetChat,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
