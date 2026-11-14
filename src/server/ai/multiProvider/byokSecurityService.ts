import crypto from 'crypto';
import { queryNeon, isNeonConfigured, getNeonSql } from '../../db/neonClient.js';
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
 * Validates the format and strength of BYOK_MASTER_KEY
 */
export function validateByokMasterKey(key?: string): { valid: boolean; reason?: string } {
  const masterKey = key !== undefined ? key : (process.env.BYOK_MASTER_KEY || '');
  if (!masterKey || typeof masterKey !== 'string' || masterKey.trim().length === 0) {
    return { valid: false, reason: 'BYOK_MASTER_KEY is not set or is empty.' };
  }
  if (masterKey.trim().length < 32) {
    return {
      valid: false,
      reason: `BYOK_MASTER_KEY must be at least 32 characters long for AES-256 security (received ${masterKey.trim().length} chars).`,
    };
  }
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl && masterKey.trim() === dbUrl.trim()) {
    return { valid: false, reason: 'BYOK_MASTER_KEY must not be identical to DATABASE_URL.' };
  }
  const insecureDefaults = ['placeholder', 'your_master_key', '12345678901234567890123456789012'];
  if (insecureDefaults.some((d) => masterKey.toLowerCase().includes(d))) {
    return { valid: false, reason: 'BYOK_MASTER_KEY contains an insecure placeholder value.' };
  }
  return { valid: true };
}

/**
 * Returns the primary master encryption secret.
 * In production (NODE_ENV === 'production'), enforces an independent, strong BYOK_MASTER_KEY.
 * Never silently defaults new encryptions to DATABASE_URL in production.
 */
export function getMasterEncryptionSecret(): Buffer {
  const isProduction = process.env.NODE_ENV === 'production';
  const validation = validateByokMasterKey();

  if (isProduction) {
    if (!validation.valid) {
      throw new Error(
        `CRITICAL_SECURITY_CONFIG_ERROR: ${validation.reason} In production, an independent BYOK_MASTER_KEY is mandatory to encrypt student credentials.`
      );
    }
    return crypto.createHash('sha256').update(process.env.BYOK_MASTER_KEY!.trim()).digest();
  }

  // Non-production (development, test) fallback logic
  const devSecret =
    process.env.BYOK_MASTER_KEY || process.env.ENCRYPTION_SECRET || process.env.DATABASE_URL;
  if (!devSecret || devSecret.trim().length === 0) {
    throw new Error('MISSING_ENCRYPTION_SECRET: Server-side master encryption secret is not configured.');
  }

  return crypto.createHash('sha256').update(devSecret.trim()).digest();
}

/**
 * Returns the legacy fallback key derived from DATABASE_URL or ENCRYPTION_SECRET.
 * Used exclusively for non-destructive dual-key decryption of pre-existing student credentials.
 */
