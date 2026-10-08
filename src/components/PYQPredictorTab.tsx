import React, { useState } from 'react';
import { LessonContent } from '../types';
import { Award, ChevronDown, ChevronUp, CheckCircle, HelpCircle } from 'lucide-react';

interface PYQPredictorTabProps {
  lesson: LessonContent;
  topicTitle: string;
}

export const PYQPredictorTab: React.FC<PYQPredictorTabProps> = ({ lesson, topicTitle }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const pyqs = lesson.pyqs || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 p-5 md:p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              🎯 Previous Year Question (PYQ) Bank
            </span>
            <span className="text-xs text-slate-400">Repeated University Papers</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            High-Yield Exam Questions: {topicTitle}
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Questions curated from past 5-year BCA & B.Tech university semester question papers with evaluation rubrics.
          </p>
        </div>
      </div>

      {/* PYQ List */}
      <div className="space-y-4">
        {pyqs.map((pyq, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={pyq.id || idx}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg transition-all"
            >
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition"
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                      pyq.marks >= 10
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                        : pyq.marks >= 5
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    }`}
                  >
                    [{pyq.marks} Marks]
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm md:text-base leading-snug">
                      Q{idx + 1}. {pyq.question}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> High probability paper question
                    </p>
                  </div>
                </div>

                <button className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800/80 p-5 md:p-6 bg-slate-950/60 space-y-4">
                  {/* Model Answer */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Step-by-Step Model Answer
                    </h4>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                      {pyq.modelAnswer}
                    </div>
                  </div>

                  {/* Marking Scheme */}
                  {pyq.keyPointsForExaminer && pyq.keyPointsForExaminer.length > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-indigo-400" />
                        Examiner Marking Rubric (Where Marks Are Awarded)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {pyq.keyPointsForExaminer.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">✓</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
