import {
  Anchor,
  Map as MapIcon,
  MessageSquare,
  Bell,
  Phone,
} from 'lucide-react';
import { getStrings } from '../i18n';

export type MobileTab = 'dashboard' | 'map' | 'chat' | 'alerts';

interface MobileNavProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  onOpenEmergency: () => void;
  unreadCount: number;
  currentLang?: string;
}

export default function MobileNav({
  activeTab,
  onChangeTab,
  onOpenEmergency,
  unreadCount,
  currentLang = 'en',
}: MobileNavProps) {
  const t = getStrings(currentLang);

  const navItems: {
    id: MobileTab;
    label: string;
    icon: typeof Anchor;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: t.dashboard, icon: Anchor },
    { id: 'map', label: t.mapTitle || 'Map', icon: MapIcon },
    { id: 'chat', label: t.assistant, icon: MessageSquare },
    { id: 'alerts', label: t.alerts, icon: Bell, badge: unreadCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition relative cursor-pointer ${
                isActive ? 'text-[#0A2540] font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#0D9488]' : 'text-slate-400'}`} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Dedicated Quick Emergency SOS Button */}
        <button
          type="button"
          onClick={onOpenEmergency}
          className="flex flex-col items-center justify-center py-1 px-2 text-red-600 hover:text-red-700 transition cursor-pointer"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-2xs">
            <Phone className="h-3 w-3" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 text-red-700">
            {t.sos}
          </span>
        </button>
      </div>
    </nav>
  );
}
