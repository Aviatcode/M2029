import {
  IAIProviderAdapter,
  ProviderType,
  GenerationOptions,
  GenerationResult,
  StructuredResult,
  TokenUsageReport,
  PROVIDER_CAPABILITY_REGISTRY,
} from './providerTypes.js';

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * 1. Google Gemini Provider Adapter
 */
export class GeminiAdapter implements IAIProviderAdapter {
  readonly providerType: ProviderType = 'gemini';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10 && !this.apiKey.includes('MY_GEMINI_API_KEY'));
  }

  async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || PROVIDER_CAPABILITY_REGISTRY.gemini.defaultModel;
    const timeoutMs = options.timeoutMs || 25000;

    const endpoint = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 3500,
      },
    };

    if (options.systemInstruction) {
      body.system_instruction = { parts: [{ text: options.systemInstruction }] };
    }

    if (options.enableGrounding) {
      body.tools = [{ googleSearch: {} }];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: any = new Error(`Gemini API error (HTTP ${res.status}): ${errBody.slice(0, 200)}`);
        err.statusCode = res.status;
        throw err;
      }

      const data: any = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const text = parts
        .filter((p: any) => !p.thought)
        .map((p: any) => p.text)
        .join('\n')
        .trim();

      // Extract real provider-reported usage
      let usage: TokenUsageReport;
      if (data.usageMetadata) {
        usage = {
          inputTokens: data.usageMetadata.promptTokenCount || 0,
          outputTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
          isProviderReported: true,
        };
      } else {
        const inTok = estimateTokens(prompt);
        const outTok = estimateTokens(text);
        usage = {
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: inTok + outTok,
          isProviderReported: false,
        };
      }

      // Extract Google Search grounding metadata if present
      let groundingMetadata = undefined;
      const rawGrounding = candidate?.groundingMetadata;
      if (rawGrounding) {
        const webSources: Array<{ title: string; url: string }> = [];
        if (Array.isArray(rawGrounding.groundingChunks)) {
          for (const chunk of rawGrounding.groundingChunks) {
            if (chunk.web?.uri && chunk.web?.title) {
              webSources.push({
                title: chunk.web.title,
                url: chunk.web.uri,
              });
            }
          }
        }
        groundingMetadata = {
          searchQueries: rawGrounding.webSearchQueries || [],
          webSearchSources: webSources,
        };
      }

      return {
        text,
        modelUsed: `Google Gemini (${model})`,
        provider: 'gemini',
        usage,
        groundingMetadata,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateStructuredJson<T>(
    prompt: string,
    schemaDescription: string,
    options: GenerationOptions = {}
  ): Promise<StructuredResult<T>> {
    const startTime = Date.now();
    const model = options.model || PROVIDER_CAPABILITY_REGISTRY.gemini.defaultModel;
    const timeoutMs = options.timeoutMs || 25000;

    const endpoint = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const fullPrompt = `${prompt}\n\nStrict Schema:\n${schemaDescription}\n\nReturn VALID JSON ONLY matching the schema.`;

    const body: any = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.2,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini structured JSON error (HTTP ${res.status}): ${errText.slice(0, 150)}`);
      }

      const data: any = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed: T = JSON.parse(rawText.replace(/^```json\s*|\s*```$/gi, ''));

      const usage: TokenUsageReport = data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount || 0,
            outputTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
            isProviderReported: true,
          }
        : {
            inputTokens: estimateTokens(fullPrompt),
            outputTokens: estimateTokens(rawText),
            totalTokens: estimateTokens(fullPrompt) + estimateTokens(rawText),
            isProviderReported: false,
          };

      return {
        data: parsed,
        modelUsed: `Google Gemini (${model})`,
        provider: 'gemini',
        usage,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateEmbedding(text: string): Promise<{ embedding: number[]; dimensions: number; model: string } | null> {
    if (!this.isAvailable()) return null;
    const clean = text.slice(0, 8000).trim();
    if (!clean) return null;

    try {
      const model = 'gemini-embedding-001';
      const url = `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: clean }] },
          outputDimensionality: 768,
        }),
      });

      if (!res.ok) return null;
      const json: any = await res.json();
      const values: number[] = json?.embedding?.values;
      if (Array.isArray(values) && values.length > 0) {
        return { embedding: values, dimensions: values.length, model };
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * 2. OpenAI Provider Adapter
 */
export class OpenAIAdapter implements IAIProviderAdapter {
  readonly providerType: ProviderType = 'openai';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey.trim();
    this.baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10 && this.apiKey.startsWith('sk-'));
  }

  async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || PROVIDER_CAPABILITY_REGISTRY.openai.defaultModel;
    const timeoutMs = options.timeoutMs || 25000;

    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 3500,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err: any = new Error(`OpenAI API error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
        err.statusCode = res.status;
        throw err;
      }

      const data: any = await res.json();
      const choice = data.choices?.[0]?.message;
      const text = choice?.content || choice?.reasoning_content || '';

      const usage: TokenUsageReport = data.usage
        ? {
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
            isProviderReported: true,
          }
        : {
            inputTokens: estimateTokens(prompt),
            outputTokens: estimateTokens(text),
            totalTokens: estimateTokens(prompt) + estimateTokens(text),
            isProviderReported: false,
          };

      return {
        text,
        modelUsed: `OpenAI (${model})`,
        provider: 'openai',
        usage,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateStructuredJson<T>(
    prompt: string,
    schemaDescription: string,
    options: GenerationOptions = {}
  ): Promise<StructuredResult<T>> {
    const startTime = Date.now();
    const model = options.model || PROVIDER_CAPABILITY_REGISTRY.openai.defaultModel;

    const messages = [
      {
        role: 'system',
        content: `You are an academic JSON generator. Return VALID JSON ONLY matching this schema:\n${schemaDescription}`,
      },
      { role: 'user', content: prompt },
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: options.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenAI JSON error (HTTP ${res.status}): ${errBody.slice(0, 150)}`);
    }

    const data: any = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed: T = JSON.parse(raw);

    const usage: TokenUsageReport = data.usage
      ? {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          isProviderReported: true,
        }
      : {
          inputTokens: estimateTokens(prompt),
          outputTokens: estimateTokens(raw),
          totalTokens: estimateTokens(prompt) + estimateTokens(raw),
          isProviderReported: false,
        };

    return {
      data: parsed,
      modelUsed: `OpenAI (${model})`,
      provider: 'openai',
      usage,
      durationMs: Date.now() - startTime,
    };
  }

  async generateEmbedding(text: string): Promise<{ embedding: number[]; dimensions: number; model: string } | null> {
    if (!this.isAvailable()) return null;
    const clean = text.slice(0, 8000).trim();
    if (!clean) return null;

    try {
      const model = 'text-embedding-3-small';
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: clean,
          dimensions: 768, // Match 768 dims for uniform pgvector compatibility
        }),
      });

      if (!res.ok) return null;
      const json: any = await res.json();
      const vec: number[] = json?.data?.[0]?.embedding;
      if (Array.isArray(vec) && vec.length > 0) {
        return { embedding: vec, dimensions: vec.length, model };
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * 3. Anthropic Claude Provider Adapter
 */
export class AnthropicAdapter implements IAIProviderAdapter {
  readonly providerType: ProviderType = 'claude';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10 && this.apiKey.startsWith('sk-ant-'));
  }

  async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || PROVIDER_CAPABILITY_REGISTRY.claude.defaultModel;
    const timeoutMs = options.timeoutMs || 25000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? 3072,
          system: options.systemInstruction || undefined,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err: any = new Error(`Claude API error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
        err.statusCode = res.status;
        throw err;
      }

      const data: any = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('\n').trim();

      const usage: TokenUsageReport = data.usage
        ? {
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
            isProviderReported: true,
          }
        : {
            inputTokens: estimateTokens(prompt),
            outputTokens: estimateTokens(text),
            totalTokens: estimateTokens(prompt) + estimateTokens(text),
            isProviderReported: false,
          };

      return {
        text,
        modelUsed: `Anthropic Claude (${model})`,
        provider: 'claude',
        usage,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateStructuredJson<T>(
    prompt: string,
    schemaDescription: string,
    options: GenerationOptions = {}
  ): Promise<StructuredResult<T>> {
    const fullPrompt = `${prompt}\n\nStrict Schema:\n${schemaDescription}\n\nReturn VALID JSON ONLY.`;
    const genRes = await this.generateText(fullPrompt, {
      ...options,
      systemInstruction: 'You are an academic JSON generator. Return raw parseable JSON only.',
      temperature: 0.1,
    });

    const clean = genRes.text.replace(/^```json\s*|\s*```$/gi, '').trim();
    const parsed: T = JSON.parse(clean);

    return {
      data: parsed,
      modelUsed: genRes.modelUsed,
      provider: 'claude',
      usage: genRes.usage,
      durationMs: genRes.durationMs,
    };
  }
}

/**
 * 4. Testing Sandbox Adapter (Offline Simulated Provider)
 */
export class SandboxAdapter implements IAIProviderAdapter {
  readonly providerType: ProviderType = 'sandbox';

  isAvailable(): boolean {
    return true;
  }

  async generateText(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || 'sandbox-standard';

    const text = `[🧪 Testing Sandbox (${model})]\nAuthoritative academic breakdown addressing: "${prompt.slice(0, 80)}"`;
    const inTok = estimateTokens(prompt);
    const outTok = estimateTokens(text);

    return {
      text,
      modelUsed: `Testing Sandbox (${model})`,
      provider: 'sandbox',
      usage: {
        inputTokens: inTok,
        outputTokens: outTok,
        totalTokens: inTok + outTok,
        isProviderReported: false, // Sandbox usage is estimated
      },
      durationMs: Date.now() - startTime,
    };
  }

  async generateStructuredJson<T>(
    prompt: string,
    schemaDescription: string,
    options: GenerationOptions = {}
  ): Promise<StructuredResult<T>> {
    const startTime = Date.now();
    const model = options.model || 'sandbox-standard';

    const dummy: any = {
      summary: `Sandbox JSON response for: ${prompt.slice(0, 40)}`,
      status: 'simulated',
    };

    return {
      data: dummy as T,
      modelUsed: `Testing Sandbox (${model})`,
      provider: 'sandbox',
      usage: {
        inputTokens: 25,
        outputTokens: 25,
        totalTokens: 50,
        isProviderReported: false,
      },
      durationMs: Date.now() - startTime,
    };
  }

  async generateEmbedding(_text: string): Promise<{ embedding: number[]; dimensions: number; model: string } | null> {
    const dummyVec = new Array(768).fill(0.01);
    return {
      embedding: dummyVec,
      dimensions: 768,
      model: 'sandbox-embedding-768',
    };
  }
}
