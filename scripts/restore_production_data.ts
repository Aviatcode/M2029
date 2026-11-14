import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { disasterRecoveryService } from '../src/server/backup/disasterRecoveryService.js';

async function main() {
  const targetDir = process.argv[2];

  let backupDir = targetDir;
  if (!backupDir) {
    // Find the latest snapshot in curriculum-repo/backups
    const baseDir = path.resolve(process.cwd(), 'curriculum-repo', 'backups');
    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir)
        .filter((d) => d.startsWith('snapshot_') || d.startsWith('backup_'))
        .sort()
        .reverse();
      if (entries.length > 0) {
        backupDir = path.join(baseDir, entries[0]);
      }
    }
  }

  if (!backupDir || !fs.existsSync(backupDir)) {
    console.error('❌ Please specify a valid backup directory to restore.');
    process.exit(1);
  }

  console.log('=================================================================');
  console.log(`🛡️ M2029 DISASTER RECOVERY: RESTORING SNAPSHOT`);
  console.log(`📁 Source: ${backupDir}`);
  console.log('=================================================================\n');

  try {
    const result = await disasterRecoveryService.restoreFromBackup(backupDir);
    if (result.success) {
      console.log(`✅ Restoration complete!`);
      console.log(`  - Restored Tables : ${result.restoredTables.length}`);
      console.log(`  - Restored Rows   : ${result.restoredRowsCount}`);
      console.log(`  - Local Stores    : ${result.restoredLocalFiles.length}`);
    } else {
      console.error(`❌ Restoration failed:`, result.errors);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Restore execution error:', err?.message || err);
    process.exit(1);
  }
}

main();
