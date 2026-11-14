import dotenv from 'dotenv';
dotenv.config();

import { disasterRecoveryService } from '../src/server/backup/disasterRecoveryService.js';

async function main() {
  console.log('=================================================================');
  console.log('🛡️ M2029 DISASTER RECOVERY: CREATING PRODUCTION BACKUP SNAPSHOT');
  console.log('=================================================================\n');

  try {
    const result = await disasterRecoveryService.createCompleteBackup();
    console.log(`✅ Snapshot successfully created in:\n   ${result.backupDir}`);
    console.log(`\nManifest Summary:`);
    console.log(`  - Neon Tables Dumped : ${result.manifest.totalTables} tables`);
    console.log(`  - Total Rows Dumped  : ${result.manifest.totalRows} rows`);
    console.log(`  - Local Files Saved  : ${Object.keys(result.manifest.localFiles).length} files`);
    console.log(`  - Manifest SHA-256   : ${result.manifest.manifestSha256}`);
    console.log('\nIntegrity verification test...');
    const verify = disasterRecoveryService.verifyBackupIntegrity(result.backupDir);
    if (verify.isValid) {
      console.log(`✅ Backup verified! All ${verify.verifiedFiles} files match cryptographic checksums.`);
    } else {
      console.error(`❌ Verification failed:`, verify.errors);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Disaster recovery backup failed:', err?.message || err);
    process.exit(1);
  }
}

main();
