import React, { useState, useEffect } from 'react';
import { TutorResponseMode, ChatMessage, Subject } from '../types';
import { Bot, Send, Sparkles, BookOpen, KeyRound, Zap, ShieldCheck } from 'lucide-react';
import { AIKeyConfigModal } from './AIKeyConfigModal';

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
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  const [aiStatus, setAiStatus] = useState<{
    hasCustomKey: boolean;
    modelType: 'gemini' | 'basic';
    providerName: string;
  }>({
    hasCustomKey: false,
    modelType: 'basic',
    providerName: 'Built-in Basic Academic Model',
  });

  useEffect(() => {
    fetch('/api/ai/config')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.modelType) {
          setAiStatus(data);
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="max-w-4xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col rounded-md bg-slate-950 border border-slate-800/80 shadow-2xs overflow-hidden animate-fade-in">
      {/* 1. Academic Desk Header with Subject & Pedagogical Controls */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-sans-ui font-semibold text-xs sm:text-sm text-slate-100 leading-tight">
              AI Study Hall
            </h1>
            <p className="academic-tag text-[9px] text-slate-400">
              Autonomous Curriculum Companion
            </p>
          </div>
        </div>

        {/* Clean Subject & Style Controls */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800/90 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer font-sans-ui"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Pedagogy Mode Selector (Linear Segmented Control) */}
          <div className="hidden lg:flex items-center rounded bg-slate-900 border border-slate-800 p-0.5">
            {primaryModes.map((m) => (
              <button
                key={m.mode}
                onClick={() => setActiveMode(m.mode)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer font-sans-ui ${
                  activeMode === m.mode
                    ? 'bg-slate-800 text-slate-100 font-semibold shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Academic Model Tier & Shared Classroom Key Docket */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 shrink-0">
        <div className="flex items-center gap-2 text-slate-300">
          {aiStatus.hasCustomKey ? (
            <span className="academic-tag text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Gemini 2.5 Active</span>
            </span>
          ) : (
            <span className="academic-tag text-[10px] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded inline-flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Basic Academic Model</span>
            </span>
          )}
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-[11px] text-slate-400 font-sans-ui hidden sm:inline">
            {aiStatus.hasCustomKey
              ? 'Shared class Gemini key unlocked for syllabus reasoning'
              : 'CR or any classmate can add a free Gemini API key'}
          </span>
        </div>

        <button
          onClick={() => setIsKeyModalOpen(true)}
          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5 font-sans-ui"
          title="Configure Class Gemini API Key or switch to basic model"
        >
          <KeyRound className="w-3 h-3 text-slate-400" />
          <span>{aiStatus.hasCustomKey ? 'Manage Gemini Key' : 'Configure Gemini Key (CR/Student)'}</span>
        </button>
      </div>

      {/* 3. Integrated Study Stream (Scholarly Entries, not chat bubbles) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          if (msg.sender === 'student') {
            return (
              <div key={msg.id} className="border-b border-slate-800/60 pb-3 pt-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <span className="academic-tag text-[9px] text-emerald-400">Student Inquiry</span>
                  <span>·</span>
                  <span className="font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
                <div className="text-base sm:text-lg font-semibold text-slate-100 font-sans-ui">
                  {msg.text}
                </div>
              </div>
            );
          }

          // AI Tutor Lesson Entry
          return (
            <div
              key={msg.id}
              className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="academic-tag text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/25 px-2 py-0.5 rounded">
                    {msg.modeUsed ? msg.modeUsed.toUpperCase().replace('_', ' ') : 'ACADEMIC LESSON'}
                  </span>
                  <span className="text-slate-400 text-[11px] font-sans-ui hidden sm:inline">
                    Curriculum & Exam Archive Alignment
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Explanatory Content */}
              <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>

              {/* Citations & Syllabus References */}
              {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
                  <span className="academic-tag text-[9px] text-slate-500">References:</span>
                  {msg.sourcesUsed.map((src, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-sans-ui"
                    >
                      § {src.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Academic Follow-up Inquiries */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[10px] text-slate-500 academic-tag">Actions:</span>
                <button
                  onClick={() => handleSend(`Structure this explanation as a standard 10-marker university exam answer with diagrams and key scoring points.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  10-Marker Exam Format
                </button>
                <button
                  onClick={() => handleSend(`Explain this concept using a simple real-world analogy (ELI9) with intuitive takeaways.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  ELI9 Analogy
                </button>
                <button
                  onClick={() => handleSend(`Provide a 5-mark conceptual practice question with an evaluation rubric on this topic.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  5-Mark Quiz
                </button>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 p-3 rounded-md bg-slate-900/40 border border-slate-800/60 font-sans-ui">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Consulting syllabus knowledge base & formulating academic explanation...</span>
          </div>
        )}
      </div>

      {/* 4. Single-Action Scholarly Prompt Bar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Inquire any concept or question about ${selectedSubject}...`}
            className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-slate-600 rounded-md px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans-ui shadow-2xs"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-3.5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer font-sans-ui text-xs font-medium flex items-center gap-1.5"
            title="Submit academic query"
          >
            <span>Inquire</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* AI Key Configuration Modal */}
      <AIKeyConfigModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onConfigUpdated={(updated) => {
          setAiStatus(updated);
        }}
      />
    </div>
  );
};
