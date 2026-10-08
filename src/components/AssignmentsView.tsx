import React, { useState } from 'react';
import { AcademicAssignment } from '../types';
import { Calendar, BookOpen, Send } from 'lucide-react';

interface AssignmentsViewProps {
  assignments: AcademicAssignment[];
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ assignments }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<AcademicAssignment>(
    assignments[0]
  );
  const [integrityMode, setIntegrityMode] = useState<'teach_me' | 'improve_answer'>(
    'teach_me'
  );
  const [studentDraft, setStudentDraft] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const handleReviewDraft = () => {
    if (!studentDraft.trim()) return;
    setIsReviewing(true);
    setTimeout(() => {
      setReviewResult(
        `Academic Review:\n- Strong points: Your discussion of Functional Dependencies is clear.\n- Area to improve: Make sure to explicitly write the 3NF condition: "For every non-trivial FD X -> Y, either X is a superkey OR Y is a prime attribute".\n- Citation suggestion: Add standard textbook reference to Chapter 7 of Korth.`
      );
      setIsReviewing(false);
    }, 700);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
          Assignments & Homework
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Step-by-step guidance, instructions, and feedback on assignment drafts.
        </p>
      </div>

      {/* Assignment Detail Card */}
      {selectedAssignment && (
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-5 space-y-5">
          <div className="pb-3 border-b border-slate-800/60">
            <div className="text-xs text-slate-400">
              {selectedAssignment.subjectName} · Due {selectedAssignment.dueDate}
            </div>
            <h2 className="text-base font-medium text-slate-100 mt-0.5">
              {selectedAssignment.title}
            </h2>
          </div>

          {/* Teacher Instructions */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Instructions
            </h3>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/60">
              {selectedAssignment.instructions}
            </p>
          </div>

          {/* Structural Outline */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Suggested Structure
            </h3>
            <div className="space-y-1.5">
              {selectedAssignment.outlineSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2.5"
                >
                  <span className="font-mono text-slate-400 font-medium">
                    {idx + 1}.
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assistant Mode */}
          <div className="space-y-3 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Mode:</span>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  onClick={() => setIntegrityMode('teach_me')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    integrityMode === 'teach_me'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  How to Approach
                </button>
                <button
                  onClick={() => setIntegrityMode('improve_answer')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    integrityMode === 'improve_answer'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Critique My Draft
                </button>
              </div>
            </div>

            {integrityMode === 'teach_me' ? (
              <div className="p-3.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs md:text-sm text-slate-300 space-y-1">
                <div className="font-medium text-slate-200">Guidance:</div>
                <p className="leading-relaxed">{selectedAssignment.sampleDraftGuidance}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <textarea
                  rows={4}
                  placeholder="Paste your rough draft or bullet points here for AI critique..."
                  value={studentDraft}
                  onChange={(e) => setStudentDraft(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                />

                <button
                  onClick={handleReviewDraft}
                  disabled={isReviewing || !studentDraft.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReviewing ? 'Analyzing...' : 'Critique My Draft'}</span>
                </button>

                {reviewResult && (
                  <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {reviewResult}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
