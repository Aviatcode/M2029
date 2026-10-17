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
  KeyRound,
} from 'lucide-react';
import { ClassWorkspace, Subject } from '../types/index';
import { ActiveNavTab } from './Sidebar';

interface SemesterSetupViewProps {
  workspace: ClassWorkspace;
  subjects: Subject[];
  onOpenClassSetup: () => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
}

export const SemesterSetupView: React.FC<SemesterSetupViewProps> = ({
  workspace,
  subjects,
  onOpenClassSetup,
  onNavigateTab,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workspace.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#class=${workspace.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#class=${workspace.code}`;
    const text = `Join our ${workspace.name} on SyllabusOS!\nClass Code: ${workspace.code}\nDirect Join Link: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
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
              Curriculum structure, enrolled subjects, and Class Representative authentication.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenClassSetup}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-100 border border-slate-700 text-xs font-medium transition cursor-pointer shrink-0 shadow-2xs"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-300" />
          <span>Edit Semester Setup</span>
        </button>
      </div>

      {/* Google Classroom-style Class Code & Invite Share Center */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/20 p-5 md:p-6 backdrop-blur-md shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                <KeyRound className="w-3 h-3" />
                Google Classroom Style Code
              </span>
              <span className="text-xs text-slate-400">• Unique Cohort Key</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mt-1.5 flex items-center gap-2 flex-wrap">
              Class Invite Code:
              <span className="font-mono text-cyan-300 bg-slate-950 border border-cyan-500/40 px-3 py-1 rounded-xl tracking-wider select-all font-bold">
                {workspace.code}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Give this unique code to students to join your classroom. Entering this code on login or opening the invite link connects their dashboard, notes, and timetable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer"
              title="Share invite code and link directly to Class WhatsApp group"
            >
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cohort Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/30">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Class Code
          </div>
          <div className="text-base font-semibold text-slate-100 mt-1 truncate">
            {workspace.code}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            {workspace.name}
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
            {workspace.university || 'State University'}
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
            <span>{workspace.crName || 'Aarav Sharma'}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
            {workspace.crRollNo || 'CR-Authenticated'}
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
          {subjects.map((subj) => (
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
          ))}
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
