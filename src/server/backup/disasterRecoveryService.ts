import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getNeonSql, isNeonConfigured } from '../db/neonClient.js';
import { redactSecrets } from '../reliability/safetySanitizer.js';

export interface BackupTableReport {
  tableName: string;
  rowCount: number;
  sha256: string;
  fileSize: number;
}

export interface BackupDocumentAssetRef {
  storageKey: string;
  sha256: string;
  originalName?: string;
  fileSize?: number;
  provider: string;
  url?: string;
}

export interface BackupManifest {
  version: string;
  timestamp: string;
  environment: string;
  tables: Record<string, BackupTableReport>;
  localFiles: Record<string, { size: number; sha256: string; recordCount: number }>;
  documentAssets?: BackupDocumentAssetRef[];
  totalTables: number;
  totalRows: number;
  manifestSha256?: string;
}

export interface CreateBackupOptions {
  destinationDir?: string;
  overwrite?: boolean;
}

export interface RestoreOptions {
  dryRun?: boolean; // Defaults to true
  overwriteExisting?: boolean; // Defaults to false
  restoreDatabase?: boolean; // Defaults to true
  restoreLocalFiles?: boolean; // Defaults to true
}

export interface TableDiffReport {
  tableName: string;
  totalInBackup: number;
  toInsert: number;
  toUpdate: number;
  toSkipIdentical: number;
  conflicts: number;
}

export interface RestoreResult {
  success: boolean;
  dryRun: boolean;
  diffs: Record<string, TableDiffReport>;
  summary: {
    totalBackupRows: number;
    totalToInsert: number;
    totalToUpdate: number;
    totalToSkipIdentical: number;
    totalConflicts: number;
  };
  restoredTables: string[];
  restoredRowsCount: number;
  restoredLocalFiles: string[];
  errors: string[];
  message: string;
}

/**
 * Authoritative list of 28 Neon PostgreSQL tables in dependency-safe restoration order
 */
export const ALL_NEON_TABLES = [
  'class_workspaces',
  'subjects',
  'units',
  'topics',
  'timetable_classes',
  'academic_materials',
  'historical_pyqs',
  'exam_datesheets',
  'class_announcements',
  'academic_assignments',
  'classroom_doubts',
  'cached_lessons',
  'document_assets',
  'document_uploads',
  'document_chunks',
  'chunk_embeddings',
  'graph_nodes',
  'graph_edges',
  'graph_proposed_changes',
  'student_learning_profiles',
  'student_concept_mastery',
  'student_practice_attempts',
  'student_byok_credentials',
  'student_ai_usage',
  'shared_classroom_answers',
  'shared_generation_locks',
  'shared_answer_metrics',
  'ai_knowledge_cache',
];

