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
  Sliders,
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
  totalNotificationsCount?: number;
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
    avatarUrl: '',
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
  totalNotificationsCount,
  onToggleMobileMenu,
  calmMode = false,
  onToggleCalmMode,
  onOpenThemeSelector,
  onOpenAIKeyConfig,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notificationCount =
    totalNotificationsCount !== undefined && totalNotificationsCount > 0
      ? totalNotificationsCount
      : unreadNotificationsCount;

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

  return (
    <header className="h-13 border-b border-neutral-850 bg-neutral-950 px-3 md:px-5 flex items-center justify-between gap-3 shrink-0 z-30 select-none">
      {/* 1. Left: AM Brand Logo & Class Name */}
      <div className="flex items-center gap-2.5">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-neutral-400 hover:text-white transition cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Minimal AM Brand Identity */}
        <button
          onClick={onNavigateHome}
          className="flex items-center group cursor-pointer focus:outline-none"
          title="Return to Workspace"
          aria-label="Return to Workspace"
        >
          <img
            src="/am-logo.png"
            alt="AM Logo"
            className="w-8 h-8 rounded-lg shrink-0 object-contain group-hover:opacity-90 transition"
          />
        </button>
      </div>

      {/* 2. Center: Minimal Search Input */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition cursor-pointer w-56 lg:w-64 justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-neutral-500" />
          <span className="truncate text-[11px]">Search syllabus, PYQs...</span>
        </span>
        <kbd className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-1 py-0.5 rounded border border-neutral-850">⌘K</kbd>
      </button>

      {/* 3. Right: Alerts & Minimal User DP */}
      <div className="flex items-center gap-2">
        {/* Mobile search icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-md transition cursor-pointer"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications Icon with count number badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-neutral-400 hover:text-white rounded-md transition cursor-pointer"
          title={
            notificationCount > 0
              ? `${notificationCount} notification${notificationCount === 1 ? '' : 's'}`
              : 'Notifications'
          }
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold font-mono flex items-center justify-center leading-none shadow-sm transition-all ${
                unreadNotificationsCount > 0
                  ? 'bg-neutral-100 text-neutral-950 border border-neutral-950'
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
              }`}
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* Minimal User DP Trigger (Clean avatar without status dot or extra icons) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center p-0.5 rounded-full hover:opacity-90 transition cursor-pointer focus:outline-none"
            title={`${currentUser.name} (${currentUser.role.toUpperCase()})`}
            aria-label="User Menu"
            aria-expanded={isDropdownOpen}
          >
            <div className="relative">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-neutral-800"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium text-[11px] flex items-center justify-center">
                  {getInitials(currentUser.name)}
                </div>
              )}
            </div>
          </button>

          {/* Minimal Floating Menu Below DP */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-neutral-950/98 backdrop-blur-md border border-neutral-800 shadow-xl py-1.5 z-50 text-neutral-200 animate-in fade-in duration-100">
              {/* Profile Header */}
              <div className="px-3.5 py-2.5 border-b border-neutral-850 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-200 shrink-0 overflow-hidden">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-neutral-200 truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate font-mono mt-0.5">
                    {currentUser.rollNumber}
                  </div>
                </div>
              </div>

              {/* Menu Items (Minimal, Clean Rows) */}
              <div className="p-1 text-xs">
                {/* Appearance / Theme */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenThemeSelector?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Appearance</span>
                </button>

                {/* AI Models & Keys */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenAIKeyConfig?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                  <span>AI Models & API Keys</span>
                </button>

                {/* Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigateSettings?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Settings</span>
                </button>

                {/* Semester Setup */}
                {onOpenClassSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenClassSetup();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Semester Setup</span>
                  </button>
                )}

                {/* Calm Mode */}
                {onToggleCalmMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleCalmMode();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Calm Mode</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        calmMode
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                          : 'text-neutral-500 border-transparent'
                      }`}
                    >
                      {calmMode ? 'On' : 'Off'}
                    </span>
                  </button>
                )}
              </div>

              {/* Account Actions */}
              <div className="pt-1 mt-1 border-t border-neutral-850 px-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-left cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{currentUser.isLoggedIn ? 'Switch Account' : 'Sign In'}</span>
                </button>

                {currentUser.isLoggedIn && onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-neutral-500" />
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
