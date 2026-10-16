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
  Server,
  Cpu,
  Layers,
  Code2,
  Check,
} from 'lucide-react';

export type SupportedModelProvider =
  | 'auto'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'custom'
  | 'sandbox';

interface ProviderOption {
  id: SupportedModelProvider;
  name: string;
  badge: string;
  defaultModel: string;
  placeholder: string;
  keyPrefix: string;
  portalUrl?: string;
  portalLabel?: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'auto',
    name: 'Auto-Detect',
    badge: 'Universal',
    defaultModel: 'Auto-selected',
    placeholder: 'Paste key from any provider (sk-..., AIzaSy..., gsk_..., etc.)',
    keyPrefix: 'Any',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT-4o',
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-proj-... or sk-...',
    keyPrefix: 'sk-',
    portalUrl: 'https://platform.openai.com/api-keys',
    portalLabel: 'OpenAI Dashboard',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: 'Claude 3.5',
    defaultModel: 'claude-3-5-haiku-20241022',
    placeholder: 'sk-ant-api03-...',
    keyPrefix: 'sk-ant-',
    portalUrl: 'https://console.anthropic.com/',
    portalLabel: 'Anthropic Console',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    badge: 'V3 / R1',
    defaultModel: 'deepseek-chat',
    placeholder: 'sk-... (DeepSeek API Key)',
    keyPrefix: 'sk-',
    portalUrl: 'https://platform.deepseek.com/',
    portalLabel: 'DeepSeek Platform',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'Llama 3.3 Ultra-Fast',
    defaultModel: 'llama-3.3-70b-versatile',
    placeholder: 'gsk_...',
    keyPrefix: 'gsk_',
    portalUrl: 'https://console.groq.com/keys',
    portalLabel: 'Groq Console',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Flash 2.5',
    defaultModel: 'gemini-2.5-flash',
    placeholder: 'AIzaSy...',
    keyPrefix: 'AIzaSy',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    portalLabel: 'Google AI Studio',
  },
  {
    id: 'custom',
    name: 'Custom / Ollama',
    badge: 'Local / Self-Hosted',
    defaultModel: 'llama3:latest',
    placeholder: 'Optional API key or token',
    keyPrefix: 'Custom',
  },
  {
    id: 'sandbox',
    name: 'Testing Sandbox',
    badge: 'Instant Simulator',
    defaultModel: 'sandbox-academic-engine',
    placeholder: 'AIzaSy-TESTING-DEMO-KEY',
    keyPrefix: 'TEST',
  },
];

interface AIKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (status: { hasCustomKey: boolean; modelType: string; providerName: string }) => void;
}

