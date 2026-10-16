export type BackgroundType =
  | 'college-doodles' // Default: High-res academic chalkboard doodle wallpaper
  | 'college-vector'  // Repeating SVG academic doodle tile
  | 'grid'            // Technical engineering grid
  | 'dots'            // Subtle dot matrix
  | 'solid'           // Pure minimalist dark
  | 'custom';         // User uploaded file or custom URL

export interface BackgroundConfig {
  type: BackgroundType;
  customUrl?: string;
  opacity: number; // 0.05 to 0.60
  blur: number;    // 0 to 10 px
}

const STORAGE_KEY = 'syllabus_background_config';

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  type: 'college-doodles',
  opacity: 0.16,
  blur: 0,
};

export const BACKGROUND_PRESETS: {
  id: BackgroundType;
  name: string;
  badge?: string;
  description: string;
  previewClass?: string;
}[] = [
  {
    id: 'college-doodles',
    name: 'College Doodles Collection',
    badge: 'Default',
    description: 'Chalkboard-style university doodles: textbooks, mortarboards, formulas, flasks, and code.',
  },
  {
    id: 'college-vector',
    name: 'Blueprint Vector Pattern',
    description: 'Repeating fine-line vector academic icons and STEM symbols.',
  },
  {
    id: 'grid',
    name: 'Engineering Grid',
    description: 'Precision technical blueprint grid lines for focused analytical work.',
  },
  {
    id: 'dots',
    name: 'Matrix Dot Grid',
    description: 'Minimalist dot matrix pattern for modern developer workspace aesthetics.',
  },
  {
    id: 'solid',
    name: 'Clean Pitch Solid',
    description: 'Zero background illustration. Pure minimalist solid dark surface.',
  },
  {
    id: 'custom',
    name: 'Custom Wallpaper',
    badge: 'Custom',
    description: 'Upload your own image or paste a wallpaper URL of your choice.',
  },
];

export function getStoredBackgroundConfig(): BackgroundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BACKGROUND_CONFIG;
    const parsed = JSON.parse(raw) as Partial<BackgroundConfig>;
    return {
      type: parsed.type || DEFAULT_BACKGROUND_CONFIG.type,
      customUrl: parsed.customUrl,
      opacity: typeof parsed.opacity === 'number' ? parsed.opacity : DEFAULT_BACKGROUND_CONFIG.opacity,
      blur: typeof parsed.blur === 'number' ? parsed.blur : DEFAULT_BACKGROUND_CONFIG.blur,
    };
  } catch {
    return DEFAULT_BACKGROUND_CONFIG;
  }
}

export function saveBackgroundConfig(config: BackgroundConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // LocalStorage quota may fail on large base64; gracefully catch
  }
}
