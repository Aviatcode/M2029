import React, { useState, useMemo } from 'react';
import { Subject, Unit, Topic, TopicStatus } from '../types';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  Search,
  LayoutList,
  Kanban,
  Table as TableIcon,
  Filter,
  Check,
  Clock,
  Flame,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

export type SyllabusViewMode = 'outline' | 'board' | 'table';

interface SyllabusMapViewProps {
  subjects: Subject[];
  unitsBySubject: Record<string, Unit[]>;
  onUpdateTopicStatus: (subjectId: string, topicId: string, status: TopicStatus) => void;
  onStudyTopic: (topicTitle: string, subjectName: string) => void;
  onAddUnit?: (subjectId: string, unit: Unit) => void;
  onDeleteUnit?: (subjectId: string, unitId: string) => void;
  onAddTopicToUnit?: (subjectId: string, unitId: string, topic: Topic) => void;
  onGenerateUnits?: (subjectId: string, subjectName: string) => void;
}

const STATUS_CONFIG: Record<
  TopicStatus,
  { label: string; bg: string; text: string; border: string; next: TopicStatus }
> = {
  not_started: {
    label: 'Not Started',
    bg: 'bg-slate-900',
    text: 'text-slate-400',
    border: 'border-slate-800',
    next: 'learning',
  },
  learning: {
    label: 'Studying',
    bg: 'bg-blue-950/60',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    next: 'revised',
  },
  revised: {
    label: 'Revised',
    bg: 'bg-purple-950/60',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    next: 'strong',
  },
  strong: {
    label: 'Mastered',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    next: 'not_started',
  },
  weak: {
    label: 'Needs Practice',
    bg: 'bg-rose-950/60',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    next: 'learning',
  },
};

