import React, { useState } from 'react';
import { SevenMinutePrep } from '../types';
import confetti from 'canvas-confetti';
import { Sun, CheckCircle, ArrowRight, ArrowLeft, X, Sparkles, HelpCircle, Trophy } from 'lucide-react';

interface TomorrowPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  prep: SevenMinutePrep;
}

export const TomorrowPrepModal: React.FC<TomorrowPrepModalProps> = ({ isOpen, onClose, prep }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    prep.step4MiniQuiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) score++;
    });
    return score;
  };

  const handleFinishQuiz = () => {
    setQuizSubmitted(true);
    const score = calculateScore();
    if (score >= 2) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-md">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-400">
                  🌅 7-Minute Pre-Lecture Prep
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Step {currentStep} of 4
                </span>
              </div>
              <h2 className="font-extrabold text-lg text-white">
                {prep.subjectName}: {prep.topicTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { num: 1, label: '1. What is it?' },
            { num: 2, label: '2. Why used?' },
            { num: 3, label: '3. Analogy & Code' },
            { num: 4, label: '4. Mini Quiz' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`p-2 rounded-xl border text-center cursor-pointer transition text-xs font-semibold ${
                currentStep === s.num
                  ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-md'
                  : currentStep > s.num
                  ? 'border-neutral-700 bg-neutral-800 text-neutral-200'
                  : 'border-slate-800 bg-slate-950/40 text-slate-500'
              }`}
            >
              <span className="block truncate">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[220px]">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>1. Core Definition in 2 Sentences</span>
              </div>
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-medium bg-slate-950/70 p-5 rounded-xl border border-slate-800">
                {prep.step1WhatIsIt}
              </p>
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200">
                💡 <strong>Pre-class insight:</strong> When your professor walks into Room {prep.room} tomorrow at {prep.time}, you will already understand what this keyword represents!
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>2. Why Do Software Engineers & Professors Care?</span>
              </div>
              <p className="text-base md:text-lg text-slate-200 leading-relaxed font-medium bg-slate-950/70 p-5 rounded-xl border border-slate-800">
                {prep.step2WhyUsed}
              </p>
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
                🎯 <strong>Exam Value:</strong> University theory questions almost always ask "Explain advantages and real-world necessity of this mechanism".
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>3. Everyday Analogy & Syntax Blueprint</span>
              </div>
              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-slate-200 text-sm md:text-base leading-relaxed">
                {prep.step3AnalogyAndExample}
              </div>
            </div>
          )}

          {/* Step 4: Mini Quiz */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>4. 3-Question Pre-Class Verification Quiz</span>
                </div>
                {quizSubmitted && (
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    Score: {calculateScore()} / {prep.step4MiniQuiz.length}
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {prep.step4MiniQuiz.map((q, qIdx) => {
                  const chosenOpt = quizAnswers[qIdx];
                  const isCorrect = chosenOpt === q.correctIndex;

                  return (
                    <div key={qIdx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                      <p className="text-xs md:text-sm font-semibold text-slate-200">
                        Q{qIdx + 1}. {q.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isOptionChosen = chosenOpt === optIdx;

                          let btnStyle =
                            'p-2.5 rounded-lg border text-xs text-left transition font-medium ';
                          if (!quizSubmitted) {
                            btnStyle +=
                              isOptionChosen
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 cursor-pointer';
                          } else if (optIdx === q.correctIndex) {
                            btnStyle += 'border-neutral-500 bg-neutral-800 text-neutral-100 font-semibold';
                          } else if (isOptionChosen && !isCorrect) {
                            btnStyle += 'border-rose-500 bg-rose-950/40 text-rose-200';
                          } else {
                            btnStyle += 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-60';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                              className={btnStyle}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="text-[11px] text-slate-400 pt-1 italic">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted ? (
                <button
                  onClick={handleFinishQuiz}
                  className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Verify My 7-Minute Answers
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs text-center font-medium">
                  🎉 Pre-lecture prep complete! You are ready to ace tomorrow's lecture in Room {prep.room}.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-6">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 4))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Done Prep
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
