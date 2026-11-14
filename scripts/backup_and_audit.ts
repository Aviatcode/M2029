import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getNeonSql, isNeonConfigured } from '../src/server/db/neonClient.js';

function sha256File(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'curriculum-repo', 'backups', `backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('====================================================');
  console.log(`🛡️ CREATING PRE-MIGRATION SNAPSHOT IN: ${backupDir}`);
  console.log('====================================================\n');

  // 1. Backup Local JSON files
  const repoDir = path.resolve(process.cwd(), 'curriculum-repo');
  const localFiles = [
    '.classroom_cache.json',
    '.ai_knowledge_cache.json',
    '.shared_classroom_answers.json',
    '.byok_vault.json',
    '.last_sync.json',
    'rag_store/registry.json',
    'rag_store/knowledge_graph.json'
  ];

  const localReport: Record<string, { size: number; sha256: string; recordCount?: number }> = {};

  for (const relPath of localFiles) {
    const srcPath = path.join(repoDir, relPath);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(backupDir, 'local_files', relPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);

      const stat = fs.statSync(srcPath);
      const hash = sha256File(srcPath);
      let count = 0;
      try {
        const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
        if (Array.isArray(parsed)) count = parsed.length;
        else if (parsed.entries && Array.isArray(parsed.entries)) count = parsed.entries.length;
        else if (parsed.answers && typeof parsed.answers === 'object') count = Object.keys(parsed.answers).length;
        else if (typeof parsed === 'object') count = Object.keys(parsed).length;
      } catch {}

      localReport[relPath] = { size: stat.size, sha256: hash, recordCount: count };
      console.log(`✅ Backed up [Local] ${relPath} (${stat.size} bytes, SHA256: ${hash.slice(0, 12)}...)`);
    } else {
      console.log(`⚠️ Local file not found: ${relPath}`);
    }
  }

  // 2. Backup Neon Database Tables
  const dbReport: Record<string, { rowCount: number; backupFile: string; sha256: string }> = {};

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      const tables = [
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
        'byok_credentials',
        'shared_classroom_answers'
      ];

      const neonBackupDir = path.join(backupDir, 'neon_dump');
      fs.mkdirSync(neonBackupDir, { recursive: true });

      for (const t of tables) {
        try {
          const rows = await (sql as any).query(`SELECT * FROM ${t}`);
          const destPath = path.join(neonBackupDir, `${t}.json`);
          fs.writeFileSync(destPath, JSON.stringify(rows, null, 2), 'utf-8');
          const hash = sha256File(destPath);
          dbReport[t] = {
            rowCount: rows.length,
            backupFile: `${t}.json`,
            sha256: hash
          };
          console.log(`✅ Backed up [Neon] Table "${t}": ${rows.length} rows (SHA256: ${hash.slice(0, 12)}...)`);
        } catch (err: any) {
          console.error(`❌ Failed to dump Neon table "${t}":`, err.message);
        }
      }
    }
  }

  // 3. Write manifest
  const manifest = {
    timestamp,
    backupDir,
    localFiles: localReport,
    neonDatabase: dbReport
  };

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n📋 Manifest written to ${manifestPath}`);
  console.log('====================================================\n');
}

main().catch(console.error);
