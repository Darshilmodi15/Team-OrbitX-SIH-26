import { Shield, Map, MessageSquare, Fish, AlertTriangle } from 'lucide-react';

export type MobileTab = 'status' | 'map' | 'chat' | 'ecology' | 'emergency';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  unreadCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  unreadCount = 0,
}: MobileBottomNavProps) {
  const tabs = [
    { id: 'status' as MobileTab, label: 'Safety', icon: Shield },
    { id: 'map' as MobileTab, label: 'Live Map', icon: Map },
    { id: 'chat' as MobileTab, label: 'Ask ORCA', icon: MessageSquare, badge: unreadCount },
    { id: 'ecology' as MobileTab, label: 'Fish PFZ', icon: Fish },
    { id: 'emergency' as MobileTab, label: 'SOS', icon: AlertTriangle, isAlert: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative cursor-pointer ${
              isActive
                ? tab.isAlert
                  ? 'bg-rose-950/60 text-rose-400'
                  : 'bg-teal-950/60 text-teal-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 ${
                  tab.isAlert
                    ? 'text-rose-500 animate-pulse'
                    : isActive
                    ? 'text-teal-400'
                    : 'text-slate-400'
                }`}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-teal-500 text-slate-950 rounded-full text-[9px] font-bold font-mono">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
