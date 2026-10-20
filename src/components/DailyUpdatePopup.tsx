import React, { useState, useEffect } from 'react';
import { DailyLecturePulse } from '../types';
import { Zap, Check, X, ShieldAlert, Sparkles, ArrowRight, Bell } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyUpdatePopupProps {
  pulses: DailyLecturePulse[];
  classCode: string;
  studentName: string;
  isCR?: boolean;
  onVoteComplete: (pulseId: string, attended: boolean, topicConfirmed: boolean) => void;
  onOpenFullTab: () => void;
}

export const DailyUpdatePopup: React.FC<DailyUpdatePopupProps> = ({
  pulses,
  classCode,
  studentName,
  isCR = false,
  onVoteComplete,
  onOpenFullTab,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [activePulseIndex, setActivePulseIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find unvoted pulse
  const pendingPulses = pulses.filter(
    (p) => !p.votes.some((v) => v.studentName === studentName || v.studentId === 'user-student-current')
  );

  const currentPulse = pendingPulses[activePulseIndex] || pendingPulses[0];

  if (dismissed || !currentPulse) {
    return null;
  }

  const handleVote = async (attended: boolean, topicConfirmed: boolean) => {
    setIsSubmitting(true);
    try {
      if (attended) {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.85, x: 0.85 },
        });
      }
      onVoteComplete(currentPulse.id, attended, topicConfirmed);
      if (activePulseIndex < pendingPulses.length - 1) {
        setActivePulseIndex((prev) => prev + 1);
      } else {
        setDismissed(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 font-mono">
            ⚡ Daily Update · 1-Tap Pulse
          </span>
          {isCR && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              👑 CR (3x Weight)
            </span>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 text-xs p-1 rounded-md transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lecture Info */}
      <div className="mb-2.5">
        <div className="flex items-baseline justify-between">
          <h4 className="text-xs font-bold text-white truncate max-w-[260px]">
            {currentPulse.subjectName}
          </h4>
          <span className="text-[10px] font-mono text-slate-400">
            {currentPulse.timeSlot}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5">
          Did the teacher teach <span className="font-semibold text-amber-300">"{currentPulse.scheduledTopicTitle}"</span> today?
        </p>
      </div>

      {/* Robert Greene Psychological Nudge */}
      {currentPulse.persuasionTactic && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 mb-3">
          <p className="text-[10px] font-semibold text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            {currentPulse.persuasionTactic.headline}
          </p>
          <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5">
            {currentPulse.persuasionTactic.persuasiveCopy}
          </p>
        </div>
      )}

      {/* 1-Tap Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isSubmitting}
          onClick={() => handleVote(true, true)}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-950 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Yes, Attended (1-Tap)</span>
        </button>
        <button
          disabled={isSubmitting}
          onClick={() => handleVote(false, false)}
          className="bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
        >
          <span>Missed / Proxy</span>
        </button>
      </div>

      {/* Bottom Link to Full Tab */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span>75% Monthly Safeguard Active</span>
        <button
          onClick={onOpenFullTab}
          className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-0.5 transition cursor-pointer"
        >
          <span>Open Daily Update Tab</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
