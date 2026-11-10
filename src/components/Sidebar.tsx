import React, { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  FolderOpen,
  Calendar,
  Flame,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LogOut,
  LogIn,
  Trophy,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Pin,
  PinOff,
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  autoCollapse?: boolean;
  onToggleAutoCollapse?: () => void;
  onOpenClassSetup?: () => void;
  onOpenAIKeyConfig?: () => void;
  currentUser?: UserProfile;
  onLogout?: () => void;
  isSetupDone?: boolean;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  classCode,
  semesterNumber,
  position = 'left',
  onChangePosition,
  isCollapsed = false,
  onToggleCollapse,
  autoCollapse = true,
  onToggleAutoCollapse,
  onOpenClassSetup,
  onOpenAIKeyConfig,
  currentUser,
  onLogout,
  isSetupDone = true,
  isMobileDrawer = false,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const getEffectiveNavId = (tab: ActiveNavTab): string => {
    if (tab === 'dump' || tab === 'rag') return 'materials';
    if (tab === 'syllabus' || tab === 'pyqs') return 'exams';
    if (tab === 'assignments' || tab === 'daily-update' || tab === 'tomorrow') return 'timetable';
    if (tab === 'setup') return 'settings';
    return tab;
  };

  const effectiveId = getEffectiveNavId(activeTab);

  // Minimized to 6 core essentials matching strict minimalism
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
    if (isUserLoggedIn && onLogout) {
      onLogout();
    } else {
      onSelectTab('landing');
    }
  };

  const handleTabClick = (tabId: ActiveNavTab) => {
    onSelectTab(tabId);
    if (autoCollapse) {
      setIsHovered(false);
    }
  };

  // Determine whether this sidebar instance should render vertically or horizontally
  const isHorizontal = !isMobileDrawer && (position === 'top' || position === 'bottom');

  // Effective collapse state:
  // When autoCollapse is active:
  // - In vertical mode: collapses to w-18 when not hovered, expands to w-60 on hover
  // - In horizontal mode: stays compact when not hovered, expands labels on hover
  const effectiveCollapsed = isMobileDrawer
    ? false
    : autoCollapse
    ? !isHovered
    : isCollapsed;

  // -------------------------------------------------------------
  // HORIZONTAL RENDER (TOP or BOTTOM DOCK)
  // -------------------------------------------------------------
  if (isHorizontal) {
    const isTop = position === 'top';
    return (
      <nav
        onMouseEnter={() => autoCollapse && setIsHovered(true)}
        onMouseLeave={() => autoCollapse && setIsHovered(false)}
        className={`w-full bg-[#0d111a]/95 backdrop-blur-md shrink-0 transition-all duration-200 select-none z-40 ${
          isTop ? 'border-b border-slate-800/80 shadow-sm' : 'border-t border-slate-800/80 shadow-2xl'
        } ${effectiveCollapsed ? 'h-14 py-1.5 px-3 sm:px-5' : 'h-16 py-2 px-3 sm:px-5'}`}
      >
        <div className="max-w-[1580px] mx-auto h-full flex items-center justify-between gap-3">
          {/* 1. Left Brand */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none group text-left shrink-0"
            title="M2029 Academic OS"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              ✦
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="text-xs font-extrabold text-white tracking-tight font-sans block">
                m2029
              </span>
              <span className="text-[9px] font-mono text-cyan-400 font-semibold block -mt-0.5">
                {classCode || 'BCA-2028'}
              </span>
            </div>
          </button>

          {/* 2. Center Navigation Pills */}
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
                      ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10 ring-1 ring-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`shrink-0 w-4 h-4 ${
                      isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400'
                    }`}
                  />
                  {(!effectiveCollapsed || isActive) && (
                    <span className="truncate font-sans-ui text-xs">{item.label}</span>
                  )}
                  {item.isAI && !isActive && (
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded-full font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. Right: Position Switcher & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 4-Position Switcher */}
            {onChangePosition && (
              <div className="flex items-center bg-[#141926] p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => onChangePosition('left')}
                  title="Dock Left"
                  className={`p-1 rounded-md transition cursor-pointer ${
                    (position as SidebarPosition) === 'left' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePosition('top')}
                  title="Dock Top"
                  className={`p-1 rounded-md transition cursor-pointer ${
                    (position as SidebarPosition) === 'top' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <PanelTop className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePosition('right')}
                  title="Dock Right"
                  className={`p-1 rounded-md transition cursor-pointer ${
                    (position as SidebarPosition) === 'right' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePosition('bottom')}
                  title="Dock Bottom"
                  className={`p-1 rounded-md transition cursor-pointer ${
                    (position as SidebarPosition) === 'bottom' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <PanelBottom className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Auto-collapse Pin Toggle */}
            {onToggleAutoCollapse && (
              <button
                onClick={onToggleAutoCollapse}
                title={autoCollapse ? 'Auto-collapse ON (Expands on hover)' : 'Auto-collapse OFF (Always expanded)'}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  autoCollapse
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {autoCollapse ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
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
  // VERTICAL RENDER (LEFT or RIGHT SIDEBAR)
  // -------------------------------------------------------------
  const isRight = position === 'right';

  return (
    <aside
      onMouseEnter={() => autoCollapse && setIsHovered(true)}
      onMouseLeave={() => autoCollapse && setIsHovered(false)}
      className={`bg-[#0d111a] flex flex-col h-full shrink-0 transition-all duration-200 ease-in-out select-none z-40 ${
        isRight ? 'border-l border-slate-800/70' : 'border-r border-slate-800/70'
      } ${effectiveCollapsed ? 'w-18' : 'w-60'}`}
    >
      {/* 1. Brand Logo Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 shrink-0">
        <button
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left"
          title="M2029 Academic OS"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            ✦
          </div>
          {!effectiveCollapsed && (
            <div className="leading-tight">
              <span className="text-base font-extrabold text-white tracking-tight font-sans block">
                m2029
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold block -mt-0.5">
                {classCode || 'BCA-2028'}
              </span>
            </div>
          )}
        </button>

        {onToggleCollapse && !autoCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent hover:border-slate-800 transition cursor-pointer shrink-0"
            title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {effectiveCollapsed ? (
              isRight ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              isRight ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 2. Navigation Links */}
      <nav
        className={`flex-1 overflow-y-auto space-y-1.5 no-scrollbar ${
          effectiveCollapsed ? 'p-2' : 'p-3'
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
                effectiveCollapsed ? 'justify-center py-3 px-0' : 'gap-3 px-3.5 py-2.5 text-left'
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

              {!effectiveCollapsed && (
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

      {/* 3. Position Switcher & Auto-Collapse Controls */}
      <div className={`border-t border-slate-800/60 shrink-0 space-y-1.5 ${effectiveCollapsed ? 'p-2' : 'p-3'}`}>
        {/* Dock Position Switcher */}
        {onChangePosition && (
          <div
            className={`flex items-center justify-between rounded-xl bg-[#141926] border border-slate-800 ${
              effectiveCollapsed ? 'flex-col gap-1 p-1' : 'p-1'
            }`}
          >
            <div className={`flex items-center gap-0.5 ${effectiveCollapsed ? 'flex-col' : ''}`}>
              <button
                onClick={() => onChangePosition('left')}
                title="Dock Left"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  (position as SidebarPosition) === 'left' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('top')}
                title="Dock Top"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  (position as SidebarPosition) === 'top' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelTop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('right')}
                title="Dock Right"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  (position as SidebarPosition) === 'right' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangePosition('bottom')}
                title="Dock Bottom"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  (position as SidebarPosition) === 'bottom' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelBottom className="w-3.5 h-3.5" />
              </button>
            </div>

            {onToggleAutoCollapse && !effectiveCollapsed && (
              <button
                onClick={onToggleAutoCollapse}
                title={autoCollapse ? 'Auto-collapse ON (Expands on hover)' : 'Auto-collapse OFF (Pinned)'}
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  autoCollapse
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {autoCollapse ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-mono font-medium">Auto</span>
              </button>
            )}
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={() => handleTabClick('settings')}
          title="Settings"
          className={`w-full flex items-center rounded-2xl text-xs font-semibold transition cursor-pointer ${
            effectiveCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3.5 py-2.5 text-left'
          } ${
            effectiveId === 'settings'
              ? 'bg-white text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {!effectiveCollapsed && <span className="truncate font-sans-ui">Settings</span>}
        </button>

        {/* Auth Button */}
        <button
          onClick={handleAuthAction}
          title={authLabel}
          className={`w-full flex items-center rounded-2xl text-xs font-medium transition cursor-pointer ${
            effectiveCollapsed ? 'justify-center py-2 px-0' : 'gap-2.5 px-3 py-1.5 text-left'
          } text-slate-400 hover:text-rose-400 hover:bg-slate-900/60`}
        >
          <AuthIcon className="w-4 h-4 shrink-0" />
          {!effectiveCollapsed && <span className="truncate font-sans-ui">{authLabel}</span>}
        </button>
      </div>
    </aside>
  );
};
