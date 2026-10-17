import React, { useState } from 'react';
import { Classroom, Topic } from '../types';
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  Plus,
  Users,
  Sparkles,
  Zap,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Flame,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
} from 'lucide-react';

interface SyllabusSidebarProps {
  classroom: Classroom;
  activeTopicId: string;
  onSelectTopic: (topic: Topic) => void;
  onOpenUploadModal: () => void;
  onOpenDatesheetModal: () => void;
  onSwitchClassCode: (newCode: string) => void;
}

export const SyllabusSidebar: React.FC<SyllabusSidebarProps> = ({
  classroom,
  activeTopicId,
  onSelectTopic,
  onOpenUploadModal,
  onOpenDatesheetModal,
  onSwitchClassCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    'unit-1': true,
    'unit-2': true,
  });
  const [editingCode, setEditingCode] = useState(false);
  const [tempCode, setTempCode] = useState(classroom.code);
  const [showCohortCode, setShowCohortCode] = useState(false);
  const [copiedCohortCode, setCopiedCohortCode] = useState(false);

  const toggleUnit = (uId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [uId]: !prev[uId] }));
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempCode.trim()) {
      onSwitchClassCode(tempCode.trim().toUpperCase());
      setEditingCode(false);
      setShowCohortCode(false); // Hide classroom code once entered
    }
  };

  const handleCopyCohortCode = () => {
    navigator.clipboard.writeText(classroom.code);
    setCopiedCohortCode(true);
    setTimeout(() => setCopiedCohortCode(false), 2000);
  };

  // Calculate overall syllabus readiness
  let totalTopics = 0;
  let masteredTopics = 0;
  classroom.units.forEach((u: any) => {
    (u.topics || []).forEach((t: any) => {
      totalTopics++;
      if ((t.masteryScore || 0) >= 70) masteredTopics++;
    });
  });

  const readinessPercent = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;
  const cachedCount = Object.keys(classroom.cachedLessons || {}).length;

  return (
    <aside className="w-full md:w-80 lg:w-88 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Classroom Code & Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <img
              src="./am-logo.png"
              alt="AM Logo"
              className="w-8 h-8 rounded-lg shrink-0 object-contain shadow-xs border border-neutral-800/80"
            />
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">M2029</h1>
              <p className="text-[10px] text-slate-400 font-mono">Curriculum Syllabus</p>
            </div>
          </div>

          <button
            onClick={onOpenDatesheetModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-medium transition cursor-pointer"
            title="View Datesheet & Exam Countdown"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Datesheet</span>
          </button>
        </div>

        {/* Classroom Code Switcher */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Cohort Code:</span>
            </span>

            {!editingCode ? (
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 tracking-wider select-all">
                  {showCohortCode ? classroom.code : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCohortCode(!showCohortCode)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title={showCohortCode ? 'Hide classroom code' : 'Reveal classroom code'}
                  aria-label={showCohortCode ? 'Hide classroom code' : 'Reveal classroom code'}
                >
                  {showCohortCode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCohortCode}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Copy classroom code"
                  aria-label="Copy classroom code"
                >
                  {copiedCohortCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    setTempCode(classroom.code);
                    setEditingCode(true);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleCodeSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-xs text-white font-mono uppercase"
                  placeholder="CODE"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-slate-100 hover:bg-white rounded text-[10px] font-semibold text-slate-950 transition cursor-pointer"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCode(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>

          {/* Token Saving Indicator */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-neutral-300">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-neutral-400" />
              <span>Shared Class Cache:</span>
            </span>
            <span className="font-mono font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700">
              {cachedCount} Saved (0 Tokens)
            </span>
          </div>
        </div>
      </div>

      {/* Exam Readiness Score Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Exam Readiness Heatmap</span>
          </span>
          <span
            className={`font-mono font-bold ${
              readinessPercent >= 70
                ? 'text-neutral-200'
                : readinessPercent >= 40
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {readinessPercent}% Ready
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-neutral-300 transition-all duration-500"
            style={{ width: `${Math.max(readinessPercent, 5)}%` }}
          />
        </div>
      </div>

      {/* Search & Ingestion Bar */}
      <div className="p-3 border-b border-slate-800/80 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search syllabus concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600 transition"
          />
        </div>

        <button
          onClick={onOpenUploadModal}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Syllabus / Add Unit</span>
        </button>
      </div>

      {/* Laptop Folder Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {classroom.units.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 space-y-3">
            <Folder className="w-10 h-10 mx-auto text-slate-700 stroke-1" />
            <p className="text-xs">No syllabus uploaded yet for this class code.</p>
            <button
              onClick={onOpenUploadModal}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              Upload Syllabus
            </button>
          </div>
        ) : (
          classroom.units.map((unit: any) => {
            const isExpanded = expandedUnits[unit.id] !== false;
            const filteredTopics = (unit.topics || []).filter(
              (t: any) =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                unit.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (searchQuery && filteredTopics.length === 0) return null;

            return (
              <div key={unit.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                {/* Unit Folder Header */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full flex items-center justify-between p-2.5 text-left bg-slate-900/80 hover:bg-slate-850 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {unit.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                      {(unit.topics || []).length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Topics List in Folder */}
                {isExpanded && (
                  <div className="p-1.5 space-y-1 bg-slate-950/60 border-t border-slate-800/60">
                    {filteredTopics.map((topic: any) => {
                      const isActive = topic.id === activeTopicId;
                      const score = topic.masteryScore || 0;

                      return (
                        <div
                          key={topic.id}
                          onClick={() => onSelectTopic(topic)}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition text-left ${
                            isActive
                              ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                              : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                          }`}
                        >
                          <FileText
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isActive ? 'text-cyan-400' : 'text-slate-500'
                            }`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-medium leading-snug line-clamp-2">
                                {topic.title}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              {/* Mastery Heatmap Badge */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  score >= 70
                                    ? 'bg-neutral-200 shadow-sm'
                                    : score >= 40
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                }`}
                                title={`Mastery: ${score}%`}
                              />

                              {topic.examWeightage === 'Must Read (10 Marks)' ? (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                  10-Marker
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500">
                                  {topic.estimatedMinutes}m read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
