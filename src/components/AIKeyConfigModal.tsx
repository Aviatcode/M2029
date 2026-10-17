import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  User,
  Users,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ModelProviderType,
  MODEL_PRESETS,
  PROVIDER_PORTALS,
  getStoredAiSettings,
  saveStoredAiSettings,
  testAiConnection,
  StoredAiSettings,
} from '../utils/aiModelService';

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
  const [activeTab, setActiveTab] = useState<'personal' | 'class_server' | 'supabase'>('personal');

  // Personal Settings State
  const [settings, setSettings] = useState<StoredAiSettings>(getStoredAiSettings());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(settings.personalModel || 'gemini-2.5-flash');
  const [showPersonalKey, setShowPersonalKey] = useState<boolean>(false);
  const [testingStatus, setTestingStatus] = useState<{
    isLoading: boolean;
    result?: { ok: boolean; message: string; latencyMs?: number };
  }>({ isLoading: false });

  // Class Server Status State
  const [classStatus, setClassStatus] = useState<{
    hasCustomKey: boolean;
    modelType: string;
    providerName: string;
    provider: string;
    modelName: string;
  }>({
    hasCustomKey: false,
    modelType: 'basic',
    providerName: 'Checking server status...',
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
  });

  // Class Key Form State (for CR / Admin to update server)
  const [classApiKey, setClassApiKey] = useState<string>('');
  const [classProvider, setClassProvider] = useState<ModelProviderType>('gemini');
  const [classModelName, setClassModelName] = useState<string>('gemini-2.5-flash');
  const [isSavingClass, setIsSavingClass] = useState<boolean>(false);
  const [classSaveMessage, setClassSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    message: 'Checking database...',
  });

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const current = getStoredAiSettings();
      setSettings(current);
      setSelectedPresetId(current.personalModel || 'gemini-2.5-flash');
      setTestingStatus({ isLoading: false });
      setClassSaveMessage(null);

      // Fetch live class server status
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((data) => {
          setClassStatus({
            hasCustomKey: Boolean(data.hasCustomKey),
            modelType: data.modelType || 'basic',
            providerName: data.providerName || 'Default Class Model',
            provider: data.provider || 'gemini',
            modelName: data.modelName || 'gemini-2.5-flash',
          });
          setClassProvider(data.provider || 'gemini');
          setClassModelName(data.modelName || 'gemini-2.5-flash');
        })
        .catch(() => {
          setClassStatus((prev) => ({
            ...prev,
            providerName: 'Class Server (Offline or Basic Model)',
          }));
        });

      // Fetch Supabase status
      const savedUrl = localStorage.getItem('syllabus_supabase_url') || '';
      const savedKey = localStorage.getItem('syllabus_supabase_key') || '';
      setSupabaseUrl(savedUrl);
      setSupabaseKey(savedKey);

      fetch('/api/db/test-supabase')
        .then((r) => r.json())
        .then((d) => {
          setSupabaseStatus({
            configured: d.configured,
            ok: d.ok,
            message: d.message,
          });
        })
        .catch(() => {
          setSupabaseStatus({
            configured: Boolean(savedUrl && savedKey),
            ok: false,
            message: 'Database check failed.',
          });
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPreset =
    MODEL_PRESETS.find((p) => p.id === selectedPresetId) || MODEL_PRESETS[0];
  const currentPortal = PROVIDER_PORTALS[settings.personalProvider] || PROVIDER_PORTALS.gemini;

  const handleSelectPreset = (preset: (typeof MODEL_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    const updated: StoredAiSettings = {
      ...settings,
      personalProvider: preset.provider,
      personalModel: preset.id,
      personalBaseUrl: preset.baseUrl || settings.personalBaseUrl,
    };
    setSettings(updated);
    saveStoredAiSettings(updated);
  };

  const handleSavePersonalKey = (newKey: string) => {
    const updated: StoredAiSettings = {
      ...settings,
      mode: 'personal',
      personalApiKey: newKey.trim(),
    };
    setSettings(updated);
    saveStoredAiSettings(updated);
  };

  const handleToggleMode = (mode: 'class' | 'personal') => {
    const updated: StoredAiSettings = {
      ...settings,
      mode,
    };
    setSettings(updated);
    saveStoredAiSettings(updated);
    if (onConfigUpdated) {
      onConfigUpdated({
        hasCustomKey: mode === 'personal' ? Boolean(settings.personalApiKey) : classStatus.hasCustomKey,
        modelType: mode === 'personal' ? 'personal_ai' : 'class_ai',
        providerName: mode === 'personal' ? currentPreset.name : classStatus.providerName,
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingStatus({ isLoading: true });
    const targetConfig =
      activeTab === 'personal'
        ? {
            apiKey: settings.personalApiKey,
            provider: settings.personalProvider,
            modelName: settings.personalModel,
            baseUrl: settings.personalBaseUrl,
          }
        : {
            apiKey: classApiKey,
            provider: classProvider,
            modelName: classModelName,
          };

    const res = await testAiConnection(targetConfig);
    setTestingStatus({
      isLoading: false,
      result: {
        ok: res.ok,
        message: res.ok
          ? `✓ Connected (${res.latencyMs}ms latency) - ${res.providerName}`
          : `✗ Connection failed: ${res.error}`,
        latencyMs: res.latencyMs,
      },
    });
  };

  const handleSaveClassServerConfig = async () => {
    setIsSavingClass(true);
    setClassSaveMessage(null);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: classApiKey.trim(),
          provider: classProvider,
          modelName: classModelName.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setClassStatus({
          hasCustomKey: Boolean(data.hasCustomKey),
          modelType: data.modelType || 'custom_ai',
          providerName: data.providerName,
          provider: data.provider,
          modelName: data.modelName,
        });
        setClassSaveMessage({
          type: 'success',
          text: `✓ Class default model updated to ${data.providerName}. Shared across all students.`,
        });
        setClassApiKey('');
      } else {
        setClassSaveMessage({ type: 'error', text: 'Failed to update server class key.' });
      }
    } catch (err: any) {
      setClassSaveMessage({ type: 'error', text: err.message || 'Error updating server key.' });
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleSaveSupabase = () => {
    try {
      localStorage.setItem('syllabus_supabase_url', supabaseUrl.trim());
      localStorage.setItem('syllabus_supabase_key', supabaseKey.trim());
      alert('✓ Database credentials saved locally.');
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Model and API Key Settings Modal"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 p-6 shadow-2xl text-slate-100 my-8 space-y-5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Clean, quiet academic style */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 shadow-sm shrink-0">
              <KeyRound className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 font-serif-heading">
                Model & API Key Settings
              </h3>
              <p className="text-xs text-slate-400">
                Configure your key to power pre-lecture primers, mindmaps, and classroom cache.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Segmented Control */}
        <div className="grid grid-cols-3 rounded-xl bg-slate-900/60 p-1 border border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-1.5 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'personal'
                ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Key</span>
            {settings.mode === 'personal' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('class_server')}
            className={`py-1.5 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'class_server'
                ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Class Shared</span>
            {settings.mode === 'class' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`py-1.5 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database</span>
          </button>
        </div>

        {/* TAB 1: PERSONAL STUDY KEY */}
        {activeTab === 'personal' && (
          <div className="space-y-4">
            {/* Active Mode Banner */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[11px] block">Current Browser Mode:</span>
                <span className="font-medium text-slate-200 block">
                  {settings.mode === 'personal'
                    ? `Personal Key (${currentPreset.name})`
                    : `Class Shared Key (${classStatus.providerName})`}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleMode('class')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    settings.mode === 'class'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Class Key
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode('personal')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    settings.mode === 'personal'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  My Key
                </button>
              </div>
            </div>

            {/* Provider Selector: Clean Native Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Model Provider</label>
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  const preset = MODEL_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) handleSelectPreset(preset);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-600 transition"
              >
                {MODEL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.badge} {p.freeTierAvailable ? '(Free Tier Available)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="space-y-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">{currentPortal.name} API Key</label>
                {currentPortal.url && (
                  <a
                    href={currentPortal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition underline"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="relative">
                <input
                  type={showPersonalKey ? 'text' : 'password'}
                  value={settings.personalApiKey}
                  onChange={(e) => handleSavePersonalKey(e.target.value)}
                  placeholder={currentPortal.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-slate-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPersonalKey(!showPersonalKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  aria-label="Toggle key visibility"
                >
                  {showPersonalKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {settings.personalProvider === 'custom' && (
                <div className="pt-2 space-y-1 text-xs">
                  <label className="text-[11px] text-slate-400">Endpoint Base URL</label>
                  <input
                    type="text"
                    value={settings.personalBaseUrl}
                    onChange={(e) => {
                      const updated = { ...settings, personalBaseUrl: e.target.value };
                      setSettings(updated);
                      saveStoredAiSettings(updated);
                    }}
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-slate-600"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-0.5">
                Saved locally in your browser. Never uploaded or shared with classmates.
              </p>
            </div>

            {/* Test Connection & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingStatus.isLoading || (!settings.personalApiKey && settings.personalProvider !== 'custom')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition cursor-pointer disabled:opacity-40"
              >
                {testingStatus.isLoading ? 'Testing...' : 'Test Connection'}
              </button>

              {testingStatus.result && (
                <span
                  className={`text-xs font-medium ${
                    testingStatus.result.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testingStatus.result.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLASS SHARED KEY (SERVER-HOSTED) */}
        {activeTab === 'class_server' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1 text-xs">
              <span className="text-slate-400 text-[11px] block">Server Model Status:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{classStatus.providerName}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code ${
                    classStatus.hasCustomKey
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {classStatus.hasCustomKey ? 'Active Key' : 'Default / Fallback'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Keys configured here are saved on the server so every classmate gets instant access with 0 setup.
              </p>
            </div>

            {/* Admin Key Update Form */}
            <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <label className="font-medium text-slate-300 block">
                Update Shared Class Key (CR / Admin)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Provider</label>
                  <select
                    value={classProvider}
                    onChange={(e) => setClassProvider(e.target.value as ModelProviderType)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="deepseek">DeepSeek AI</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Model Name</label>
                  <input
                    type="text"
                    value={classModelName}
                    onChange={(e) => setClassModelName(e.target.value)}
                    placeholder="gemini-2.5-flash"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Shared Server API Key</label>
                <input
                  type="password"
                  value={classApiKey}
                  onChange={(e) => setClassApiKey(e.target.value)}
                  placeholder="Paste API key to configure server default"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSaveClassServerConfig}
                  disabled={isSavingClass || !classApiKey.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  {isSavingClass ? 'Saving...' : 'Save to Class Server'}
                </button>

                {classSaveMessage && (
                  <span
                    className={`text-xs ${
                      classSaveMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {classSaveMessage.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATABASE CONFIGURATION */}
        {activeTab === 'supabase' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1 text-xs">
              <span className="text-slate-400 text-[11px] block">Database Status:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  {supabaseStatus.configured ? 'Connected' : 'Offline / Local Cache Active'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code ${
                    supabaseStatus.ok
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {supabaseStatus.ok ? 'Synced' : 'Local'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                All study materials are persistently stored on the server disk cache and optionally mirrored to PostgreSQL.
              </p>
            </div>

            <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Postgres / Supabase Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Anon Public Key</label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showSupabaseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition cursor-pointer"
                >
                  Save Database Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>SyllabusOS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
