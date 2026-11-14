import dotenv from 'dotenv';
dotenv.config();

import { getNeonSql } from '../src/server/db/neonClient.js';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;

  console.log('🔍 Checking for duplicate rows in ai_knowledge_cache...');
  const dups = await (sql as any).query(`
    SELECT normalized_key, subject_name, mode, count(*)::int as cnt
    FROM ai_knowledge_cache
    GROUP BY normalized_key, subject_name, mode
    HAVING count(*) > 1
  `);

  console.log(`Found ${dups.length} duplicate groups.`);

  for (const group of dups) {
    const rows = await (sql as any).query(`
      SELECT id, iteration_count, hit_count, created_at
      FROM ai_knowledge_cache
      WHERE normalized_key = $1 AND subject_name = $2 AND mode = $3
      ORDER BY iteration_count DESC, hit_count DESC, created_at DESC
    `, [group.normalized_key, group.subject_name, group.mode]);

    console.log(`Group "${group.normalized_key.slice(0, 30)}..." has ${rows.length} rows:`);
    const [primary, ...duplicates] = rows;
    console.log(`  Keeping primary: ${primary.id} (iter: ${primary.iteration_count}, hits: ${primary.hit_count})`);

    let totalHits = primary.hit_count;
    for (const dup of duplicates) {
      totalHits += dup.hit_count;
      console.log(`  Removing duplicate: ${dup.id} (iter: ${dup.iteration_count}, hits: ${dup.hit_count})`);
      await (sql as any).query(`DELETE FROM ai_knowledge_cache WHERE id = $1`, [dup.id]);
    }

    // Update primary with combined hits
    await (sql as any).query(`UPDATE ai_knowledge_cache SET hit_count = $1 WHERE id = $2`, [totalHits, primary.id]);
  }

  // Now ensure index and columns exist
  console.log('⚡ Adding missing columns and indexes to Neon...');
  try {
    await (sql as any).query(`ALTER TABLE ai_knowledge_cache ADD COLUMN IF NOT EXISTS contributing_models JSONB DEFAULT '[]'::jsonb;`);
    console.log('✅ Column contributing_models verified/added.');
  } catch (e: any) {
    console.log('Notice adding contributing_models:', e.message);
  }

  try {
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS download_url TEXT;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS rag_doc_id TEXT;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS extra_metadata JSONB DEFAULT '{}'::jsonb;`);
    console.log('✅ Columns in academic_materials verified/added.');
  } catch (e: any) {
    console.log('Notice adding material columns:', e.message);
  }

  try {
    await (sql as any).query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_key_subject_mode 
      ON ai_knowledge_cache(normalized_key, subject_name, mode);
    `);
    console.log('✅ Unique index idx_cache_key_subject_mode created successfully.');
  } catch (e: any) {
    console.log('Notice creating index:', e.message);
  }

  console.log('🎉 Database cleanup and schema updates complete!');
}

main().catch(console.error);
