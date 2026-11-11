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
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  classCode,
  position = 'left',
  onChangePosition,
  currentUser,
  onLogout,
}) => {
  // Built-in auto-collapse: collapsed by default, expands on hover/interaction, auto-collapses on leave or selection
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const getEffectiveNavId = (tab: ActiveNavTab): string => {
    if (tab === 'dump' || tab === 'rag') return 'materials';
    if (tab === 'syllabus' || tab === 'pyqs') return 'exams';
    if (tab === 'assignments' || tab === 'daily-update' || tab === 'tomorrow') return 'timetable';
    if (tab === 'setup') return 'settings';
    return tab;
  };

  const effectiveId = getEffectiveNavId(activeTab);

  const mainNavItems = [
    { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard },
    { id: 'ai-tutor' as const, label: 'AI Tutor', icon: Bot, isAI: true },
    { id: 'materials' as const, label: 'Study Vault', icon: FolderOpen },
    { id: 'exams' as const, label: 'Exam Radar', icon: Flame },
    { id: 'timetable' as const, label: 'Schedule', icon: Calendar },
    { id: 'knowledge-dashboard' as const, label: 'Class Brain', icon: Trophy },
  ];

  const isUserLoggedIn = currentUser ? currentUser.isLoggedIn : true;
  const authLabel = isUserLoggedIn ? 'Sign Out' : 'Sign In';
  const AuthIcon = isUserLoggedIn ? LogOut : LogIn;

  const handleAuthAction = () => {
    if (isUserLoggedIn && onLogout) {
      onLogout();
    } else {
      onSelectTab('landing');
    }
  };

  const handleTabClick = (tabId: ActiveNavTab) => {
    onSelectTab(tabId);
    setIsHovered(false); // Built-in auto-collapse on item selection
  };

  const isHorizontal = position === 'top' || position === 'bottom';

  // -------------------------------------------------------------
  // HORIZONTAL DOCK (TOP or BOTTOM) - Fully responsive on phone & PC
  // -------------------------------------------------------------
  if (isHorizontal) {
    const isTop = position === 'top';
    return (
      <nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`w-full bg-[#0d111a]/95 backdrop-blur-md shrink-0 transition-all duration-200 select-none z-40 ${
          isTop ? 'border-b border-slate-800/80 shadow-sm' : 'border-t border-slate-800/80 shadow-2xl'
        } h-14 sm:h-15 py-1 px-2.5 sm:px-4 ${!isTop ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}
      >
        <div className="max-w-[1580px] mx-auto h-full flex items-center justify-between gap-2 sm:gap-3">
          {/* 1. Brand Logo */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none group shrink-0"
            title="M2028 Workspace"
          >
            <img
              src="./icon-192.png"
              alt="M2028 Logo"
              className="w-7 h-7 rounded-lg shrink-0 object-contain group-hover:scale-105 transition-transform border border-neutral-800"
            />
            <div className="leading-tight hidden md:block">
              <span className="text-xs font-extrabold text-white tracking-tight font-sans block">
                M2028
              </span>
              <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5">
                {classCode || 'BCA-2028'}
              </span>
            </div>
          </button>

          {/* 2. Navigation Pills (Scrollable on small phones) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
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
                      ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`shrink-0 w-4 h-4 ${
                      isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate font-sans-ui text-xs hidden sm:inline">{item.label}</span>
                  {item.isAI && !isActive && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Position Switcher & Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Position Switcher: Single Cycle button on mobile, 4-Way pill on tablet/desktop */}
            {onChangePosition && (
              <>
                <button
                  onClick={() => {
                    const cycle: Record<SidebarPosition, SidebarPosition> = {
                      left: 'top',
                      top: 'right',
                      right: 'bottom',
                      bottom: 'left',
                    };
                    onChangePosition(cycle[position]);
                  }}
                  title={`Docked ${position} (Tap to change)`}
                  className="sm:hidden p-1.5 rounded-lg bg-[#141926] border border-slate-800 text-cyan-300 hover:text-white transition cursor-pointer"
                >
                  {position === 'top' ? (
                    <PanelTop className="w-3.5 h-3.5" />
                  ) : (
                    <PanelBottom className="w-3.5 h-3.5" />
                  )}
                </button>

                <div className="hidden sm:flex items-center bg-[#141926] p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => onChangePosition('left')}
                    title="Dock Left"
                    className={`p-1 rounded-md transition cursor-pointer ${
                      (position as SidebarPosition) === 'left'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onChangePosition('top')}
                    title="Dock Top"
                    className={`p-1 rounded-md transition cursor-pointer ${
                      (position as SidebarPosition) === 'top'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <PanelTop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onChangePosition('right')}
                    title="Dock Right"
                    className={`p-1 rounded-md transition cursor-pointer ${
                      (position as SidebarPosition) === 'right'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onChangePosition('bottom')}
                    title="Dock Bottom"
                    className={`p-1 rounded-md transition cursor-pointer ${
                      (position as SidebarPosition) === 'bottom'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <PanelBottom className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

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
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Auth */}
            <button
              onClick={handleAuthAction}
              title={authLabel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <AuthIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // -------------------------------------------------------------
  // VERTICAL DOCK (LEFT or RIGHT) - Built-in Auto-Collapse
  // -------------------------------------------------------------
  const isRight = position === 'right';

  return (
    <>
      {/* Mobile Backdrop when expanded */}
      {isHovered && (
        <div
          onClick={() => setIsHovered(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 sm:hidden"
        />
      )}

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
            onClick={() => {
              if (window.innerWidth < 640) {
                setIsHovered((prev) => !prev);
              } else {
                handleTabClick('dashboard');
              }
            }}
            className="flex items-center gap-2 cursor-pointer focus:outline-none group text-left w-full"
            title="M2028 Workspace"
          >
            <img
              src="./icon-192.png"
              alt="M2028 Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 object-contain group-hover:scale-105 transition-transform border border-neutral-800"
            />
            {isHovered && (
              <div className="leading-tight overflow-hidden">
                <span className="text-sm sm:text-base font-extrabold text-white tracking-tight font-sans block truncate">
                  M2028
                </span>
                <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5 truncate">
                  {classCode || 'BCA-2028'}
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

      {/* 3. Position Switcher & Controls */}
      <div className={`border-t border-slate-800/60 shrink-0 space-y-1.5 ${isHovered ? 'p-2.5 sm:p-3' : 'p-1.5 sm:p-2'}`}>
        {/* Position Switcher: Single Tap-to-Cycle on Phone, 4-Way pill on Tablet/PC */}
        {onChangePosition && (
          <>
            <button
              onClick={() => {
                const cycle: Record<SidebarPosition, SidebarPosition> = {
                  left: 'top',
                  top: 'right',
                  right: 'bottom',
                  bottom: 'left',
                };
                onChangePosition(cycle[position]);
              }}
              title={`Docked ${position} (Tap to change)`}
              className="sm:hidden w-full flex items-center justify-center p-2 rounded-xl bg-[#141926] border border-slate-800 text-cyan-300 hover:text-white transition cursor-pointer"
            >
              {position === 'left' ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelRight className="w-4 h-4" />
              )}
            </button>

            <div
              className={`hidden sm:flex items-center justify-center rounded-xl bg-[#141926] border border-slate-800 p-1 ${
                isHovered ? 'gap-1' : 'flex-col gap-1'
              }`}
            >
              <button
                onClick={() => onChangePosition('left')}
                title="Dock Left"
                className={`p-1 rounded-md transition cursor-pointer ${
                  (position as SidebarPosition) === 'left'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('top')}
                title="Dock Top"
                className={`p-1 rounded-md transition cursor-pointer ${
                  (position as SidebarPosition) === 'top'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelTop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('right')}
                title="Dock Right"
                className={`p-1 rounded-md transition cursor-pointer ${
                  (position as SidebarPosition) === 'right'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('bottom')}
                title="Dock Bottom"
                className={`p-1 rounded-md transition cursor-pointer ${
                  (position as SidebarPosition) === 'bottom'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelBottom className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

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
    </>
  );
};
