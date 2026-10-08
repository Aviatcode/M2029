import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Map,
  FolderOpen,
  Calendar,
  Flame,
  FileCheck2,
  Settings,
  Sun,
  Award,
  GitBranch,
} from 'lucide-react';

export type ActiveNavTab =
  | 'dashboard'
  | 'tomorrow'
  | 'syllabus'
  | 'timetable'
  | 'ai-tutor'
  | 'materials'
  | 'pyqs'
  | 'exams'
  | 'assignments'
  | 'setup'
  | 'github-publish';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  classCode: string;
  semesterNumber: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  classCode,
  semesterNumber,
}) => {
  const primaryItems = [
    { id: 'dashboard' as const, label: 'Today', icon: LayoutDashboard },
    { id: 'ai-tutor' as const, label: 'AI Teacher', icon: Bot },
    { id: 'syllabus' as const, label: 'Syllabus Map', icon: Map },
    { id: 'materials' as const, label: 'Class Notes', icon: FolderOpen },
    { id: 'exams' as const, label: 'Exams & Revision', icon: Flame },
    { id: 'pyqs' as const, label: 'PYQ Archive', icon: Award },
  ];

  const secondaryItems = [
    { id: 'timetable' as const, label: 'Timetable', icon: Calendar },
    { id: 'assignments' as const, label: 'Assignments', icon: FileCheck2 },
    { id: 'github-publish' as const, label: 'Publish to GitHub', icon: GitBranch },
  ];

  return (
    <aside className="w-56 bg-slate-950 border-r border-slate-800/80 flex flex-col h-full shrink-0">
      {/* Quiet Class Identity */}
      <div className="p-4 border-b border-slate-800/60">
        <div className="text-xs text-slate-400 font-sans">
          Semester {semesterNumber} · {classCode}
        </div>
        <div className="font-medium text-sm text-slate-200 mt-0.5">
          Class Workspace
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        <div className="space-y-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 block mb-1">
            More
          </span>
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 font-semibold border border-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Minimal Footer */}
      <div className="p-3 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
        <button
          onClick={() => onSelectTab('setup')}
          className="flex items-center gap-1.5 hover:text-slate-300 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Class Setup</span>
        </button>
        <span className="text-[11px] text-slate-400 font-mono">Synced</span>
      </div>
    </aside>
  );
};
