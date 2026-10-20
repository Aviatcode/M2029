import React, { useState, useEffect } from 'react';
import {
  DailyLecturePulse,
  MonthlyAttendanceSummary,
  UniversityCalendarNotice,
  ClassWorkspace,
  Subject,
  TimetableClass,
} from '../types';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  BookOpen,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Clock,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyUpdateViewProps {
  classCode: string;
  workspace: ClassWorkspace;
  subjects: Subject[];
  timetable: TimetableClass[];
  studentName?: string;
  isCR?: boolean;
}

export const DailyUpdateView: React.FC<DailyUpdateViewProps> = ({
  classCode,
  workspace,
  subjects,
  timetable,
  studentName = 'Rohit Kumar',
  isCR = false,
}) => {
  const [attendanceSummary, setAttendanceSummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [pulses, setPulses] = useState<DailyLecturePulse[]>([]);
  const [notices, setNotices] = useState<UniversityCalendarNotice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingUni, setIsSyncingUni] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string>('');
  const [selectedPulseForPrep, setSelectedPulseForPrep] = useState<DailyLecturePulse | null>(null);

  // Fetch live attendance summary, daily pulses, and university notices
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attRes, pulseRes, noticeRes] = await Promise.all([
        fetch(`/api/attendance/monthly/${classCode}?studentName=${encodeURIComponent(studentName)}`).then((r) => r.json()),
        fetch(`/api/daily-pulse/${classCode}`).then((r) => r.json()),
        fetch(`/api/university/notices/${classCode}`).then((r) => r.json()),
      ]);

      if (attRes && attRes.currentMonth) {
        setAttendanceSummary(attRes);
      }
      if (pulseRes && Array.isArray(pulseRes.pulses)) {
        setPulses(pulseRes.pulses);
        if (pulseRes.pulses.length > 0) {
          setSelectedPulseForPrep(pulseRes.pulses[0]);
        }
      }
      if (noticeRes && Array.isArray(noticeRes.notices)) {
        setNotices(noticeRes.notices);
      }
    } catch (err) {
      console.warn('Daily update fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classCode, studentName]);

  const handleVote = async (pulseId: string, attended: boolean, topicConfirmed: boolean) => {
    try {
      if (attended) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }

      const res = await fetch('/api/daily-pulse/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode,
          pulseId,
          studentName,
          studentId: 'user-student-current',
          role: isCR ? 'cr' : 'student',
          isCRorAdmin: isCR,
          attended,
          topicConfirmed,
        }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        setFeedbackToast(data.message || 'Attendance logged!');
        setTimeout(() => setFeedbackToast(''), 4500);

        // Update local state
        setPulses((prev) =>
          prev.map((p) => (p.id === pulseId ? data.pulse : p))
        );
        if (attendanceSummary && data.attendanceUpdated) {
          setAttendanceSummary((prev) =>
            prev
              ? {
                  ...prev,
                  currentMonth: data.attendanceUpdated,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const handleSyncUniversityLinks = async () => {
    setIsSyncingUni(true);
    try {
      const res = await fetch('/api/university/sync-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode,
          universityWebsiteUrl: workspace.universityWebsiteUrl,
          academicCalendarUrl: workspace.academicCalendarUrl,
          circularsNoticeUrl: workspace.circularsNoticeUrl,
        }),
      });
      const data = await res.json();
      if (data.notices) {
        setNotices(data.notices);
        setFeedbackToast('✓ University portal scanned! Gazetted holidays and notices updated.');
        setTimeout(() => setFeedbackToast(''), 4000);
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncingUni(false);
    }
  };

  const curMonth = attendanceSummary?.currentMonth;
  const isDefaulter = curMonth ? curMonth.isDefaulter : false;
  const attendancePct = curMonth ? curMonth.percentage : 84.0;
  const bunkLeft = curMonth ? curMonth.bunkableClassesLeft : 3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-7 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                <Zap className="w-3 h-3" />
                DAILY UPDATE & 75% ATTENDANCE RADAR
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {attendanceSummary?.semesterSpan || 'Odd Semester (August – December)'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {workspace.name || `${classCode} Academic Hub`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
              <span>{workspace.university || 'Affiliated State University'}</span>
              {workspace.collegeName && (
                <>
                  <span>·</span>
                  <span className="text-slate-300">{workspace.collegeName}</span>
                </>
              )}
              {workspace.department && (
                <>
                  <span>·</span>
                  <span className="text-slate-400">{workspace.department}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncUniversityLinks}
              disabled={isSyncingUni}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUni ? 'animate-spin' : ''}`} />
              <span>{isSyncingUni ? 'Scanning University...' : 'Scan University Portal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Attendance Safeguard on Left, Today's 1-Tap Pulse on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Monthly Attendance 75% Safeguard */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  Monthly 75% Attendance Safeguard
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400">
                {curMonth?.monthName || 'October'} 2026
              </span>
            </div>

            {/* Attendance Percentage Dial */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-4">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Current Month Status
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold ${
                      isDefaulter ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {attendancePct}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({curMonth?.classesAttended || 20} / {curMonth?.totalClassesHeld || 24} lectures)
                  </span>
                </div>
              </div>

              <div className="text-right">
                {isDefaulter ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Defaulter Risk</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safe (&gt;75%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bunk Buffer Insight Card */}
            <div
              className={`p-3.5 rounded-xl border text-xs mb-4 ${
                isDefaulter
                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                  : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              }`}
            >
              {isDefaulter ? (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Urgent Recovery Needed: </span>
                    You must attend the next{' '}
                    <span className="font-extrabold underline">{curMonth?.classesNeededFor75 || 4} classes</span>{' '}
                    consecutively to cross the university 75% monthly threshold.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Bunk Safety Cushion: </span>
                    You can safely miss up to{' '}
                    <span className="font-extrabold underline">{bunkLeft} more classes</span> this month without falling into the college defaulter list.
                  </div>
                </div>
              )}
            </div>

            {/* Semester Monthly Track */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                {attendanceSummary?.semesterType === 'odd' ? 'Odd' : 'Even'} Semester Track
              </label>
              <div className="grid grid-cols-3 gap-2">
                {attendanceSummary?.semesterHistory.map((m) => (
                  <div
                    key={m.month}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center"
                  >
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {m.monthName}
                    </span>
                    <span
                      className={`text-sm font-extrabold block mt-0.5 ${
                        m.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.percentage}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {m.attended}/{m.totalHeld} classes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject Breakdown Table */}
            {curMonth?.subjectBreakdown && curMonth.subjectBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Subject Breakdown
                </span>
                <div className="space-y-1.5">
                  {curMonth.subjectBreakdown.map((sb) => (
                    <div
                      key={sb.subjectId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 text-xs border border-slate-850"
                    >
                      <div className="truncate max-w-[180px]">
                        <span className="font-medium text-slate-200 block truncate">
                          {sb.subjectName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {sb.attended}/{sb.held} attended · Safe miss: {sb.safeToMiss}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          sb.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {sb.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* University Calendar & Notices Radar Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  University Calendar & Circulars Radar
                </h3>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                Auto-Synced
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Monitored links from <span className="text-slate-200 font-semibold">{workspace.university || 'University'}</span>:
            </p>

            <div className="space-y-2">
              {notices.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        n.type === 'holiday'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : n.type === 'exam'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {n.type === 'holiday' ? '🎉 Gazetted Holiday' : n.type === 'exam' ? '📝 Exam Schedule' : '📢 Official Notice'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{n.date}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100">{n.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{n.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Today's 1-Tap Lecture Pulses & AI 7-Min Summary */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <h3 className="font-bold text-sm text-white">
                  Today's Lectures: 1-Tap Consensus Pulse
                </h3>
              </div>
              {isCR ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  👑 CR Override Mode (3x Weight)
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  Weighted Peer Consensus
                </span>
              )}
            </div>

            {/* List of Today's Lectures */}
            <div className="space-y-4">
              {pulses.map((pulse) => {
                const myVote = pulse.votes.find(
                  (v) => v.studentName === studentName || v.studentId === 'user-student-current'
                );
                const hasVoted = Boolean(myVote);

                return (
                  <div
                    key={pulse.id}
                    className={`rounded-2xl border p-4 transition ${
                      pulse.status === 'verified_by_cr' || pulse.status === 'consensus_reached'
                        ? 'bg-slate-950/90 border-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {pulse.subjectName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {pulse.room}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-amber-400 font-semibold">
                        {pulse.timeSlot}
                      </span>
                    </div>

                    {/* Question / Topic */}
                    <div className="mb-3">
                      <p className="text-xs text-slate-300">
                        Topic: <span className="font-bold text-white">"{pulse.scheduledTopicTitle}"</span>
                      </p>
                      {pulse.crVerified && (
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified by Class Representative · Syllabus Locked</span>
                        </p>
                      )}
                    </div>

                    {/* Cohort Participation Insight */}
                    {(pulse.participationNudge || pulse.persuasionTactic) && !hasVoted && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-3 text-xs">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{(pulse.participationNudge || pulse.persuasionTactic)?.headline}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {(pulse.participationNudge || pulse.persuasionTactic)?.persuasiveCopy}
                        </p>
                      </div>
                    )}

                    {/* 1-Tap Action Buttons */}
                    {hasVoted ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>You marked: {myVote?.attended ? 'Attended (Present)' : 'Absent / Proxy'}</span>
                        </span>
                        <button
                          onClick={() => handleVote(pulse.id, !myVote?.attended, true)}
                          className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVote(pulse.id, true, true)}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Yes, Attended (1-Tap)</span>
                        </button>
                        <button
                          onClick={() => handleVote(pulse.id, false, false)}
                          className="bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
                        >
                          <span>Missed / Proxy</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-Minute AI Pre-Lecture Primer Card (Reveals instantly without 5-second swipe delays) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  ⚡ 7-Minute AI Pre-Lecture Primer & Viva Check
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Unlocked For You
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  💡 Intuition in 30 Seconds
                </span>
                <p className="text-slate-200 leading-relaxed">
                  In today's lecture on <span className="font-bold text-amber-300">B+ Tree Indexing</span>, the professor will explain why standard binary search trees fail on hard disks. Think of a phonebook: instead of flipping 1 page at a time (BST), you jump directly to letter 'S', then scan 100 entries per block (B+ Tree).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                  🎯 3 Predicted Viva / Exam Questions For Tomorrow
                </span>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-400">Q1.</span>
                    <span>Why do all leaf nodes in a B+ Tree form a doubly linked list? <span className="text-slate-400 italic">(Ans: For ultra-fast sequential range scans!)</span></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-400">Q2.</span>
                    <span>What is the minimum number of keys in an internal node of order m? <span className="text-slate-400 italic">(Ans: ceil(m/2) - 1 keys)</span></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-400">Q3.</span>
                    <span>Difference between clustered and non-clustered index? <span className="text-slate-400 italic">(Ans: Clustered determines physical data order; only 1 allowed per table).</span></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
