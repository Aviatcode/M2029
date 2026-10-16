import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  Sparkles,
  Settings,
  Palette,
  KeyRound,
  User,
  LogOut,
  ChevronDown,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { UserProfile } from './LoginModal';

interface NavbarProps {
  classCode: string;
  currentUser?: UserProfile;
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenClassSetup: () => void;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onNavigateSettings?: () => void;
  unreadNotificationsCount: number;
  onToggleMobileMenu: () => void;
  calmMode?: boolean;
  onToggleCalmMode?: () => void;
  onOpenThemeSelector?: () => void;
  onOpenAIKeyConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  classCode,
  currentUser = {
    id: 'user-cr-1',
    name: 'Aman Kumar',
    email: 'aman.cr@cs.university.edu',
    rollNumber: 'BCA-2028-042',
    role: 'cr',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    classCode: 'BCA-2028',
    isLoggedIn: true,
  },
  onNavigateHome,
  onOpenSearch,
  onOpenNotifications,
  onOpenClassSetup,
  onOpenLogin,
  onLogout,
  onNavigateSettings,
  unreadNotificationsCount,
  onToggleMobileMenu,
  calmMode = false,
  onToggleCalmMode,
  onOpenThemeSelector,
  onOpenAIKeyConfig,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Compute User Initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const roleBadgeStyle = {
    cr: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    teacher: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
    student: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30',
  }[currentUser.role || 'student'];

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950 px-3 md:px-5 flex items-center justify-between gap-3 shrink-0 z-30 relative select-none">
      {/* 1. Left: Brand Logo & Class Name */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* SyllabusOS Academic Stamp -> Redirects to Home */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 group cursor-pointer transition text-left focus:outline-none"
          title="Return to Academic Workspace"
        >
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
              <span className={`academic-tag text-[9px] px-1 py-0.2 rounded border ${roleBadgeStyle}`}>
                {currentUser.role ? currentUser.role.toUpperCase() : 'BCA'}
              </span>
            </div>
            <span className="academic-tag text-[10px] text-slate-400 group-hover:text-slate-300 transition leading-tight">
              {classCode}
            </span>
          </div>
        </button>
      </div>

      {/* 2. Center: Global Search Bar */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition cursor-pointer w-60 lg:w-72 justify-between shadow-2xs"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-sans-ui truncate">Search syllabus, PPTs, PYQs...</span>
        </span>
        <kbd className="academic-tag text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">⌘K</kbd>
      </button>

      {/* 3. Right: Quick Actions & USER DISPLAY PICTURE (DP) WITH DROPDOWN */}
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

        {/* Notifications Icon */}
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

        {/* ============================================================== */}
        {/* USER DISPLAY PICTURE (DP) & DROPDOWN IN THE RIGHT CORNER */}
        {/* Below it: Theme, API Key, All Settings, Semester Setup, Login */}
        {/* ============================================================== */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-cyan-500/50 transition cursor-pointer focus:outline-none group"
            title={`${currentUser.name} (${currentUser.role.toUpperCase()}) - Click for Settings, Theme & API Keys`}
            aria-label="User Profile & Settings Menu"
            aria-expanded={isDropdownOpen}
          >
            {/* Display Picture (DP) with active status dot */}
            <div className="relative">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-cyan-400 transition"
                  onError={(e) => {
                    // Fallback to initials if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-700 group-hover:ring-cyan-400 transition">
                  {getInitials(currentUser.name)}
                </div>
              )}
              {/* Online indicator badge */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                  currentUser.isLoggedIn ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
                title={currentUser.isLoggedIn ? 'Active User' : 'Guest'}
              />
            </div>

            {/* Subtle chevron */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 hidden sm:block ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* ========================================================== */}
          {/* FLOATING DROPDOWN MENU DIRECTLY BELOW THE USER DP */}
          {/* ========================================================== */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-750 shadow-2xl py-2 z-50 text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* 1. Header: User Info Card */}
              <div className="px-4 py-3 border-b border-slate-800/90 flex items-center gap-3">
                <div className="relative shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center ring-2 ring-slate-700">
                      {getInitials(currentUser.name)}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                      currentUser.isLoggedIn ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white truncate">
                      {currentUser.name}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${roleBadgeStyle}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
                    {currentUser.rollNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {/* 2. Menu Buttons Below the DP (Theme, API, All Settings, etc.) */}
              <div className="p-1.5 space-y-0.5">
                {/* A. THEME BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenThemeSelector?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left group"
                >
                  <div className="p-2 rounded-lg bg-purple-950/70 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      Theme & Appearance
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Dark, AMOLED, Clean Light & Cyberpunk themes
                    </div>
                  </div>
                </button>

                {/* B. API KEY & UNIVERSAL AI MODELS BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenAIKeyConfig?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left group"
                >
                  <div className="p-2 rounded-lg bg-cyan-950/70 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 group-hover:text-white flex items-center gap-1.5">
                      <span>API Keys & Universal AI</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Any model: OpenAI, Claude, DeepSeek, Gemini, etc.
                    </div>
                  </div>
                </button>

                {/* C. ALL SETTINGS BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateSettings) {
                      onNavigateSettings();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left group"
                >
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 group-hover:scale-105 transition-transform shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      All Settings
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Full workspace settings & live query tester
                    </div>
                  </div>
                </button>

                {/* D. SEMESTER SETUP WIZARD BUTTON */}
                {onOpenClassSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenClassSetup();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left group"
                  >
                    <div className="p-2 rounded-lg bg-amber-950/70 text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-200 group-hover:text-white">
                        Semester Setup Wizard
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        CR curriculum & subject configuration
                      </div>
                    </div>
                  </button>
                )}

                {/* E. CALM MODE TOGGLE */}
                {onToggleCalmMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleCalmMode();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">Calm Study Mode</div>
                        <div className="text-[10px] text-slate-400">Distraction-free clean view</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        calmMode
                          ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-850 border-slate-700 text-slate-400'
                      }`}
                    >
                      {calmMode ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>

              {/* 3. Footer: Switch Profile / Login / Sign Out */}
              <div className="pt-2 mt-1 border-t border-slate-800/90 px-2 space-y-1">
                {/* Open Login Page Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50 transition cursor-pointer"
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>
                    {currentUser.isLoggedIn ? 'Switch Account / Login Page' : 'Sign In / Open Login Page'}
                  </span>
                </button>

                {/* Sign Out Option */}
                {currentUser.isLoggedIn && onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
