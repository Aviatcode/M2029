import React from 'react';
import { AppNotification } from '../types';
import { Bell, X, Check, Clock, Sun, FileText, Flame } from 'lucide-react';

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
  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prep_reminder':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'material_uploaded':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'exam_alert':
        return <Flame className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Class Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Classroom & Exam Alerts</span>
          <button
            onClick={onMarkAllRead}
            className="text-cyan-400 hover:underline cursor-pointer"
          >
            Mark all read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => n.actionUrl && onActionClick(n.actionUrl)}
              className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                !n.read
                  ? 'bg-slate-900 border-cyan-500/40'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-100">
                  {getTypeIcon(n.type)}
                  <span>{n.title}</span>
                </div>
                <span className="text-[10px] text-slate-500">{n.time}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
