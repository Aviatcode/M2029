import React, { useState, useEffect, useRef } from 'react';
import { TutorResponseMode, Subject, Unit } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  KeyRound,
  Zap,
  ShieldCheck,
  Cpu,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GraduationCap,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AIKeyConfigModal } from './AIKeyConfigModal';
import {
  getAiRequestPayload,
  getStoredAiSettings,
  subscribeToAiSettings,
  StoredAiSettings,
} from '../utils/aiModelService';

interface AITutorViewProps {
  subjects: Subject[];
  initialPrompt?: string;
  initialTopic?: string;
  initialSubject?: string;
  unitsBySubject?: Record<string, Unit[]>;
}

interface StudyGuideData {
  topic: string;
  subject: string;
  sections: {
    simple: string;
    eli9: string;
    hinglish: string;
    exam_10marker: string;
    detailed: string;
    socratic: string;
  };
  sourcesUsed?: { title: string; type: string }[];
}

function extractCleanTopic(raw: string): string {
  if (!raw) return '';
  const matchQuotes = raw.match(/"([^"]+)"/);
  if (matchQuotes && matchQuotes[1].trim()) return matchQuotes[1].trim();
  const matchOf = raw.match(/of\s+([^.]+?)(?:\s+in|\.|$)/i);
  if (matchOf && matchOf[1].trim()) return matchOf[1].trim();
  return raw
    .replace(/^Explain\s+(?:the\s+core\s+principles\s+and\s+university\s+exam\s+gotchas\s+of\s+)?/i, '')
    .replace(/\.$/, '')
    .trim();
}

