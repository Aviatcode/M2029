import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { disasterRecoveryService } from '../src/server/backup/disasterRecoveryService.js';

async function main() {
  console.log('=================================================================');
  console.log('🛡️  M2029 DISASTER RECOVERY: PRODUCTION BACKUP EXPORTER');
  console.log('=================================================================\n');

  // Parse CLI flags
  let targetDir: string | undefined;
  let forceOverwrite = false;

  const outIdx = process.argv.indexOf('--out');
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    targetDir = path.resolve(process.argv[outIdx + 1]);
  }

  if (process.argv.includes('--force') || process.argv.includes('--overwrite')) {
    forceOverwrite = true;
  }

  console.log('⚠️  DURABILITY NOTICE:');
  console.log('   Render free-tier container storage is EPHEMERAL and wiped upon restart.');
  console.log('   Running this command locally on your machine with `--out <path>` creates');
  console.log('   a permanent offline snapshot safely saved on your computer.\n');

  try {
    const result = await disasterRecoveryService.createCompleteBackup({
      destinationDir: targetDir,
      overwrite: forceOverwrite,
    });

    console.log(`✅ Snapshot successfully created in:\n   ${result.backupDir}\n`);
    console.log(`Manifest Summary:`);
    console.log(`  - Neon Tables Dumped    : ${result.manifest.totalTables} tables`);
    console.log(`  - Total Rows Dumped     : ${result.manifest.totalRows} rows`);
    console.log(`  - Local Files Saved     : ${Object.keys(result.manifest.localFiles).length} files`);
    console.log(`  - Document Asset Refs   : ${result.manifest.documentAssets?.length || 0} assets`);
    console.log(`  - Cryptographic SHA-256 : ${result.manifest.manifestSha256}`);

    console.log('\nVerifying snapshot integrity...');
    const verify = disasterRecoveryService.verifyBackupIntegrity(result.backupDir);
    if (verify.isValid) {
      console.log(`✅ Integrity verified! All ${verify.verifiedFiles} files match cryptographic checksums.`);
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
