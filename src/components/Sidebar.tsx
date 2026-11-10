import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Map,
  FolderOpen,
  Calendar,
  Flame,
  FileCheck2,
  Award,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  UploadCloud,
  LogOut,
  LogIn,
  GraduationCap,
  Database,
  Zap,
  Trophy,
  Sparkles,
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
  const mainNavItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, badge: '3' },
    { id: 'ai-tutor' as const, label: 'AI Companion', icon: Bot, isAI: true, badge: 'AI' },
    { id: 'knowledge-dashboard' as const, label: 'Class Brain', icon: Trophy },
    { id: 'materials' as const, label: 'Notes & Slides', icon: FolderOpen },
    { id: 'syllabus' as const, label: 'Syllabus Map', icon: Map },
    { id: 'exams' as const, label: 'Exams & Radar', icon: Flame, badge: '1' },
    { id: 'assignments' as const, label: 'Tasks & Vivas', icon: FileCheck2 },
    { id: 'timetable' as const, label: 'Timetable', icon: Calendar },
    { id: 'dump' as const, label: 'Study Drop', icon: UploadCloud },
    { id: 'daily-update' as const, label: 'Daily Pulse', icon: Zap },
    ...(isSetupDone !== false ? [{ id: 'setup' as const, label: 'My Class', icon: GraduationCap }] : []),
    { id: 'settings' as const, label: 'Settings', icon: SlidersHorizontal },
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
          const isActive = activeTab === item.id;

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
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-slate-950 text-white'
                          : item.id === 'ai-tutor'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Contributor Promo Card (matching the "Upgrade to Pro" card in screenshot) */}
      {!isCollapsed && (
        <div className="p-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/30 text-white space-y-2 shadow-lg relative overflow-hidden group">
            {/* Ambient background glow */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-cyan-500/20 blur-xl pointer-events-none group-hover:bg-cyan-500/30 transition-all" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-white tracking-tight">
                Class Brain Active
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-sans-ui">
              60 students pooling zero-token knowledge. Perfected to Section C exam blueprint.
            </p>

            <button
              onClick={() => {
                if (onOpenAIKeyConfig) onOpenAIKeyConfig();
                else onSelectTab('knowledge-dashboard');
              }}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition cursor-pointer shadow-sm shadow-cyan-500/30 flex items-center justify-center gap-1.5"
            >
              <span>Explore Brain</span>
              <span className="text-sm font-bold">›</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Bottom User Auth */}
      <div className={`border-t border-slate-800/60 shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={handleAuthAction}
          title={authLabel}
          className={`w-full flex items-center rounded-xl text-xs font-medium transition cursor-pointer ${
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
