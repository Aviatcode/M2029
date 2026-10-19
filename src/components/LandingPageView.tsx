import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Mail,
  User as UserIcon,
  Hash,
  LogIn,
  UserPlus,
  Users,
  CheckCircle2,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { UserProfile } from './LoginModal';
import { UserRole, ClassWorkspace, Subject } from '../types';
import {
  getDefaultSubjectsForClass,
  saveClassLocally,
  getSavedClass,
} from '../utils/classManager';

interface LandingPageViewProps {
  currentUser: UserProfile;
  classCode: string;
  onEnterWorkspace: (
    profile: UserProfile,
    classData?: { workspace: ClassWorkspace; subjects: Subject[] }
  ) => void;
  onGoToDashboard: () => void;
  onShowInvite?: (classCode: string, className: string) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  currentUser,
  classCode,
  onEnterWorkspace,
  onGoToDashboard,
  onShowInvite,
}) => {
  // Google Classroom-style Modes: 'join' (default) or 'create' (1st person setup)
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const [name, setName] = useState(currentUser.isLoggedIn ? currentUser.name : '');
  const [email, setEmail] = useState(currentUser.isLoggedIn ? currentUser.email : '');

  // Detect URL class code
  const [urlDetectedCode, setUrlDetectedCode] = useState<string>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qCode = searchParams.get('class') || searchParams.get('code');
      if (qCode) return qCode.trim().toUpperCase();
      const hash = window.location.hash;
      const hashMatch = hash.match(/class=([a-zA-Z0-9_-]+)/i) || hash.match(/code=([a-zA-Z0-9_-]+)/i);
      if (hashMatch) return hashMatch[1].trim().toUpperCase();
    } catch {}
    return '';
  });

  const [joinCodeInput, setJoinCodeInput] = useState<string>(() => {
    return urlDetectedCode || classCode || 'BCA-2028';
  });

  // Create Mode States
  const [newClassName, setNewClassName] = useState('BCA 2028');
  const [newSemester, setNewSemester] = useState(1);
  const [generatedCode, setGeneratedCode] = useState('BCA-2028');
  const [formError, setFormError] = useState('');

  // Auto-generate code when class name changes
  useEffect(() => {
    if (mode === 'create') {
      const prefix = newClassName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'BCA';
      setGeneratedCode(`${prefix}-${newSemester}01`);
    }
  }, [newClassName, newSemester, mode]);

  const handleRegenerateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = newClassName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'BCA';
    setGeneratedCode(`${prefix}-${rand}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid student email.');
      return;
    }

    if (mode === 'join') {
      const targetCode = joinCodeInput.trim().toUpperCase();
      if (!targetCode) {
        setFormError('Please enter the Class Code (e.g. BCA-2028).');
        return;
      }

      // Check if existing class data exists or initialize for this code
      const existing = getSavedClass(targetCode);
      const workspace: ClassWorkspace = existing?.workspace || {
        id: `class-${targetCode.toLowerCase()}`,
        code: targetCode,
        name: `${targetCode} Class Workspace`,
        university: 'Affiliated University',
        semester: 1,
        academicYear: '2026-2027',
        memberCount: 2,
        adminId: 'user-admin',
      };
      const subjects: Subject[] = existing && Array.isArray(existing.subjects)
        ? existing.subjects
        : getDefaultSubjectsForClass(targetCode, 1);

      saveClassLocally(workspace, subjects);

      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        rollNumber: `${targetCode}-${Math.floor(100 + Math.random() * 900)}`,
        role: 'student',
        classCode: targetCode,
        isLoggedIn: true,
      };

      onEnterWorkspace(profile, { workspace, subjects });
    } else {
      // CREATE MODE (1st Person / Admin Setup)
      const finalCode = (generatedCode || 'BCA-2028').trim().toUpperCase();
      const finalName = newClassName.trim() || `${finalCode} Batch`;
      const subjects = getDefaultSubjectsForClass(finalCode, newSemester);

      const workspace: ClassWorkspace = {
        id: `class-${Date.now()}`,
        code: finalCode,
        name: finalName,
        university: 'Affiliated University',
        semester: newSemester,
        academicYear: '2026-2027',
        memberCount: 1,
        adminId: 'user-admin-self',
        verifiedByCR: true,
        crName: cleanName,
        crRollNo: `${finalCode}-CR-01`,
        crVerifiedAt: new Date().toISOString(),
      };

      saveClassLocally(workspace, subjects);

      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        rollNumber: `${finalCode}-CR-01`,
        role: 'cr',
        classCode: finalCode,
        isLoggedIn: true,
      };

      onEnterWorkspace(profile, { workspace, subjects });
      if (onShowInvite) {
        setTimeout(() => onShowInvite(finalCode, finalName), 300);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background Graphic */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-15 bg-repeat"
        style={{
          backgroundImage: "url('/college-doodles-bg.jpg')",
          backgroundSize: '800px auto',
        }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/90 to-neutral-950"
        aria-hidden="true"
      />

      {/* Top Header */}
      <header className="relative z-20 border-b border-neutral-850/60 bg-neutral-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="./am-logo.png"
            alt="AM Logo"
            className="w-7 h-7 rounded-lg shrink-0 object-contain shadow-xs border border-neutral-800"
          />
          <span className="font-semibold text-sm tracking-tight text-white">M2029</span>
        </div>

        <div>
          {currentUser.isLoggedIn && (
            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs transition cursor-pointer"
            >
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Hero & Form Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-xl mx-auto w-full">
        <div className="text-center space-y-2 mb-6 flex flex-col items-center">
          <img
            src="./am-logo.png"
            alt="AM Logo"
            className="w-12 h-12 rounded-2xl object-contain shadow-lg mb-1 border border-neutral-800"
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Classroom Study Workspace
          </h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {mode === 'join'
              ? 'Enter your class code to join notes, timetable & mindmaps.'
              : 'Configure your semester once, get a code, and invite your batch.'}
          </p>
        </div>

        {/* Clean Google Classroom Card */}
        <div className="w-full rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-neutral-800/80 p-5 sm:p-6 shadow-2xl relative space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition cursor-pointer ${
                mode === 'join'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Join with Code</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition cursor-pointer ${
                mode === 'create'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
              <span>Create Class (1st Person)</span>
            </button>
          </div>

          {/* URL Invite Detected Alert */}
          {urlDetectedCode && mode === 'join' && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Class invite link detected: <strong>{urlDetectedCode}</strong></span>
            </div>
          )}

          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-neutral-500" />
                <span>Your Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name (e.g. Rahul Sharma)"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                <Mail className="w-3 h-3 text-neutral-500" />
                <span>Student Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-mono"
              />
            </div>

            {/* JOIN MODE FIELDS */}
            {mode === 'join' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-neutral-500" />
                    <span>Class Code</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">From invite message</span>
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. BCA-2028"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-sm font-mono uppercase tracking-widest font-bold"
                />
              </div>
            )}

            {/* CREATE MODE FIELDS (1st Person) */}
            {mode === 'create' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">
                      Class / Batch Name
                    </label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g. BCA 2028"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">
                      Semester
                    </label>
                    <select
                      value={newSemester}
                      onChange={(e) => setNewSemester(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-500 transition text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Generated Code Preview */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase block">
                      Generated Class Code
                    </span>
                    <span className="text-base font-bold font-mono text-white tracking-widest block mt-0.5">
                      {generatedCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs flex items-center gap-1 cursor-pointer transition"
                    title="Generate different code"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>
                  {mode === 'join' ? 'Join Class Workspace' : 'Create Class & Get Invite Code'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-850/60 bg-neutral-950/70 py-3.5 px-4 sm:px-8 text-center text-[11px] text-neutral-500 font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="./am-logo.png" alt="AM" className="w-3.5 h-3.5 rounded object-contain border border-neutral-800" />
          <span>M2029</span>
        </div>
        <div>
          <span>Google Classroom Model · Free & Offline Ready</span>
        </div>
      </footer>
    </div>
  );
};
