import { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Globe2,
  Bell,
  Phone,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  Radio,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getStrings, SUPPORTED_LANGUAGES, getLanguageDisplay } from '../i18n';

interface NavbarProps {
  onOpenEmergency: () => void;
  onOpenNotifications: () => void;
  onOpenLocation: () => void;
  onOpenAuth: () => void;
  onOpenGovPortal?: () => void;
  onOpenAdmin?: () => void;
}

export default function Navbar({
  onOpenEmergency,
  onOpenNotifications,
  onOpenLocation,
  onOpenAuth,
  onOpenGovPortal,
  onOpenAdmin,
}: NavbarProps) {
  const {
    currentLang,
    setCurrentLang,
    selectedPort,
    userLocation,
    riskLevel,
    weather,
    unreadAlertsCount,
    currentUser,
    setCurrentUser,
  } = useAppContext();

  const t = getStrings(currentLang);
  const navigate = useNavigate();
  const location = useLocation();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('orca_auth_token');
    setCurrentUser(null);
    setShowUserMenu(false);
  };

  // Determine freshness state badge
  const isStale = weather.source?.includes('STALE') || false;
  const isLive = weather.source?.includes('INCOIS') || weather.source?.includes('LIVE') || true;

  // Status configuration
  const safetyBadges = {
    safe: {
      label: t.safe,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: ShieldCheck,
    },
    caution: {
      label: t.caution,
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
    },
    unsafe: {
      label: t.dangerous,
      bg: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
      icon: ShieldAlert,
    },
  }[riskLevel];

  const SafetyIcon = safetyBadges.icon;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* ─── Left: Brand & Location Indicator ─── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* ORCA Logo Mark */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90 cursor-pointer focus:outline-none"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A2540] text-white shadow-xs">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.74.56-3.35 1.52-4.67l11.15 11.15C15.35 19.44 13.74 20 12 20zm6.48-3.33L7.33 5.52C8.65 4.56 10.26 4 12 4c4.41 0 8 3.59 8 8 0 1.74-.56 3.35-1.52 4.67z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-extrabold tracking-tight text-[#0A2540] sm:text-base">
                  ORCA
                </span>
                <span className="rounded-sm bg-[#0D9488]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#0D9488]">
                  MARINE AI
                </span>
              </div>
              <p className="hidden text-[11px] font-medium text-slate-500 lg:block truncate">
                {t.descriptor}
              </p>
            </div>
          </button>

          {/* Location Badge (Clickable to change harbor) */}
          <div className="hidden md:flex items-center">
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <button
              type="button"
              onClick={onOpenLocation}
              className="group flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-700 hover:border-[#0D9488] hover:bg-teal-50/50 transition cursor-pointer"
              title="Click to change port or coordinates"
            >
              <MapPin className="h-3.5 w-3.5 text-[#0D9488] shrink-0" />
              <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                {selectedPort.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({userLocation.lat.toFixed(2)}°N, {userLocation.lon.toFixed(2)}°E)
              </span>
              <span className="text-[10px] font-semibold text-[#0D9488] group-hover:underline ml-1">
                {t.change}
              </span>
            </button>
          </div>
        </div>

        {/* ─── Right: Status, Language, Alerts, Emergency & Profile ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time Safety Status Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${safetyBadges.bg}`}
          >
            <span className={`h-2 w-2 rounded-full ${safetyBadges.dot} animate-pulse`} />
            <SafetyIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{safetyBadges.label}</span>
          </div>

          {/* Telemetry Freshness Status */}
          <div className="hidden xl:flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-600">
            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
            <span>{isStale ? t.stale : t.live}</span>
          </div>

          {/* Emergency SOS Button (Top Priority) */}
          <button
            type="button"
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition cursor-pointer"
            title="Emergency Maritime Distress SOS"
          >
            <Phone className="h-3.5 w-3.5 animate-bounce" />
            <span>{t.sos}</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
            title={t.alerts}
            aria-label="Safety Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-xs">
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
              aria-label="Select Language"
            >
              <Globe2 className="h-3.5 w-3.5 text-[#0D9488]" />
              <span className="font-semibold">{getLanguageDisplay(currentLang)}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-scaleIn">
                <div className="px-2 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.selectLanguage} (Sarvam AI)
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setCurrentLang(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition cursor-pointer ${
                        currentLang === lang.code
                          ? 'bg-[#0D9488]/10 font-bold text-[#0D9488]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Sign In */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A2540] text-white text-[10px] font-bold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden max-w-[100px] truncate md:block">
                  {currentUser.name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-scaleIn">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.mobile_number}</p>
                    <span className="mt-1 inline-block rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600">
                      {currentUser.role}
                    </span>
                  </div>

                  {currentUser.role === 'GOVERNMENT' && onOpenGovPortal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGovPortal();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5 text-[#0D9488]" />
                      <span>{t.governmentDashboard}</span>
                    </button>
                  )}

                  {currentUser.role === 'SUPER_ADMIN' && onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdmin();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Activity className="h-3.5 w-3.5 text-sky-600" />
                      <span>{t.adminDashboard}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 transition cursor-pointer border-t border-slate-100 mt-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex h-8 items-center gap-1.5 rounded-md bg-[#0A2540] px-3 text-xs font-bold text-white hover:bg-[#081D33] active:scale-95 transition cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
