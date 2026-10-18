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
import { getDefaultSubjectsForClass } from '../utils/classManager';

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

  // Available Subjects fallback for semester
  const availableSubjects = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return getDefaultSubjectsForClass('BCA-2028', 1);
  }, [subjects]);

  // New Assignment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newType, setNewType] = useState<ClassworkType>('assignment');
  const [newInstructions, setNewInstructions] = useState('');
  const [newPresenter, setNewPresenter] = useState('');
  const [newRollNo, setNewRollNo] = useState('');

  // Auto-set default subject & due date when add modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      if (!newDueDate) {
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        setNewDueDate(nextWeek);
      }
      if (!newSubject) {
        setNewSubject(selectedFolder !== 'all' ? selectedFolder : (availableSubjects[0]?.name || 'General'));
      }
    }
  }, [isAddModalOpen, newDueDate, newSubject, selectedFolder, availableSubjects]);

  // CR Portal Modal
  const [isCRPortalOpen, setIsCRPortalOpen] = useState(false);
  const [crRosterText, setCrRosterText] = useState('');
  const [isSyncingCR, setIsSyncingCR] = useState(false);
  const [crSyncSuccess, setCrSyncSuccess] = useState('');

  // Sync props changes
  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  // Handle Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModalItem) setActiveModalItem(null);
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isCRPortalOpen) setIsCRPortalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalItem, isAddModalOpen, isCRPortalOpen]);

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
    const effectiveTitle = newTitle.trim();
    if (!effectiveTitle) return;

    const effectiveDate = newDueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const effectiveSubject = newSubject || availableSubjects[0]?.name || 'General';
    const targetSub = availableSubjects.find((s) => s.name === effectiveSubject);

    const localItem: AcademicAssignment = {
      id: `asgn-${Date.now()}`,
      classId: 'class-bca',
      title: effectiveTitle,
      subjectName: effectiveSubject,
      subjectId: targetSub?.id || 'sub-general',
      dueDate: effectiveDate,
      type: newType,
      instructions: newInstructions.trim() || 'Complete according to course guidelines.',
      integrityMode: 'teach_me',
      outlineSteps: ['Review requirements', 'Draft responses with key definitions', 'Finalize submission'],
      keyReferences: ['Prescribed Syllabus & Course Notes'],
      assignedBy: 'Faculty / Class Cohort',
      presenterName: newPresenter.trim() || undefined,
      rollNumber: newRollNo.trim() || undefined,
      completed: false,
    };

    const updated = [localItem, ...assignments];
    setAssignments(updated);
    if (onUpdateAssignments) onUpdateAssignments(updated);

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewInstructions('');
    setNewDueDate('');
    setNewPresenter('');
    setNewRollNo('');

    try {
      fetch('/api/assignments/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localItem),
      }).catch(() => {});
    } catch {
      // offline safe
    }
  };

  // CR 1-Click Classwide Sync
  const handleCRSync = async () => {
    setIsSyncingCR(true);
    setCrSyncSuccess('');

    const lines = crRosterText.split('\n').filter((l) => l.trim().length > 0);
    const parsedItems: Partial<AcademicAssignment>[] = [];

    if (lines.length === 0) {
      alert('Please enter at least one presentation line (e.g. Roll 101 - Presentation Topic - 2026-10-25)');
      setIsSyncingCR(false);
      return;
    }

    const defaultSubject = subjects[0]?.name || 'General';
    const defaultSubjectId = subjects[0]?.id || 'sub-gen';

    lines.forEach((line, idx) => {
      const parts = line.split('-').map((p) => p.trim());
      const rollAndName = parts[0] || `Roll ${idx + 101}`;
      const topic = parts[1] || 'Syllabus Presentation Topic';
      const date = parts[2] || new Date(Date.now() + (idx + 2) * 86400000).toISOString().slice(0, 10);

      parsedItems.push({
        id: `cr-ppt-${Date.now()}-${idx}`,
        title: `PPT Presentation: ${topic}`,
        type: 'ppt_presentation',
        subjectName: newSubject || defaultSubject,
        subjectId: defaultSubjectId,
        dueDate: date,
        presenterName: rollAndName,
        rollNumber: rollAndName.split(' ')[1] || `Roll ${idx + 101}`,
        instructions: `Formal 10-slide PowerPoint presentation on ${topic}. Ensure diagrams and practical examples are included.`,
        assignedBy: 'Class Representative (CR Official Roster)',
        completed: false,
      });
    });

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

  // Auto-load pre-cached solution when modal opens
  useEffect(() => {
    if (activeModalItem) {
      const existing = activeModalItem.solution || activeModalItem.aiSolvedAnswer || '';
      setAiSolution(existing);
      setStudentNotes('');
      setStudentDraft('');
      setReviewResult('');
    }
  }, [activeModalItem]);

  // AI Assignment Solver (Zero-Token Cache & Synchronized across all devices)
  const handleSolveWithAI = async (forceRegenerate = false) => {
    if (!activeModalItem) return;
    setIsSolving(true);
    if (forceRegenerate) {
      setAiSolution('');
    }

    try {
      const res = await fetch('/api/assignments/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: activeModalItem.id,
          assignmentTitle: activeModalItem.title,
          subjectName: activeModalItem.subjectName,
          instructions: activeModalItem.instructions,
          studentNotes: studentNotes.trim() || undefined,
          forceRegenerate,
          ...getAiRequestPayload(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSolution(data.answer);

        // Update local item and list so it's permanently cached in this session
        const updatedItem: AcademicAssignment = {
          ...activeModalItem,
          solution: data.answer,
          aiSolvedAnswer: data.answer,
          solvedBy: data.solvedBy || 'Class AI Model (Auto-Cached)',
          solvedAt: data.solvedAt || new Date().toISOString(),
        };
        setActiveModalItem(updatedItem);
        const updatedList = assignments.map((a) => (a.id === updatedItem.id ? updatedItem : a));
        setAssignments(updatedList);
        if (onUpdateAssignments) onUpdateAssignments(updatedList);
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
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
            Assignments
          </h1>
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
            placeholder="Search assignments..."
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
            {subjectFolders.length === 0 ? (
              <div className="col-span-full py-10 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center space-y-3">
                <Folder className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-xs font-semibold text-slate-300">No coursework or assignments yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add your first class assignment, lab task, or presentation roster to track deadlines and generate AI guides.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Assignment</span>
                </button>
              </div>
            ) : (
              subjectFolders.map((folder) => {
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
            }))}
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
                      <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-mono px-2 py-0.5 rounded border ${
                              item.type === 'ppt_presentation'
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {item.type === 'ppt_presentation' ? '🎤 PPT Presentation' : '📝 Written Assignment'}
                          </span>

                          {(item.solution || item.aiSolvedAnswer) && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Solved (0 Tokens)</span>
                            </span>
                          )}
                        </div>

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
                          setReviewResult('');
                          setAssistantTab('ai_solver');
                        }}
                        className={`flex items-center gap-1.5 font-medium text-xs cursor-pointer hover:underline ${
                          item.solution || item.aiSolvedAnswer
                            ? 'text-emerald-400 hover:text-emerald-300 font-semibold'
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {item.solution || item.aiSolvedAnswer
                            ? '⚡ View Solution (0 Tokens) →'
                            : 'Solve with AI →'}
                        </span>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in cursor-pointer"
          onClick={() => setActiveModalItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Assignment Details Modal"
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8 space-y-5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
                  {/* Zero-Token Model Solution Banner */}
                  {aiSolution ? (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-emerald-200">
                            ⚡ Class Model Answer Synced (0 Tokens Consumed)
                          </div>
                          <div className="text-[11px] text-emerald-400/80">
                            Solved once & cached for all students across mobile, tablet & desktop.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSolveWithAI(true)}
                        disabled={isSolving}
                        className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition cursor-pointer shrink-0"
                      >
                        Re-solve
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-slate-300">
                      <div className="font-medium text-cyan-300 mb-0.5">
                        💡 Solve once for the whole class
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Generating this answer will save it to the shared classroom cache so no classmate burns extra tokens!
                      </div>
                    </div>
                  )}

                  {!aiSolution && (
                    <>
                      <input
                        type="text"
                        placeholder="Optional constraints (e.g. 'Use Python code', 'Include BCNF decomposition proof')..."
                        value={studentNotes}
                        onChange={(e) => setStudentNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />

                      <button
                        onClick={() => handleSolveWithAI(false)}
                        disabled={isSolving}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-cyan-500/30 hover:border-cyan-400/50 ring-1 ring-cyan-500/15 shadow-[0_0_12px_-3px_rgba(6,182,212,0.15)] text-xs font-medium transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Sparkles className={`w-4 h-4 text-cyan-400 ${isSolving ? 'animate-spin' : ''}`} />
                        <span>{isSolving ? 'Generating Answer...' : 'Generate Model Answer'}</span>
                      </button>
                    </>
                  )}

                  {aiSolution && (
                    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden space-y-2 animate-fade-in">
                      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          Academic Model Submission (Verified Solution)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopySolution}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            {copiedSolution ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSolution ? 'Copied' : 'Copy Solution'}</span>
                          </button>
                        </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Add Assignment or Presentation Modal"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                  <Plus className="w-4 h-4 text-slate-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-white">
                    {newType === 'assignment' ? 'Add Written Assignment' : 'Add PPT Presentation'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Track submission deadline for your semester
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-0.5">
              {/* Work Type Segmented Switcher */}
              <div>
                <label className="block text-slate-300 font-medium text-[11px] mb-1.5">
                  Coursework Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setNewType('assignment')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      newType === 'assignment'
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span>📝 Written Assignment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('ppt_presentation')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      newType === 'ppt_presentation'
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span>🎤 PPT Presentation</span>
                  </button>
                </div>
              </div>

              {/* Target Subject Folder */}
              <div>
                <label className="block text-slate-300 font-medium text-[11px] mb-1">
                  Subject *
                </label>
                <select
                  value={newSubject || availableSubjects[0]?.name || ''}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition cursor-pointer"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-300 font-medium text-[11px] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newType === 'assignment'
                      ? 'e.g. Unit 2: Pointers and Memory Allocation in C'
                      : 'e.g. Seminar on Cloud Virtualization & Containers'
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-slate-300 font-medium text-[11px] mb-1">
                  Submission Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none transition [color-scheme:dark]"
                />
              </div>

              {/* Presenter Name & Roll Number (for PPT) */}
              {newType === 'ppt_presentation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in">
                  <div>
                    <label className="block text-slate-300 font-medium text-[11px] mb-1">
                      Presenter / Student Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newPresenter}
                      onChange={(e) => setNewPresenter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium text-[11px] mb-1">
                      University Roll No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BCA-28-042"
                      value={newRollNo}
                      onChange={(e) => setNewRollNo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono placeholder:text-slate-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div>
                <label className="block text-slate-300 font-medium text-[11px] mb-1">
                  Instructions / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Teacher instructions, requirements, slide count..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none resize-none transition"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {newType === 'assignment' ? 'Save Assignment' : 'Save Presentation'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CR (CLASS REPRESENTATIVE) 1-CLICK SYNC MODAL */}
      {isCRPortalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
          onClick={() => setIsCRPortalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Class Representative Portal Modal"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-indigo-500/40 p-6 shadow-2xl text-slate-100 space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Paste Presentation Order / Classwork Lines:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Format: [Roll & Name] - [Topic] - [Due Date YYYY-MM-DD]&#10;Example:&#10;Roll 101-105 - Banker Algorithm Simulation - 2026-10-22&#10;Roll 106-110 - 3NF and BCNF Normalization - 2026-10-25"
                    value={crRosterText}
                    onChange={(e) => setCrRosterText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700 resize-none leading-relaxed"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Enter one presentation slot per line.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCRPortalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCRSync}
                    disabled={isSyncingCR}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSyncingCR ? 'Syncing...' : 'Sync with Class'}</span>
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
