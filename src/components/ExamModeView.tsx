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
    <div className="space-y-6 animate-fade-in pb-8">
      {/* 1. Header */}
      <div className="space-y-1 border-b border-slate-800/60 pb-4">
        <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
          Exam Datesheet & Revision
        </h1>
        <p className="text-xs text-slate-400 font-sans-ui">
          Upcoming examinations and active recall revision roadmap.
        </p>
      </div>

      {/* 2. Exam Selection Cards */}
      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">No Exam Datesheets Added</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Exam schedules and active recall roadmaps will appear here once dates are configured for your cohort.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {exams.map((ex) => {
            const isSelected = ex.id === activeExam?.id;
            const daysLeft = calculateDaysLeft(ex.date);

            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExamId(ex.id)}
                className={`p-4 rounded-md border cursor-pointer transition space-y-2 select-none ${
                  isSelected
                    ? 'bg-slate-900 border-slate-700 shadow-2xs'
                    : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="academic-tag text-[9px] text-slate-400">
                    {ex.examType}
                  </span>
                  <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded">
                    {daysLeft} Days Left
                  </span>
                </div>

                <h2 className="font-sans-ui font-semibold text-sm text-slate-100 truncate">
                  {ex.subjectName}
                </h2>

                <p className="text-xs text-slate-400 font-sans-ui">
                  <span className="font-mono text-slate-300">
                    {new Date(ex.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>{' '}
                  · {ex.time}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Active Exam Roadmap Details */}
      {activeExam && (
        <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
            <div className="space-y-0.5">
              <span className="academic-tag text-[10px] text-neutral-400">
                Milestone Roadmap
              </span>
              <h2 className="font-editorial text-xl sm:text-2xl font-medium text-slate-100">
                {activeExam.subjectName}
              </h2>
              <p className="text-xs text-slate-400 font-sans-ui">
                Exam Session: <span className="text-slate-300 font-mono">{activeExam.date} ({activeExam.time})</span> · {activeExam.examType}
              </p>
            </div>

            <button
              onClick={() => onOpenStudySession(activeExam.subjectName)}
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5 font-sans-ui"
            >
              <span>Review Topics in AI Study Hall</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Revision Days Checklist */}
          <div className="space-y-3">
            <h3 className="academic-tag text-[10px] text-slate-400">
              Daily Syllabus Targets & Active Recall Milestones
            </h3>

            <div className="space-y-2">
              {activeExam.revisionDaysPlan.map((step) => (
                <div
                  key={step.dayNumber}
                  onClick={() => onToggleRevisionDay(activeExam.id, step.dayNumber)}
                  className={`p-3.5 rounded-md border transition flex items-start justify-between gap-3 cursor-pointer select-none ${
                    step.completed
                      ? 'bg-slate-950/40 border-slate-850 opacity-70'
                      : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-xs mt-0.5 border ${
                        step.completed
                          ? 'bg-neutral-800 text-neutral-200 border-neutral-600'
                          : 'border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200 font-sans-ui">
                        Day 0{step.dayNumber}: {step.title}
                      </div>
                      <p className="text-xs text-slate-400 font-sans-ui">
                        {step.topics.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <span className="academic-tag text-[9px] text-slate-400 shrink-0">
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
