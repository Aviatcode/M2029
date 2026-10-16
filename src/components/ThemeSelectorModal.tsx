import React, { useState, useRef } from 'react';
import {
  X,
  Palette,
  Sun,
  Moon,
  Check,
  ImageIcon,
  Upload,
  Link,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  UIMode,
  ThemeConfig,
  THEMES,
  applyTheme,
  getStoredThemeSettings,
} from '../utils/themeService';
import {
  BackgroundConfig,
  BackgroundType,
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_CONFIG,
  getStoredBackgroundConfig,
  saveBackgroundConfig,
} from '../utils/backgroundService';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged?: (mode: UIMode, themeId: string) => void;
  currentBgConfig?: BackgroundConfig;
  onBgConfigChanged?: (config: BackgroundConfig) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged,
  currentBgConfig,
  onBgConfigChanged,
}) => {
  const currentSettings = getStoredThemeSettings();
  const [activeTab, setActiveTab] = useState<'themes' | 'background'>('background');
  const [activeMode, setActiveMode] = useState<UIMode>(currentSettings.mode);
  const [activeThemeId, setActiveThemeId] = useState<string>(currentSettings.themeId);

  // Background state
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(
    currentBgConfig || getStoredBackgroundConfig()
  );
  const [customUrlInput, setCustomUrlInput] = useState<string>(
    bgConfig.type === 'custom' && bgConfig.customUrl ? bgConfig.customUrl : ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const existing = THEMES.find((t) => t.mode === mode && t.id === activeThemeId);
    const targetThemeId = existing ? existing.id : defaultTheme;
    setActiveThemeId(targetThemeId);
    applyTheme(mode, targetThemeId);
    if (onThemeChanged) {
      onThemeChanged(mode, targetThemeId);
    }
  };

  const updateBackground = (newConfig: BackgroundConfig) => {
    setBgConfig(newConfig);
    saveBackgroundConfig(newConfig);
    if (onBgConfigChanged) {
      onBgConfigChanged(newConfig);
    }
  };

  const handleSelectPreset = (type: BackgroundType) => {
    const updated: BackgroundConfig = {
      ...bgConfig,
      type,
    };
    updateBackground(updated);
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const updated: BackgroundConfig = {
      ...bgConfig,
      type: 'custom',
      customUrl: customUrlInput.trim(),
    };
    updateBackground(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomUrlInput(result);
      const updated: BackgroundConfig = {
        ...bgConfig,
        type: 'custom',
        customUrl: result,
      };
      updateBackground(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultBg = () => {
    setCustomUrlInput('');
    updateBackground(DEFAULT_BACKGROUND_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-950 border border-neutral-800 p-6 md:p-7 shadow-2xl text-neutral-100 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base md:text-lg text-neutral-100">
                  Appearance & Workspace Wallpaper
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                  Minimalist
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Customize your academic background and color palette.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'background'
                ? 'bg-neutral-900 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Background & College Doodles</span>
            {bgConfig.type === 'college-doodles' && (
              <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-300">
                Default
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'themes'
                ? 'bg-neutral-900 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color Palettes & Mode</span>
          </button>
        </div>

        {/* TAB 1: BACKGROUND & COLLEGE DOODLES */}
        {activeTab === 'background' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Presets Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-300">Background Patterns & Wallpapers</span>
                <button
                  type="button"
                  onClick={handleResetDefaultBg}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to College Doodles</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isSelected = bgConfig.type === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer relative flex flex-col justify-between gap-2 select-none ${
                        isSelected
                          ? 'bg-neutral-900 border-neutral-400 ring-1 ring-white/20 shadow-md'
                          : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700 hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-neutral-100">
                            {preset.name}
                          </span>
                          {preset.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-neutral-900 text-neutral-400 border-neutral-750">
                              {preset.badge}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-200">
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Image Upload or URL Input if Custom selected */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Custom Image Facility</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-500">Local or Web URL</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-200 font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File</span>
                </button>

                <form onSubmit={handleCustomUrlSubmit} className="flex-1 flex gap-1.5">
                  <div className="relative flex-1">
                    <Link className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="Or paste wallpaper image URL..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-neutral-600 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-white font-medium transition cursor-pointer shrink-0"
                  >
                    Apply URL
                  </button>
                </form>
              </div>

              {bgConfig.type === 'custom' && bgConfig.customUrl && (
                <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5 pt-1">
                  <span className="text-neutral-500">Active custom source:</span>
                  <span className="font-mono text-neutral-300 truncate max-w-xs">{bgConfig.customUrl}</span>
                </div>
              )}
            </div>

            {/* Opacity & Blur Sliders */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                <span>Wallpaper Fine-Tuning & Legibility Controls</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-400">Pattern Opacity</label>
                    <span className="font-mono text-neutral-200 text-[11px]">
                      {Math.round(bgConfig.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.04"
                    max="0.45"
                    step="0.02"
                    value={bgConfig.opacity}
                    onChange={(e) =>
                      updateBackground({
                        ...bgConfig,
                        opacity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-neutral-200 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>Subtle (4%)</span>
                    <span>Balanced (16%)</span>
                    <span>Bold (45%)</span>
                  </div>
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-400">Background Soft Blur</label>
                    <span className="font-mono text-neutral-200 text-[11px]">{bgConfig.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={bgConfig.blur}
                    onChange={(e) =>
                      updateBackground({
                        ...bgConfig,
                        blur: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-neutral-200 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>Sharp (0px)</span>
                    <span>Mild (3px)</span>
                    <span>Deep (6px)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLOR PALETTES & MODE */}
        {activeTab === 'themes' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Base UI Mode Selector (White vs Black) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                Base Interface Mode
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('black')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg font-medium text-xs transition cursor-pointer ${
                    activeMode === 'black'
                      ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Moon className="w-4 h-4 text-neutral-200" />
                  <span>Black UI (Dark Modes)</span>
                  <span className="text-[10px] font-mono opacity-60">5 Themes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSwitch('white')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg font-medium text-xs transition cursor-pointer ${
                    activeMode === 'white'
                      ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200'
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
                <span className="font-semibold text-neutral-300">
                  {activeMode === 'black' ? 'Available Black UI Themes' : 'Available White UI Themes'}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Instant Preview
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {currentThemes.map((theme) => {
                  const isSelected = activeThemeId === theme.id && activeMode === theme.mode;

                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme)}
                      className={`group p-3.5 rounded-xl border transition cursor-pointer relative flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-neutral-900 border-neutral-300 ring-1 ring-white/20 shadow-lg'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs md:text-sm text-neutral-100 group-hover:text-white transition">
                              {theme.name}
                            </span>
                            {theme.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-neutral-900 text-neutral-400 border-neutral-800">
                                {theme.badge}
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-200">
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          {theme.description}
                        </p>
                      </div>

                      {/* Swatch Preview Bar */}
                      <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-mono">Palette Preview:</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: theme.colors.bg }}
                            title="Background"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: theme.colors.card }}
                            title="Card Surface"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: theme.colors.border }}
                            title="Border"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ring-1 ring-white/20"
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
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-neutral-400 hidden sm:inline">
            Preferences are saved automatically in your browser.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-neutral-100 hover:bg-white text-neutral-900 font-semibold transition cursor-pointer shadow-sm text-xs ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
