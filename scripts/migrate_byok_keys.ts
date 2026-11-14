import dotenv from 'dotenv';
dotenv.config();

import { queryNeon, isNeonConfigured, getNeonSql } from '../src/server/db/neonClient.js';
import {
  validateByokMasterKey,
  decryptApiKeyDetailed,
  encryptApiKey,
} from '../src/server/ai/multiProvider/byokSecurityService.js';

async function main() {
  console.log('=================================================================');
  console.log('🔐 M2029 BYOK KEY MIGRATION UTILITY');
  console.log('=================================================================\n');

  // Check if a key was passed via CLI arg
  const keyArgIndex = process.argv.indexOf('--key');
  if (keyArgIndex !== -1 && process.argv[keyArgIndex + 1]) {
    process.env.BYOK_MASTER_KEY = process.argv[keyArgIndex + 1];
  }

  const validation = validateByokMasterKey();
  if (!validation.valid) {
    console.error('❌ Migration cannot proceed:', validation.reason);
    console.error('\nPlease supply a valid 32+ character BYOK_MASTER_KEY in .env or pass:');
    console.error('  npx tsx scripts/migrate_byok_keys.ts --key <your-32-char-secret>\n');
    process.exit(1);
  }

  if (!isNeonConfigured()) {
    console.error('❌ Neon PostgreSQL DATABASE_URL is not configured. Cannot migrate credentials.');
    process.exit(1);
  }

  console.log('✓ Master key validation passed (Length: >= 32 chars).');
  console.log('✓ Connecting to Neon PostgreSQL...');

  const sql = getNeonSql();
  if (!sql) {
    console.error('❌ Failed to initialize Neon SQL client.');
    process.exit(1);
  }

  try {
    const rows: any[] = await (sql as any).query(
      `SELECT id, student_id, provider, encrypted_key, masked_key FROM student_byok_credentials`
    );

    console.log(`✓ Found ${rows.length} BYOK credential records in Neon.\n`);

    let alreadyCurrent = 0;
    let migratedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        const check = decryptApiKeyDetailed(row.encrypted_key);
        if (!check.usedLegacyFallback) {
          alreadyCurrent++;
          continue;
        }

        // Successfully decrypted using legacy fallback (DATABASE_URL)
        const plainKey = check.decrypted;
        const newEncrypted = encryptApiKey(plainKey);

        await (sql as any).query(
          `UPDATE student_byok_credentials SET encrypted_key = $1, updated_at = NOW() WHERE id = $2`,
          [newEncrypted, row.id]
        );

        // Immediate verification
        const verifyRows: any[] = await (sql as any).query(
          `SELECT encrypted_key FROM student_byok_credentials WHERE id = $1`,
          [row.id]
        );
        const verifyCheck = decryptApiKeyDetailed(verifyRows[0].encrypted_key);
        if (verifyCheck.usedLegacyFallback || verifyCheck.decrypted !== plainKey) {
          throw new Error('Post-update verification mismatch');
        }

        migratedCount++;
        console.log(`  ✓ Migrated [${row.provider}] for student "${row.student_id}" (${row.masked_key})`);
      } catch (err: any) {
        failedCount++;
        console.error(`  ❌ Failed migrating row ${row.id} (${row.masked_key}):`, err?.message || err);
      }
    }

    console.log('\n=================================================================');
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`  - Total Rows Inspected : ${rows.length}`);
    console.log(`  - Already Current      : ${alreadyCurrent}`);
    console.log(`  - Successfully Migrated: ${migratedCount}`);
    console.log(`  - Failed               : ${failedCount}`);
    console.log('=================================================================\n');

    if (failedCount > 0) {
      console.error('⚠️ Some keys failed migration. Do not remove legacy fallback until investigated.');
      process.exit(1);
    } else {
      console.log('✅ All student BYOK credentials are verified decryptable with BYOK_MASTER_KEY.');
    }
  } catch (err: any) {
    console.error('❌ Database migration error:', err?.message || err);
    process.exit(1);
  }
}

main();
