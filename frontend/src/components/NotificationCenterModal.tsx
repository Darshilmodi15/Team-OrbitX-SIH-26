import { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Waves,
  ShieldAlert,
  FileText,
  CheckCircle2,
  X,
  CheckCheck,
} from 'lucide-react';
import { getStrings } from '../i18n';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  category: 'WEATHER' | 'GEOFENCE' | 'ANOMALY' | 'GOVERNMENT' | 'SYSTEM';
  source?: string;
  timestamp?: string;
  is_read: boolean;
  language?: string;
  translated_title?: string;
  translated_message?: string;
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
  currentLang = 'en',
}: NotificationCenterModalProps) {
  const t = getStrings(currentLang);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
    if (unreadOnly && n.is_read) return false;
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO':
      default:
        return 'bg-sky-100 text-sky-800 border-sky-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WEATHER':
        return <Waves className="h-4 w-4 text-sky-600" />;
      case 'GEOFENCE':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case 'GOVERNMENT':
        return <FileText className="h-4 w-4 text-teal-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scaleIn max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A2540] text-white">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                {t.alerts}
              </h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread safety alerts` : 'All alerts up to date'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Controls & Mark All Read */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'WEATHER', 'GEOFENCE', 'GOVERNMENT'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{t.markAllRead}</span>
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t.noAlerts}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-xl border p-3.5 transition ${
                  notif.is_read
                    ? 'border-slate-200 bg-white opacity-85'
                    : 'border-amber-200 bg-amber-50/50 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {notif.translated_title || notif.title}
                        </span>
                        <span
                          className={`rounded-xs border px-1.5 py-0.2 text-[9px] font-mono font-bold ${getSeverityBadge(
                            notif.severity
                          )}`}
                        >
                          {notif.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {notif.translated_message || notif.message}
                      </p>
                      {notif.source && (
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Source: {notif.source}
                        </p>
                      )}
                    </div>
                  </div>

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(notif.id)}
                      className="shrink-0 rounded-md bg-white border border-slate-200 p-1 text-slate-500 hover:text-teal-700 hover:border-teal-300 transition cursor-pointer"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
