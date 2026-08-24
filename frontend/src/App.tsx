import { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import MarineMap from './components/MarineMap';
import { queryORCA } from './services/api';

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
  const [userLocation, setUserLocation] = useState<LocationCoords>({
    lat: 18.9220,
    lon: 72.8347, // Mumbai Port
  });

  const [currentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-greeting',
      sender: 'assistant',
      text: '🌊 **Welcome aboard ORCA Marine AI Tactical Operations Console.**\n\nI provide real-time maritime intelligence, navigational safety assessments, and INCOIS-derived Potential Fishing Zone (PFZ) advisories.\n\nUse the quick actions below or ask about sea conditions, wind & wave risks, or optimal fishing locations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [pfzZones, setPfzZones] = useState<PFZEvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load PFZ zones on startup so map markers appear immediately
  useEffect(() => {
    const loadInitialPFZ = async () => {
      try {
        const response = (await queryORCA({
          location: { lat: 18.9220, lon: 72.8347 },
          date: new Date().toISOString().split('T')[0],
          question: 'Where are the nearest potential fishing zones near Mumbai?',
        })) as BackendQueryResponse;
        if (response.nearest_pfz && Array.isArray(response.nearest_pfz) && response.nearest_pfz.length > 0) {
          setPfzZones(response.nearest_pfz);
        }
      } catch {
        // Silent startup — won't show error if backend is warming up
      }
    };
    loadInitialPFZ();
  }, []);

  const handleSelectPort = (coords: LocationCoords) => {
    setUserLocation(coords);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'assistant',
        text: `📍 **Vessel Position Updated**: Lat: \`${coords.lat.toFixed(4)}°N\`, Lon: \`${coords.lon.toFixed(4)}°E\`. Ready for regional marine intelligence queries.`,
        timestamp: timeNow,
      },
    ]);
  };

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

    try {
      const response = (await queryORCA({
        location: {
          lat: userLocation.lat,
          lon: userLocation.lon,
        },
        date: currentDate,
        question: question,
      })) as BackendQueryResponse;

      // If backend returned PFZ evidence, update active map targets
      if (response.nearest_pfz && Array.isArray(response.nearest_pfz) && response.nearest_pfz.length > 0) {
        setPfzZones(response.nearest_pfz);
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

      // Append error message from assistant
      const errorAssistantMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Connection Error**: ${errorMessage}\n\nPlease verify that the FastAPI backend server is running at \`http://localhost:8000\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header
        userLocation={userLocation}
        currentDate={currentDate}
        onSelectPort={handleSelectPort}
      />

      {/* Main Split Layout: Left Conversational Assistant / Right Live Tactical Map */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Left Side: ORCA Conversational Assistant */}
        <section className="w-full lg:w-[480px] xl:w-[560px] h-[45vh] lg:h-full shrink-0 flex flex-col z-10 shadow-2xl">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSendMessage={handleSendMessage}
            onClearError={() => setError(null)}
          />
        </section>

        {/* Right Side: Leaflet Interactive Tactical GIS Map */}
        <section className="flex-1 h-[55vh] lg:h-full relative overflow-hidden flex flex-col min-h-0">
          <MarineMap userLocation={userLocation} pfzZones={pfzZones} />
        </section>
      </main>
    </div>
  );
}
