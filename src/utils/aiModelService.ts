export type ModelProviderType =
  | 'auto'
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'custom'
  | 'sandbox';

export type AIMode = 'class' | 'personal';

export interface ModelPreset {
  id: string;
  name: string;
  provider: ModelProviderType;
  badge: string;
  tagline: string;
  freeTierAvailable: boolean;
  developerPortalUrl: string;
  keyPrefix: string;
  keyPlaceholder: string;
  baseUrl?: string;
}

export interface StoredAiSettings {
  mode: AIMode;
  personalProvider: ModelProviderType;
  personalModel: string;
  personalApiKey: string;
  personalBaseUrl: string;
}

export const PROVIDER_PORTALS: Record<
  ModelProviderType,
  { name: string; url: string; label: string; placeholder: string; prefix: string; hint: string }
> = {
  gemini: {
    name: 'Google Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    label: 'Google AI Studio',
    placeholder: 'AIzaSy...',
    prefix: 'AIzaSy',
    hint: 'Free API key with generous tier from Google AI Studio.',
  },
  openai: {
    name: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    label: 'OpenAI Dashboard',
    placeholder: 'sk-proj-... or sk-...',
    prefix: 'sk-',
    hint: 'Standard OpenAI API key for GPT-4o and o3-mini.',
  },
  claude: {
    name: 'Anthropic Claude',
    url: 'https://console.anthropic.com/',
    label: 'Anthropic Console',
    placeholder: 'sk-ant-api03-...',
    prefix: 'sk-ant-',
    hint: 'Anthropic API key for Claude 3.5 and 3.7 Sonnet.',
  },
  deepseek: {
    name: 'DeepSeek AI',
    url: 'https://platform.deepseek.com/',
    label: 'DeepSeek Platform',
    placeholder: 'sk-...',
    prefix: 'sk-',
    hint: 'Ultra-low cost API keys for DeepSeek V3 and R1.',
  },
  groq: {
    name: 'Groq Cloud',
    url: 'https://console.groq.com/keys',
    label: 'Groq Console',
    placeholder: 'gsk_...',
    prefix: 'gsk_',
    hint: 'Generous free tier with ultra-fast 300+ tokens/sec inference.',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/keys',
    label: 'OpenRouter Keys',
    placeholder: 'sk-or-v1-...',
    prefix: 'sk-or-',
    hint: 'Single key to access 100+ AI models including DeepSeek, Claude, and Llama.',
  },
  custom: {
    name: 'Local / Ollama / Custom',
    url: 'https://ollama.com',
    label: 'Ollama Documentation',
    placeholder: 'Optional API Key or Token',
    prefix: 'Any',
    hint: 'Run completely free on your laptop via Ollama or LM Studio.',
  },
  auto: {
    name: 'Auto-Detect',
    url: '',
    label: 'Any Provider',
    placeholder: 'Paste any key (sk-, AIzaSy, gsk_, sk-or-)',
    prefix: 'Any',
    hint: 'Auto-detects the provider based on your key format.',
  },
  sandbox: {
    name: 'Testing Sandbox',
    url: '',
    label: 'Simulator',
    placeholder: 'SANDBOX-KEY',
    prefix: 'TEST',
    hint: 'Simulated testing mode with realistic academic responses.',
  },
};

export const MODEL_PRESETS: ModelPreset[] = [
  // Gemini
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    badge: 'Recommended',
    tagline: 'Google latest ultra-fast model with top academic comprehension & low latency.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIzaSy',
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    badge: 'Fast',
    tagline: 'Stable low-latency Google Flash model for rapid student queries.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIzaSy',
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    badge: 'Deep Reasoning',
    tagline: 'Deep 2M token context for massive textbooks and notes.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIzaSy',
    keyPlaceholder: 'AIzaSy...',
  },

  // OpenAI
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    badge: 'Economical',
    tagline: 'High intelligence and super fast for college Q&A.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    badge: 'Flagship',
    tagline: 'OpenAI best multimodal flagship model for complex math & diagrams.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    badge: 'Math & STEM',
    tagline: 'Specialized deliberate chain-of-thought reasoning for algorithms & OS.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
  },

  // Anthropic Claude
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    badge: 'Academic Gold',
    tagline: 'Highest academic prose quality and university-level answers.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://console.anthropic.com/',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'claude',
    badge: 'Hybrid Thinker',
    tagline: 'Latest hybrid thinking model for deep university problems.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://console.anthropic.com/',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    badge: 'Quick Notes',
    tagline: 'Lightning quick summaries and rapid revision points.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://console.anthropic.com/',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
  },

  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    badge: 'Best Value',
    tagline: 'State-of-the-art capability at a fraction of standard cost.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://platform.deepseek.com/',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    badge: 'Open Reasoning',
    tagline: 'Detailed Chain-of-Thought reasoning for university derivations.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://platform.deepseek.com/',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
  },

  // Groq Cloud
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    badge: 'Free Tier & Ultra Fast',
    tagline: '300+ tokens/second. Meta smartest open model on free Groq Cloud.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B (Groq)',
    provider: 'groq',
    badge: 'Fast Reasoning',
    tagline: 'R1 reasoning distillation served at breakthrough Groq hardware speeds.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_...',
  },

  // OpenRouter
  {
    id: 'deepseek/deepseek-r1',
    name: 'OpenRouter: DeepSeek R1',
    provider: 'openrouter',
    badge: 'Hub',
    tagline: 'DeepSeek R1 accessed via OpenRouter single unified API.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'OpenRouter: Claude 3.5 Sonnet',
    provider: 'openrouter',
    badge: 'Hub',
    tagline: 'Claude 3.5 Sonnet via OpenRouter without separate Anthropic account.',
    freeTierAvailable: false,
    developerPortalUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
  },

  // Local / Custom
  {
    id: 'llama3:latest',
    name: 'Ollama Local (11434)',
    provider: 'custom',
    badge: '100% Free Offline',
    tagline: 'Runs completely on your laptop hardware. 100% private, zero cost.',
    freeTierAvailable: true,
    developerPortalUrl: 'https://ollama.com',
    keyPrefix: 'Local',
    keyPlaceholder: 'Not needed for Ollama',
  },
];

