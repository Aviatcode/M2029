import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getNeonSql, isNeonConfigured } from '../src/server/db/neonClient.js';

async function migrateAiKnowledgeCache(sql: any) {
  const cacheFile = path.resolve(process.cwd(), 'curriculum-repo', '.ai_knowledge_cache.json');
  if (!fs.existsSync(cacheFile)) {
    console.log('ℹ️ No local .ai_knowledge_cache.json found.');
    return { total: 0, imported: 0, updated: 0 };
  }

  const raw = fs.readFileSync(cacheFile, 'utf-8');
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (err: any) {
    console.error('❌ Failed to parse .ai_knowledge_cache.json:', err.message);
    return { total: 0, imported: 0, updated: 0 };
  }

  const entries: any[] = Array.isArray(data.entries) ? data.entries : [];
  console.log(`\n🧠 Found ${entries.length} AI cache entries in local JSON file.`);

  let imported = 0;
  let updated = 0;

  for (const entry of entries) {
    try {
      // Check if entry exists in Neon
      const existing = await (sql as any).query(`SELECT id, iteration_count, hit_count FROM ai_knowledge_cache WHERE id = $1`, [entry.id]);
      
      if (existing.length === 0) {
        // Insert new entry
        await (sql as any).query(`
          INSERT INTO ai_knowledge_cache (
            id, normalized_key, query, subject_name, mode, answer, sections, model_used,
            created_at, last_accessed_at, hit_count, tokens_estimated, iteration_count,
            target_cohort_size, is_cohort_perfected, perfection_score, perfection_tier,
            evolution_history, positive_votes, negative_votes, needs_refinement, is_teacher_curated
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
        `, [
          entry.id,
          entry.normalizedKey || entry.query,
          entry.query,
          entry.subjectName || 'General',
          entry.mode || 'all',
          entry.answer,
          JSON.stringify(entry.sections || {}),
          entry.modelUsed || 'AI Engine',
          entry.createdAt || new Date().toISOString(),
          entry.lastAccessedAt || new Date().toISOString(),
          entry.hitCount || 1,
          entry.tokensEstimated || 1500,
          entry.iterationCount || 1,
          entry.targetCohortSize || 60,
          entry.isCohortPerfected || false,
          entry.perfectionScore || 15,
          entry.perfectionTier || 'Draft',
          JSON.stringify(entry.evolutionHistory || []),
          entry.positiveVotes || 0,
          entry.negativeVotes || 0,
          entry.needsRefinement || false,
          entry.isTeacherCurated || false
        ]);
        imported++;
        console.log(`  ➕ Imported new entry: [${entry.id}] ${entry.query.slice(0, 40)}... (iter: ${entry.iterationCount || 1})`);
      } else {
        // Existing record: only update if local has higher iteration count or more tokens
        const current = existing[0];
        if ((entry.iterationCount || 1) > (current.iteration_count || 1)) {
          await (sql as any).query(`
            UPDATE ai_knowledge_cache SET
              answer = $1,
              sections = $2,
              iteration_count = $3,
              is_cohort_perfected = $4,
              perfection_score = $5,
              perfection_tier = $6,
              evolution_history = $7,
              last_accessed_at = NOW()
            WHERE id = $8
          `, [
            entry.answer,
            JSON.stringify(entry.sections || {}),
            entry.iterationCount,
            entry.isCohortPerfected || false,
            entry.perfectionScore || 15,
            entry.perfectionTier || 'Draft',
            JSON.stringify(entry.evolutionHistory || []),
            entry.id
          ]);
          updated++;
          console.log(`  🔄 Updated higher iteration entry: [${entry.id}] ${entry.query.slice(0, 40)}...`);
        } else {
          // Already in Neon with equal or better iteration
          console.log(`  ✓ Already up-to-date in Neon: [${entry.id}]`);
        }
      }
    } catch (err: any) {
      console.error(`  ❌ Error processing entry [${entry.id}]:`, err.message);
    }
  }

  return { total: entries.length, imported, updated };
}

async function main() {
  console.log('====================================================');
  console.log('⚡ STARTING IDEMPOTENT JSON -> NEON DATA MIGRATION');
  console.log('====================================================\n');

  if (!isNeonConfigured()) {
    console.error('❌ Neon is not configured in .env');
    process.exit(1);
  }

  const sql = getNeonSql();
  if (!sql) {
    console.error('❌ Could not instantiate Neon SQL client');
    process.exit(1);
  }

  // 1. Migrate AI Knowledge Cache
  const aiStats = await migrateAiKnowledgeCache(sql);
  console.log(`\n📊 AI Knowledge Cache Migration Results:`);
  console.log(`   Total JSON entries inspected: ${aiStats.total}`);
  console.log(`   New entries imported: ${aiStats.imported}`);
  console.log(`   Existing entries updated: ${aiStats.updated}`);

  // 2. Final Row Count Verification
  const finalAiCount = await (sql as any).query('SELECT count(*)::int as count FROM ai_knowledge_cache');
  console.log(`\n✅ Final Neon ai_knowledge_cache row count: ${finalAiCount[0].count}`);
  console.log('\n====================================================');
  console.log('🎉 Migration completed safely!');
  console.log('====================================================\n');
}

main().catch(console.error);
