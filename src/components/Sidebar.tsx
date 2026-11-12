import React, { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  FolderOpen,
  Calendar,
  Flame,
  SlidersHorizontal,
  LogOut,
  LogIn,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import type { UserProfile } from './LoginModal';
import { AppLogo } from './AppLogo';

export type SidebarPosition = 'left' | 'right' | 'top' | 'bottom';

export type ActiveNavTab =
  | 'landing'
  | 'dashboard'
  | 'knowledge-dashboard'
  | 'daily-update'
  | 'tomorrow'
  | 'dump'
  | 'rag'
  | 'syllabus'
  | 'timetable'
  | 'ai-tutor'
  | 'materials'
  | 'pyqs'
  | 'exams'
  | 'assignments'
  | 'setup'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  classCode: string;
  semesterNumber: number;
  position?: SidebarPosition;
  onChangePosition?: (pos: SidebarPosition) => void;
  currentUser?: UserProfile;
  onLogout?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  classCode,
  position = 'left',
  currentUser,
  onLogout,
}) => {
  // Built-in auto-collapse on desktop: collapsed by default, expands on hover
  const [isHovered, setIsHovered] = useState<boolean>(false);
  // Slideout drawer state (opens on mobile or via toggle arrow)
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const getEffectiveNavId = (tab: ActiveNavTab): string => {
    if (tab === 'dump' || tab === 'rag') return 'materials';
    if (tab === 'syllabus' || tab === 'pyqs') return 'exams';
    if (tab === 'assignments' || tab === 'daily-update' || tab === 'tomorrow') return 'timetable';
    if (tab === 'setup') return 'settings';
    return tab;
  };

  const effectiveId = getEffectiveNavId(activeTab);

  const mainNavItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-tutor' as const, label: 'AI Tutor', icon: Bot, isAI: true },
    { id: 'materials' as const, label: 'Materials', icon: FolderOpen },
    { id: 'exams' as const, label: 'Exams', icon: Flame },
    { id: 'timetable' as const, label: 'Schedule', icon: Calendar },
    { id: 'knowledge-dashboard' as const, label: 'Class Brain', icon: Trophy },
  ];

  const isUserLoggedIn = currentUser ? currentUser.isLoggedIn : true;
  const authLabel = isUserLoggedIn ? 'Sign Out' : 'Sign In';
  const AuthIcon = isUserLoggedIn ? LogOut : LogIn;

  const handleAuthAction = () => {
    setIsMobileOpen(false);
    if (isUserLoggedIn && onLogout) {
      onLogout();
    } else {
      onSelectTab('landing');
    }
  };

  const handleTabClick = (tabId: ActiveNavTab) => {
    onSelectTab(tabId);
    setIsHovered(false);
    setIsMobileOpen(false);
  };

  const handleArrowToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsHovered((prev) => !prev);
    }
  };

  // Reusable Slide-out Drawer Overlay
  const renderDrawer = () => {
    if (!isMobileOpen) return null;
    const isRightDock = position === 'right';

    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
          aria-hidden="true"
        />

        {/* Slide-out Mobile Drawer */}
        <aside
          className={`fixed inset-y-0 z-50 flex flex-col w-72 max-w-[85vw] bg-[#09090b]/98 backdrop-blur-2xl border-zinc-800 shadow-2xl shadow-black/90 transition-transform duration-250 ease-out select-none ${
            isRightDock
              ? 'right-0 border-l animate-in slide-in-from-right'
              : 'left-0 border-r animate-in slide-in-from-left'
          }`}
        >
          {/* Header with App Logo (Click -> Home Tab) & Dismiss Arrow */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 shrink-0">
            <button
              onClick={() => handleTabClick('dashboard')}
              className="flex items-center gap-3 cursor-pointer focus:outline-none text-left group"
              title="M2029 Home (Academic Overview)"
            >
              <div className="p-1 rounded-xl bg-zinc-900/90 border border-white/10 group-hover:border-white/25 shadow-sm transition-all">
                <AppLogo size={28} withGlow />
              </div>
              <div className="leading-tight overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white tracking-tight font-sans block truncate">
                    M2029
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    AI OS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-medium block truncate mt-0.5">
                  {classCode || 'CLASS-2029'}
                </span>
              </div>
            </button>

            {/* Dismiss Arrow Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close Navigation"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/70 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            >
              {isRightDock ? (
                <ChevronRight className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/70 hover:translate-x-0.5'
                  }`}
                >
                  <Icon
                    className={`shrink-0 w-4.5 h-4.5 ${
                      isActive ? 'text-zinc-950 stroke-[2.3]' : 'text-zinc-400'
                    }`}
                  />
                  <span className="truncate font-sans-ui flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.isAI && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          isActive
                            ? 'bg-zinc-950 text-indigo-400'
                            : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* AI Core Status & Bottom Controls */}
          <div className="border-t border-zinc-800/80 p-3 space-y-2 shrink-0 bg-zinc-950/50">
            {/* AI Engine Status Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Neural Cache
              </span>
              <span className="text-zinc-200 font-bold">ONLINE</span>
            </div>

            {/* Settings */}
            <button
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                effectiveId === 'settings'
                  ? 'bg-white text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate font-sans-ui">Settings</span>
            </button>

            {/* Auth */}
            <button
              onClick={handleAuthAction}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 transition cursor-pointer"
            >
              <AuthIcon className="w-4 h-4 shrink-0" />
              <span className="truncate font-sans-ui">{authLabel}</span>
            </button>
          </div>
        </aside>
      </>
    );
  };

  // -------------------------------------------------------------
  // HORIZONTAL DOCK (TOP or BOTTOM)
  // -------------------------------------------------------------
  const isHorizontal = position === 'top' || position === 'bottom';
  if (isHorizontal) {
    const isTop = position === 'top';
    return (
      <>
        {renderDrawer()}
        <nav
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`w-full bg-[#09090b]/95 backdrop-blur-md shrink-0 transition-all duration-200 select-none z-30 ${
            isTop ? 'border-b border-zinc-800/80 shadow-sm' : 'border-t border-zinc-800/80 shadow-2xl'
          } h-13 sm:h-14 py-1 px-2.5 sm:px-5 ${!isTop ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}
        >
          <div className="max-w-[1580px] mx-auto h-full flex items-center justify-between gap-2 sm:gap-3">
            {/* 1. Brand Logo & Minimal Arrow Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleTabClick('dashboard')}
                className="p-1 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/25 transition cursor-pointer active:scale-95 shrink-0"
                title="M2029 Home (Academic Overview)"
              >
                <AppLogo size={24} withGlow />
              </button>
              <button
                type="button"
                onClick={handleArrowToggle}
                className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer active:scale-95 shrink-0"
                title="Toggle Navigation Menu"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <div className="leading-tight hidden md:block ml-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-white tracking-tight font-sans block">
                    M2029
                  </span>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    AI OS
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 font-semibold block truncate">
                  {classCode || 'CLASS-2029'}
                </span>
              </div>
            </div>

            {/* 2. Navigation Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = effectiveId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    title={item.label}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-white text-zinc-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <Icon
                      className={`shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        isActive ? 'text-zinc-950 stroke-[2.2]' : 'text-zinc-400'
                      }`}
                    />
                    <span className="hidden sm:inline truncate font-sans-ui text-xs">{item.label}</span>
                    {item.isAI && !isActive && (
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded-full font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. Controls (Settings & Auth) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => handleTabClick('settings')}
                title="Settings"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  effectiveId === 'settings'
                    ? 'bg-white text-zinc-950 font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={handleAuthAction}
                title={authLabel}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 transition cursor-pointer"
              >
                <AuthIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // -------------------------------------------------------------
  // VERTICAL DOCK (LEFT or RIGHT)
  // Slim, edge-attached dock: w-12 on mobile (48px), w-16 on desktop (64px)
  // ZERO gap to the main content!
  // -------------------------------------------------------------
  const isRight = position === 'right';

  return (
    <>
      {renderDrawer()}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-[#09090b] flex flex-col h-full shrink-0 transition-all duration-200 ease-in-out select-none z-30 ${
          isRight ? 'border-l border-zinc-800/80' : 'border-r border-zinc-800/80'
        } ${isHovered ? 'w-52 sm:w-60' : 'w-12 sm:w-16 md:w-18'}`}
      >
        {/* 1. App Logo Header & Small Arrow just below it */}
        <div className="p-2 sm:p-2.5 border-b border-zinc-800/70 bg-zinc-950/40 shrink-0 flex flex-col items-center gap-1.5">
          {/* A. App Logo: ALWAYS in top left, click sends to Home tab */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left transition-all ${
              isHovered ? 'w-full px-1' : 'justify-center'
            }`}
            title="M2029 Home (Academic Overview)"
          >
            <div className="p-1 rounded-xl bg-[#121215] border border-white/10 group-hover:border-white/25 shadow-md shadow-black/60 group-hover:shadow-[0_0_16px_rgba(255,255,255,0.1)] transition-all shrink-0">
              <AppLogo size={24} withGlow />
            </div>
            {isHovered && (
              <div className="leading-tight overflow-hidden flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-white tracking-tight font-sans block truncate">
                    M2029
                  </span>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    AI OS
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 font-semibold block truncate mt-0.5">
                  {classCode || 'CLASS-2029'}
                </span>
              </div>
            )}
          </button>

          {/* B. Small Arrow just below it to toggle collapse / expand / mobile drawer */}
          <button
            type="button"
            onClick={handleArrowToggle}
            title={isHovered ? "Collapse Sidebar" : "Open Navigation Drawer"}
            aria-label="Toggle Sidebar"
            className="w-full h-5 rounded-md flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group active:scale-95"
          >
            {isHovered ? (
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2] transition-transform group-hover:-translate-x-0.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.2] transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        {/* 2. Navigation Links */}
        <nav
          className={`flex-1 overflow-y-auto space-y-1.5 no-scrollbar ${
            isHovered ? 'p-2 sm:p-2.5' : 'p-1 sm:p-1.5'
          }`}
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isHovered ? 'gap-2.5 px-2.5 py-2 text-left' : 'justify-center py-2 px-0'
                } ${
                  isActive
                    ? 'bg-white text-zinc-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`shrink-0 w-4 h-4 transition-colors ${
                    isActive ? 'text-zinc-950 stroke-[2.2]' : 'text-zinc-400'
                  }`}
                />

                {isHovered && (
                  <span className="truncate font-sans-ui flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.isAI && !isActive && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                        AI
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 3. Controls (Settings & Auth) */}
        <div className={`border-t border-zinc-800/60 shrink-0 space-y-1 ${isHovered ? 'p-2 sm:p-2.5' : 'p-1 sm:p-1.5'}`}>
          {/* Settings Button */}
          <button
            onClick={() => handleTabClick('settings')}
            title="Settings"
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition cursor-pointer ${
              isHovered ? 'gap-2.5 px-2.5 py-1.5 text-left' : 'justify-center py-1.5 px-0'
            } ${
              effectiveId === 'settings'
                ? 'bg-white text-zinc-950 font-bold shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            {isHovered && <span className="truncate font-sans-ui">Settings</span>}
          </button>

          {/* Auth Button */}
          <button
            onClick={handleAuthAction}
            title={authLabel}
            className={`w-full flex items-center rounded-xl text-xs font-medium transition cursor-pointer ${
              isHovered ? 'gap-2 px-2.5 py-1.5 text-left' : 'justify-center py-1.5 px-0'
            } text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60`}
          >
            <AuthIcon className="w-4 h-4 shrink-0" />
            {isHovered && <span className="truncate font-sans-ui">{authLabel}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
