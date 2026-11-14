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

export interface BackupManifest {
  version: string;
  timestamp: string;
  environment: string;
  tables: Record<string, BackupTableReport>;
  localFiles: Record<string, { size: number; sha256: string; recordCount: number }>;
  totalTables: number;
  totalRows: number;
  manifestSha256?: string;
}

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
  'ai_knowledge_cache',
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
];

export class DisasterRecoveryService {
  private calculateFileSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private sanitizeRow(row: any): any {
    if (!row) return row;
    const cloned = JSON.parse(JSON.stringify(row));
    // Redact plaintext keys, secrets, or tokens if present
    for (const key of Object.keys(cloned)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('api_key') ||
        lower.includes('apikey') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('password')
      ) {
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
   * Creates a complete, sanitized, cryptographically verifiable snapshot of all Neon tables and local data
   */
  public async createCompleteBackup(customBackupDir?: string): Promise<{
    success: boolean;
    backupDir: string;
    manifest: BackupManifest;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir =
      customBackupDir ||
      path.resolve(process.cwd(), 'curriculum-repo', 'backups', `snapshot_${timestamp}`);

    const dbDumpDir = path.join(backupDir, 'neon_database');
    const localFilesDir = path.join(backupDir, 'local_storage');
    fs.mkdirSync(dbDumpDir, { recursive: true });
    fs.mkdirSync(localFilesDir, { recursive: true });

    const tableReports: Record<string, BackupTableReport> = {};
    let totalRows = 0;

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

        // Read and sanitize
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
      version: '1.0.0-phase9',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      tables: tableReports,
      localFiles: localReport,
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
      return { isValid: false, errors: ['manifest.json not found in backup directory'], verifiedFiles: 0 };
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e: any) {
      return { isValid: false, errors: [`Failed to parse manifest.json: ${e.message}`], verifiedFiles: 0 };
    }

    let verifiedFiles = 0;
    const dbDumpDir = path.join(backupDir, 'neon_database');

    // Verify all table dump files
    for (const [table, report] of Object.entries(manifest.tables || {})) {
      const filePath = path.join(dbDumpDir, `${table}.json`);
      if (!fs.existsSync(filePath)) {
        errors.push(`Table dump file missing for "${table}"`);
        continue;
      }

      const currentSha = this.calculateFileSha256(filePath);
      if (currentSha !== report.sha256) {
        errors.push(`Checksum mismatch for table "${table}": expected ${report.sha256}, got ${currentSha}`);
      } else {
        verifiedFiles++;
      }
    }

    // Verify all local files
    const localFilesDir = path.join(backupDir, 'local_storage');
    for (const [rel, rep] of Object.entries(manifest.localFiles || {})) {
      const filePath = path.join(localFilesDir, rel);
      if (!fs.existsSync(filePath)) {
        errors.push(`Local backup file missing for "${rel}"`);
        continue;
      }

      const currentSha = this.calculateFileSha256(filePath);
      if (currentSha !== rep.sha256) {
        errors.push(`Checksum mismatch for local file "${rel}": expected ${rep.sha256}, got ${currentSha}`);
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
   * Restores tables and local stores from a verified backup
   */
  public async restoreFromBackup(
    backupDir: string,
    options: { restoreDatabase?: boolean; restoreLocalFiles?: boolean } = { restoreDatabase: true, restoreLocalFiles: true }
  ): Promise<{
    success: boolean;
    restoredTables: string[];
    restoredRowsCount: number;
    restoredLocalFiles: string[];
    errors: string[];
  }> {
    const check = this.verifyBackupIntegrity(backupDir);
    if (!check.isValid) {
      return {
        success: false,
        restoredTables: [],
        restoredRowsCount: 0,
        restoredLocalFiles: [],
        errors: [`Cannot restore corrupted backup: ${check.errors.join('; ')}`],
      };
    }

    const restoredTables: string[] = [];
    let restoredRowsCount = 0;
    const restoredLocalFiles: string[] = [];
    const errors: string[] = [];

    // 1. Restore Neon PostgreSQL Tables in dependency-safe order
    if (options.restoreDatabase && isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        const dbDumpDir = path.join(backupDir, 'neon_database');
        for (const tableName of ALL_NEON_TABLES) {
          const filePath = path.join(dbDumpDir, `${tableName}.json`);
          if (fs.existsSync(filePath)) {
            try {
              const rows: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (rows.length > 0) {
                for (const row of rows) {
                  const keys = Object.keys(row);
                  if (keys.length === 0) continue;

                  const values = keys.map((k) => {
                    const val = row[k];
                    if (val !== null && typeof val === 'object') {
                      return JSON.stringify(val);
                    }
                    return val;
                  });

                  // Build parameterized statement
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const cols = keys.join(', ');
                  const updateClause = keys
                    .filter((k) => k !== 'id' && k !== 'code' && k !== 'lock_key')
                    .map((k, i) => `${k} = EXCLUDED.${k}`)
                    .join(', ');

                  const conflictKey = tableName === 'class_workspaces' ? 'id' : tableName === 'shared_generation_locks' ? 'lock_key' : 'id';

                  const query = updateClause.length > 0
                    ? `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictKey}) DO UPDATE SET ${updateClause}`
                    : `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictKey}) DO NOTHING`;

                  await (sql as any).query(query, values);
                  restoredRowsCount++;
                }
              }
              restoredTables.push(tableName);
            } catch (err: any) {
              errors.push(`Table restore error on ${tableName}: ${err.message}`);
            }
          }
        }
      }
    }

    // 2. Restore Local Files
    if (options.restoreLocalFiles) {
      const localFilesDir = path.join(backupDir, 'local_storage');
      const repoDir = path.resolve(process.cwd(), 'curriculum-repo');

      for (const [rel] of Object.entries(check.manifest?.localFiles || {})) {
        const src = path.join(localFilesDir, rel);
        if (fs.existsSync(src)) {
          const dest = path.join(repoDir, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
          restoredLocalFiles.push(rel);
        }
      }
    }

    return {
      success: errors.length === 0,
      restoredTables,
      restoredRowsCount,
      restoredLocalFiles,
      errors,
    };
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
