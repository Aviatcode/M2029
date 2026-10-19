import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Users,
  CheckCircle2,
  X,
  History,
  ArrowRight,
  Zap,
  BookOpen,
  Cpu,
  Layers,
  Flame,
  Check,
} from 'lucide-react';
import { EvolutionStep } from '../types';

interface CohortIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle?: string;
  subjectName?: string;
  currentIteration?: number;
  perfectionScore?: number;
  evolutionHistory?: EvolutionStep[];
  onTriggerElevateTo60?: () => void;
  onTriggerRefineNext?: (feedback: string) => void;
  isElevating?: boolean;
}

export const CohortIntelligenceModal: React.FC<CohortIntelligenceModalProps> = ({
  isOpen,
  onClose,
  topicTitle = 'CPU Scheduling & Gantt Charts',
  subjectName = 'Operating Systems',
  currentIteration = 60,
  perfectionScore = 99,
  evolutionHistory = [],
  onTriggerElevateTo60,
  onTriggerRefineNext,
  isElevating = false,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'how_it_works' | 'refine'>('timeline');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  if (!isOpen) return null;

  const isPerfected = currentIteration >= 60;

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;
    setIsSubmittingFeedback(true);
    if (onTriggerRefineNext) {
      await onTriggerRefineNext(feedbackInput.trim());
    }
    setIsSubmittingFeedback(false);
    setFeedbackSuccess(`✓ Refinement recorded! Elevated to Student ${currentIteration + 1} iteration.`);
    setFeedbackInput('');
    setTimeout(() => setFeedbackSuccess(''), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-750 p-6 sm:p-7 shadow-2xl text-slate-100 my-8 cursor-default space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold text-amber-400 font-mono tracking-wider">
                  60-Student Compounding Intelligence Engine
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  {isPerfected ? '🏆 Golden Master Standard' : `Iteration ${currentIteration}/60`}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 font-sans-ui">
                {topicTitle} · <span className="text-slate-400 font-normal">{subjectName}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Mechanism Banner: How It Compounds */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium font-sans-ui">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>How 60-Student Compounding Intelligence Works:</span>
            </div>
            <span className="font-mono text-cyan-400 text-[11px] font-semibold">
              Perfection Score: {perfectionScore}%
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans-ui">
            When Student 1 queries a topic, the baseline draft is generated. When Student 2 studies it, the AI improves and refines it. By the 60th student, definitions, ASCII flowcharts, algorithms, 10-marker exam traps, and real-world code are completely perfected. This flawless master output is then surfaced to <strong>everyone across the entire website and PWA with 0 tokens spent</strong>!
          </p>
        </div>

        {/* 3. Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
          {[
            { id: 'timeline', label: `Evolution History (${evolutionHistory.length || 7} Steps)`, icon: History },
            { id: 'how_it_works', label: '60-Student Pipeline Architecture', icon: Layers },
            { id: 'refine', label: `Contribute Refinement (Student ${currentIteration + 1})`, icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-2 font-medium transition cursor-pointer relative flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'text-cyan-300 font-semibold border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Tab Content */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {evolutionHistory.length > 0 ? (
                evolutionHistory.map((step, idx) => (
                  <div key={idx} className="relative group">
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                        step.iteration >= 60
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {step.iteration >= 60 ? '★' : step.iteration}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5 font-sans-ui">
                          <span>{step.studentLabel}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-cyan-400 font-normal">{step.focus}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(step.improvedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans-ui leading-relaxed">
                        {step.summary}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-6 text-center italic">
                  No historical evolution logged yet for this topic.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'how_it_works' && (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  tier: 'Students 1 – 10',
                  title: 'Foundation & Conceptual Intuition',
                  desc: 'Captures the student query, derives formal definitions from syllabus, and pairs it with real-world ELI9 analogies.',
                  color: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
                },
                {
                  tier: 'Students 11 – 25',
                  title: 'Visual Flow & Mathematical Proofs',
                  desc: 'Embeds complete ASCII architecture flowcharts, state transitions, equations, and Turnaround/Wait time formulas.',
                  color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
                },
                {
                  tier: 'Students 26 – 40',
                  title: 'Production Code & Corner Cases',
                  desc: 'Provides fully commented, executable C/Java/SQL snippets, memory invariants, and race condition boundaries.',
                  color: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
                },
                {
                  tier: 'Students 41 – 60',
                  title: 'Examiner Rubric & Master Polish',
                  desc: 'Structures strictly into 10-Marker university Section C format, flags frequent examiner traps, and locks in the Gold Standard.',
                  color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
                },
              ].map((phase, i) => (
                <div key={i} className={`p-3.5 rounded-xl border ${phase.color} space-y-1.5`}>
                  <div className="font-mono text-[10px] font-bold uppercase">{phase.tier}</div>
                  <div className="font-semibold text-slate-100">{phase.title}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{phase.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Once perfected, the 60th-student output is permanently cached to disk and served instantly to all classroom devices with <strong>0 tokens consumed</strong>.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'refine' && (
          <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Submit an Improvement as Student {currentIteration + 1}:
              </label>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="What nuance, code clarification, or exam gotcha should be improved for this topic? e.g., 'Add a quick mnemonic for Coffman conditions' or 'Clarify race conditions in line 12 of code'..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>

            {feedbackSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!feedbackInput.trim() || isSubmittingFeedback}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmittingFeedback ? 'Synthesizing...' : `Elevate to Iteration ${currentIteration + 1}`}</span>
              </button>
            </div>
          </form>
        )}

        {/* 5. Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shared across Class Batch (60 Students)</span>
          </div>

          <div className="flex items-center gap-2">
            {!isPerfected && onTriggerElevateTo60 && (
              <button
                onClick={onTriggerElevateTo60}
                disabled={isElevating}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{isElevating ? 'Running 60-Student Pipeline...' : '⚡ Fast-Track to 60-Student Perfection'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
