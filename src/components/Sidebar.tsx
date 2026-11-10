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
  const studyHubItems = [
    { id: 'ai-tutor' as const, label: 'AI Companion', icon: Bot, isPrimary: true },
    { id: 'dashboard' as const, label: "Today's Classes", icon: LayoutDashboard },
    { id: 'knowledge-dashboard' as const, label: 'Class Knowledge', icon: Trophy },
  ];

  const academicItems = [
    { id: 'materials' as const, label: 'Notes & Slides', icon: FolderOpen },
    { id: 'syllabus' as const, label: 'Syllabus Map', icon: Map },
    { id: 'exams' as const, label: 'Exams & Radar', icon: Flame },
    { id: 'pyqs' as const, label: 'PYQ Bank', icon: Award },
    { id: 'assignments' as const, label: 'Assignments', icon: FileCheck2 },
    { id: 'timetable' as const, label: 'Timetable', icon: Calendar },
  ];

  const toolsItems = [
    { id: 'dump' as const, label: 'Study Drop (Upload)', icon: UploadCloud },
    { id: 'rag' as const, label: 'Textbook Vault', icon: Database },
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
      className={`bg-slate-950 border-r border-slate-800/80 flex flex-col h-full shrink-0 transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top Header: Collapse Toggle */}
      {onToggleCollapse && (
        <div
          className={`border-b border-slate-800/60 flex items-center ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-end px-3.5 py-2.5'
          }`}
        >
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto space-y-4 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {/* 1. Study Hub */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Study Hub
            </div>
          )}
          {studyHubItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAI = Boolean((item as any).isPrimary);

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-lg text-xs font-medium transition cursor-pointer ${
                  isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 px-2.5 py-2 text-left'
                } ${
                  isActive
                    ? isAI
                      ? 'bg-indigo-600/20 text-indigo-200 font-semibold border border-indigo-500/40 shadow-xs'
                      : 'bg-slate-900 text-slate-100 font-semibold border border-slate-800 shadow-xs'
                    : isAI
                    ? 'text-indigo-300 hover:text-indigo-100 hover:bg-indigo-950/30 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                }`}
              >
                {isActive && isCollapsed && (
                  <span className={`absolute left-0 w-1 h-5 rounded-r ${isAI ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                )}

                <Icon
                  className={`shrink-0 w-4 h-4 ${
                    isActive ? (isAI ? 'text-indigo-300' : 'text-white') : isAI ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate font-sans-ui flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {isAI && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                        AI
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Academics */}
        <div className="space-y-1 pt-2 border-t border-slate-800/60">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Academics
            </div>
          )}
          {academicItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-lg text-xs font-medium transition cursor-pointer ${
                  isCollapsed ? 'justify-center py-2 px-0' : 'gap-2.5 px-2.5 py-1.5 text-left'
                } ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                }`}
              >
                {isActive && isCollapsed && <span className="absolute left-0 w-1 h-4 bg-slate-200 rounded-r" />}

                <Icon className={`shrink-0 w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate font-sans-ui">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* 3. Class Tools */}
        <div className="space-y-1 pt-2 border-t border-slate-800/60">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Class Tools
            </div>
          )}
          {toolsItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-lg text-xs font-medium transition cursor-pointer ${
                  isCollapsed ? 'justify-center py-2 px-0' : 'gap-2.5 px-2.5 py-1.5 text-left'
                } ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                }`}
              >
                {isActive && isCollapsed && <span className="absolute left-0 w-1 h-4 bg-slate-200 rounded-r" />}

                <Icon className={`shrink-0 w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate font-sans-ui">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Pinned Bottom Left Footer: Sign Out / In */}
      <div className={`border-t border-slate-800/60 shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={handleAuthAction}
          title={authLabel}
          className={`group w-full flex items-center rounded-md text-xs font-medium transition cursor-pointer ${
            isCollapsed
              ? 'justify-center py-2 px-0'
              : 'gap-2.5 px-2.5 py-1.5 text-left'
          } ${
            isUserLoggedIn
              ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 border border-transparent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <AuthIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isUserLoggedIn
                ? 'text-slate-400 group-hover:text-rose-400'
                : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
          {!isCollapsed && <span className="truncate font-sans-ui">{authLabel}</span>}
        </button>
      </div>
    </aside>
  );
};
