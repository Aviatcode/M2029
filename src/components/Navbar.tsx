import React from 'react';
import {
  Search,
  Bell,
  Menu,
  Sparkles,
  Settings,
  Palette,
} from 'lucide-react';

interface NavbarProps {
  classCode: string;
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenClassSetup: () => void;
  unreadNotificationsCount: number;
  onToggleMobileMenu: () => void;
  calmMode?: boolean;
  onToggleCalmMode?: () => void;
  onOpenThemeSelector?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  classCode,
  onNavigateHome,
  onOpenSearch,
  onOpenNotifications,
  onOpenClassSetup,
  unreadNotificationsCount,
  onToggleMobileMenu,
  calmMode = false,
  onToggleCalmMode,
  onOpenThemeSelector,
}) => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950 px-3 md:px-5 flex items-center justify-between gap-3 shrink-0 z-30">
      {/* Brand Logo & Class Name -> Redirects to Home Tab */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* SyllabusOS Academic Insignia -> Redirects to Home */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 group cursor-pointer transition text-left focus:outline-none"
          title="Return to Academic Workspace"
        >
          {/* Custom Geometric Academic Stamp */}
          <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-750 flex items-center justify-center shadow-xs group-hover:border-slate-600 transition relative overflow-hidden">
            <span className="font-editorial text-sm font-semibold tracking-tight text-slate-200 group-hover:text-white transition select-none">
              §
            </span>
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-tl-sm opacity-80" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-semibold text-xs tracking-tight text-slate-200 group-hover:text-white transition">
                SyllabusOS
              </span>
              <span className="academic-tag text-[9px] px-1 py-0.2 text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/25 rounded">
                CR
              </span>
            </div>
            <span className="academic-tag text-[10px] text-slate-400 group-hover:text-slate-300 transition leading-tight">
              {classCode}
            </span>
          </div>
        </button>
      </div>

      {/* Global Search (Linear Precision & Minimal) */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer w-64 lg:w-72 justify-between shadow-2xs"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-sans-ui">Search syllabus, PPTs, PYQs...</span>
        </span>
        <kbd className="academic-tag text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">⌘K</kbd>
      </button>

      {/* Controls: Setup Wizard, Theme, Calm Mode & Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mobile search icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Dedicated Semester Setup Wizard Button */}
        <button
          onClick={onOpenClassSetup}
          className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer shadow-2xs"
          title="Open Semester Setup Wizard (CR Authenticated)"
          aria-label="Semester Setup"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="hidden sm:inline font-sans-ui">Semester Setup</span>
        </button>

        {/* Theme Picker Button */}
        {onOpenThemeSelector && (
          <button
            onClick={onOpenThemeSelector}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer shadow-2xs"
            title="Appearance & Themes (White / Black UI)"
            aria-label="Appearance Themes"
          >
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline font-sans-ui">Theme</span>
          </button>
        )}

        {/* Calm Mode Toggle */}
        {onToggleCalmMode && (
          <button
            onClick={onToggleCalmMode}
            className={`flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition cursor-pointer border ${
              calmMode
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-2xs'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={
              calmMode
                ? 'Calm Mode is ON: Distractions, announcements and promo cards are hidden. Click to disable.'
                : 'Calm Mode is OFF: Click to enable distraction-free Zen focus view.'
            }
            aria-label="Calm Focus Mode"
          >
            <Sparkles className={`w-3.5 h-3.5 ${calmMode ? 'text-emerald-400' : 'text-slate-400'} shrink-0`} />
            <span className="hidden sm:inline font-sans-ui">
              {calmMode ? 'Calm: Active' : 'Calm Mode'}
            </span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
          title="Class alerts"
          aria-label="Class alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>
    </header>
  );
};
