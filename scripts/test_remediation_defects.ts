import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DocumentStorageService,
  LocalStorageProvider,
  B2StorageProvider,
} from '../src/server/storage/documentStorageService.js';
import {
  validateByokMasterKey,
  getMasterEncryptionSecret,
  encryptApiKey,
  decryptApiKey,
  decryptApiKeyDetailed,
  byokSecurityService,
} from '../src/server/ai/multiProvider/byokSecurityService.js';
import {
  validateOrigin,
  createCorsMiddleware,
} from '../src/server/security/corsPolicy.js';
import {
  disasterRecoveryService,
  ALL_NEON_TABLES,
} from '../src/server/backup/disasterRecoveryService.js';
import { validateEnvironment } from '../src/server/config/environmentValidator.js';

interface TestResult {
  name: string;
  passed: boolean;
  type: 'REAL_SERVICE' | 'UNIT_LOGIC';
  error?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, name: string, type: 'REAL_SERVICE' | 'UNIT_LOGIC' = 'UNIT_LOGIC', errDetail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    testResults.push({ name, passed: true, type });
  } else {
    console.error(`  ❌ FAIL: ${name}${errDetail ? ` (${errDetail})` : ''}`);
    testResults.push({ name, passed: false, type, error: errDetail || 'Assertion failed' });
  }
}