export const AIKeyConfigModal: React.FC<AIKeyConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_model' | 'supabase'>('ai_model');

  // Universal AI Model State
  const [selectedProvider, setSelectedProvider] = useState<SupportedModelProvider>('auto');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [currentStatus, setCurrentStatus] = useState<{
    hasCustomKey: boolean;
    modelType: string;
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
      // Check localStorage for saved keys
      try {
        const savedKey =
          localStorage.getItem('syllabus_ai_api_key') ||
          localStorage.getItem('syllabus_gemini_key') ||
          '';
        if (savedKey) setApiKey(savedKey);

        const savedProvider = (localStorage.getItem('syllabus_ai_provider') as SupportedModelProvider) || 'auto';
        setSelectedProvider(savedProvider);

        const savedModel = localStorage.getItem('syllabus_ai_model') || '';
        if (savedModel) setModelName(savedModel);

        const savedBaseUrl = localStorage.getItem('syllabus_ai_base_url') || '';
        if (savedBaseUrl) setBaseUrl(savedBaseUrl);

        const savedUrl = localStorage.getItem('syllabus_supabase_url') || '';
        if (savedUrl) setSupabaseUrl(savedUrl);
        const savedSbKey = localStorage.getItem('syllabus_supabase_key') || '';
        if (savedSbKey) setSupabaseKey(savedSbKey);
      } catch {
        // ignore storage restrictions
      }

      // Fetch AI config from server
      fetch('/api/ai/config')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.providerName) {
            setCurrentStatus({
              hasCustomKey: Boolean(data.hasCustomKey),
              modelType: data.modelType || 'custom_ai',
              providerName: data.providerName,
            });
            if (data.provider && data.provider !== 'auto') {
              setSelectedProvider(data.provider);
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
            setCurrentStatus({
              hasCustomKey: true,
              modelType: 'custom_ai',
              providerName: 'Custom AI Model (Browser Storage)',
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

  const currentProviderInfo = PROVIDER_OPTIONS.find((p) => p.id === selectedProvider) || PROVIDER_OPTIONS[0];

  const handleProviderChange = (newProvider: SupportedModelProvider) => {
    setSelectedProvider(newProvider);
    const info = PROVIDER_OPTIONS.find((p) => p.id === newProvider);
    if (info && info.id !== 'auto' && info.defaultModel && (!modelName || modelName.includes('auto'))) {
      setModelName(info.defaultModel);
    }
    if (newProvider === 'custom' && !baseUrl) {
      setBaseUrl('http://localhost:11434/v1');
    }
  };

  const handleSaveUniversalKey = async () => {
    const cleanKey = apiKey.trim();
    const cleanModel = modelName.trim();
    const cleanBaseUrl = baseUrl.trim();

    if (!cleanKey && selectedProvider !== 'custom') {
      setStatusMessage({
        type: 'error',
        text: 'Please enter an API key or click "Load Sandbox Test Key" for instant testing.',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    // Save locally
    try {
      localStorage.setItem('syllabus_ai_api_key', cleanKey);
      localStorage.setItem('syllabus_gemini_key', cleanKey); // backward compatibility
      localStorage.setItem('syllabus_ai_provider', selectedProvider);
      if (cleanModel) localStorage.setItem('syllabus_ai_model', cleanModel);
      if (cleanBaseUrl) localStorage.setItem('syllabus_ai_base_url', cleanBaseUrl);
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: cleanKey,
          provider: selectedProvider,
          modelName: cleanModel,
          baseUrl: cleanBaseUrl,
        }),
      });

      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setCurrentStatus({
          hasCustomKey: Boolean(data.hasCustomKey),
          modelType: data.modelType || 'custom_ai',
          providerName: data.providerName || 'Universal AI Engine',
        });
        setStatusMessage({
          type: 'success',
          text: `✓ Successfully activated ${data.providerName || 'Universal AI'}! Deep reasoning and tutor queries are now live.`,
        });
        if (onConfigUpdated) {
          onConfigUpdated({
            hasCustomKey: true,
            modelType: data.modelType || 'custom_ai',
            providerName: data.providerName || 'Universal AI Engine',
          });
        }
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to configure model. Please check the credentials.' });
      }
    } catch {
      // Fallback for static GitHub Pages / client-side execution
      const providerLabel = currentProviderInfo.name;
      const staticStatus = {
        hasCustomKey: true,
        modelType: 'custom_ai',
        providerName: `${providerLabel} (Browser Storage)`,
      };
      setCurrentStatus(staticStatus);
      setStatusMessage({
        type: 'success',
        text: `✓ Key saved to browser storage for ${providerLabel}. Ready for AI study tutor & exam solvers!`,
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
      const fallback = {
        hasCustomKey: false,
        modelType: 'basic',
        providerName: 'Built-in Basic Academic Model',
      };
      setCurrentStatus(fallback);
      setStatusMessage({
        type: 'success',
        text: '✓ Active engine set to Built-in Basic Academic Model (Zero API key needed).',
      });
      setApiKey('');
      setModelName('');
      setBaseUrl('');
      setSelectedProvider('auto');
      if (onConfigUpdated) onConfigUpdated(fallback);
    } catch {
      const fallback = {
        hasCustomKey: false,
        modelType: 'basic',
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
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Universal AI Models & API Key</h3>
              <p className="text-xs text-slate-400">
                Connect any model provider: OpenAI, Claude, DeepSeek, Groq, Gemini, Ollama, or Sandbox
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
              setActiveTab('ai_model');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ai_model'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Universal AI Engine</span>
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
            <span>Supabase Cloud DB</span>
          </button>
        </div>

        {activeTab === 'ai_model' ? (
          <>
            {/* Current Active Engine Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Active AI Engine:</span>
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
                {currentStatus.hasCustomKey ? '🟢 Active & Ready' : '⚪ Free Basic Model'}
              </span>
            </div>

            {/* Provider Grid Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Select Model Provider:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Auto-detects from key or select manually
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROVIDER_OPTIONS.map((prov) => {
                  const isSelected = selectedProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleProviderChange(prov.id)}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between h-16 ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500/60 ring-1 ring-cyan-500/40 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold truncate">{prov.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">{prov.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input: API Key for Selected Model */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{currentProviderInfo.name} API Key</span>
                </label>
                {currentProviderInfo.portalUrl && (
                  <a
                    href={currentProviderInfo.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Get Key ({currentProviderInfo.portalLabel})</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProviderInfo.placeholder}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono pr-10 outline-none transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Optional: Model Name & Base URL for Custom/Advanced */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Model Name (Optional):
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={currentProviderInfo.defaultModel || 'e.g. gpt-4o, deepseek-chat'}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Base URL (Optional / Ollama):
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none transition"
                  />
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : statusMessage.type === 'error'
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                      : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200'
                  }`}
                >
                  {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveUniversalKey}
                  disabled={isLoading || (!apiKey.trim() && selectedProvider !== 'custom')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Activating Engine...' : 'Activate Model in App'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const testKey = 'AIzaSy-TESTING-DEMO-KEY';
                    setApiKey(testKey);
                    setSelectedProvider('sandbox');
                    setModelName('sandbox-academic-engine');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                  title="Insert instant testing key (Zero external quota required)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Sandbox Test Key</span>
                </button>
              </div>
            </div>

            {/* Fallback to Basic Free Model */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  No API key right now? Use the offline academic model:
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
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-200">
                    Supabase Anon Public API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    {showSupabaseKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveSupabase}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Save Supabase Credentials</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