const SETTINGS_KEY = 'm2029_ai_settings_v2';
const EVENT_NAME = 'm2029-ai-settings-changed';

export function getStoredAiSettings(): StoredAiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    // Migration from old keys
    const oldKey = localStorage.getItem('syllabus_ai_api_key') || localStorage.getItem('syllabus_gemini_key') || '';
    const oldProvider = (localStorage.getItem('syllabus_ai_provider') as ModelProviderType) || 'gemini';
    const oldModel = localStorage.getItem('syllabus_ai_model') || 'gemini-2.5-flash';
    const oldBaseUrl = localStorage.getItem('syllabus_ai_base_url') || '';

    return {
      mode: oldKey ? 'personal' : 'class',
      personalProvider: oldProvider,
      personalModel: oldModel,
      personalApiKey: oldKey,
      personalBaseUrl: oldBaseUrl,
    };
  } catch {
    return {
      mode: 'class',
      personalProvider: 'gemini',
      personalModel: 'gemini-2.5-flash',
      personalApiKey: '',
      personalBaseUrl: '',
    };
  }
}

export function saveStoredAiSettings(settings: StoredAiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Keep old keys synced for backward compatibility
    localStorage.setItem('syllabus_ai_api_key', settings.personalApiKey || '');
    localStorage.setItem('syllabus_ai_provider', settings.personalProvider || 'gemini');
    localStorage.setItem('syllabus_ai_model', settings.personalModel || 'gemini-2.5-flash');
    localStorage.setItem('syllabus_ai_base_url', settings.personalBaseUrl || '');
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // storage unavailable
  }
}

export function subscribeToAiSettings(callback: (settings: StoredAiSettings) => void): () => void {
  const handler = () => {
    callback(getStoredAiSettings());
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * Returns payload object to merge into fetch requests for AI endpoints.
 * If user configured a personal API key or endpoint, passes userAiConfig to invoke that exact model.
 * If in Class Mode with no personal key, returns empty object (server uses class shared key).
 */
export function getAiRequestPayload(): {
  userAiConfig?: {
    apiKey: string;
    provider: ModelProviderType;
    modelName: string;
    baseUrl: string;
  };
} {
  const settings = getStoredAiSettings();
  const hasKey = Boolean(settings.personalApiKey && settings.personalApiKey.trim());
  const hasBaseUrl = Boolean(settings.personalBaseUrl && settings.personalBaseUrl.trim());

  // If user entered a key or URL, or mode is personal, pass userAiConfig
  if ((settings.mode === 'personal' || hasKey || hasBaseUrl) && (hasKey || hasBaseUrl)) {
    return {
      userAiConfig: {
        apiKey: (settings.personalApiKey || '').trim(),
        provider: settings.personalProvider || 'auto',
        modelName: settings.personalModel || 'gemini-2.0-flash',
        baseUrl: (settings.personalBaseUrl || '').trim(),
      },
    };
  }
  return {};
}

export function getActiveModelInfo(): {
  isPersonal: boolean;
  provider: ModelProviderType;
  modelName: string;
  displayName: string;
  badge: string;
} {
  const settings = getStoredAiSettings();
  const hasKey = Boolean(settings.personalApiKey && settings.personalApiKey.trim());
  const hasBaseUrl = Boolean(settings.personalBaseUrl && settings.personalBaseUrl.trim());
  const isPersonal = (settings.mode === 'personal' || hasKey || hasBaseUrl) && (hasKey || hasBaseUrl);

  if (isPersonal) {
    const preset = MODEL_PRESETS.find(
      (p) => p.id === settings.personalModel || (p.provider === settings.personalProvider && p.id.includes(settings.personalModel))
    );
    const portal = PROVIDER_PORTALS[settings.personalProvider];
    const providerName = portal ? portal.name : settings.personalProvider;
    const modelName = settings.personalModel || 'Custom';
    return {
      isPersonal: true,
      provider: settings.personalProvider,
      modelName,
      displayName: preset ? preset.name : `${providerName} (${modelName})`,
      badge: 'Personal Key',
    };
  }

  return {
    isPersonal: false,
    provider: 'gemini',
    modelName: 'gemini-2.0-flash',
    displayName: 'Academic Engine',
    badge: 'Class Shared',
  };
}


/**
 * Test an AI configuration directly against the backend test endpoint
 */
export async function testAiConnection(config: {
  apiKey?: string;
  provider?: ModelProviderType;
  modelName?: string;
  baseUrl?: string;
}): Promise<{ ok: boolean; reply?: string; latencyMs?: number; error?: string; providerName?: string }> {
  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAiConfig: config }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status} error` };
    }
    return {
      ok: true,
      reply: data.reply,
      latencyMs: data.latencyMs,
      providerName: data.providerName,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network connection failed' };
  }
}
