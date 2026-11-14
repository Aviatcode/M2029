import dotenv from 'dotenv';
dotenv.config();

import { queryNeon, isNeonConfigured } from '../src/server/db/neonClient.js';
import { ALL_NEON_TABLES } from '../src/server/backup/disasterRecoveryService.js';

async function audit() {
  if (!isNeonConfigured()) {
    console.error('Neon is not configured');
    process.exit(1);
  }

  console.log('Auditing all 28 Neon PostgreSQL tables...\n');
  const tableCounts: Record<string, number> = {};

  for (const table of ALL_NEON_TABLES) {
    try {
      const rows = await queryNeon<any>(`SELECT COUNT(*) as cnt FROM ${table}`);
      tableCounts[table] = Number(rows[0]?.cnt || 0);
    } catch (err: any) {
      tableCounts[table] = -1; // Not found / error
    }
  }

  console.log('TABLE ROW COUNTS IN LIVE NEON:');
  console.log('-------------------------------------------');
  for (const [t, cnt] of Object.entries(tableCounts)) {
    console.log(`  ${t.padEnd(28)} : ${cnt >= 0 ? cnt : 'TABLE NOT FOUND'}`);
  }
  console.log('-------------------------------------------');

  // Check test records in class_workspaces
  const testClasses = await queryNeon<any>(
    `SELECT id, code, name, created_at FROM class_workspaces WHERE id LIKE '%test%' OR id LIKE '%e2e%' OR id LIKE '%release%'`
  );
  console.log(`\nTest Workspaces Found (${testClasses.length}):`);
  testClasses.forEach((c) => console.log(`  - [${c.id}] code: ${c.code}, name: ${c.name}`));

  // Check test records in student_byok_credentials
  const testByok = await queryNeon<any>(
    `SELECT id, student_id, provider, masked_key, created_at FROM student_byok_credentials WHERE student_id LIKE '%test%' OR student_id LIKE '%e2e%' OR student_id LIKE '%alpha%'`
  );
  console.log(`\nTest BYOK Records Found (${testByok.length}):`);
  testByok.forEach((b) => console.log(`  - [${b.id}] student: ${b.student_id}, provider: ${b.provider}`));

  // Check test records in document_assets
  const testDocs = await queryNeon<any>(
    `SELECT storage_key, original_name, created_at FROM document_assets WHERE original_name LIKE '%test%' OR original_name LIKE '%acid%' OR original_name LIKE '%sample%'`
  );
  console.log(`\nTest Documents Found in document_assets (${testDocs.length}):`);
  testDocs.forEach((d) => console.log(`  - ${d.original_name} (${d.storage_key})`));
}

audit().catch(console.error);
