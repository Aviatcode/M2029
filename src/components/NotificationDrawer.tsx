import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Sun,
  FileText,
  Flame,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../utils/notificationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onClearNotification: (id: string) => void;
  onActionClick: (url: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onClearNotification,
  onActionClick,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const newPerm = await requestNotificationPermission();
    setPermission(newPerm);
    setIsRequesting(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prep_reminder':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'material_uploaded':
        return <FileText className="w-3.5 h-3.5 text-neutral-300" />;
      case 'exam_alert':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'class_reminder':
        return <Clock className="w-3.5 h-3.5 text-neutral-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications Drawer"
    >
      <div
        className="w-full max-w-sm h-full bg-neutral-950 border-l border-neutral-850 shadow-2xl flex flex-col p-4 sm:p-5 space-y-4 cursor-default animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-300" />
            <h3 className="font-medium text-white text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Push Notification Permission Card: Only shown if NOT yet granted */}
        {permission === 'default' && (
          <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-neutral-200">Enable Device Alerts</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Get browser notifications for tomorrow's syllabus and assignment deadlines.
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full py-1.5 px-3 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isRequesting ? 'Requesting...' : 'Enable Notifications'}
            </button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="bg-neutral-900/40 border border-neutral-800/80 p-2.5 rounded-lg text-xs flex items-start gap-2 text-neutral-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              Browser alerts are blocked. Allow notifications in your browser settings to receive alerts.
            </span>
          </div>
        )}

        {/* 2. Action Toolbar: Clear All & Mark All Read */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-neutral-500 text-[11px] font-mono">Activity</span>
            <div className="flex items-center gap-3">
              {hasUnread && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClearAll}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Check className="w-4 h-4 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-400 font-medium">All caught up</p>
              <p className="text-[11px] text-neutral-500">No active notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.actionUrl && onActionClick(n.actionUrl)}
                className={`p-3 rounded-xl border transition cursor-pointer space-y-1 relative group ${
                  !n.read
                    ? 'bg-neutral-900/70 border-neutral-750 text-neutral-100'
                    : 'bg-neutral-950/40 border-neutral-850/80 hover:border-neutral-750 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs pr-5">
                  <div className="flex items-center gap-1.5 font-medium text-neutral-200 truncate">
                    {getTypeIcon(n.type)}
                    <span className="truncate">{n.title}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-1">
                    {n.time}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">{n.message}</p>

                {/* Dismiss single notification button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearNotification(n.id);
                  }}
                  className="absolute top-2.5 right-2 p-1 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer opacity-70 group-hover:opacity-100"
                  title="Dismiss notification"
                  aria-label="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
