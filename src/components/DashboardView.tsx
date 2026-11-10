import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Search,
  MoreVertical,
  Activity,
  Heart,
  Moon,
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

  // Time Period Selector: Today vs Tomorrow vs Week
  const [timePeriod, setTimePeriod] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

  // Radar Chart Filter: Monthly vs Semester
  const [radarFilter, setRadarFilter] = useState<'Monthly' | 'Semester 4' | 'Unit Test'>('Monthly');
  const [isRadarDropdownOpen, setIsRadarDropdownOpen] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // AI Doubt Solver Input & Format
  const [aiDoubtInput, setAiDoubtInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'10-marker' | 'hinglish' | 'eli9' | 'deep'>('10-marker');

  // Drag-and-Drop File Widget State
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Helper calculations
  const calculateDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const overallProgressPercent = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 78;

  const nextClass = todayClasses[0] || tomorrowClasses[0] || {
    id: 'c-default',
    subjectName: 'Operating Systems',
    time: '10:00 AM - 11:00 AM',
    room: '302',
    teacherName: 'Dr. Sharma',
    day: 'Wednesday',
    likelyTopic: { title: 'Process Synchronization & Semaphores' },
  };

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

  // Dot matrix heatmap columns (7 days x 4 tracks)
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Active states for each day's 4 dots
  const dotMatrixData = [
    [true, true, true, false],
    [true, true, false, false],
    [true, true, true, true],
    [true, false, false, false],
    [true, true, true, false],
    [true, true, false, false],
    [true, true, true, true],
  ];

  // Monthly Bar Chart Data
  const monthlyChartBars = [
    { month: 'Jun', value: 45, isHatched: true },
    { month: 'Jul', value: 55, isHatched: true },
    { month: 'Aug', value: 65, isHatched: true },
    { month: 'Sept', value: 85, isDualActive: true },
    { month: 'Oct', value: 40, isHatched: true },
    { month: 'Nov', value: 60, isHatched: true },
    { month: 'Dec', value: 50, isHatched: true },
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in font-sans-ui text-slate-100">
      {/* ======================================================== */}
      {/* 1. TOP HEADER (Matching Image Lucas Bennett / Overview) */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        {/* Left: User Profile + Big Title */}
        <div className="space-y-1">
          {/* User Profile Thumbnail & Email/Class Row */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 border border-slate-700 p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-cyan-300">
                {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200">
                  {studentName || 'Lucas Bennett'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {classCode || 'BCA-2028'} • Sem {semesterNumber}
              </span>
            </div>
          </div>

          {/* Big Bold Headline (Matching "Health Overview") */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight pt-1">
            Academic Overview
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Take control of your semester today!
          </p>
        </div>

        {/* Right: Search + Notification Bell + Date Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
          {/* Pill Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search syllabus, notes..."
              className="w-full pl-8 pr-12 py-2 rounded-2xl bg-[#141926] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 placeholder-slate-500 outline-none transition shadow-inner"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              ⌘K
            </kbd>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => onNavigateTab('daily-update')}
            className="w-9 h-9 rounded-2xl bg-[#141926] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-center transition relative cursor-pointer shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#141926]" />
          </button>

          {/* Date & Period Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
              className="h-9 px-3.5 rounded-2xl bg-[#141926] border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="font-bold text-white capitalize">
                {timePeriod}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 animate-fade-in text-xs">
                {(['today', 'tomorrow', 'week'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setTimePeriod(period);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 transition capitalize flex items-center justify-between ${
                      timePeriod === period ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{period}</span>
                    {timePeriod === period && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. THE DASHBOARD CARDS GRID (Exact Layout from Image)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* ====================================================== */}
        {/* CARD 1: Attendance & Class Energy ("Energy Used" Card) */}
        {/* ====================================================== */}
        <div className="bg-[#121724] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition-all shadow-md flex flex-col justify-between space-y-4">
          {/* Card Title Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Attendance & Energy
              </h2>
            </div>
            <button className="text-slate-500 hover:text-slate-300 transition">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Big Stat + Pill Badge */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                84%
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                +5% Safe
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Monthly Lecture Attendance
            </p>
          </div>

          {/* OVERLAPPING VENN BUBBLES GRAPHIC (Matching the Image Circles) */}
          <div className="relative h-44 sm:h-48 flex items-center justify-center my-1 select-none">
            {/* Big Circle 1: Royal Violet (Topics Mastered) */}
            <div className="absolute left-4 sm:left-6 top-3 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-xl shadow-violet-950/50 z-10 hover:scale-105 transition-transform cursor-pointer">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
                48
              </span>
              <span className="text-[10px] font-medium text-violet-200">
                Mastered
              </span>
            </div>

            {/* Medium Circle 2: Dark Charcoal (Topics in progress) */}
            <div className="absolute right-4 sm:right-6 top-5 w-24 h-24 sm:w-26 sm:h-26 rounded-full bg-[#181d2a] border border-slate-700/80 text-white flex flex-col items-center justify-center shadow-xl z-20 hover:scale-105 transition-transform cursor-pointer">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100">
                12
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                In Progress
              </span>
            </div>

            {/* Small Accent Circle 3: Sunset Amber (Safe Bunks Left) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-xl shadow-orange-950/40 z-30 hover:scale-105 transition-transform cursor-pointer">
              <span className="text-base sm:text-lg font-black tracking-tight">
                3
              </span>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-950/90">
                Bunks Left
              </span>
            </div>
          </div>

          {/* 3 Progress Bars at Bottom (Matching Running / Workouts / Walking) */}
          <div className="space-y-3 pt-2 border-t border-slate-800/60 text-xs">
            {/* Row 1: Attended Lectures (Violet Bar) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white font-mono">45%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>Attended Lectures</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            {/* Row 2: Lab Practicals & Vivas (Dark Bar) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white font-mono">30%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>Lab Practicals & Vivas</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>

            {/* Row 3: Self-Study & AI Companion (Amber Bar) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white font-mono">25%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>Self-Study / AI Hub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* COLUMN 2: Stacked Cards (Heart Rate + Activity style)  */}
        {/* ====================================================== */}
        <div className="flex flex-col gap-5 justify-between">
          {/* CARD 2: Study Streak ("Heart Rate" style) */}
          <div className="bg-[#121724] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition-all shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                  Study Streak
                </h2>
              </div>
              <button className="text-slate-500 hover:text-slate-300 transition">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                  5
                </span>
                <span className="text-xs text-slate-400 font-medium ml-1.5">
                  Days
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Average</div>
                <div className="text-xs font-mono font-bold text-amber-400">4.8 Days</div>
              </div>
            </div>
          </div>

          {/* CARD 3: Next Lecture Spotlight ("Activity" style) */}
          <div className="bg-[#121724] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition-all shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                  Next Lecture
                </h2>
              </div>
              <button className="text-slate-500 hover:text-slate-300 transition">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  {nextClass.time.split(' - ')[0] || '10:00 AM'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Location</div>
                <div className="text-xs font-mono font-bold text-cyan-300">Room {nextClass.room}</div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/60">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {nextClass.subjectName}
              </div>
              <button
                onClick={onOpenTomorrowPrep}
                className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
              >
                <span>7-Min Prep</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Fast Doubt Solver Bar */}
          <div className="p-4 rounded-3xl bg-[#121724] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Class Brain Doubt Solver</span>
              </span>
              <button
                onClick={() => onNavigateTab('ai-tutor')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Open Tutor →
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskDoubt();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={aiDoubtInput}
                onChange={(e) => setAiDoubtInput(e.target.value)}
                placeholder="Ask any 10-marker exam question..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={!aiDoubtInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                Solve
              </button>
            </form>
          </div>
        </div>

        {/* ====================================================== */}
        {/* CARD 4: Class Mastery Index ("% Wellness Index" style) */}
        {/* ====================================================== */}
        <div className="bg-[#121724] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition-all shadow-md flex flex-col justify-between space-y-4">
          {/* Card Title Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-xs">
                %
              </div>
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Class Mastery Index
              </h2>
            </div>
            <button className="text-slate-500 hover:text-slate-300 transition">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Big Stat + Pill Badge */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                {overallProgressPercent}%
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-bold">
                +10%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Syllabus & Exam Prep Coverage
            </p>
          </div>

          {/* DOT MATRIX HEATMAP (Matching the Purple Dots Matrix in Image) */}
          <div className="py-2 space-y-2 select-none">
            <div className="flex justify-between items-center gap-2 px-1">
              {dotMatrixData.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-2 items-center">
                  {col.map((isActive, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-300 hover:scale-125 cursor-pointer ${
                        isActive
                          ? 'bg-violet-400 shadow-sm shadow-violet-500/60 ring-1 ring-violet-300/40'
                          : 'bg-slate-800/80 border border-slate-700/40 hover:bg-slate-700'
                      }`}
                      title={`${daysOfWeek[colIdx]}: Lecture Slot ${rowIdx + 1} - ${isActive ? 'Mastered' : 'Upcoming'}`}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                    {daysOfWeek[colIdx]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Mastery Strip */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Topics: {totalTopics || 60}</span>
            <button
              onClick={() => onNavigateTab('syllabus')}
              className="text-violet-400 hover:text-violet-300 font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <span>Syllabus Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ROW 2: DRAG & DROP VAULT + HIGH-CONTRAST RADAR CARD    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* ====================================================== */}
        {/* CARD 6: Drag & Drop File Vault Widget                  */}
        {/* ====================================================== */}
        <div
          onDragEnter={handleWidgetDragEnter}
          onDragOver={handleWidgetDragOver}
          onDragLeave={handleWidgetDragLeave}
          onDrop={handleWidgetDrop}
          className={`col-span-1 rounded-3xl p-5 sm:p-6 transition-all duration-200 shadow-md flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
            isWidgetDragging
              ? 'bg-cyan-950/40 border-2 border-dashed border-cyan-400 ring-4 ring-cyan-500/20 scale-[1.01]'
              : 'bg-[#121724] border border-slate-800/80 hover:border-slate-700'
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

          {/* Title Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Drag & Drop Vault
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('dump')}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              Open Vault →
            </button>
          </div>

          {/* Interactive Drop Surface */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 group ${
              isWidgetDragging
                ? 'border-cyan-400 bg-cyan-500/20 shadow-inner'
                : 'border-slate-800 hover:border-cyan-500/50 bg-[#0d111a] hover:bg-slate-900'
            }`}
          >
            {isProcessingFile ? (
              <div className="py-2 space-y-1.5 text-center animate-fade-in">
                <Sparkles className="w-5 h-5 text-cyan-400 mx-auto animate-spin" />
                <div className="text-xs font-bold text-cyan-300">
                  Analyzing {droppedFileName || 'File'} with AI...
                </div>
                <div className="text-[10px] text-slate-400">
                  Extracting Timetable, Syllabus, or 10-Marker Notes
                </div>
              </div>
            ) : isWidgetDragging ? (
              <div className="py-2 space-y-1 text-center animate-fade-in">
                <UploadCloud className="w-6 h-6 text-cyan-300 mx-auto animate-bounce" />
                <div className="text-xs font-bold text-cyan-300">
                  Drop your file now!
                </div>
              </div>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                  Drag & drop study files here
                </div>
                <p className="text-[11px] text-slate-400">
                  or <span className="text-cyan-400 underline underline-offset-2">browse files</span>
                </p>
                <div className="flex gap-1 pt-0.5">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">PDF</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">DOCX</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">PPTX</span>
                </div>
              </>
            )}
          </div>

          {/* Recent Files In Vault shelf */}
          {recentMaterials.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Files ({recentMaterials.length})</span>
                <span className="text-cyan-400 cursor-pointer" onClick={() => onNavigateTab('dump')}>View →</span>
              </div>
              <div className="space-y-1">
                {recentMaterials.slice(0, 2).map((mat) => (
                  <div
                    key={mat.id}
                    onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('dump'))}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <span className="truncate text-[11px] font-medium text-slate-200">{mat.title}</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-cyan-300 shrink-0">
                      {mat.fileType || 'pdf'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================== */}
        {/* CARD 5: Semester Exam Radar (The Dark Card from Image!)*/}
        {/* ====================================================== */}
        <div className="col-span-1 lg:col-span-2 bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 transition-all shadow-xl flex flex-col justify-between space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Exam & Attendance Radar
              </h2>
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRadarDropdownOpen((prev) => !prev)}
                className="h-8 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>{radarFilter}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isRadarDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-32 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs">
                  {(['Monthly', 'Semester 4', 'Unit Test'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setRadarFilter(opt);
                        setIsRadarDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 transition ${
                        radarFilter === opt ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub-Metrics Row (Matching 85% Sleep Efficiency | 7h 15m in Image) */}
          <div className="grid grid-cols-2 gap-4 py-1">
            {/* Metric 1: Amber Bar + 85% */}
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-10 rounded-full bg-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                  85%
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Attendance Safety Buffer
                </div>
              </div>
            </div>

            {/* Metric 2: Violet/Cyan Bar + 12d 4h */}
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-10 rounded-full bg-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                  12d 4h
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Next Exam: OS Theory
                </div>
              </div>
            </div>
          </div>

          {/* VISUAL BAR CHART (Matching the Striped/Hatched + Solid Active Bars) */}
          <div className="pt-2 select-none overflow-x-auto no-scrollbar">
            <div className="min-w-[320px] flex items-end justify-between gap-3 h-32 pb-1 border-b border-slate-800/80 px-2">
              {monthlyChartBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* The Bar */}
                  <div className="w-full flex items-end justify-center h-24">
                    {bar.isDualActive ? (
                      /* Active Dual Bars (Standing Tall in Amber + Cyan!) */
                      <div className="flex items-end gap-1.5 h-full">
                        <div
                          className="w-3 sm:w-3.5 bg-amber-400 rounded-t-lg shadow-md shadow-amber-500/40 transition-all duration-300 group-hover:scale-y-105"
                          style={{ height: '90%' }}
                        />
                        <div
                          className="w-3 sm:w-3.5 bg-cyan-400 rounded-t-lg shadow-md shadow-cyan-500/40 transition-all duration-300 group-hover:scale-y-105"
                          style={{ height: '70%' }}
                        />
                      </div>
                    ) : (
                      /* Inactive / Hatched Bar */
                      <div
                        className="w-5 sm:w-6 rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                        style={{
                          height: `${bar.value}%`,
                          backgroundColor: '#161d2d',
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    )}
                  </div>

                  {/* Month Label with Arrow for Active */}
                  <span
                    className={`text-[10px] font-mono transition-colors ${
                      bar.isDualActive
                        ? 'text-white font-bold flex items-center gap-0.5'
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    <span>{bar.month}</span>
                    {bar.isDualActive && <span className="text-[9px] text-amber-400">↗</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
