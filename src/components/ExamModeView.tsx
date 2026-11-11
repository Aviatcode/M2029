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
  Search,
  MoreVertical,
} from 'lucide-react';

interface ExamModeViewProps {
  exams: ExamDateSheetItem[];
  subjects?: Subject[];
  onToggleRevisionDay: (examId: string, dayNumber: number) => void;
  onOpenStudySession: (subjectName: string) => void;
  onAddExam?: (exam: Omit<ExamDateSheetItem, 'id' | 'classId'>) => void;
  onDeleteExam?: (examId: string) => void;
  studentName?: string;
  classCode?: string;
}

export const ExamModeView: React.FC<ExamModeViewProps> = ({
  exams,
  subjects = [],
  onToggleRevisionDay,
  onOpenStudySession,
  onAddExam,
  onDeleteExam,
  studentName,
  classCode,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredExams = exams.filter((ex) =>
    !searchQuery.trim() ||
    ex.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.examType.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const nextExamDaysLeft = activeExam ? calculateDaysLeft(activeExam.date) : 12;

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. TOP HEADER (Matching reference design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              • {classCode || 'BCA-2028'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Exams & Datesheet
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exams..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          {/* Exam Radar Trigger */}
          <button
            onClick={() => handleOpenRadar(activeExam?.subjectName || '')}
            className="h-8 px-3 rounded-xl bg-[#141926] border border-slate-800 text-xs text-amber-300 hover:text-white hover:border-amber-500/40 flex items-center gap-1.5 cursor-pointer font-semibold transition"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Radar 🎯</span>
          </button>

          {/* Add Exam Button */}
          {onAddExam && (
            <button
              onClick={handleOpenAddModal}
              className="h-8 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 3-COLUMN CARDS GRID (Matching reference design) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: Countdown & Target */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100">Next Countdown</h2>
            </div>
            <button className="text-slate-600 hover:text-slate-400">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {nextExamDaysLeft > 0 ? `${nextExamDaysLeft}d` : 'Done'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold">
                {activeExam?.subjectName || 'Next Exam'}
              </span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-40 flex items-center justify-center my-1">
            <div className="absolute left-6 top-2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10">
              <span className="text-lg font-extrabold">{exams.length}</span>
              <span className="text-[10px] text-violet-200">Papers</span>
            </div>
            <div className="absolute right-6 top-4 w-20 h-20 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20">
              <span className="text-base font-extrabold">{activeExam?.revisionDaysPlan?.length || 3}</span>
              <span className="text-[10px] text-slate-400">Days Plan</span>
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold">
              <span className="text-sm font-black">100%</span>
              <span className="text-[8px] uppercase tracking-wider">Sync</span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-white font-mono">10-Marker Readiness</span>
                <span className="text-slate-400">85%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Scheduled Papers List */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Exam Papers</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {filteredExams.length} scheduled
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 no-scrollbar">
            {filteredExams.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                <Calendar className="w-6 h-6 text-slate-600" />
                <span>No exams scheduled</span>
              </div>
            ) : (
              filteredExams.map((ex) => {
                const isSelected = ex.id === activeExam?.id;
                const days = calculateDaysLeft(ex.date);
                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExamId(ex.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition text-xs space-y-1 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/60 text-white shadow-md'
                        : 'bg-[#0d111a] border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold truncate">{ex.subjectName}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          days <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-cyan-300'
                        }`}
                      >
                        {days < 0 ? 'Past' : `${days}d Left`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{ex.examType}</span>
                      <span>{ex.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {onAddExam && (
            <button
              onClick={handleOpenAddModal}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-200 transition cursor-pointer text-center"
            >
              + Add Exam Paper
            </button>
          )}
        </div>

        {/* CARD 3: Sprint Checklist & Radar (The Dark Accent Card) */}
        <div className="bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100">Sprint Roadmap</h2>
            </div>
            {activeExam && (
              <button
                onClick={() => onOpenStudySession(activeExam.subjectName)}
                className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <span>Revise →</span>
              </button>
            )}
          </div>

          {activeExam ? (
            <div className="space-y-2 overflow-y-auto max-h-80 pr-1 no-scrollbar text-xs">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  {activeExam.subjectName} ({activeExam.examType})
                </span>
                <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                  {activeExam.date} · {activeExam.time}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {activeExam.revisionDaysPlan.map((step) => (
                  <div
                    key={step.dayNumber}
                    onClick={() => onToggleRevisionDay(activeExam.id, step.dayNumber)}
                    className={`p-2.5 rounded-2xl border transition flex items-start justify-between gap-2.5 cursor-pointer ${
                      step.completed
                        ? 'bg-[#121724]/50 border-slate-850 opacity-60'
                        : 'bg-[#121724] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-xs shrink-0 border ${
                            step.completed
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'border-slate-700 bg-slate-900 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          Day {step.dayNumber}: {step.title}
                        </span>
                      </div>
                      {step.topics && step.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                          {step.topics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-slate-800/80"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 shrink-0 pt-0.5">
                      {step.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-2">
              <Calendar className="w-8 h-8 text-slate-600" />
              <span>Select an exam to view daily sprint revision plan</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[10px]">Predicted with Class AI</span>
            <span className="text-emerald-400 font-bold text-[10px]">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
