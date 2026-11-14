/**
 * Multi-Provider AI Architecture & Capability Registry
 *
 * Defines provider-agnostic abstractions, capability registries, token accounting,
 * and generation options across supported AI providers (Gemini, OpenAI, Anthropic Claude,
 * Groq, OpenRouter, DeepSeek, and Custom Endpoints).
 */

export type ProviderType =
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'groq'
  | 'openrouter'
  | 'deepseek'
  | 'custom'
  | 'sandbox';

export type TaskCategory =
  | 'general_qa'
  | 'rag_grounded'
  | 'quick_explanation'
  | 'long_document'
  | 'structured_json'
  | 'embedding'
  | 'graph_extraction'
  | 'practice_eval';

export interface ProviderCapabilities {
  provider: ProviderType;
  displayName: string;
  supportsStreaming: boolean;
  supportsStructuredJson: boolean;
  supportsEmbeddings: boolean;
  supportsGoogleSearchGrounding: boolean;
  supportsVision: boolean;
  supportedModels: string[];
  defaultModel: string;
  embeddingDimensions?: number;
  maxContextTokens: number;
}

export const PROVIDER_CAPABILITY_REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  gemini: {
    provider: 'gemini',
    displayName: 'Google Gemini',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: true,
    supportsGoogleSearchGrounding: true,
    supportsVision: true,
    supportedModels: [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
    ],
    defaultModel: 'gemini-3.5-flash',
    embeddingDimensions: 768,
    maxContextTokens: 1048576,
  },
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: true,
    supportsGoogleSearchGrounding: false,
    supportsVision: true,
    supportedModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'o1-mini',
      'o3-mini',
    ],
    defaultModel: 'gpt-4o-mini',
    embeddingDimensions: 768,
    maxContextTokens: 128000,
  },
  claude: {
    provider: 'claude',
    displayName: 'Anthropic Claude',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: false, // Anthropic does not provide native vector embedding endpoints
    supportsGoogleSearchGrounding: false,
    supportsVision: true,
    supportedModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxContextTokens: 200000,
  },
  groq: {
    provider: 'groq',
    displayName: 'Groq Cloud',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: false,
    supportsGoogleSearchGrounding: false,
    supportsVision: false,
    supportedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    maxContextTokens: 128000,
  },
  openrouter: {
    provider: 'openrouter',
    displayName: 'OpenRouter',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: false,
    supportsGoogleSearchGrounding: false,
    supportsVision: true,
    supportedModels: [
      'deepseek/deepseek-r1',
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash-001',
    ],
    defaultModel: 'deepseek/deepseek-r1',
    maxContextTokens: 128000,
  },
  deepseek: {
    provider: 'deepseek',
    displayName: 'DeepSeek AI',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: false,
    supportsGoogleSearchGrounding: false,
    supportsVision: false,
    supportedModels: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    defaultModel: 'deepseek-chat',
    maxContextTokens: 64000,
  },
  custom: {
    provider: 'custom',
    displayName: 'Custom / Local Endpoint',
    supportsStreaming: true,
    supportsStructuredJson: true,
    supportsEmbeddings: false,
    supportsGoogleSearchGrounding: false,
    supportsVision: false,
    supportedModels: ['llama3:latest', 'mistral:latest'],
    defaultModel: 'llama3:latest',
    maxContextTokens: 32000,
  },
  sandbox: {
    provider: 'sandbox',
    displayName: 'Testing Sandbox (Simulated)',
    supportsStreaming: false,
    supportsStructuredJson: true,
    supportsEmbeddings: true,
    supportsGoogleSearchGrounding: false,
    supportsVision: false,
    supportedModels: ['sandbox-standard', 'sandbox-mock'],
    defaultModel: 'sandbox-standard',
    embeddingDimensions: 768,
    maxContextTokens: 16000,
  },
};

export interface TokenUsageReport {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  isProviderReported: boolean;
}

export interface GroundingMetadata {
  searchQueries?: string[];
  webSearchSources?: Array<{ title: string; url: string }>;
}

export interface GenerationOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  enableGrounding?: boolean;
  responseMimeType?: string;
  timeoutMs?: number;
  taskCategory?: TaskCategory;
  groundingContext?: string[];
}

export interface GenerationResult {
  text: string;
  modelUsed: string;
  provider: ProviderType;
  usage: TokenUsageReport;
  groundingMetadata?: GroundingMetadata;
  durationMs: number;
}

export interface StructuredResult<T> {
  data: T;
  modelUsed: string;
  provider: ProviderType;
  usage: TokenUsageReport;
  durationMs: number;
}

export interface IAIProviderAdapter {
  readonly providerType: ProviderType;
  isAvailable(): boolean;
  generateText(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;
  generateStructuredJson<T>(prompt: string, schemaDescription: string, options?: GenerationOptions): Promise<StructuredResult<T>>;
  generateEmbedding?(text: string): Promise<{ embedding: number[]; dimensions: number; model: string } | null>;
}
