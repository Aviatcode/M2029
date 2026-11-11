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
  Bell,
  UploadCloud,
  Check,
  Trophy,
  Zap,
  Flame,
  ChevronDown,
  Search,
  MoreVertical,
  TrendingUp,
  Play,
} from 'lucide-react';
import { ActiveNavTab } from './Sidebar';

export interface DashboardViewProps {
  studentName: string;
  classCode: string;
  semesterNumber: number;
  todayClasses: TimetableClass[];
  tomorrowClasses: TimetableClass[];
  timetable?: TimetableClass[];
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
  onOpenNotifications?: () => void;
  onOpenVideoTutorial?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  studentName,
  classCode,
  semesterNumber,
  todayClasses,
  tomorrowClasses,
  timetable = [],
  upcomingExams,
  recentMaterials,
  subjects,
  onOpenTomorrowPrep,
  onNavigateTab,
  onOpenMaterial,
  onFilesDropped,
  onOpenNotifications,
  onOpenVideoTutorial,
}) => {
  const [timePeriod, setTimePeriod] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [radarFilter, setRadarFilter] = useState<'Monthly' | 'Semester'>('Monthly');
  const [isRadarDropdownOpen, setIsRadarDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag-and-Drop File State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isWidgetDragging, setIsWidgetDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleWidgetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWidgetDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setIsProcessingFile(true);
      setTimeout(() => setIsProcessingFile(false), 2000);
      if (onFilesDropped) onFilesDropped(files);
      else onNavigateTab('dump');
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsProcessingFile(true);
      setTimeout(() => setIsProcessingFile(false), 2000);
      if (onFilesDropped) onFilesDropped(files);
      else onNavigateTab('materials');
    }
  };

  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const overallProgressPercent = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  // Active lecture based on selected time period
  const activeClass =
    timePeriod === 'today'
      ? todayClasses[0] || {
          id: 'c-none',
          subjectName: 'No upcoming class today',
          time: '--:--',
          room: '--',
        }
      : timePeriod === 'tomorrow'
      ? tomorrowClasses[0] || {
          id: 'c-none',
          subjectName: 'No classes scheduled tomorrow',
          time: '--:--',
          room: '--',
        }
      : timetable[0] || todayClasses[0] || tomorrowClasses[0] || {
          id: 'c-none',
          subjectName: 'Weekly schedule ready',
          time: '--:--',
          room: '--',
        };

  const weekClassesCount = timetable.length > 0 ? timetable.length : todayClasses.length + tomorrowClasses.length;

  // Dynamic Streak Calculation
  const studyStreak = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('m2029_study_streak');
      if (stored) return parseInt(stored, 10);
    } catch {}
    return recentMaterials.length > 0 || totalCompletedTopics > 0 ? Math.min(7, Math.max(1, recentMaterials.length + 1)) : 1;
  }, [recentMaterials.length, totalCompletedTopics]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onNavigateTab('materials');
    }
  };

  // Dot matrix heatmap (7 days x 4 tracks)
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dotMatrixData = [
    [true, true, true, false],
    [true, true, false, false],
    [true, true, true, true],
    [true, false, false, false],
    [true, true, true, false],
    [true, true, false, false],
    [true, true, true, true],
  ];

  // Bar Chart Data for Monthly vs Semester
  const monthlyChartBars = [
    { label: 'Jun', value: 45, isHatched: true },
    { label: 'Jul', value: 55, isHatched: true },
    { label: 'Aug', value: 65, isHatched: true },
    { label: 'Sept', value: 85, isDualActive: true },
    { label: 'Oct', value: 40, isHatched: true },
    { label: 'Nov', value: 60, isHatched: true },
    { label: 'Dec', value: 50, isHatched: true },
  ];

  const semesterChartBars = [
    { label: 'W1-2', value: 35, isHatched: true },
    { label: 'W3-4', value: 50, isHatched: true },
    { label: 'W5-6', value: 65, isHatched: true },
    { label: 'Mid-Sem', value: 90, isDualActive: true },
    { label: 'W9-10', value: 55, isHatched: true },
    { label: 'W11-12', value: 70, isHatched: true },
    { label: 'End-Sem', value: 85, isHatched: true },
  ];

  const activeChartBars = radarFilter === 'Monthly' ? monthlyChartBars : semesterChartBars;

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. MINIMAL TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="flex items-center gap-2 mb-1 group cursor-pointer text-left focus:outline-none"
            title="Manage Profile & Settings"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 group-hover:border-cyan-500 transition-colors">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
              • {classCode || 'BCA-2028'}
            </span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Academic Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-44 sm:w-56">
            <button
              type="button"
              onClick={() => {
                if (searchQuery.trim()) onNavigateTab('materials');
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-cyan-400 cursor-pointer transition"
              title="Search Materials"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          <button
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
              else onNavigateTab('daily-update');
            }}
            title="Notifications"
            className="w-8 h-8 rounded-xl bg-[#141926] border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center relative cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>

          {onOpenVideoTutorial && (
            <button
              onClick={onOpenVideoTutorial}
              className="h-8 px-2.5 sm:px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-xs text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs shadow-cyan-500/10"
              title="Watch Video Tutorial"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
              className="h-8 px-3 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer capitalize font-semibold"
            >
              <span>{timePeriod}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isPeriodDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs">
                {(['today', 'tomorrow', 'week'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setTimePeriod(p);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 capitalize cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. DASHBOARD CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: Attendance ("Energy Used" style) */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Attendance</h2>
            </div>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="text-slate-600 hover:text-cyan-400 transition cursor-pointer p-1 rounded-lg hover:bg-slate-900"
              title="View Attendance in Timetable"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {overallProgressPercent > 0 ? `${overallProgressPercent}%` : subjects.length > 0 ? `${subjects.length} Subs` : '0%'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                {subjects.length > 0 ? 'Active' : 'Empty'}
              </span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-44 flex items-center justify-center my-1 select-none">
            <button
              type="button"
              onClick={() => onNavigateTab('knowledge-dashboard')}
              title="Explore Mastered Topics in Class Brain"
              className="absolute left-6 top-3 w-28 h-28 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-xl font-extrabold">{totalCompletedTopics}</span>
              <span className="text-[10px] text-violet-200">Topics</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('timetable')}
              title="View Subjects & Weekly Schedule"
              className="absolute right-6 top-5 w-24 h-24 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-lg font-extrabold">{subjects.length}</span>
              <span className="text-[10px] text-slate-400">Subjects</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('materials')}
              title="Open Study Materials Vault"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-base font-black">{recentMaterials.length}</span>
              <span className="text-[9px] uppercase tracking-wider">Docs</span>
            </button>
          </div>

          {/* 3 Progress Bars */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/60 text-xs">
            <div
              onClick={() => onNavigateTab('knowledge-dashboard')}
              className="space-y-1 cursor-pointer hover:opacity-85 transition group"
              title="Click to view Syllabus Breakdown"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">{overallProgressPercent}%</span>
                <span className="text-slate-400 flex items-center gap-1.5 group-hover:text-slate-200 transition-colors">
                  Syllabus <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${overallProgressPercent}%` }} />
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('materials')}
              className="space-y-1 cursor-pointer hover:opacity-85 transition group"
              title="Click to view Materials Vault"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
                  {recentMaterials.length > 0 ? `${Math.min(100, recentMaterials.length * 15)}%` : '0%'}
                </span>
                <span className="text-slate-400 flex items-center gap-1.5 group-hover:text-slate-200 transition-colors">
                  Materials <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full"
                  style={{ width: `${Math.min(100, recentMaterials.length * 15)}%` }}
                />
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('exams')}
              className="space-y-1 cursor-pointer hover:opacity-85 transition group"
              title="Click to view Exam Radar"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
                  {upcomingExams.length > 0 ? `${upcomingExams.length} Exams` : '0 Exams'}
                </span>
                <span className="text-slate-400 flex items-center gap-1.5 group-hover:text-slate-200 transition-colors">
                  Exam Radar <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${Math.min(100, upcomingExams.length * 33)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Stacked Cards (Heart Rate + Activity style) */}
        <div className="flex flex-col gap-5 justify-between">
          {/* CARD 2: Streak */}
          <div
            onClick={() => onNavigateTab('ai-tutor')}
            className="bg-[#121724] border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2 cursor-pointer transition"
            title="Study with AI Tutor to extend streak"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100">Study Streak</h2>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateTab('ai-tutor');
                }}
                className="text-slate-600 hover:text-amber-400 transition cursor-pointer p-1 rounded-lg hover:bg-slate-900"
                title="Open AI Tutor"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-white">{studyStreak}</span>
                <span className="text-xs text-slate-400 ml-1">Days</span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold">Avg {(studyStreak * 0.9).toFixed(1)}d</span>
            </div>
          </div>

          {/* CARD 3: Next Lecture */}
          <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  {timePeriod === 'today' ? "Today's Lecture" : timePeriod === 'tomorrow' ? "Tomorrow's Lecture" : 'Weekly Schedule'}
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-slate-600 hover:text-cyan-400 transition cursor-pointer p-1 rounded-lg hover:bg-slate-900"
                title="View Weekly Schedule"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {timePeriod === 'week'
                  ? `${weekClassesCount} Classes`
                  : activeClass.time && activeClass.time !== '--:--'
                  ? activeClass.time.split(' - ')[0]
                  : 'Free Period'}
              </span>
              <span className="text-xs font-mono text-cyan-300">
                {timePeriod === 'week' ? 'Mon – Sat' : activeClass.room !== '--' ? `Room ${activeClass.room}` : 'Campus'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-300 truncate">
                {timePeriod === 'week' ? `${subjects.length} active subjects` : activeClass.subjectName}
              </span>
              <button
                onClick={timePeriod === 'week' ? () => onNavigateTab('timetable') : onOpenTomorrowPrep}
                className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>{timePeriod === 'week' ? 'Schedule' : 'Prep'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 4: Mastery Index ("% Wellness Index" style) */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-slate-100">Syllabus Progress</h2>
            </div>
            <button
              onClick={() => onNavigateTab('knowledge-dashboard')}
              className="text-slate-600 hover:text-violet-400 transition cursor-pointer p-1 rounded-lg hover:bg-slate-900"
              title="Explore Class Brain"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white">{overallProgressPercent}%</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-bold">+10%</span>
            </div>
          </div>

          {/* Dot Matrix Heatmap */}
          <div className="py-2 select-none">
            <div className="flex justify-between items-center gap-2 px-1">
              {dotMatrixData.map((col, colIdx) => (
                <button
                  key={colIdx}
                  type="button"
                  onClick={() => onNavigateTab('timetable')}
                  title={`View schedule for ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][colIdx]}`}
                  className="flex flex-col gap-2 items-center group cursor-pointer p-1 rounded-xl hover:bg-slate-850/60 transition"
                >
                  {col.map((isActive, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`w-3.5 h-3.5 rounded-full transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'bg-violet-400 shadow-sm shadow-violet-500/60'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-300 transition-colors mt-1">
                    {daysOfWeek[colIdx]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW 2: DRAG & DROP VAULT + RADAR CHART CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* CARD 6: Minimal Drag & Drop Vault */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsWidgetDragging(true);
          }}
          onDragLeave={() => setIsWidgetDragging(false)}
          onDrop={handleWidgetDrop}
          className={`col-span-1 rounded-3xl p-5 transition-all shadow-sm flex flex-col justify-between space-y-3 ${
            isWidgetDragging
              ? 'bg-cyan-950/30 border-2 border-dashed border-cyan-400 scale-[1.01]'
              : 'bg-[#121724] border border-slate-800/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
            className="hidden"
            onChange={handleManualFileSelect}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Files Vault</h2>
            </div>
            <button
              onClick={() => onNavigateTab('materials')}
              className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              Open →
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/40 bg-[#0d111a] cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 transition"
          >
            {isProcessingFile ? (
              <span className="text-xs text-cyan-300 font-bold">Processing...</span>
            ) : isWidgetDragging ? (
              <span className="text-xs text-cyan-300 font-bold">Drop files here</span>
            ) : (
              <>
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Drop files here</span>
                <span className="text-[10px] text-slate-500 font-mono">PDF • DOCX • PPTX</span>
              </>
            )}
          </div>

          {recentMaterials.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              {recentMaterials.slice(0, 2).map((mat) => (
                <div
                  key={mat.id}
                  onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('materials'))}
                  className="p-1.5 rounded-lg bg-slate-900 text-xs flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate text-[11px] text-slate-300">{mat.title}</span>
                  <span className="text-[9px] font-mono text-cyan-400">{mat.fileType || 'pdf'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 5: Minimal Exam Radar Chart (The Dark Card) */}
        <div className="col-span-1 lg:col-span-2 bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Study Activity</h2>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsRadarDropdownOpen((prev) => !prev)}
                className="h-7 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <span>{radarFilter}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isRadarDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-28 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs">
                  {(['Monthly', 'Semester'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setRadarFilter(opt);
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub-Metrics: Exam Readiness | Study Volume */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onNavigateTab('exams')}
              className="flex items-start gap-2 text-left p-1 rounded-xl hover:bg-slate-900/60 transition cursor-pointer"
              title="Open Exam Datesheet"
            >
              <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">
                  {upcomingExams.length > 0 ? `${overallProgressPercent}%` : subjects.length > 0 ? '100%' : '0%'}
                </div>
                <div className="text-[10px] text-slate-400">Exam Readiness →</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('ai-tutor')}
              className="flex items-start gap-2 text-left p-1 rounded-xl hover:bg-slate-900/60 transition cursor-pointer"
              title="Open AI Tutor to study"
            >
              <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">
                  {totalCompletedTopics > 0 ? `${Math.round(totalCompletedTopics * 1.5)}h` : '0h'}
                </div>
                <div className="text-[10px] text-slate-400">Weekly Study →</div>
              </div>
            </button>
          </div>

          {/* Bar Chart */}
          <div className="pt-2 select-none overflow-x-auto no-scrollbar">
            <div className="min-w-[280px] flex items-end justify-between gap-3 h-28 border-b border-slate-800/80 px-2 pb-1">
              {activeChartBars.map((bar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onNavigateTab('ai-tutor')}
                  className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                  title={`${bar.label}: ${bar.value}% activity (Click to study)`}
                >
                  <div className="w-full flex items-end justify-center h-20">
                    {bar.isDualActive ? (
                      <div className="flex items-end gap-1 h-full group-hover:scale-105 transition-transform">
                        <div className="w-3 bg-amber-400 rounded-t-lg shadow-sm shadow-amber-500/40" style={{ height: '90%' }} />
                        <div className="w-3 bg-cyan-400 rounded-t-lg shadow-sm shadow-cyan-500/40" style={{ height: '70%' }} />
                      </div>
                    ) : (
                      <div
                        className="w-4 rounded-t-lg group-hover:brightness-125 transition"
                        style={{
                          height: `${bar.value}%`,
                          backgroundColor: '#161d2d',
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono group-hover:text-cyan-300 transition-colors ${bar.isDualActive ? 'text-white font-bold' : 'text-slate-500'}`}>
                    {bar.label}{bar.isDualActive ? ' ↗' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
