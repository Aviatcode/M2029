export type AIProviderErrorCode =
  | 'API_KEY_REQUIRED'
  | 'CAPABILITY_MISMATCH'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXHAUSTED'
  | 'TIMEOUT'
  | 'PROVIDER_OUTAGE'
  | 'EMPTY_RESPONSE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ProviderErrorDetails {
  code: AIProviderErrorCode;
  provider: string;
  statusCode?: number;
  message: string;
  isRetryable: boolean;
  retryAfterSeconds?: number;
}

export class ProviderResilienceService {
  // In-flight request deduplication map to prevent concurrent duplicate model calls
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Generates a stable deduplication key for a user query
   */
  public getDeduplicationKey(classId: string, studentId: string, query: string, mode: string = 'default'): string {
    const cleanQuery = query.trim().toLowerCase().slice(0, 100);
    return `${classId}::${studentId}::${mode}::${cleanQuery}`;
  }

  /**
   * Executes a model generation request with deduplication and bounded exponential backoff retry for transient errors
   */
  public async executeWithResilience<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      providerName?: string;
    } = {}
  ): Promise<T> {
    const { maxRetries = 2, initialDelayMs = 250, providerName = 'AI Provider' } = options;

    // 1. Check if an identical request is already in-flight (Deduplication)
    if (this.inFlightRequests.has(key)) {
      console.log(`[Provider Resilience] Reusing in-flight request for: "${key}"`);
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const taskPromise = (async () => {
      let attempts = 0;
      let delay = initialDelayMs;

      while (attempts <= maxRetries) {
        try {
          return await operation();
        } catch (err: any) {
          attempts++;
          const classified = this.classifyError(err, providerName);

          // If error is not transient or we exceeded max retries, throw classified error
          if (!classified.isRetryable || attempts > maxRetries) {
            throw classified;
          }

          console.warn(
            `[Provider Resilience] Transient error on attempt ${attempts}/${maxRetries} (${classified.code}). Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      throw this.classifyError(new Error('Exceeded maximum retry attempts'), providerName);
    })();

    this.inFlightRequests.set(key, taskPromise);

    try {
      return await taskPromise;
    } finally {
      // Clean up in-flight cache
      this.inFlightRequests.delete(key);
    }
  }

  /**
   * Classifies raw provider errors into transparent, honest error categories
   */
  public classifyError(err: any, provider: string = 'AI Provider'): ProviderErrorDetails {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode || (msg.match(/status\s*(\d{3})/i)?.[1] ? Number(msg.match(/status\s*(\d{3})/i)?.[1]) : undefined);

    if (err?.code === 'API_KEY_REQUIRED' || msg.includes('api_key_required')) {
      return {
        code: 'API_KEY_REQUIRED',
        provider,
        statusCode: 401,
        message: err?.message || 'A personal AI API key is required to synthesize new explanations. Configure your key in Tutor Settings, or browse verified answers in the Shared Classroom Library.',
        isRetryable: false,
      };
    }

    if (err?.code === 'CAPABILITY_MISMATCH' || msg.includes('capability_mismatch') || msg.includes('does not support vector embeddings')) {
      return {
        code: 'CAPABILITY_MISMATCH',
        provider,
        statusCode: 400,
        message: err?.message || 'The selected provider does not support the requested capability for this task.',
        isRetryable: false,
      };
    }

    if (status === 401 || status === 403 || msg.includes('api_key_invalid') || msg.includes('unauthorized') || msg.includes('permission denied')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        provider,
        statusCode: status || 401,
        message: 'Invalid or unauthorized API key. Please check your AI API key in Tutor Settings.',
        isRetryable: false,
      };
    }

    if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('resource_exhausted')) {
      const isQuota = msg.includes('quota') || msg.includes('billing');
      return {
        code: isQuota ? 'QUOTA_EXHAUSTED' : 'RATE_LIMIT_EXCEEDED',
        provider,
        statusCode: 429,
        message: isQuota
          ? 'API quota exhausted for your personal key. Switch key in Tutor Settings or utilize cohort-cached answers.'
          : 'Rate limit exceeded. Please wait a few moments before trying again.',
        isRetryable: !isQuota,
        retryAfterSeconds: 5,
      };
    }

    if (msg.includes('abort') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline exceeded')) {
      return {
        code: 'TIMEOUT',
        provider,
        statusCode: 408,
        message: 'The AI model timed out while generating the response. Please retry with a more specific question.',
        isRetryable: true,
        retryAfterSeconds: 2,
      };
    }

    if (status === 500 || status === 502 || status === 503 || status === 504 || msg.includes('service unavailable') || msg.includes('server error')) {
      return {
        code: 'PROVIDER_OUTAGE',
        provider,
        statusCode: status || 503,
        message: `${provider} is temporarily experiencing downtime. Please retry in a few moments.`,
        isRetryable: true,
        retryAfterSeconds: 3,
      };
    }

    if (msg.includes('empty response') || msg.includes('no content') || msg.includes('zero length')) {
      return {
        code: 'EMPTY_RESPONSE',
        provider,
        statusCode: 200,
        message: 'The model returned an empty response.',
        isRetryable: true,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      provider,
      statusCode: status || 500,
      message: err?.message || 'An unexpected AI generation error occurred.',
      isRetryable: false,
    };
  }
}

export const providerResilienceService = new ProviderResilienceService();
