import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running inside installed standalone WebAPK, display an active badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5 text-neutral-300" />
        <span>WebAPK Installed</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop Install Prompt flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        disabled={installing}
        title="Install as Android WebAPK or Desktop Application"
        className={`flex items-center gap-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium shadow-sm hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs md:text-sm'
        }`}
      >
        <Smartphone className="w-4 h-4 text-neutral-300" />
        <span>{installing ? 'Installing...' : '📲 Install WebAPK'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 font-medium transition cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-neutral-300" />
          <span>Install WebAPK on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-5">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-750">
                  <Share className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Step 1:</span> Tap the <strong className="text-neutral-200">Share</strong> button at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-750">
                  <PlusSquare className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Step 2:</span> Scroll down and tap <strong className="text-neutral-200">"Add to Home Screen"</strong>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button on desktop/other browsers showing install instructions
  return (
    <button
      onClick={() => {
        alert?.('To install on your phone or computer: click the "Install" or "Add to Home screen" icon in your browser URL address bar!');
      }}
      className={`hidden md:flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
      <span>WebAPK Ready</span>
    </button>
  );
};
