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
  Cpu,
  Layers,
  Database,
  ArrowRight,
  Server,
  User,
  Users,
  Zap,
  Activity,
  Check,
  RotateCcw,
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
    providerName: 'Loading class status...',
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

      // Fetch server class status
      fetch('/api/ai/config')
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setClassStatus({
              hasCustomKey: Boolean(data.hasCustomKey),
              modelType: data.modelType || 'basic',
              providerName: data.providerName || 'Built-in Academic Model (Free)',
              provider: data.provider || 'gemini',
              modelName: data.modelName || 'gemini-2.5-flash',
            });
            setClassProvider(data.provider || 'gemini');
            setClassModelName(data.modelName || 'gemini-2.5-flash');
          }
        })
        .catch(() => {});

      // Fetch Supabase status
      try {
        setSupabaseUrl(localStorage.getItem('syllabus_supabase_url') || '');
        setSupabaseKey(localStorage.getItem('syllabus_supabase_key') || '');
      } catch {}

      fetch('/api/supabase/status')
        .then((r) => r.json())
        .then((data) => {
          if (data) setSupabaseStatus(data);
        })
        .catch(() => {
          setSupabaseStatus({ configured: false, ok: false, message: 'Offline mode active.' });
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPortal = PROVIDER_PORTALS[settings.personalProvider] || PROVIDER_PORTALS.gemini;
  const currentPreset = MODEL_PRESETS.find((p) => p.id === selectedPresetId) || MODEL_PRESETS[0];

  const handleSelectPreset = (preset: (typeof MODEL_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    const updated: StoredAiSettings = {
      ...settings,
      mode: 'personal',
      personalProvider: preset.provider,
      personalModel: preset.id,
      personalBaseUrl: preset.provider === 'custom' ? 'http://localhost:11434/v1' : settings.personalBaseUrl,
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
          ? `✓ Operational! Latency: ${res.latencyMs}ms (${res.providerName})`
          : `✗ Test failed: ${res.error}`,
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
          text: `✓ Class default model updated to ${data.providerName}. All students without a personal key will now use this!`,
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
      alert('✓ Supabase credentials saved locally. Ensure you also add them to Render Environment variables.');
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl text-neutral-100 my-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">AI Model Hub & Key Center</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Multi-Model
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Choose models for personal study or configure shared access for your whole class.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-2 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'personal'
                ? 'bg-neutral-850 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Personal Model</span>
            {settings.mode === 'personal' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('class_server')}
            className={`py-2 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'class_server'
                ? 'bg-neutral-850 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Class Shared Key</span>
            {settings.mode === 'class' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`py-2 px-3 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-neutral-850 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cloud DB</span>
          </button>
        </div>

        {/* TAB 1: PERSONAL MODEL */}
        {activeTab === 'personal' && (
          <div className="space-y-4 animate-fade-in">
            {/* Mode Toggle Banner */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Current Active Engine for this Browser</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {settings.mode === 'personal'
                    ? `Using Personal Key: ${currentPreset.name} (${currentPreset.badge})`
                    : `Using Class Shared Key: ${classStatus.providerName}`}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleToggleMode('class')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    settings.mode === 'class'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Class Key
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode('personal')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    settings.mode === 'personal'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  My Key
                </button>
              </div>
            </div>

            {/* Model Presets Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-300">Choose Your AI Model</label>
                <span className="text-[11px] text-neutral-500">Pick from top providers</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {MODEL_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 w-full mb-1">
                        <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-auto">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            preset.freeTierAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5 bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentPortal.name} API Key</span>
                </label>
                {currentPortal.url && (
                  <a
                    href={currentPortal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
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
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPersonalKey(!showPersonalKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                  aria-label="Toggle visibility"
                >
                  {showPersonalKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {settings.personalProvider === 'custom' && (
                <div className="mt-2 space-y-1">
                  <label className="text-[11px] text-neutral-400">Local Endpoint Base URL</label>
                  <input
                    type="text"
                    value={settings.personalBaseUrl}
                    onChange={(e) => {
                      const updated = { ...settings, personalBaseUrl: e.target.value };
                      setSettings(updated);
                      saveStoredAiSettings(updated);
                    }}
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">
                🔒 Your personal key is stored only inside your browser (never saved on the server). It is transmitted
                securely over HTTPS to answer your syllabus and assignment questions.
              </p>
            </div>

            {/* Test Connection Result */}
            {testingStatus.result && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testingStatus.result.ok
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}
              >
                {testingStatus.result.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{testingStatus.result.message}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  handleSavePersonalKey('');
                  handleToggleMode('class');
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Class Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingStatus.isLoading || (!settings.personalApiKey && settings.personalProvider !== 'custom')}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Activity className={`w-3.5 h-3.5 ${testingStatus.isLoading ? 'animate-spin' : 'text-indigo-400'}`} />
                  <span>{testingStatus.isLoading ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLASS SHARED KEY (SERVER-WIDE) */}
        {activeTab === 'class_server' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-200">Shared Class Key Architecture</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                When you configure a shared key here, it is saved on the Render server. Any classmate or student who
                opens the website <strong>without</strong> their own API key automatically uses this model for free!
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[11px] text-neutral-400">Current Server Status:</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    classStatus.hasCustomKey
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {classStatus.providerName}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-300">Set New Shared Server Key</label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1 block">Provider</label>
                  <select
                    value={classProvider}
                    onChange={(e) => setClassProvider(e.target.value as ModelProviderType)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="gemini">Google Gemini (Recommended for Class)</option>
                    <option value="groq">Groq Cloud (Fast Free Llama 3.3)</option>
                    <option value="deepseek">DeepSeek AI</option>
                    <option value="openai">OpenAI (GPT-4o Mini)</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1 block">Model Name</label>
                  <input
                    type="text"
                    value={classModelName}
                    onChange={(e) => setClassModelName(e.target.value)}
                    placeholder="gemini-2.5-flash"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1 block">API Key</label>
                <input
                  type="password"
                  value={classApiKey}
                  onChange={(e) => setClassApiKey(e.target.value)}
                  placeholder="Paste class API key (e.g. AIzaSy... or gsk_...)"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {classSaveMessage && (
                <p
                  className={`text-xs p-2.5 rounded-lg border ${
                    classSaveMessage.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {classSaveMessage.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveClassServerConfig}
                  disabled={isSavingClass || !classApiKey.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingClass ? 'Saving to Server...' : 'Save Class Server Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD DATABASE */}
        {activeTab === 'supabase' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>PostgreSQL Cloud Database</span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    supabaseStatus.configured
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {supabaseStatus.configured ? 'Configured' : 'In-Memory / Static Mode'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Connect Neon or Supabase to persist your syllabus units, past question papers, and assignments forever.
              </p>
            </div>

            <div className="space-y-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
              <div>
                <label className="text-[11px] text-neutral-400 mb-1 block">Supabase Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1 block">Supabase Anon Key</label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-750 text-white font-mono focus:outline-none focus:border-cyan-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                  >
                    {showSupabaseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition cursor-pointer"
                >
                  Save DB Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
