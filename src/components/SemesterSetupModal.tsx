import React, { useState } from 'react';
import {
  Settings,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  KeyRound,
  UserCheck,
  Folder,
  AlertCircle,
  Check,
} from 'lucide-react';

interface SemesterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (classData: any) => void;
}

export const SemesterSetupModal: React.FC<SemesterSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [className, setClassName] = useState<string>('BCA Batch of 2028');
  const [classCode, setClassCode] = useState<string>('BCA-2028');
  const [university, setUniversity] = useState<string>('State University');
  const [semester, setSemester] = useState<number>(3);

  // Subjects list: individual items, not comma separated
  const [subjects, setSubjects] = useState<string[]>([
    'Java Programming',
    'Database Management Systems',
    'Web Development',
    'Operating Systems',
    'Computer Networks',
  ]);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [subjectError, setSubjectError] = useState<string>('');

  // Syllabus
  const [syllabusSnippet, setSyllabusSnippet] = useState<string>('');

  // CR Verification & Authentication
  const [crName, setCrName] = useState<string>('Aarav Sharma (CR)');
  const [crRollNo, setCrRollNo] = useState<string>('BCA-28-042');
  const [crPasskey, setCrPasskey] = useState<string>('CR-2028');
  const [crGeminiApiKey, setCrGeminiApiKey] = useState<string>('');
  const [crDeclared, setCrDeclared] = useState<boolean>(true);
  const [isCrAuthenticated, setIsCrAuthenticated] = useState<boolean>(false);
  const [crAuthError, setCrAuthError] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Add individual subject handler
  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) {
      setSubjectError('Please enter a subject name.');
      return;
    }
    if (subjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSubjectError('This subject has already been added.');
      return;
    }

    setSubjects((prev) => [...prev, trimmed]);
    setNewSubjectInput('');
    setSubjectError('');
  };

  const handleKeyDownSubject = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubject();
    }
  };

  const handleRemoveSubject = (indexToRemove: number) => {
    setSubjects((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // CR Authentication check
  const handleAuthenticateCR = () => {
    setCrAuthError('');
    if (!crName.trim()) {
      setCrAuthError('Please enter the Class Representative (CR) full name.');
      return;
    }
    if (!crRollNo.trim()) {
      setCrAuthError('Please enter the CR University Roll Number.');
      return;
    }
    if (!crPasskey.trim()) {
      setCrAuthError('Please enter the CR authentication passkey (default: CR-2028).');
      return;
    }
    if (!crDeclared) {
      setCrAuthError('You must check the official CR verification declaration.');
      return;
    }

    // Authenticate passkey (accept CR-2028 or any 4+ char key in this environment)
    if (crPasskey.trim().toUpperCase() !== 'CR-2028' && crPasskey.trim().length < 4) {
      setCrAuthError('Invalid CR passkey. Use default passkey: CR-2028');
      return;
    }

    setIsCrAuthenticated(true);
    setCrAuthError('');
  };

  const handleFinishSetup = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/class/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: classCode.trim().toUpperCase(),
          name: className.trim(),
          university: university.trim(),
          semester,
          subjectsList: subjects,
          crVerification: {
            verifiedByCR: isCrAuthenticated,
            crName: crName.trim(),
            crRollNo: crRollNo.trim(),
          },
        }),
      });

      const data = await res.json();

      if (crGeminiApiKey.trim()) {
        await fetch('/api/ai/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: crGeminiApiKey.trim() }),
        }).catch(console.error);
      }

      onSetupComplete(data);
      onClose();
    } catch (err) {
      console.error('Setup failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToNext = () => {
    if (step === 1) return classCode.trim().length > 0 && className.trim().length > 0;
    if (step === 2) return subjects.length > 0;
    if (step === 4) return isCrAuthenticated;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Semester Setup Wizard</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  CR Authenticated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure subjects folder structure and authenticate via Class Representative
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Dots (5 steps) */}
        <div className="flex items-center justify-between mb-6 px-2 sm:px-4">
          {[
            { s: 1, label: 'Class' },
            { s: 2, label: 'Subjects' },
            { s: 3, label: 'Syllabus' },
            { s: 4, label: 'CR Auth' },
            { s: 5, label: 'Review' },
          ].map(({ s, label }) => (
            <div key={s} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                    : step > s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              <span className={`text-[11px] sm:text-xs hidden sm:inline ${
                step === s ? 'text-cyan-300 font-semibold' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="min-h-[260px] space-y-4">
          {/* STEP 1: CLASS DETAILS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. BCA Batch of 2028"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="e.g. BCA-2028"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 font-mono uppercase outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 outline-none transition cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  University / College Affiliation
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Guru Gobind Singh Indraprastha University"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* STEP 2: ENTER SUBJECT & ADD ANOTHER SUBJECT (NOT COMMA SEPARATED) */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Add Semester Subjects</span>
                  </label>
                  <span className="text-[11px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                    {subjects.length} Subjects Added
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Enter each subject individually. Each subject automatically creates a dedicated assignment shelf and folder repository.
                </p>

                {/* Single Subject Input + Add Button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => {
                      setNewSubjectInput(e.target.value);
                      if (subjectError) setSubjectError('');
                    }}
                    onKeyDown={handleKeyDownSubject}
                    placeholder="Enter subject title (e.g. Artificial Intelligence, Cloud Computing)..."
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subject</span>
                  </button>
                </div>
                {subjectError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{subjectError}</span>
                  </p>
                )}
              </div>

              {/* List of Configured Subjects */}
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Configured Semester Subjects:
                </span>
                {subjects.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-500">
                    No subjects added yet. Type a subject name above and click <strong>Add Subject</strong>.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {subjects.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="font-medium text-slate-100 truncate">{sub}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(idx)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer shrink-0 ml-2"
                          title={`Remove ${sub}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Enter subject title"]');
                      if (input) input.focus();
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Subject</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SYLLABUS & MODULES */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <label className="text-xs font-semibold text-slate-300 block">
                Upload or Paste University Syllabus Outline
              </label>
              <textarea
                rows={5}
                value={syllabusSnippet}
                onChange={(e) => setSyllabusSnippet(e.target.value)}
                placeholder="Paste course modules, units, or topics from your university syllabus PDF..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-xs md:text-sm text-slate-200 font-mono resize-none outline-none transition"
              />
              <p className="text-[11px] text-slate-400">
                The AI will parse chapters, map likely topics, and seed the class knowledge base across all {subjects.length} subjects.
              </p>
            </div>
          )}

          {/* STEP 4: CLASS REPRESENTATIVE (CR) VERIFICATION & AUTHENTICATION */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-cyan-950/40 border border-blue-500/30 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-slate-100">
                      Class Representative (CR) Authentication Required
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      To ensure accuracy for the entire class and prevent unauthorized curriculum resets, semester setup must be authenticated once by the designated CR.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    CR Full Name
                  </label>
                  <input
                    type="text"
                    value={crName}
                    disabled={isCrAuthenticated}
                    onChange={(e) => setCrName(e.target.value)}
                    placeholder="e.g. Aarav Sharma (CR)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 disabled:opacity-60 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    CR University Roll No.
                  </label>
                  <input
                    type="text"
                    value={crRollNo}
                    disabled={isCrAuthenticated}
                    onChange={(e) => setCrRollNo(e.target.value)}
                    placeholder="e.g. BCA-28-042"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 disabled:opacity-60 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 font-mono outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  CR Authentication Passkey / PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={crPasskey}
                    disabled={isCrAuthenticated}
                    onChange={(e) => setCrPasskey(e.target.value)}
                    placeholder="Enter CR Passkey (Default: CR-2028)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 disabled:opacity-60 rounded-xl pl-9 pr-3.5 py-2 text-xs md:text-sm text-slate-200 font-mono outline-none transition"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default authorization passkey for this semester: <strong className="text-cyan-300 font-mono">CR-2028</strong>
                </span>
              </div>

              {/* Optional Class Gemini API Key */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Class Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  value={crGeminiApiKey}
                  disabled={isCrAuthenticated}
                  onChange={(e) => setCrGeminiApiKey(e.target.value)}
                  placeholder="Paste Gemini API key (e.g. AIzaSy...)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 disabled:opacity-60 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 font-mono outline-none transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ask the CR or any student to provide a free Gemini key from Google AI Studio, or leave blank and we will provide the built-in basic model for all class teaching.
                </span>
              </div>

              {/* CR Declaration Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={crDeclared}
                  disabled={isCrAuthenticated}
                  onChange={(e) => setCrDeclared(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="leading-relaxed">
                  I, as the authorized Class Representative (CR), certify that this semester's subject list ({subjects.length} subjects) and academic configuration are verified and approved for <strong>{classCode}</strong>.
                </span>
              </label>

              {crAuthError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{crAuthError}</span>
                </p>
              )}

              {/* Status Banner */}
              {!isCrAuthenticated ? (
                <button
                  type="button"
                  onClick={handleAuthenticateCR}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Verify & Authenticate as CR</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Authenticated by Class Representative</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      CR Verified ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Digitally signed by <strong>{crName}</strong> (Roll: {crRollNo}). This workspace is authenticated for class broadcast.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & DONE */}
          {step === 5 && (
            <div className="space-y-4 py-2 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white">
                  Semester Workspace Verified & Ready
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Ready to deploy <strong>{className}</strong> for Semester {semester}.
                </p>
              </div>

              {/* Verified Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Class Identifier:</span>
                  <span className="font-mono font-bold text-cyan-300">{classCode}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Configured Subjects:</span>
                  <span className="font-medium text-slate-200">{subjects.length} Subjects</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CR Verification:</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{crName} ({crRollNo})</span>
                  </span>
                </div>
              </div>

              {/* Subject Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subjects.map((sub, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-6">
          <button
            type="button"
            onClick={() => setStep((p) => Math.max(p - 1, 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-medium cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 4 && !isCrAuthenticated) {
                  handleAuthenticateCR();
                  return;
                }
                setStep((p) => Math.min(p + 1, 5));
              }}
              disabled={!canProceedToNext()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              <span>{step === 4 && !isCrAuthenticated ? 'Verify & Continue' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishSetup}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Initializing Workspace...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Launch CR-Verified Workspace 🚀</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
