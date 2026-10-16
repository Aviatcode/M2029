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
  Search,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Calendar,
  FileText,
  RefreshCw,
  Bell,
  ShieldCheck,
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
  const [searchPrompt, setSearchPrompt] = useState('');
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

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPrompt.trim()) {
      onTriggerQuickAIAction(searchPrompt.trim());
    }
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
      {/* 1. Editorial Academic Masthead */}
      <div className="space-y-4 border-b border-slate-800/60 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="academic-tag text-[10px] text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/25 px-2 py-0.5 rounded">
                Semester {semesterNumber} · {classCode}
              </span>
              <span className="academic-tag text-[10px] text-slate-500">
                Academic Dossier
              </span>
              <span className="text-[10px] text-emerald-400 font-sans inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">CR Verified</span>
              </span>
              {onOpenAIKeyConfig && (
                <button
                  type="button"
                  onClick={onOpenAIKeyConfig}
                  className="academic-tag text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-500/70 hover:bg-cyan-900/60 px-2 py-0.5 rounded inline-flex items-center gap-1 transition cursor-pointer"
                  title="Configure Gemini AI Key & Database"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Configure API Key</span>
                </button>
              )}
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl text-slate-100 font-normal italic tracking-tight">
              {getGreeting()}, {studentName}
            </h1>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-400 font-sans">
            <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            <div className="font-mono text-slate-400 text-[11px] mt-0.5">
              {todayClasses.length} {todayClasses.length === 1 ? 'lecture' : 'lectures'} scheduled today
            </div>
          </div>
        </div>

        {/* Quiet Editorial Syllabus Query Bar */}
        <form onSubmit={handleQuickSearch} className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
          <input
            type="text"
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
            placeholder="Inquire any syllabus topic (e.g., Normalization, Page Replacement, Fourier Series)..."
            className="w-full bg-slate-900/50 border border-slate-800/90 rounded-md pl-10 pr-24 sm:pr-28 py-2.5 text-xs sm:text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-slate-600 focus:bg-slate-900 transition font-sans-ui shadow-2xs"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-2.5 px-2.5 sm:px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui border border-slate-700/60"
          >
            <span className="hidden sm:inline">Study Topic</span>
            <span className="sm:hidden">Study →</span>
          </button>
        </form>

        {/* Calm Mode Focus Indicator */}
        {calmMode && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-md bg-emerald-950/20 border border-emerald-500/25 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-sans-ui">
                <strong className="font-semibold text-emerald-200">Calm Mode Active:</strong> Extraneous notifications and secondary modules are silenced for deep study.
              </span>
            </div>
            <span className="academic-tag text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 hidden sm:inline">
              Zen Focus
            </span>
          </div>
        )}
      </div>

      {/* 2. Syllabus Horizon & Academic Progress Visualization */}
      {subjects.length > 0 && (
        <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/50 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="academic-tag text-[10px] text-slate-400">
                  Curriculum Horizon
                </span>
              </div>
              <h2 className="text-sm font-semibold text-slate-200 font-sans-ui">
                Syllabus Mastery & Course Completion
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-sans-ui">Semester Progress:</span>
              <span className="font-mono text-emerald-400 font-semibold text-sm">
                {overallProgressPercent}%
              </span>
              <button
                onClick={() => onNavigateTab('syllabus')}
                className="text-xs text-slate-400 hover:text-slate-200 transition font-sans-ui underline underline-offset-4 cursor-pointer"
              >
                View Syllabus Map →
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
                    <span className="academic-tag text-[10px] text-slate-400 group-hover:text-emerald-400 transition">
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
                      className="h-full bg-emerald-500/80 group-hover:bg-emerald-400 transition-all duration-300"
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

      {/* 3. Today's Immediate Academic Focus (Marginalia Composition) */}
      {nextClass && (
        <div className="rounded-md bg-slate-900/40 border border-slate-800/80 p-5 space-y-3.5 marginalia">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="academic-tag text-[10px] text-emerald-400">
              Immediate Agenda · Next Lecture
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
              Professor: <span className="text-slate-300 font-medium">{nextClass.teacherName}</span>
              {nextClass.likelyTopic && (
                <> · Topic: <span className="text-slate-200 italic font-editorial">{nextClass.likelyTopic.title}</span></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={onOpenTomorrowPrep}
              className="px-3.5 py-1.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs font-sans-ui"
            >
              <span>7-Min Pre-Class Primer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('ai-tutor')}
              className="px-3.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui"
            >
              Consult AI Study Hall
            </button>
          </div>
        </div>
      )}

      {/* 4. Classroom Deliverables & Deadlines Docket */}
      {pendingAssignments.length > 0 && (
        <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="academic-tag text-[10px] text-amber-400">
                Academic Docket · {pendingAssignments.length} Submissions Due This Week
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs text-slate-400 hover:text-slate-200 transition font-sans-ui cursor-pointer"
            >
              View Full Docket →
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
                      <span>·</span>
                      <span className="text-slate-400">
                        {item.type === 'ppt_presentation' ? 'Classroom Presentation' : 'Assignment'}
                      </span>
                    </div>
                  </div>

                  <span className="academic-tag text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                    {days === 0 ? 'Due Today' : days === 1 ? 'Due Tomorrow' : `In ${days} Days`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Push Notification Banner */}
      {notifPermission === 'default' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md bg-slate-900/40 border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="font-sans-ui">
              <span className="font-semibold text-slate-200">Classroom Deadlines & Timetable Alerts: </span>
              <span className="text-slate-400">
                Enable desktop and mobile alerts for tomorrow's syllabus readings, PPTs, and lectures.
              </span>
            </div>
          </div>
          <button
            onClick={handleAllowNotifications}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-medium transition cursor-pointer shrink-0 font-sans-ui flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enable Alerts</span>
          </button>
        </div>
      )}

      {/* 5. Academic Workspace Tabs (Agenda, Datesheet, Notes) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-6 border-b border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Today's Lectures</span>
            <span className="font-editorial italic text-slate-400">({todayClasses.length})</span>
            {activeTab === 'schedule' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-2.5 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'exams'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Upcoming Exams</span>
            <span className="font-editorial italic text-slate-400">({upcomingExams.length})</span>
            {activeTab === 'exams' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 font-sans-ui transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Shared Notes & PPTs</span>
            <span className="font-editorial italic text-slate-400">({recentMaterials.length})</span>
            {activeTab === 'notes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
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
                  className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer font-sans-ui shrink-0"
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
                      className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer font-sans-ui"
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
                  className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer font-sans-ui shrink-0"
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
