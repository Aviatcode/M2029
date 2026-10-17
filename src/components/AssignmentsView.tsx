import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Check,
  Sparkles,
  Send,
  Copy,
  Plus,
  FileText,
  Presentation,
  ShieldCheck,
  X,
  Search,
  BookOpen,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { AcademicAssignment, Subject, ClassworkType } from '../types';
import { getAiRequestPayload } from '../utils/aiModelService';

interface AssignmentsViewProps {
  assignments: AcademicAssignment[];
  subjects?: Subject[];
  onUpdateAssignments?: (updated: AcademicAssignment[]) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments: initialAssignments,
  subjects = [],
  onUpdateAssignments,
}) => {
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(initialAssignments);
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all' = folder shelf view
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed' | 'ppt'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Assignment for Detail / AI Solver Modal
  const [activeModalItem, setActiveModalItem] = useState<AcademicAssignment | null>(null);

  // AI Solver state
  const [isSolving, setIsSolving] = useState(false);
  const [aiSolution, setAiSolution] = useState<string>('');
  const [studentNotes, setStudentNotes] = useState('');
  const [copiedSolution, setCopiedSolution] = useState(false);

  // Critique Draft state
  const [studentDraft, setStudentDraft] = useState('');
  const [reviewResult, setReviewResult] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [assistantTab, setAssistantTab] = useState<'ai_solver' | 'draft_critique' | 'structure'>('ai_solver');

  // New Assignment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(subjects[0]?.name || 'Database Management Systems');
  const [newDueDate, setNewDueDate] = useState('');
  const [newType, setNewType] = useState<ClassworkType>('assignment');
  const [newInstructions, setNewInstructions] = useState('');
  const [newPresenter, setNewPresenter] = useState('');
  const [newRollNo, setNewRollNo] = useState('');

  // CR Portal Modal
  const [isCRPortalOpen, setIsCRPortalOpen] = useState(false);
  const [crRosterText, setCrRosterText] = useState('');
  const [isSyncingCR, setIsSyncingCR] = useState(false);
  const [crSyncSuccess, setCrSyncSuccess] = useState('');

  // Sync props changes
  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const calculateDaysLeft = (dateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Toggle Done state
  const handleToggleDone = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const updated = assignments.map((a) => {
      if (a.id === id) {
        return { ...a, completed: !a.completed };
      }
      return a;
    });

    setAssignments(updated);
    if (activeModalItem?.id === id) {
      setActiveModalItem((prev) => (prev ? { ...prev, completed: !prev.completed } : null));
    }
    if (onUpdateAssignments) {
      onUpdateAssignments(updated);
    }

    try {
      await fetch(`/api/assignments/${id}/toggle-done`, { method: 'PATCH' });
    } catch (err) {
      console.warn('Could not persist toggle-done to server:', err);
    }
  };

  // Add new assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) {
      alert('Please provide title and due date.');
      return;
    }

    const payload = {
      title: newTitle.trim(),
      subjectName: newSubject,
      subjectId: subjects.find((s) => s.name === newSubject)?.id || 'sub-dbms',
      dueDate: newDueDate,
      type: newType,
      instructions: newInstructions.trim() || 'Complete according to university guidelines.',
      assignedBy: 'Faculty / Class Representative',
      presenterName: newPresenter.trim() || undefined,
      rollNumber: newRollNo.trim() || undefined,
    };

    try {
      const res = await fetch('/api/assignments/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
        if (onUpdateAssignments) onUpdateAssignments(data.assignments);
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewInstructions('');
        setNewDueDate('');
        setNewPresenter('');
        setNewRollNo('');
      }
    } catch (err: any) {
      alert('Failed to add assignment: ' + err.message);
    }
  };

  // CR 1-Click Classwide Sync
  const handleCRSync = async () => {
    setIsSyncingCR(true);
    setCrSyncSuccess('');

    const lines = crRosterText.split('\n').filter((l) => l.trim().length > 0);
    const parsedItems: Partial<AcademicAssignment>[] = [];

    if (lines.length > 0) {
      lines.forEach((line, idx) => {
        const parts = line.split('-').map((p) => p.trim());
        const rollAndName = parts[0] || `Roll ${idx + 101}`;
        const topic = parts[1] || 'Syllabus Presentation Topic';
        const date = parts[2] || new Date(Date.now() + (idx + 2) * 86400000).toISOString().slice(0, 10);

        parsedItems.push({
          id: `cr-ppt-${Date.now()}-${idx}`,
          title: `PPT Presentation: ${topic}`,
          type: 'ppt_presentation',
          subjectName: newSubject || 'Database Management Systems',
          subjectId: 'sub-dbms',
          dueDate: date,
          presenterName: rollAndName,
          rollNumber: rollAndName.split(' ')[1] || `Roll ${idx + 101}`,
          instructions: `Formal 10-slide PowerPoint presentation on ${topic}. Ensure diagrams and practical examples are included.`,
          assignedBy: 'Class Representative (CR Official Roster)',
          completed: false,
        });
      });
    } else {
      parsedItems.push(
        {
          id: `cr-ppt-1-${Date.now()}`,
          title: 'PPT Presentation: Deadlock Coffman Conditions & Banker Algorithm',
          type: 'ppt_presentation',
          subjectName: 'Operating Systems',
          subjectId: 'sub-os',
          dueDate: '2026-10-22',
          presenterName: 'Roll 101 to 105 (Aman Kumar, Priya Singh, Rohit Verma)',
          rollNumber: 'Roll 101-105',
          instructions: 'Explain Banker algorithm safety condition, Need Matrix, and Allocation Matrix with dry run.',
          assignedBy: 'Class Representative (CR)',
          completed: false,
        },
        {
          id: `cr-ppt-2-${Date.now()}`,
          title: 'PPT Presentation: BCNF vs 3NF Decomposition & Lossless Join Proof',
          type: 'ppt_presentation',
          subjectName: 'Database Management Systems',
          subjectId: 'sub-dbms',
          dueDate: '2026-10-25',
          presenterName: 'Roll 106 to 110 (Ananya Sen, Rahul Sharma, Tanvi Jain)',
          rollNumber: 'Roll 106-110',
          instructions: 'Show practical examples of dependency preservation vs BCNF anomalies.',
          assignedBy: 'Class Representative (CR)',
          completed: false,
        }
      );
    }

    try {
      const res = await fetch('/api/assignments/cr-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parsedItems,
          broadcastMessage: `Class Representative has synchronized ${parsedItems.length} official assignment deadlines and PPT presentation slots for the entire cohort.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
        if (onUpdateAssignments) onUpdateAssignments(data.assignments);
        setCrSyncSuccess(`✓ Successfully synchronized ${parsedItems.length} items with the whole class!`);
        setTimeout(() => {
          setIsCRPortalOpen(false);
          setCrSyncSuccess('');
        }, 2200);
      }
    } catch (err: any) {
      alert('CR sync failed: ' + err.message);
    } finally {
      setIsSyncingCR(false);
    }
  };

  // AI Assignment Solver
  const handleSolveWithAI = async () => {
    if (!activeModalItem) return;
    setIsSolving(true);
    setAiSolution('');

    try {
      const res = await fetch('/api/assignments/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentTitle: activeModalItem.title,
          subjectName: activeModalItem.subjectName,
          instructions: activeModalItem.instructions,
          studentNotes: studentNotes.trim() || undefined,
          ...getAiRequestPayload(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSolution(data.answer);
      } else {
        const err = await res.json();
        setAiSolution('Error solving assignment: ' + (err.error || 'Unknown error'));
      }
    } catch (err: any) {
      setAiSolution('Network error: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopySolution = () => {
    if (!aiSolution) return;
    navigator.clipboard.writeText(aiSolution);
    setCopiedSolution(true);
    setTimeout(() => setCopiedSolution(false), 2000);
  };

  // Subject folders structure
  const subjectFolders = useMemo(() => {
    const foldersMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        accentColor: string;
        assignments: AcademicAssignment[];
        totalCount: number;
        completedCount: number;
        pendingCount: number;
        urgentCount: number;
      }
    >();

    const accents: Record<string, string> = {
      'database management systems': 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
      'java programming': 'text-amber-400 bg-amber-950/40 border-amber-500/30',
      'operating systems': 'text-purple-400 bg-purple-950/40 border-purple-500/30',
      'web development': 'text-neutral-300 bg-neutral-900 border-neutral-700',
      'computer networks': 'text-rose-400 bg-rose-950/40 border-rose-500/30',
    };

    subjects.forEach((s) => {
      const key = s.name.toLowerCase().trim();
      foldersMap.set(key, {
        id: s.id,
        name: s.name,
        code: s.code || 'BCA',
        accentColor: accents[key] || 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
        assignments: [],
        totalCount: 0,
        completedCount: 0,
        pendingCount: 0,
        urgentCount: 0,
      });
    });

    assignments.forEach((a) => {
      const key = (a.subjectName || 'General Studies').toLowerCase().trim();
      if (!foldersMap.has(key)) {
        foldersMap.set(key, {
          id: a.subjectId || `sub-${key.replace(/\s+/g, '-')}`,
          name: a.subjectName || 'General Studies',
          code: 'BCA',
          accentColor: accents[key] || 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
          assignments: [],
          totalCount: 0,
          completedCount: 0,
          pendingCount: 0,
          urgentCount: 0,
        });
      }

      const folder = foldersMap.get(key)!;
      folder.assignments.push(a);
      folder.totalCount++;
      if (a.completed) {
        folder.completedCount++;
      } else {
        folder.pendingCount++;
        const days = calculateDaysLeft(a.dueDate);
        if (days >= 0 && days <= 3) {
          folder.urgentCount++;
        }
      }
    });

    return Array.from(foldersMap.values());
  }, [subjects, assignments]);

  // Filtered assignments when inside a folder or when searching
  const filteredAssignments = useMemo(() => {
    let list = assignments;

    if (selectedFolder !== 'all') {
      list = list.filter(
        (a) => a.subjectName?.toLowerCase().trim() === selectedFolder.toLowerCase().trim()
      );
    }

    if (filterType === 'pending') {
      list = list.filter((a) => !a.completed);
    } else if (filterType === 'completed') {
      list = list.filter((a) => a.completed);
    } else if (filterType === 'ppt') {
      list = list.filter((a) => a.type === 'ppt_presentation');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subjectName?.toLowerCase().includes(q) ||
          a.presenterName?.toLowerCase().includes(q) ||
          a.instructions?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [assignments, selectedFolder, filterType, searchQuery]);

  const completedCount = assignments.filter((a) => a.completed).length;
  const pendingCount = assignments.length - completedCount;
  const dueSoonCount = assignments.filter((a) => {
    if (a.completed) return false;
    const days = calculateDaysLeft(a.dueDate);
    return days >= 0 && days <= 4;
  }).length;

  return (
    <div className="max-w-4xl mx-auto py-7 px-2 sm:px-4 space-y-7 animate-fade-in text-slate-100 pb-12">
      {/* 1. Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
            Assignments & Presentations
          </h1>
          <p className="text-xs text-slate-400 font-sans-ui">
            Classwork deadlines and seminar presentation roster.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCRPortalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui"
            title="Class Representative 1-Click Sync"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>CR Sync</span>
          </button>

          <button
            onClick={() => {
              if (selectedFolder !== 'all') setNewSubject(selectedFolder);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer font-sans-ui"
          >
            <Plus className="w-4 h-4" />
            <span>Add Work</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All (${assignments.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'completed', label: `Completed (${completedCount})` },
            { id: 'ppt', label: `PPT Roster (${assignments.filter((a) => a.type === 'ppt_presentation').length})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id as any)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 font-medium ${
                filterType === pill.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assignments or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-200 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. ROOT VIEW: Subject Folders Shelf (When selectedFolder === 'all' and no active search) */}
      {selectedFolder === 'all' && !searchQuery.trim() && filterType === 'all' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2">
            <span className="academic-tag text-[10px] text-slate-400">
              Subject Folders ({subjectFolders.length})
            </span>
            {dueSoonCount > 0 && (
              <span className="academic-tag text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{dueSoonCount} Deadlines Approaching</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {subjectFolders.map((folder) => {
              const percentDone =
                folder.totalCount > 0 ? Math.round((folder.completedCount / folder.totalCount) * 100) : 0;

              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.name)}
                  className="p-4 sm:p-5 rounded-md bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70 transition cursor-pointer flex flex-col justify-between gap-4 group shadow-2xs select-none"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Folder Graphic */}
                      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                        <Folder className="w-4 h-4" />
                      </div>

                      {/* File count tag */}
                      <div className="flex items-center gap-1.5">
                        {folder.urgentCount > 0 && (
                          <span className="academic-tag text-[9px] px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-300 border border-amber-500/30">
                            {folder.urgentCount} Urgent
                          </span>
                        )}
                        <span className="academic-tag text-[9px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          {folder.totalCount} {folder.totalCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-editorial text-base font-medium text-slate-100 group-hover:text-white transition">
                        {folder.name}
                      </h3>
                      <span className="academic-tag text-[9px] text-slate-400">
                        {folder.code} · Syllabus Coursework
                      </span>
                    </div>
                  </div>

                  {/* Folder Completion Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 font-sans-ui text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{folder.completedCount} of {folder.totalCount} Completed</span>
                      <span className="font-mono text-neutral-200 font-medium">{percentDone}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-300 group-hover:bg-white transition-all duration-300 rounded-full"
                        style={{ width: `${percentDone}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 4. FOLDER CONTENTS VIEW (When inside a folder, searching, or filtering) */
        <div className="space-y-4">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              {selectedFolder !== 'all' ? (
                <button
                  onClick={() => setSelectedFolder('all')}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>All Folders</span>
                </button>
              ) : (
                <span className="text-slate-400">All Subjects</span>
              )}

              {selectedFolder !== 'all' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-cyan-400" />
                    <span>{selectedFolder}</span>
                  </span>
                </>
              )}
            </div>

            <span className="text-slate-400 font-mono text-[11px]">
              {filteredAssignments.length} {filteredAssignments.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Items List */}
          {filteredAssignments.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
              <Folder className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No assignments found matching this filter.</p>
              {selectedFolder !== 'all' && (
                <button
                  onClick={() => setSelectedFolder('all')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs cursor-pointer"
                >
                  Return to All Folders
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAssignments.map((item) => {
                const daysLeft = calculateDaysLeft(item.dueDate);
                const isUrgent = daysLeft >= 0 && daysLeft <= 3 && !item.completed;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveModalItem(item);
                      setAiSolution('');
                      setReviewResult('');
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      item.completed
                        ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-80'
                        : isUrgent
                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 shadow-sm'
                        : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-mono px-2 py-0.5 rounded border ${
                            item.type === 'ppt_presentation'
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {item.type === 'ppt_presentation' ? '🎤 PPT Presentation' : '📝 Written Assignment'}
                        </span>

                        <span
                          className={`font-mono font-medium ${
                            item.completed
                              ? 'text-neutral-300'
                              : isUrgent
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.completed
                            ? 'Completed ✓'
                            : daysLeft === 0
                            ? 'Due Today'
                            : daysLeft === 1
                            ? 'Due Tomorrow'
                            : `Due in ${daysLeft}d (${item.dueDate})`}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-100 hover:text-cyan-300 transition line-clamp-2">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                          📁 {item.subjectName}
                        </span>
                      </div>

                      {item.presenterName && (
                        <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 font-mono">
                          Presenter: {item.presenterName} {item.rollNumber && `(${item.rollNumber})`}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-xs">
                      {/* Done Toggle */}
                      <button
                        onClick={(e) => handleToggleDone(item.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer border ${
                          item.completed
                            ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {item.completed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                            <span>Done ✓</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                            <span>Mark Done</span>
                          </>
                        )}
                      </button>

                      {/* AI Solver Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalItem(item);
                          setAiSolution('');
                          setReviewResult('');
                          setAssistantTab('ai_solver');
                        }}
                        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium text-xs cursor-pointer hover:underline"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Solve with AI →</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. ASSIGNMENT DETAIL & AI SOLVER MODAL */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                  <span>📁 {activeModalItem.subjectName}</span>
                  <span>·</span>
                  <span className="text-amber-300 font-medium">Due: {activeModalItem.dueDate}</span>
                </div>
                <h3 className="font-bold text-base md:text-lg text-slate-100">
                  {activeModalItem.title}
                </h3>
                {activeModalItem.presenterName && (
                  <div className="text-xs text-indigo-300 font-mono">
                    Presenter: {activeModalItem.presenterName} {activeModalItem.rollNumber && `(${activeModalItem.rollNumber})`}
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions (Done button + Instructions) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleToggleDone(activeModalItem.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-sm ${
                    activeModalItem.completed
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
                      : 'bg-neutral-100 hover:bg-white text-neutral-900 border-transparent'
                  }`}
                >
                  {activeModalItem.completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-neutral-300" />
                      <span>Completed ✓ (Click to Undo)</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mark Work as Done</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] text-slate-400 font-mono">
                  Assigned by {activeModalItem.assignedBy || 'Faculty'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <strong className="text-slate-300 block mb-0.5">Instructions & Requirements:</strong>
                {activeModalItem.instructions}
              </div>
            </div>

            {/* Assistant Tabs: AI Solver / Critique / Suggested Structure */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-xs">
                <button
                  onClick={() => setAssistantTab('ai_solver')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    assistantTab === 'ai_solver'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>⚡ AI Solver (Full-Mark Solution)</span>
                </button>

                <button
                  onClick={() => setAssistantTab('structure')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    assistantTab === 'structure'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Suggested Steps
                </button>

                <button
                  onClick={() => setAssistantTab('draft_critique')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    assistantTab === 'draft_critique'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Critique My Draft
                </button>
              </div>

              {/* Tab 1: AI Assignment Solver */}
              {assistantTab === 'ai_solver' && (
                <div className="space-y-3 animate-fade-in text-xs">
                  <input
                    type="text"
                    placeholder="Optional constraints (e.g. 'Use Python code', 'Include BCNF decomposition proof')..."
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />

                  <button
                    onClick={handleSolveWithAI}
                    disabled={isSolving}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className={`w-4 h-4 ${isSolving ? 'animate-spin' : ''}`} />
                    <span>{isSolving ? 'Generating University Full-Mark Answer...' : 'Generate Full-Credit Model Answer'}</span>
                  </button>

                  {aiSolution && (
                    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden space-y-2 animate-fade-in">
                      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          Academic Model Submission
                        </span>
                        <button
                          onClick={handleCopySolution}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                        >
                          {copiedSolution ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSolution ? 'Copied' : 'Copy Solution'}</span>
                        </button>
                      </div>

                      <div className="p-4 max-h-[400px] overflow-y-auto text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans select-text">
                        {aiSolution}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Suggested Structure */}
              {assistantTab === 'structure' && (
                <div className="space-y-2 animate-fade-in text-xs">
                  {activeModalItem.outlineSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5"
                    >
                      <span className="font-mono text-cyan-400 font-semibold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  {activeModalItem.sampleDraftGuidance && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 mt-2">
                      <strong className="text-slate-300">Teacher Guidance:</strong> {activeModalItem.sampleDraftGuidance}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Critique Draft */}
              {assistantTab === 'draft_critique' && (
                <div className="space-y-3 animate-fade-in text-xs">
                  <textarea
                    rows={4}
                    placeholder="Paste your rough draft or code snippet here for feedback..."
                    value={studentDraft}
                    onChange={(e) => setStudentDraft(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none font-sans"
                  />
                  <button
                    onClick={() => {
                      if (!studentDraft.trim()) return;
                      setIsReviewing(true);
                      setTimeout(() => {
                        setReviewResult(
                          `Academic Critique for "${activeModalItem.title}":\n\n1. Strengths: The architectural outline is correctly identified.\n2. Crucial Addition Needed: Add formal boundary conditions and cite the textbook reference.\n3. Scoring Tip: Provide a complete test case or schema verification to maximize internal marks.`
                        );
                        setIsReviewing(false);
                      }, 500);
                    }}
                    disabled={isReviewing || !studentDraft.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isReviewing ? 'Analyzing Draft...' : 'Critique My Draft'}</span>
                  </button>

                  {reviewResult && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed animate-fade-in">
                      {reviewResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD WORK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-base">Add New Assignment or PPT</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Work Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('assignment')}
                    className={`py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      newType === 'assignment'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    📝 Written Assignment
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('ppt_presentation')}
                    className={`py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      newType === 'ppt_presentation'
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🎤 PPT Presentation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Subject Folder *</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      📁 {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normalization to 3NF & BCNF or Deadlock Avoidance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Submission Due Date *</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {newType === 'ppt_presentation' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Presenter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Aman Kumar & Team"
                      value={newPresenter}
                      onChange={(e) => setNewPresenter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Roll Numbers</label>
                    <input
                      type="text"
                      placeholder="e.g. Roll 101-105"
                      value={newRollNo}
                      onChange={(e) => setNewRollNo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Teacher instructions, requirements, number of slides..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer shadow-sm"
                >
                  Save & Broadcast to Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CR (CLASS REPRESENTATIVE) 1-CLICK SYNC MODAL */}
      {isCRPortalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-indigo-500/40 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-semibold text-base">Class Representative (CR) Portal</h3>
                  <p className="text-xs text-slate-400">1-Click Synchronization with Whole Class</p>
                </div>
              </div>
              <button
                onClick={() => setIsCRPortalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {crSyncSuccess ? (
              <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-center space-y-2 animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="font-semibold text-base">{crSyncSuccess}</h4>
                <p className="text-xs text-neutral-400">
                  Notification and class announcement broadcasted to every student in cohort.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 leading-relaxed space-y-1">
                  <strong>How it works:</strong> As the CR, paste or load the teacher's official PPT order and assignment deadlines below. In <strong>one single click</strong>, it will sync with every student in the class and post a cohort notice.
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">
                      Paste Presentation Order / Classwork Lines:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setCrRosterText(
                          `Roll 101 - Aman Kumar & Team - Banker Algorithm & Coffman Conditions - 2026-10-22\nRoll 106 - Priya Singh & Team - B+ Tree vs B-Tree Indexing in MySQL - 2026-10-25\nRoll 111 - Rahul Sharma - Two-Phase Locking & Serializability - 2026-10-28`
                        )
                      }
                      className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      Load Sample Schedule
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Format: [Roll & Name] - [Presentation Topic] - [Due Date YYYY-MM-DD]&#10;Example:&#10;Roll 101-105 - Banker Algorithm Simulation - 2026-10-22&#10;Roll 106-110 - 3NF and BCNF Normalization - 2026-10-25"
                    value={crRosterText}
                    onChange={(e) => setCrRosterText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Leave empty to automatically load the standard faculty roster.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCRPortalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCRSync}
                    disabled={isSyncingCR}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSyncingCR ? 'Broadcasting to Class...' : 'Sync with Whole Class (1-Click)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
