import React, { useState, useEffect } from 'react';
import { TutorResponseMode, ChatMessage, Subject } from '../types';
import { Bot, Send, Sparkles, BookOpen, KeyRound, Zap, ShieldCheck, Cpu } from 'lucide-react';
import { AIKeyConfigModal } from './AIKeyConfigModal';
import {
  getAiRequestPayload,
  getStoredAiSettings,
  subscribeToAiSettings,
  MODEL_PRESETS,
  StoredAiSettings,
} from '../utils/aiModelService';

interface AITutorViewProps {
  subjects: Subject[];
  initialPrompt?: string;
}

export const AITutorView: React.FC<AITutorViewProps> = ({ subjects, initialPrompt }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjects[0]?.name || 'Course Subject'
  );

  useEffect(() => {
    if ((selectedSubject === 'Course Subject' || !selectedSubject) && subjects[0]?.name) {
      setSelectedSubject(subjects[0].name);
    }
  }, [subjects, selectedSubject]);
  const [activeMode, setActiveMode] = useState<TutorResponseMode>('simple');
  const [inputQuery, setInputQuery] = useState<string>(initialPrompt || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  const [aiSettings, setAiSettings] = useState<StoredAiSettings>(getStoredAiSettings());
  const [classModelInfo, setClassModelInfo] = useState<{
    hasCustomKey: boolean;
    providerName: string;
  }>({
    hasCustomKey: false,
    providerName: 'Built-in Academic Model',
  });

  useEffect(() => {
    fetch('/api/ai/config')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setClassModelInfo({
            hasCustomKey: Boolean(data.hasCustomKey),
            providerName: data.providerName || 'Built-in Academic Model',
          });
        }
      })
      .catch(() => {});

    return subscribeToAiSettings((s) => {
      setAiSettings(s);
    });
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Hello! Ask any question or paste a topic from ${selectedSubject} to study.`,
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
          ...getAiRequestPayload(),
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
            <Bot className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <h1 className="font-sans-ui font-semibold text-xs sm:text-sm text-slate-100 leading-tight">
              AI Tutor
            </h1>
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

          {/* Mobile & Tablet Pedagogy Mode Selector */}
          <select
            value={activeMode}
            onChange={(e) => setActiveMode(e.target.value as TutorResponseMode)}
            className="lg:hidden bg-slate-900 border border-slate-800/90 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer font-sans-ui"
            aria-label="Pedagogy Mode"
          >
            {primaryModes.map((m) => (
              <option key={m.mode} value={m.mode}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Desktop Pedagogy Mode Selector (Linear Segmented Control) */}
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



      {/* 3. Integrated Study Stream (Scholarly Entries, not chat bubbles) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          if (msg.sender === 'student') {
            return (
              <div key={msg.id} className="border-b border-slate-800/60 pb-3 pt-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <span className="academic-tag text-[9px] text-neutral-400">Student Inquiry</span>
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
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 text-xs">
                <span className="academic-tag text-[10px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                  {msg.modeUsed ? msg.modeUsed.toUpperCase().replace('_', ' ') : 'ACADEMIC LESSON'}
                </span>
                <span className="font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Explanatory Content */}
              <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>

              {/* Citations & Syllabus References */}
              {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                <div className="pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs">
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
              <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => handleSend(`Structure this explanation as a standard 10-marker university exam answer with diagrams and key scoring points.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  10-Marker
                </button>
                <button
                  onClick={() => handleSend(`Explain this concept using a simple real-world analogy (ELI9) with intuitive takeaways.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  ELI9
                </button>
                <button
                  onClick={() => handleSend(`Provide a 5-mark conceptual practice question with an evaluation rubric on this topic.`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer font-sans-ui"
                >
                  Quiz
                </button>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 p-3 rounded-md bg-slate-900/40 border border-slate-800/60 font-sans-ui">
            <Sparkles className="w-4 h-4 text-neutral-300 animate-spin" />
            <span>Formulating explanation...</span>
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
            placeholder={`Ask anything about ${selectedSubject}...`}
            className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-slate-600 rounded-md px-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans-ui"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-3 py-2 rounded-md bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 transition cursor-pointer flex items-center justify-center shrink-0"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* AI Key Configuration Modal */}
      <AIKeyConfigModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onConfigUpdated={(updated) => {
          setClassModelInfo({
            hasCustomKey: updated.hasCustomKey,
            providerName: updated.providerName,
          });
          setAiSettings(getStoredAiSettings());
        }}
      />
    </div>
  );
};
