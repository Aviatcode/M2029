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
} from 'lucide-react';
import { ActiveNavTab } from './Sidebar';

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
  subjects,
  onOpenTomorrowPrep,
  onNavigateTab,
  onOpenMaterial,
  onFilesDropped,
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
      else onNavigateTab('dump');
    }
  };

  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const overallProgressPercent = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 78;

  const nextClass = todayClasses[0] || tomorrowClasses[0] || {
    id: 'c-default',
    subjectName: 'Operating Systems',
    time: '10:00 AM',
    room: '302',
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
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. MINIMAL TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              • {classCode || 'BCA-2028'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Academic Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          <button
            onClick={() => onNavigateTab('daily-update')}
            className="w-8 h-8 rounded-xl bg-[#141926] border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center relative cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>

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
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 capitalize"
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
            <button className="text-slate-600 hover:text-slate-400">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">84%</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">+5%</span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-44 flex items-center justify-center my-1">
            <div className="absolute left-6 top-3 w-28 h-28 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10">
              <span className="text-xl font-extrabold">48</span>
              <span className="text-[10px] text-violet-200">Topics</span>
            </div>

            <div className="absolute right-6 top-5 w-24 h-24 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20">
              <span className="text-lg font-extrabold">12</span>
              <span className="text-[10px] text-slate-400">Active</span>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold">
              <span className="text-base font-black">3</span>
              <span className="text-[9px] uppercase tracking-wider">Bunks</span>
            </div>
          </div>

          {/* 3 Progress Bars */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/60 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono">45%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  Classes <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono">30%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  Labs <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono">25%</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  Study <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Stacked Cards (Heart Rate + Activity style) */}
        <div className="flex flex-col gap-5 justify-between">
          {/* CARD 2: Streak */}
          <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100">Study Streak</h2>
              </div>
              <button className="text-slate-600 hover:text-slate-400">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-white">5</span>
                <span className="text-xs text-slate-400 ml-1">Days</span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold">Avg 4.8d</span>
            </div>
          </div>

          {/* CARD 3: Next Lecture */}
          <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">Next Lecture</h2>
              </div>
              <button className="text-slate-600 hover:text-slate-400">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {nextClass.time ? nextClass.time.split(' - ')[0] : '10:00 AM'}
              </span>
              <span className="text-xs font-mono text-cyan-300">Room {nextClass.room}</span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-300 truncate">{nextClass.subjectName}</span>
              <button
                onClick={onOpenTomorrowPrep}
                className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>Prep</span>
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
            <button className="text-slate-600 hover:text-slate-400">
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
                <div key={colIdx} className="flex flex-col gap-2 items-center">
                  {col.map((isActive, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`w-3.5 h-3.5 rounded-full ${
                        isActive
                          ? 'bg-violet-400 shadow-sm shadow-violet-500/60'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-slate-500 mt-1">{daysOfWeek[colIdx]}</span>
                </div>
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
              onClick={() => onNavigateTab('dump')}
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
                  onClick={() => (onOpenMaterial ? onOpenMaterial(mat) : onNavigateTab('dump'))}
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
                className="h-7 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{radarFilter}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isRadarDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-24 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs">
                  {(['Monthly', 'Semester'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setRadarFilter(opt);
                        setIsRadarDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub-Metrics: 85% | 14h */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">85%</div>
                <div className="text-[10px] text-slate-400">Exam Readiness</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">14h</div>
                <div className="text-[10px] text-slate-400">Weekly Study</div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="pt-2 select-none overflow-x-auto no-scrollbar">
            <div className="min-w-[280px] flex items-end justify-between gap-3 h-28 border-b border-slate-800/80 px-2 pb-1">
              {monthlyChartBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-20">
                    {bar.isDualActive ? (
                      <div className="flex items-end gap-1 h-full">
                        <div className="w-3 bg-amber-400 rounded-t-lg" style={{ height: '90%' }} />
                        <div className="w-3 bg-cyan-400 rounded-t-lg" style={{ height: '70%' }} />
                      </div>
                    ) : (
                      <div
                        className="w-4 rounded-t-lg"
                        style={{
                          height: `${bar.value}%`,
                          backgroundColor: '#161d2d',
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono ${bar.isDualActive ? 'text-white font-bold' : 'text-slate-500'}`}>
                    {bar.month}{bar.isDualActive ? ' ↗' : ''}
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
