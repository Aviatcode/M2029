import React, { useState } from 'react';
import { HelpCircle, Check, ArrowRight, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

export interface QuickCheckOption {
  key: string;
  label: string;
}

export interface QuickCheckCardProps {
  question: string;
  options: QuickCheckOption[];
  onAnswerSubmit: (selectedKey: string) => void;
  isLoading?: boolean;
  evaluation?: {
    passed: boolean;
    feedback: string;
    correctOption?: string;
  } | null;
}

export const QuickCheckCard: React.FC<QuickCheckCardProps> = ({
  question,
  options,
  onAnswerSubmit,
  isLoading = false,
  evaluation = null,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedKey || isLoading) return;
    onAnswerSubmit(selectedKey);
  };

  return (
    <div className="my-5 rounded-xl border border-indigo-500/40 bg-gradient-to-b from-slate-900/90 to-indigo-950/20 p-4 sm:p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
      {/* Decorative accent glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider font-mono">
            Interactive Quick Check
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
          Exam Key Concept
        </span>
      </div>

      {/* Question */}
      <h4 className="text-sm sm:text-base font-semibold text-slate-100 mb-4 leading-snug">
        {question}
      </h4>

      {/* Options List */}
      <div className="space-y-2 mb-4">
        {options.map((opt) => {
          const isSelected = selectedKey === opt.key;
          const isEvaluated = Boolean(evaluation);
          const isCorrectKey = evaluation?.correctOption === opt.key;
          const isUserChoice = isSelected;

          let borderClass = 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900';
          if (isSelected && !isEvaluated) {
            borderClass = 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/50';
          } else if (isEvaluated) {
            if (isCorrectKey) {
              borderClass = 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/50';
            } else if (isUserChoice && !evaluation.passed) {
              borderClass = 'border-rose-500/80 bg-rose-950/30';
            }
          }

          return (
            <button
              key={opt.key}
              type="button"
              disabled={isLoading || isEvaluated}
              onClick={() => setSelectedKey(opt.key)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 ${borderClass} cursor-pointer group`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}
                >
                  {opt.key}
                </div>
                <span className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {opt.label}
                </span>
              </div>

              {/* Status Icons */}
              {isEvaluated && isCorrectKey && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {isEvaluated && isUserChoice && !evaluation.passed && (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Evaluation Feedback */}
      {evaluation && (
        <div
          className={`mb-4 p-3.5 rounded-lg border text-xs sm:text-sm leading-relaxed ${
            evaluation.passed
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
          }`}
        >
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            {evaluation.passed ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Verified Mastery!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Key Exam Trap Note</span>
              </>
            )}
          </div>
          <p className="whitespace-pre-line text-slate-300 text-xs sm:text-sm">
            {evaluation.feedback}
          </p>
        </div>
      )}

      {/* Action Footer */}
      {!evaluation && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Instant Check & Seamless Syllabus Progression
          </span>

          <button
            type="button"
            disabled={!selectedKey || isLoading}
            onClick={() => handleSubmit()}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-md cursor-pointer ${
              selectedKey && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            {isLoading ? (
              <span>Evaluating...</span>
            ) : (
              <>
                <span>Check & Next Topic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
