import React, { useState } from 'react';
import { ExamDateEntry } from '../types';
import { Calendar, Clock, Plus, X, Flame, AlertCircle } from 'lucide-react';

interface DatesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  datesheet: ExamDateEntry[];
  classCode: string;
  onAddDateEntry: (entry: { subject: string; date: string; paperType: 'Theory' | 'Practical' }) => void;
  onSelectSubjectForRevision: (subject: string) => void;
}

export const DatesheetModal: React.FC<DatesheetModalProps> = ({
  isOpen,
  onClose,
  datesheet,
  classCode,
  onAddDateEntry,
  onSelectSubjectForRevision,
}) => {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [paperType, setPaperType] = useState<'Theory' | 'Practical'>('Theory');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const calculateDaysRemaining = (examDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !date) return;
    onAddDateEntry({ subject: subject.trim(), date, paperType });
    setSubject('');
    setDate('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">University Datesheet & Exam Countdown</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30">
                  {classCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prioritizes high-yield 10-markers and PYQs based on upcoming exam dates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timetable List */}
        <div className="space-y-3 mb-5">
          {datesheet.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No exam dates recorded yet. Add your university exam timetable!
            </div>
          ) : (
            datesheet.map((entry) => {
              const daysLeft = calculateDaysRemaining(entry.date);
              const isUrgent = daysLeft >= 0 && daysLeft <= 14;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-100 text-sm">{entry.subject}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {entry.paperType}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        daysLeft < 0
                          ? 'bg-slate-800 text-slate-400'
                          : isUrgent
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {daysLeft < 0 ? 'Concluded' : `${daysLeft} Days Left`}
                    </span>

                    <button
                      onClick={() => {
                        onSelectSubjectForRevision(entry.subject);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Revise 🚀
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Entry Toggle Form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-blue-400 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>+ Add Exam Paper to Datesheet</span>
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Add Paper to Timetable
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Subject (e.g. Operating Systems)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="Theory">Theory Exam</option>
                <option value="Practical">Lab / Practical Exam</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Save Exam Date
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
