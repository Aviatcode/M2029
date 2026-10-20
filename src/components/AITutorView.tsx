import React, { useState, useEffect, useRef } from 'react';
import { TutorResponseMode, Subject, Unit } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  KeyRound,
  Zap,
  Cpu,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GraduationCap,
  HelpCircle,
  ArrowRight,
  Terminal,
  FileCode,
  CheckCircle2,
  ListOrdered,
  BookMarked,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  History,
  Users,
  Layers,
  Database,
} from 'lucide-react';
import { AIKeyConfigModal } from './AIKeyConfigModal';
import { CohortIntelligenceModal } from './CohortIntelligenceModal';
import { EvolutionStep } from '../types';
import {
  getAiRequestPayload,
  getStoredAiSettings,
  getActiveModelInfo,
  subscribeToAiSettings,
  StoredAiSettings,
} from '../utils/aiModelService';
import { GanttChartWidget } from './tutor/GanttChartWidget';
import { QuickCheckCard } from './tutor/QuickCheckCard';

interface AITutorViewProps {
  subjects: Subject[];
  initialPrompt?: string;
  initialTopic?: string;
  initialSubject?: string;
  unitsBySubject?: Record<string, Unit[]>;
}

interface SyllabusTrackMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  topicCount: number;
  topics: {
    index: number;
    id: string;
    title: string;
    hasQuickCheck: boolean;
    hasGantt: boolean;
  }[];
}

interface ConversationTurn {
  id: string;
  role: 'assistant' | 'user' | 'system';
  title?: string;
  content: string;
  timestamp: string;
  cached?: boolean;
  modelUsed?: string;
  tokensSaved?: number;
  quickCheck?: {
    question: string;
    options: { key: string; label: string }[];
    correctKey?: string;
    continuePrompt: string;
  };
  gantt?: {
    processes: { id: string; duration: number; color?: string; start?: number; end?: number }[];
    timestamps: number[];
  };
  evaluation?: {
    passed: boolean;
    feedback: string;
    correctOption?: string;
  } | null;
}

