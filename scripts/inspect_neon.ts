import dotenv from 'dotenv';
dotenv.config();

import { getNeonSql, isNeonConfigured } from '../src/server/db/neonClient.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Neon configured:', isNeonConfigured());
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;

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

  console.log('\n--- Neon PostgreSQL Row Counts ---');
  for (const t of tables) {
    try {
      const res = await (sql as any).query(`SELECT count(*)::int as count FROM ${t}`);
      console.log(`${t}: ${res[0].count}`);
    } catch (e: any) {
      console.log(`${t}: ERROR: ${e.message}`);
    }
  }

  console.log('\n--- Local JSON File Sizes & Stats ---');
  const repoDir = path.resolve(process.cwd(), 'curriculum-repo');
  const files = [
    '.classroom_cache.json',
    '.ai_knowledge_cache.json',
    '.shared_classroom_answers.json',
    '.byok_vault.json',
    '.last_sync.json',
    'rag_store/registry.json',
    'rag_store/knowledge_graph.json'
  ];

  for (const f of files) {
    const full = path.join(repoDir, f);
    if (fs.existsSync(full)) {
      const stat = fs.statSync(full);
      try {
        const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
        let summary = '';
        if (Array.isArray(content)) {
          summary = `Array with ${content.length} items`;
        } else if (content.entries && Array.isArray(content.entries)) {
          summary = `Object with ${content.entries.length} entries`;
        } else if (typeof content === 'object') {
          summary = `Object keys: ${Object.keys(content).join(', ')}`;
        }
        console.log(`${f}: ${stat.size} bytes | ${summary}`);
      } catch (e: any) {
        console.log(`${f}: ${stat.size} bytes (not JSON or parse error)`);
      }
    } else {
      console.log(`${f}: DOES NOT EXIST`);
    }
  }
}

main().catch(console.error);