export const SyllabusMapView: React.FC<SyllabusMapViewProps> = ({
  subjects,
  unitsBySubject,
  onUpdateTopicStatus,
  onStudyTopic,
  onAddUnit,
  onDeleteUnit,
  onAddTopicToUnit,
  onGenerateUnits,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [viewMode, setViewMode] = useState<SyllabusViewMode>('outline');
  const [searchQuery, setSearchQuery] = useState('');
  const [weightageFilter, setWeightageFilter] = useState<'all' | '10marker' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'learning' | 'revised' | 'strong'>('all');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Inline topic input per unit
  const [inlineNewTopicUnitId, setInlineNewTopicUnitId] = useState<string | null>(null);
  const [inlineTopicTitle, setInlineTopicTitle] = useState('');
  const [inlineTopicWeightage, setInlineTopicWeightage] = useState<'Must Read (10 Marks)' | 'High' | 'Medium'>('High');

  // Add Unit Modal state
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitTopics, setNewUnitTopics] = useState('');

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeSubjectId = currentSubject?.id || selectedSubjectId;
  const rawUnits = (activeSubjectId && unitsBySubject[activeSubjectId]) || [];

  const toggleUnit = (uId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [uId]: !prev[uId] }));
  };

  // Filter units and topics Notion-style
  const filteredUnits = useMemo(() => {
    return rawUnits.map((unit) => {
      const filteredTopics = (unit.topics || []).filter((topic) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = topic.title.toLowerCase().includes(q);
          const matchUnit = unit.title.toLowerCase().includes(q);
          if (!matchTitle && !matchUnit) return false;
        }
        // Weightage filter
        if (weightageFilter === '10marker' && topic.examWeightage !== 'Must Read (10 Marks)') {
          return false;
        }
        if (weightageFilter === 'high' && topic.examWeightage !== 'Must Read (10 Marks)' && topic.examWeightage !== 'High') {
          return false;
        }
        // Status filter
        if (statusFilter !== 'all') {
          const tStatus = topic.status || 'not_started';
          if (tStatus !== statusFilter) return false;
        }
        return true;
      });

      return {
        ...unit,
        topics: filteredTopics,
      };
    });
  }, [rawUnits, searchQuery, weightageFilter, statusFilter]);

  // Flattened topics for Board and Table views
  const allFilteredTopics = useMemo(() => {
    return filteredUnits.flatMap((u) =>
      u.topics.map((t) => ({
        ...t,
        unitTitle: u.title,
        unitNumber: u.number,
      }))
    );
  }, [filteredUnits]);

  // Overall Subject Progress
  const totalRawTopics = rawUnits.flatMap((u) => u.topics || []);
  const masteredCount = totalRawTopics.filter(
    (t) => t.status === 'revised' || t.status === 'strong'
  ).length;
  const progressPercent = totalRawTopics.length > 0 ? Math.round((masteredCount / totalRawTopics.length) * 100) : 0;
  const tenMarkerCount = totalRawTopics.filter((t) => t.examWeightage === 'Must Read (10 Marks)').length;

  // Next reading recommendation
  let nextTopic: Topic | null = null;
  for (const u of rawUnits) {
    for (const t of u.topics || []) {
      if (t.status === 'learning' || t.status === 'not_started') {
        nextTopic = t;
        break;
      }
    }
    if (nextTopic) break;
  }

  const handleCycleStatus = (topicId: string, currentStatus?: TopicStatus) => {
    if (!activeSubjectId) return;
    const safeStatus = currentStatus || 'not_started';
    const next = STATUS_CONFIG[safeStatus]?.next || 'not_started';
    onUpdateTopicStatus(activeSubjectId, topicId, next);
  };

  const handleSaveInlineTopic = (unit: Unit) => {
    if (!onAddTopicToUnit || !activeSubjectId || !inlineTopicTitle.trim()) return;

    const newTopic: Topic = {
      id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      unitId: unit.id,
      unitTitle: unit.title,
      title: inlineTopicTitle.trim(),
      difficulty: 'Medium',
      examWeightage: inlineTopicWeightage,
      estimatedMinutes: 15,
      status: 'not_started',
      completed: false,
      masteryScore: 0,
    };

    onAddTopicToUnit(activeSubjectId, unit.id, newTopic);
    setInlineTopicTitle('');
    setInlineNewTopicUnitId(null);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddUnit || !activeSubjectId) return;

    const trimmedTitle = newUnitTitle.trim() || `Unit ${rawUnits.length + 1}`;
    const unitId = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const rawTopics = newUnitTopics
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const topics: Topic[] = (rawTopics.length > 0 ? rawTopics : ['Foundational Concepts', 'Core Mechanism & Diagram', 'Exam 10-Marker Model Answer']).map((tName, idx) => ({
      id: `top-${Date.now()}-${idx}`,
      unitId,
      unitTitle: trimmedTitle,
      title: tName,
      difficulty: idx % 3 === 0 ? 'Hard' : idx % 2 === 0 ? 'Medium' : 'Easy',
      examWeightage: idx === 0 ? 'Must Read (10 Marks)' : idx % 2 === 0 ? 'High' : 'Medium',
      estimatedMinutes: 15,
      status: 'not_started',
      completed: false,
      masteryScore: 0,
    }));

    const newUnit: Unit = {
      id: unitId,
      subjectId: activeSubjectId,
      number: rawUnits.length + 1,
      title: trimmedTitle,
      topics,
    };

    onAddUnit(activeSubjectId, newUnit);
    setNewUnitTitle('');
    setNewUnitTopics('');
    setIsAddUnitOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-2 sm:px-4 space-y-6 animate-fade-in font-sans-ui text-slate-100">
      {/* 1. Top Header & Subject Switcher */}
      <div className="space-y-4 border-b border-slate-800/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
                Syllabus Map
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                Notion Database Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-view tracking, Kanban revision boards, and high-yield 10-markers
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onAddUnit && currentSubject && (
              <button
                type="button"
                onClick={() => setIsAddUnitOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Unit</span>
              </button>
            )}

            {onGenerateUnits && currentSubject && rawUnits.length === 0 && (
              <button
                type="button"
                onClick={() => onGenerateUnits(currentSubject.id, currentSubject.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate Units</span>
              </button>
            )}
          </div>
        </div>

        {/* Subject Pills */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-2 text-xs">
            {subjects.map((sub) => {
              const isSelected = (currentSubject?.id || selectedSubjectId) === sub.id;
              const subUnits = unitsBySubject[sub.id] || [];
              const allTopics = subUnits.flatMap((u) => u.topics || []);
              const subMastered = allTopics.filter(
                (t) => t.status === 'revised' || t.status === 'strong'
              ).length;
              const percent = allTopics.length > 0 ? Math.round((subMastered / allTopics.length) * 100) : 0;

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer text-xs flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }`}
                >
                  <span>{sub.name}</span>
                  {allTopics.length > 0 && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      {percent}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Subject Progress Strip (Notion-style progress & stats) */}
        {currentSubject && totalRawTopics.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/70 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 font-medium">{currentSubject.name} Readiness:</span>
              <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(progressPercent, 4)}%` }}
                />
              </div>
              <span className="font-mono text-emerald-400 font-semibold">{progressPercent}%</span>
              <span className="text-slate-500 text-[11px]">
                ({masteredCount}/{totalRawTopics.length} Mastered)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {tenMarkerCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3 text-purple-400" />
                  <span>{tenMarkerCount} High-Yield 10-Markers</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Next Topic Callout */}
        {nextTopic && currentSubject && (
          <div className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Recommended Next Reading:
                </span>
                <span className="academic-tag text-[9px] text-purple-300 bg-purple-950/40 border border-purple-800/60">
                  {nextTopic.examWeightage}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {nextTopic.title}
              </div>
            </div>

            <button
              onClick={() => onStudyTopic(nextTopic!.title, currentSubject.name)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5 text-xs shadow-xs"
            >
              <span>Study Topic</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Notion-Style View Switcher & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* View Modes */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setViewMode('outline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'outline'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Outline</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search concepts, algorithms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-600 transition w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Weightage filter */}
            <select
              value={weightageFilter}
              onChange={(e) => setWeightageFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Weightages</option>
              <option value="10marker">10-Markers Only</option>
              <option value="high">High Yield & 10-Markers</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="learning">Studying</option>
              <option value="revised">Revised</option>
              <option value="strong">Mastered</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA BASED ON NOTION VIEW MODE */}
      {rawUnits.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 p-6 space-y-3.5">
          <BookOpen className="w-9 h-9 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              No syllabus units in {currentSubject?.name || 'this subject'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add units manually or let AI instantly provision a structured 4-unit curriculum outline for this course.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {onGenerateUnits && currentSubject && (
              <button
                type="button"
                onClick={() => onGenerateUnits(currentSubject.id, currentSubject.name)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Auto-Generate Course Units</span>
              </button>
            )}

            {onAddUnit && (
              <button
                type="button"
                onClick={() => setIsAddUnitOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Unit Manually</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: OUTLINE (Hierarchical Chapters Tree with Notion Inline Adding) */}
          {viewMode === 'outline' && (
            <div className="space-y-3.5">
              {filteredUnits.map((unit) => {
                const isExpanded = expandedUnits[unit.id] !== false;
                const completedCount = (unit.topics || []).filter(
                  (t) => t.status === 'revised' || t.status === 'strong'
                ).length;

                return (
                  <div
                    key={unit.id}
                    className="rounded-xl bg-slate-900/30 border border-slate-800/80 overflow-hidden"
                  >
                    {/* Unit Chapter Header */}
                    <div
                      onClick={() => toggleUnit(unit.id)}
                      className="p-3.5 sm:p-4 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-between gap-3 cursor-pointer transition select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="academic-tag text-[10px] text-slate-400 font-mono">
                              Unit 0{unit.number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({completedCount} of {(unit.topics || []).length} mastered)
                            </span>
                          </div>
                          <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100 truncate mt-0.5">
                            {unit.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onDeleteUnit && activeSubjectId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUnit(activeSubjectId, unit.id);
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete this unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="text-slate-400 ml-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Topics List in Folder */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-800/50 border-t border-slate-800/60">
                        {(unit.topics || []).length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            No topics matching filter in this unit.
                          </div>
                        ) : (
                          unit.topics.map((topic) => {
                            const statusInfo = STATUS_CONFIG[topic.status || 'not_started'];

                            return (
                              <div
                                key={topic.id}
                                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-900/40 transition group"
                              >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <h4 className="text-xs md:text-sm font-medium text-slate-200 group-hover:text-white transition truncate">
                                    {topic.title}
                                  </h4>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                                    {topic.examWeightage === 'Must Read (10 Marks)' ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                        10-Marker
                                      </span>
                                    ) : (
                                      <span className="academic-tag text-[9px] text-slate-400">
                                        {topic.examWeightage}
                                      </span>
                                    )}
                                    <span aria-hidden="true" className="text-slate-700">·</span>
                                    <span>{topic.estimatedMinutes || 15} min read</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  {/* Notion-style clickable status badge */}
                                  <button
                                    type="button"
                                    onClick={() => handleCycleStatus(topic.id, topic.status)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                                    title="Click to advance status"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span>{statusInfo.label}</span>
                                  </button>

                                  <button
                                    onClick={() => onStudyTopic(topic.title, currentSubject?.name || 'Subject')}
                                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer"
                                  >
                                    Study
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Notion-Style Inline "+ New Topic" Row */}
                        {onAddTopicToUnit && (
                          <div className="p-2.5 bg-slate-950/40">
                            {inlineNewTopicUnitId === unit.id ? (
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap animate-fade-in">
                                <input
                                  type="text"
                                  value={inlineTopicTitle}
                                  onChange={(e) => setInlineTopicTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveInlineTopic(unit);
                                    } else if (e.key === 'Escape') {
                                      setInlineNewTopicUnitId(null);
                                    }
                                  }}
                                  placeholder="Type topic name and press Enter..."
                                  autoFocus
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-slate-500"
                                />

                                <select
                                  value={inlineTopicWeightage}
                                  onChange={(e) => setInlineTopicWeightage(e.target.value as any)}
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                                >
                                  <option value="High">High</option>
                                  <option value="Must Read (10 Marks)">10-Marker</option>
                                  <option value="Medium">Medium</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineTopic(unit)}
                                  className="px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer shrink-0"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineNewTopicUnitId(null)}
                                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineNewTopicUnitId(unit.id);
                                  setInlineTopicTitle('');
                                }}
                                className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ New Topic in {unit.title}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: KANBAN BOARD (Notion-Style 4-Column Drag / Status Flow) */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
              {(['not_started', 'learning', 'revised', 'strong'] as TopicStatus[]).map((colStatus) => {
                const conf = STATUS_CONFIG[colStatus];
                const colTopics = allFilteredTopics.filter(
                  (t) => (t.status || 'not_started') === colStatus
                );

                return (
                  <div
                    key={colStatus}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col min-h-[360px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${conf.text} bg-current`} />
                        <h4 className="text-xs font-semibold text-slate-200">{conf.label}</h4>
                      </div>
                      <span className="font-mono text-xs text-slate-500 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                        {colTopics.length}
                      </span>
                    </div>

                    {/* Cards in Column */}
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                      {colTopics.length === 0 ? (
                        <div className="p-4 text-center text-[11px] text-slate-600 border border-dashed border-slate-800/60 rounded-lg">
                          No topics
                        </div>
                      ) : (
                        colTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-500 truncate">
                                U{topic.unitNumber}
                              </span>
                              {topic.examWeightage === 'Must Read (10 Marks)' && (
                                <span className="text-[9px] font-bold px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
                                  10-M
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-medium text-slate-200 group-hover:text-white leading-snug">
                              {topic.title}
                            </h5>

                            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(topic.id, topic.status)}
                                className="text-[10px] text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1 font-medium"
                                title="Advance to next stage"
                              >
                                <span>Advance</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>

                              <button
                                onClick={() => onStudyTopic(topic.title, currentSubject?.name || 'Subject')}
                                className="text-[10px] text-slate-300 hover:text-white font-medium transition cursor-pointer"
                              >
                                Study
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: DATABASE TABLE (Notion-Style Spreadsheet) */}
          {viewMode === 'table' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Topic</th>
                      <th className="px-3 py-2.5">Unit</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Weightage</th>
                      <th className="px-3 py-2.5 text-right">Time</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans-ui">
                    {allFilteredTopics.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No topics found matching search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      allFilteredTopics.map((topic) => {
                        const statusInfo = STATUS_CONFIG[topic.status || 'not_started'];

                        return (
                          <tr key={topic.id} className="hover:bg-slate-900/40 transition">
                            <td className="px-4 py-2.5 text-slate-200 font-medium">
                              {topic.title}
                            </td>
                            <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px] truncate max-w-[140px]">
                              Unit {topic.unitNumber}
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(topic.id, topic.status)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                                title="Click to cycle status"
                              >
                                {statusInfo.label}
                              </button>
                            </td>
                            <td className="px-3 py-2.5">
                              {topic.examWeightage === 'Must Read (10 Marks)' ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                  10-Marker
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  {topic.examWeightage}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-400 text-[11px]">
                              {topic.estimatedMinutes || 15}m
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => onStudyTopic(topic.title, currentSubject?.name || 'Subject')}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer text-[11px]"
                              >
                                Study
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. Add Unit Modal */}
      {isAddUnitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsAddUnitOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white">
                Add Unit to {currentSubject?.name || 'Subject'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUnitOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Unit Title *
                </label>
                <input
                  type="text"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  placeholder={`e.g. Unit ${rawUnits.length + 1}: Core Principles & Architecture`}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Topics in this Unit (comma or newline separated)
                </label>
                <textarea
                  value={newUnitTopics}
                  onChange={(e) => setNewUnitTopics(e.target.value)}
                  rows={3}
                  placeholder="e.g. Memory Hierarchy, Paging & Segmentation, Virtual Memory, TLB"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUnitOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold transition cursor-pointer"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
