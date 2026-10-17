import React, { useState } from 'react';
import { Subject, Unit, Topic, TopicStatus } from '../types';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  ArrowRight,
  BookOpen,
  GitBranch,
} from 'lucide-react';

interface SyllabusMapViewProps {
  subjects: Subject[];
  unitsBySubject: Record<string, Unit[]>;
  onUpdateTopicStatus: (subjectId: string, topicId: string, status: TopicStatus) => void;
  onStudyTopic: (topicTitle: string, subjectName: string) => void;
}

export const SyllabusMapView: React.FC<SyllabusMapViewProps> = ({
  subjects,
  unitsBySubject,
  onUpdateTopicStatus,
  onStudyTopic,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const units = unitsBySubject[selectedSubjectId] || [];

  const toggleUnit = (uId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [uId]: !prev[uId] }));
  };

  // Calculate Next Topic quietly
  let nextTopic: Topic | null = null;
  for (const u of units) {
    for (const t of u.topics) {
      if (t.status === 'learning' || t.status === 'not_started') {
        nextTopic = t;
        break;
      }
    }
    if (nextTopic) break;
  }

  return (
    <div className="max-w-4xl mx-auto py-7 px-2 sm:px-4 space-y-7 animate-fade-in">
      {/* 1. Header */}
      <div className="space-y-3 border-b border-slate-800/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-0.5">
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
              Syllabus Directory
            </h1>
            <p className="text-xs text-slate-400 font-sans-ui">
              {currentSubject?.name || 'Course Curriculum'}
            </p>
          </div>
        </div>

        {/* Quiet Subject Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded transition shrink-0 cursor-pointer font-sans-ui text-xs flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white font-medium border border-slate-800 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{sub.name}</span>
                {sub.totalTopicsCount > 0 && (
                  <span className="academic-tag text-[9px] text-slate-400">
                    {Math.round((sub.completedTopicsCount / sub.totalTopicsCount) * 100)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quiet Next Topic Recommendation */}
        {nextTopic && (
          <div className="p-4 rounded-md bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs marginalia">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="academic-tag text-[10px] text-neutral-300">
                  Recommended Next Reading
                </span>
                <span className="academic-tag text-[10px] text-slate-400">
                  {nextTopic.examWeightage}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-100 font-sans-ui">
                {nextTopic.title}
              </div>
              <div className="text-[11px] text-slate-400 font-sans-ui">
                Estimated reading time: {nextTopic.estimatedMinutes} minutes
              </div>
            </div>

            <button
              onClick={() => onStudyTopic(nextTopic!.title, currentSubject.name)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-medium transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5 font-sans-ui text-xs"
            >
              <span>Study Topic</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Units & Topics Chapter Book */}
      <div className="space-y-3.5">
        {subjects.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-400 text-xs font-sans-ui space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium">No subjects configured yet</p>
            <p className="text-[11px] text-slate-500">Configure your semester subjects to map units, topics, and exam weightage.</p>
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-12 rounded-md bg-slate-900/30 border border-slate-800 text-slate-400 text-xs font-sans-ui">
            No syllabus units uploaded for this subject yet. Drop lecture notes or syllabus in the Study Vault.
          </div>
        ) : (
          units.map((unit) => {
            const isExpanded = expandedUnits[unit.id] !== false;
            const completedCount = unit.topics.filter(
              (t) => t.status === 'revised' || t.status === 'strong'
            ).length;

            return (
              <div
                key={unit.id}
                className="rounded-md bg-slate-900/30 border border-slate-800/80 overflow-hidden"
              >
                {/* Unit Chapter Header */}
                <div
                  onClick={() => toggleUnit(unit.id)}
                  className="p-3.5 sm:p-4 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-between gap-3 cursor-pointer transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="academic-tag text-[10px] text-slate-400">
                          Unit 0{unit.number}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans-ui">
                          ({completedCount} of {unit.topics.length} topics mastered)
                        </span>
                      </div>
                      <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100">
                        {unit.title}
                      </h3>
                    </div>
                  </div>

                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Topics List */}
                {isExpanded && (
                  <div className="divide-y divide-slate-800/50 border-t border-slate-800/60">
                    {unit.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-900/30 transition group"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs md:text-sm font-medium text-slate-200 font-sans-ui group-hover:text-white transition">
                            {topic.title}
                          </h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 font-sans-ui">
                            <span className="academic-tag text-[9px] text-slate-400">
                              {topic.examWeightage}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{topic.estimatedMinutes} min read</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <select
                            value={topic.status || 'not_started'}
                            onChange={(e) =>
                              onUpdateTopicStatus(
                                selectedSubjectId,
                                topic.id,
                                e.target.value as TopicStatus
                              )
                            }
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer font-sans-ui"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="learning">Studying</option>
                            <option value="revised">Revised</option>
                            <option value="strong">Mastered</option>
                          </select>

                          <button
                            onClick={() => onStudyTopic(topic.title, currentSubject.name)}
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui"
                          >
                            Study
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
