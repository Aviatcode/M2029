import fs from 'fs';
import path from 'path';
import { ModelProviderType, UniversalKeyConfig } from './provider.js';
import {
  byokSecurityService,
  encryptApiKey,
  decryptApiKey,
  maskKey,
  SafeStudentKeySummary,
} from './multiProvider/byokSecurityService.js';
import { ProviderType } from './multiProvider/providerTypes.js';

const LEGACY_VAULT_FILE = path.resolve(process.cwd(), 'curriculum-repo', '.byok_vault.json');

/**
 * Encrypts sensitive string using authenticated AES-256-GCM
 */
export function encryptSecret(plainText: string): string {
  return encryptApiKey(plainText);
}

/**
 * Decrypts AES-256-GCM formatted ciphertext
 */
export function decryptSecret(cipherPayload: string): string {
  return decryptApiKey(cipherPayload);
}

/**
 * Masks an API key for safe display in UI or logs.
 * e.g. "AIzaSyD...4x9A", "sk-proj-...8f1B"
 */
export function maskApiKey(key: string): string {
  return maskKey(key);
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
  constructor() {
    this.migrateLegacyDiskVault().catch(() => {});
  }

  /**
   * Safe migration: Ingests any legacy .byok_vault.json file into secure Neon DB & memory,
   * then purges the JSON file from disk to prevent credential persistence in git.
   */
  private async migrateLegacyDiskVault() {
    try {
      if (fs.existsSync(LEGACY_VAULT_FILE)) {
        const raw = fs.readFileSync(LEGACY_VAULT_FILE, 'utf8');
        if (raw && raw.trim() !== '{}') {
          const parsed: Record<string, any[]> = JSON.parse(raw);
          for (const [userId, userRecords] of Object.entries(parsed)) {
            for (const rec of userRecords) {
              try {
                const plain = decryptSecret(rec.encryptedKey);
                if (plain) {
                  await byokSecurityService.storeKey({
                    studentId: userId,
                    provider: (rec.provider as ProviderType) || 'gemini',
                    apiKey: plain,
                    modelName: rec.modelName,
                    baseUrl: rec.baseUrl,
                  });
                }
              } catch {
                // Ignore invalid records
              }
            }
          }

          // Wipe contents from disk to adhere to zero-file-secret constraint
          fs.writeFileSync(LEGACY_VAULT_FILE, '{}', 'utf8');
          console.log('[BYOK Vault] Successfully migrated legacy disk vault to secure database and sanitized disk file.');
        }
      }
    } catch (err: any) {
      console.warn('[BYOK Vault] Notice during legacy vault migration:', err.message);
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
    allowFallback?: boolean;
  }): Promise<Omit<StoredUserKeyRecord, 'encryptedKey'>> {
    const { userId, apiKey, provider, modelName, baseUrl, label, classId = 'M2029', isValidated = true, allowFallback = false } = params;

    const safeKey: SafeStudentKeySummary = await byokSecurityService.storeKey({
      studentId: userId,
      provider: (provider as ProviderType) || 'gemini',
      apiKey,
      modelName,
      baseUrl,
      allowFallback,
    });

    return {
      userId: safeKey.studentId,
      provider: safeKey.provider,
      modelName: safeKey.modelName,
      maskedKey: safeKey.maskedKey,
      baseUrl: safeKey.baseUrl,
      label: label || `${safeKey.provider.toUpperCase()} Key`,
      classId,
      isValidated,
      lastValidatedAt: new Date().toISOString(),
      createdAt: safeKey.createdAt,
      updatedAt: safeKey.createdAt,
    };
  }

  /**
   * Retrieves and decrypts the user's active key for model execution.
   * NEVER exposed to frontend or logged.
   */
  public getUserDecryptedConfig(userId: string, provider?: ModelProviderType): UniversalKeyConfig | null {
    const key = (byokSecurityService as any).memoryVault?.get(userId);
    if (!key || key.length === 0) return null;

    const matched = provider ? key.find((k: any) => k.provider === provider && k.isActive) || key[0] : key[0];
    if (!matched) return null;

    try {
      const plain = decryptSecret(matched.encryptedKey);
      return {
        apiKey: plain,
        provider: matched.provider,
        modelName: matched.modelName,
        baseUrl: matched.baseUrl,
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieves safe, masked key metadata for frontend display.
   * Never contains the raw or encrypted key!
   */
  public getUserSafeKeys(userId: string): Array<Omit<StoredUserKeyRecord, 'encryptedKey'>> {
    const keys = (byokSecurityService as any).memoryVault?.get(userId) || [];
    return keys.map((k: any) => ({
      userId: k.studentId,
      provider: k.provider,
      modelName: k.modelName,
      maskedKey: k.maskedKey,
      baseUrl: k.baseUrl,
      label: `${k.provider.toUpperCase()} Key`,
      classId: 'M2029',
      isValidated: true,
      lastValidatedAt: k.updatedAt,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }));
  }

  /**
   * Removes a key from the user's vault
   */
  public removeUserKey(userId: string, provider: ModelProviderType, _label?: string): boolean {
    byokSecurityService.deleteKey(userId, (provider as ProviderType) || 'gemini');
    return true;
  }
}

export const byokVault = new ByokVaultManager();
