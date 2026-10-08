import React, { useState } from 'react';
import {
  Settings,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface SemesterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (classData: any) => void;
}

export const SemesterSetupModal: React.FC<SemesterSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [className, setClassName] = useState<string>('BCA Batch of 2028');
  const [classCode, setClassCode] = useState<string>('BCA-2028');
  const [semester, setSemester] = useState<number>(3);
  const [subjectsText, setSubjectsText] = useState<string>(
    'Java Programming, Database Management Systems, Web Development, Operating Systems, Computer Networks'
  );
  const [syllabusSnippet, setSyllabusSnippet] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFinishSetup = async () => {
    setIsSubmitting(true);
    const subjectsList = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch('/api/class/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: classCode.trim().toUpperCase(),
          name: className.trim(),
          semester,
          subjectsList,
        }),
      });

      const data = await res.json();
      onSetupComplete(data);
      onClose();
    } catch (err) {
      console.error('Setup failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Semester Setup Wizard</h3>
              <p className="text-xs text-slate-400">
                Configure your class workspace and auto-generate semester knowledge base
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Dots */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                    : step > s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {s === 1 ? 'Class' : s === 2 ? 'Subjects' : s === 3 ? 'Syllabus' : 'Done'}
              </span>
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div className="min-h-[200px] space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Class Code (e.g. BCA-2028)
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Semester Subjects (Comma separated)
              </label>
              <textarea
                rows={4}
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                placeholder="e.g. Java, DBMS, Operating Systems, Web Development"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs md:text-sm text-slate-200 font-mono resize-none"
              />
              <p className="text-[11px] text-slate-400">
                Each subject creates a shared folder for syllabus tracking, PPT storage, and verified PYQ analysis.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Upload or Paste University Syllabus
              </label>
              <textarea
                rows={5}
                value={syllabusSnippet}
                onChange={(e) => setSyllabusSnippet(e.target.value)}
                placeholder="Paste course modules or units from your university syllabus PDF..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs md:text-sm text-slate-200 font-mono resize-none"
              />
              <p className="text-[11px] text-slate-400">
                The AI will parse chapters, calculate likely topics, and seed the class knowledge base.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-white">
                Workspace Configuration Ready
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Class Code: <strong className="text-cyan-300">{classCode}</strong> (Semester {semester}).
                Batchmates can join using this code to share 0-token lecture notes!
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-6">
          <button
            onClick={() => setStep((p) => Math.max(p - 1, 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep((p) => Math.min(p + 1, 4))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinishSetup}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              {isSubmitting ? 'Initializing Workspace...' : 'Launch Class Workspace 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
