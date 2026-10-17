import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  BookOpen,
  LogOut,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Camera,
} from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  role: 'student' | 'cr' | 'teacher';
  avatarUrl?: string;
  classCode: string;
  isLoggedIn: boolean;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogin: (profile: UserProfile) => void;
  onLogout: () => void;
}

const PRESET_ACCOUNTS: Array<Omit<UserProfile, 'isLoggedIn'>> = [
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

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name || 'Aman Kumar');
  const [email, setEmail] = useState(currentUser.email || 'aman@cs.university.edu');
  const [rollNumber, setRollNumber] = useState(currentUser.rollNumber || 'BCA-2028-042');
  const [role, setRole] = useState<'student' | 'cr' | 'teacher'>(currentUser.role || 'cr');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [activeTab, setActiveTab] = useState<'quick' | 'custom'>('quick');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updatedProfile: UserProfile = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      rollNumber: rollNumber.trim() || 'STU-VERIFIED',
      role,
      avatarUrl: avatarUrl.trim(),
      classCode: currentUser.classCode || 'BCA-2028',
      isLoggedIn: true,
    };

    onLogin(updatedProfile);
    onClose();
  };

  const handleSelectPreset = (preset: typeof PRESET_ACCOUNTS[0]) => {
    const profile: UserProfile = {
      ...preset,
      isLoggedIn: true,
    };
    onLogin(profile);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans-ui text-slate-100 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Student and Faculty Portal Modal"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl space-y-5 my-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Student & Faculty Portal</h2>
              <p className="text-xs text-slate-400">Class {currentUser.classCode} Academic Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status if already logged in */}
        {currentUser.isLoggedIn && (
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-sm text-white">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {currentUser.role === 'cr' ? 'Class Rep' : currentUser.role === 'teacher' ? 'Faculty' : 'Student'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {currentUser.rollNumber} · {currentUser.email}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1 text-xs"
              title="Sign out of this session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition cursor-pointer text-center ${
              activeTab === 'quick'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            One-Click Profiles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition cursor-pointer text-center ${
              activeTab === 'custom'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Sign In
          </button>
        </div>

        {activeTab === 'quick' ? (
          <div className="space-y-2.5">
            <span className="text-[11px] text-slate-400 block">
              Choose an authenticated classroom profile to sign in:
            </span>
            {PRESET_ACCOUNTS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="w-full p-3 rounded-xl bg-slate-950/70 hover:bg-slate-850 border border-slate-800 hover:border-neutral-600 transition cursor-pointer flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {preset.avatarUrl ? (
                      <img src={preset.avatarUrl} alt={preset.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-semibold text-xs text-slate-300">
                        {preset.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-100 group-hover:text-white transition">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {preset.rollNumber}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                      preset.role === 'cr'
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                        : preset.role === 'teacher'
                        ? 'bg-purple-950/80 border-purple-500/30 text-purple-300'
                        : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {preset.role === 'cr' ? 'CR' : preset.role === 'teacher' ? 'Faculty' : 'Student'}
                  </span>
                  <span className="text-xs text-slate-500 group-hover:text-white transition">→</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-neutral-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Roll / ID No.</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. BCA-2028-042"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none focus:border-neutral-500"
                >
                  <option value="student">Student</option>
                  <option value="cr">Class Rep (CR)</option>
                  <option value="teacher">Faculty</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">University Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cs.university.edu"
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Profile Avatar URL (Optional)
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-neutral-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-900 font-semibold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sign In as {name || 'Student'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
