import React, { useState } from 'react';
import {
  TimetableClass,
  ExamDateSheetItem,
  AcademicMaterial,
  ClassAnnouncement,
  Subject,
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
  GitBranch,
} from 'lucide-react';
import { ActiveNavTab } from './Sidebar';

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
  onOpenTomorrowPrep: () => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onTriggerQuickAIAction: (actionType: string) => void;
  calmMode?: boolean;
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
  onOpenTomorrowPrep,
  onNavigateTab,
  onTriggerQuickAIAction,
  calmMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'exams' | 'notes'>('schedule');
  const [searchPrompt, setSearchPrompt] = useState('');

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

  // Find the single immediate class
  const nextClass = todayClasses[0] || tomorrowClasses[0];

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8 animate-fade-in">
      {/* 1. Serene, Uncrowded Greeting */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100">
            {getGreeting()}, {studentName}
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Semester {semesterNumber} · {classCode} · {todayClasses.length} lectures today
          </p>
        </div>

        {/* Quiet, Single-Line Search Bar */}
        <form onSubmit={handleQuickSearch} className="relative pt-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-5" />
          <input
            type="text"
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
            placeholder="Type any syllabus topic to study (e.g., Normalization, Deadlocks, Pointers)..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-24 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
          />
          <button
            type="submit"
            className="absolute right-2 top-3.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer"
          >
            Study Topic
          </button>
        </form>
      </div>

      {/* 2. Today's Primary Focus (One single card, zero clutter) */}
      {nextClass && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Upcoming Lecture
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {nextClass.time} · {nextClass.room}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-100">
              {nextClass.subjectName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Teacher: {nextClass.teacherName} {nextClass.likelyTopic && `· Topic: ${nextClass.likelyTopic.title}`}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onOpenTomorrowPrep}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <span>7-Min Pre-Class Prep</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('ai-tutor')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Ask AI Teacher
            </button>
          </div>
        </div>
      )}

      {/* 3. Calm Minimal Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 font-medium transition cursor-pointer relative ${
              activeTab === 'schedule'
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today's Classes ({todayClasses.length})
            {activeTab === 'schedule' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-2.5 font-medium transition cursor-pointer relative ${
              activeTab === 'exams'
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming Exams ({upcomingExams.length})
            {activeTab === 'exams' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 font-medium transition cursor-pointer relative ${
              activeTab === 'notes'
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Class Notes ({recentMaterials.length})
            {activeTab === 'notes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Schedule List */}
        {activeTab === 'schedule' && (
          <div className="divide-y divide-slate-800/50">
            {todayClasses.map((cls) => (
              <div
                key={cls.id}
                className="py-3.5 flex items-center justify-between gap-4 first:pt-0"
              >
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    {cls.subjectName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cls.time} · {cls.room} · {cls.teacherName}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('ai-tutor')}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Study Notes →
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
                  className="py-3.5 flex items-center justify-between gap-4 first:pt-0"
                >
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">
                      {ex.subjectName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(ex.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {ex.time} · {ex.examType}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      {daysLeft} days left
                    </span>
                    <button
                      onClick={() => onNavigateTab('exams')}
                      className="text-xs text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                    >
                      Plan →
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
                className="py-3.5 flex items-center justify-between gap-4 first:pt-0"
              >
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {mat.subjectName} · Shared by {mat.uploaderName}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('materials')}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  Open →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Quiet Announcement (Optional, unboxed) */}
      {announcements.length > 0 && !calmMode && (
        <div className="pt-4 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
          <div className="text-slate-300 font-medium">
            Class Notice: {announcements[0].title}
          </div>
          <p className="leading-relaxed text-slate-400">
            {announcements[0].content}
          </p>
        </div>
      )}

      {/* 5. Publish to GitHub Card */}
      <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-200 font-medium block">
            Publish Class Knowledge Base to GitHub
          </span>
          <span className="text-slate-400 text-[11px]">
            AI extracts instructor details, schedule & units into a ready-to-commit README.md & repo package.
          </span>
        </div>
        <button
          onClick={() => onNavigateTab('github-publish')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export for GitHub</span>
        </button>
      </div>
    </div>
  );
};
