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
} from 'lucide-react';

interface KnowledgeDashboardProps {
  subjects?: Subject[];
  onOpenTopic?: (topicTitle: string, subjectName?: string) => void;
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
}) => {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight font-sans-ui">
                Class Collective Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Zero-Token Knowledge Bank · 60-Student Compounding Master Solutions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport(selectedSubject !== 'all' ? selectedSubject : '')}
            disabled={isExporting !== null}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : '⬇️ Export Perfected Notes (.md)'}</span>
          </button>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mastered Lessons */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/90 border border-indigo-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono font-medium text-indigo-300">Perfected Topics</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans-ui">
              {stats?.cohortPerfectedCount || 0}
            </span>
            <span className="text-xs text-slate-400">/ {stats?.totalLearnedItems || 0} learned</span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Cohort Mastery</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total Zero-Token Queries Served */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/90 border border-emerald-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono font-medium text-emerald-300">Total Class Queries</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans-ui">
              {stats?.totalHits || 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium">0ms Cache Recalls</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Every hit served immediately with 0 tokens spent.
          </p>
        </div>

        {/* Card 3: Tokens Saved */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/90 border border-amber-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono font-medium text-amber-300">Tokens Saved</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans-ui">
              {stats?.estimatedTokensSaved
                ? stats.estimatedTokensSaved >= 1_000_000
                  ? `${(stats.estimatedTokensSaved / 1_000_000).toFixed(2)}M`
                  : stats.estimatedTokensSaved >= 1000
                  ? `${(stats.estimatedTokensSaved / 1000).toFixed(1)}k`
                  : stats.estimatedTokensSaved
                : 0}
            </span>
            <span className="text-xs text-slate-400">Tokens</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Calculated against single-query standard runs.
          </p>
        </div>

        {/* Card 4: Cost Saved */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900/60 to-slate-900/90 border border-rose-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono font-medium text-rose-300">API Budget Saved</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans-ui">
              ₹{inrSaved}
            </span>
            <span className="text-xs text-slate-400">(${stats?.estimatedMoneySaved || 0} USD)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Gemini 3.8 Flash benchmark tier ($0.75/1M).
          </p>
        </div>
      </div>

      {/* 3. The 60-Student Compounding Intelligence Model Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-950/20 to-emerald-500/10 border border-amber-500/30 p-5 shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm sm:text-base font-bold text-amber-200">
            How Cohort Compounding Intelligence Works
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="font-mono text-amber-300 font-bold">1. Student 1–2 (Draft)</span>
            <p className="text-slate-300">
              Initial query synthesizes foundational definitions and core problem statements.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="font-mono text-indigo-300 font-bold">2. Students 3–15 (Intuition)</span>
            <p className="text-slate-300">
              Vivid everyday analogies, Hinglish mental models, and ASCII diagrams are synthesized.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="font-mono text-blue-300 font-bold">3. Students 16–45 (Exam Hardened)</span>
            <p className="text-slate-300">
              Section C 10-marker answer blueprint, working code, and examiner traps are integrated.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">4. Student 60 (Gold Standard)</span>
            <p className="text-slate-300">
              Answer is permanently locked as the cohort Master standard. 0 tokens forever.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Two Columns: Top 10 Most-Asked Topics & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Top 10 Topics */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm sm:text-base text-slate-100 font-sans-ui">
                Top 10 Most-Asked Topics in Class
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Ranked by Class Demand</span>
          </div>

          <div className="space-y-2">
            {stats?.topTopics && stats.topTopics.length > 0 ? (
              stats.topTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 transition group cursor-pointer"
                  onClick={() => onOpenTopic && onOpenTopic(item.query)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
                        {item.query}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.perfectionTier}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-semibold">
                      {item.hitCount} asks
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No classroom topics queried yet. Start asking questions in AI Tutor!
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Subject Breakdown & Recently Perfected Feed */}
        <div className="space-y-6">
          {/* Subject Breakdown Card */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-100 font-sans-ui">
                Subject Breakdown
              </h3>
            </div>

            <div className="space-y-3">
              {stats?.subjectBreakdown && stats.subjectBreakdown.length > 0 ? (
                stats.subjectBreakdown.map((sub, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate pr-2">{sub.subjectName}</span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {sub.topicCount} topics · {sub.totalHits} hits
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (sub.totalHits / (stats?.totalHits || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No subject statistics recorded yet.</p>
              )}
            </div>
          </div>

          {/* Recently Perfected Feed */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100 font-sans-ui">
                Recently Perfected by Class
              </h3>
            </div>

            <div className="space-y-2">
              {stats?.recentlyPerfected && stats.recentlyPerfected.length > 0 ? (
                stats.recentlyPerfected.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs flex items-center justify-between gap-2 hover:border-amber-500/30 transition cursor-pointer"
                    onClick={() => onOpenTopic && onOpenTopic(item.query)}
                  >
                    <span className="text-slate-200 truncate">{item.query}</span>
                    <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                      ✓ Gold Standard
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Class has not yet perfected new topics.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

