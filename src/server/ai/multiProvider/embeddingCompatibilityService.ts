import { queryNeon, isNeonConfigured } from '../../db/neonClient.js';
import { ProviderType } from './providerTypes.js';

export interface EmbeddingMetadata {
  provider: ProviderType;
  modelName: string;
  dimensions: number;
  embeddingVersion: string;
  chunkHash?: string;
  createdAt: string;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  expectedDimensions: number;
  actualDimensions: number;
  reason?: string;
}

export class EmbeddingCompatibilityService {
  // Standard pgvector index configured for M2029
  public readonly standardDimensions = 768;
  public readonly defaultEmbeddingModel = 'text-embedding-004';
  public readonly defaultEmbeddingVersion = 'v1';

  /**
   * Validates whether an incoming vector matches the target pgvector index dimensions (768)
   */
  public checkCompatibility(vector: number[], provider: ProviderType, model: string): CompatibilityCheckResult {
    const actualDimensions = vector.length;

    if (actualDimensions !== this.standardDimensions) {
      return {
        isCompatible: false,
        expectedDimensions: this.standardDimensions,
        actualDimensions,
        reason: `Vector dimension mismatch: Received ${actualDimensions} dimensions from ${provider} (${model}), but vector index requires ${this.standardDimensions} dimensions.`,
      };
    }

    return {
      isCompatible: true,
      expectedDimensions: this.standardDimensions,
      actualDimensions,
    };
  }

  /**
   * Records embedding metadata in Neon database alongside chunk vector
   */
  public async recordEmbeddingMetadata(params: {
    chunkId: string;
    assetHash: string;
    provider: ProviderType;
    modelName: string;
    dimensions: number;
    embeddingVersion?: string;
    chunkHash?: string;
  }) {
    const {
      chunkId,
      assetHash,
      provider,
      modelName,
      dimensions,
      embeddingVersion = this.defaultEmbeddingVersion,
      chunkHash = '',
    } = params;

    if (!isNeonConfigured()) return;

    try {
      await queryNeon(
        `UPDATE chunk_embeddings 
         SET provider = $1, model_name = $2, dimensions = $3, embedding_version = $4, chunk_hash = $5
         WHERE chunk_id = $6`,
        [provider, modelName, dimensions, embeddingVersion, chunkHash, chunkId]
      );
    } catch (err: any) {
      console.warn('[Embedding Compatibility] Notice updating metadata:', err?.message || err);
    }
  }

  /**
   * Scans existing database embeddings for dimension inconsistencies
   */
  public async auditIndexConsistency(): Promise<{
    totalVectors: number;
    consistentCount: number;
    mismatchedCount: number;
  }> {
    if (!isNeonConfigured()) {
      return { totalVectors: 0, consistentCount: 0, mismatchedCount: 0 };
    }

    try {
      const rows = await queryNeon<any>(
        `SELECT dimensions, COUNT(*) as cnt FROM chunk_embeddings GROUP BY dimensions`
      );

      let total = 0;
      let consistent = 0;
      let mismatched = 0;

      for (const r of rows) {
        const dim = Number(r.dimensions);
        const count = Number(r.cnt);
        total += count;
        if (dim === this.standardDimensions) {
          consistent += count;
        } else {
          mismatched += count;
        }
      }

      return {
        totalVectors: total,
        consistentCount: consistent,
        mismatchedCount: mismatched,
      };
    } catch {
      return { totalVectors: 0, consistentCount: 0, mismatchedCount: 0 };
    }
  }
}

export const embeddingCompatibilityService = new EmbeddingCompatibilityService();
