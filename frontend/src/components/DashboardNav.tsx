import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, MessageSquare, Bell, Shield, Settings, Globe, Check } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';

const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
];

export function DashboardNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang, handleSelectLang } = useGlobalContext();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Map', path: '/map', icon: MapIcon },
    { label: 'Assistant', path: '/assistant', icon: MessageSquare },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Services', path: '/services', icon: Shield },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] font-body">
      {/* Brand Logo & Name */}
      <div 
        onClick={() => navigate('/')}
        className="flex items-center gap-3 cursor-pointer select-none"
      >
        <div className="w-8 h-8 rounded-full bg-[#0a2540] flex items-center justify-center text-white shadow-xs">
          <svg className="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
            <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" fill="currentColor" />
          </svg>
        </div>
        <span className="font-bold text-[#0a2540] font-display text-[17px] tracking-tight">
          ORCA Marine AI
        </span>
      </div>

      {/* Center & Right Navigation */}
      <div className="flex items-center gap-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-100/90 text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="h-5 w-px bg-slate-200 mx-2"></div>

        {/* Multilingual Dropdown Selector (Matching Screenshot 092258.png) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>{currentLangObj.english}</span>
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 max-h-80 overflow-y-auto">
              {LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      handleSelectLang(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? 'font-semibold text-slate-900 bg-slate-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{lang.english}</span>
                    {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings button */}
        <button 
          onClick={() => navigate('/location')}
          title="Location & System Settings"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer ml-0.5"
        >
          <Settings className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}