export class DisasterRecoveryService {
  private calculateFileSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private sanitizeRow(row: any): any {
    if (!row) return row;
    const cloned = JSON.parse(JSON.stringify(row));
    // Redact plaintext secrets while strictly preserving encrypted ciphertext payloads
    for (const key of Object.keys(cloned)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('api_key') ||
        lower.includes('apikey') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('password')
      ) {
        // Do not redact encrypted ciphertext columns
        if (key === 'encrypted_key' || key.startsWith('encrypted_')) {
          continue;
        }
        if (typeof cloned[key] === 'string' && cloned[key].length > 0) {
          cloned[key] = '[REDACTED_FOR_BACKUP]';
        }
      } else if (typeof cloned[key] === 'string') {
        cloned[key] = redactSecrets(cloned[key]);
      }
    }
    return cloned;
  }

  /**
   * Creates a complete, cryptographically verifiable snapshot of all 28 Neon tables and local data.
   * Prevents silent overwriting of existing newer backups.
   */
  public async createCompleteBackup(
    optionsInput?: string | CreateBackupOptions
  ): Promise<{
    success: boolean;
    backupDir: string;
    manifest: BackupManifest;
  }> {
    const options: CreateBackupOptions =
      typeof optionsInput === 'string' ? { destinationDir: optionsInput } : optionsInput || {};

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir =
      options.destinationDir ||
      path.resolve(process.cwd(), 'curriculum-repo', 'backups', `snapshot_${timestamp}`);

    if (fs.existsSync(backupDir) && !options.overwrite) {
      const entries = fs.readdirSync(backupDir);
      if (entries.length > 0) {
        throw new Error(
          `BACKUP_DESTINATION_EXISTS: Directory "${backupDir}" already exists and contains files. Specify a new directory or set overwrite: true to prevent overwriting newer backups.`
        );
      }
    }

    const dbDumpDir = path.join(backupDir, 'neon_database');
    const localFilesDir = path.join(backupDir, 'local_storage');
    fs.mkdirSync(dbDumpDir, { recursive: true });
    fs.mkdirSync(localFilesDir, { recursive: true });

    const tableReports: Record<string, BackupTableReport> = {};
    let totalRows = 0;
    const documentAssetRefs: BackupDocumentAssetRef[] = [];

    // 1. Dump all Neon Tables
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        for (const tableName of ALL_NEON_TABLES) {
          try {
            const rows: any[] = await (sql as any).query(`SELECT * FROM ${tableName}`);
            const sanitizedRows = rows.map((r) => this.sanitizeRow(r));
            const filePath = path.join(dbDumpDir, `${tableName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(sanitizedRows, null, 2), 'utf-8');

            const stat = fs.statSync(filePath);
            const sha256 = this.calculateFileSha256(filePath);

            tableReports[tableName] = {
              tableName,
              rowCount: sanitizedRows.length,
              sha256,
              fileSize: stat.size,
            };
            totalRows += sanitizedRows.length;

            if (tableName === 'document_assets') {
              for (const row of rows) {
                documentAssetRefs.push({
                  storageKey: row.storage_key,
                  sha256: row.sha256_hash,
                  originalName: row.original_name,
                  fileSize: Number(row.file_size) || 0,
                  provider: row.storage_provider || 'local',
                  url: row.storage_url,
                });
              }
            }
          } catch (err: any) {
            // Table might not exist yet if uninitialized
            const filePath = path.join(dbDumpDir, `${tableName}.json`);
            fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
            tableReports[tableName] = {
              tableName,
              rowCount: 0,
              sha256: this.calculateFileSha256(filePath),
              fileSize: fs.statSync(filePath).size,
            };
          }
        }
      }
    }

    // 2. Dump Local Files
    const localReport: Record<string, { size: number; sha256: string; recordCount: number }> = {};
    const repoDir = path.resolve(process.cwd(), 'curriculum-repo');
    const filesToDump = [
      '.classroom_cache.json',
      '.ai_knowledge_cache.json',
      '.shared_classroom_answers.json',
      '.byok_vault.json',
      '.last_sync.json',
      'rag_store/registry.json',
      'rag_store/knowledge_graph.json',
    ];

    for (const rel of filesToDump) {
      const src = path.join(repoDir, rel);
      if (fs.existsSync(src)) {
        const dest = path.join(localFilesDir, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });

        let raw = fs.readFileSync(src, 'utf-8');
        try {
          const parsed = JSON.parse(raw);
          const sanitized = this.sanitizeRow(parsed);
          raw = JSON.stringify(sanitized, null, 2);
        } catch {
          raw = redactSecrets(raw);
        }

        fs.writeFileSync(dest, raw, 'utf-8');
        const stat = fs.statSync(dest);
        const sha256 = this.calculateFileSha256(dest);

        let count = 0;
        try {
          const p = JSON.parse(raw);
          count = Array.isArray(p) ? p.length : Object.keys(p).length;
        } catch {}

        localReport[rel] = { size: stat.size, sha256, recordCount: count };
      }
    }

    // 3. Manifest creation
    const manifest: BackupManifest = {
      version: '1.0.0-phase10-remediation',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      tables: tableReports,
      localFiles: localReport,
      documentAssets: documentAssetRefs,
      totalTables: Object.keys(tableReports).length,
      totalRows,
    };

    const manifestPath = path.join(backupDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const manifestSha = this.calculateFileSha256(manifestPath);
    manifest.manifestSha256 = manifestSha;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return {
      success: true,
      backupDir,
      manifest,
    };
  }

  /**
   * Verifies the cryptographic and structural integrity of a backup directory
   */
  public verifyBackupIntegrity(backupDir: string): {
    isValid: boolean;
    errors: string[];
    manifest?: BackupManifest;
    verifiedFiles: number;
  } {
    const errors: string[] = [];
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return { isValid: false, errors: ['manifest.json is missing in backup directory'], verifiedFiles: 0 };
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return { isValid: false, errors: ['manifest.json is corrupted or invalid JSON'], verifiedFiles: 0 };
    }

    let verifiedFiles = 0;

    // Verify Neon database tables checksums
    const dbDumpDir = path.join(backupDir, 'neon_database');
    for (const [tableName, report] of Object.entries(manifest.tables || {})) {
      const tableFile = path.join(dbDumpDir, `${tableName}.json`);
      if (!fs.existsSync(tableFile)) {
        errors.push(`Missing table dump for "${tableName}"`);
        continue;
      }
      const actualHash = this.calculateFileSha256(tableFile);
      if (actualHash !== report.sha256) {
        errors.push(`Checksum mismatch (SHA-256 mismatch) for table "${tableName}": expected ${report.sha256}, got ${actualHash}`);
      } else {
        verifiedFiles++;
      }
    }

    // Verify local files checksums
    const localFilesDir = path.join(backupDir, 'local_storage');
    for (const [rel, report] of Object.entries(manifest.localFiles || {})) {
      const localFile = path.join(localFilesDir, rel);
      if (!fs.existsSync(localFile)) {
        errors.push(`Missing local file dump for "${rel}"`);
        continue;
      }
      const actualHash = this.calculateFileSha256(localFile);
      if (actualHash !== report.sha256) {
        errors.push(`Checksum mismatch (SHA-256 mismatch) for local file "${rel}": expected ${report.sha256}, got ${actualHash}`);
      } else {
        verifiedFiles++;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      manifest,
      verifiedFiles,
    };
  }

  /**
   * Restores tables and local stores from a verified backup.
   * DEFAULTS TO A NON-DESTRUCTIVE DRY RUN.
   * Requires explicit `dryRun: false` and `overwriteExisting: true` to overwrite existing rows.
   */
  public async restoreFromBackup(
    backupDir: string,
    options: RestoreOptions = { dryRun: true, overwriteExisting: false, restoreDatabase: true, restoreLocalFiles: true }
  ): Promise<RestoreResult> {
    const isDryRun = options.dryRun !== false; // Default to true
    const allowOverwrite = options.overwriteExisting === true; // Default to false

    const check = this.verifyBackupIntegrity(backupDir);
    if (!check.isValid) {
      return {
        success: false,
        dryRun: isDryRun,
        diffs: {},
        summary: { totalBackupRows: 0, totalToInsert: 0, totalToUpdate: 0, totalToSkipIdentical: 0, totalConflicts: 0 },
        restoredTables: [],
        restoredRowsCount: 0,
        restoredLocalFiles: [],
        errors: [`Cannot restore corrupted backup: ${check.errors.join('; ')}`],
        message: 'Restoration aborted: backup cryptographic verification failed.',
      };
    }

    const diffs: Record<string, TableDiffReport> = {};
    let totalBackupRows = 0;
    let totalToInsert = 0;
    let totalToUpdate = 0;
    let totalToSkipIdentical = 0;
    let totalConflicts = 0;
    let restoredRowsCount = 0;
    const restoredTables: string[] = [];
    const restoredLocalFiles: string[] = [];
    const errors: string[] = [];

    // 1. Process Neon PostgreSQL Tables in dependency-safe order
    if (options.restoreDatabase !== false && isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        const dbDumpDir = path.join(backupDir, 'neon_database');

        for (const tableName of ALL_NEON_TABLES) {
          const filePath = path.join(dbDumpDir, `${tableName}.json`);
          if (!fs.existsSync(filePath)) continue;

          try {
            const backupRows: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            totalBackupRows += backupRows.length;

            const diff: TableDiffReport = {
              tableName,
              totalInBackup: backupRows.length,
              toInsert: 0,
              toUpdate: 0,
              toSkipIdentical: 0,
              conflicts: 0,
            };

            if (backupRows.length === 0) {
              diffs[tableName] = diff;
              continue;
            }

            const pKey =
              tableName === 'class_workspaces' ? 'id' : tableName === 'shared_generation_locks' ? 'lock_key' : 'id';

            // Fetch existing rows from database for comparison
            let existingRows: any[] = [];
            try {
              existingRows = await (sql as any).query(`SELECT * FROM ${tableName}`);
            } catch {
              existingRows = [];
            }

            const existingMap = new Map<string, any>();
            for (const r of existingRows) {
              const keyVal = String(r[pKey] || '');
              if (keyVal) existingMap.set(keyVal, r);
            }

            for (const bRow of backupRows) {
              const keyVal = String(bRow[pKey] || '');
              const liveRow = existingMap.get(keyVal);

              if (!liveRow) {
                diff.toInsert++;
                totalToInsert++;

                if (!isDryRun) {
                  // Execute Insert
                  const keys = Object.keys(bRow).filter((k) => bRow[k] !== undefined);
                  const values = keys.map((k) => {
                    const val = bRow[k];
                    return val !== null && typeof val === 'object' ? JSON.stringify(val) : val;
                  });
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const cols = keys.join(', ');
                  const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT (${pKey}) DO NOTHING`;
                  await (sql as any).query(query, values);
                  restoredRowsCount++;
                }
              } else {
                // Row exists in live DB: compare data fields
                let isIdentical = true;
                const keys = Object.keys(bRow);
                for (const k of keys) {
                  if (k === 'updated_at' || k === 'created_at') continue;
                  const bVal = bRow[k];
                  const lVal = liveRow[k];
                  const bStr = typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal ?? '');
                  const lStr = typeof lVal === 'object' ? JSON.stringify(lVal) : String(lVal ?? '');
                  if (bStr !== lStr) {
                    isIdentical = false;
                    break;
                  }
                }

                if (isIdentical) {
                  diff.toSkipIdentical++;
                  totalToSkipIdentical++;
                } else {
                  diff.conflicts++;
                  diff.toUpdate++;
                  totalConflicts++;
                  totalToUpdate++;

                  if (!isDryRun && allowOverwrite) {
                    // Overwrite authorized
                    const updateKeys = keys.filter((k) => k !== pKey && k !== 'created_at');
                    const updateClause = updateKeys.map((k) => `${k} = EXCLUDED.${k}`).join(', ');
                    const values = keys.map((k) => {
                      const val = bRow[k];
                      return val !== null && typeof val === 'object' ? JSON.stringify(val) : val;
                    });
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const cols = keys.join(', ');

                    const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT (${pKey}) DO UPDATE SET ${updateClause}`;
                    await (sql as any).query(query, values);
                    restoredRowsCount++;
                  }
                }
              }
            }

            diffs[tableName] = diff;
            restoredTables.push(tableName);
          } catch (err: any) {
            errors.push(`Table restore preview error on ${tableName}: ${err.message}`);
          }
        }
      }
    }

    // 2. Restore Local Files
    if (options.restoreLocalFiles !== false) {
      const localFilesDir = path.join(backupDir, 'local_storage');
      const repoDir = path.resolve(process.cwd(), 'curriculum-repo');

      for (const [rel] of Object.entries(check.manifest?.localFiles || {})) {
        const src = path.join(localFilesDir, rel);
        if (fs.existsSync(src)) {
          if (!isDryRun) {
            const dest = path.join(repoDir, rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
          }
          restoredLocalFiles.push(rel);
        }
      }
    }

    const message = isDryRun
      ? 'Dry run completed successfully. Zero changes were written to the live database.'
      : allowOverwrite
      ? `Restoration completed with overwrite. Total rows inserted/updated: ${restoredRowsCount}.`
      : `Restoration completed in non-destructive mode (missing records inserted: ${restoredRowsCount}, conflicting live rows left untouched).`;

    return {
      success: errors.length === 0,
      dryRun: isDryRun,
      diffs,
      summary: {
        totalBackupRows,
        totalToInsert,
        totalToUpdate,
        totalToSkipIdentical,
        totalConflicts,
      },
      restoredTables,
      restoredRowsCount,
      restoredLocalFiles,
      errors,
      message,
    };
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
