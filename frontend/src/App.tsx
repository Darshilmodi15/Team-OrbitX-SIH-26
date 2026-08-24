import React, { useState, useEffect } from 'react';
import { INDIAN_PORTS, MOCK_PFZ_ZONES } from './data/maritimeData';
import type { Port, PFZZone, WeatherMetrics } from './data/maritimeData';
import { askMarineAI, fetchIncoisPFZ, getSimulatedWeather } from './services/apiService';
import type { AgentStep, IncoisPFZZone } from './services/apiService';
import { TelemetryBar } from './components/TelemetryBar';
import { MapControls } from './components/MapControls';
import { MaritimeMap } from './components/MaritimeMap';
import { ConversationalDrawer } from './components/ConversationalDrawer';
import type { ChatMessage } from './components/ConversationalDrawer';
import { AgentReasoningModal } from './components/AgentReasoningModal';
import { EcologyAnalyticsModal } from './components/EcologyAnalyticsModal';

export const App: React.FC = () => {
  // Active State Management
  const [selectedPort, setSelectedPort] = useState<Port>(INDIAN_PORTS[0]); // Mumbai Sassoon Dock default
  const [vesselLat, setVesselLat] = useState<number>(INDIAN_PORTS[0].lat);
  const [vesselLon, setVesselLon] = useState<number>(INDIAN_PORTS[0].lon);
  const [currentLang, setCurrentLang] = useState<string>('en');

  // Layer Toggles
  const [showSST, setShowSST] = useState<boolean>(true);
  const [showChlorophyll, setShowChlorophyll] = useState<boolean>(true);
  const [showWaves, setShowWaves] = useState<boolean>(false);
  const [showWind, setShowWind] = useState<boolean>(false);
  const [showGeofence, setShowGeofence] = useState<boolean>(true);
  const [showPFZ, setShowPFZ] = useState<boolean>(true);
  const [showRoute, setShowRoute] = useState<boolean>(true);

  // Weather & Risk State
  const [weather, setWeather] = useState<WeatherMetrics>(getSimulatedWeather(INDIAN_PORTS[0].lat, INDIAN_PORTS[0].lon));
  const [riskLevel, setRiskLevel] = useState<'safe' | 'caution' | 'unsafe'>('safe');
  const [pfzZones, setPfzZones] = useState<PFZZone[]>(MOCK_PFZ_ZONES);
  const [incoisPfzZones, setIncoisPfzZones] = useState<IncoisPFZZone[]>([]);
  const [selectedPfz, setSelectedPfz] = useState<PFZZone | null>(MOCK_PFZ_ZONES[0]);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][] | undefined>(undefined);
  const [isGeofenceAlert, setIsGeofenceAlert] = useState<boolean>(false);

  // Conversational Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Multi-Agent Reasoning Trace State
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isReasoningOpen, setIsReasoningOpen] = useState<boolean>(false);
  const [isEcologyOpen, setIsEcologyOpen] = useState<boolean>(false);

  // Initial welcome query and INCOIS PFZ data fetch on startup
  useEffect(() => {
    handleUserQuery("Is it safe to fish near Mumbai today, and where are the closest fishing spots?");
    
    // Gracefully load official INCOIS PFZ advisory dataset from backend
    fetchIncoisPFZ().then((data) => {
      if (data?.pfz_zones && data.pfz_zones.length > 0) {
        setIncoisPfzZones(data.pfz_zones);
      }
    }).catch((err) => {
      console.warn('Could not load INCOIS PFZ layer:', err);
    });
  }, []);

  // Handle port selection change
  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    setVesselLat(port.lat);
    setVesselLon(port.lon);
    handleUserQuery(`What are the marine safety and potential fishing zone conditions near ${port.name}?`, port.lat, port.lon);
  };

  // Handle vessel relocation on map click or drag
  const handleVesselMove = (lat: number, lon: number) => {
    setVesselLat(lat);
    setVesselLon(lon);
    handleUserQuery(`Evaluate real-time maritime safety, boundary geofences, and nearest PFZ for vessel position (${lat.toFixed(4)}, ${lon.toFixed(4)}).`, lat, lon);
  };

  // Core Query Pipeline
  const handleUserQuery = async (queryText: string, customLat?: number, customLon?: number) => {
    const lat = customLat !== undefined ? customLat : vesselLat;
    const lon = customLon !== undefined ? customLon : vesselLon;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await askMarineAI(queryText, lat, lon, undefined, currentLang);

      setWeather(response.weather);
      setRiskLevel(response.risk_level);
      setPfzZones(response.nearest_pfz);
      setReasoning(response.reasoning);
      setSources(response.sources_used);
      setAgentSteps(response.agent_steps);
      setIsGeofenceAlert(response.geofence_breach);

      if (response.recommended_route) {
        setRouteWaypoints(response.recommended_route);
      }

      if (response.nearest_pfz.length > 0) {
        setSelectedPfz(response.nearest_pfz[0]);
      }

      const orcaMsg: ChatMessage = {
        id: `orca-${Date.now()}`,
        sender: 'orca',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        riskLevel: response.risk_level,
        reasoningCount: response.reasoning.length,
        language: response.language,
        languageName: response.language_name,
      };


      setMessages((prev) => [...prev, orcaMsg]);
    } catch (err) {
      console.error('Query execution error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header / Telemetry Bar */}
      <TelemetryBar
        vesselLat={vesselLat}
        vesselLon={vesselLon}
        selectedPort={selectedPort}
        onSelectPort={handleSelectPort}
        weather={weather}
        riskLevel={riskLevel}
        currentLang={currentLang}
        onSelectLang={(lang) => setCurrentLang(lang)}
        onOpenReasoning={() => setIsReasoningOpen(true)}
        onOpenEcology={() => setIsEcologyOpen(true)}
      />

      {/* Main 3-Column Operations Layout */}
      <main className="relative flex-1 w-full p-3.5 md:p-4 flex flex-col lg:flex-row gap-3.5 md:gap-4 overflow-hidden">
        {/* Left Column: GIS Satellite Layers (270–290px) */}
        <MapControls
          showSST={showSST}
          setShowSST={setShowSST}
          showChlorophyll={showChlorophyll}
          setShowChlorophyll={setShowChlorophyll}
          showWaves={showWaves}
          setShowWaves={setShowWaves}
          showWind={showWind}
          setShowWind={setShowWind}
          showGeofence={showGeofence}
          setShowGeofence={setShowGeofence}
          showPFZ={showPFZ}
          setShowPFZ={setShowPFZ}
          showRoute={showRoute}
          setShowRoute={setShowRoute}
          currentLang={currentLang}
        />

        {/* Center Column: Interactive GIS Map (Flexible / Largest Area) */}
        <MaritimeMap
          vesselLat={vesselLat}
          vesselLon={vesselLon}
          onVesselMove={handleVesselMove}
          pfzZones={pfzZones}
          incoisPfzZones={incoisPfzZones}
          selectedPfz={selectedPfz}
          onSelectPfz={(zone) => {
            setSelectedPfz(zone);
            handleUserQuery(`Provide navigational guidance and fishing species details for ${zone.name}.`);
          }}
          showSST={showSST}
          showChlorophyll={showChlorophyll}
          showWaves={showWaves}
          showWind={showWind}
          showGeofence={showGeofence}
          showPFZ={showPFZ}
          showRoute={showRoute}
          routeWaypoints={routeWaypoints}
          isGeofenceAlert={isGeofenceAlert}
        />

        {/* Right Column: Dedicated ORCA AI Assistant Chatbot (390–420px) */}
        <ConversationalDrawer
          messages={messages}
          onSendMessage={(text) => handleUserQuery(text)}
          isLoading={isLoading}
          currentLang={currentLang}
          onOpenReasoning={() => setIsReasoningOpen(true)}
        />
      </main>

      {/* Subtle Minimal Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-5 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-sans z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">ORCA Marine AI</span>
          <span>•</span>
          <span>Team OrbitX</span>
          <span>•</span>
          <span className="text-teal-700 font-medium">Smart India Hackathon 2026</span>
        </div>
        <div className="text-slate-400 hidden sm:block">
          Safer Seas • Smarter Decisions • Stronger Communities
        </div>
      </footer>

      {/* Multi-Agent Reasoning Trace Modal */}
      <AgentReasoningModal
        isOpen={isReasoningOpen}
        onClose={() => setIsReasoningOpen(false)}
        reasoning={reasoning}
        sources={sources}
        agentSteps={agentSteps}
      />

      {/* Historical Fish Decline Ecology Modal */}
      <EcologyAnalyticsModal
        isOpen={isEcologyOpen}
        onClose={() => setIsEcologyOpen(false)}
        coastalRegionName={selectedPort.name}
      />
    </div>
  );
};

export default App;
