import React, { useState, useEffect } from 'react';
import { Subject } from '../types';
import { ActiveNavTab } from './Sidebar';
import {
  Trophy,
  Zap,
  TrendingUp,
  Download,
  Flame,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Layers,
  IndianRupee,
  DollarSign,
  ShieldCheck,
  Search,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';

interface KnowledgeDashboardProps {
  subjects?: Subject[];
  onOpenTopic?: (topicTitle: string, subjectName?: string) => void;
  studentName?: string;
  classCode?: string;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

interface CacheStatsData {
  totalLearnedItems: number;
  cohortPerfectedCount: number;
  totalHits: number;
  estimatedTokensSaved: number;
  topTopics: { query: string; hitCount: number; perfectionTier: string }[];
  subjectBreakdown: { subjectName: string; topicCount: number; totalHits: number }[];
  recentlyPerfected: { query: string; perfectedAt: string }[];
  estimatedMoneySaved: number;
  lastUpdated: string;
}

export const KnowledgeDashboard: React.FC<KnowledgeDashboardProps> = ({
  subjects = [],
  onOpenTopic,
  studentName,
  classCode,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ai/cache/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to fetch cache stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async (subjectName = '') => {
    try {
      setIsExporting(subjectName || 'all');
      const url = subjectName && subjectName !== 'all'
        ? `/api/ai/cache/export?subjectName=${encodeURIComponent(subjectName)}`
        : `/api/ai/cache/export`;
      
      let markdownContent = '';
      try {
        const res = await fetch(url);
        if (res.ok) {
          markdownContent = await res.text();
        }
      } catch {}

      if (!markdownContent || markdownContent.includes('{"error"')) {
        // Safe offline generation fallback
        const targetSubjects = subjectName && subjectName !== 'all'
          ? subjects.filter(s => s.name.toLowerCase().includes(subjectName.toLowerCase()))
          : subjects;
        markdownContent = `# ${subjectName || classCode || 'M2029'} — Study Pack & Class Intelligence\n\n`;
        markdownContent += `> Generated for ${studentName || 'Student'} · ${new Date().toLocaleDateString()}\n\n---\n\n`;
        targetSubjects.forEach((sub, sIdx) => {
          markdownContent += `## ${sIdx + 1}. ${sub.name} (${sub.code})\n`;
          markdownContent += `- **Faculty Professor:** ${sub.teacherName || 'Faculty In-Charge'}\n`;
          markdownContent += `- **Total Units:** ${sub.totalUnits || 4} Units\n`;
          markdownContent += `- **Mastery Progress:** ${sub.completedTopicsCount || 0}/${sub.totalTopicsCount || 0} Topics (${sub.totalTopicsCount ? Math.round(((sub.completedTopicsCount || 0) / sub.totalTopicsCount) * 100) : 0}%)\n\n`;
        });
      }

      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${(subjectName || 'Cohort-Curriculum').replace(/\s+/g, '_')}-Class-Study-Pack.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const totalCompletedTopics = subjects.reduce((acc, s) => acc + (s.completedTopicsCount || 0), 0);
  const totalTopics = subjects.reduce((acc, s) => acc + (s.totalTopicsCount || 0), 0);
  const perfectedCount = stats?.cohortPerfectedCount ?? totalCompletedTopics;
  const learnedCount = stats?.totalLearnedItems ?? totalTopics;
  const hitsCount = stats?.totalHits ?? (totalCompletedTopics > 0 ? totalCompletedTopics * 6 : 0);

  const completionPercent = learnedCount > 0
    ? Math.min(100, Math.round((perfectedCount / learnedCount) * 100))
    : 0;

  // INR equivalent (approx 85 INR per USD)
  const inrSaved = stats ? Math.round(stats.estimatedMoneySaved * 85) : 0;

  const filteredTopics = (stats?.topTopics || []).filter((t) => {
    const matchesSubject = selectedSubject === 'all' || (t as any).subjectName?.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchesSearch = !searchQuery.trim() ||
      t.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.perfectionTier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. TOP HEADER (Matching reference design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('settings') : undefined}
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
            Class Brain
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative w-40 sm:w-52">
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-cyan-400 cursor-pointer transition"
              title="Search Topics"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          {/* Subject Filter Dropdown */}
          {subjects.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className="h-8 px-3 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <span className="max-w-[100px] truncate">
                  {selectedSubject === 'all'
                    ? 'All Subjects'
                    : subjects.find((s) => s.name === selectedSubject)?.name || selectedSubject}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedSubject('all');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 cursor-pointer"
                  >
                    All Subjects
                  </button>
                  {subjects.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubject(sub.name);
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 truncate cursor-pointer"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="h-8 w-8 rounded-xl bg-[#141926] border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Export Button */}
          <button
            onClick={() => handleExport(selectedSubject !== 'all' ? selectedSubject : '')}
            disabled={isExporting !== null}
            className="h-8 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (.md)</span>
          </button>
        </div>
      </div>

      {/* 2. 3-COLUMN CARDS GRID (Matching reference design) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: Mastered Topics Overview */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Mastered Topics</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
              {completionPercent}% Perfect
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {perfectedCount}
              </span>
              <span className="text-xs text-slate-400">
                / {learnedCount} Learned
              </span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-40 flex items-center justify-center my-1 select-none">
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('all');
                setSearchQuery('');
              }}
              title="Show All Mastered Topics"
              className="absolute left-6 top-2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-lg font-extrabold">{perfectedCount}</span>
              <span className="text-[10px] text-violet-200">Mastered</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              title="Filter by Subject"
              className="absolute right-6 top-4 w-20 h-20 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-base font-extrabold">{subjects.length}</span>
              <span className="text-[10px] text-slate-400">Subjects</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport(selectedSubject !== 'all' ? selectedSubject : '')}
              title="Export Class Study Pack"
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-sm font-black">{hitsCount}</span>
              <span className="text-[8px] uppercase tracking-wider">Hits</span>
            </button>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
            <div
              onClick={() => {
                setSelectedSubject('all');
                setSearchQuery('');
              }}
              className="space-y-1 cursor-pointer hover:opacity-85 transition group"
              title="Click to reset filters and view full cohort progress"
            >
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">Cohort Mastery</span>
                <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{completionPercent}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Top Class Topics List */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100">Top Class Questions</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              By Demand
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 no-scrollbar">
            {filteredTopics.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                <Trophy className="w-6 h-6 text-slate-600" />
                <span>No topics queried yet</span>
              </div>
            ) : (
              filteredTopics.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenTopic && onOpenTopic(item.query)}
                  className="p-3 rounded-2xl bg-[#0d111a] border border-slate-800/80 hover:border-slate-700 transition text-xs space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-white truncate">{item.query}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold shrink-0">
                      {item.hitCount} asks
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="truncate">{item.perfectionTier}</span>
                    <span className="text-cyan-400 font-bold">Open →</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-1 text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Click any question to open its master answer
            </span>
          </div>
        </div>

        {/* CARD 3: Token Savings & Multi-Model Intel (The Dark Accent Card) */}
        <div className="bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Class Intelligence</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-bold">
              0 Tokens
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={fetchStats}
              className="flex items-start gap-2 text-left p-1 rounded-xl hover:bg-slate-900/60 transition cursor-pointer"
              title="Click to refresh cached query count"
            >
              <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">{hitsCount}</div>
                <div className="text-[10px] text-slate-400">Queries Saved ↻</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleExport(selectedSubject !== 'all' ? selectedSubject : '')}
              className="flex items-start gap-2 text-left p-1 rounded-xl hover:bg-slate-900/60 transition cursor-pointer"
              title="Click to export savings and class intelligence study pack"
            >
              <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">₹{inrSaved || 0}</div>
                <div className="text-[10px] text-slate-400">Money Saved ↓</div>
              </div>
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-56 pr-1 no-scrollbar text-xs">
            <div className="p-3 rounded-2xl bg-[#121724] border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase">Architecture</span>
              <div className="text-xs text-slate-300 font-medium">
                60-Student Compounded Cache
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#121724] border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase">Multi-Model Failover</span>
              <div className="text-xs text-slate-300">
                Gemini · Claude · GPT-4o · DeepSeek
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[10px]">Zero API Rate Limits</span>
            <span className="text-emerald-400 font-bold text-[10px]">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
