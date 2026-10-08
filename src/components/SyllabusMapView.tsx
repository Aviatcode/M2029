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
  onExportToGitHub?: () => void;
}

export const SyllabusMapView: React.FC<SyllabusMapViewProps> = ({
  subjects,
  unitsBySubject,
  onUpdateTopicStatus,
  onStudyTopic,
  onExportToGitHub,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub-dbms');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    'unit-dbms-1': true,
    'unit-dbms-2': true,
  });

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
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
              Syllabus Map
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Structured course units and concepts for {currentSubject?.name || 'your class'}.
            </p>
          </div>
          {onExportToGitHub && (
            <button
              onClick={onExportToGitHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition cursor-pointer self-start sm:self-auto"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export for GitHub</span>
            </button>
          )}
        </div>

        {/* Quiet Subject Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>

        {/* Quiet Next Topic Recommendation (No loud alarms) */}
        {nextTopic && (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Next in syllabus: </span>
              <span className="text-slate-200 font-semibold">{nextTopic.title}</span>
              <div className="text-slate-400 mt-0.5">
                {nextTopic.examWeightage} weightage · {nextTopic.estimatedMinutes} min read
              </div>
            </div>
            <button
              onClick={() => onStudyTopic(nextTopic!.title, currentSubject.name)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
            >
              <span>Study Topic</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Units & Topics List */}
      <div className="space-y-3">
        {units.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400 text-xs">
            No syllabus units uploaded for this subject yet.
          </div>
        ) : (
          units.map((unit) => {
            const isExpanded = expandedUnits[unit.id] !== false;

            return (
              <div
                key={unit.id}
                className="rounded-xl bg-slate-900/30 border border-slate-800/80 overflow-hidden"
              >
                {/* Unit Header */}
                <div
                  onClick={() => toggleUnit(unit.id)}
                  className="p-4 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-between gap-3 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <h3 className="font-medium text-slate-200 text-sm">
                        {unit.title}
                      </h3>
                      <span className="text-xs text-slate-400 font-sans">
                        Unit {unit.number} · {unit.topics.length} concepts
                      </span>
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
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-900/20 transition"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs md:text-sm font-medium text-slate-200">
                            {topic.title}
                          </h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{topic.examWeightage}</span>
                            <span aria-hidden="true">·</span>
                            <span>{topic.estimatedMinutes} min</span>
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
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="learning">Studying</option>
                            <option value="revised">Revised</option>
                            <option value="strong">Mastered</option>
                          </select>

                          <button
                            onClick={() => onStudyTopic(topic.title, currentSubject.name)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
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
