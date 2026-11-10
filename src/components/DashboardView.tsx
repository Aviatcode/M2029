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
  Calendar,
  FileText,
  Bell,
  ShieldCheck,
  UploadCloud,
  Check,
  Trash2,
  Sparkles,
  ListTodo,
  StickyNote,
  Trophy,
  Zap,
  Flame,
  CheckCircle2,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ActiveNavTab } from './Sidebar';
import {
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../utils/notificationService';

export interface DashboardViewProps {
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
  onAskAI?: (prompt: string) => void;
  onFilesDropped?: (files: File[]) => void;
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
  onOpenMaterial,
  onOpenOnboardingUpload,
  onAskAI,
  onFilesDropped,
}) => {
  // Real-time live clock
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dedicated Drag-and-Drop File Widget State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isWidgetDragging, setIsWidgetDragging] = useState(false);
  const [droppedFileName, setDroppedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleWidgetDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWidgetDragging(true);
  };

  const handleWidgetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isWidgetDragging) setIsWidgetDragging(true);
  };

  const handleWidgetDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsWidgetDragging(false);
  };

  const handleWidgetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWidgetDragging(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setDroppedFileName(files[0].name);
      setIsProcessingFile(true);
      setTimeout(() => setIsProcessingFile(false), 2500);
      if (onFilesDropped) {
        onFilesDropped(files);
      } else {
        onNavigateTab('dump');
      }
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setDroppedFileName(files[0].name);
      setIsProcessingFile(true);
      setTimeout(() => setIsProcessingFile(false), 2500);
      if (onFilesDropped) {
        onFilesDropped(files);
      } else {
        onNavigateTab('dump');
      }
    }
  };

  // Class Schedule Tab: Today vs Tomorrow
  const [scheduleDayTab, setScheduleDayTab] = useState<'today' | 'tomorrow'>('today');

  // AI Doubt Solver Input & Format
  const [aiDoubtInput, setAiDoubtInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'10-marker' | 'hinglish' | 'eli9' | 'deep'>('10-marker');

  // Attendance Check-in State (persisted locally)
  const [attendedClassIds, setAttendedClassIds] = useState<string[]>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`attended_classes_${todayStr}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleClassAttendance = (classId: string) => {
    setAttendedClassIds((prev) => {
      const next = prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId];
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem(`attended_classes_${todayStr}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Scratchpad & Quick Tasks (M2028 Inspired)
  const [scratchpadTab, setScratchpadTab] = useState<'tasks' | 'notes'>('tasks');
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
      { id: 'todo-1', text: 'Get lab practical record verified by prof', completed: false },
      { id: 'todo-2', text: 'Revise 10-marker Section C blueprint questions', completed: false },
      { id: 'todo-3', text: 'Review 3 bunkable attendance safety buffer', completed: true },
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

  const handleAddQuickTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newTodoInput.trim();
    if (!text) return;
    setQuickTodos((prev) => [...prev, { id: `todo-${Date.now()}`, text, completed: false }]);
    setNewTodoInput('');
  };

  const handleToggleQuickTodo = (id: string) => {
    setQuickTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleDeleteQuickTodo = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompletedTodos = () => {
    setQuickTodos((prev) => prev.filter((t) => !t.completed));
  };

  // Notification status
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermission());
  const handleAllowNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  // Helper calculations
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

  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const overallProgressPercent = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  const activeClasses = scheduleDayTab === 'today' ? todayClasses : tomorrowClasses;
  const nextClass = todayClasses[0] || tomorrowClasses[0];

  const pendingAssignments = assignments.filter(
    (a) => !a.completed && calculateDaysLeft(a.dueDate) >= 0 && calculateDaysLeft(a.dueDate) <= 14
  );

  // Submit AI Doubt
  const handleAskDoubt = (promptText?: string) => {
    const query = (promptText || aiDoubtInput).trim();
    if (!query) return;

    let formatSuffix = '';
    if (selectedFormat === '10-marker') {
      formatSuffix = ' Format strictly as university 10-marker exam answer with architecture diagram, steps, and key points.';
    } else if (selectedFormat === 'hinglish') {
      formatSuffix = ' Explain in easy Hinglish with relatable college analogies.';
    } else if (selectedFormat === 'eli9') {
      formatSuffix = ' Explain like I am 9 years old using everyday intuitive examples.';
    } else if (selectedFormat === 'deep') {
      formatSuffix = ' Provide deep technical breakdown with architecture, internals, and traps.';
    }

    const fullPrompt = `${query}${formatSuffix}`;
    if (onAskAI) {
      onAskAI(fullPrompt);
    } else {
      onTriggerQuickAIAction('explain');
      onNavigateTab('ai-tutor');
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12 font-sans-ui">
      {/* ======================================================== */}
      {/* 1. M2028-STYLE HERO HEADER ROW                           */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 sm:p-5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 shadow-xs">
        {/* Left: Greeting & Academic Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              Sem {semesterNumber} · {classCode}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-400">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-xs text-slate-300">
              {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>{getGreeting(currentTime)}, {studentName}</span>
            <span className="text-emerald-400 text-lg">✦</span>
          </h1>

          <p className="text-xs text-slate-400 font-normal">
            {todayClasses.length} {todayClasses.length === 1 ? 'lecture' : 'lectures'} scheduled today · {totalCompletedTopics}/{totalTopics || 0} syllabus topics mastered
          </p>
        </div>

        {/* Right: M2028 Streak Pill + 75% Attendance Safeguard */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Study Streak Pill */}
          <div
            onClick={() => onNavigateTab('knowledge-dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer shadow-2xs group"
            title="Class Compounding Intelligence Streak"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
            <span>5-Day Study Streak</span>
            <ChevronRight className="w-3 h-3 text-amber-400/80" />
          </div>

          {/* 75% Attendance Safeguard Pill */}
          <div
            onClick={() => onNavigateTab('daily-update')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer shadow-2xs group"
            title="75% Attendance Safeguard (3 Bunks Left)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
            <span>84.0% Attendance Safe</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
              3 bunks left
            </span>
          </div>
        </div>
      </div>

      {/* Announcements Dispatch Bar (if any) */}
      {announcements.length > 0 && !calmMode && (
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </span>
            <div className="truncate">
              <span className="font-semibold text-white mr-1.5">Class Dispatch:</span>
              <span className="text-slate-300">{announcements[0].title}</span>
              <span className="text-slate-400 hidden sm:inline ml-1.5">— {announcements[0].content}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('daily-update')}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 shrink-0 cursor-pointer"
          >
            View All →
          </button>
        </div>
      )}

      {/* Notification Permission Prompt */}
      {notifPermission === 'default' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Bell className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Enable smart lecture and deadline alerts so you never miss Section C exam prep.</span>
          </div>
          <button
            onClick={handleAllowNotifications}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            Enable Alerts
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. THE 3-COLUMN SIDE-BY-SIDE WIDGETS GRID (M2028 STYLE) */}
      {/* 3 Widgets Side-by-Side on Desktop, Responsive Stack     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {/* ====================================================== */}
        {/* COLUMN 1: Today's Classes & Daily Pulse                */}
        {/* ====================================================== */}
        <div className="space-y-5">
          {/* WIDGET 1A: Class Schedule & Next Lecture */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-4">
            {/* Widget Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui">
                  Lectures & Schedule
                </h2>
              </div>

              {/* Day Switcher Toggle: Today vs Tomorrow */}
              <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setScheduleDayTab('today')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    scheduleDayTab === 'today'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Today ({todayClasses.length})
                </button>
                <button
                  onClick={() => setScheduleDayTab('tomorrow')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    scheduleDayTab === 'tomorrow'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tomorrow ({tomorrowClasses.length})
                </button>
              </div>
            </div>

            {/* Next Lecture Spotlight Card */}
            {nextClass && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-950 border border-emerald-500/30 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Next Lecture
                  </span>
                  <span className="font-mono text-slate-300 font-medium">
                    {nextClass.time} · Room {nextClass.room}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {nextClass.subjectName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prof. {nextClass.teacherName}
                    {nextClass.likelyTopic && (
                      <span className="text-slate-300"> · {nextClass.likelyTopic.title}</span>
                    )}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    onClick={onOpenTomorrowPrep}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>7-Min Primer</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onAskAI) onAskAI(`Explain core exam concepts of ${nextClass.subjectName} simply.`);
                      else onNavigateTab('ai-tutor');
                    }}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Study with AI →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Lecture Schedule List */}
            {activeClasses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 space-y-2 rounded-xl border border-dashed border-slate-800 bg-slate-950/30">
                <Calendar className="w-5 h-5 text-slate-600 mx-auto" />
                <p>No lectures scheduled for {scheduleDayTab}.</p>
                <button
                  onClick={() => onNavigateTab('timetable')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
                >
                  View full weekly timetable →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  All Scheduled Lectures ({activeClasses.length})
                </div>
                <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto no-scrollbar">
                  {activeClasses.map((cls) => {
                    const isAttended = attendedClassIds.includes(cls.id);
                    return (
                      <div
                        key={cls.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs first:pt-0 group hover:bg-slate-900/40 px-1 rounded-lg transition"
                      >
                        <div className="space-y-0.5 truncate flex-1 min-w-0">
                          <div className="font-semibold text-slate-200 truncate group-hover:text-white transition">
                            {cls.subjectName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            <span>{cls.time}</span>
                            <span className="text-slate-600">·</span>
                            <span>Rm {cls.room}</span>
                            <span className="text-slate-600">·</span>
                            <span className="truncate">{cls.teacherName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {scheduleDayTab === 'today' && (
                            <button
                              onClick={() => toggleClassAttendance(cls.id)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isAttended
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                              title={isAttended ? 'Attended (Click to undo)' : 'Mark attended'}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (onAskAI) onAskAI(`Revise 10-marker Section C questions for ${cls.subjectName}`);
                              else onNavigateTab('ai-tutor');
                            }}
                            className="text-[11px] font-medium text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            Study →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timetable Bottom Action Link */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Weekly schedule synced</span>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <span>Full Timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* WIDGET 1B: 75% Attendance Safeguard & Daily Pulse */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui">
                  Attendance Safeguard
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('daily-update')}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>1-Tap Pulse</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Attendance Score Bar */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400">Monthly Attendance</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">84.0%</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Safe (+9.0% Buffer)
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">3 bunkable classes left</div>
                </div>
              </div>

              {/* Visual meter */}
              <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: '84%' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Required: 75% for Exam Hall Ticket</span>
              <span className="font-mono text-emerald-300 font-bold">✓ Hall Ticket Eligible</span>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* COLUMN 2: Collective Class Brain & AI Study Companion  */}
        {/* ====================================================== */}
        <div className="space-y-5">
          {/* WIDGET 2A: Collective Class Brain & Doubt Solver */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-4">
            {/* Widget Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui flex items-center gap-1.5">
                    <span>Collective Class Brain</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      60 Peers
                    </span>
                  </h2>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('ai-tutor')}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>AI Tutor</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Compounding Callout Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-950 border border-amber-500/20 space-y-1">
              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>1 Call → Cached Forever for All 60 Students</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Core university topics automatically perfected to Section C 10-marker exam rubric. 0 tokens wasted!
              </p>
            </div>

            {/* Interactive Doubt Ask Box */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant Exam Doubt Solver
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskDoubt();
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={aiDoubtInput}
                    onChange={(e) => setAiDoubtInput(e.target.value)}
                    placeholder="Ask any exam question or topic doubt..."
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition pr-20"
                  />
                  <button
                    type="submit"
                    disabled={!aiDoubtInput.trim()}
                    className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      aiDoubtInput.trim()
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Solve</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>

                {/* Format Selector Pills (M2028-inspired) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('10-marker')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      selectedFormat === '10-marker'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    🎯 10-Marker
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('hinglish')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      selectedFormat === 'hinglish'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    🗣️ Hinglish
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('eli9')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      selectedFormat === 'eli9'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    💡 ELI9
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('deep')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      selectedFormat === 'deep'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    🔬 Deep Dive
                  </button>
                </div>
              </form>
            </div>

            {/* High-Yield 1-Click Exam Doubts */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Trending High-Yield Doubts (Class Cache)
              </div>
              <div className="space-y-1.5">
                {[
                  'Process vs Thread difference with memory diagram',
                  'Normalization (1NF to BCNF) with anomaly examples',
                  'Dijkstra shortest path algorithm dry run',
                ].map((doubt, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAskDoubt(doubt)}
                    className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 text-[11px] text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <span className="truncate">⚡ {doubt}</span>
                    <span className="text-[10px] font-mono text-amber-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                      View Answer →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compounding Live Stats Bar */}
            <div className="pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Tokens Saved</div>
                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">320,000+</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Master Topics</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">48/60</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Cost to Peers</div>
                <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">₹0 Forever</div>
              </div>
            </div>
          </div>

          {/* WIDGET 2B: Syllabus Horizon & Completion Map */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui">
                  Syllabus Horizon
                </h2>
              </div>

              <button
                onClick={() => onNavigateTab('syllabus')}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View Map</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Overall Syllabus Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Semester Progress</span>
                <span className="font-mono font-bold text-cyan-400">{overallProgressPercent}% Complete</span>
              </div>
              <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, overallProgressPercent))}%` }}
                />
              </div>
            </div>

            {/* Subject List */}
            {subjects.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {subjects.map((sub) => {
                  const subPercent =
                    sub.totalTopicsCount > 0
                      ? Math.round((sub.completedTopicsCount / sub.totalTopicsCount) * 100)
                      : 0;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => onNavigateTab('syllabus')}
                      className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">
                          {sub.code || 'CRS'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-300 font-bold">
                          {subPercent}%
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {sub.name}
                      </div>

                      <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 group-hover:bg-cyan-300 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(4, subPercent))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{sub.totalUnits} Units</span>
                        <span>{sub.completedTopicsCount}/{sub.totalTopicsCount} Topics Mastered</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-2 rounded-xl border border-dashed border-slate-800">
                <BookOpen className="w-5 h-5 text-slate-600 mx-auto" />
                <p>No subjects loaded yet.</p>
                {onOpenOnboardingUpload && (
                  <button
                    onClick={onOpenOnboardingUpload}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
                  >
                    Upload syllabus PDF with AI →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====================================================== */}
        {/* COLUMN 3: Tasks, Exam Radar & Study Vault              */}
        {/* ====================================================== */}
        <div className="space-y-5">
          {/* WIDGET 3A: Daily Scratchpad & Quick Tasks (M2028 Inspired) */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-3.5">
            {/* Widget Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                  <ListTodo className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui">
                  Tasks & Scratchpad
                </h2>
              </div>

              {/* Segmented Switch: Tasks vs Notes */}
              <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setScratchpadTab('tasks')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    scratchpadTab === 'tasks'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListTodo className="w-3 h-3" />
                  <span>Tasks ({quickTodos.filter((t) => !t.completed).length})</span>
                </button>
                <button
                  onClick={() => setScratchpadTab('notes')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    scratchpadTab === 'notes'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  <span>Notes</span>
                </button>
              </div>
            </div>

            {/* Tasks View */}
            {scratchpadTab === 'tasks' ? (
              <div className="space-y-2.5">
                {/* To-Do Items List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {quickTodos.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 text-center italic">
                      No pending tasks! Add one below.
                    </div>
                  ) : (
                    quickTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-slate-950/50 hover:bg-slate-900 border border-slate-800/60 transition group text-xs"
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

                {/* Inline Fast Add */}
                <form onSubmit={handleAddQuickTodo} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="+ Add quick task..."
                    value={newTodoInput}
                    onChange={(e) => setNewTodoInput(e.target.value)}
                    className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!newTodoInput.trim()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      newTodoInput.trim()
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Add
                  </button>
                </form>

                {quickTodos.some((t) => t.completed) && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleClearCompletedTodos}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer underline underline-offset-4"
                    >
                      Clear completed
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Freeform Notes Pad */
              <div className="space-y-2">
                <textarea
                  value={scratchpadNotes}
                  onChange={(e) => setScratchpadNotes(e.target.value)}
                  placeholder="Type anything freely: professor notices, formulas, exam tips... (Auto-saved locally)"
                  rows={5}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
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

          {/* WIDGET 3B: Upcoming Exams & Deadlines Radar */}
          <div className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui">
                  Exam Radar & Deadlines
                </h2>
              </div>

              <button
                onClick={() => onNavigateTab('exams')}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Datesheet</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Exams Countdown List */}
            {upcomingExams.length > 0 ? (
              <div className="space-y-2">
                {upcomingExams.slice(0, 3).map((ex) => {
                  const daysLeft = calculateDaysLeft(ex.date);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => onNavigateTab('exams')}
                      className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">
                          {ex.subjectName}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            daysLeft <= 3
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-850 text-slate-300 border border-slate-750'
                          }`}
                        >
                          {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                        <span>{new Date(ex.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ex.time}</span>
                        <span className="text-slate-500">{ex.examType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500 italic">
                No upcoming exams scheduled.
              </div>
            )}

            {/* Pending Assignments */}
            {pendingAssignments.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Pending Assignments ({pendingAssignments.length})
                </div>
                {pendingAssignments.slice(0, 2).map((a) => {
                  const days = calculateDaysLeft(a.dueDate);
                  return (
                    <div
                      key={a.id}
                      onClick={() => onNavigateTab('assignments')}
                      className="p-2 rounded-lg bg-slate-950/50 hover:bg-slate-900 border border-slate-800/60 text-xs flex items-center justify-between gap-2 cursor-pointer transition group"
                    >
                      <div className="truncate">
                        <div className="font-medium text-slate-200 group-hover:text-white truncate">{a.title}</div>
                        <div className="text-[10px] text-slate-400">{a.subjectName}</div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                        {days === 0 ? 'Today' : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WIDGET 3C: Drag & Drop File Vault (Interactive Ingestion Widget) */}
          <div
            onDragEnter={handleWidgetDragEnter}
            onDragOver={handleWidgetDragOver}
            onDragLeave={handleWidgetDragLeave}
            onDrop={handleWidgetDrop}
            className={`border rounded-2xl p-4.5 sm:p-5 transition-all duration-200 shadow-sm space-y-3.5 relative overflow-hidden ${
              isWidgetDragging
                ? 'bg-cyan-950/40 border-2 border-dashed border-cyan-400 ring-4 ring-cyan-500/20 scale-[1.01]'
                : 'bg-slate-900/50 hover:bg-slate-900/70 border-slate-800/80 hover:border-slate-700/80'
            }`}
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
              className="hidden"
              onChange={handleManualFileSelect}
            />

            {/* Widget Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans-ui flex items-center gap-1.5">
                    <span>Drag & Drop File Vault</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      AI Ingest
                    </span>
                  </h2>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('dump')}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Open Vault</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* The Interactive Drag & Drop Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                isWidgetDragging
                  ? 'border-cyan-400 bg-cyan-500/20 shadow-inner'
                  : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/70 hover:bg-slate-950'
              }`}
            >
              {isProcessingFile ? (
                <div className="py-2 space-y-2 text-center animate-fade-in">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto animate-pulse">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-cyan-300">
                      Analyzing {droppedFileName || 'File'} with AI...
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Auto-detecting Timetable, Syllabus, or Lecture Notes
                    </div>
                  </div>
                </div>
              ) : isWidgetDragging ? (
                <div className="py-2 space-y-1 text-center animate-fade-in">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center mx-auto animate-bounce">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-cyan-300">
                    Drop your file here!
                  </div>
                  <div className="text-[10px] text-cyan-400/80">
                    AI will automatically classify and extract syllabus topics
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 border border-cyan-500/25 group-hover:border-cyan-500/40 text-cyan-400 flex items-center justify-center transition group-hover:scale-105">
                    <UploadCloud className="w-4.5 h-4.5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white transition">
                      Drag & drop study files here
                    </div>
                    <p className="text-[11px] text-slate-400">
                      or <span className="text-cyan-400 underline underline-offset-2 font-medium">browse from device</span>
                    </p>
                  </div>

                  {/* Supported Formats & AI Features */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                      PDF
                    </span>
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                      DOCX
                    </span>
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                      PPTX
                    </span>
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                      Images
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Smart AI Detection Guide */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-400">
                <span className="block font-bold text-slate-300">📅 Timetable</span>
                <span>Auto-slots</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-400">
                <span className="block font-bold text-slate-300">📚 Syllabus</span>
                <span>Unit breakdown</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-400">
                <span className="block font-bold text-slate-300">📝 Notes</span>
                <span>10-Marker output</span>
              </div>
            </div>

            {/* Recent Uploaded Materials Shelf */}
            {recentMaterials.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Files In Vault ({recentMaterials.length})</span>
                  <span className="text-[10px] text-cyan-400 cursor-pointer" onClick={() => onNavigateTab('dump')}>View all →</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {recentMaterials.slice(0, 3).map((mat) => (
                    <div
                      key={mat.id}
                      onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('dump'))}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="truncate flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {mat.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {mat.subjectName} · {mat.unitTitle || (mat.unitNumber ? `Unit ${mat.unitNumber}` : 'General')}
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {mat.fileType || 'pdf'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
