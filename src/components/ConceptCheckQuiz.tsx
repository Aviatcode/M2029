import React, { useState } from 'react';
import { LessonContent } from '../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Sparkles, Send, RefreshCw, Trophy, HelpCircle } from 'lucide-react';

interface ConceptCheckQuizProps {
  lesson: LessonContent;
  topicTitle: string;
  onMasteryUpdated?: (score: number) => void;
}

export const ConceptCheckQuiz: React.FC<ConceptCheckQuizProps> = ({
  lesson,
  topicTitle,
  onMasteryUpdated,
}) => {
  const quiz = lesson.conceptCheck;
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedOption, setHasSubmittedOption] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const [evaluatingOpen, setEvaluatingOpen] = useState(false);
  const [openResult, setOpenResult] = useState<{
    score: number;
    passed: boolean;
    feedback: string;
    misconceptions: string[];
  } | null>(null);

  if (!quiz) {
    return null;
  }

  const handleSelectOption = (idx: number) => {
    if (hasSubmittedOption) return;
    setSelectedOption(idx);
    setHasSubmittedOption(true);

    const isCorrect = idx === quiz.correctIndex;
    if (isCorrect) {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
      });
      onMasteryUpdated?.(95);
    } else {
      onMasteryUpdated?.(45);
    }
  };

  const handleResetQuiz = () => {
    setSelectedOption(null);
    setHasSubmittedOption(false);
    setOpenAnswer('');
    setOpenResult(null);
  };

  const handleSubmitOpenAnswer = async () => {
    if (!openAnswer.trim()) return;
    setEvaluatingOpen(true);
    try {
      const res = await fetch('/api/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle,
          question: quiz.openEndedPrompt || quiz.question,
          studentAnswer: openAnswer,
          isOption: false,
        }),
      });
      const data = await res.json();
      setOpenResult(data);
      if (data.passed) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
        });
        onMasteryUpdated?.(data.score * 10);
      }
    } catch (err) {
      console.error('Quiz evaluation error:', err);
    } finally {
      setEvaluatingOpen(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-7 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
            <Trophy className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base md:text-lg">
              Adaptive Concept Check & Mastery Verification
            </h3>
            <p className="text-xs text-slate-400">
              Test your understanding before the lecture to lock this into long-term memory.
            </p>
          </div>
        </div>

        {hasSubmittedOption && (
          <button
            onClick={handleResetQuiz}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Check</span>
          </button>
        )}
      </div>

      {/* Multiple Choice Question */}
      <div className="space-y-4">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <h4 className="font-semibold text-slate-100 text-sm md:text-base leading-relaxed">
            {quiz.question}
          </h4>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {quiz.options.map((opt, idx) => {
            const isChosen = selectedOption === idx;
            const isCorrect = idx === quiz.correctIndex;

            let buttonClass =
              'p-3.5 rounded-xl border text-xs md:text-sm text-left transition font-medium flex items-center justify-between ';

            if (!hasSubmittedOption) {
              buttonClass +=
                'border-slate-800 bg-slate-950/70 hover:border-cyan-500 hover:bg-slate-900 text-slate-200 cursor-pointer';
            } else if (isCorrect) {
              buttonClass +=
                'border-emerald-500/80 bg-emerald-950/40 text-emerald-200 font-semibold shadow-md shadow-emerald-500/10';
            } else if (isChosen && !isCorrect) {
              buttonClass += 'border-rose-500/80 bg-rose-950/40 text-rose-200';
            } else {
              buttonClass += 'border-slate-800/60 bg-slate-950/40 text-slate-500 opacity-60';
            }

            return (
              <button
                key={idx}
                disabled={hasSubmittedOption}
                onClick={() => handleSelectOption(idx)}
                className={buttonClass}
              >
                <span>{opt}</span>
                {hasSubmittedOption && isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                )}
                {hasSubmittedOption && isChosen && !isCorrect && (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Card */}
        {hasSubmittedOption && (
          <div
            className={`p-4 rounded-xl border text-xs md:text-sm leading-relaxed transition ${
              selectedOption === quiz.correctIndex
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>
                {selectedOption === quiz.correctIndex ? 'Mastery Confirmed!' : 'Diagnosis & Explanation:'}
              </span>
            </div>
            <p>{quiz.explanation}</p>
          </div>
        )}
      </div>

      {/* Open-Ended Active Recall Prompt */}
      {quiz.openEndedPrompt && (
        <div className="pt-5 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Active Recall Drill (Explain In Your Own Words)</span>
          </div>
          <p className="text-xs md:text-sm text-slate-300">{quiz.openEndedPrompt}</p>

          <div className="relative">
            <textarea
              rows={2}
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              placeholder="Type your explanation here to have the AI evaluate your exam readiness..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 resize-none"
            />
            <button
              onClick={handleSubmitOpenAnswer}
              disabled={evaluatingOpen || !openAnswer.trim()}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition ml-auto cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{evaluatingOpen ? 'Evaluating Answer...' : 'Evaluate My Answer'}</span>
            </button>
          </div>

          {openResult && (
            <div
              className={`p-4 rounded-xl border text-xs md:text-sm space-y-2 ${
                openResult.passed
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Score: {openResult.score} / 10 Marks</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {openResult.passed ? 'PASSED ✅' : 'NEEDS REVISION ⚠️'}
                </span>
              </div>
              <p className="leading-relaxed">{openResult.feedback}</p>
              {openResult.misconceptions && openResult.misconceptions.length > 0 && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300">
                  <span className="font-semibold">Review Points:</span> {openResult.misconceptions.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
