import crypto from 'crypto';
import { queryNeon, isNeonConfigured } from '../../db/neonClient.js';
import { ProviderType } from './providerTypes.js';

export interface StoredStudentKey {
  id: string;
  studentId: string;
  provider: ProviderType;
  modelName: string;
  encryptedKey: string;
  maskedKey: string;
  baseUrl?: string;
  allowFallback: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SafeStudentKeySummary {
  id: string;
  studentId: string;
  provider: ProviderType;
  modelName: string;
  maskedKey: string;
  baseUrl?: string;
  allowFallback: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Returns the master encryption secret from environment variables.
 * Refuses execution if secret is completely missing.
 */
export function getMasterEncryptionSecret(): Buffer {
  const secret = process.env.BYOK_MASTER_KEY || process.env.ENCRYPTION_SECRET || process.env.DATABASE_URL;
  if (!secret || secret.trim().length === 0) {
    throw new Error('MISSING_ENCRYPTION_SECRET: Server-side master encryption secret is not configured.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts API key using AES-256-GCM authenticated encryption.
 * Format: iv.hex:authTag.hex:ciphertext.hex
 */
export function encryptApiKey(plainKey: string, customSecret?: Buffer): string {
  if (!plainKey || typeof plainKey !== 'string') {
    throw new Error('Cannot encrypt empty API key.');
  }
  const key = customSecret || getMasterEncryptionSecret();
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainKey.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext payload
 */
export function decryptApiKey(payload: string, customSecret?: Buffer): string {
  if (!payload || typeof payload !== 'string') return '';
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('MALFORMED_CIPHERTEXT: Ciphertext payload missing IV or AuthTag.');
  }

  const key = customSecret || getMasterEncryptionSecret();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedHex = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generates safe display mask for an API key.
 * e.g. "AIzaSy...4x9A", "sk-proj-...8f1B", "sk-ant-...b93C"
 */
export function maskKey(key: string): string {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) return '********';

  let prefixLen = 4;
  if (clean.startsWith('AIzaSy')) prefixLen = 6;
  else if (clean.startsWith('sk-ant-')) prefixLen = 7;
  else if (clean.startsWith('sk-proj-')) prefixLen = 7;
  else if (clean.startsWith('sk-')) prefixLen = 3;
  else if (clean.startsWith('gsk_')) prefixLen = 4;

  const prefix = clean.slice(0, prefixLen);
  const suffix = clean.slice(-4);
  return `${prefix}...${suffix}`;
}

export class ByokSecurityService {
  // In-memory isolated storage for active sessions & DB failover
  private memoryVault: Map<string, StoredStudentKey[]> = new Map(); // studentId -> keys

  /**
   * Persists a student's API key with AES-256-GCM authenticated encryption in Neon PostgreSQL
   */
  public async storeKey(params: {
    studentId: string;
    provider: ProviderType;
    apiKey: string;
    modelName?: string;
    baseUrl?: string;
    allowFallback?: boolean;
  }): Promise<SafeStudentKeySummary> {
    const { studentId, provider, apiKey, modelName, baseUrl, allowFallback = false } = params;

    if (!studentId || !studentId.trim()) {
      throw new Error('studentId is required for key scoping.');
    }
    if (!apiKey || !apiKey.trim()) {
      throw new Error('apiKey is required.');
    }

    // Refuses persistence if encryption secret is missing
    const encryptedKey = encryptApiKey(apiKey);
    const masked = maskKey(apiKey);
    const now = new Date().toISOString();
    const id = `byok-${studentId}-${provider}-${Date.now()}`;
    const selectedModel = modelName || (provider === 'gemini' ? 'gemini-3.5-flash' : provider === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o-mini');

    const record: StoredStudentKey = {
      id,
      studentId: studentId.trim(),
      provider,
      modelName: selectedModel,
      encryptedKey,
      maskedKey: masked,
      baseUrl: baseUrl?.trim(),
      allowFallback: Boolean(allowFallback),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Update in-memory state (replace if same provider for this student)
    const existing = this.memoryVault.get(studentId) || [];
    const filtered = existing.filter((k) => k.provider !== provider);
    filtered.unshift(record);
    this.memoryVault.set(studentId, filtered);

    // Persist to Neon DB
    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `INSERT INTO student_byok_credentials (
            id, student_id, provider, model_name, encrypted_key, masked_key, base_url, allow_fallback, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            encrypted_key = EXCLUDED.encrypted_key,
            masked_key = EXCLUDED.masked_key,
            model_name = EXCLUDED.model_name,
            base_url = EXCLUDED.base_url,
            allow_fallback = EXCLUDED.allow_fallback,
            updated_at = NOW()`,
          [
            id,
            studentId,
            provider,
            selectedModel,
            encryptedKey,
            masked,
            baseUrl || null,
            allowFallback,
            true,
            now,
            now,
          ]
        );
      } catch (err: any) {
        console.warn('[BYOK Security] Database key save notice:', err?.message || err);
      }
    }

    return {
      id: record.id,
      studentId: record.studentId,
      provider: record.provider,
      modelName: record.modelName,
      maskedKey: record.maskedKey,
      baseUrl: record.baseUrl,
      allowFallback: record.allowFallback,
      isActive: record.isActive,
      createdAt: record.createdAt,
    };
  }

  /**
   * Retrieves and decrypts a student's key for authorized model invocation.
   * Strictly enforces owner authorization.
   */
  public async getDecryptedKey(
    requestingStudentId: string,
    targetStudentId: string,
    provider?: ProviderType
  ): Promise<{ apiKey: string; modelName: string; provider: ProviderType; baseUrl?: string; allowFallback: boolean } | null> {
    // Cross-student access rejection
    if (requestingStudentId !== targetStudentId) {
      console.warn(`[BYOK Security] Blocked cross-student key access attempt: "${requestingStudentId}" attempted accessing "${targetStudentId}".`);
      return null;
    }

    // 1. Check in-memory vault
    const userKeys = this.memoryVault.get(requestingStudentId) || [];
    let record = provider ? userKeys.find((k) => k.provider === provider && k.isActive) : userKeys.find((k) => k.isActive);

    // 2. Query Neon if not in memory
    if (!record && isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT * FROM student_byok_credentials 
           WHERE student_id = $1 AND is_active = true 
           ${provider ? 'AND provider = $2' : ''} 
           ORDER BY updated_at DESC LIMIT 1`,
          provider ? [requestingStudentId, provider] : [requestingStudentId]
        );

        if (rows.length > 0) {
          const r = rows[0];
          record = {
            id: r.id,
            studentId: r.student_id,
            provider: r.provider as ProviderType,
            modelName: r.model_name,
            encryptedKey: r.encrypted_key,
            maskedKey: r.masked_key,
            baseUrl: r.base_url,
            allowFallback: Boolean(r.allow_fallback),
            isActive: Boolean(r.is_active),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
          userKeys.push(record);
          this.memoryVault.set(requestingStudentId, userKeys);
        }
      } catch (err: any) {
        console.warn('[BYOK Security] DB lookup notice:', err?.message || err);
      }
    }

    if (!record) return null;

    const plainKey = decryptApiKey(record.encryptedKey);
    return {
      apiKey: plainKey,
      modelName: record.modelName,
      provider: record.provider,
      baseUrl: record.baseUrl,
      allowFallback: record.allowFallback,
    };
  }

  /**
   * Retrieves safe, masked key summaries for client display. Never returns plaintext keys!
   */
  public async listSafeKeys(studentId: string): Promise<SafeStudentKeySummary[]> {
    if (!studentId) return [];

    const userKeys = this.memoryVault.get(studentId) || [];
    if (userKeys.length > 0) {
      return userKeys
        .filter((k) => k.isActive)
        .map((k) => ({
          id: k.id,
          studentId: k.studentId,
          provider: k.provider,
          modelName: k.modelName,
          maskedKey: k.maskedKey,
          baseUrl: k.baseUrl,
          allowFallback: k.allowFallback,
          isActive: k.isActive,
          createdAt: k.createdAt,
        }));
    }

    if (isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT id, student_id, provider, model_name, masked_key, base_url, allow_fallback, is_active, created_at 
           FROM student_byok_credentials 
           WHERE student_id = $1 AND is_active = true 
           ORDER BY updated_at DESC`,
          [studentId]
        );

        return rows.map((r) => ({
          id: r.id,
          studentId: r.student_id,
          provider: r.provider,
          modelName: r.model_name,
          maskedKey: r.masked_key,
          baseUrl: r.base_url,
          allowFallback: Boolean(r.allow_fallback),
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
        }));
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Deletes a student's configured key
   */
  public async deleteKey(studentId: string, provider: ProviderType): Promise<boolean> {
    if (!studentId) return false;

    // Update in-memory
    const keys = this.memoryVault.get(studentId) || [];
    const filtered = keys.filter((k) => k.provider !== provider);
    this.memoryVault.set(studentId, filtered);

    // Delete in Neon
    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `DELETE FROM student_byok_credentials WHERE student_id = $1 AND provider = $2`,
          [studentId, provider]
        );
      } catch (err: any) {
        console.warn('[BYOK Security] Delete notice:', err?.message || err);
      }
    }

    return true;
  }

  /**
   * Rotates master encryption secret safely from oldSecret to newSecret
   */
  public async rotateMasterEncryptionKey(oldSecretStr: string, newSecretStr: string): Promise<{ rotatedCount: number }> {
    const oldSecret = crypto.createHash('sha256').update(oldSecretStr).digest();
    const newSecret = crypto.createHash('sha256').update(newSecretStr).digest();
    let rotatedCount = 0;

    for (const [studentId, keys] of this.memoryVault.entries()) {
      for (const k of keys) {
        try {
          const plain = decryptApiKey(k.encryptedKey, oldSecret);
          k.encryptedKey = encryptApiKey(plain, newSecret);
          k.updatedAt = new Date().toISOString();
          rotatedCount++;
        } catch (err: any) {
          console.warn(`[BYOK Security] Could not rotate key for ${studentId}:`, err.message);
        }
      }
    }

    return { rotatedCount };
  }

  /**
   * Clears in-memory vault (useful for testing isolation)
   */
  public clearMemory() {
    this.memoryVault.clear();
  }
}

export const byokSecurityService = new ByokSecurityService();
