import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Bot,
  Zap,
  Database,
  ArrowRight,
} from 'lucide-react';

interface AIKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (status: { hasCustomKey: boolean; modelType: 'gemini' | 'basic'; providerName: string }) => void;
}

export const AIKeyConfigModal: React.FC<AIKeyConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'supabase'>('gemini');

  // Gemini State
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentStatus, setCurrentStatus] = useState<{
    hasCustomKey: boolean;
    modelType: 'gemini' | 'basic';
    providerName: string;
  }>({
    hasCustomKey: false,
    modelType: 'basic',
    providerName: 'Built-in Basic Academic Model',
  });

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [showSupabaseKey, setShowSupabaseKey] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    ok: boolean;
    message: string;
  }>({
    configured: false,
    ok: false,
    message: 'Checking status...',
  });

  useEffect(() => {
    if (isOpen) {
      // Check localStorage for saved Gemini key
      try {
        const savedKey = localStorage.getItem('syllabus_gemini_key') || '';
        if (savedKey) setApiKey(savedKey);
        const savedUrl = localStorage.getItem('syllabus_supabase_url') || '';
        if (savedUrl) setSupabaseUrl(savedUrl);
        const savedSbKey = localStorage.getItem('syllabus_supabase_key') || '';
        if (savedSbKey) setSupabaseKey(savedSbKey);
      } catch {
        // ignore storage restrictions
      }

      // Fetch AI config
      fetch('/api/ai/config')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.modelType) {
            setCurrentStatus(data);
          }
        })
        .catch(() => {
          const localKey = localStorage.getItem('syllabus_gemini_key');
          if (localKey) {
            setCurrentStatus({
              hasCustomKey: true,
              modelType: 'gemini',
              providerName: 'Google Gemini (Browser Local Storage)',
            });
          }
        });

      // Fetch Supabase status
      fetch('/api/supabase/status')
        .then((r) => r.json())
        .then((data) => {
          if (data) setSupabaseStatus(data);
        })
        .catch(() => {
          setSupabaseStatus({
            configured: false,
            ok: false,
            message: 'Static / Client-side mode active.',
          });
        });

      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveGeminiKey = async () => {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Gemini API key or click "Use Basic Model".' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    // Persist to localStorage for client-side / GitHub Pages mode
    try {
      localStorage.setItem('syllabus_gemini_key', cleanKey);
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        setCurrentStatus(data);
        setStatusMessage({
          type: 'success',
          text: '✓ Gemini API Key successfully saved and activated! Real-time deep reasoning is now live.',
        });
        if (onConfigUpdated) onConfigUpdated(data);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to configure API key. Please check the key.' });
      }
    } catch {
      // If server fetch fails (e.g. static GitHub Pages), key is saved in localStorage
      const staticStatus = {
        hasCustomKey: true,
        modelType: 'gemini' as const,
        providerName: 'Google Gemini 2.5 Flash (Browser Saved)',
      };
      setCurrentStatus(staticStatus);
      setStatusMessage({
        type: 'success',
        text: '✓ Gemini API Key saved to browser! Ready for AI study tutor & exam solvers.',
      });
      if (onConfigUpdated) onConfigUpdated(staticStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseBasicModel = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      localStorage.removeItem('syllabus_gemini_key');
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      });

      const data = await res.json();
      setCurrentStatus(data);
      setStatusMessage({
        type: 'success',
        text: '✓ Active engine set to Built-in Basic Academic Model (Zero API key needed).',
      });
      setApiKey('');
      if (onConfigUpdated) onConfigUpdated(data);
    } catch {
      const fallback = {
        hasCustomKey: false,
        modelType: 'basic' as const,
        providerName: 'Built-in Basic Academic Model',
      };
      setCurrentStatus(fallback);
      setStatusMessage({
        type: 'success',
        text: '✓ Active engine set to Built-in Basic Academic Model.',
      });
      setApiKey('');
      if (onConfigUpdated) onConfigUpdated(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSupabase = () => {
    try {
      localStorage.setItem('syllabus_supabase_url', supabaseUrl.trim());
      localStorage.setItem('syllabus_supabase_key', supabaseKey.trim());
      setStatusMessage({
        type: 'success',
        text: '✓ Supabase credentials saved in browser storage. Remember to also add them to .env and run npm run db:push to seed!',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to save to local storage.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">API Keys & Live Connections</h3>
              <p className="text-xs text-slate-400">
                Configure Google Gemini AI & Supabase PostgreSQL database
              </p>
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

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('gemini');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'gemini'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Google Gemini AI</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('supabase');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Database</span>
          </button>
        </div>

        {activeTab === 'gemini' ? (
          <>
            {/* Current Active Engine Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Active AI Model:</span>
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  {currentStatus.hasCustomKey ? (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">{currentStatus.providerName}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-cyan-300">{currentStatus.providerName}</span>
                    </>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  currentStatus.hasCustomKey
                    ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                    : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                }`}
              >
                {currentStatus.hasCustomKey ? '🟢 Gemini Key Active' : '⚪ Free Basic Model'}
              </span>
            </div>

            {/* Guidance Prompt */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-cyan-950/40 border border-blue-500/30 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-slate-200 block">
                    Real-Time Deep Reasoning
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Paste your free Google Gemini API key to unlock dynamic syllabus parsing, AI tutoring, assignment solutions, and exam predictions.
                  </p>
                </div>
              </div>
            </div>

            {/* Input: Gemini API Key */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 hover:underline"
                >
                  <span>Get Free Key (Google AI Studio)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste Google Gemini API Key (e.g. AIzaSy...)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono pr-10 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveGeminiKey}
                  disabled={isLoading || !apiKey.trim()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Activating Key...' : 'Activate Key in App'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const testKey = 'AIzaSy-TESTING-DEMO-KEY';
                    setApiKey(testKey);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                  title="Insert testing key"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Test Key</span>
                </button>
              </div>
            </div>

            {/* Option 2: Fallback to Basic Free Model */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  No key right now? Use the offline academic model:
                </span>
                <button
                  type="button"
                  onClick={handleUseBasicModel}
                  disabled={isLoading || (!currentStatus.hasCustomKey && currentStatus.modelType === 'basic')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white font-medium text-xs transition cursor-pointer border border-slate-700 flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Use Basic Free Model</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Supabase Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Database Connection:</span>
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className={supabaseStatus.ok ? 'text-emerald-300' : 'text-slate-300'}>
                    {supabaseStatus.ok ? 'Supabase Connected' : 'Local / Offline DB'}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  supabaseStatus.ok
                    ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-850 border-slate-700 text-slate-400'
                }`}
              >
                {supabaseStatus.ok ? '🟢 Cloud Sync' : '⚪ Memory DB'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud PostgreSQL Setup</span>
                </span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 hover:underline"
                >
                  <span>Supabase Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-300">
                1. Run <code>supabase/schema.sql</code> in your Supabase SQL Editor.
              </p>
              <p className="text-[11px] text-slate-300">
                2. Enter your Project URL & Anon Key below or in <code>.env</code>.
              </p>
              <p className="text-[11px] text-slate-300">
                3. Run <code>npm run db:push</code> in terminal to push all curriculum data!
              </p>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Supabase Anon Public Key
                </label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono pr-10 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-white"
                  >
                    {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSupabase}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Save Supabase Configuration</span>
              </button>
            </div>
          </>
        )}

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
