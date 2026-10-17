import React, { useState } from 'react';
import {
  TimetableClass,
  ExamDateSheetItem,
  AcademicMaterial,
  ClassAnnouncement,
  Subject,
  AcademicAssignment,
} from '../types';
import {
  Clock,
  ArrowRight,
  BookOpen,
  KeyRound,
  CheckCircle2,
  Calendar,
  FileText,
  RefreshCw,
  Bell,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { ActiveNavTab } from './Sidebar';
import {
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../utils/notificationService';

interface DashboardViewProps {
  studentName: string;
  classCode: string;
  semesterNumber: number;
  todayClasses: TimetableClass[];
  tomorrowClasses: TimetableClass[];
  upcomingExams: ExamDateSheetItem[];
  recentMaterials: AcademicMaterial[];
  announcements: ClassAnnouncement[];
  subjects: Subject[];
  assignments?: AcademicAssignment[];
  onOpenTomorrowPrep: () => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onTriggerQuickAIAction: (actionType: string) => void;
  calmMode?: boolean;
  onOpenAIKeyConfig?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  studentName,
  classCode,
  semesterNumber,
  todayClasses,
  tomorrowClasses,
  upcomingExams,
  recentMaterials,
  announcements,
  subjects,
  assignments = [],
  onOpenTomorrowPrep,
  onNavigateTab,
  onTriggerQuickAIAction,
  calmMode = false,
  onOpenAIKeyConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'exams' | 'notes'>('schedule');
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermission());

  const handleAllowNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate overall semester syllabus progress
  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const overallProgressPercent = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  // Find the single immediate class
  const nextClass = todayClasses[0] || tomorrowClasses[0];

  const pendingAssignments = assignments.filter(
    (a) => !a.completed && calculateDaysLeft(a.dueDate) >= 0 && calculateDaysLeft(a.dueDate) <= 7
  );

  return (
    <div className="max-w-4xl mx-auto py-7 px-2 sm:px-4 space-y-9 animate-fade-in">
      {/* 1. Academic Masthead */}
      <div className="space-y-3 border-b border-slate-800/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="academic-tag text-[10px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                Sem {semesterNumber} · {classCode}
              </span>
              {onOpenAIKeyConfig && (
                <button
                  type="button"
                  onClick={onOpenAIKeyConfig}
                  className="academic-tag text-[10px] text-neutral-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 px-2 py-0.5 rounded inline-flex items-center gap-1 transition cursor-pointer"
                  title="Configure Model & Keys"
                >
                  <KeyRound className="w-3 h-3 text-neutral-400" />
                  <span>API Key</span>
                </button>
              )}
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl text-slate-100 font-normal italic tracking-tight">
              {getGreeting()}, {studentName}
            </h1>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-400 font-sans">
            <div>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div className="font-mono text-slate-400 text-[11px]">
              {todayClasses.length} {todayClasses.length === 1 ? 'lecture' : 'lectures'} today
            </div>
          </div>
        </div>

        {/* Study Vault Drop Zone Callout Banner */}
        <div
          onClick={() => onNavigateTab('dump')}
          className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-750 text-slate-300 flex items-center justify-center shrink-0">
              <UploadCloud className="w-4 h-4 group-hover:scale-105 transition" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>Study Vault & Auto-Sort</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-750">Class Cache</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Drop notes, PDFs, or slides. Automatically organized with mnemonics, mindmaps, and 10-markers.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-slate-100 hover:bg-white text-slate-950 text-xs font-medium shrink-0 transition cursor-pointer">
            Open Vault →
          </span>
        </div>

        {/* Calm Mode Indicator */}
        {calmMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>Calm Mode active: Notifications silenced.</span>
          </div>
        )}
      </div>

      {/* 2. Syllabus Horizon */}
      {subjects.length > 0 && (
        <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/50 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-400" />
              <h2 className="text-xs font-semibold text-slate-200 font-sans-ui">
                Syllabus Progress
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-sans-ui">Completed:</span>
              <span className="font-mono text-slate-100 font-semibold text-sm">
                {overallProgressPercent}%
              </span>
              <button
                onClick={() => onNavigateTab('syllabus')}
                className="text-xs text-slate-400 hover:text-slate-200 transition font-sans-ui underline underline-offset-4 cursor-pointer"
              >
                View Map →
              </button>
            </div>
          </div>

          {/* Subject Progress Strip: 5-column balanced layout on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {subjects.map((sub) => {
              const subPercent =
                sub.totalTopicsCount > 0
                  ? Math.round((sub.completedTopicsCount / sub.totalTopicsCount) * 100)
                  : 0;

              return (
                <div
                  key={sub.id}
                  onClick={() => onNavigateTab('syllabus')}
                  className="p-3 rounded bg-slate-900/50 border border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/80 transition cursor-pointer group space-y-2 select-none"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="academic-tag text-[10px] text-slate-400 group-hover:text-white transition">
                      {sub.code || 'CRS'}
                    </span>
                    <span className="font-mono text-xs text-slate-300 font-medium">
                      {subPercent}%
                    </span>
                  </div>

                  <div className="font-sans-ui text-xs font-medium text-slate-200 truncate group-hover:text-white transition">
                    {sub.name}
                  </div>

                  {/* Clean Hairline Progress Bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-300 group-hover:bg-white transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(4, subPercent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{sub.totalUnits} Units</span>
                    <span>{sub.completedTopicsCount}/{sub.totalTopicsCount} Topics</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Next Lecture */}
      {nextClass && (
        <div className="rounded-md bg-slate-900/40 border border-slate-800/80 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="academic-tag text-[10px] text-neutral-400">
              Next Lecture
            </span>
            <span className="font-mono text-slate-400 text-xs">
              {nextClass.time} · {nextClass.room}
            </span>
          </div>

          <div>
            <h2 className="font-editorial text-xl sm:text-2xl text-slate-100 font-medium leading-snug">
              {nextClass.subjectName}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans-ui">
              Prof. {nextClass.teacherName}
              {nextClass.likelyTopic && (
                <> · <span className="text-slate-300 italic font-editorial">{nextClass.likelyTopic.title}</span></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onOpenTomorrowPrep}
              className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs font-sans-ui"
            >
              <span>7-Min Primer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('ai-tutor')}
              className="px-3 py-1.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui"
            >
              AI Tutor
            </button>
          </div>
        </div>
      )}

      {/* 4. Upcoming Deadlines */}
      {pendingAssignments.length > 0 && (
        <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-200">
                Deadlines ({pendingAssignments.length})
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs text-slate-400 hover:text-slate-200 transition font-sans-ui cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-800/50">
            {pendingAssignments.slice(0, 3).map((item) => {
              const days = calculateDaysLeft(item.dueDate);
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab('assignments')}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/40 px-1 rounded transition cursor-pointer"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="font-medium text-slate-200 truncate font-sans-ui">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans-ui flex items-center gap-2">
                      <span>{item.subjectName}</span>
                    </div>
                  </div>

                  <span className="academic-tag text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification Prompt */}
      {notifPermission === 'default' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-md bg-slate-900/40 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Bell className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-slate-300">
              Enable notifications for upcoming lectures and deadlines.
            </span>
          </div>
          <button
            onClick={handleAllowNotifications}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer shrink-0"
          >
            Enable
          </button>
        </div>
      )}

      {/* 5. Lectures, Exams, Notes */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-5 border-b border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-2 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Lectures</span>
            <span className="text-slate-500">({todayClasses.length})</span>
            {activeTab === 'schedule' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-2 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'exams'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Exams</span>
            <span className="text-slate-500">({upcomingExams.length})</span>
            {activeTab === 'exams' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-2 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Notes</span>
            <span className="text-slate-500">({recentMaterials.length})</span>
            {activeTab === 'notes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200 rounded-full" />
            )}
          </button>
        </div>

        {/* Schedule List */}
        {activeTab === 'schedule' && (
          <div className="divide-y divide-slate-800/50">
            {todayClasses.map((cls) => (
              <div
                key={cls.id}
                className="py-3 flex items-center justify-between gap-4 first:pt-0 group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-200 font-sans-ui group-hover:text-white transition">
                      {cls.subjectName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-sans-ui">
                    <span className="font-mono text-slate-300">{cls.time}</span> · Room {cls.room} · Prof. {cls.teacherName}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('ai-tutor')}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer font-sans-ui shrink-0"
                >
                  Study Topic →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Exams List */}
        {activeTab === 'exams' && (
          <div className="divide-y divide-slate-800/50">
            {upcomingExams.map((ex) => {
              const daysLeft = calculateDaysLeft(ex.date);
              return (
                <div
                  key={ex.id}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 group"
                >
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-slate-200 font-sans-ui group-hover:text-white transition">
                      {ex.subjectName}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans-ui">
                      {new Date(ex.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {ex.time} · {ex.examType}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="academic-tag text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {daysLeft} days left
                    </span>
                    <button
                      onClick={() => onNavigateTab('exams')}
                      className="text-xs text-slate-400 hover:text-white transition cursor-pointer font-sans-ui"
                    >
                      Revision Roadmap →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notes List */}
        {activeTab === 'notes' && (
          <div className="divide-y divide-slate-800/50">
            {recentMaterials.map((mat) => (
              <div
                key={mat.id}
                className="py-3 flex items-center justify-between gap-4 first:pt-0 group"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <h3 className="text-sm font-medium text-slate-200 font-sans-ui group-hover:text-white transition truncate">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans-ui truncate">
                    {mat.subjectName} · Shared by {mat.uploaderName}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('materials')}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer font-sans-ui shrink-0"
                >
                  Open Notes →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Academic Marginalia Announcement (Quiet & Unboxed) */}
      {announcements.length > 0 && !calmMode && (
        <div className="pt-4 border-t border-slate-800/60 text-xs text-slate-400 space-y-1 marginalia">
          <div className="text-slate-200 font-medium font-sans-ui">
            Class Dispatch: {announcements[0].title}
          </div>
          <p className="leading-relaxed text-slate-400 font-sans-ui">
            {announcements[0].content}
          </p>
        </div>
      )}
    </div>
  );
};
