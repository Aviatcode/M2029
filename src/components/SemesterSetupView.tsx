import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  FileCheck2,
  Sliders,
  CheckCircle2,
  Users,
  ArrowRight,
  FolderOpen,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { ClassWorkspace, Subject } from '../types/index';
import { ActiveNavTab } from './Sidebar';
import {
  shareClassInvite,
  openWhatsAppInvite,
} from '../utils/classManager';

interface SemesterSetupViewProps {
  workspace: ClassWorkspace;
  subjects: Subject[];
  onOpenClassSetup: () => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onOpenInvite?: () => void;
  onAddRecommendedSubjects?: () => void;
}

export const SemesterSetupView: React.FC<SemesterSetupViewProps> = ({
  workspace,
  subjects,
  onOpenClassSetup,
  onNavigateTab,
  onOpenInvite,
  onAddRecommendedSubjects,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastText, setToastText] = useState('');

  const displayCode = (workspace.code || 'BCA-2028').trim().toUpperCase();
  const className = workspace.name || 'BCA 2028';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopiedCode(true);
      setToastText('✓ Class code copied to clipboard');
      setTimeout(() => {
        setCopiedCode(false);
        setToastText('');
      }, 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareInvite = async () => {
    if (onOpenInvite) {
      onOpenInvite();
      return;
    }
    const res = await shareClassInvite(className, displayCode);
    if (res.method === 'clipboard') {
      setToastText('✓ 2-liner invite copied to clipboard');
      setTimeout(() => setToastText(''), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12 font-sans-ui text-slate-100">
      {/* Toast Notification */}
      {toastText && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium shadow-md">
          {toastText}
        </div>
      )}

      {/* Class Overview Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 shadow-sm backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
            <GraduationCap className="w-6 h-6 text-slate-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {className}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold">
                Semester {workspace.semester || 1}
              </span>
            </div>
            {/* Class Code Pill */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs font-bold">
                <Users className="w-3 h-3 text-slate-400" />
                <span>Code:</span>
                <span className="text-white tracking-wider">{displayCode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
                title="Copy code"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleShareInvite}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Classmates</span>
          </button>
          <button
            type="button"
            onClick={onOpenClassSetup}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure</span>
          </button>
        </div>
      </div>

      {/* Enrolled Subjects Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Enrolled Subjects ({subjects.length})</span>
          </h2>
          {subjects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('syllabus')}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>Syllabus Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {subjects.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6 space-y-3">
            <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-200">No subjects configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Load your semester subjects to start organizing notes and preparing for exams.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onAddRecommendedSubjects}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Load BCA Semester 1 Subjects</span>
              </button>
              <button
                type="button"
                onClick={onOpenClassSetup}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Subjects</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((subj) => (
              <div
                key={subj.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-slate-100 group-hover:text-white transition-colors truncate">
                      {subj.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono">{subj.code}</span>
                      <span>•</span>
                      <span>{subj.credits || 4} Credits</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 text-[10px]">
                    {subj.completedTopicsCount || 0}/{subj.totalTopicsCount || 10} topics
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('materials')}
                      className="text-slate-400 hover:text-white transition inline-flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>Notes</span>
                    </button>
                    <span className="text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('syllabus')}
                      className="text-slate-400 hover:text-white transition inline-flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <span>Syllabus</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards (Simplified) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigateTab('timetable')}
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 text-left transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-white transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                Timetable
              </div>
              <div className="text-[11px] text-slate-400">
                Weekly schedule & lecture slots
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('assignments')}
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 text-left transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-white transition">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                Assignments
              </div>
              <div className="text-[11px] text-slate-400">
                Pending tasks & deadlines
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
