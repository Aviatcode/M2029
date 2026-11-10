import React, { useState } from 'react';
import { ExamDateSheetItem, Subject } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Check,
  ArrowRight,
  Plus,
  Trash2,
  X,
  Flame,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface ExamModeViewProps {
  exams: ExamDateSheetItem[];
  subjects?: Subject[];
  onToggleRevisionDay: (examId: string, dayNumber: number) => void;
  onOpenStudySession: (subjectName: string) => void;
  onAddExam?: (exam: Omit<ExamDateSheetItem, 'id' | 'classId'>) => void;
  onDeleteExam?: (examId: string) => void;
}

export const ExamModeView: React.FC<ExamModeViewProps> = ({
  exams,
  subjects = [],
  onToggleRevisionDay,
  onOpenStudySession,
  onAddExam,
  onDeleteExam,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Exam Form
  const [examSubName, setExamSubName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('10:00 AM - 01:00 PM');
  const [examType, setExamType] = useState<'Mid-Term' | 'End-Term' | 'Practical'>('End-Term');

  // Exam Radar Prediction State
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [radarPredictions, setRadarPredictions] = useState<any[]>([]);
  const [isRadarLoading, setIsRadarLoading] = useState(false);

  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const handleOpenRadar = async (subjectName = activeExam?.subjectName || '') => {
    setIsRadarOpen(true);
    setIsRadarLoading(true);
    try {
      const res = await fetch(`/api/ai/exam-predict?subjectName=${encodeURIComponent(subjectName)}`);
      const data = await res.json();
      setRadarPredictions(data.predictions || []);
    } catch (err) {
      console.warn('Exam predict fetch error:', err);
    } finally {
      setIsRadarLoading(false);
    }
  };

  const calculateDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleOpenAddModal = () => {
    if (subjects.length > 0) {
      setExamSubName(subjects[0].name);
    } else {
      setExamSubName('');
    }
    const defaultDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    setExamDate(defaultDate);
    setIsAddModalOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddExam) return;

    const finalSubName = examSubName.trim() || 'Core Subject Exam';
    const subId = `sub-${finalSubName.toLowerCase().replace(/\s+/g, '-').slice(0, 8)}`;

    const newExam: Omit<ExamDateSheetItem, 'id' | 'classId'> = {
      subjectId: subId,
      subjectName: finalSubName,
      date: examDate || new Date().toISOString().slice(0, 10),
      time: examTime || '10:00 AM - 01:00 PM',
      examType,
      priority: 'High Priority',
      revisionDaysPlan: [
        {
          dayNumber: 1,
          title: 'Units 1 & 2 Foundations & Core Definitions',
          topics: ['Architecture Diagrams', 'Standard University Definitions', 'Key Formulas'],
          completed: false,
        },
        {
          dayNumber: 2,
          title: 'Units 3 & 4 Algorithms & Proofs',
          topics: ['Complex Step-by-Step Mechanisms', 'Comparative Tables', 'Edge Cases'],
          completed: false,
        },
        {
          dayNumber: 3,
          title: 'Past 5-Year 10-Markers & Exam Mock',
          topics: ['Frequently Repeated PYQs', 'Neat Diagram Practice', 'Examiner Scoring Tips'],
          completed: false,
        },
      ],
    };

    onAddExam(newExam);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8 font-sans-ui text-slate-100">
      {/* 1. Header */}
      <div className="border-b border-slate-800/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
            Exam Datesheet & Countdown
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official term papers, remaining countdown & sprint revision checklists
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenRadar(activeExam?.subjectName || '')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-200 text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Predict upcoming exam questions using collective class query volume + past PYQs"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Exam Radar 🎯</span>
          </button>

          {onAddExam && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Exam Paper</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Exam Selection Cards */}
      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Exam Dates Scheduled</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add your university mid-term, end-term, or practical exam dates to get automated daily revision checklists.
          </p>
          {onAddExam && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Exam Date</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exams.map((ex) => {
            const isSelected = ex.id === activeExam?.id;
            const daysLeft = calculateDaysLeft(ex.date);
            const isUrgent = daysLeft >= 0 && daysLeft <= 10;

            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExamId(ex.id)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 select-none ${
                  isSelected
                    ? 'bg-slate-900 border-slate-700 shadow-2xs'
                    : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="academic-tag text-[9px] text-slate-400">
                    {ex.examType}
                  </span>
                  <span
                    className={`academic-tag text-[9px] px-2 py-0.5 rounded font-mono font-semibold ${
                      daysLeft < 0
                        ? 'bg-slate-950 text-slate-500 border border-slate-800'
                        : isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {daysLeft < 0 ? 'Concluded' : `${daysLeft} Days Left`}
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
                      year: 'numeric',
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
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="academic-tag text-[10px] text-slate-400">
                  {activeExam.examType}
                </span>
                <span className="font-mono text-xs text-emerald-400">
                  {calculateDaysLeft(activeExam.date)} days remaining
                </span>
              </div>
              <h2 className="font-editorial text-xl sm:text-2xl font-medium text-slate-100">
                {activeExam.subjectName}
              </h2>
              <p className="text-xs text-slate-400">
                Session Time: <span className="text-slate-300 font-mono">{activeExam.date} ({activeExam.time})</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => onOpenStudySession(activeExam.subjectName)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Revise with AI Tutor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onDeleteExam && (
                <button
                  type="button"
                  onClick={() => onDeleteExam(activeExam.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                  title="Remove this exam paper"
                  aria-label="Remove exam paper"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Revision Days Checklist */}
          <div className="space-y-3">
            <h3 className="academic-tag text-[10px] text-slate-400">
              Exam Sprint Revision Roadmap
            </h3>

            <div className="space-y-2">
              {activeExam.revisionDaysPlan.map((step) => (
                <div
                  key={step.dayNumber}
                  onClick={() => onToggleRevisionDay(activeExam.id, step.dayNumber)}
                  className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer select-none ${
                    step.completed
                      ? 'bg-slate-950/40 border-slate-850 opacity-70'
                      : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-xs mt-0.5 border ${
                        step.completed
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">
                        Day 0{step.dayNumber}: {step.title}
                      </div>
                      <p className="text-xs text-slate-400">
                        {step.topics.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">
                    {step.completed ? 'Done' : 'Target'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Exam Modal */}
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
                <Calendar className="w-4 h-4 text-slate-300" />
                <h3 className="font-semibold text-sm text-white">
                  Add University Exam Paper
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

            <form onSubmit={handleSaveExam} className="space-y-3.5 text-xs">
              {/* Subject */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Subject *
                </label>
                {subjects.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={examSubName}
                      onChange={(e) => setExamSubName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                      <option value="__custom__">+ Custom Subject Paper</option>
                    </select>
                    {examSubName === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter custom subject name..."
                        onChange={(e) => setExamSubName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={examSubName}
                    onChange={(e) => setExamSubName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                )}
              </div>

              {/* Date & Exam Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Exam Date *</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Paper Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer"
                  >
                    <option value="End-Term">End-Term Theory Exam</option>
                    <option value="Mid-Term">Mid-Term / Sessional Exam</option>
                    <option value="Practical">Lab Practical & Viva</option>
                  </select>
                </div>
              </div>

              {/* Time Session */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Exam Timing</label>
                <select
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition cursor-pointer"
                >
                  <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM (Morning Shift)</option>
                  <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM (Afternoon Shift)</option>
                  <option value="09:30 AM - 12:30 PM">09:30 AM - 12:30 PM (Early Shift)</option>
                  <option value="01:30 PM - 04:30 PM">01:30 PM - 04:30 PM (Mid Shift)</option>
                </select>
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
                  Add to Datesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 4. Exam Radar Prediction Modal */}
      {isRadarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Target className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Exam Radar 🎯</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                      {activeExam?.subjectName || 'All Subjects'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculated by cross-referencing classroom inquiry frequency with historical university PYQs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRadarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isRadarLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Sparkles className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Correlating classroom inquiries with past 5-year exam trends...</p>
                </div>
              ) : radarPredictions.length > 0 ? (
                radarPredictions.map((pred, pIdx) => {
                  const isHigh = pred.probability === 'High';
                  const isMedium = pred.probability === 'Medium';
                  return (
                    <div
                      key={pIdx}
                      className={`p-4 rounded-xl border space-y-2 transition ${
                        isHigh
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                          : isMedium
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                                isHigh
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : isMedium
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {pred.probability} Probability
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {pred.hitCount} asks · {pred.pyqCount} past PYQs
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 font-sans-ui">
                            {pred.topic}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {pred.reasoning}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsRadarOpen(false);
                            onOpenStudySession(pred.topic);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Study this now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {pred.suggestedAnswer && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-2">
                          <span className="text-slate-500 font-bold mr-1">Preview:</span>
                          {pred.suggestedAnswer}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <p>No specific high-priority predictions found yet for this subject.</p>
                  <p className="text-slate-500">Ask more questions in AI Tutor to train the class radar!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
