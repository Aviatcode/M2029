import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { disasterRecoveryService } from '../src/server/backup/disasterRecoveryService.js';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  const allowOverwrite = args.includes('--overwrite');

  let targetDir = args.find((a) => !a.startsWith('--'));

  if (!targetDir) {
    const baseDir = path.resolve(process.cwd(), 'curriculum-repo', 'backups');
    if (fs.existsSync(baseDir)) {
      const entries = fs
        .readdirSync(baseDir)
        .filter((d) => d.startsWith('snapshot_') || d.startsWith('backup_'))
        .sort()
        .reverse();
      if (entries.length > 0) {
        targetDir = path.join(baseDir, entries[0]);
      }
    }
  }

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error('❌ Please specify a valid backup directory to inspect or restore.');
    console.error('Usage:');
    console.error('  npx tsx scripts/restore_production_data.ts [backupDir]             (Dry Run / Diff Preview)');
    console.error('  npx tsx scripts/restore_production_data.ts [backupDir] --execute   (Insert missing records safely)');
    console.error('  npx tsx scripts/restore_production_data.ts [backupDir] --execute --overwrite (Overwrite conflicting records)\n');
    process.exit(1);
  }

  console.log('=================================================================');
  console.log(`🛡️  M2029 SAFE DISASTER RESTORATION ENGINE`);
  console.log(`📁 Source: ${targetDir}`);
  console.log(`⚙️  Mode  : ${isDryRun ? 'DRY RUN (Simulated Preview - 0 DB writes)' : allowOverwrite ? 'EXECUTE (WITH OVERWRITE)' : 'EXECUTE (NON-DESTRUCTIVE INSERT ONLY)'}`);
  console.log('=================================================================\n');

  if (isDryRun) {
    console.log('ℹ️  Running in safe DRY RUN mode by default.');
    console.log('   Comparing backup records against live Neon database...');
  } else {
    console.log('⚠️  LIVE EXECUTION REQUESTED.');
    if (!allowOverwrite) {
      console.log('   Running in non-destructive mode. Missing records will be inserted.');
      console.log('   Conflicting live rows will NOT be modified.');
    } else {
      console.log('   ⚠️ OVERWRITE FLAG ACTIVE: Conflicting records in live database will be updated.');
    }
  }

  try {
    const result = await disasterRecoveryService.restoreFromBackup(targetDir, {
      dryRun: isDryRun,
      overwriteExisting: allowOverwrite,
      restoreDatabase: true,
      restoreLocalFiles: true,
    });

    if (!result.success) {
      console.error('\n❌ Restoration error:', result.errors.join('\n'));
      process.exit(1);
    }

    console.log('\n📊 TABLE RECONCILIATION REPORT:');
    console.log('-----------------------------------------------------------------------------------------');
    console.log(
      `${'Table Name'.padEnd(28)} | ${'Backup'.padStart(6)} | ${'To Insert'.padStart(9)} | ${'Identical'.padStart(9)} | ${'Conflicts'.padStart(9)}`
    );
    console.log('-----------------------------------------------------------------------------------------');

    for (const [tbl, diff] of Object.entries(result.diffs)) {
      if (diff.totalInBackup === 0 && diff.toInsert === 0 && diff.conflicts === 0) continue;
      console.log(
        `${tbl.padEnd(28)} | ${String(diff.totalInBackup).padStart(6)} | ${String(diff.toInsert).padStart(9)} | ${String(diff.toSkipIdentical).padStart(9)} | ${String(diff.conflicts).padStart(9)}`
      );
    }
    console.log('-----------------------------------------------------------------------------------------');

    console.log(`\nSummary Statistics:`);
    console.log(`  - Total Rows in Backup       : ${result.summary.totalBackupRows}`);
    console.log(`  - Rows to Insert (New)       : ${result.summary.totalToInsert}`);
    console.log(`  - Identical Rows (No Change) : ${result.summary.totalToSkipIdentical}`);
    console.log(`  - Conflicting Rows (Differ)  : ${result.summary.totalConflicts}`);

    if (isDryRun) {
      console.log('\n✅ Dry run complete. ZERO rows were written to the live database.');
      console.log('\nTo apply changes safely:');
      console.log('  1. (Recommended) Test restoring into an isolated Neon branch first by changing DATABASE_URL:');
      console.log('     $env:DATABASE_URL="postgresql://.../neondb_branch_restore"');
      console.log('  2. Insert missing records safely without overwriting live data:');
      console.log(`     npx tsx scripts/restore_production_data.ts "${targetDir}" --execute`);
      console.log('  3. Overwrite conflicting live rows with backup data (requires explicit confirmation):');
      console.log(`     npx tsx scripts/restore_production_data.ts "${targetDir}" --execute --overwrite`);
    } else {
      console.log(`\n✅ ${result.message}`);
    }

    console.log('\nRollback Instructions:');
    console.log('  - If you need to revert, restore from your prior verified snapshot:');
    console.log('    npx tsx scripts/restore_production_data.ts "<prior_backup_path>" --execute --overwrite\n');
  } catch (err: any) {
    console.error('❌ Restore execution error:', err?.message || err);
    process.exit(1);
  }
}

main();
