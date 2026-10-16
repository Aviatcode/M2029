import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Mail,
  User as UserIcon,
  Hash,
  ShieldCheck,
  GraduationCap,
  Award,
  Layers,
  Smartphone,
  CheckCircle2,
  Clock,
  Compass,
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
  { code: 'BCA-2028', name: 'BCA (Batch 2028)' },
  { code: 'BTECH-CS-2027', name: 'B.Tech CS (Batch 2027)' },
  { code: 'MCA-2026', name: 'MCA (Batch 2026)' },
  { code: 'BSC-IT-2025', name: 'B.Sc IT (Batch 2025)' },
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
      setFormError('Please enter your full student or faculty name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid student mail or university email address.');
      return;
    }

    if (!cleanClassId) {
      setFormError('Please specify a Common Class ID (e.g. BCA-2028).');
      return;
    }

    // Auto-generate or derive roll number
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
    <div className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800 selection:text-white flex flex-col overflow-x-hidden">
      {/* 1. College Doodles Background Backdrop Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20 bg-repeat"
        style={{
          backgroundImage: "url('/college-doodles-bg.jpg')",
          backgroundSize: '800px auto',
        }}
        aria-hidden="true"
      />

      {/* Dark Vignette Overlay for Crisp Readability */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/92 to-neutral-950"
        aria-hidden="true"
      />

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 border-b border-neutral-850/80 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/am-logo.png"
            alt="AM Logo"
            className="w-8 h-8 rounded-lg shrink-0 object-contain shadow-sm"
          />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">SyllabusOS</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              v2028
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.isLoggedIn ? (
            <button
              onClick={onGoToDashboard}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs transition cursor-pointer shadow-sm"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href="#onboard-card"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs transition cursor-pointer shadow-sm"
            >
              <span>{authMode === 'signup' ? 'Sign Up' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </header>

      {/* 3. Hero & Interactive Onboarding Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 pb-16 max-w-5xl mx-auto w-full">
        {/* Hero Title & Badge */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span>Autonomous Academic Curriculum Desk</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white leading-tight">
            Your university syllabus, decoded and lecture-ready.
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed max-w-xl mx-auto">
            Sign in with your student mail, name, and common class ID to sync with your cohort and unlock 
            autonomous syllabus tracking, 7 AM primers, and 10-marker university PYQs.
          </p>
        </div>

        {/* Core Sign-In / Student Onboarding Card */}
        <div
          id="onboard-card"
          className="w-full max-w-xl rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/90 p-5 sm:p-7 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-neutral-400 to-transparent opacity-50" />

          {/* Card Header with Mode Switcher */}
          <div className="pb-4 border-b border-neutral-800/80 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/am-logo.png"
                  alt="AM App Logo"
                  className="w-9 h-9 rounded-lg shrink-0 object-contain shadow-sm border border-neutral-800"
                />
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    {authMode === 'signup' ? 'Student Sign Up & Join' : 'Classroom Sign In'}
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    {authMode === 'signup'
                      ? 'Register with student mail, name & class ID to enter the desk'
                      : 'Sign in to access your class syllabus and academic workspace'}
                  </p>
                </div>
              </div>

              {currentUser.isLoggedIn && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Session Active
                </span>
              )}
            </div>

            {/* Mode Switch Tabs: Sign Up vs Sign In */}
            <div className="flex p-1 rounded-xl bg-neutral-950 border border-neutral-850 text-xs">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-neutral-850 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Student (Sign Up)</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium transition cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-neutral-850 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Existing Student (Sign In)</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            {/* 1. Student Name (Required in signup mode) */}
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Student / Full Name</span>
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

            {/* 2. Student Mail / University Email */}
            <div className="space-y-1.5">
              <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>Student Mail / University Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. aman.cr@cs.university.edu"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-mono"
              />
            </div>

            {/* 3. Common Class ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Common Class ID</span>
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">Shared with your batch</span>
              </div>
              <input
                type="text"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value.toUpperCase())}
                placeholder="e.g. BCA-2028"
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition text-xs font-mono uppercase"
              />

              {/* Quick Class Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 mr-1">Quick Select:</span>
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

            {/* 4. Role Toggle (Only in sign up mode) */}
            {authMode === 'signup' && (
              <div className="space-y-1.5 pt-1">
                <label className="font-medium text-neutral-300 block">Classroom Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'student', label: 'Student' },
                    { id: 'cr', label: 'Class Rep (CR)' },
                    { id: 'teacher', label: 'Faculty' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id as UserRole)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                        selectedRole === r.id
                          ? 'bg-neutral-100 text-neutral-950 border-neutral-100 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>
                  {authMode === 'signup' ? 'Complete Sign Up & Enter Desk' : 'Sign In & Enter Desk'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* One-Click Demo Profiles */}
          <div className="mt-5 pt-4 border-t border-neutral-800/80">
            <span className="text-[11px] text-neutral-400 block mb-2 font-mono">
              Or instant 1-click sign in:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_PROFILES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer text-left flex items-center gap-2 group"
                >
                  <img
                    src={preset.avatarUrl}
                    alt={preset.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-neutral-800"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono truncate">
                      {preset.role.toUpperCase()} · {preset.classCode}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Value Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full mt-12 text-xs">
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-white text-xs">7 AM Pre-Lecture Primers</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Daily 5-minute pre-reads tailored to today's lecture topics before class starts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-white text-xs">Autonomous Syllabus Mapping</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Units, chapters, and topics decomposed with high-yield university weightage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-white text-xs">10-Marker PYQ Vault</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Standardized university answer structures with code, diagrams, and marking tips.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-white text-xs">WebAPK & Offline PWA</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Instant 1-tap install to mobile and desktop for fast offline reading.
            </p>
          </div>
        </div>
      </main>

      {/* 5. Minimal Footer */}
      <footer className="relative z-10 border-t border-neutral-850 bg-neutral-950/90 py-5 px-4 sm:px-8 text-center text-xs text-neutral-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/am-logo.png" alt="AM" className="w-4 h-4 rounded object-contain" />
          <span>SyllabusOS · Autonomous Academic Operating System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Classroom Mesh Active</span>
          <span>·</span>
          <span>Zero Telemetry</span>
        </div>
      </footer>
    </div>
  );
};
