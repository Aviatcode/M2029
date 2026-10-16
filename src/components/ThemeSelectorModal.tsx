import React, { useState } from 'react';
import {
  X,
  Palette,
  Sun,
  Moon,
  Check,
  Sparkles,
  Eye,
  Zap,
} from 'lucide-react';
import {
  UIMode,
  ThemeConfig,
  THEMES,
  applyTheme,
  getStoredThemeSettings,
} from '../utils/themeService';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged?: (mode: UIMode, themeId: string) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged,
}) => {
  const currentSettings = getStoredThemeSettings();
  const [activeMode, setActiveMode] = useState<UIMode>(currentSettings.mode);
  const [activeThemeId, setActiveThemeId] = useState<string>(currentSettings.themeId);

  if (!isOpen) return null;

  const currentThemes = THEMES.filter((t) => t.mode === activeMode);

  const handleSelectTheme = (theme: ThemeConfig) => {
    setActiveMode(theme.mode);
    setActiveThemeId(theme.id);
    applyTheme(theme.mode, theme.id);
    if (onThemeChanged) {
      onThemeChanged(theme.mode, theme.id);
    }
  };

  const handleModeSwitch = (mode: UIMode) => {
    setActiveMode(mode);
    const defaultTheme = mode === 'white' ? 'paper' : 'midnight';
    // If current theme is already in the mode, keep it; else switch to default
    const existing = THEMES.find((t) => t.mode === mode && t.id === activeThemeId);
    const targetThemeId = existing ? existing.id : defaultTheme;
    setActiveThemeId(targetThemeId);
    applyTheme(mode, targetThemeId);
    if (onThemeChanged) {
      onThemeChanged(mode, targetThemeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base md:text-lg text-slate-100">
                  Appearance & Themes
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  10 Styles
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between White and Black UI, with tailored color schemes for every study session.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Base UI Mode Selector (White vs Black) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Base Interface Mode
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeSwitch('black')}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg font-medium text-xs transition cursor-pointer ${
                activeMode === 'black'
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>Black UI (Dark Modes)</span>
              <span className="text-[10px] font-mono opacity-60">5 Themes</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('white')}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg font-medium text-xs transition cursor-pointer ${
                activeMode === 'white'
                  ? 'bg-slate-800 text-amber-300 font-semibold shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>White UI (Light Modes)</span>
              <span className="text-[10px] font-mono opacity-60">5 Themes</span>
            </button>
          </div>
        </div>

        {/* Theme Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              {activeMode === 'black' ? 'Available Black UI Themes' : 'Available White UI Themes'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Click any theme to apply instantly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {currentThemes.map((theme) => {
              const isSelected = activeThemeId === theme.id && activeMode === theme.mode;

              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className={`group p-3.5 rounded-xl border transition cursor-pointer relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-850 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs md:text-sm text-slate-100 group-hover:text-cyan-300 transition">
                          {theme.name}
                        </span>
                        {theme.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-slate-900 text-slate-400 border-slate-700">
                            {theme.badge}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>

                  {/* Swatch Preview Bar */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">Palette Preview:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                        style={{ backgroundColor: theme.colors.bg }}
                        title="Background"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                        style={{ backgroundColor: theme.colors.card }}
                        title="Card Surface"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                        style={{ backgroundColor: theme.colors.border }}
                        title="Border"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/30 shadow-xs ring-1 ring-white/20"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Themes are saved locally and persist automatically across visits.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition cursor-pointer shadow-sm text-xs ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