function parseSectionsFromText(text: string): {
  simple: string;
  eli9: string;
  hinglish: string;
  exam_10marker: string;
  detailed: string;
  socratic: string;
} {
  const sections = {
    simple: '',
    eli9: '',
    hinglish: '',
    exam_10marker: '',
    detailed: '',
    socratic: '',
  };

  const regexes: { key: keyof typeof sections; pattern: RegExp }[] = [
    { key: 'simple', pattern: /###\s*(?:1[.)]?\s*)?Simple[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
    { key: 'eli9', pattern: /###\s*(?:2[.)]?\s*)?ELI9[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
    { key: 'hinglish', pattern: /###\s*(?:3[.)]?\s*)?Hinglish[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
    { key: 'exam_10marker', pattern: /###\s*(?:4[.)]?\s*)?10-Marker[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
    { key: 'detailed', pattern: /###\s*(?:5[.)]?\s*)?Deep Dive[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
    { key: 'socratic', pattern: /###\s*(?:6[.)]?\s*)?Quiz Me[^\n]*\n([\s\S]*?)(?=(?:###\s*\d|\Z))/i },
  ];

  for (const { key, pattern } of regexes) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  // Fallback if headers were not present
  if (!sections.simple && !sections.exam_10marker && text.trim()) {
    sections.simple = text.trim();
  }

  return sections;
}

export const AITutorView: React.FC<AITutorViewProps> = ({
  subjects,
  initialPrompt,
  initialTopic,
  initialSubject,
  unitsBySubject,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || subjects[0]?.name || 'Course Subject'
  );

  useEffect(() => {
    if ((selectedSubject === 'Course Subject' || !selectedSubject) && subjects[0]?.name) {
      setSelectedSubject(subjects[0].name);
    }
  }, [subjects, selectedSubject]);

  // Exact 6-stage pedagogy mode order
  const primaryModes: { mode: TutorResponseMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'simple', label: 'Simple', icon: BookOpen },
    { mode: 'eli9', label: 'ELI9 (Analogies)', icon: Lightbulb },
    { mode: 'hinglish', label: 'Hinglish', icon: Sparkles },
    { mode: 'exam_10marker', label: '10-Marker Format', icon: GraduationCap },
    { mode: 'detailed', label: 'Deep Dive', icon: Cpu },
    { mode: 'socratic', label: 'Quiz Me', icon: HelpCircle },
  ];

  const [activeTabMode, setActiveTabMode] = useState<'all' | TutorResponseMode>('all');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [, setAiSettings] = useState<StoredAiSettings>(getStoredAiSettings());
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

  // Handle loading a topic directly in the ordered format
  const loadTopicGuide = async (topicTitle: string, subjectName = selectedSubject) => {
    const cleanTopic = extractCleanTopic(topicTitle);
    if (!cleanTopic || isLoading) return;

    setIsLoading(true);
    setRevealedAnswers({});

    try {
      const res = await fetch('/api/ai-tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: cleanTopic,
          topicName: cleanTopic,
          subjectName,
          mode: 'all',
          ...getAiRequestPayload(),
        }),
      });

      const data = await res.json();
      const rawText = data.answer || data.text || '';
      const parsed = data.sections || parseSectionsFromText(rawText);

      setStudyGuide({
        topic: cleanTopic,
        subject: subjectName,
        sections: {
          simple: parsed.simple || rawText,
          eli9: parsed.eli9 || '',
          hinglish: parsed.hinglish || '',
          exam_10marker: parsed.exam_10marker || '',
          detailed: parsed.detailed || '',
          socratic: parsed.socratic || '',
        },
        sourcesUsed: data.sourcesUsed || [
          { title: `${subjectName} Verified Syllabus`, type: 'Curriculum' },
          { title: 'University PYQ Database (2020-2025)', type: 'Exam Bank' },
        ],
      });

      // Smooth scroll back to top of container
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error loading AI Tutor guide:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load if initialTopic or initialPrompt is passed
  useEffect(() => {
    const candidate = initialTopic || (initialPrompt ? extractCleanTopic(initialPrompt) : '');
    if (candidate && candidate !== studyGuide?.topic) {
      loadTopicGuide(candidate, initialSubject || selectedSubject);
    }
  }, [initialTopic, initialPrompt]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Quick topics for current subject
  const currentSubjectObj = subjects.find((s) => s.name === selectedSubject);
  const syllabusUnits = unitsBySubject && currentSubjectObj ? unitsBySubject[currentSubjectObj.id] : undefined;
  const quickTopics: string[] = [];

  if (syllabusUnits && syllabusUnits.length > 0) {
    syllabusUnits.forEach((u) => {
      u.topics?.forEach((t) => {
        if (quickTopics.length < 8 && !quickTopics.includes(t.title)) {
          quickTopics.push(t.title);
        }
      });
    });
  }

  // Fallback defaults if no syllabus units loaded
  if (quickTopics.length === 0) {
    if (selectedSubject.toLowerCase().includes('database') || selectedSubject.toLowerCase().includes('dbms')) {
      quickTopics.push(
        'Three Schema Architecture',
        'Entity Relationship (ER) Modeling',
        'Relational Algebra & Normalization',
        'ACID Properties & Transactions',
        'Concurrency Control & 2PL'
      );
    } else if (selectedSubject.toLowerCase().includes('operating') || selectedSubject.toLowerCase().includes('os')) {
      quickTopics.push(
        'Process Synchronization & Critical Section',
        'Deadlock Prevention & Banker Algorithm',
        'Page Replacement Algorithms (FIFO, LRU)',
        'Virtual Memory & Demand Paging',
        'CPU Scheduling Algorithms'
      );
    } else {
      quickTopics.push(
        'Core Architectural Principles',
        'Algorithmic State Transitions',
        'University Exam 10-Marker Model',
        'Theoretical Boundary Conditions'
      );
    }
  }

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
            onChange={(e) => {
              setSelectedSubject(e.target.value);
            }}
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
            value={activeTabMode}
            onChange={(e) => {
              const val = e.target.value as 'all' | TutorResponseMode;
              setActiveTabMode(val);
              if (val !== 'all') {
                scrollToSection(`section-${val}`);
              }
            }}
            className="lg:hidden bg-slate-900 border border-slate-800/90 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer font-sans-ui"
            aria-label="Pedagogy Mode"
          >
            <option value="all">All in Order</option>
            {primaryModes.map((m) => (
              <option key={m.mode} value={m.mode}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Desktop Pedagogy Mode Selector (Linear Segmented Control) */}
          <div className="hidden lg:flex items-center rounded bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => {
                setActiveTabMode('all');
                scrollToSection('section-simple');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer font-sans-ui ${
                activeTabMode === 'all'
                  ? 'bg-slate-800 text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All in Order
            </button>
            {primaryModes.map((m) => (
              <button
                key={m.mode}
                onClick={() => {
                  setActiveTabMode(m.mode);
                  scrollToSection(`section-${m.mode}`);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer font-sans-ui ${
                  activeTabMode === m.mode
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

      {/* 2. Main Study Body (Ordered Sections, No Prompt Bubbles) */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        {/* Loading State with Stage Progress */}
        {isLoading && (
          <div className="rounded-md bg-slate-900/40 border border-slate-800/80 p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-sans-ui">
              <Sparkles className="w-4 h-4 text-neutral-300 animate-spin" />
              <span className="font-medium">
                Formulating 6-Stage Curriculum for &quot;{studyGuide?.topic || inputQuery || 'Selected Topic'}&quot;...
              </span>
            </div>
            {/* Visual stage progress indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
              {primaryModes.map((m, i) => (
                <div
                  key={m.mode}
                  className="rounded bg-slate-900 border border-slate-800/70 p-2 text-center text-[10px] text-slate-400 font-sans-ui flex flex-col items-center gap-1"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[9px]">
                    {i + 1}
                  </span>
                  <span className="truncate w-full">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Welcome & Topic Selector when no study guide is loaded */}
        {!studyGuide && !isLoading && (
          <div className="rounded-md bg-slate-900/30 border border-slate-800/80 p-6 space-y-5 text-center sm:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono mb-2">
                <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                <span>6-STAGE ACADEMIC BLUEPRINT</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-100 font-sans-ui">
                Pick a topic from {selectedSubject} to study
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl font-sans-ui">
                The AI Tutor generates the complete explanation in standard sequence:
                <span className="text-slate-300 font-medium"> Simple</span> →
                <span className="text-slate-300 font-medium"> ELI9</span> →
                <span className="text-slate-300 font-medium"> Hinglish</span> →
                <span className="text-slate-300 font-medium"> 10-Marker Exam Format</span> →
                <span className="text-slate-300 font-medium"> Deep Dive</span> →
                <span className="text-slate-300 font-medium"> Quiz Me</span>.
              </p>
            </div>

            {/* Quick Topic Chips */}
            <div>
              <div className="text-[11px] text-slate-400 font-medium font-sans-ui mb-2.5">
                Recommended Syllabus Topics:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => loadTopicGuide(topic)}
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 font-sans-ui"
                  >
                    <span>{topic}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Study Guide - Displayed in the exact order requested */}
        {studyGuide && !isLoading && (
          <div className="space-y-6">
            {/* Topic Header Banner (Clean, no prompt text!) */}
            <div className="rounded-md bg-slate-900/40 border border-slate-800/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="academic-tag text-[10px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                    {studyGuide.subject}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-[11px] text-emerald-400 font-mono">10-Marker University Ready</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-slate-100 font-sans-ui">
                  {studyGuide.topic}
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {studyGuide.sections.exam_10marker && (
                  <button
                    onClick={() =>
                      handleCopy(studyGuide.sections.exam_10marker, '10marker-header')
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 font-sans-ui"
                    title="Copy 10-Marker Model Answer"
                  >
                    {copiedKey === '10marker-header' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied 10-Marker</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy 10-Marker</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    const allContent = `## ${studyGuide.topic} (${studyGuide.subject})\n\n### 1. Simple Overview\n${studyGuide.sections.simple}\n\n### 2. ELI9 (Analogies)\n${studyGuide.sections.eli9}\n\n### 3. Hinglish Breakdown\n${studyGuide.sections.hinglish}\n\n### 4. 10-Marker Format\n${studyGuide.sections.exam_10marker}\n\n### 5. Deep Dive\n${studyGuide.sections.detailed}\n\n### 6. Quiz Me\n${studyGuide.sections.socratic}`;
                    handleCopy(allContent, 'all-content');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 font-sans-ui"
                  title="Copy Full Study Guide"
                >
                  {copiedKey === 'all-content' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Notes</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy All Notes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* STAGE 1: SIMPLE OVERVIEW */}
            {(activeTabMode === 'all' || activeTabMode === 'simple') && studyGuide.sections.simple && (
              <div
                id="section-simple"
                className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-3 transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center font-bold">
                      1
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-neutral-400" />
                      <span>Simple Overview</span>
                    </h3>
                  </div>
                  <span className="academic-tag text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Jargon-Free
                  </span>
                </div>
                <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {studyGuide.sections.simple}
                </div>
              </div>
            )}

            {/* STAGE 2: ELI9 (ANALOGIES) */}
            {(activeTabMode === 'all' || activeTabMode === 'eli9') && studyGuide.sections.eli9 && (
              <div
                id="section-eli9"
                className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-3 transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-amber-950/60 border border-amber-800/70 text-amber-300 text-xs font-mono flex items-center justify-center font-bold">
                      2
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <span>ELI9 (Analogies)</span>
                    </h3>
                  </div>
                  <span className="academic-tag text-[9px] text-amber-300/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                    Real-World Intuition
                  </span>
                </div>
                <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {studyGuide.sections.eli9}
                </div>
              </div>
            )}

            {/* STAGE 3: HINGLISH */}
            {(activeTabMode === 'all' || activeTabMode === 'hinglish') && studyGuide.sections.hinglish && (
              <div
                id="section-hinglish"
                className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-3 transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs font-mono flex items-center justify-center font-bold">
                      3
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Hinglish Breakdown</span>
                    </h3>
                  </div>
                  <span className="academic-tag text-[9px] text-emerald-300/80 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                    College Memory Hooks
                  </span>
                </div>
                <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {studyGuide.sections.hinglish}
                </div>
              </div>
            )}

            {/* STAGE 4: 10-MARKER FORMAT */}
            {(activeTabMode === 'all' || activeTabMode === 'exam_10marker') &&
              studyGuide.sections.exam_10marker && (
                <div
                  id="section-exam_10marker"
                  className="rounded-md bg-slate-900/30 border border-sky-900/40 p-5 space-y-3 transition duration-200 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-sky-950/70 border border-sky-800 text-sky-300 text-xs font-mono flex items-center justify-center font-bold">
                        4
                      </span>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-sky-400" />
                        <span>10-Marker Format</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleCopy(studyGuide.sections.exam_10marker, '10marker-card')
                        }
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 font-sans-ui"
                      >
                        {copiedKey === '10marker-card' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy Answer</span>
                          </>
                        )}
                      </button>
                      <span className="academic-tag text-[9px] text-sky-300/90 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                        Section C Model Scheme
                      </span>
                    </div>
                  </div>
                  <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {studyGuide.sections.exam_10marker}
                  </div>
                </div>
              )}

            {/* STAGE 5: DEEP DIVE */}
            {(activeTabMode === 'all' || activeTabMode === 'detailed') && studyGuide.sections.detailed && (
              <div
                id="section-detailed"
                className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-3 transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-indigo-950/60 border border-indigo-800/70 text-indigo-300 text-xs font-mono flex items-center justify-center font-bold">
                      5
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span>Deep Dive & Edge Cases</span>
                    </h3>
                  </div>
                  <span className="academic-tag text-[9px] text-indigo-300/80 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/50">
                    Theoretical Rigor
                  </span>
                </div>
                <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {studyGuide.sections.detailed}
                </div>
              </div>
            )}

            {/* STAGE 6: QUIZ ME */}
            {(activeTabMode === 'all' || activeTabMode === 'socratic') && studyGuide.sections.socratic && (
              <div
                id="section-socratic"
                className="rounded-md bg-slate-900/30 border border-slate-800/80 p-5 space-y-4 transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-purple-950/60 border border-purple-800/70 text-purple-300 text-xs font-mono flex items-center justify-center font-bold">
                      6
                    </span>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-sans-ui flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      <span>Quiz Me (Diagnostic Check)</span>
                    </h3>
                  </div>
                  <span className="academic-tag text-[9px] text-purple-300/80 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/50">
                    Self-Assessment
                  </span>
                </div>
                <div className="font-sans-ui text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {studyGuide.sections.socratic}
                </div>
              </div>
            )}

            {/* Citations & Syllabus References */}
            {studyGuide.sourcesUsed && studyGuide.sourcesUsed.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs">
                {studyGuide.sourcesUsed.map((src, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-sans-ui"
                  >
                    § {src.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Single-Action Study Bar (Clean, no prompt generation!) */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputQuery.trim()) {
              loadTopicGuide(inputQuery.trim());
              setInputQuery('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Enter any topic from ${selectedSubject} to study in 6-stage order...`}
            className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-slate-600 rounded-md px-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans-ui"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-3 py-2 rounded-md bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 transition cursor-pointer flex items-center justify-center shrink-0"
            title="Study Topic"
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
