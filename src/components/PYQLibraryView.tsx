import React, { useState } from 'react';
import { HistoricalPYQ, PYQAnalysisItem, Subject } from '../types';
import {
  Filter,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PYQLibraryViewProps {
  pyqs: HistoricalPYQ[];
  analysisItems: PYQAnalysisItem[];
  subjects: Subject[];
}

export const PYQLibraryView: React.FC<PYQLibraryViewProps> = ({
  pyqs,
  analysisItems,
  subjects,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(pyqs[0]?.id || null);

  const filteredPYQs = pyqs.filter((p) => {
    if (selectedSubject !== 'all' && p.subjectId !== selectedSubject) return false;
    if (selectedYear !== 'all' && p.year !== Number(selectedYear)) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
          Previous Year Questions
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Verified university question papers and model scoring answers.
        </p>
      </div>

      {/* Frequently Repeated Concepts */}
      <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-4 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Repeated Exam Topics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {analysisItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs space-y-1"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-cyan-300">
                  Asked {item.frequency} times
                </span>
                <span>{item.highestMarks} marks</span>
              </div>
              <h3 className="font-medium text-slate-200 line-clamp-1">
                {item.topicTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {item.yearsAsked.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Filter:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
          >
            <option value="all">All Years</option>
            <option value="2025">2025 End-Term</option>
            <option value="2024">2024 End-Term</option>
            <option value="2023">2023 End-Term</option>
            <option value="2022">2022 End-Term</option>
          </select>
        </div>

        <span className="text-slate-400">
          {filteredPYQs.length} questions
        </span>
      </div>

      {/* Question List */}
      <div className="space-y-2.5">
        {filteredPYQs.map((pyq) => {
          const isExpanded = expandedId === pyq.id;

          return (
            <div
              key={pyq.id}
              className="rounded-xl bg-slate-900/30 border border-slate-800/80 overflow-hidden"
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : pyq.id)}
                className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-900/50 transition"
              >
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="font-mono">{pyq.marks} Marks</span>
                    <span aria-hidden="true">·</span>
                    <span>{pyq.year} Exam</span>
                    <span aria-hidden="true">·</span>
                    <span>{pyq.source}</span>
                  </div>

                  <h3 className="text-xs md:text-sm font-medium text-slate-200 leading-snug">
                    {pyq.question}
                  </h3>
                </div>

                <div className="text-slate-400 pt-0.5">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800/60 p-4 bg-slate-950/40 space-y-2 text-xs">
                  <div className="font-medium text-slate-300">
                    Model Answer & Scoring Points:
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/70 text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {pyq.modelAnswer}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
