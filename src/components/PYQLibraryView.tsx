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
    <div className="max-w-4xl mx-auto py-7 px-2 sm:px-4 space-y-7 animate-fade-in">
      {/* 1. Header */}
      <div className="space-y-1 border-b border-slate-800/60 pb-4">
        <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
          Previous Year Questions
        </h1>
        <p className="text-xs text-slate-400 font-sans-ui">
          University past questions and 10-marker model rubrics.
        </p>
      </div>

      {/* 2. High-Yield Topics */}
      <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
          <h2 className="text-xs font-semibold text-slate-200 font-sans-ui">
            High-Frequency Questions (2020–2025)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {analysisItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded bg-slate-900/50 border border-slate-800/80 text-xs space-y-1.5 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded">
                  Asked {item.frequency}×
                </span>
                <span className="font-mono text-[10px] text-slate-400">Max {item.highestMarks}M</span>
              </div>
              <h3 className="font-sans-ui font-semibold text-slate-100 line-clamp-1">
                {item.topicTitle}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Papers: {item.yearsAsked.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-sans-ui">Archive Filter:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800/90 rounded px-2.5 py-1 text-slate-200 focus:outline-none cursor-pointer font-sans-ui text-xs"
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
            className="bg-slate-900 border border-slate-800/90 rounded px-2.5 py-1 text-slate-200 focus:outline-none cursor-pointer font-sans-ui text-xs"
          >
            <option value="all">All Examination Sessions</option>
            <option value="2025">2025 End-Term</option>
            <option value="2024">2024 End-Term</option>
            <option value="2023">2023 End-Term</option>
            <option value="2022">2022 End-Term</option>
          </select>
        </div>

        <span className="academic-tag text-[10px] text-slate-400">
          {filteredPYQs.length} Questions Indexed
        </span>
      </div>

      {/* 4. Question Archive List */}
      <div className="space-y-3">
        {filteredPYQs.map((pyq) => {
          const isExpanded = expandedId === pyq.id;

          return (
            <div
              key={pyq.id}
              className="rounded-md bg-slate-900/30 border border-slate-800/80 overflow-hidden"
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : pyq.id)}
                className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-900/50 transition select-none"
              >
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 font-sans-ui">
                    <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-700 px-1.5 py-0.2 rounded">
                      {pyq.marks} Marks
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-slate-300">{pyq.year} University Paper</span>
                    <span>·</span>
                    <span className="text-slate-400">{pyq.source}</span>
                  </div>

                  <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100 leading-snug">
                    {pyq.question}
                  </h3>
                </div>

                <div className="text-slate-400 pt-1 shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800/60 p-4 sm:p-5 bg-slate-950/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="academic-tag text-[10px] text-slate-300">
                      Standard Scoring Scheme & Model Answer:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Faculty Evaluator Standard
                    </span>
                  </div>
                  <div className="p-4 rounded bg-slate-900/60 border border-slate-800/80 text-slate-200 leading-relaxed whitespace-pre-wrap font-sans-ui text-xs sm:text-sm marginalia">
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
