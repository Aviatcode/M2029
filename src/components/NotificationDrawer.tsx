import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import {
  Bell,
  X,
  Check,
  Clock,
  Sun,
  FileText,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Send,
  Volume2,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification,
  NotificationPermissionState,
} from '../utils/notificationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onActionClick: (url: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onActionClick,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const newPerm = await requestNotificationPermission();
    setPermission(newPerm);
    setIsRequesting(false);
  };

  const handleSendTestNotification = () => {
    sendBrowserNotification('🎓 BCA-2028 Academic Alert', {
      body: 'Test notification successful! You will receive live deadline alerts for your coursework and PPT schedules.',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prep_reminder':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'material_uploaded':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'exam_alert':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'class_reminder':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Class Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. CLEAR NOTIFICATION PERMISSION CARD */}
        <div className="rounded-xl border p-3.5 space-y-2.5 transition text-xs">
          {permission === 'default' && (
            <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900/60 to-blue-950/40 border border-cyan-500/30 p-3 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-slate-100">Enable Live Deadline Alerts</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Get device notifications for tomorrow's assignments, CR seminar rosters, and class schedules.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isRequesting ? 'Requesting Permission...' : 'Allow Push Notifications'}</span>
              </button>
            </div>
          )}

          {permission === 'granted' && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Push Alerts: Active</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Granted ✓
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                You will receive real-time notifications for assignment deadlines and CR broadcasts on this device.
              </p>
              <button
                onClick={handleSendTestNotification}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{testSent ? '✓ Test Alert Dispatched!' : 'Send Test Notification'}</span>
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Notifications Blocked</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Browser notifications are blocked. To receive deadline alerts, click the lock/settings icon in your browser address bar and set Notifications to <strong>Allow</strong>.
              </p>
            </div>
          )}

          {permission === 'unsupported' && (
            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg text-slate-400 text-[11px]">
              System notifications are not supported in this browser environment.
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 font-medium">Recent Activity</span>
          <button
            onClick={onMarkAllRead}
            className="text-cyan-400 hover:underline cursor-pointer text-xs"
          >
            Mark all read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No new notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.actionUrl && onActionClick(n.actionUrl)}
                className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                  !n.read
                    ? 'bg-slate-900 border-cyan-500/40 shadow-xs'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-100 truncate pr-2">
                    {getTypeIcon(n.type)}
                    <span className="truncate">{n.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">{n.time}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
