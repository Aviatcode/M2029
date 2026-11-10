import React from 'react';
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
} from 'lucide-react';
import type { UserProfile } from './LoginModal';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenClassSetup?: () => void;
  onOpenAIKeyConfig?: () => void;
  currentUser?: UserProfile;
  onLogout?: () => void;
  isSetupDone?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  classCode,
  semesterNumber,
  isCollapsed = false,
  onToggleCollapse,
  onOpenClassSetup,
  onOpenAIKeyConfig,
  currentUser,
  onLogout,
  isSetupDone = true,
}) => {
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

  return (
    <aside
      className={`bg-[#0d111a] border-r border-slate-800/70 flex flex-col h-full shrink-0 transition-all duration-200 ease-in-out select-none ${
        isCollapsed ? 'w-18' : 'w-60'
      }`}
    >
      {/* 1. Brand Logo Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 shrink-0">
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left"
          title="M2029 Academic OS"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            ✦
          </div>
          {!isCollapsed && (
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

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent hover:border-slate-800 transition cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 2. Navigation Links */}
      <nav className={`flex-1 overflow-y-auto space-y-1.5 no-scrollbar ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = effectiveId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={`relative w-full flex items-center rounded-2xl text-xs font-semibold transition cursor-pointer ${
                isCollapsed ? 'justify-center py-3 px-0' : 'gap-3 px-3.5 py-2.5 text-left'
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

              {!isCollapsed && (
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

      {/* 3. Bottom Settings & Auth */}
      <div className={`border-t border-slate-800/60 shrink-0 space-y-1 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={() => onSelectTab('settings')}
          title="Settings"
          className={`w-full flex items-center rounded-2xl text-xs font-semibold transition cursor-pointer ${
            isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3.5 py-2.5 text-left'
          } ${
            effectiveId === 'settings'
              ? 'bg-white text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate font-sans-ui">Settings</span>}
        </button>

        <button
          onClick={handleAuthAction}
          title={authLabel}
          className={`w-full flex items-center rounded-2xl text-xs font-medium transition cursor-pointer ${
            isCollapsed ? 'justify-center py-2 px-0' : 'gap-2.5 px-3 py-1.5 text-left'
          } text-slate-400 hover:text-rose-400 hover:bg-slate-900/60`}
        >
          <AuthIcon className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate font-sans-ui">{authLabel}</span>}
        </button>
      </div>
    </aside>
  );
};
