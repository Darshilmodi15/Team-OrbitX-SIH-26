import { useState } from 'react';
import {
  MessageSquare,
  X,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  ChevronRight,
  Layers,
  MapPin,
  Compass,
  AlertTriangle,
  HelpCircle,
  Phone,
  Radio,
  BookOpen,
  Fish,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';
import Navbar from '../components/Navbar';
import MobileNav, { type MobileTab } from '../components/MobileNav';
import SafetyStatusBanner from '../components/SafetyStatusBanner';
import MarineMetricsGrid from '../components/MarineMetricsGrid';
import ForecastHorizonTimeline from '../components/ForecastHorizonTimeline';
import MarineMap from '../components/MarineMap';
import GisLayersPanel from '../components/GisLayersPanel';
import PFZPanel from '../components/PFZPanel';
import BoundaryPanel from '../components/BoundaryPanel';
import HistoricalAnalyticsPanel from '../components/HistoricalAnalyticsPanel';
import ChatPanel from '../components/ChatPanel';

// Modals
import EmergencySOSModal from '../components/EmergencySOSModal';
import NotificationCenterModal from '../components/NotificationCenterModal';
import LocationSelectorModal from '../components/LocationSelectorModal';
import AuthModal from '../components/AuthModal';
import GovernmentPortalModal from '../components/GovernmentPortalModal';
import SuperAdminModal from '../components/SuperAdminModal';
import TerminologyExplainerModal from '../components/TerminologyExplainerModal';
import { FishAnalyticsModal } from '../components/FishAnalyticsModal';

export default function DashboardPage() {
  const {
    currentLang,
    selectedPort,
    userLocation,
    weather,
    pfzZones,
    gisLayers,
    toggleGisLayer,
    messages,
    handleSendMessage,
    isLoading,
    error,
    clearError,
    unreadAlertsCount,
    notifications,
    handleMarkRead,
    handleMarkAllRead,
    handleSelectPort,
    handleUpdateUserLocation,
    currentUser,
    setCurrentUser,
    coastInfo,
    showFarFromCoastWarning,
    dismissFarFromCoastWarning,
    focusOnMapLocation,
  } = useAppContext();

  const t = getStrings(currentLang);

  // Mobile navigation tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('dashboard');

  // Desktop Chat Dock / Floating Panel
  const [isDesktopChatOpen, setIsDesktopChatOpen] = useState(true);

  // Modals state
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGovPortalOpen, setIsGovPortalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isFishAnalyticsOpen, setIsFishAnalyticsOpen] = useState(false);

  const handleAskAboutPFZ = (zoneName: string) => {
    setIsDesktopChatOpen(true);
    setMobileTab('chat');
    handleSendMessage(`Tell me the oceanographic details, depth, and best route to fish in ${zoneName}.`);
  };

  // Auto-minimize chat when any modal opens to prevent overlap
  const openModal = (setter: (v: boolean) => void) => {
    setIsDesktopChatOpen(false);
    setter(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC] select-none font-sans text-slate-900">
      {/* ─── Top Global Institutional Header ─── */}
      <Navbar
        onOpenEmergency={() => openModal(setIsEmergencyOpen)}
        onOpenNotifications={() => openModal(setIsNotificationsOpen)}
        onOpenLocation={() => openModal(setIsLocationOpen)}
        onOpenAuth={() => openModal(setIsAuthOpen)}
        onOpenGovPortal={() => openModal(setIsGovPortalOpen)}
        onOpenAdmin={() => openModal(setIsAdminOpen)}
      />

      {/* ─── Mobile Viewport Content ─── */}
      <div className="flex-1 min-h-0 md:hidden overflow-y-auto pb-16">
        {/* 1. Mobile Dashboard Overview Tab */}
        {mobileTab === 'dashboard' && (
          <div className="p-3.5 space-y-3.5">
            {/* 1. Emergency / Safety Status Component */}
            <SafetyStatusBanner />

            {/* 2. Current Location & Geospatial Coast Distance Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-200 text-[#0D9488]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                      {selectedPort.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500">
                      {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openModal(setIsLocationOpen)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#0D9488] hover:bg-teal-50 transition cursor-pointer"
                >
                  {t.change}
                </button>
              </div>

              {/* Live Geodesic Coast Distance Metric */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Distance to Coastline:</span>
                <span className="font-mono font-bold text-slate-900">
                  {coastInfo.distanceKm.toFixed(1)} km ({coastInfo.coastalRegion})
                </span>
              </div>
            </div>

            {/* 3. Marine Weather & Telemetry Conditions Summary */}
            <MarineMetricsGrid />

            {/* 4. 6-Hour Forecast Outlook Timeline */}
            <ForecastHorizonTimeline
              userLocation={userLocation}
              baseWeather={weather}
              currentLang={currentLang}
            />

            {/* 5. Interactive Satellite Map Preview Card */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="h-48 relative">
                <MarineMap
                  userLocation={userLocation}
                  pfzZones={gisLayers.pfz ? pfzZones : []}
                  onSelectCoords={(lat, lon) => handleUpdateUserLocation({ lat, lon })}
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className="w-full py-2.5 text-xs font-bold text-[#0D9488] hover:bg-teal-50 flex items-center justify-center gap-1.5 transition cursor-pointer border-t border-slate-200"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Open Full Satellite Map Experience</span>
              </button>
            </div>

            {/* 6. Potential Fishing Zones (PFZ) Panel */}
            <PFZPanel
              pfzZones={pfzZones}
              currentLang={currentLang}
              onAskAboutPFZ={handleAskAboutPFZ}
            />

            {/* 7. Maritime Boundary & Geofence Proximity */}
            <BoundaryPanel userLocation={userLocation} currentLang={currentLang} />

            {/* 8. Historical Before/Now Analytics */}
            <HistoricalAnalyticsPanel userLocation={userLocation} currentLang={currentLang} />

            {/* 9. Plain-Language Marine Terminology Launcher */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Marine Terminology Guide</h4>
                  <p className="text-[11px] text-slate-500">Plain-language definitions of PFZ, Wave Period & IMBL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openModal(setIsGlossaryOpen)}
                className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* 2. Mobile Fullscreen Map Tab */}
        {mobileTab === 'map' && (
          <div className="h-full w-full relative">
            <MarineMap
              userLocation={userLocation}
              pfzZones={gisLayers.pfz ? pfzZones : []}
              onSelectCoords={(lat, lon) => handleUpdateUserLocation({ lat, lon })}
              className="h-full w-full"
            />
          </div>
        )}

        {/* 3. Mobile AI Assistant Tab */}
        {mobileTab === 'chat' && (
          <div className="h-full flex flex-col bg-white">
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-800">
                {t.chatTitle}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Sarvam AI & INCOIS Telemetry
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                error={error}
                currentLang={currentLang}
                onClearError={clearError}
              />
            </div>
          </div>
        )}

        {/* 4. Mobile Alerts Tab */}
        {mobileTab === 'alerts' && (
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {t.alerts}
              </h3>
              {unreadAlertsCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                >
                  {t.markAllRead}
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {t.noAlerts}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3.5 ${
                    n.is_read ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {n.translated_title || n.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.translated_message || n.message}
                  </p>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-2 text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                    >
                      Acknowledge & Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Desktop Multi-Column Workspace Layout ─── */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* Left / Center Area: Dominant Interactive Satellite Nautical Chart */}
        <div className="flex-1 relative min-w-0 flex flex-col">
          <div className="flex-1 relative">
            <MarineMap
              userLocation={userLocation}
              pfzZones={gisLayers.pfz ? pfzZones : []}
              onSelectCoords={(lat, lon) => handleUpdateUserLocation({ lat, lon })}
              className="h-full w-full"
            />

            {/* Desktop Ask ORCA Floating Launcher Button (When closed) */}
            {!isDesktopChatOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopChatOpen(true)}
                className="absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-xl bg-[#0A2540] px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:bg-[#081D33] active:scale-95 transition cursor-pointer border border-slate-700/40"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#0D9488]/20 text-[#0D9488]">
                  <MessageSquare className="h-3 w-3" />
                </div>
                <span>{t.askOrca || 'Ask ORCA Assistant'}</span>
              </button>
            )}

            {/* Desktop Docked / Floating Assistant Panel */}
            {isDesktopChatOpen && (
              <div className="absolute bottom-3 right-3 z-30 flex flex-col w-80 lg:w-[380px] h-[calc(100%-24px)] max-h-[500px] rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden animate-scaleIn">
                {/* Assistant Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0A2540] text-white">
                      <MessageSquare className="h-3.5 w-3.5 text-[#0D9488]" />
                    </div>
                    <div>
                      <h4 className="font-display text-xs font-bold text-slate-900">
                        {t.chatTitle || 'ORCA Maritime Assistant'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Sarvam AI & INCOIS Telemetry
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDesktopChatOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
                    title="Close Assistant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Chat Panel */}
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    error={error}
                    currentLang={currentLang}
                    onClearError={clearError}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Command & Marine Telemetry Dashboard */}
        <aside className="w-80 lg:w-[400px] border-l border-slate-200/80 bg-white overflow-y-auto p-3.5 space-y-3.5 shadow-2xs">
          {/* Safety Status Banner */}
          <SafetyStatusBanner />

          {/* Location & Coastline Distance Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 border border-teal-200/60 text-[#0D9488]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                    {selectedPort.name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openModal(setIsLocationOpen)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#0D9488] hover:bg-teal-50 transition cursor-pointer"
              >
                {t.change || 'Change'}
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Distance to Coast:</span>
              <span className="font-mono font-bold text-slate-900">
                {coastInfo.distanceKm.toFixed(1)} km ({coastInfo.coastalRegion})
              </span>
            </div>
          </div>

          {/* Marine Conditions Grid */}
          <MarineMetricsGrid />

          {/* 6-Hour Forecast Timeline */}
          <ForecastHorizonTimeline
            userLocation={userLocation}
            baseWeather={weather}
            currentLang={currentLang}
          />

          {/* Potential Fishing Zones Panel */}
          <PFZPanel
            pfzZones={pfzZones}
            currentLang={currentLang}
            onAskAboutPFZ={handleAskAboutPFZ}
          />

          {/* Maritime Boundary Alert Panel */}
          <BoundaryPanel userLocation={userLocation} currentLang={currentLang} />

          {/* Historical Analytics Panel */}
          <HistoricalAnalyticsPanel userLocation={userLocation} currentLang={currentLang} />

          {/* Marine Terminology Guide Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-[#0D9488]">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Marine Terminology Guide</span>
                <span className="text-[10px] text-slate-500">Plain-language maritime handbook</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openModal(setIsGlossaryOpen)}
              className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
            >
              Learn More →
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Mobile Bottom Navigation ─── */}
      <MobileNav
        activeTab={mobileTab}
        onChangeTab={setMobileTab}
        onOpenEmergency={() => openModal(setIsEmergencyOpen)}
        unreadCount={unreadAlertsCount}
        currentLang={currentLang}
      />

      {/* ─── Global Modals & Overlays ─── */}
      <EmergencySOSModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        userLocation={userLocation}
        currentLang={currentLang}
      />
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadAlertsCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        currentLang={currentLang}
      />
      <LocationSelectorModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        selectedPort={selectedPort}
        onSelectPort={handleSelectPort}
        onUpdateCoords={handleUpdateUserLocation}
        currentLang={currentLang}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => setCurrentUser(u)}
        currentLang={currentLang}
      />
      <GovernmentPortalModal
        isOpen={isGovPortalOpen}
        onClose={() => setIsGovPortalOpen(false)}
        currentUser={currentUser}
        currentLang={currentLang}
      />
      <SuperAdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        userLocation={userLocation}
        currentLang={currentLang}
      />
      <TerminologyExplainerModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        currentLang={currentLang}
      />
      <FishAnalyticsModal
        isOpen={isFishAnalyticsOpen}
        onClose={() => setIsFishAnalyticsOpen(false)}
        currentLang={currentLang}
      />
    </div>
  );
}
