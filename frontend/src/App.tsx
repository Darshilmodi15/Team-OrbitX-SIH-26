import { useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { ControlBar } from './components/ControlBar';
import { GisLayersPanel, type GisLayerState } from './components/GisLayersPanel';
import MarineMap from './components/MarineMap';
import ChatPanel from './components/ChatPanel';
import { FishAnalyticsModal } from './components/FishAnalyticsModal';
import { AgentTraceModal } from './components/AgentTraceModal';
import { Footer } from './components/Footer';
import { queryORCA } from './services/api';
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
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]); // Mumbai Sassoon Dock
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: INDIAN_PORTS[0].lat,
    lon: INDIAN_PORTS[0].lon,
  });

  const [currentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [currentLang, setCurrentLang] = useState<string>('en');

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

  // GIS Layer Switches State (Default all on)
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
      text: '🌊 **Welcome aboard ORCA Marine AI Autonomous Operations Console.**\n\nI provide real-time maritime intelligence, navigational safety assessments, and INCOIS-derived Potential Fishing Zone (PFZ) advisories.\n\nUse the quick actions below or ask about sea conditions, wind & wave risks, or optimal fishing locations in English, Gujarati (ગુજરાતી), Hindi (हिन्दी), Marathi (मराठी), Tamil (தமிழ்), Telugu (తెలుగు), or Malayalam (മലയാളം).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Global Language Switching
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

  // Handle Coastal Port Selection
  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    setUserLocation({ lat: port.lat, lon: port.lon });

    if (port.defaultWeather) {
      setWeather(port.defaultWeather);
      const isUnsafe = port.defaultWeather.wave_height_m > 2.5 || port.defaultWeather.wind_speed_kmh > 50;
      const isCaution = !isUnsafe && (port.defaultWeather.wave_height_m > 1.5 || port.defaultWeather.wind_speed_kmh > 35);
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

  // Handle Relocating Vessel on Sea (Map Click or Drag)
  const handleRelocateVessel = (coords: LocationCoords) => {
    setUserLocation(coords);
  };

  // Handle GIS Layer Toggling
  const handleToggleLayer = (layerKey: keyof GisLayerState) => {
    setGisLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // Handle Sending a Question to ORCA Backend
  const handleSendMessage = async (question: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: timeNow,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    // If query asks for PFZ or route, automatically turn on appropriate GIS layers
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
      const payload: any = {
        location: {
          lat: userLocation.lat,
          lon: userLocation.lon,
        },
        date: currentDate,
        question: question,
        language: currentLang,
      };

      const response = (await queryORCA(payload)) as BackendQueryResponse;

      // Update active PFZ zones on map if returned
      if (response.nearest_pfz && Array.isArray(response.nearest_pfz) && response.nearest_pfz.length > 0) {
        setPfzZones(response.nearest_pfz);
      }

      // Update weather telemetry if returned from backend
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

      // Update risk level if evaluated
      if (response.risk_level === 'unsafe' || response.risk_level === 'caution' || response.risk_level === 'safe') {
        setRiskLevel(response.risk_level);
      }

      // Append assistant response
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F7F9FC] text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER (Brand & Telemetry Status Cards) */}
      <TopHeader
        vesselLat={userLocation.lat}
        vesselLon={userLocation.lon}
        weather={weather}
        riskLevel={riskLevel}
        currentLang={currentLang}
      />

      {/* 2. CONTROL BAR (Location & Language Dropdowns + Action Buttons) */}
      <ControlBar
        selectedPort={selectedPort}
        onSelectPort={handleSelectPort}
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        onOpenReasoning={() => setIsReasoningModalOpen(true)}
        onOpenEcology={() => setIsEcologyModalOpen(true)}
      />

      {/* 3. MAIN CONTENT: 3 SEPARATE COLUMNS (Never overlay chatbot on map) */}
      <main className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-hidden min-h-0 relative bg-[#F7F9FC]">
        {/* LEFT COLUMN: GIS SATELLITE LAYERS (260-280px) */}
        <GisLayersPanel
          layers={gisLayers}
          onToggleLayer={handleToggleLayer}
          currentLang={currentLang}
        />

        {/* CENTER COLUMN: CENTRAL SATELLITE MAP (flex: 1) */}
        <section className="flex-1 h-full min-h-[350px] relative overflow-hidden flex flex-col">
          <MarineMap
            userLocation={userLocation}
            pfzZones={pfzZones}
            layers={gisLayers}
            onRelocateVessel={handleRelocateVessel}
          />
        </section>

        {/* RIGHT COLUMN: ORCA CHATBOT OPTION B (400-440px) */}
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          error={error}
          currentLang={currentLang}
          onSendMessage={handleSendMessage}
          onClearError={() => setError(null)}
          onResetChat={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                sender: 'assistant',
                text: '🌊 **Conversation Reset**. ORCA Marine AI is standing by for your questions.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
        />
      </main>

      {/* 4. FOOTER */}
      <Footer currentLang={currentLang} />

      {/* 5. MODALS */}
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
    </div>
  );
}
