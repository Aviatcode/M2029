import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Calendar,
  FileCheck2,
  Sliders,
  CheckCircle2,
  Users,
  Building,
  ArrowRight,
  ExternalLink,
  FolderOpen,
  Copy,
  Check,
  Share2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ClassWorkspace, Subject } from '../types/index';
import { ActiveNavTab } from './Sidebar';
import {
  getTwoLineInviteMessage,
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
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [toastText, setToastText] = useState('');

  const displayCode = (workspace.code || 'BCA-2028').trim().toUpperCase();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopiedCode(true);
      setToastText('✓ Class code copied!');
      setTimeout(() => {
        setCopiedCode(false);
        setToastText('');
      }, 2500);
    } catch {}
  };

  const handleShareInvite = async () => {
    if (onOpenInvite) {
      onOpenInvite();
      return;
    }
    const res = await shareClassInvite(workspace.name, displayCode);
    if (res.method === 'clipboard') {
      setCopiedMessage(true);
      setToastText('✓ 2-liner invite copied to clipboard!');
      setTimeout(() => {
        setCopiedMessage(false);
        setToastText('');
      }, 2500);
    }
  };

  const handleShareWhatsApp = () => {
    openWhatsAppInvite(workspace.name, displayCode);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastText && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium shadow-md">
          {toastText}
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 md:p-6 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-slate-100 shrink-0">
            <GraduationCap className="w-6 h-6 text-slate-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-semibold text-slate-100 font-sans tracking-tight">
                Semester Setup & Cohort
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Curriculum structure and enrolled subjects.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleShareInvite}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Classmates</span>
          </button>
          <button
            onClick={onOpenClassSetup}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-100 border border-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-300" />
            <span>Edit Setup</span>
          </button>
        </div>
      </div>

      {/* Cohort Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Class Code Card - Bold, unmasked, Google Classroom style */}
        <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Class Code
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Copy class code"
              aria-label="Copy class code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-lg font-bold text-white mt-1 font-mono tracking-wider truncate select-all">
            {displayCode}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-1 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="truncate">{workspace.name || 'BCA Batch'}</span>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <button
                onClick={handleShareInvite}
                className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer font-medium"
                title="Copy direct 2-liner invite"
              >
                {copiedMessage ? 'Copied' : 'Invite'}
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={handleShareWhatsApp}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-medium"
                title="Share 2-liner to WhatsApp"
              >
                WA
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/30">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            Semester
          </div>
          <div className="text-base font-semibold text-slate-100 mt-1">
            Semester {workspace.semester}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Academic Year {workspace.academicYear || '2026-2027'}
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/30">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            University
          </div>
          <div className="text-base font-semibold text-slate-100 mt-1 truncate">
            {workspace.university || 'Affiliated University'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Verified Syllabus
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/30">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            CR Verification
          </div>
          <div className="text-base font-semibold text-emerald-300 mt-1 truncate flex items-center gap-1">
            <span>{workspace.crName || 'Class Representative'}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
            {workspace.crRollNo || 'CR-Verified'}
          </div>
        </div>
      </div>

      {/* Enrolled Subjects Section */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Enrolled Subjects ({subjects.length})
            </h2>
            <p className="text-xs text-slate-400">
              Active modules configured for this semester cohort.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('syllabus')}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition cursor-pointer font-sans-ui"
          >
            <span>View Syllabus Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.length === 0 ? (
            <div className="col-span-full py-8 text-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-6 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-medium text-slate-300">No subjects configured yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Configure your semester subjects to unlock syllabus mind maps, notes segregation, and exam prep.
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700 shadow-sm transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Semester Subjects</span>
                </button>
              </div>
            </div>
          ) : (
            subjects.map((subj) => (
              <div
                key={subj.id}
                className="p-3.5 rounded-lg border border-slate-800/70 bg-slate-950/40 hover:border-slate-700/80 transition flex flex-col justify-between gap-3 group"
              >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {subj.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono">{subj.code}</span>
                      <span>•</span>
                      <span>{subj.credits} Credits</span>
                      {subj.teacherName && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{subj.teacherName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress and Actions */}
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {subj.completedTopicsCount}/{subj.totalTopicsCount || 12} topics covered
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateTab('materials')}
                    className="text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                    title="View Notes & Materials"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Notes</span>
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    onClick={() => onNavigateTab('syllabus')}
                    className="text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                    title="View Syllabus"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Syllabus</span>
                  </button>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateTab('timetable')}
          className="p-4 rounded-xl border border-slate-800/70 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700 text-left transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                Cohort Timetable
              </div>
              <div className="text-[11px] text-slate-400">
                View weekly lecture slots and lab timings
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={() => onNavigateTab('assignments')}
          className="p-4 rounded-xl border border-slate-800/70 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700 text-left transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                Semester Assignments
              </div>
              <div className="text-[11px] text-slate-400">
                Track pending submissions and lab records
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
