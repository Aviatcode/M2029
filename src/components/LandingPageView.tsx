import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Mail,
  User as UserIcon,
  Hash,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { UserProfile } from './LoginModal';
import { UserRole } from '../types';

interface LandingPageViewProps {
  currentUser: UserProfile;
  classCode: string;
  onEnterWorkspace: (profile: UserProfile) => void;
  onGoToDashboard: () => void;
}

const POPULAR_CLASSES = [
  { code: 'BCA-2028', name: 'BCA 2028' },
  { code: 'BTECH-CS-2027', name: 'B.Tech 2027' },
  { code: 'MCA-2026', name: 'MCA 2026' },
];

const PRESET_PROFILES: Array<Omit<UserProfile, 'isLoggedIn'>> = [
  {
    id: 'user-cr-1',
    name: 'Aman Kumar',
    email: 'aman.cr@cs.university.edu',
    rollNumber: 'BCA-2028-042',
    role: 'cr',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    classCode: 'BCA-2028',
  },
  {
    id: 'user-stu-2',
    name: 'Rohan Verma',
    email: 'rohan.v@cs.university.edu',
    rollNumber: 'BCA-2028-018',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    classCode: 'BCA-2028',
  },
  {
    id: 'user-fac-3',
    name: 'Dr. Neha Verma',
    email: 'neha.verma@faculty.university.edu',
    rollNumber: 'FACULTY-CS-09',
    role: 'teacher',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    classCode: 'BCA-2028',
  },
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  currentUser,
  classCode,
  onEnterWorkspace,
  onGoToDashboard,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState(currentUser.isLoggedIn ? currentUser.name : '');
  const [email, setEmail] = useState(currentUser.isLoggedIn ? currentUser.email : '');
  const [selectedClassId, setSelectedClassId] = useState(classCode || 'BCA-2028');
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentUser.isLoggedIn ? (currentUser.role as UserRole) : 'student'
  );
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = email.trim();
    const cleanClassId = selectedClassId.trim().toUpperCase();
    const cleanName = authMode === 'signup' ? name.trim() : (name.trim() || cleanEmail.split('@')[0]);

    if (authMode === 'signup' && !cleanName) {
      setFormError('Please enter your name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email.');
      return;
    }

    if (!cleanClassId) {
      setFormError('Please specify a Class ID (e.g. BCA-2028).');
      return;
    }

    const generatedRollNo = `${cleanClassId}-${Math.floor(100 + Math.random() * 900)}`;

    const newProfile: UserProfile = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      rollNumber: currentUser.rollNumber && currentUser.classCode === cleanClassId ? currentUser.rollNumber : generatedRollNo,
      role: selectedRole as 'student' | 'cr' | 'teacher',
      classCode: cleanClassId,
      isLoggedIn: true,
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    onEnterWorkspace(newProfile);
  };

  const handleSelectPreset = (preset: typeof PRESET_PROFILES[0]) => {
    setName(preset.name);
    setEmail(preset.email);
    setSelectedClassId(preset.classCode);
    setSelectedRole(preset.role as UserRole);

    onEnterWorkspace({
      ...preset,
      isLoggedIn: true,
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* 1. College Doodles Background Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-15 bg-repeat"
        style={{
          backgroundImage: "url('/college-doodles-bg.jpg')",
          backgroundSize: '800px auto',
        }}
        aria-hidden="true"
      />

      {/* Subtle Vignette Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/90 to-neutral-950"
        aria-hidden="true"
      />

      {/* 2. Top Header */}
      <header className="relative z-20 border-b border-neutral-850/60 bg-neutral-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/am-logo.png"
            alt="AM Logo"
            className="w-7 h-7 rounded-lg shrink-0 object-contain shadow-xs"
          />
          <span className="font-semibold text-sm tracking-tight text-white">M2029</span>
        </div>

        <div>
          {currentUser.isLoggedIn ? (
            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs transition cursor-pointer"
            >
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setAuthMode((m) => (m === 'signup' ? 'signin' : 'signup'))}
              className="text-xs text-neutral-400 hover:text-white transition cursor-pointer"
            >
              {authMode === 'signup' ? 'Sign In →' : 'Sign Up →'}
            </button>
          )}
        </div>
      </header>

      {/* 3. Hero & Minimal Form Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-xl mx-auto w-full">
        {/* Short, Punchy Title */}
        <div className="text-center space-y-2 mb-7">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px] font-mono">
            <Sparkles className="w-3 h-3 text-neutral-400" />
            <span>Classroom Desk</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl font-normal tracking-tight text-white">
            Your syllabus, lecture-ready.
          </h1>

          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Enter your student mail and class ID to join.
          </p>
        </div>

        {/* Clean Login / Sign Up Card */}
        <div className="w-full rounded-2xl bg-neutral-900/85 backdrop-blur-xl border border-neutral-800/80 p-5 sm:p-6 shadow-xl relative">
          {/* Mode Switch Tabs */}
          <div className="flex p-0.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs mb-5">
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-neutral-850 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-neutral-850 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {formError && (
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            {/* Name (in signup mode) */}
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-neutral-500" />
                  <span>Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aman Kumar"
                  required={authMode === 'signup'}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-sans"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                <Mail className="w-3 h-3 text-neutral-500" />
                <span>Student Mail</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-mono"
              />
            </div>

            {/* Common Class ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                <Hash className="w-3 h-3 text-neutral-500" />
                <span>Class ID</span>
              </label>
              <input
                type="text"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value.toUpperCase())}
                placeholder="BCA-2028"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-mono uppercase"
              />

              {/* Quick Class Chips */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {POPULAR_CLASSES.map((cls) => (
                  <button
                    key={cls.code}
                    type="button"
                    onClick={() => setSelectedClassId(cls.code)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                      selectedClassId === cls.code
                        ? 'bg-neutral-800 text-white border-neutral-600'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-700'
                    }`}
                  >
                    {cls.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Role (signup mode only) */}
            {authMode === 'signup' && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-neutral-400 block">Role</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'student', label: 'Student' },
                    { id: 'cr', label: 'CR' },
                    { id: 'teacher', label: 'Faculty' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id as UserRole)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                        selectedRole === r.id
                          ? 'bg-neutral-100 text-neutral-950 border-neutral-100'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <span>{authMode === 'signup' ? 'Join Workspace' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* 1-Click Instant Profiles */}
          <div className="mt-4 pt-3.5 border-t border-neutral-800/80">
            <span className="text-[10px] text-neutral-500 block mb-2 font-mono">
              Quick demo profiles:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PROFILES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-1.5 rounded-lg bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800/80 hover:border-neutral-700 transition cursor-pointer flex items-center gap-1.5 group min-w-0"
                >
                  <img
                    src={preset.avatarUrl}
                    alt={preset.name}
                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-800"
                  />
                  <div className="min-w-0 text-left">
                    <div className="text-[11px] font-medium text-neutral-300 group-hover:text-white truncate">
                      {preset.name.split(' ')[0]}
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono uppercase">
                      {preset.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Minimal Footer */}
      <footer className="relative z-10 border-t border-neutral-850/60 bg-neutral-950/70 py-3.5 px-4 sm:px-8 text-center text-[11px] text-neutral-500 font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/am-logo.png" alt="AM" className="w-3.5 h-3.5 rounded object-contain" />
          <span>M2029</span>
        </div>
        <div>
          <span>BCA 2028 Cohort</span>
        </div>
      </footer>
    </div>
  );
};
