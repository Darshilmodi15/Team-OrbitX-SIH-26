import { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Shield,
  Waves,
  Navigation,
  Info,
  Radio,
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  category: 'WEATHER' | 'GEOFENCE' | 'ANOMALY' | 'GOVERNMENT' | 'SYSTEM';
  source: string;
  timestamp: string;
  is_read: boolean;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  currentLang?: string;
}

export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterModalProps) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  const filteredItems = notifications.filter((n) => {
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL' || n.severity === 'HIGH';
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          border: 'border-rose-500/40 bg-rose-950/20',
          icon: AlertTriangle,
          iconColor: 'text-rose-400',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          border: 'border-amber-500/40 bg-amber-950/20',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'MODERATE':
        return {
          badge: 'bg-sky-950/80 border-sky-500/50 text-sky-300',
          border: 'border-sky-500/30 bg-sky-950/10',
          icon: Shield,
          iconColor: 'text-sky-400',
        };
      default:
        return {
          badge: 'bg-teal-950/80 border-teal-500/50 text-teal-300',
          border: 'border-teal-500/20 bg-slate-950/40',
          icon: Info,
          iconColor: 'text-teal-400',
        };
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'WEATHER':
        return Waves;
      case 'GEOFENCE':
        return Shield;
      case 'ANOMALY':
        return Navigation;
      case 'GOVERNMENT':
        return Radio;
      default:
        return Info;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-mono font-bold flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Coastal Safety & Alerts</h2>
              <p className="text-xs text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread active advisories` : 'All alerts up to date'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills & Mark All Read */}
        <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-800/80 text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filter === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Critical / High
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-mono text-teal-400 hover:text-teal-300 transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-mono">
              No notifications matching this filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const style = getSeverityStyle(item.severity);
              const CatIcon = getCategoryIcon(item.category);

              return (
                <div
                  key={item.id}
                  onClick={() => onMarkRead(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${style.border} ${
                    !item.is_read ? 'ring-1 ring-teal-500/40' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top line: Category icon, Severity badge & Source */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <CatIcon className={`w-3.5 h-3.5 ${style.iconColor}`} />
                      <span className={`px-2 py-0.2 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                        {item.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h4 className="text-xs font-bold text-slate-100 mb-1">
                    {item.title}
                  </h4>

                  {/* Message Body */}
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    {item.message}
                  </p>

                  {/* Source Attribution */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-1.5">
                    <span>Source: {item.source}</span>
                    <span className="text-teal-400 text-[10px]">
                      {item.is_read ? '✓ Read' : 'Click to mark read'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
