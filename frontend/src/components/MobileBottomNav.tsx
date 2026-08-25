import { Shield, Map, MessageSquare, AlertTriangle } from 'lucide-react';

export type MobileTab = 'map' | 'status' | 'chat' | 'emergency' | 'ecology';

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
    { id: 'map' as MobileTab, label: 'Live Map', icon: Map },
    { id: 'status' as MobileTab, label: 'Safety & Weather', icon: Shield },
    { id: 'chat' as MobileTab, label: 'Ask ORCA', icon: MessageSquare, badge: unreadCount },
    { id: 'emergency' as MobileTab, label: 'SOS Alert', icon: AlertTriangle, isAlert: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 backdrop-blur-md px-3 py-1.5 flex items-center justify-around select-none shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
              isActive
                ? tab.isAlert
                  ? 'bg-rose-50 text-rose-700 font-bold'
                  : 'bg-[#F0FDFA] text-[#0F766E] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 ${
                  tab.isAlert
                    ? 'text-rose-600 animate-pulse'
                    : isActive
                    ? 'text-[#0F766E]'
                    : 'text-slate-400'
                }`}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-[#0F766E] text-white rounded-full text-[9px] font-bold font-mono">
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
