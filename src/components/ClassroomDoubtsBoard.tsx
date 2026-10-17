import React, { useState } from 'react';
import { ClassroomDoubt } from '../types';
import { MessageSquare, ThumbsUp, Send, Users, Sparkles } from 'lucide-react';

interface ClassroomDoubtsBoardProps {
  doubts: ClassroomDoubt[];
  topicId: string;
  topicTitle: string;
  classCode: string;
  onDoubtAdded?: (newDoubt: ClassroomDoubt) => void;
}

export const ClassroomDoubtsBoard: React.FC<ClassroomDoubtsBoardProps> = ({
  doubts,
  topicId,
  topicTitle,
  classCode,
  onDoubtAdded,
}) => {
  const [studentName, setStudentName] = useState('');
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotesMap, setUpvotesMap] = useState<Record<string, number>>({});

  const filteredDoubts = doubts.filter((d) => !d.topicId || d.topicId === topicId || d.topicId === 'general');

  const handleUpvote = (id: string, current: number) => {
    setUpvotesMap((prev) => ({
      ...prev,
      [id]: (prev[id] ?? current) + 1,
    }));
  };

  const handleAskDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/doubts/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode,
          topicId,
          topicTitle,
          studentName: studentName.trim() || 'Classmate',
          question: question.trim(),
        }),
      });
      const data = await res.json();
      onDoubtAdded?.(data);
      setQuestion('');
    } catch (err) {
      console.error('Failed to submit doubt:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-7 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="font-semibold text-white text-base">
            Class Doubts
          </h3>
        </div>
      </div>

      {/* Ask New Doubt Form */}
      <form onSubmit={handleAskDoubt} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span>Ask Question</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Your Name (Optional)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="e.g. What happens if queue size is 1 or empty array?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            className="md:col-span-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !question.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 text-xs font-medium shadow-xs transition disabled:opacity-50 ml-auto cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Submitting...' : 'Ask Question'}</span>
        </button>
      </form>

      {/* Pinned Doubts Stream */}
      <div className="space-y-3.5">
        {filteredDoubts.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No doubts asked yet for this topic. Be the first to ask!
          </div>
        ) : (
          filteredDoubts.map((doubt) => {
            const votes = upvotesMap[doubt.id] ?? doubt.upvotes;

            return (
              <div
                key={doubt.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{doubt.studentName}</span>
                    <span>•</span>
                    <span className="text-[11px] text-slate-500">{doubt.createdAt}</span>
                  </div>
                  <button
                    onClick={() => handleUpvote(doubt.id, doubt.upvotes)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs border border-slate-800 transition cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-slate-400" />
                    <span>{votes} helpful</span>
                  </button>
                </div>

                <div className="flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm font-medium text-slate-100">{doubt.question}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs md:text-sm text-slate-300 leading-relaxed">
                  <div className="text-[11px] font-mono text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <span>Explanation:</span>
                  </div>
                  {doubt.answer}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
