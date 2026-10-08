import React from 'react';
import { UserRole } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { Search, Bell, Menu, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  classCode: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenClassSetup: () => void;
  unreadNotificationsCount: number;
  onToggleMobileMenu: () => void;
  calmMode?: boolean;
  onToggleCalmMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  classCode,
  onOpenSearch,
  onOpenNotifications,
  onOpenClassSetup,
  unreadNotificationsCount,
  onToggleMobileMenu,
  calmMode = false,
  onToggleCalmMode,
}) => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Brand & Class Identifier */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-base text-white tracking-tight">M2028</span>
          <span className="text-xs text-slate-400 font-sans hidden sm:inline">
            · Academic OS
          </span>
        </div>

        <button
          onClick={onOpenClassSetup}
          className="text-xs text-slate-400 hover:text-slate-200 transition font-sans ml-2 cursor-pointer"
          title="Switch class workspace"
        >
          <span>Class: </span>
          <span className="text-slate-200 font-medium font-mono">{classCode}</span>
        </button>
      </div>

      {/* Global Search (Quiet & Minimal) */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-slate-300 transition cursor-pointer w-72 justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span>Search syllabus, PPTs, PYQs...</span>
        </span>
        <kbd className="font-mono text-[10px] text-slate-400">⌘K</kbd>
      </button>

      {/* Controls & Calm Mode */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile search icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-slate-400 hover:text-white"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Calm Mode Toggle */}
        {onToggleCalmMode && (
          <button
            onClick={onToggleCalmMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
              calmMode
                ? 'bg-slate-900 text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle calm view to reduce visual overload"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{calmMode ? 'Calm Mode' : 'Calm View'}</span>
          </button>
        )}

        {/* Role Persona Selector */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
          <button
            onClick={() => onRoleChange('student')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              currentRole === 'student'
                ? 'bg-slate-800 text-white font-medium shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => onRoleChange('teacher')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              currentRole === 'teacher'
                ? 'bg-slate-800 text-white font-medium shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
          title="Class alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
          )}
        </button>

        <PWAInstallButton compact />
      </div>
    </header>
  );
};
