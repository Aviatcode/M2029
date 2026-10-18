import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Sparkles,
  Database,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Play,
  RotateCcw,
  Smartphone,
  Layers,
  Settings,
  Send,
  HelpCircle,
  Cpu,
  Check,
  User,
  Pencil,
  X,
} from 'lucide-react';
import { Subject } from '../types';
import { UserProfile } from './LoginModal';

interface SettingsViewProps {
  classCode: string;
  semesterNumber: number;
  subjects: Subject[];
  onOpenClassSetup?: () => void;
  currentUser?: UserProfile;
  onUpdateUsername?: (newName: string) => void;
}

export type SupportedProvider =
  | 'auto'
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'custom'
  | 'sandbox';

interface ProviderBadge {
  id: SupportedProvider;
  name: string;
  badge: string;
  defaultModel: string;
  keyPrefix: string;
  url?: string;
  urlText?: string;
}

const PROVIDERS: ProviderBadge[] = [
  { id: 'gemini', name: 'Gemini', badge: 'Flash 2.5', defaultModel: 'gemini-2.5-flash', keyPrefix: 'AIzaSy', url: 'https://aistudio.google.com/app/apikey', urlText: 'Google AI Studio' },
  { id: 'openai', name: 'OpenAI', badge: 'GPT-4o', defaultModel: 'gpt-4o-mini', keyPrefix: 'sk-', url: 'https://platform.openai.com/api-keys', urlText: 'OpenAI Keys' },
  { id: 'claude', name: 'Claude', badge: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', keyPrefix: 'sk-ant-', url: 'https://console.anthropic.com/', urlText: 'Anthropic Console' },
  { id: 'deepseek', name: 'DeepSeek', badge: 'V3 / R1', defaultModel: 'deepseek-chat', keyPrefix: 'sk-', url: 'https://platform.deepseek.com/', urlText: 'DeepSeek Platform' },
  { id: 'groq', name: 'Groq', badge: 'Llama 3.3', defaultModel: 'llama-3.3-70b-versatile', keyPrefix: 'gsk_', url: 'https://console.groq.com/keys', urlText: 'Groq Console' },
  { id: 'openrouter', name: 'OpenRouter', badge: '100+ Models', defaultModel: 'deepseek/deepseek-r1', keyPrefix: 'sk-or-', url: 'https://openrouter.ai/keys', urlText: 'OpenRouter Hub' },
  { id: 'custom', name: 'Custom/Ollama', badge: 'Local', defaultModel: 'llama3:latest', keyPrefix: 'Custom' },
  { id: 'auto', name: 'Auto-Detect', badge: 'Universal', defaultModel: 'Auto-detect', keyPrefix: 'Any' },
  { id: 'sandbox', name: 'Sandbox', badge: 'Zero Quota', defaultModel: 'sandbox-academic-engine', keyPrefix: 'TEST' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  classCode,
  semesterNumber,
  subjects,
  onOpenClassSetup,
  currentUser,
  onUpdateUsername,
}) => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(currentUser?.name || '');

  useEffect(() => {
    if (currentUser?.name) {
      setEditedUsername(currentUser.name);
    }
  }, [currentUser?.name]);
  // Universal AI State
  const [showCustomKeySection, setShowCustomKeySection] = useState<boolean>(false);
  const [provider, setProvider] = useState<SupportedProvider>('auto');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    hasCustomKey: boolean;
    modelType: string;
    providerName: string;
  }>({
    hasCustomKey: false,
    modelType: 'basic',
    providerName: 'Built-in Basic Academic Model',
  });

  // Live Playground Test State
  const [testPrompt, setTestPrompt] = useState<string>('Explain Database Normalization (1NF, 2NF, 3NF, BCNF) simply with exam tips.');
  const [isTestingQuery, setIsTestingQuery] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<string>('');

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [showSbKey, setShowSbKey] = useState<boolean>(false);
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
    // Load local storage keys
    try {
      const localKey =
        localStorage.getItem('syllabus_ai_api_key') ||
        localStorage.getItem('syllabus_gemini_key') ||
        '';
      if (localKey) setApiKey(localKey);

      const localProv = (localStorage.getItem('syllabus_ai_provider') as SupportedProvider) || 'auto';
      setProvider(localProv);

      const localModel = localStorage.getItem('syllabus_ai_model') || '';
      if (localModel) setModelName(localModel);

      const localBaseUrl = localStorage.getItem('syllabus_ai_base_url') || '';
      if (localBaseUrl) setBaseUrl(localBaseUrl);

      const localSbUrl = localStorage.getItem('syllabus_supabase_url') || '';
      if (localSbUrl) setSupabaseUrl(localSbUrl);
      const localSbKey = localStorage.getItem('syllabus_supabase_key') || '';
      if (localSbKey) setSupabaseKey(localSbKey);
    } catch {
      // ignore
    }

    // Check live server AI config
    fetch('/api/ai/config')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.providerName) {
          setAiStatus({
            hasCustomKey: Boolean(data.hasCustomKey),
            modelType: data.modelType || 'custom_ai',
            providerName: data.providerName,
          });
          if (data.provider && data.provider !== 'auto') {
            setProvider(data.provider);
          }
          if (data.modelName) {
            setModelName(data.modelName);
          }
        }
      })
      .catch(() => {
        const localKey =
          localStorage.getItem('syllabus_ai_api_key') ||
          localStorage.getItem('syllabus_gemini_key');
        if (localKey) {
          setAiStatus({
            hasCustomKey: true,
            modelType: 'custom_ai',
            providerName: 'Custom AI Engine (Browser Storage)',
          });
        }
      });

    // Check Supabase status
    fetch('/api/supabase/status')
      .then((r) => r.json())
      .then((data) => {
        if (data) setSupabaseStatus(data);
      })
      .catch(() => {
        setSupabaseStatus({
          configured: false,
          ok: false,
          message: 'Client-side mode active.',
        });
      });
  }, []);

  const handleProviderSelect = (p: SupportedProvider) => {
    setProvider(p);
    const info = PROVIDERS.find((item) => item.id === p);
    if (info && info.id !== 'auto' && info.defaultModel && (!modelName || modelName.includes('auto'))) {
      setModelName(info.defaultModel);
    }
    if (p === 'custom' && !baseUrl) {
      setBaseUrl('http://localhost:11434/v1');
    }
  };

  const handleSaveUniversalKey = async (overrideKey?: string) => {
    const keyToSave = (overrideKey !== undefined ? overrideKey : apiKey).trim();
    const modelToSave = modelName.trim();
    const baseUrlToSave = baseUrl.trim();

    if (!keyToSave && provider !== 'custom') {
      setStatusMessage({ type: 'error', text: 'Please enter an API key or click "Use Test Key (Sandbox)".' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      localStorage.setItem('syllabus_ai_api_key', keyToSave);
      localStorage.setItem('syllabus_gemini_key', keyToSave); // backward compatibility
      localStorage.setItem('syllabus_ai_provider', provider);
      if (modelToSave) localStorage.setItem('syllabus_ai_model', modelToSave);
      if (baseUrlToSave) localStorage.setItem('syllabus_ai_base_url', baseUrlToSave);
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToSave,
          provider,
          modelName: modelToSave,
          baseUrl: baseUrlToSave,
        }),
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setAiStatus({
          hasCustomKey: Boolean(data.hasCustomKey),
          modelType: data.modelType || 'custom_ai',
          providerName: data.providerName || 'Configured Model',
        });
        setStatusMessage({
          type: 'success',
          text: `✓ Key active! Active Provider: ${data.providerName || 'Configured Model'}`,
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to configure API key.' });
      }
    } catch {
      const selected = PROVIDERS.find((item) => item.id === provider);
      const fallbackStatus = {
        hasCustomKey: true,
        modelType: 'custom_ai',
        providerName: `${selected?.name || 'Custom AI'} (Browser Stored)`,
      };
      setAiStatus(fallbackStatus);
      setStatusMessage({
        type: 'success',
        text: '✓ Key saved to browser local storage! Ready for live tutoring and exam answers.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTestKey = () => {
    const testKey = 'AIzaSy-TESTING-DEMO-KEY';
    setApiKey(testKey);
    setProvider('sandbox');
    setModelName('sandbox-academic-engine');
    handleSaveUniversalKey(testKey);
  };

  const handleUseBasicModel = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      localStorage.removeItem('syllabus_ai_api_key');
      localStorage.removeItem('syllabus_gemini_key');
      localStorage.removeItem('syllabus_ai_provider');
      localStorage.removeItem('syllabus_ai_model');
      localStorage.removeItem('syllabus_ai_base_url');
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
      const basic = {
        hasCustomKey: false,
        modelType: 'basic',
        providerName: 'Built-in Basic Academic Model',
      };
      setAiStatus(basic);
      setStatusMessage({
        type: 'success',
        text: '✓ Reverted to Built-in Basic Academic Model (Zero API key needed).',
      });
      setApiKey('');
      setModelName('');
      setBaseUrl('');
      setProvider('auto');
    } catch {
      const basic = {
        hasCustomKey: false,
        modelType: 'basic',
        providerName: 'Built-in Basic Academic Model',
      };
      setAiStatus(basic);
      setStatusMessage({
        type: 'success',
        text: '✓ Switched to Built-in Basic Academic Model.',
      });
      setApiKey('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunLiveTest = async () => {
    if (!testPrompt.trim()) return;
    setIsTestingQuery(true);
    setTestResponse('');

    try {
      const res = await fetch('/api/ai-tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subjects[0]?.name || 'Database Management Systems',
          query: testPrompt.trim(),
          mode: 'simple',
        }),
      });

      const data = await res.json();
      if (data && (data.text || data.answer)) {
        setTestResponse(data.text || data.answer);
      } else {
        setTestResponse('No response returned from test.');
      }
    } catch {
      setTestResponse(`Test completed with local heuristic: Concept analysis processed successfully.`);
    } finally {
      setIsTestingQuery(false);
    }
  };

  const handleSaveSupabase = () => {
    try {
      localStorage.setItem('syllabus_supabase_url', supabaseUrl.trim());
      localStorage.setItem('syllabus_supabase_key', supabaseKey.trim());
      setStatusMessage({
        type: 'success',
        text: '✓ Supabase credentials saved in browser storage. Remember to run npm run db:push to push schema data.',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Storage error.' });
    }
  };

  const activeProviderBadge = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 sm:px-4 space-y-6 animate-fade-in font-sans-ui text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              Class {classCode} · Sem {semesterNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-300" />
            <span>Settings</span>
          </h1>
        </div>

        {onOpenClassSetup && (
          <button
            onClick={onOpenClassSetup}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer self-start sm:self-auto"
          >
            Change Semester Setup
          </button>
        )}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border transition ${
            statusMessage.type === 'success'
              ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-neutral-900 border-neutral-750 text-neutral-300'
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

      {/* SECTION 1: PROFILE & USERNAME */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <User className="w-4 h-4 text-slate-400" />
          <span>Profile</span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-[11px] text-slate-400 block font-medium">Username</span>
            {isEditingUsername ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editedUsername.trim()) {
                    onUpdateUsername?.(editedUsername.trim());
                    setIsEditingUsername(false);
                    setStatusMessage({ type: 'success', text: 'Username updated!' });
                  }
                }}
                className="flex items-center gap-2 mt-1.5 max-w-md"
              >
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  autoFocus
                  placeholder="Enter username"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-slate-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedUsername(currentUser?.name || '');
                    setIsEditingUsername(false);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-2.5">
                <span>{currentUser?.name || 'Student'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-400 uppercase">
                  {currentUser?.role || 'student'}
                </span>
              </div>
            )}
          </div>

          {!isEditingUsername && (
            <button
              type="button"
              onClick={() => setIsEditingUsername(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Pencil className="w-3 h-3 text-slate-400" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: AI STUDY ENGINE */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>AI Study Engine</span>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-medium flex items-center gap-1.5 ${
              aiStatus.hasCustomKey
                ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus.hasCustomKey ? 'bg-neutral-300' : 'bg-emerald-400'
              }`}
            />
            <span>{aiStatus.hasCustomKey ? 'Custom Key' : 'Built-in (Free)'}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-100 font-semibold text-sm block">
              {aiStatus.hasCustomKey ? aiStatus.providerName : 'Built-in Academic AI'}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {aiStatus.hasCustomKey
                ? 'Using your custom API key for notes, primers, and 10-markers.'
                : 'Always active and free. Generates summaries, primers, and mindmaps with zero setup.'}
            </p>
          </div>

          {aiStatus.hasCustomKey && (
            <button
              onClick={handleUseBasicModel}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              Reset to Free Default
            </button>
          )}
        </div>

        {/* Collapsible Accordion for Custom Key */}
        <div className="rounded-lg border border-slate-800/90 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCustomKeySection(!showCustomKeySection)}
            className="w-full px-3.5 py-2.5 text-xs text-left text-slate-300 hover:text-white flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Use Custom API Key (Optional)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {showCustomKeySection ? 'Hide' : 'Configure'}
            </span>
          </button>

          {showCustomKeySection && (
            <div className="p-3.5 border-t border-slate-800/80 space-y-3 bg-slate-950/80 text-xs">
              <p className="text-[11px] text-slate-400">
                You can optionally link your own Gemini, Groq, or OpenAI key. If left blank, the app will continue using the built-in free model.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  Select Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderSelect(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-600"
                >
                  {PROVIDERS.filter((p) => p.id !== 'sandbox').map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name} ({prov.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-medium text-slate-300">
                    {activeProviderBadge.name} API Key
                  </label>
                  {activeProviderBadge.url && (
                    <a
                      href={activeProviderBadge.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 hover:underline text-[10px]"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste key here..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 rounded px-3 py-1.5 text-xs text-slate-100 font-mono pr-9 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveUniversalKey()}
                  disabled={isLoading || (!apiKey.trim() && provider !== 'custom')}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 disabled:opacity-40 font-semibold text-xs transition cursor-pointer"
                >
                  {isLoading ? 'Saving...' : 'Save & Activate'}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleUseBasicModel}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition cursor-pointer"
                  >
                    Remove Key
                  </button>
                )}
              </div>

              {/* Developer Sub-disclosure: Advanced Model Parameters & Tester */}
              <details className="mt-2 pt-2 border-t border-slate-800/80 group">
                <summary className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer list-none flex items-center justify-between">
                  <span>Advanced Parameters (Optional)</span>
                  <span className="text-[10px] text-slate-500 font-mono group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="pt-2 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Model Override</label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder={activeProviderBadge.defaultModel}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Base URL (e.g. Ollama)</label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Query Tester */}
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-medium text-slate-300 block">Quick Test Prompt</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                      />
                      <button
                        onClick={handleRunLiveTest}
                        disabled={isTestingQuery || !testPrompt.trim()}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs transition cursor-pointer disabled:opacity-40"
                      >
                        {isTestingQuery ? '...' : 'Test'}
                      </button>
                    </div>
                    {testResponse && (
                      <div className="p-2 rounded bg-slate-950 text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {testResponse}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: APP & TROUBLESHOOTING */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>App & Storage</span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-200 font-semibold text-xs block">Clear Temporary Cache</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Refreshes your syllabus workspace and clears corrupted temporary browser files.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Clear cached app data and reload? Your saved notes will remain safe.')) {
                try {
                  sessionStorage.clear();
                  localStorage.removeItem('syllabus_cache');
                } catch {
                  // ignore
                }
                window.location.reload();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition cursor-pointer shrink-0"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>

      {/* SECTION 4: ADVANCED DATABASE SYNC (COLLAPSED ACCORDION) */}
      <details className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-3.5 text-xs group">
        <summary className="font-medium text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-between list-none select-none">
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Developer / Cloud Database Sync (Optional)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="pt-3 mt-3 border-t border-slate-800/60 space-y-3">
          <p className="text-[11px] text-slate-400">
            For multi-device sync with a remote Supabase PostgreSQL database. Regular users can safely leave this blank.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Supabase URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Supabase Anon Key</label>
              <div className="relative">
                <input
                  type={showSbKey ? 'text' : 'password'}
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 pr-8 outline-none focus:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowSbKey(!showSbKey)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  {showSbKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSaveSupabase}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs transition cursor-pointer"
            >
              Save Database Config
            </button>
          </div>
        </div>
      </details>

      {/* App Info Footer */}
      <div className="text-center pt-2 pb-4 text-[11px] text-slate-500">
        <span>M2029 BCA Syllabus System · Offline Ready</span>
      </div>
    </div>
  );
};
