import {
  ProviderType,
  TaskCategory,
  IAIProviderAdapter,
  PROVIDER_CAPABILITY_REGISTRY,
} from './providerTypes.js';
import {
  GeminiAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  SandboxAdapter,
} from './providerAdapters.js';
import { byokSecurityService } from './byokSecurityService.js';

export interface ProviderSelectionRequest {
  studentId: string;
  preferredProvider?: ProviderType;
  preferredModel?: string;
  taskCategory: TaskCategory;
  directApiKey?: string;
  directBaseUrl?: string;
}

export interface ProviderSelectionResult {
  adapter: IAIProviderAdapter | null;
  selectedProvider: ProviderType;
  selectedModel: string;
  isPersonalKey: boolean;
  isFallback: boolean;
  errorCode?: 'API_KEY_REQUIRED' | 'CAPABILITY_MISMATCH' | 'UNSUPPORTED_PROVIDER';
  message?: string;
}

export class ProviderSelectionService {
  /**
   * Selects an authorized AI provider adapter strictly obeying student permissions and capabilities.
   * NEVER silently uses an application-level paid key to serve another student.
   */
  public async selectProvider(request: ProviderSelectionRequest): Promise<ProviderSelectionResult> {
    const { studentId, preferredProvider, preferredModel, taskCategory, directApiKey, directBaseUrl } = request;

    // 1. Direct API key provided in request headers/body
    if (directApiKey && directApiKey.trim().length > 5) {
      const cleanKey = directApiKey.trim();
      let detectedProvider = preferredProvider || 'gemini';

      if (!preferredProvider || preferredProvider === 'custom') {
        if (cleanKey.startsWith('sk-ant-')) detectedProvider = 'claude';
        else if (cleanKey.startsWith('AIzaSy')) detectedProvider = 'gemini';
        else if (cleanKey.startsWith('sk-')) detectedProvider = 'openai';
        else if (cleanKey.startsWith('gsk_')) detectedProvider = 'groq';
        else if (cleanKey.includes('SANDBOX') || cleanKey.includes('TEST')) detectedProvider = 'sandbox';
      }

      const adapter = this.createAdapter(detectedProvider, cleanKey, directBaseUrl);
      const cap = PROVIDER_CAPABILITY_REGISTRY[detectedProvider];
      const model = preferredModel || cap?.defaultModel || 'default';

      // Check capability match for requested task
      if (taskCategory === 'embedding' && !cap?.supportsEmbeddings) {
        return {
          adapter: null,
          selectedProvider: detectedProvider,
          selectedModel: model,
          isPersonalKey: true,
          isFallback: false,
          errorCode: 'CAPABILITY_MISMATCH',
          message: `${cap?.displayName || detectedProvider} does not support vector embeddings.`,
        };
      }

      return {
        adapter,
        selectedProvider: detectedProvider,
        selectedModel: model,
        isPersonalKey: true,
        isFallback: false,
      };
    }

    // 2. Check BYOK Vault for student's configured keys
    const vaultKey = await byokSecurityService.getDecryptedKey(
      studentId,
      studentId,
      preferredProvider
    );

    if (vaultKey && vaultKey.apiKey) {
      const provider = vaultKey.provider;
      const model = preferredModel || vaultKey.modelName || PROVIDER_CAPABILITY_REGISTRY[provider]?.defaultModel;
      const cap = PROVIDER_CAPABILITY_REGISTRY[provider];

      // Capability check
      if (taskCategory === 'embedding' && !cap?.supportsEmbeddings) {
        // If student explicitly allows fallback, check if they configured a fallback embedding provider
        if (vaultKey.allowFallback) {
          const fallbackKey = await byokSecurityService.getDecryptedKey(studentId, studentId, 'gemini');
          if (fallbackKey && fallbackKey.apiKey) {
            return {
              adapter: this.createAdapter('gemini', fallbackKey.apiKey, fallbackKey.baseUrl),
              selectedProvider: 'gemini',
              selectedModel: PROVIDER_CAPABILITY_REGISTRY.gemini.defaultModel,
              isPersonalKey: true,
              isFallback: true,
            };
          }
        }

        return {
          adapter: null,
          selectedProvider: provider,
          selectedModel: model,
          isPersonalKey: true,
          isFallback: false,
          errorCode: 'CAPABILITY_MISMATCH',
          message: `${cap?.displayName || provider} does not support vector embeddings.`,
        };
      }

      return {
        adapter: this.createAdapter(provider, vaultKey.apiKey, vaultKey.baseUrl),
        selectedProvider: provider,
        selectedModel: model,
        isPersonalKey: true,
        isFallback: false,
      };
    }

    // 3. Testing / Sandbox check
    if (directApiKey && (directApiKey.includes('SANDBOX') || directApiKey.includes('TEST'))) {
      return {
        adapter: new SandboxAdapter(),
        selectedProvider: 'sandbox',
        selectedModel: 'sandbox-standard',
        isPersonalKey: true,
        isFallback: false,
      };
    }

    // 4. Student has NO key configured.
    // Strictly forbid silently using developer/server keys to pay for another student!
    return {
      adapter: null,
      selectedProvider: 'gemini',
      selectedModel: 'none',
      isPersonalKey: false,
      isFallback: false,
      errorCode: 'API_KEY_REQUIRED',
      message: 'A personal AI API key is required to synthesize new explanations. Configure your key in Tutor Settings, or browse verified answers in the Shared Classroom Library.',
    };
  }

  /**
   * Factory for creating provider adapters
   */
  public createAdapter(provider: ProviderType, apiKey: string, baseUrl?: string): IAIProviderAdapter {
    switch (provider) {
      case 'gemini':
        return new GeminiAdapter(apiKey);
      case 'openai':
      case 'groq':
      case 'openrouter':
      case 'deepseek':
      case 'custom':
        return new OpenAIAdapter(apiKey, baseUrl);
      case 'claude':
        return new AnthropicAdapter(apiKey);
      case 'sandbox':
      default:
        return new SandboxAdapter();
    }
  }
}

export const providerSelectionService = new ProviderSelectionService();