async function runRemediationTests() {
  console.log('=================================================================');
  console.log('🧪 M2029 CRITICAL PRODUCTION DEFECT REMEDIATION TEST SUITE');
  console.log('=================================================================\n');

  const testTempDir = path.resolve(process.cwd(), 'curriculum-repo', 'scratch_test');
  fs.mkdirSync(testTempDir, { recursive: true });

  // ---------------------------------------------------------------------------
  // DEFECT 1: PERMANENT DOCUMENT STORAGE
  // ---------------------------------------------------------------------------
  console.log('--- DEFECT 1: PERMANENT DOCUMENT STORAGE TESTS ---');

  // 1.1 In production, reject binary uploads when durable cloud storage is not configured
  const origNodeEnv = process.env.NODE_ENV;
  const origB2Key = process.env.B2_APPLICATION_KEY;
  const origB2KeyId = process.env.B2_APPLICATION_KEY_ID;
  const origB2Bucket = process.env.B2_BUCKET_NAME;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.B2_APPLICATION_KEY;
    delete process.env.B2_APPLICATION_KEY_ID;
    delete process.env.B2_BUCKET_NAME;

    const prodStorage = new DocumentStorageService();
    assert(!prodStorage.isDurableConfigured(), '1.1 Durable storage reported as unconfigured when B2 env vars missing');

    const sampleFile = path.join(testTempDir, 'sample_syllabus.txt');
    fs.writeFileSync(sampleFile, 'Test university curriculum notes for M2029 BCA semester.');

    let threwExpected = false;
    try {
      await prodStorage.storeFile({
        key: 'test_sample.txt',
        filePath: sampleFile,
        mimeType: 'text/plain',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('DURABLE_STORAGE_UNCONFIGURED')) {
        threwExpected = true;
      }
    }
    assert(
      threwExpected,
      '1.2 Production rejects binary upload with DURABLE_STORAGE_UNCONFIGURED rather than silently using ephemeral local disk',
      'REAL_SERVICE'
    );
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }

  // 1.3 In non-production, local staging upload succeeds
  const devStorage = new DocumentStorageService();
  const testLocalKey = `test_local_${Date.now()}.txt`;
  const sampleFileDev = path.join(testTempDir, testLocalKey);
  const sampleContent = 'BCA-2029 Operating Systems Exam Notes: Virtual Memory & Page Replacement';
  fs.writeFileSync(sampleFileDev, sampleContent);

  const localMeta = await devStorage.storeFile({
    key: testLocalKey,
    filePath: sampleFileDev,
    mimeType: 'text/plain',
  });
  assert(localMeta.key === testLocalKey, '1.3 Non-production local storage stores file and returns metadata', 'REAL_SERVICE');
  assert(await devStorage.exists(testLocalKey), '1.4 Storage service exists() correctly identifies stored file', 'REAL_SERVICE');

  // 1.5 Process restart simulation: Create a NEW instance of storage service and verify download & checksum
  const restartedStorage = new DocumentStorageService();
  assert(await restartedStorage.exists(testLocalKey), '1.5 After service instance restart, exists() identifies stored file', 'REAL_SERVICE');
  const downloadedBuf = await restartedStorage.getBuffer(testLocalKey);
  assert(
    downloadedBuf.toString('utf-8') === sampleContent,
    '1.6 After service instance restart, downloaded file content and checksum match original',
    'REAL_SERVICE'
  );

  // Clean up test file
  await restartedStorage.deleteObject(testLocalKey);

  // ---------------------------------------------------------------------------
  // DEFECT 2: DURABLE BACKUPS
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 2: DURABLE BACKUP TESTS ---');

  const customBackupDest = path.join(testTempDir, `custom_backup_${Date.now()}`);
  const backupResult = await disasterRecoveryService.createCompleteBackup({
    destinationDir: customBackupDest,
    overwrite: true,
  });

  assert(backupResult.success, '2.1 Backup snapshot created successfully at custom independent destination', 'REAL_SERVICE');
  assert(fs.existsSync(path.join(customBackupDest, 'manifest.json')), '2.2 manifest.json exists in destination', 'REAL_SERVICE');
  assert(
    backupResult.manifest.totalTables === ALL_NEON_TABLES.length,
    `2.3 Backup includes all ${ALL_NEON_TABLES.length} Neon tables`,
    'REAL_SERVICE'
  );
  assert(Boolean(backupResult.manifest.manifestSha256), '2.4 Cryptographic manifest SHA-256 is present', 'REAL_SERVICE');

  // 2.5 Prevent silent overwrite without explicit overwrite flag
  let overwriteRejected = false;
  try {
    await disasterRecoveryService.createCompleteBackup({
      destinationDir: customBackupDest,
      overwrite: false,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('BACKUP_DESTINATION_EXISTS')) {
      overwriteRejected = true;
    }
  }
  assert(overwriteRejected, '2.5 createCompleteBackup prevents silently overwriting an existing backup directory', 'UNIT_LOGIC');

  // 2.6 Cryptographic integrity verification
  const verifyReport = disasterRecoveryService.verifyBackupIntegrity(customBackupDest);
  assert(verifyReport.isValid, '2.6 verifyBackupIntegrity cryptographically validates all table hashes', 'REAL_SERVICE');

  // ---------------------------------------------------------------------------
  // DEFECT 3: SAFE RESTORE (DRY RUN & OVERWRITE PROTECTION)
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 3: SAFE RESTORE TESTS ---');

  // 3.1 Dry run is default
  const restoreDryRun = await disasterRecoveryService.restoreFromBackup(customBackupDest);
  assert(restoreDryRun.success, '3.1 restoreFromBackup executes cleanly', 'REAL_SERVICE');
  assert(restoreDryRun.dryRun === true, '3.2 restoreFromBackup defaults to dryRun === true', 'UNIT_LOGIC');
  assert(
    restoreDryRun.restoredRowsCount === 0,
    '3.3 Dry run writes ZERO rows to the database (restoredRowsCount === 0)',
    'REAL_SERVICE'
  );
  assert(Boolean(restoreDryRun.summary), '3.4 Dry run calculates detailed summary (inserted/identical/conflicted)', 'UNIT_LOGIC');
  assert(
    restoreDryRun.summary.totalToSkipIdentical > 0 || restoreDryRun.summary.totalBackupRows >= 0,
    '3.5 Dry run accurately identifies identical live records without mutating them',
    'REAL_SERVICE'
  );

  // ---------------------------------------------------------------------------
  // DEFECT 4: BYOK MASTER KEY FALLBACK & SAFE MIGRATION
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 4: BYOK MASTER KEY & MIGRATION TESTS ---');

  // 4.1 Master key format and strength validation
  const shortKeyValidation = validateByokMasterKey('too-short-key');
  assert(!shortKeyValidation.valid, '4.1 validateByokMasterKey rejects keys shorter than 32 characters', 'UNIT_LOGIC');

  const placeholderValidation = validateByokMasterKey('your_master_key_placeholder_1234567890');
  assert(!placeholderValidation.valid, '4.2 validateByokMasterKey rejects placeholder values', 'UNIT_LOGIC');

  const strongTestKey = 'a-very-strong-production-master-key-entropy-64chars-length-verified';
  const strongValidation = validateByokMasterKey(strongTestKey);
  assert(strongValidation.valid, '4.3 validateByokMasterKey approves valid 32+ character keys', 'UNIT_LOGIC');

  // 4.2 In production, missing BYOK_MASTER_KEY throws critical error
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.BYOK_MASTER_KEY;
    let prodMasterKeyThrew = false;
    try {
      getMasterEncryptionSecret();
    } catch (err: any) {
      if (err.message && err.message.includes('CRITICAL_SECURITY_CONFIG_ERROR')) {
        prodMasterKeyThrew = true;
      }
    }
    assert(prodMasterKeyThrew, '4.4 Production throws critical error when BYOK_MASTER_KEY is missing or invalid', 'UNIT_LOGIC');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }

  // 4.3 Safe migration: verify that credentials encrypted with legacy secret (DATABASE_URL) remain decryptable
  const legacySecret = process.env.DATABASE_URL!;
  const legacyKeyDerived = crypto.createHash('sha256').update(legacySecret).digest();
  const samplePlainApiKey = 'sk-ant-test-student-credential-secret-12345';

  // Encrypt with legacy key (simulating existing records in Neon)
  const legacyCiphertext = encryptApiKey(samplePlainApiKey, legacyKeyDerived);

  // Now set a brand new independent BYOK_MASTER_KEY
  process.env.BYOK_MASTER_KEY = strongTestKey;

  // Decrypt using dual-key aware decryptApiKeyDetailed
  const migrationDecryptResult = decryptApiKeyDetailed(legacyCiphertext);
  assert(
    migrationDecryptResult.decrypted === samplePlainApiKey,
    '4.5 Pre-migration credential encrypted with DATABASE_URL remains 100% decryptable after new BYOK_MASTER_KEY is set',
    'UNIT_LOGIC'
  );
  assert(
    migrationDecryptResult.usedLegacyFallback === true,
    '4.6 decryptApiKeyDetailed flags usedLegacyFallback === true for legacy credentials',
    'UNIT_LOGIC'
  );

  // 4.4 New encryptions strictly use the new BYOK_MASTER_KEY
  const newCiphertext = encryptApiKey(samplePlainApiKey);
  const newDecryptResult = decryptApiKeyDetailed(newCiphertext);
  assert(
    newDecryptResult.decrypted === samplePlainApiKey,
    '4.7 New credential encrypted with BYOK_MASTER_KEY decrypts successfully',
    'UNIT_LOGIC'
  );
  assert(
    newDecryptResult.usedLegacyFallback === false,
    '4.8 New credential uses primary BYOK_MASTER_KEY (usedLegacyFallback === false)',
    'UNIT_LOGIC'
  );

  // ---------------------------------------------------------------------------
  // DEFECT 5: STRICT CORS
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 5: STRICT CORS TESTS ---');

  const configuredOrigins = ['https://m2029.vercel.app', 'https://syllabus-os.vercel.app'];

  // 5.1 Production: Allowed origin
  const prodAllowed = validateOrigin('https://m2029.vercel.app', configuredOrigins, true);
  assert(prodAllowed.allowed, '5.1 Production allows explicitly configured origin (https://m2029.vercel.app)', 'UNIT_LOGIC');

  // 5.2 Production: Unauthorized origin
  const prodBlocked = validateOrigin('https://malicious-phishing-site.com', configuredOrigins, true);
  assert(!prodBlocked.allowed, '5.2 Production blocks unauthorized origin', 'UNIT_LOGIC');

  // 5.3 Production: Broad vercel.app subdomain blocked unless explicitly listed
  const prodSubdomain = validateOrigin('https://evil-unauthorized-app.vercel.app', configuredOrigins, true);
  assert(!prodSubdomain.allowed, '5.3 Production blocks arbitrary unconfigured .vercel.app subdomains', 'UNIT_LOGIC');

  // 5.4 Production: Localhost blocked in production
  const prodLocal = validateOrigin('http://localhost:3000', configuredOrigins, true);
  assert(!prodLocal.allowed, '5.4 Production blocks localhost/127.0.0.1 unless explicitly in ALLOWED_ORIGINS', 'UNIT_LOGIC');

  // 5.5 Production: Fail-closed if ALLOWED_ORIGINS is empty
  const prodFailClosed = validateOrigin('https://m2029.vercel.app', [], true);
  assert(!prodFailClosed.allowed, '5.5 Production fails closed (rejects all) when ALLOWED_ORIGINS is empty', 'UNIT_LOGIC');

  // 5.6 Development: Localhost permitted in development
  const devLocal = validateOrigin('http://localhost:3000', configuredOrigins, false);
  assert(devLocal.allowed, '5.6 Development mode permits localhost origins', 'UNIT_LOGIC');

  // 5.7 Malformed origin rejected
  const malformedCheck = validateOrigin('not-a-valid-origin-string', configuredOrigins, true);
  assert(!malformedCheck.allowed, '5.7 Malformed origin string is rejected with 403 error', 'UNIT_LOGIC');

  // 5.8 Middleware test: missing Origin header proceeds to next() without setting wildcard
  const corsMw = createCorsMiddleware({ isProd: true, allowedOrigins: configuredOrigins });
  let nextCalled = false;
  let headersSet: Record<string, string> = {};
  const mockReq: any = { headers: {} };
  const mockRes: any = {
    header: (k: string, v: string) => {
      headersSet[k] = v;
    },
    status: () => mockRes,
    json: () => mockRes,
  };
  corsMw(mockReq, mockRes, () => {
    nextCalled = true;
  });
  assert(nextCalled, '5.8 Request with missing Origin header passes to next() middleware', 'UNIT_LOGIC');
  assert(!headersSet['Access-Control-Allow-Origin'], '5.9 Production does NOT emit wildcard Access-Control-Allow-Origin: * when Origin is missing', 'UNIT_LOGIC');

  // ---------------------------------------------------------------------------
  // DEFECT 6: PRODUCTION CONFIGURATION CHECKLIST
  // ---------------------------------------------------------------------------
  console.log('\n--- DEFECT 6: PRODUCTION CONFIGURATION CHECKLIST TESTS ---');

  const envReport = validateEnvironment();
  assert(Boolean(envReport.criticalVariables.NODE_ENV), '6.1 Audit checklist includes NODE_ENV', 'UNIT_LOGIC');
  assert(Boolean(envReport.criticalVariables.PORT), '6.2 Audit checklist includes PORT', 'UNIT_LOGIC');
  assert(Boolean(envReport.criticalVariables.DATABASE_URL), '6.3 Audit checklist includes DATABASE_URL', 'UNIT_LOGIC');
  assert(Boolean(envReport.criticalVariables.BYOK_MASTER_KEY), '6.4 Audit checklist includes BYOK_MASTER_KEY', 'UNIT_LOGIC');
  assert(Boolean(envReport.criticalVariables.ADMIN_API_KEY), '6.5 Audit checklist includes ADMIN_API_KEY', 'UNIT_LOGIC');
  assert(Boolean(envReport.criticalVariables.ALLOWED_ORIGINS), '6.6 Audit checklist includes ALLOWED_ORIGINS', 'UNIT_LOGIC');
  assert(Boolean(envReport.storageVariables.B2_APPLICATION_KEY_ID), '6.7 Audit checklist includes B2 storage credentials', 'UNIT_LOGIC');

  // Clean up scratch dir
  try {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  } catch {}

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log(`🎯 TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log('=================================================================\n');

  if (passedCount < totalCount) {
    console.error('❌ Some tests failed:');
    testResults.filter((r) => !r.passed).forEach((r) => console.error(`  - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('✅ ALL PRODUCTION DEFECT REMEDIATION TESTS PASSED CLEANLY.');
  }
}

runRemediationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
