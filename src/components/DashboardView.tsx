import React, { useState, useEffect } from 'react';
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
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ListTodo,
  StickyNote,
  Trophy,
  Zap,
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
  onOpenMaterial?: (mat: AcademicMaterial) => void;
  onOpenOnboardingUpload?: () => void;
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
  onOpenMaterial,
  onOpenOnboardingUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'exams' | 'notes'>('schedule');
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermission());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Notion-Style Student Scratchpad & Quick To-Do Capture (Auto-saved in localStorage)
  const [scratchpadOpen, setScratchpadOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dashboard_scratchpad_open') !== 'false';
    } catch {
      return true;
    }
  });
  const [scratchpadTab, setScratchpadTab] = useState<'checklist' | 'notes'>('checklist');
  const [scratchpadNotes, setScratchpadNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('student_daily_notes') || '';
    } catch {
      return '';
    }
  });
  const [quickTodos, setQuickTodos] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('student_quick_todos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'todo-1', text: 'Get lab practical record verified', completed: false },
      { id: 'todo-2', text: 'Revise 10-marker questions for upcoming test', completed: false },
    ];
  });
  const [newTodoInput, setNewTodoInput] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('student_daily_notes', scratchpadNotes);
    } catch {}
  }, [scratchpadNotes]);

  useEffect(() => {
    try {
      localStorage.setItem('student_quick_todos', JSON.stringify(quickTodos));
    } catch {}
  }, [quickTodos]);

  const handleToggleScratchpad = () => {
    setScratchpadOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboard_scratchpad_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleAddQuickTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newTodoInput.trim();
    if (!text) return;
    setQuickTodos((prev) => [...prev, { id: `todo-${Date.now()}`, text, completed: false }]);
    setNewTodoInput('');
  };

  const handleToggleQuickTodo = (id: string) => {
    setQuickTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteQuickTodo = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompletedTodos = () => {
    setQuickTodos((prev) => prev.filter((t) => !t.completed));
  };

  // Keep greeting and clock synchronized live in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAllowNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  const getGreeting = (date: Date = currentTime) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
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
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl text-slate-100 font-normal italic tracking-tight">
              {getGreeting(currentTime)}, {studentName}
            </h1>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-400 font-sans">
            <div className="flex items-center sm:justify-end gap-1.5">
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-300">
                {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            </div>
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
            <div className="text-xs font-semibold text-white">
              Study Vault & Drop
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-medium shrink-0 transition cursor-pointer">
            Open Vault →
          </span>
        </div>

        {/* 60-Student Compounding Intelligence Live Cohort Brain Banner */}
        <div
          onClick={() => onNavigateTab('ai-tutor')}
          className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-indigo-950/20 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 group-hover:scale-110 transition" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>Class Brain: 60-Student Compounding Intelligence</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Core university topics perfected across 60 student peers. 100% exam rubric aligned, 0 AI tokens spent!
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-medium shrink-0 transition cursor-pointer flex items-center gap-1">
            <span>Explore Brain</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
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

      {/* 1.5 Notion-Style Daily Scratchpad & Quick To-Do Capture */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 overflow-hidden shadow-xs">
        {/* Notion Toggle Header */}
        <div
          onClick={handleToggleScratchpad}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-850/40 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <button className="text-slate-400 hover:text-white transition">
              {scratchpadOpen ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Scratchpad & Quick Tasks</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                {quickTodos.filter((t) => t.completed).length}/{quickTodos.length} done
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
            {/* Tab switch between Checklist and Notes */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setScratchpadTab('checklist')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  scratchpadTab === 'checklist'
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListTodo className="w-3 h-3" />
                <span>To-Dos</span>
              </button>
              <button
                onClick={() => setScratchpadTab('notes')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  scratchpadTab === 'notes'
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <StickyNote className="w-3 h-3" />
                <span>Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {scratchpadOpen && (
          <div className="p-4 border-t border-slate-800/60 bg-slate-950/30 space-y-3">
            {scratchpadTab === 'checklist' ? (
              <div className="space-y-3">
                {/* To-Do Items List */}
                <div className="space-y-1.5">
                  {quickTodos.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3 text-center italic">
                      No quick to-dos for today. Add one below!
                    </div>
                  ) : (
                    quickTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-lg hover:bg-slate-900/60 transition group text-xs"
                      >
                        <div
                          onClick={() => handleToggleQuickTodo(todo.id)}
                          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                              todo.completed
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                          >
                            {todo.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className={`truncate transition font-sans-ui ${
                              todo.completed ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {todo.text}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteQuickTodo(todo.id, e)}
                          className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1 cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Fast Add & Action Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <form onSubmit={handleAddQuickTodo} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="+ Add daily task (e.g. submit lab report, ask prof...) Press Enter"
                      value={newTodoInput}
                      onChange={(e) => setNewTodoInput(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={!newTodoInput.trim()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                        newTodoInput.trim()
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-xs'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </form>

                  {quickTodos.some((t) => t.completed) && (
                    <button
                      onClick={handleClearCompletedTodos}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer underline underline-offset-4 shrink-0"
                    >
                      Clear done
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Freeform Auto-Saving Scratchpad */
              <div className="space-y-2">
                <textarea
                  value={scratchpadNotes}
                  onChange={(e) => setScratchpadNotes(e.target.value)}
                  placeholder="Type anything freely: professor announcements, exam hints, code snippets, formula notes... (Auto-saved instantly to your browser)"
                  rows={4}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500/50 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition resize-y font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>✓ Auto-saved locally</span>
                  {scratchpadNotes.trim() && (
                    <button
                      onClick={() => setScratchpadNotes('')}
                      className="hover:text-rose-400 transition cursor-pointer"
                    >
                      Clear notes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Syllabus Horizon */}
      {subjects.length > 0 ? (
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

          {/* Subject Progress Strip: responsive layout for any number of subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
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
      ) : (
        <div className="rounded-2xl bg-slate-900/40 border border-dashed border-cyan-500/30 p-6 sm:p-7 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white">Upload Your Timetable or Syllabus First</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No subjects or schedule found. Upload your weekly timetable or syllabus — our AI will automatically extract your subjects, teachers, and lecture periods.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {onOpenOnboardingUpload && (
              <button
                type="button"
                onClick={onOpenOnboardingUpload}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upload Timetable / Syllabus with AI</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('setup')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Add Manually →</span>
            </button>
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

          <div className="pt-1">
            <button
              onClick={onOpenTomorrowPrep}
              className="px-3.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs font-sans-ui"
            >
              <span>7-Min Primer</span>
              <ArrowRight className="w-3.5 h-3.5" />
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

      {/* 4.5 Recent Uploaded Materials Quick-Access Shelf */}
      {recentMaterials.length > 0 && (
        <div className="rounded-md bg-slate-900/40 border border-slate-800/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-slate-200">
                Recent Study Materials ({recentMaterials.length})
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('dump')}
              className="text-xs text-slate-400 hover:text-white transition font-sans-ui cursor-pointer"
            >
              Study Drop →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentMaterials.slice(0, 4).map((mat) => (
              <div
                key={mat.id}
                onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('dump'))}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 transition cursor-pointer space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 truncate">
                    <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate font-sans-ui">
                      {mat.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans-ui truncate">
                      {mat.subjectName} · {mat.unitTitle || (mat.unitNumber ? `Unit ${mat.unitNumber}` : 'General')}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                    {mat.fileType || 'pdf'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 border-t border-slate-850">
                  <span className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 font-sans-ui">
                    📖 Notes
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 font-sans-ui">
                    🧠 Mindmap
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 font-sans-ui">
                    🎯 10-Marker
                  </span>
                </div>
              </div>
            ))}
          </div>
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
          todayClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2 rounded-lg border border-dashed border-slate-800 bg-slate-950/30">
              <Calendar className="w-6 h-6 text-slate-600 mx-auto" />
              <p>No lectures scheduled for today.</p>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
              >
                View weekly timetable →
              </button>
            </div>
          ) : (
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
                    Study →
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Exams List */}
        {activeTab === 'exams' && (
          upcomingExams.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2 rounded-lg border border-dashed border-slate-800 bg-slate-950/30">
              <Calendar className="w-6 h-6 text-slate-600 mx-auto" />
              <p>No upcoming exams scheduled.</p>
              <button
                onClick={() => onNavigateTab('exams')}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
              >
                View datesheet →
              </button>
            </div>
          ) : (
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
                        Roadmap →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Notes List */}
        {activeTab === 'notes' && (
          recentMaterials.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2 rounded-lg border border-dashed border-slate-800 bg-slate-950/30">
              <FileText className="w-6 h-6 text-slate-600 mx-auto" />
              <p>No materials or notes uploaded yet.</p>
              <button
                onClick={() => onNavigateTab('dump')}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Upload notes →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {recentMaterials.map((mat) => (
                <div
                  key={mat.id}
                  onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('dump'))}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 group cursor-pointer hover:bg-slate-900/30 px-1.5 rounded transition"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <h3 className="text-sm font-medium text-slate-200 font-sans-ui group-hover:text-white transition truncate">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans-ui truncate">
                      {mat.subjectName} · {mat.unitTitle || (mat.unitNumber ? `Unit ${mat.unitNumber}` : 'General')} · Shared by {mat.uploaderName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {mat.fileType || 'pdf'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenMaterial) onOpenMaterial(mat);
                        else onNavigateTab('dump');
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-sans-ui font-medium"
                    >
                      View Output →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
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
