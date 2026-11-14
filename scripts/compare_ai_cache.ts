import dotenv from 'dotenv';
dotenv.config();

import { getNeonSql } from '../src/server/db/neonClient.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;

  const neonEntries = await (sql as any).query('SELECT id, normalized_key, subject_name, mode, hit_count, iteration_count FROM ai_knowledge_cache');
  console.log(`Neon ai_knowledge_cache entries (${neonEntries.length}):`);
  for (const r of neonEntries) {
    console.log(`- [${r.id}] ${r.normalized_key} | ${r.subject_name} | mode=${r.mode} | hits=${r.hit_count} | iter=${r.iteration_count}`);
  }

  const cacheFile = path.resolve(process.cwd(), 'curriculum-repo', '.ai_knowledge_cache.json');
  if (fs.existsSync(cacheFile)) {
    const raw = fs.readFileSync(cacheFile, 'utf-8');
    const data = JSON.parse(raw);
    console.log(`\nLocal .ai_knowledge_cache.json entries (${data.entries?.length || 0}):`);
    for (const e of (data.entries || [])) {
      console.log(`- [${e.id}] ${e.normalizedKey} | ${e.subjectName} | mode=${e.mode} | hits=${e.hitCount} | iter=${e.iterationCount}`);
    }
  }
}

main().catch(console.error);
