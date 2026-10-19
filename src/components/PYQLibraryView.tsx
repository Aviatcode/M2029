import React, { useState, useMemo } from 'react';
import { HistoricalPYQ, PYQAnalysisItem, Subject } from '../types';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
  Award,
  Sparkles,
} from 'lucide-react';

interface PYQLibraryViewProps {
  pyqs: HistoricalPYQ[];
  analysisItems: PYQAnalysisItem[];
  subjects: Subject[];
  onAddPYQ?: (pyq: Omit<HistoricalPYQ, 'id'>) => void;
  onDeletePYQ?: (pyqId: string) => void;
}

export const PYQLibraryView: React.FC<PYQLibraryViewProps> = ({
  pyqs,
  analysisItems,
  subjects,
  onAddPYQ,
  onDeletePYQ,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(pyqs[0]?.id || null);

  // Add Question Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qSubjectId, setQSubjectId] = useState(subjects[0]?.id || '');
  const [qSubjectName, setQSubjectName] = useState(subjects[0]?.name || '');
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState<number>(10);
  const [qYear, setQYear] = useState<number>(2025);
  const [qSource, setQSource] = useState('End-Term Examination');
  const [qModelAnswer, setQModelAnswer] = useState('');

  // Dynamically extract years from real data without rigid hardcoding
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025, 2024, 2023, 2022, 2021, 2020]);
    pyqs.forEach((p) => {
      if (p.year) yearsSet.add(p.year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [pyqs]);

  const filteredPYQs = pyqs.filter((p) => {
    if (selectedSubject !== 'all' && p.subjectId !== selectedSubject) return false;
    if (selectedYear !== 'all' && p.year !== Number(selectedYear)) return false;
    return true;
  });

  const handleOpenAddModal = () => {
    if (subjects.length > 0) {
      setQSubjectId(subjects[0].id);
      setQSubjectName(subjects[0].name);
    } else {
      setQSubjectId('sub-custom');
      setQSubjectName('Curriculum Core');
    }
    setIsAddModalOpen(true);
  };

  const handleSubjectChange = (subId: string) => {
    setQSubjectId(subId);
    const matched = subjects.find((s) => s.id === subId);
    if (matched) setQSubjectName(matched.name);
  };

  const handleSavePYQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddPYQ || !qText.trim()) return;

    onAddPYQ({
      subjectId: qSubjectId || 'sub-general',
      subjectName: qSubjectName || 'General',
      unitNumber: 1,
      topicTitle: qText.trim().slice(0, 40),
      difficulty: 'Medium',
      isVerifiedHistorical: true,
      question: qText.trim(),
      marks: Number(qMarks) || 10,
      year: Number(qYear) || 2025,
      frequencyCount: 1,
      source: qSource.trim() || 'University Examination',
      modelAnswer:
        qModelAnswer.trim() ||
        `### Model Answer & Marking Scheme (10 Marks)\n1. **Core Definition & Architectural Context:** State standardized university definitions clearly.\n2. **Block Diagram / Flow:** Neatly label components to guarantee full structural credit.\n3. **Step-by-Step Explanation & Invariants:** Formulate edge cases and runtime guarantees.\n4. **University Scoring Tip:** Always highlight keywords and summarize concluding tradeoffs.`,
    });

    setQText('');
    setQModelAnswer('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8 font-sans-ui text-slate-100">
      {/* 1. Header */}
      <div className="border-b border-slate-800/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
            Previous Year Questions (PYQs)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Archived university exam papers, repeated 10-markers & model answers
          </p>
        </div>

        {onAddPYQ && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Past Question</span>
          </button>
        )}
      </div>

      {/* 2. High-Yield Topics */}
      {analysisItems && analysisItems.length > 0 && (
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
            <h2 className="text-xs font-semibold text-slate-200">
              High-Frequency Questions (Historical Trends)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analysisItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 text-xs space-y-1.5 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded font-mono">
                    Asked {item.frequency}×
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Max {item.highestMarks}M</span>
                </div>
                <h3 className="font-semibold text-slate-100 line-clamp-1">
                  {item.topicTitle}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Papers: {item.yearsAsked.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800/90 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none cursor-pointer text-xs"
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
            className="bg-slate-900 border border-slate-800/90 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none cursor-pointer text-xs font-mono"
          >
            <option value="all">All Exam Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr} University Papers
              </option>
            ))}
          </select>
        </div>

        <span className="academic-tag text-[10px] text-slate-400">
          {filteredPYQs.length} Questions Indexed
        </span>
      </div>

      {/* 4. Question Archive List */}
      <div className="space-y-3">
        {filteredPYQs.length === 0 ? (
          <div className="p-10 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-xs font-semibold text-slate-300">No Previous Year Questions Matching Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add past examination questions directly or drop past year question PDFs in the Study Drop vault.
            </p>
            {onAddPYQ && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition inline-flex items-center gap-1.5 border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Past Question</span>
              </button>
            )}
          </div>
        ) : (
          filteredPYQs.map((pyq) => {
            const isExpanded = expandedId === pyq.id;

            return (
              <div
                key={pyq.id}
                className="rounded-xl bg-slate-900/30 border border-slate-800/80 overflow-hidden"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : pyq.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-900/50 transition select-none"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded font-mono font-bold">
                        {pyq.marks} Marks
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[11px] text-slate-300">{pyq.year} University Paper</span>
                      <span>·</span>
                      <span className="text-slate-400">{pyq.source}</span>
                      {pyq.subjectName && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400 font-medium">{pyq.subjectName}</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100 leading-snug">
                      {pyq.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 pt-1 shrink-0">
                    {onDeletePYQ && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePYQ(pyq.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete question"
                        aria-label="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800/60 p-4 sm:p-5 bg-slate-950/60 space-y-2 text-xs">
                    <span className="academic-tag text-[10px] text-slate-300 block">
                      Model Answer & Marking Strategy:
                    </span>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-200 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                      {pyq.modelAnswer}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Add PYQ Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-300" />
                <h3 className="font-semibold text-sm text-white">
                  Add University Past Year Question
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePYQ} className="space-y-3.5 text-xs">
              {/* Subject */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Subject *
                </label>
                {subjects.length > 0 ? (
                  <select
                    value={qSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={qSubjectName}
                    onChange={(e) => setQSubjectName(e.target.value)}
                    placeholder="Subject Name"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                )}
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Question *
                </label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="e.g. What is a Deadlock? Explain Coffman conditions and the Banker's algorithm with an example."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                />
              </div>

              {/* Marks, Year & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Marks</label>
                  <select
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition cursor-pointer"
                  >
                    <option value={2}>2 Marks (Short)</option>
                    <option value={5}>5 Marks (Medium)</option>
                    <option value={10}>10 Marks (High Yield)</option>
                    <option value={15}>15 Marks (Major Case)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Exam Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2035}
                    value={qYear}
                    onChange={(e) => setQYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Session / Term</label>
                  <input
                    type="text"
                    value={qSource}
                    onChange={(e) => setQSource(e.target.value)}
                    placeholder="e.g. End-Term Dec 2024"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                </div>
              </div>

              {/* Model Answer (Optional) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Model Solution / Key Points <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={qModelAnswer}
                  onChange={(e) => setQModelAnswer(e.target.value)}
                  placeholder="Paste or write notes, definitions, steps, or scoring points..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold transition cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
