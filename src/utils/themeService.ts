export type UIMode = 'white' | 'black';

export interface ThemeConfig {
  id: string;
  name: string;
  mode: UIMode;
  description: string;
  badge?: string;
  colors: {
    bg: string;
    card: string;
    border: string;
    accent: string;
    text: string;
  };
}

export const THEMES: ThemeConfig[] = [
  // -------------------------------------------------------------
  // BLACK UI THEMES (Dark Mode Variations)
  // -------------------------------------------------------------
  {
    id: 'midnight',
    name: 'Midnight Slate',
    mode: 'black',
    description: 'Deep cosmic slate with electric cyan highlights and optimal contrast.',
    badge: 'Default Dark',
    colors: {
      bg: '#090d16',
      card: '#0f172a',
      border: '#1e293b',
      accent: '#06b6d4',
      text: '#f8fafc',
    },
  },
  {
    id: 'oled',
    name: 'OLED Pure Black',
    mode: 'black',
    description: 'Pitch black #000000 aesthetic. High contrast and maximum battery saver.',
    badge: 'OLED',
    colors: {
      bg: '#000000',
      card: '#0a0a0a',
      border: '#18181b',
      accent: '#38bdf8',
      text: '#ffffff',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    mode: 'black',
    description: 'Cosmic obsidian with vivid electric purple and radiant neon glow.',
    badge: 'Neon',
    colors: {
      bg: '#070312',
      card: '#120a26',
      border: '#211342',
      accent: '#a855f7',
      text: '#faf7ff',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Obsidian',
    mode: 'black',
    description: 'Deep forest terminal with soothing mint jade. Gentle on the eyes.',
    badge: 'Matrix',
    colors: {
      bg: '#020c08',
      card: '#051a11',
      border: '#0c2e1f',
      accent: '#10b981',
      text: '#ecfdf5',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Velvet',
    mode: 'black',
    description: 'Deep midnight wine palette with luminous rose crimson accents.',
    badge: 'Velvet',
    colors: {
      bg: '#0d0408',
      card: '#1a0811',
      border: '#2e1020',
      accent: '#f43f5e',
      text: '#fff1f8',
    },
  },

  // -------------------------------------------------------------
  // WHITE UI THEMES (Light Mode Variations)
  // -------------------------------------------------------------
  {
    id: 'paper',
    name: 'Pure Paper White',
    mode: 'white',
    description: 'Clean studio white with crisp charcoal typography and sky cyan accents.',
    badge: 'Studio White',
    colors: {
      bg: '#f1f5f9',
      card: '#ffffff',
      border: '#e2e8f0',
      accent: '#0284c7',
      text: '#020617',
    },
  },
  {
    id: 'sepia',
    name: 'Warm Sepia Paper',
    mode: 'white',
    description: 'Parchment book tone with warm amber accents. Zero eye strain for long study.',
    badge: 'Eye Care',
    colors: {
      bg: '#f4eee5',
      card: '#faf7f2',
      border: '#e7ded0',
      accent: '#d97706',
      text: '#151009',
    },
  },
  {
    id: 'nord',
    name: 'Nordic Snow',
    mode: 'white',
    description: 'Cool arctic frost white with sharp cobalt blue contrast.',
    badge: 'Arctic',
    colors: {
      bg: '#edf2f7',
      card: '#f8fafc',
      border: '#e2e8f0',
      accent: '#2563eb',
      text: '#0b1329',
    },
  },
  {
    id: 'mint',
    name: 'Mint Porcelain',
    mode: 'white',
    description: 'Fresh botanical porcelain with refreshing sage and emerald tones.',
    badge: 'Sage',
    colors: {
      bg: '#eaf5ee',
      card: '#f6fbf8',
      border: '#d6eadc',
      accent: '#059669',
      text: '#05150a',
    },
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    mode: 'white',
    description: 'Delicate warm blush white with radiant coral rose accents.',
    badge: 'Blush',
    colors: {
      bg: '#faedf1',
      card: '#fdf8f9',
      border: '#f5dae4',
      accent: '#e11d48',
      text: '#1c030d',
    },
  },
];

const STORAGE_MODE_KEY = 'syllabus_ui_mode';
const STORAGE_THEME_KEY = 'syllabus_theme_id';

export function getStoredThemeSettings(): { mode: UIMode; themeId: string } {
  try {
    const storedMode = (localStorage.getItem(STORAGE_MODE_KEY) as UIMode) || 'black';
    const validMode: UIMode = storedMode === 'white' ? 'white' : 'black';

    const storedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    const fallbackTheme = validMode === 'white' ? 'paper' : 'midnight';

    const matched = THEMES.find((t) => t.id === storedTheme && t.mode === validMode);
    return {
      mode: validMode,
      themeId: matched ? matched.id : fallbackTheme,
    };
  } catch {
    return { mode: 'black', themeId: 'midnight' };
  }
}

export function applyTheme(mode: UIMode, themeId: string) {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    localStorage.setItem(STORAGE_THEME_KEY, themeId);
  } catch {
    // ignore
  }

  const root = document.documentElement;
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-theme', themeId);
}

export function initTheme() {
  const { mode, themeId } = getStoredThemeSettings();
  applyTheme(mode, themeId);
}
