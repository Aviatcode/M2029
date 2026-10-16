import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, X, Download, Share, PlusSquare } from 'lucide-react';

const STORAGE_KEY = 'syllabus_pwa_first_time_prompt_seen';

export const PWAInstallPopup: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // If already running in installed standalone WebAPK mode, never show popup
    if (isInstalled) {
      return;
    }

    // Check if the first-time user has already seen/dismissed this popup
    try {
      const alreadySeen = localStorage.getItem(STORAGE_KEY);
      if (alreadySeen === 'true') {
        return;
      }
    } catch {
      // localStorage error fallback
    }

    // Reveal after 10s only if user hasn't dismissed it
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (isInstallable) {
      setInstalling(true);
      try {
        const success = await install();
        if (success) {
          handleDismiss();
        }
      } finally {
        setInstalling(false);
      }
    } else {
      // Fallback for standard browsers
      alert(
        'To install SyllabusOS on your phone or computer, tap the "Install" or "Add to Home Screen" option in your browser menu/address bar.'
      );
      handleDismiss();
    }
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <>
      {/* Floating Quiet Install Banner */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 max-w-sm w-[calc(100vw-1.5rem)] sm:w-88 animate-fade-in">
        <div className="relative rounded-md bg-slate-900 border border-slate-800 p-3.5 shadow-xl text-slate-100">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="absolute top-2.5 right-2.5 p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-5">
            <div className="w-7 h-7 rounded bg-slate-950 border border-slate-800 text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-sans-ui font-semibold text-xs text-slate-100">Install SyllabusOS</span>
                <span className="academic-tag text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-300 border border-neutral-700">
                  WebAPK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans-ui leading-relaxed">
                Add to home screen or desktop for 1-tap offline syllabus access and faster reading.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-800/60 font-sans-ui text-xs">
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 transition cursor-pointer text-[11px]"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 text-[11px] font-medium transition cursor-pointer"
            >
              <Download className="w-3 h-3 text-neutral-300" />
              <span>{installing ? 'Installing...' : 'Install'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => {
                  setShowIOSGuide(false);
                  handleDismiss();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-5">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-750">
                <Share className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-white">Step 1:</span> Tap the{' '}
                  <strong className="text-neutral-200">Share</strong> button at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-750">
                <PlusSquare className="w-4 h-4 text-neutral-300 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-white">Step 2:</span> Scroll down and tap{' '}
                  <strong className="text-neutral-200">"Add to Home Screen"</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-sm font-semibold text-white transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
