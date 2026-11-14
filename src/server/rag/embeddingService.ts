import { UniversalKeyConfig } from '../ai/provider.js';
import { queryNeon, isNeonConfigured } from '../db/neonClient.js';

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  provider: 'gemini' | 'openai' | 'fallback';
}

export interface IEmbeddingProvider {
  readonly providerName: 'gemini' | 'openai' | 'fallback';
  isAvailable(): boolean;
  generateEmbedding(text: string): Promise<EmbeddingResult | null>;
  generateBatchEmbeddings(texts: string[]): Promise<(EmbeddingResult | null)[]>;
}

export interface EmbeddingServiceStats {
  totalGenerated: number;
  cacheHits: number;
  failures: number;
  modelsUsed: Record<string, number>;
}

/**
 * 1. Google Gemini Embedding Provider (text-embedding-004, 768 dims)
 */
export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'gemini' as const;
  private apiKey: string;
  private model = 'gemini-embedding-001';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    const raw = apiKey || process.env.GEMINI_API_KEY || '';
    this.apiKey = raw && !raw.includes('MY_GEMINI_API_KEY') && !raw.startsWith('your_') ? raw.trim() : '';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    if (!this.isAvailable()) return null;
    const cleanText = text.slice(0, 8000).trim();
    if (!cleanText) return null;

    try {
      const url = `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text: cleanText }] },
          outputDimensionality: 768,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[Gemini Embedding] HTTP ${res.status}: ${errText.slice(0, 150)}`);
        return null;
      }

      const json = await res.json();
      const values: number[] = json?.embedding?.values;
      if (Array.isArray(values) && values.length > 0) {
        return {
          embedding: values,
          dimensions: values.length,
          model: this.model,
          provider: 'gemini',
        };
      }
      return null;
    } catch (err: any) {
      console.warn('[Gemini Embedding Error]:', err?.message || err);
      return null;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<(EmbeddingResult | null)[]> {
    if (!this.isAvailable() || texts.length === 0) return texts.map(() => null);

    // Limit batch size to 60 chunks per request
    const batchSize = 60;
    const allResults: (EmbeddingResult | null)[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const slice = texts.slice(i, i + batchSize);
      try {
        const url = `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
        const requests = slice.map((t) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text: t.slice(0, 8000).trim() }] },
          outputDimensionality: 768,
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        });

        if (!res.ok) {
          // Fallback to individual sequential generation if batch endpoint rejects
          for (const t of slice) {
            allResults.push(await this.generateEmbedding(t));
          }
          continue;
        }

        const json = await res.json();
        const embeddingsList: any[] = json?.embeddings || [];
        for (let j = 0; j < slice.length; j++) {
          const vals: number[] = embeddingsList[j]?.values;
          if (Array.isArray(vals) && vals.length > 0) {
            allResults.push({
              embedding: vals,
              dimensions: vals.length,
              model: this.model,
              provider: 'gemini',
            });
          } else {
            allResults.push(null);
          }
        }
      } catch {
        for (const t of slice) {
          allResults.push(await this.generateEmbedding(t));
        }
      }
    }

    return allResults;
  }
}

/**
 * 2. OpenAI Embedding Provider (text-embedding-3-small, 768 dims)
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'openai' as const;
  private apiKey: string;
  private model = 'text-embedding-3-small';
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = (apiKey || process.env.OPENAI_API_KEY || '').trim();
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    if (!this.isAvailable()) return null;
    const cleanText = text.slice(0, 8000).trim();
    if (!cleanText) return null;

    try {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: cleanText,
          dimensions: 768, // Match 768 dims for uniform pgvector compatibility
        }),
      });

      if (!res.ok) return null;
      const json = await res.json();
      const vec: number[] = json?.data?.[0]?.embedding;
      if (Array.isArray(vec) && vec.length > 0) {
        return {
          embedding: vec,
          dimensions: vec.length,
          model: this.model,
          provider: 'openai',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<(EmbeddingResult | null)[]> {
    if (!this.isAvailable() || texts.length === 0) return texts.map(() => null);
    try {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts.map((t) => t.slice(0, 8000).trim()),
          dimensions: 768,
        }),
      });

      if (!res.ok) {
        return Promise.all(texts.map((t) => this.generateEmbedding(t)));
      }

      const json = await res.json();
      const data: any[] = json?.data || [];
      return texts.map((_, idx) => {
        const item = data.find((d) => d.index === idx) || data[idx];
        const vec: number[] = item?.embedding;
        if (Array.isArray(vec)) {
          return {
            embedding: vec,
            dimensions: vec.length,
            model: this.model,
            provider: 'openai',
          };
        }
        return null;
      });
    } catch {
      return texts.map(() => null);
    }
  }
}

/**
 * 3. Central Provider-Independent Embedding Service
 * Handles BYOK resolution, embedding generation, caching, and database persistence
 */
export class EmbeddingService {
  private stats: EmbeddingServiceStats = {
    totalGenerated: 0,
    cacheHits: 0,
    failures: 0,
    modelsUsed: {},
  };

  /**
   * Resolves the best available embedding provider:
   * 1. Student's BYOK config (from request headers or user vault)
   * 2. Default server Gemini key
   * 3. Null (graceful fallback to BM25-only)
   */
  getProvider(config?: UniversalKeyConfig): IEmbeddingProvider | null {
    if (config) {
      if (config.apiKey && config.apiKey.trim().length > 10) {
        if (config.provider === 'openai') {
          return new OpenAIEmbeddingProvider(config.apiKey, config.baseUrl);
        }
        return new GeminiEmbeddingProvider(config.apiKey);
      }
      // Explicit student config passed without a valid key: avoid unexpected charges
      return null;
    }

    const defaultGemini = new GeminiEmbeddingProvider();
    if (defaultGemini.isAvailable()) {
      return defaultGemini;
    }

    const defaultOpenAI = new OpenAIEmbeddingProvider();
    if (defaultOpenAI.isAvailable()) {
      return defaultOpenAI;
    }

    return null;
  }

  getStats(): EmbeddingServiceStats {
    return { ...this.stats };
  }

  /**
   * Generate an embedding vector for search queries (with in-memory LRU caching)
   */
  async embedQuery(query: string, config?: UniversalKeyConfig): Promise<number[] | null> {
    const provider = this.getProvider(config);
    if (!provider || !provider.isAvailable()) {
      return null;
    }

    try {
      const res = await provider.generateEmbedding(query);
      if (res && res.embedding) {
        this.stats.totalGenerated++;
        this.stats.modelsUsed[res.model] = (this.stats.modelsUsed[res.model] || 0) + 1;
        return res.embedding;
      }
      this.stats.failures++;
      return null;
    } catch {
      this.stats.failures++;
      return null;
    }
  }

  /**
   * Embed and persist document chunks in Neon pgvector.
   * NEVER re-embeds an unchanged chunk that already has an embedding.
   */
  async embedChunks(
    chunks: Array<{ id: string; assetHash: string; text: string }>,
    config?: UniversalKeyConfig
  ): Promise<number> {
    if (!isNeonConfigured() || chunks.length === 0) return 0;
    const provider = this.getProvider(config);
    if (!provider || !provider.isAvailable()) return 0;

    try {
      // 1. Identify which chunks already have embeddings
      const chunkIds = chunks.map((c) => c.id);
      const existingRows = await queryNeon<{ chunk_id: string }>(
        `SELECT chunk_id FROM chunk_embeddings WHERE chunk_id = ANY($1)`,
        [chunkIds]
      );
      const existingSet = new Set(existingRows.map((r) => r.chunk_id));
      this.stats.cacheHits += existingSet.size;

      const unEmbeddedChunks = chunks.filter((c) => !existingSet.has(c.id));
      if (unEmbeddedChunks.length === 0) {
        return 0; // 100% of chunks already embedded
      }

      console.log(`[Embedding Service] Embedding ${unEmbeddedChunks.length} new chunk(s) via provider [${provider.providerName}]...`);

      // 2. Batch generate embeddings for unembedded chunks
      const texts = unEmbeddedChunks.map((c) => c.text);
      const results = await provider.generateBatchEmbeddings(texts);

      let savedCount = 0;
      for (let i = 0; i < unEmbeddedChunks.length; i++) {
        const chunk = unEmbeddedChunks[i];
        const res = results[i];
        if (!res || !res.embedding || res.embedding.length === 0) continue;

        const vectorString = `[${res.embedding.join(',')}]`;
        await queryNeon(
          `INSERT INTO chunk_embeddings (
            chunk_id, asset_hash, provider, model_name, dimensions, embedding
          ) VALUES ($1, $2, $3, $4, $5, $6::vector)
          ON CONFLICT (chunk_id) DO NOTHING`,
          [
            chunk.id,
            chunk.assetHash,
            res.provider,
            res.model,
            res.dimensions,
            vectorString,
          ]
        );

        this.stats.totalGenerated++;
        this.stats.modelsUsed[res.model] = (this.stats.modelsUsed[res.model] || 0) + 1;
        savedCount++;
      }

      return savedCount;
    } catch (err: any) {
      console.warn('[Embedding Service] embedChunks notice:', err?.message || err);
      this.stats.failures++;
      return 0;
    }
  }
}

export const embeddingService = new EmbeddingService();
