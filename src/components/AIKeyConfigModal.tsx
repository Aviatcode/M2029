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

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/config')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.modelType) {
            setCurrentStatus(data);
          }
        })
        .catch(() => {});
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Gemini API key or click "Use Basic Model".' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        setCurrentStatus(data);
        setStatusMessage({
          type: 'success',
          text: '✓ Gemini API Key successfully saved and activated for the entire class! Deep reasoning is now live.',
        });
        setApiKey('');
        if (onConfigUpdated) onConfigUpdated(data);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to configure API key. Please check the key.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error connecting to server. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseBasicModel = async () => {
    setIsLoading(true);
    setStatusMessage(null);

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
      setStatusMessage({ type: 'error', text: 'Could not switch to basic model.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Class AI Teaching Engine</h3>
              <p className="text-xs text-slate-400">
                Shared AI intelligence for AI Teacher, Assignment Solver & Exam Predictors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Engine Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Current Teaching Engine:</span>
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
            {currentStatus.hasCustomKey ? 'CR/Student Key Active' : 'Free Basic Model'}
          </span>
        </div>

        {/* Guidance Prompt */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-cyan-950/40 border border-blue-500/30 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-200 block">
                Class AI Policy: Free for Everyone
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The <strong>Class Representative (CR) or any student</strong> can provide a free Google Gemini API key to power real-time reasoning and deep explanations for the whole class.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If no key is added, <strong>we provide a built-in basic model for all teaching</strong> with zero setup and zero tokens required.
              </p>
            </div>
          </div>
        </div>

        {/* Option 1: Provide Gemini API Key */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Class Gemini API Key (Optional)</span>
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

          <button
            type="button"
            onClick={handleSaveKey}
            disabled={isLoading || !apiKey.trim()}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Activating Key...' : 'Activate Gemini Key for Class'}</span>
          </button>
        </div>

        {/* Option 2: Fallback to Basic Free Model */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Prefer zero setup? Use the built-in basic model:
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
