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
} from 'lucide-react';
import type { UserProfile } from './LoginModal';

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
  isMobile = false,
}) => {
  // Built-in auto-collapse on desktop: collapsed by default, expands on hover
  const [isHovered, setIsHovered] = useState<boolean>(false);
  // Phone drawer state: completely hidden until opened via the minimal edge arrow
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

  // -------------------------------------------------------------
  // MOBILE / PHONE VERSION
  // Completely hides the sidebar to save screen space, leaving
  // only one minimal arrow trigger to slide the drawer out.
  // -------------------------------------------------------------
  if (isMobile) {
    const isRightDock = position === 'right';

    return (
      <>
        {/* 1. Minimal Arrow Button on Phone (Always visible when drawer is closed) */}
        {!isMobileOpen && (
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open Navigation Menu"
            title="Open Navigation"
            className={`fixed z-40 flex items-center justify-center p-2 rounded-r-xl bg-[#0d111a]/95 backdrop-blur-md border border-slate-700/80 text-cyan-400 hover:text-white shadow-xl shadow-black/60 transition-all cursor-pointer ${
              isRightDock
                ? 'right-0 top-1/2 -translate-y-1/2 rounded-r-none rounded-l-xl border-r-0'
                : 'left-0 top-1/2 -translate-y-1/2 border-l-0'
            }`}
          >
            {isRightDock ? (
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        )}

        {/* 2. Mobile Backdrop */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* 3. Slide-out Mobile Drawer (Clean & Minimal) */}
        <aside
          className={`fixed inset-y-0 z-50 flex flex-col w-64 max-w-[80vw] bg-[#0d111a] border-slate-800 shadow-2xl transition-transform duration-200 ease-in-out select-none ${
            isRightDock
              ? 'right-0 border-l ' + (isMobileOpen ? 'translate-x-0' : 'translate-x-full')
              : 'left-0 border-r ' + (isMobileOpen ? 'translate-x-0' : '-translate-x-full')
          }`}
        >
          {/* Header with App Logo & Close Arrow */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
            <button
              onClick={() => handleTabClick('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none text-left"
              title="M2029 Workspace"
            >
              <img
                src="./icon-192.png"
                alt="M2029 Logo"
                className="w-7 h-7 rounded-lg shrink-0 object-contain border border-neutral-800"
              />
              <div className="leading-tight overflow-hidden">
                <span className="text-sm font-extrabold text-white tracking-tight font-sans block truncate">
                  M2029
                </span>
                <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5 truncate">
                  {classCode || 'CLASS-2029'}
                </span>
              </div>
            </button>

            {/* Minimal Arrow Button to dismiss sidebar */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close Navigation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
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
                      ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`shrink-0 w-4.5 h-4.5 ${
                      isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate font-sans-ui flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.isAI && !isActive && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        AI
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Minimal Bottom Controls (Settings & Auth only, no bar shifting) */}
          <div className="border-t border-slate-800/80 p-3 space-y-1.5 shrink-0">
            {/* Settings */}
            <button
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                effectiveId === 'settings'
                  ? 'bg-white text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate font-sans-ui">Settings</span>
            </button>

            {/* Auth */}
            <button
              onClick={handleAuthAction}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <AuthIcon className="w-4 h-4 shrink-0" />
              <span className="truncate font-sans-ui">{authLabel}</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP HORIZONTAL DOCK (TOP or BOTTOM)
  // Clean & Minimal - bar shifting button hidden in Settings
  // -------------------------------------------------------------
  const isHorizontal = position === 'top' || position === 'bottom';
  if (isHorizontal) {
    const isTop = position === 'top';
    return (
      <nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`w-full bg-[#0d111a]/95 backdrop-blur-md shrink-0 transition-all duration-200 select-none z-40 ${
          isTop ? 'border-b border-slate-800/80 shadow-sm' : 'border-t border-slate-800/80 shadow-2xl'
        } h-14 sm:h-15 py-1 px-3 sm:px-5 ${!isTop ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}
      >
        <div className="max-w-[1580px] mx-auto h-full flex items-center justify-between gap-3">
          {/* 1. Brand Logo */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none group shrink-0"
            title="M2029 Workspace"
          >
            <img
              src="./icon-192.png"
              alt="M2029 Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 object-contain group-hover:scale-105 transition-transform border border-neutral-800"
            />
            <div className="leading-tight hidden md:block">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight font-sans block">
                M2029
              </span>
              <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5">
                {classCode || 'CLASS-2029'}
              </span>
            </div>
          </button>

          {/* 2. Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`shrink-0 w-4 h-4 ${
                      isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate font-sans-ui text-xs">{item.label}</span>
                  {item.isAI && !isActive && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Controls (Minimal: Settings & Auth only) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Settings */}
            <button
              onClick={() => handleTabClick('settings')}
              title="Settings"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                effectiveId === 'settings'
                  ? 'bg-white text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Auth */}
            <button
              onClick={handleAuthAction}
              title={authLabel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <AuthIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP VERTICAL DOCK (LEFT or RIGHT)
  // Clean & Minimal - bar shifting button hidden in Settings
  // -------------------------------------------------------------
  const isRight = position === 'right';

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-[#0d111a] flex flex-col h-full shrink-0 transition-all duration-200 ease-in-out select-none z-40 ${
        isRight ? 'border-l border-slate-800/70' : 'border-r border-slate-800/70'
      } ${isHovered ? 'w-52 sm:w-56 lg:w-60' : 'w-14 sm:w-16 lg:w-18'}`}
    >
      {/* 1. Brand Logo Header */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between border-b border-slate-800/60 shrink-0">
        <button
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left w-full"
          title="M2029 Workspace"
        >
          <img
            src="./icon-192.png"
            alt="M2029 Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 object-contain group-hover:scale-105 transition-transform border border-neutral-800"
          />
          {isHovered && (
            <div className="leading-tight overflow-hidden">
              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight font-sans block truncate">
                M2029
              </span>
              <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5 truncate">
                {classCode || 'CLASS-2029'}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 2. Navigation Links */}
      <nav
        className={`flex-1 overflow-y-auto space-y-1.5 no-scrollbar ${
          isHovered ? 'p-2.5 sm:p-3' : 'p-1.5 sm:p-2'
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
              className={`relative w-full flex items-center rounded-2xl text-xs font-semibold transition cursor-pointer ${
                isHovered ? 'gap-3 px-3 py-2 text-left' : 'justify-center py-2.5 px-0'
              } ${
                isActive
                  ? 'bg-white text-slate-950 font-bold shadow-lg shadow-white/10 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Icon
                className={`shrink-0 w-4.5 h-4.5 transition-colors ${
                  isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400'
                }`}
              />

              {isHovered && (
                <span className="truncate font-sans-ui flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.isAI && !isActive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      AI
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Controls (Minimal: Settings & Auth only, no bar shifting) */}
      <div className={`border-t border-slate-800/60 shrink-0 space-y-1.5 ${isHovered ? 'p-2.5 sm:p-3' : 'p-1.5 sm:p-2'}`}>
        {/* Settings Button */}
        <button
          onClick={() => handleTabClick('settings')}
          title="Settings"
          className={`w-full flex items-center rounded-2xl text-xs font-semibold transition cursor-pointer ${
            isHovered ? 'gap-3 px-3 py-2 text-left' : 'justify-center py-2 px-0'
          } ${
            effectiveId === 'settings'
              ? 'bg-white text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {isHovered && <span className="truncate font-sans-ui">Settings</span>}
        </button>

        {/* Auth Button */}
        <button
          onClick={handleAuthAction}
          title={authLabel}
          className={`w-full flex items-center rounded-2xl text-xs font-medium transition cursor-pointer ${
            isHovered ? 'gap-2.5 px-3 py-1.5 text-left' : 'justify-center py-1.5 px-0'
          } text-slate-400 hover:text-rose-400 hover:bg-slate-900/60`}
        >
          <AuthIcon className="w-4 h-4 shrink-0" />
          {isHovered && <span className="truncate font-sans-ui">{authLabel}</span>}
        </button>
      </div>
    </aside>
  );
};
