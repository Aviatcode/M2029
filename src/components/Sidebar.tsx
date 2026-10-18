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
} from 'lucide-react';
import type { UserProfile } from './LoginModal';

export type ActiveNavTab =
  | 'landing'
  | 'dashboard'
  | 'tomorrow'
  | 'dump'
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
  const primaryItems = [
    { id: 'dashboard' as const, label: 'Today', icon: LayoutDashboard },
    { id: 'dump' as const, label: 'Study Drop', icon: UploadCloud },
    { id: 'ai-tutor' as const, label: 'AI Tutor', icon: Bot },
    { id: 'syllabus' as const, label: 'Syllabus', icon: Map },
    { id: 'materials' as const, label: 'Notes', icon: FolderOpen },
    { id: 'exams' as const, label: 'Exams', icon: Flame },
    { id: 'pyqs' as const, label: 'PYQs', icon: Award },
  ];

  const secondaryItems = [
    { id: 'timetable' as const, label: 'Timetable', icon: Calendar },
    { id: 'assignments' as const, label: 'Assignments', icon: FileCheck2 },
    ...(isSetupDone !== false
      ? [{ id: 'setup' as const, label: 'My Class', icon: GraduationCap }]
      : []),
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
        {/* Primary Items */}
        <div className="space-y-0.5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-md text-xs font-medium transition cursor-pointer ${
                  isCollapsed
                    ? 'justify-center py-2 px-0'
                    : 'gap-2.5 px-2.5 py-1.5 text-left'
                } ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800/90 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                {/* Active Indicator bar when collapsed */}
                {isActive && isCollapsed && (
                  <span className="absolute left-0 w-0.5 h-4 bg-neutral-200 rounded-r" />
                )}

                <Icon
                  className={`shrink-0 ${
                    isCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                  } ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
                {!isCollapsed && <span className="truncate font-sans-ui">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Secondary Items */}
        <div
          className={`space-y-0.5 pt-2.5 border-t border-slate-800/60 ${
            isCollapsed ? 'text-center' : ''
          }`}
        >
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center rounded-md text-xs font-medium transition cursor-pointer ${
                  isCollapsed
                    ? 'justify-center py-2 px-0'
                    : 'gap-2.5 px-2.5 py-1.5 text-left'
                } ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800/90 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                {isActive && isCollapsed && (
                  <span className="absolute left-0 w-0.5 h-4 bg-neutral-200 rounded-r" />
                )}

                <Icon
                  className={`shrink-0 ${
                    isCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                  } ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
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
