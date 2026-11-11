import React, { useState, useEffect } from 'react';
import { Subject } from '../types';
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
} from 'lucide-react';

interface KnowledgeDashboardProps {
  subjects?: Subject[];
  onOpenTopic?: (topicTitle: string, subjectName?: string) => void;
  studentName?: string;
  classCode?: string;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

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
      
      const res = await fetch(url);
      if (!res.ok) {
        alert('No perfected topics available to export yet. Keep learning!');
        return;
      }

      const blob = await res.blob();
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
      alert('Failed to export study pack.');
    } finally {
      setIsExporting(null);
    }
  };

  const completionPercent = stats && stats.totalLearnedItems > 0
    ? Math.min(100, Math.round((stats.cohortPerfectedCount / stats.totalLearnedItems) * 100))
    : 0;

  // INR equivalent (approx 85 INR per USD)
  const inrSaved = stats ? Math.round(stats.estimatedMoneySaved * 85) : 0;

  const filteredTopics = (stats?.topTopics || []).filter((t) =>
    !searchQuery.trim() ||
    t.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.perfectionTier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. TOP HEADER (Matching reference design) */}
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
            Class Brain
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

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
                {stats?.cohortPerfectedCount || 0}
              </span>
              <span className="text-xs text-slate-400">
                / {stats?.totalLearnedItems || 0} Learned
              </span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-40 flex items-center justify-center my-1">
            <div className="absolute left-6 top-2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10">
              <span className="text-lg font-extrabold">{stats?.cohortPerfectedCount || 48}</span>
              <span className="text-[10px] text-violet-200">Gold</span>
            </div>
            <div className="absolute right-6 top-4 w-20 h-20 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20">
              <span className="text-base font-extrabold">60</span>
              <span className="text-[10px] text-slate-400">Students</span>
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold">
              <span className="text-sm font-black">0</span>
              <span className="text-[8px] uppercase tracking-wider">Tokens</span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono">Cohort Mastery</span>
                <span className="text-slate-400">{completionPercent}%</span>
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
            <div className="flex items-start gap-2">
              <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">{stats?.totalHits || 0}</div>
                <div className="text-[10px] text-slate-400">Queries Saved</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">₹{inrSaved || 0}</div>
                <div className="text-[10px] text-slate-400">Class Money Saved</div>
              </div>
            </div>
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