export function getLegacyFallbackSecret(): Buffer | null {
  const legacySecret = process.env.DATABASE_URL || process.env.ENCRYPTION_SECRET;
  if (!legacySecret || legacySecret.trim().length === 0) return null;
  return crypto.createHash('sha256').update(legacySecret.trim()).digest();
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
 * Decrypts AES-256-GCM ciphertext payload with detailed migration tracking.
 * Automatically attempts primary BYOK_MASTER_KEY first; falls back to legacy secret if needed.
 */
export function decryptApiKeyDetailed(
  payload: string,
  customSecret?: Buffer
): { decrypted: string; usedLegacyFallback: boolean } {
  if (!payload || typeof payload !== 'string') {
    return { decrypted: '', usedLegacyFallback: false };
  }
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('MALFORMED_CIPHERTEXT: Ciphertext payload missing IV or AuthTag.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedHex = parts[2];

  const tryDecrypt = (key: Buffer): string => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  };

  if (customSecret) {
    return { decrypted: tryDecrypt(customSecret), usedLegacyFallback: false };
  }

  // 1. Attempt decryption with primary BYOK_MASTER_KEY
  try {
    const primaryKey = getMasterEncryptionSecret();
    const decrypted = tryDecrypt(primaryKey);
    return { decrypted, usedLegacyFallback: false };
  } catch (primaryErr) {
    // 2. If primary fails (or is new), attempt legacy fallback (e.g. DATABASE_URL)
    const legacyKey = getLegacyFallbackSecret();
    if (legacyKey) {
      try {
        const decrypted = tryDecrypt(legacyKey);
        return { decrypted, usedLegacyFallback: true };
      } catch (legacyErr) {
        // Both primary and legacy fallback failed
        throw new Error('KEY_DECRYPTION_FAILED: Ciphertext could not be decrypted with primary or legacy keys.');
      }
    }
    throw primaryErr;
  }
}

/**
 * Standard decrypt function returning plain decrypted string
 */
export function decryptApiKey(payload: string, customSecret?: Buffer): string {
  const result = decryptApiKeyDetailed(payload, customSecret);
  return result.decrypted;
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

    // Refuses persistence if encryption secret is missing or insecure
    const encryptedKey = encryptApiKey(apiKey);
    const masked = maskKey(apiKey);
    const now = new Date().toISOString();
    const id = `byok-${studentId}-${provider}-${Date.now()}`;
    const selectedModel =
      modelName ||
      (provider === 'gemini'
        ? 'gemini-3.5-flash'
        : provider === 'claude'
        ? 'claude-3-5-sonnet-20241022'
        : 'gpt-4o-mini');

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

    // 1. Save in memory vault
    const userKeys = this.memoryVault.get(studentId) || [];
    // Deactivate previous active keys for this specific provider
    userKeys.forEach((k) => {
      if (k.provider === provider) k.isActive = false;
    });
    userKeys.push(record);
    this.memoryVault.set(studentId, userKeys);

    // 2. Persist to Neon PostgreSQL if available
    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `UPDATE student_byok_credentials 
           SET is_active = false, updated_at = NOW() 
           WHERE student_id = $1 AND provider = $2`,
          [studentId, provider]
        );

        await queryNeon(
          `INSERT INTO student_byok_credentials (
            id, student_id, provider, model_name, encrypted_key, 
            masked_key, base_url, allow_fallback, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            record.id,
            record.studentId,
            record.provider,
            record.modelName,
            record.encryptedKey,
            record.maskedKey,
            record.baseUrl || null,
            record.allowFallback,
            record.isActive,
            record.createdAt,
            record.updatedAt,
          ]
        );
      } catch (err: any) {
        console.warn('[BYOK Security] Notice: Neon DB persistence failed, retained in isolated memory vault:', err?.message || err);
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
   * If a legacy key is detected, transparently migrates it to BYOK_MASTER_KEY in the database.
   */
  public async getDecryptedKey(
    requestingStudentId: string,
    targetStudentId: string,
    provider?: ProviderType
  ): Promise<{ apiKey: string; modelName: string; provider: ProviderType; baseUrl?: string; allowFallback: boolean } | null> {
    // Cross-student access rejection
    if (requestingStudentId !== targetStudentId) {
      console.warn(
        `[BYOK Security] Blocked cross-student key access attempt: "${requestingStudentId}" attempted accessing "${targetStudentId}".`
      );
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

    const decryptRes = decryptApiKeyDetailed(record.encryptedKey);

    // 3. Transparent Auto-Migration: if decrypted via legacy key, re-encrypt with BYOK_MASTER_KEY and update DB
    if (decryptRes.usedLegacyFallback && isNeonConfigured()) {
      try {
        const newEncrypted = encryptApiKey(decryptRes.decrypted);
        const sql = getNeonSql();
        if (sql) {
          await (sql as any).query(
            `UPDATE student_byok_credentials SET encrypted_key = $1, updated_at = NOW() WHERE id = $2`,
            [newEncrypted, record.id]
          );
          record.encryptedKey = newEncrypted;
          console.log(`[BYOK Security] Transparently migrated student key "${record.id}" to BYOK_MASTER_KEY.`);
        }
      } catch (migErr: any) {
        console.warn(`[BYOK Security] Notice: failed to persist transparent key migration for ${record.id}:`, migErr?.message || migErr);
      }
    }

    return {
      apiKey: decryptRes.decrypted,
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
           ORDER BY created_at DESC`,
          [studentId]
        );
        return rows.map((r) => ({
          id: r.id,
          studentId: r.student_id,
          provider: r.provider as ProviderType,
          modelName: r.model_name,
          maskedKey: r.masked_key,
          baseUrl: r.base_url,
          allowFallback: Boolean(r.allow_fallback),
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
        }));
      } catch (err: any) {
        console.warn('[BYOK Security] DB listSafeKeys notice:', err?.message || err);
      }
    }

    return [];
  }

  /**
   * Deactivates a student's key securely
   */
  public async deleteKey(studentId: string, provider: ProviderType): Promise<boolean> {
    const userKeys = this.memoryVault.get(studentId) || [];
    userKeys.forEach((k) => {
      if (k.provider === provider) k.isActive = false;
    });

    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `UPDATE student_byok_credentials 
           SET is_active = false, updated_at = NOW() 
           WHERE student_id = $1 AND provider = $2`,
          [studentId, provider]
        );
      } catch (err: any) {
        console.warn('[BYOK Security] DB deleteKey notice:', err?.message || err);
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

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          const rows: any[] = await (sql as any).query('SELECT id, encrypted_key FROM student_byok_credentials');
          for (const row of rows) {
            try {
              const plain = decryptApiKey(row.encrypted_key, oldSecret);
              const newEncrypted = encryptApiKey(plain, newSecret);
              await (sql as any).query(
                'UPDATE student_byok_credentials SET encrypted_key = $1, updated_at = NOW() WHERE id = $2',
                [newEncrypted, row.id]
              );
              rotatedCount++;
            } catch {}
          }
        } catch {}
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
