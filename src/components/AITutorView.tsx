import React, { useState } from 'react';
import { TutorResponseMode, ChatMessage, Subject } from '../types';
import { Bot, Send, Sparkles, BookOpen } from 'lucide-react';

interface AITutorViewProps {
  subjects: Subject[];
  initialPrompt?: string;
}

export const AITutorView: React.FC<AITutorViewProps> = ({ subjects, initialPrompt }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjects[0]?.name || 'Database Management Systems'
  );
  const [activeMode, setActiveMode] = useState<TutorResponseMode>('simple');
  const [inputQuery, setInputQuery] = useState<string>(initialPrompt || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Hello! I am your academic tutor for ${selectedSubject}.
I have access to your class syllabus, teacher notes, and past university question papers.
Ask me any question or paste a topic you are finding difficult to understand.`,
      timestamp: 'Just now',
      sourcesUsed: [
        { title: 'Class Syllabus & Shared Notes', type: 'Knowledge Base' },
        { title: 'University PYQ Papers (2020-2025)', type: 'Exam Archive' },
      ],
    },
  ]);

  const handleSend = async (queryText = inputQuery) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'student',
      text: queryText.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText.trim(),
          mode: activeMode,
          subjectName: selectedSubject,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer || 'No response generated.',
        modeUsed: data.modeUsed || activeMode,
        timestamp: 'Just now',
        sourcesUsed: data.sourcesUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI Tutor error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const primaryModes: { mode: TutorResponseMode; label: string }[] = [
    { mode: 'simple', label: 'Simple' },
    { mode: 'eli9', label: 'ELI9 (Analogies)' },
    { mode: 'hinglish', label: 'Hinglish' },
    { mode: 'exam_10marker', label: '10-Marker Format' },
    { mode: 'detailed', label: 'Deep Dive' },
    { mode: 'socratic', label: 'Quiz Me' },
  ];

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-6rem)] flex flex-col rounded-xl bg-slate-900/40 border border-slate-800/80 shadow-sm overflow-hidden">
      {/* Calm, Minimal Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-slate-100">AI Teacher</span>
        </div>

        {/* Clean Subject & Style Controls */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Calm Mode Selector */}
          <div className="hidden sm:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {primaryModes.map((m) => (
              <button
                key={m.mode}
                onClick={() => setActiveMode(m.mode)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  activeMode === m.mode
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Stream with Generous Whitespace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-xl rounded-xl p-4 text-xs md:text-sm leading-relaxed space-y-2 ${
                msg.sender === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950/80 border border-slate-800/80 text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</div>

              {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-sans">
                  Grounded in: {msg.sourcesUsed.map((s) => s.title).join(' · ')}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2 max-w-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Consulting class notes...</span>
          </div>
        )}
      </div>

      {/* Clean Single Input Bar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`Ask about ${selectedSubject}...`}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
