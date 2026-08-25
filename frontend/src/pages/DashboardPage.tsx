import { useState } from 'react';
import {
  MessageSquare,
  X,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  ChevronRight,
  Layers,
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
  } = useAppContext();

  const t = getStrings(currentLang);

  // Mobile navigation state
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

  const handleAskAboutPFZ = (zoneName: string) => {
    setIsDesktopChatOpen(true);
    setMobileTab('chat');
    handleSendMessage(`Tell me the oceanographic details, depth, and best route to fish in ${zoneName}.`);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* ─── Top Global Navbar ─── */}
      <Navbar
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenLocation={() => setIsLocationOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenGovPortal={() => setIsGovPortalOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* ─── Mobile Viewport Content ─── */}
      <div className="flex-1 min-h-0 md:hidden overflow-y-auto pb-16">
        {/* 1. Mobile Dashboard Overview Tab */}
        {mobileTab === 'dashboard' && (
          <div className="p-3.5 space-y-3.5">
            {/* Safety Banner */}
            <SafetyStatusBanner />

            {/* Marine Telemetry Conditions */}
            <MarineMetricsGrid />

            {/* 6-Hour Forecast Timeline */}
            <ForecastHorizonTimeline
              userLocation={userLocation}
              baseWeather={weather}
              currentLang={currentLang}
            />

            {/* Map Preview Card */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="h-44 relative">
                <MarineMap
                  userLocation={userLocation}
                  pfzZones={gisLayers.pfz ? pfzZones : []}
                  layers={gisLayers}
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className="w-full py-2.5 text-xs font-bold text-[#0D9488] hover:bg-teal-50 flex items-center justify-center gap-1.5 transition cursor-pointer border-t border-slate-200"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>{t.openMap}</span>
              </button>
            </div>

            {/* PFZ Zones */}
            <PFZPanel
              pfzZones={pfzZones}
              currentLang={currentLang}
              onAskAboutPFZ={handleAskAboutPFZ}
            />

            {/* Boundary Proximity */}
            <BoundaryPanel userLocation={userLocation} currentLang={currentLang} />

            {/* Historical Analytics */}
            <HistoricalAnalyticsPanel userLocation={userLocation} currentLang={currentLang} />
          </div>
        )}

        {/* 2. Mobile Full Map Tab */}
        {mobileTab === 'map' && (
          <div className="h-full w-full relative">
            <MarineMap
              userLocation={userLocation}
              pfzZones={gisLayers.pfz ? pfzZones : []}
              layers={gisLayers}
              onSelectCoords={(lat, lon) => handleUpdateUserLocation({ lat, lon })}
              className="h-full w-full"
            />
            <GisLayersPanel
              layers={gisLayers}
              onToggleLayer={toggleGisLayer}
              currentLang={currentLang}
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
                Sarvam AI & Gemini
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
            <h3 className="font-display text-base font-bold text-slate-900">
              {t.alerts}
            </h3>
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {t.noAlerts}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3.5 ${
                    n.is_read ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">
                    {n.translated_title || n.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {n.translated_message || n.message}
                  </p>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-2 text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Desktop Multi-Column Layout ─── */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* Left / Center Area: Interactive Nautical Chart + AI Assistant */}
        <div className="flex-1 relative min-w-0 flex flex-col">
          {/* Main Leaflet Map */}
          <div className="flex-1 relative">
            <MarineMap
              userLocation={userLocation}
              pfzZones={gisLayers.pfz ? pfzZones : []}
              layers={gisLayers}
              onSelectCoords={(lat, lon) => handleUpdateUserLocation({ lat, lon })}
              className="h-full w-full"
            />
            <GisLayersPanel
              layers={gisLayers}
              onToggleLayer={toggleGisLayer}
              currentLang={currentLang}
            />

            {/* Desktop Ask ORCA Floating Launcher Button (When closed) */}
            {!isDesktopChatOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopChatOpen(true)}
                className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-xl bg-[#0A2540] px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-[#081D33] active:scale-95 transition cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-[#0D9488]" />
                <span>{t.askOrca}</span>
              </button>
            )}

            {/* Desktop Docked / Floating Assistant Panel */}
            {isDesktopChatOpen && (
              <div className="absolute bottom-3 right-3 z-[1000] flex flex-col w-96 lg:w-[420px] h-[calc(100%-24px)] max-h-[640px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-scaleIn">
                {/* Assistant Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A2540] text-white">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="font-display text-xs font-bold text-slate-900">
                        {t.chatTitle}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Sarvam AI & INCOIS Telemetry
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDesktopChatOpen(false)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
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
        <aside className="w-80 lg:w-[420px] border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4 shadow-2xs">
          {/* Safety Status Banner */}
          <SafetyStatusBanner />

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
        </aside>
      </div>

      {/* ─── Mobile Bottom Navigation ─── */}
      <MobileNav
        activeTab={mobileTab}
        onChangeTab={setMobileTab}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        unreadCount={unreadAlertsCount}
        currentLang={currentLang}
      />

      {/* ─── Global Modals ─── */}
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
    </div>
  );
}