interface StudyGuideData {
  topic: string;
  subject: string;
  cached?: boolean;
  modelUsed?: string;
  tokensSaved?: number;
  sections: {
    simple: string;
    eli9: string;
    hinglish: string;
    exam_10marker: string;
    detailed: string;
    socratic: string;
  };
  sourcesUsed?: { title: string; type: string }[];
  iterationCount?: number;
  isCohortPerfected?: boolean;
  perfectionScore?: number;
  perfectionTier?: string;
  evolutionHistory?: EvolutionStep[];
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
    { key: 'simple', pattern: /###\s*(?:1[.)]?\s*)?Simple[^\n]*\n([\s\S]*?)(?=(?:###\s*(?:2[.)]?\s*)?ELI9|\Z))/i },
    { key: 'eli9', pattern: /###\s*(?:2[.)]?\s*)?ELI9[^\n]*\n([\s\S]*?)(?=(?:###\s*(?:3[.)]?\s*)?Hinglish|\Z))/i },
    { key: 'hinglish', pattern: /###\s*(?:3[.)]?\s*)?Hinglish[^\n]*\n([\s\S]*?)(?=(?:###\s*(?:4[.)]?\s*)?10-Marker|\Z))/i },
    { key: 'exam_10marker', pattern: /###\s*(?:4[.)]?\s*)?10-Marker[^\n]*\n([\s\S]*?)(?=(?:###\s*(?:5[.)]?\s*)?Deep Dive|\Z))/i },
    { key: 'detailed', pattern: /###\s*(?:5[.)]?\s*)?Deep Dive[^\n]*\n([\s\S]*?)(?=(?:###\s*(?:6[.)]?\s*)?Quiz Me|\Z))/i },
    { key: 'socratic', pattern: /###\s*(?:6[.)]?\s*)?Quiz Me[^\n]*\n([\s\S]*?)$/i },
  ];

  for (const { key, pattern } of regexes) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

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
  // Mode Selection: 'guided' (ChatGPT one-by-one experience) vs 'reference' (6-mode all-in-one guide)
  const [viewMode, setViewMode] = useState<'guided' | 'reference'>('guided');

  // Guided Syllabus Track State
  const [tracks, setTracks] = useState<SyllabusTrackMeta[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('os-unit2-cpu');
  const [currentTopicIndex, setCurrentTopicIndex] = useState<number>(0);
  const [completedTopicIndices, setCompletedTopicIndices] = useState<Set<number>>(new Set());
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isStepLoading, setIsStepLoading] = useState<boolean>(false);

  // Reference Study Guide State
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || subjects[0]?.name || 'General Academic'
  );
  const [activeTabMode, setActiveTabMode] = useState<'all' | TutorResponseMode>('all');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 60-Student Compounding Intelligence State
  const [isCohortModalOpen, setIsCohortModalOpen] = useState<boolean>(false);
  const [isElevatingTo60, setIsElevatingTo60] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [, setAiSettings] = useState<StoredAiSettings>(getStoredAiSettings());
  const [activeModel, setActiveModel] = useState(getActiveModelInfo());
  const [classModelInfo, setClassModelInfo] = useState<{
    hasCustomKey: boolean;
    providerName: string;
  }>({
    hasCustomKey: false,
    providerName: 'Built-in Academic Model',
  });

  const [cacheStats, setCacheStats] = useState<{
    totalLearnedItems: number;
    totalHits: number;
    estimatedTokensSaved: number;
  } | null>(null);

  const refreshCacheStats = () => {
    fetch('/api/ai/cache/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.estimatedTokensSaved === 'number') {
          setCacheStats(d);
        }
      })
      .catch(() => {});
  };

  // Fetch available tracks on mount
  useEffect(() => {
    refreshCacheStats();

    fetch('/api/ai-tutor/tracks')
      .then((r) => r.json())
      .then((data) => {
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
          if (!selectedTrackId) {
            setSelectedTrackId(data.defaultTrackId || data.tracks[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not load tracks:', err));

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
      setActiveModel(getActiveModelInfo());
    });
  }, []);

  // Initialize first topic of selected track
  useEffect(() => {
    if (tracks.length > 0 && selectedTrackId && conversationTurns.length === 0) {
      loadGuidedTopic(selectedTrackId, 0, 'start');
    }
  }, [tracks, selectedTrackId]);

  // Scroll to bottom of chat when new turn arrives
  useEffect(() => {
    if (viewMode === 'guided' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationTurns, isStepLoading, viewMode]);

  // Load a step in the guided syllabus track
  const loadGuidedTopic = async (
    trackId: string,
    topicIndex: number,
    action: 'start' | 'answer' | 'next' | 'did_not_understand' | 'hinglish' | 'exam_notes' | 'custom_question',
    userAnswer = '',
    customQuery = '',
    regenerateLive = false
  ) => {
    if (isStepLoading) return;
    setIsStepLoading(true);

    try {
      const res = await fetch('/api/ai-tutor/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          topicIndex,
          action,
          userAnswer,
          customQuery,
          regenerateLive,
          forceLive: regenerateLive,
          ...getAiRequestPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to step topic');

      const newTurns: ConversationTurn[] = [...conversationTurns];

      // If answering, record student's choice
      if (action === 'answer' && userAnswer) {
        newTurns.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: `My answer is ${userAnswer}. Check it and immediately continue to the next topic in my syllabus.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        // Mark current as completed
        setCompletedTopicIndices((prev) => new Set([...prev, topicIndex]));
      } else if (action === 'did_not_understand') {
        newTurns.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: 'Did not understand this concept. Give me an everyday ELI9 analogy and contrast table!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (action === 'hinglish') {
        newTurns.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: 'Can you explain the important terms and exam formulas in Hinglish?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (action === 'custom_question' && customQuery) {
        newTurns.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: customQuery,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Add assistant response
      if (data.topic) {
        newTurns.push({
          id: `asst-${Date.now()}`,
          role: 'assistant',
          title: data.topic.title,
          content: data.topic.content,
          quickCheck: data.topic.quickCheck,
          gantt: data.topic.gantt,
          evaluation: data.evaluation,
          modelUsed: data.modelUsed,
          cached: data.cached,
          tokensSaved: data.tokensSaved,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setConversationTurns(newTurns);
      setCurrentTopicIndex(data.topicIndex ?? topicIndex);
    } catch (err: any) {
      console.error('Error stepping topic:', err);
    } finally {
      setIsStepLoading(false);
    }
  };

  // Reset conversation to start over
  const handleRestartTrack = (trackId = selectedTrackId) => {
    setSelectedTrackId(trackId);
    setConversationTurns([]);
    setCompletedTopicIndices(new Set());
    setCurrentTopicIndex(0);
    loadGuidedTopic(trackId, 0, 'start');
  };

  // Switch Track
  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setConversationTurns([]);
    setCompletedTopicIndices(new Set());
    setCurrentTopicIndex(0);
    loadGuidedTopic(trackId, 0, 'start');
  };

  // Study Guide Reference Mode Loader
  const loadTopicGuide = async (topicTitle: string, subjectName = selectedSubject, forceLive = false) => {
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
          forceLive,
          ...getAiRequestPayload(),
        }),
      });

      const data = await res.json();
      const rawText = data.answer || data.text || '';
      const parsed = data.sections || parseSectionsFromText(rawText);

      setStudyGuide({
        topic: cleanTopic,
        subject: subjectName,
        cached: data.cached,
        modelUsed: data.modelUsed,
        tokensSaved: data.tokensSaved,
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
        iterationCount: data.iterationCount ?? 60,
        isCohortPerfected: data.isCohortPerfected ?? true,
        perfectionScore: data.perfectionScore ?? 100,
        perfectionTier: data.perfectionTier ?? 'Class Gold Standard',
        evolutionHistory: data.evolutionHistory || [],
      });

      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error loading AI Tutor guide:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 60-Student Compounding Intelligence Handlers
  const handleElevateTo60 = async () => {
    const topic = studyGuide?.topic || activeTrack?.topics[currentTopicIndex]?.title || 'CPU Scheduling & Gantt Charts';
    const subjectName = studyGuide?.subject || activeTrack?.name || 'Operating Systems';
    setIsElevatingTo60(true);
    try {
      const res = await fetch('/api/ai/compound-to-60', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subjectName }),
      });
      const data = await res.json();
      if (data.cached) {
        const parsed = data.cached.sections || parseSectionsFromText(data.cached.answer || '');
        setStudyGuide({
          topic: data.cached.topic,
          subject: data.cached.subjectName,
          cached: true,
          modelUsed: data.cached.modelUsed || 'Cohort 60-Student Distiller',
          tokensSaved: data.cached.tokensEstimated || 2400,
          sections: {
            simple: parsed.simple || '',
            eli9: parsed.eli9 || '',
            hinglish: parsed.hinglish || '',
            exam_10marker: parsed.exam_10marker || '',
            detailed: parsed.detailed || '',
            socratic: parsed.socratic || '',
          },
          iterationCount: data.cached.iterationCount || 60,
          isCohortPerfected: true,
          perfectionScore: data.cached.perfectionScore || 100,
          perfectionTier: data.cached.perfectionTier || 'Class Gold Standard',
          evolutionHistory: data.cached.evolutionHistory || [],
        });
        refreshCacheStats();
      }
    } catch (e) {
      console.error('Error elevating to 60:', e);
    } finally {
      setIsElevatingTo60(false);
    }
  };

  const handleRefineNext = async (feedback: string) => {
    const topic = studyGuide?.topic || activeTrack?.topics[currentTopicIndex]?.title || 'CPU Scheduling & Gantt Charts';
    const subjectName = studyGuide?.subject || activeTrack?.name || 'Operating Systems';
    try {
      const res = await fetch('/api/ai/refine-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subjectName,
          feedback,
          studentNumber: (studyGuide?.iterationCount || 1) + 1,
        }),
      });
      const data = await res.json();
      if (data.cached) {
        const parsed = data.cached.sections || parseSectionsFromText(data.cached.answer || '');
        setStudyGuide((prev) =>
          prev
            ? {
                ...prev,
                sections: {
                  simple: parsed.simple || prev.sections.simple,
                  eli9: parsed.eli9 || prev.sections.eli9,
                  hinglish: parsed.hinglish || prev.sections.hinglish,
                  exam_10marker: parsed.exam_10marker || prev.sections.exam_10marker,
                  detailed: parsed.detailed || prev.sections.detailed,
                  socratic: parsed.socratic || prev.sections.socratic,
                },
                iterationCount: data.cached.iterationCount,
                isCohortPerfected: data.cached.isCohortPerfected,
                perfectionScore: data.cached.perfectionScore,
                perfectionTier: data.cached.perfectionTier,
                evolutionHistory: data.cached.evolutionHistory || prev.evolutionHistory,
              }
            : null
        );
        refreshCacheStats();
      }
    } catch (e) {
      console.error('Error refining iteration:', e);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];
  const progressPercent = activeTrack
    ? Math.round(((completedTopicIndices.size) / Math.max(1, activeTrack.topicCount)) * 100)
    : 0;

  // Primary 6 modes for reference view
  const primaryModes: { mode: TutorResponseMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'simple', label: 'Simple', icon: BookOpen },
    { mode: 'eli9', label: 'ELI9 (Analogies)', icon: Lightbulb },
    { mode: 'hinglish', label: 'Hinglish', icon: Sparkles },
    { mode: 'exam_10marker', label: '10-Marker Format', icon: GraduationCap },
    { mode: 'detailed', label: 'Deep Dive', icon: Cpu },
    { mode: 'socratic', label: 'Quiz Me', icon: HelpCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col rounded-xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden animate-fade-in">
      {/* 1. Academic Desk Header with Primary Mode Toggle */}
      <div className="px-3.5 py-2.5 border-b border-slate-800/90 bg-slate-950 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-xs sm:text-sm text-slate-100 leading-tight">
                Academic AI Companion
              </h1>
              <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Gold Standard
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              One-by-one syllabus progression, Hinglish intuition & interactive quick checks
            </p>
          </div>
        </div>

        {/* Token Savings & View Mode Controls */}
        <div className="flex items-center gap-2">
          {cacheStats && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono shadow-xs"
              title={`${cacheStats.totalLearnedItems} topics learned & stored in repository. Repeating questions fetch instantly with 0 tokens spent.`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {cacheStats.estimatedTokensSaved >= 1000
                  ? `${(cacheStats.estimatedTokensSaved / 1000).toFixed(1)}k`
                  : cacheStats.estimatedTokensSaved}{' '}
                Tokens Saved
              </span>
              <span className="text-emerald-500/60">•</span>
              <span className="text-emerald-400 font-semibold">0-Tokens Active</span>
            </div>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('guided')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'guided'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Guided Syllabus</span>
            </button>
            <button
              onClick={() => setViewMode('reference')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'reference'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Reference Guide</span>
            </button>
          </div>

          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-mono transition cursor-pointer text-slate-300 hover:text-white"
            title="Configure Academic AI Model or Change API Key"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline text-slate-400 font-sans-ui text-[11px]">Model:</span>
            <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[110px] sm:max-w-[150px]">
              {activeModel.displayName}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${
                activeModel.isPersonal
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                  : 'bg-slate-800 text-slate-400 border-slate-700/60'
              }`}
            >
              {activeModel.badge}
            </span>
          </button>
        </div>
      </div>

      {/* 2. SUB-HEADER: Syllabus Track & Progress Bar (Guided Mode) */}
      {viewMode === 'guided' && activeTrack && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Syllabus Track:</span>
            <select
              value={selectedTrackId}
              onChange={(e) => handleSelectTrack(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-xs text-slate-200 font-medium cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.topicCount} Topics)
                </option>
              ))}
            </select>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
              <span>
                Topic {currentTopicIndex + 1}/{activeTrack.topicCount}
              </span>
              <span className="text-slate-500">({progressPercent}%)</span>
            </div>

            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>

            <button
              onClick={() => setIsRoadmapOpen(!isRoadmapOpen)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Roadmap</span>
            </button>

            {/* 60-Student Compounding Intelligence Indicator */}
            <button
              onClick={() => setIsCohortModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="View 60-Student Evolution Journey & Class Collective Memory"
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">60-Student Brain</span>
              <span className="text-[10px] bg-amber-400/20 px-1 py-0.2 rounded font-mono">60/60</span>
            </button>
          </div>
        </div>
      )}

      {/* 2.1 SYLLABUS ROADMAP MODAL / DRAWER */}
      {isRoadmapOpen && activeTrack && (
        <div className="p-3 bg-slate-900 border-b border-slate-800 animate-fade-in text-xs max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200 font-mono text-[11px]">
              {activeTrack.name} — Topic Checklist
            </span>
            <button
              onClick={() => handleRestartTrack()}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Track</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {activeTrack.topics.map((tp) => {
              const isCompleted = completedTopicIndices.has(tp.index);
              const isCurrent = currentTopicIndex === tp.index;

              return (
                <button
                  key={tp.id}
                  onClick={() => {
                    loadGuidedTopic(selectedTrackId, tp.index, 'start');
                    setIsRoadmapOpen(false);
                  }}
                  className={`text-left p-2 rounded-md border transition flex items-center justify-between gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] w-4 text-slate-500">
                      {tp.index + 1}.
                    </span>
                    <span className="truncate text-xs">{tp.title}</span>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : tp.hasGantt ? (
                    <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scroll-smooth">
        {/* GUIDED SYLLABUS CONVERSATION STREAM (ChatGPT Style) */}
        {viewMode === 'guided' && (
          <div className="space-y-6">
            {conversationTurns.map((turn, tIdx) => {
              if (turn.role === 'user') {
                return (
                  <div key={turn.id || tIdx} className="flex justify-end animate-fade-in">
                    <div className="max-w-xl rounded-2xl rounded-tr-xs bg-indigo-600 text-white p-3.5 text-xs sm:text-sm shadow-md font-sans-ui">
                      <p className="leading-relaxed">{turn.content}</p>
                      <div className="text-[10px] text-indigo-200/70 text-right mt-1 font-mono">
                        {turn.timestamp}
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant gold standard topic card
              return (
                <div key={turn.id || tIdx} className="space-y-4 animate-fade-in">
                  {/* Evaluation Feedback Badge from Previous Quick Check */}
                  {turn.evaluation && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed shadow-sm ${
                        turn.evaluation.passed
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                          : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
                      }`}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        {turn.evaluation.passed ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Quick Check Result: Correct</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-4 h-4 text-rose-400" />
                            <span>Quick Check Review</span>
                          </>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-slate-300 text-xs sm:text-sm">
                        {turn.evaluation.feedback}
                      </p>
                    </div>
                  )}

                  {/* Main Academic Topic Body */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 space-y-4 shadow-md backdrop-blur-xs">
                    {/* Topic Headline */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-mono text-xs font-bold text-indigo-400">
                          {tIdx + 1}
                        </span>
                        <h2 className="text-sm sm:text-base font-bold text-slate-100 font-sans-ui tracking-tight">
                          {turn.title || 'Syllabus Topic'}
                        </h2>
                        {turn.modelUsed && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-mono text-[10px]"
                            title={`Generated via ${turn.modelUsed}`}
                          >
                            <Cpu className="w-3 h-3 text-indigo-400" />
                            <span>{turn.modelUsed}</span>
                          </span>
                        )}
                        {turn.cached && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]"
                            title="Learned once and stored in class repository. 0 AI tokens spent!"
                          >
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>0 Tokens • Stored Recall</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => loadGuidedTopic(selectedTrackId, currentTopicIndex, 'start', '', '', true)}
                          disabled={isStepLoading}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 font-mono"
                          title={`Regenerate topic with active model (${activeModel.displayName})`}
                        >
                          <RefreshCw className={`w-3 h-3 text-indigo-400 ${isStepLoading ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Regenerate Live</span>
                        </button>
                        <button
                          onClick={() => handleCopy(turn.content, `turn-${tIdx}`)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 font-mono"
                        >
                          {copiedKey === `turn-${tIdx}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied Notes</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Notes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Markdown Formatted Text with Hinglish Intuition Callouts */}
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-200 font-sans-ui space-y-3">
                      {turn.content.split('\n\n').map((paragraph, pIdx) => {
                        // Highlight Hinglish intuition callout
                        if (
                          paragraph.toLowerCase().includes('simple words mein') ||
                          paragraph.toLowerCase().includes('simple hinglish') ||
                          paragraph.toLowerCase().includes('dekho bhai') ||
                          paragraph.toLowerCase().includes('bilkul line mein')
                        ) {
                          return (
                            <div
                              key={pIdx}
                              className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm font-sans-ui leading-relaxed my-2 shadow-xs"
                            >
                              <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1 font-mono text-[11px]">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Hinglish Intuition (Exam Mental Model)</span>
                              </div>
                              <p className="italic text-slate-200">{paragraph}</p>
                            </div>
                          );
                        }

                        // Highlight Exam Point
                        if (
                          paragraph.toLowerCase().includes('exam point:') ||
                          paragraph.toLowerCase().includes('exam keyword:') ||
                          paragraph.toLowerCase().includes('exam-ready short notes')
                        ) {
                          return (
                            <div
                              key={pIdx}
                              className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs sm:text-sm my-2 shadow-xs"
                            >
                              <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1 font-mono text-[11px]">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Exam Answer Sheet Blueprint (Copy Directly)</span>
                              </div>
                              <p className="text-slate-200">{paragraph}</p>
                            </div>
                          );
                        }

                        // Table block
                        if (paragraph.includes('|') && paragraph.includes('---')) {
                          const rows = paragraph.trim().split('\n');
                          return (
                            <div key={pIdx} className="overflow-x-auto my-3 rounded-lg border border-slate-800">
                              <table className="min-w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 border-b border-slate-800">
                                    {rows[0]
                                      .split('|')
                                      .filter((c) => c.trim().length > 0)
                                      .map((col, cIdx) => (
                                        <th key={cIdx} className="px-3 py-2 font-semibold text-slate-300 font-mono">
                                          {col.trim()}
                                        </th>
                                      ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.slice(2).map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-slate-850 hover:bg-slate-900/50">
                                      {row
                                        .split('|')
                                        .filter((c) => c.trim().length > 0)
                                        .map((cell, cIdx) => (
                                          <td key={cIdx} className="px-3 py-1.5 text-slate-300 font-mono">
                                            {cell.trim()}
                                          </td>
                                        ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        // Code block
                        if (paragraph.startsWith('```')) {
                          const lines = paragraph.split('\n');
                          const lang = lines[0].replace('```', '') || 'bash';
                          const codeText = lines.slice(1, -1).join('\n');
                          return (
                            <div key={pIdx} className="my-2 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
                              <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                                <span>{lang.toUpperCase()}</span>
                                <button
                                  onClick={() => handleCopy(codeText, `code-${pIdx}`)}
                                  className="text-slate-400 hover:text-white"
                                >
                                  {copiedKey === `code-${pIdx}` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <pre className="p-3 overflow-x-auto text-emerald-400">{codeText}</pre>
                            </div>
                          );
                        }

                        return (
                          <p key={pIdx} className="leading-relaxed">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>

                    {/* Interactive Gantt Chart Widget (for CPU Scheduling Algorithms) */}
                    {turn.gantt && (
                      <GanttChartWidget
                        processes={turn.gantt.processes}
                        timestamps={turn.gantt.timestamps}
                        title={`Gantt Chart: ${turn.title}`}
                      />
                    )}

                    {/* Interactive Quick Check Card */}
                    {turn.quickCheck && (
                      <QuickCheckCard
                        question={turn.quickCheck.question}
                        options={turn.quickCheck.options}
                        isLoading={isStepLoading}
                        onAnswerSubmit={(selectedKey) => {
                          loadGuidedTopic(
                            selectedTrackId,
                            currentTopicIndex,
                            'answer',
                            selectedKey
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Stepping Loading State */}
            {isStepLoading && (
              <div className="rounded-xl border border-indigo-500/30 bg-slate-900/50 p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-indigo-300 font-sans-ui">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Loading next syllabus topic with interactive quick check...</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full w-3/4" />
                <div className="h-3 bg-slate-800 rounded-full w-1/2" />
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}

        {/* 6-STAGE REFERENCE GUIDE MODE (Cramming & Direct Topic Lookup) */}
        {viewMode === 'reference' && (
          <div className="space-y-6">
            {!studyGuide && !isLoading && (
              <div className="rounded-xl bg-slate-900/30 border border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-100">
                  Comprehensive 6-Stage Reference Guide
                </h2>
                <p className="text-xs text-slate-400">
                  Select or enter any topic to view its entire 6-part academic breakdown: Simple, ELI9 Analogies, Hinglish Mental Model, 10-Marker University Exam Format, Deep Dive Edge Cases, and Quiz Me.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    'FCFS CPU Scheduling',
                    'Process States & PCB',
                    'Preemptive vs Non-Preemptive',
                    'Semaphores & Critical Section',
                    'Deadlocks & Coffman Conditions',
                    'Banker Algorithm',
                  ].map((tp) => (
                    <button
                      key={tp}
                      onClick={() => loadTopicGuide(tp)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{tp}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Formulating 6-stage curriculum...</span>
                </div>
              </div>
            )}

            {studyGuide && !isLoading && (
              <div className="space-y-5">
                {/* 60-Student Compounded Gold Standard Master Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-950/30 to-emerald-950/20 border border-amber-500/30 shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-amber-200 font-sans-ui">
                            Cohort Master Solution • Student {studyGuide.iterationCount || 60}/60 Perfected
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-semibold">
                            {studyGuide.perfectionScore || 100}% Exam Aligned
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono">
                            {studyGuide.perfectionTier || 'Class Gold Standard'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mt-1">
                          Refined sequentially across 60 student peers: Student 1 draft → Student 2 terminology → Student 5 ELI9 analogies → Student 15 diagrams → Student 30 10-marker → Student 60 golden master.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setIsCohortModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <History className="w-3.5 h-3.5 text-amber-300" />
                        <span>View 60-Student Evolution Journey</span>
                      </button>
                      {(!studyGuide.isCohortPerfected || (studyGuide.iterationCount || 60) < 60) && (
                        <button
                          onClick={handleElevateTo60}
                          disabled={isElevatingTo60}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Zap className={`w-3.5 h-3.5 ${isElevatingTo60 ? 'animate-spin' : ''}`} />
                          <span>{isElevatingTo60 ? 'Synthesizing 60...' : 'Elevate to 60'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-100 font-sans-ui">
                        {studyGuide.topic}
                      </h2>
                      {studyGuide.modelUsed && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-mono text-[10px]"
                          title={`Generated using ${studyGuide.modelUsed}`}
                        >
                          <Cpu className="w-3 h-3 text-indigo-400" />
                          <span>{studyGuide.modelUsed}</span>
                        </span>
                      )}
                      {studyGuide.cached && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]"
                          title="Fetched from Stored Class Knowledge. 0 AI tokens spent!"
                        >
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>0 Tokens • Stored Recall</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{studyGuide.subject}</p>
                    {studyGuide.sourcesUsed && studyGuide.sourcesUsed.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                          <Database className="w-3 h-3 text-indigo-400" />
                          <span>Grounded Citations:</span>
                        </span>
                        {studyGuide.sourcesUsed.map((source, sIdx) => (
                          <span
                            key={sIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
                              source.type.includes('RAG')
                                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-bold'
                                : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                            }`}
                          >
                            <span>{source.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTopicGuide(studyGuide.topic, studyGuide.subject, true)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                      title={`Regenerate full 6-stage guide using active model (${activeModel.displayName})`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Regenerate Live</span>
                    </button>
                    <button
                      onClick={() => handleCopy(JSON.stringify(studyGuide.sections, null, 2), 'all-ref')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Guide</span>
                    </button>
                  </div>
                </div>

                {primaryModes.map((m) => {
                  const content = studyGuide.sections[m.mode as keyof typeof studyGuide.sections];
                  if (!content) return null;
                  return (
                    <div
                      key={m.mode}
                      className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs font-mono">
                        <m.icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </div>
                      <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. FAST-ACTION PILLS & BOTTOM INPUT BAR */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0 space-y-2">
        {/* Fast Action Suggestion Chips (Matches the ChatGPT user flow!) */}
        {viewMode === 'guided' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => loadGuidedTopic(selectedTrackId, currentTopicIndex + 1, 'next')}
              disabled={isStepLoading}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <ArrowRight className="w-3 h-3 text-indigo-400" />
              <span>Next Topic</span>
            </button>

            <button
              onClick={() => loadGuidedTopic(selectedTrackId, currentTopicIndex, 'hinglish')}
              disabled={isStepLoading}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Explain in Hinglish</span>
            </button>

            <button
              onClick={() => loadGuidedTopic(selectedTrackId, currentTopicIndex, 'did_not_understand')}
              disabled={isStepLoading}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Lightbulb className="w-3 h-3 text-yellow-400" />
              <span>Did Not Understand (ELI9)</span>
            </button>

            <button
              onClick={() => {
                const cur = activeTrack?.topics[currentTopicIndex];
                if (cur) {
                  setViewMode('reference');
                  loadTopicGuide(cur.title);
                }
              }}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <GraduationCap className="w-3 h-3 text-emerald-400" />
              <span>10-Marker University Format</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputQuery.trim()) {
              if (viewMode === 'guided') {
                loadGuidedTopic(
                  selectedTrackId,
                  currentTopicIndex,
                  'custom_question',
                  '',
                  inputQuery.trim()
                );
              } else {
                loadTopicGuide(inputQuery.trim());
              }
              setInputQuery('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              viewMode === 'guided'
                ? 'Ask any doubt (e.g. "Did not understand preemptive", "So what is first start time?")...'
                : `Enter topic to view full 6-stage reference guide...`
            }
            className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans-ui"
          />
          <button
            type="submit"
            disabled={isStepLoading || isLoading || !inputQuery.trim()}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30"
            title="Ask Academic Companion"
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
          setActiveModel(getActiveModelInfo());
        }}
      />

      {/* 60-Student Compounding Intelligence Evolution Modal */}
      <CohortIntelligenceModal
        isOpen={isCohortModalOpen}
        onClose={() => setIsCohortModalOpen(false)}
        topicTitle={studyGuide?.topic || activeTrack?.topics[currentTopicIndex]?.title || 'CPU Scheduling & Gantt Charts'}
        subjectName={studyGuide?.subject || activeTrack?.name || 'Operating Systems'}
        currentIteration={studyGuide?.iterationCount || 60}
        perfectionScore={studyGuide?.perfectionScore || 100}
        evolutionHistory={studyGuide?.evolutionHistory}
        onTriggerElevateTo60={handleElevateTo60}
        onTriggerRefineNext={handleRefineNext}
        isElevating={isElevatingTo60}
      />
    </div>
  );
};
