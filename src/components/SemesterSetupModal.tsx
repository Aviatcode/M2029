import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  RefreshCw,
  Folder,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import {
  RECOMMENDED_BCA_SEM1_SUBJECTS,
  saveClassLocally,
  getDefaultSubjectsForClass,
} from '../utils/classManager';
import { ClassWorkspace, Subject } from '../types';

interface SemesterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (classData: any) => void;
  initialWorkspace?: ClassWorkspace;
  initialSubjects?: Subject[];
}

export const SemesterSetupModal: React.FC<SemesterSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
  initialWorkspace,
  initialSubjects,
}) => {
  const [className, setClassName] = useState<string>('BCA 2028');
  const [classCode, setClassCode] = useState<string>('BCA-2028');
  const [semester, setSemester] = useState<number>(1);
  const [university, setUniversity] = useState<string>('Affiliated University');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [subjectError, setSubjectError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      if (initialWorkspace) {
        setClassName(initialWorkspace.name || 'BCA 2028');
        setClassCode(initialWorkspace.code || 'BCA-2028');
        setSemester(initialWorkspace.semester || 1);
        setUniversity(initialWorkspace.university || 'Affiliated University');
      }
      if (initialSubjects !== undefined && Array.isArray(initialSubjects)) {
        setSubjects(initialSubjects.map((s) => s.name));
      } else {
        setSubjects(RECOMMENDED_BCA_SEM1_SUBJECTS);
      }
      setSubjectError('');
      setNewSubjectInput('');
    }
  }, [isOpen, initialWorkspace, initialSubjects]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const generateRandomClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const cleanPrefix =
      className
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'BCA';
    setClassCode(`${cleanPrefix}-${rand}`);
  };

  const handleAddSubject = () => {
    const raw = newSubjectInput.trim();
    if (!raw) {
      setSubjectError('Please enter a subject name');
      return;
    }
    // Allow single subject or comma-separated subjects with no min/max restrictions
    const parts = raw
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) {
      setSubjectError('Please enter a valid subject name');
      return;
    }

    const currentNames = new Set(subjects.map((s) => s.toLowerCase()));
    const toAdd: string[] = [];
    const duplicates: string[] = [];

    for (const part of parts) {
      if (currentNames.has(part.toLowerCase())) {
        duplicates.push(part);
      } else {
        currentNames.add(part.toLowerCase());
        toAdd.push(part);
      }
    }

    if (toAdd.length === 0 && duplicates.length > 0) {
      setSubjectError(`Already in list: ${duplicates.join(', ')}`);
      return;
    }

    setSubjects((prev) => [...prev, ...toAdd]);
    setNewSubjectInput('');
    if (duplicates.length > 0) {
      setSubjectError(`Added ${toAdd.length} subject(s). Ignored duplicates: ${duplicates.join(', ')}`);
    } else {
      setSubjectError('');
    }
  };

  const handleKeyDownSubject = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubject();
    }
  };

  const handleRemoveSubject = (idxToRemove: number) => {
    setSubjects((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleLoadRecommended = () => {
    setSubjects(RECOMMENDED_BCA_SEM1_SUBJECTS);
    setSubjectError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalCode = (classCode.trim() || 'BCA-2028').toUpperCase();
    const finalName = className.trim() || `${finalCode} Semester ${semester}`;
    // No minimum or maximum subjects mandated: preserves 0 subjects, 1 subject, or any number of subjects
    const subjectNames = subjects;

    const defaultColors = [
      'from-blue-500 to-indigo-600',
      'from-slate-700 to-zinc-700',
      'from-amber-500 to-orange-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-cyan-500 to-blue-600',
      'from-rose-500 to-red-600',
      'from-violet-500 to-purple-600',
    ];

    const localSubjects: Subject[] = subjectNames.map((name, idx) => ({
      id: `sub-${finalCode.toLowerCase()}-${idx + 1}`,
      classId: `class-${finalCode.toLowerCase()}`,
      name,
      code: `SUB-${semester}0${idx + 1}`,
      teacherName: 'Faculty In-Charge',
      credits: 4,
      color: defaultColors[idx % defaultColors.length],
      totalUnits: 4,
      completedTopicsCount: 0,
      totalTopicsCount: 10,
    }));

    const localWorkspace: ClassWorkspace = {
      id: `class-${finalCode.toLowerCase()}`,
      code: finalCode,
      name: finalName,
      university: university.trim() || 'Affiliated University',
      semester,
      academicYear: '2026-2027',
      memberCount: 1,
      adminId: 'user-admin-self',
      verifiedByCR: true,
      crName: 'Class Representative',
      crRollNo: 'CR-VERIFIED',
      crVerifiedAt: new Date().toISOString(),
    };

    saveClassLocally(localWorkspace, localSubjects);

    try {
      await fetch('/api/class/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: finalCode,
          name: finalName,
          university: university.trim(),
          semester,
          subjectsList: subjectNames,
        }),
      }).catch(() => {
        // Safe to ignore in offline / local mode
      });
    } catch {
      // Offline fallback
    }

    onSetupComplete({
      workspace: localWorkspace,
      subjects: localSubjects,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Configure Semester Subjects"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shadow-xs">
              <Sliders className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-white">
                Configure Semester & Subjects
              </h3>
              <p className="text-[11px] text-slate-400">
                Setup enrolled modules and class details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Class Name & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Class / Batch Name
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. BCA 2028"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-300">
                Class Code (Share with Classmates)
              </label>
              <button
                type="button"
                onClick={generateRandomClassCode}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition cursor-pointer"
                title="Generate new class code"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Generate New</span>
              </button>
            </div>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="e.g. BCA-2028"
              required
              className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase tracking-wider outline-none transition font-semibold"
            />
          </div>

          {/* Enrolled Subjects Section */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Enrolled Subjects ({subjects.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">· No min/max required</span>
              </label>
              <div className="flex items-center gap-2">
                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSubjects([])}
                    className="text-[11px] text-slate-400 hover:text-rose-400 font-medium transition cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLoadRecommended}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>+ Load BCA Defaults</span>
                </button>
              </div>
            </div>

            {/* Add Subject Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectInput}
                onChange={(e) => {
                  setNewSubjectInput(e.target.value);
                  if (subjectError) setSubjectError('');
                }}
                onKeyDown={handleKeyDownSubject}
                placeholder="Enter subject name or paste comma-separated list..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            {subjectError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{subjectError}</span>
              </p>
            )}

            {/* Subject List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {subjects.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-400 space-y-2">
                  <p className="text-xs">No subjects added yet. You can save without subjects or add any custom amount.</p>
                  <button
                    type="button"
                    onClick={handleLoadRecommended}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Load 5 Recommended BCA Sem 1 Subjects</span>
                  </button>
                </div>
              ) : (
                subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate">{sub}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer shrink-0 ml-2"
                      title={`Remove ${sub}`}
                      aria-label={`Remove ${sub}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Save & Update Setup</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
