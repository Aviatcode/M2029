import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { isNeonConfigured, getNeonSql } from '../db/neonClient.js';
import { ModelProviderType, UniversalKeyConfig } from './provider.js';

const VAULT_FILE = path.resolve(process.cwd(), 'curriculum-repo', '.byok_vault.json');

// Derive or load master vault encryption secret (32 bytes for AES-256-GCM)
function getVaultMasterSecret(): Buffer {
  const secret = process.env.BYOK_MASTER_KEY || process.env.DATABASE_URL || 'm2029-collective-academic-vault-secret-key-32';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive string using AES-256-GCM
 * Returns formatted ciphertext string: iv.hex:authTag.hex:encrypted.hex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const key = getVaultMasterSecret();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM formatted ciphertext
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload) return '';
  // Check if it matches iv:tag:data structure
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    // Legacy or unencrypted key fallback
    return cipherPayload;
  }

  try {
    const key = getVaultMasterSecret();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedHex = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.warn('[BYOK Vault] Decryption failure:', err.message);
    return '';
  }
}

/**
 * Masks an API key for safe display in UI or logs.
 * e.g. "AIzaSyD...4x9A", "sk-proj-...8f1B"
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) return '********';
  const prefixLen = clean.startsWith('AIzaSy') ? 6 : clean.startsWith('sk-ant-') ? 7 : clean.startsWith('sk-') ? 3 : 4;
  const prefix = clean.slice(0, prefixLen);
  const suffix = clean.slice(-4);
  return `${prefix}...${suffix}`;
}

export interface StoredUserKeyRecord {
  userId: string;
  provider: ModelProviderType;
  modelName: string;
  encryptedKey: string;
  maskedKey: string;
  baseUrl?: string;
  label?: string;
  classId?: string;
  isValidated: boolean;
  lastValidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class ByokVaultManager {
  private records: Map<string, StoredUserKeyRecord[]> = new Map(); // userId -> records
  private isTableReady = false;

  constructor() {
    this.ensureStorage();
    this.loadFromDisk();
    this.ensureDbTable().catch(() => {});
  }

  private ensureStorage() {
    const dir = path.dirname(VAULT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public async ensureDbTable() {
    if (!isNeonConfigured()) return;
    try {
      const sql = getNeonSql();
      if (!sql) return;
      await sql`
        CREATE TABLE IF NOT EXISTS byok_credentials (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          model_name TEXT NOT NULL,
          encrypted_key TEXT NOT NULL,
          masked_key TEXT NOT NULL,
          base_url TEXT,
          label TEXT,
          class_id TEXT NOT NULL DEFAULT 'M2029',
          is_validated BOOLEAN NOT NULL DEFAULT false,
          last_validated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      this.isTableReady = true;
    } catch (err: any) {
      console.warn('[BYOK Vault] DB table creation notice:', err.message);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(VAULT_FILE)) {
        const raw = fs.readFileSync(VAULT_FILE, 'utf8');
        const parsed: Record<string, StoredUserKeyRecord[]> = JSON.parse(raw);
        for (const [userId, userRecords] of Object.entries(parsed)) {
          this.records.set(userId, userRecords);
        }
      }
    } catch (err: any) {
      console.warn('[BYOK Vault] Error loading vault file:', err.message);
    }
  }

  private saveToDisk() {
    try {
      this.ensureStorage();
      const obj: Record<string, StoredUserKeyRecord[]> = {};
      for (const [userId, userRecords] of this.records.entries()) {
        obj[userId] = userRecords;
      }
      fs.writeFileSync(VAULT_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err: any) {
      console.error('[BYOK Vault] Failed to save vault to disk:', err.message);
    }
  }

  /**
   * Securely saves or updates a student's API key
   */
  public async storeUserKey(params: {
    userId: string;
    apiKey: string;
    provider: ModelProviderType;
    modelName: string;
    baseUrl?: string;
    label?: string;
    classId?: string;
    isValidated?: boolean;
  }): Promise<Omit<StoredUserKeyRecord, 'encryptedKey'>> {
    const { userId, apiKey, provider, modelName, baseUrl, label, classId = 'M2029', isValidated = false } = params;

    const encryptedKey = encryptSecret(apiKey.trim());
    const maskedKey = maskApiKey(apiKey.trim());
    const now = new Date().toISOString();

    const newRecord: StoredUserKeyRecord = {
      userId,
      provider,
      modelName: modelName || 'gemini-3.5-flash',
      encryptedKey,
      maskedKey,
      baseUrl: baseUrl?.trim() || '',
      label: label || `${provider.toUpperCase()} Key`,
      classId,
      isValidated,
      lastValidatedAt: isValidated ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const existing = this.records.get(userId) || [];
    // Replace if same provider and label, else append
    const updated = existing.filter((r) => r.provider !== provider || r.label !== newRecord.label);
    updated.unshift(newRecord);
    this.records.set(userId, updated);
    this.saveToDisk();

    // Sync to Neon asynchronously
    if (isNeonConfigured()) {
      if (!this.isTableReady) {
        await this.ensureDbTable();
      }
      try {
        const sql = getNeonSql();
        if (sql) {
          const recId = `key-${userId}-${provider}-${Date.now()}`;
          await sql`
            INSERT INTO byok_credentials (
              id, user_id, provider, model_name, encrypted_key, masked_key, base_url, label, class_id, is_validated, last_validated_at, updated_at
            ) VALUES (
              ${recId}, ${userId}, ${provider}, ${newRecord.modelName}, ${encryptedKey}, ${maskedKey}, ${newRecord.baseUrl || null}, ${newRecord.label || null}, ${classId}, ${isValidated}, ${newRecord.lastValidatedAt || null}, NOW()
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }
      } catch (dbErr: any) {
        console.warn('[BYOK Vault] Neon DB sync warning:', dbErr.message);
      }
    }

    const { encryptedKey: _, ...safeOutput } = newRecord;
    return safeOutput;
  }

  /**
   * Retrieves and decrypts the user's active key for model execution.
   * NEVER exposed to frontend or logged.
   */
  public getUserDecryptedConfig(userId: string, provider?: ModelProviderType): UniversalKeyConfig | null {
    const list = this.records.get(userId);
    if (!list || list.length === 0) return null;

    const record = provider ? list.find((r) => r.provider === provider) || list[0] : list[0];
    if (!record) return null;

    const plainKey = decryptSecret(record.encryptedKey);
    return {
      apiKey: plainKey,
      provider: record.provider,
      modelName: record.modelName,
      baseUrl: record.baseUrl,
    };
  }

  /**
   * Retrieves safe, masked key metadata for frontend display.
   * Never contains the raw or encrypted key!
   */
  public getUserSafeKeys(userId: string): Array<Omit<StoredUserKeyRecord, 'encryptedKey'>> {
    const list = this.records.get(userId) || [];
    return list.map(({ encryptedKey, ...safe }) => safe);
  }

  /**
   * Removes a key from the user's vault
   */
  public removeUserKey(userId: string, provider: ModelProviderType, label?: string): boolean {
    const list = this.records.get(userId);
    if (!list) return false;

    const filtered = list.filter((r) => !(r.provider === provider && (!label || r.label === label)));
    this.records.set(userId, filtered);
    this.saveToDisk();
    return true;
  }
}

export const byokVault = new ByokVaultManager();
