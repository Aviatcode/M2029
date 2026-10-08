import React, { useState } from 'react';
import { ExamDateSheetItem } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ListTodo,
  Check,
  ArrowRight,
} from 'lucide-react';

interface ExamModeViewProps {
  exams: ExamDateSheetItem[];
  onToggleRevisionDay: (examId: string, dayNumber: number) => void;
  onOpenStudySession: (subjectName: string) => void;
}

export const ExamModeView: React.FC<ExamModeViewProps> = ({
  exams,
  onToggleRevisionDay,
  onOpenStudySession,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');

  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const calculateDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
          Exam Schedule & Revision Plan
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Step-by-step active recall timetable for upcoming semester examinations.
        </p>
      </div>

      {/* Clean Exam Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {exams.map((ex) => {
          const isSelected = ex.id === activeExam?.id;
          const daysLeft = calculateDaysLeft(ex.date);

          return (
            <div
              key={ex.id}
              onClick={() => setSelectedExamId(ex.id)}
              className={`p-4 rounded-xl border cursor-pointer transition space-y-1 ${
                isSelected
                  ? 'bg-slate-900 border-slate-700 shadow-sm'
                  : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-750'
              }`}
            >
              <div className="text-xs text-slate-400 font-mono">
                {daysLeft} days remaining
              </div>

              <h2 className="font-medium text-sm text-slate-200 truncate">
                {ex.subjectName}
              </h2>

              <p className="text-xs text-slate-400">
                {new Date(ex.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {ex.time}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Exam Plan Details */}
      {activeExam && (
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
            <div>
              <h2 className="text-base font-medium text-slate-100">
                {activeExam.subjectName} Revision Roadmap
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exam date: {activeExam.date} ({activeExam.time}) · {activeExam.examType}
              </p>
            </div>

            <button
              onClick={() => onOpenStudySession(activeExam.subjectName)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>Review Topics with AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Revision Days Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Daily Milestones
            </h3>

            <div className="space-y-2">
              {activeExam.revisionDaysPlan.map((step) => (
                <div
                  key={step.dayNumber}
                  onClick={() => onToggleRevisionDay(activeExam.id, step.dayNumber)}
                  className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                    step.completed
                      ? 'bg-slate-950/40 border-slate-850 opacity-70'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs mt-0.5 border ${
                        step.completed
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                          : 'border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-300">
                        Day {step.dayNumber}: {step.title}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {step.topics.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    Day {step.dayNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
