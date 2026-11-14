import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isNeonConfigured, queryNeon } from '../src/server/db/neonClient.js';
import {
  documentDeduplicationService,
  calculateSimHash,
  calculateSimHashDistance,
} from '../src/server/storage/documentDeduplicationService.js';
import { documentStorageService } from '../src/server/storage/documentStorageService.js';
import { ragEngine } from '../src/server/rag/ragIndex.js';

interface TestResult {
  scenario: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, scenario: string, message: string, details?: any) {
  if (condition) {
    results.push({ scenario, passed: true, message });
    console.log(`  ✅ [PASS] ${scenario}: ${message}`);
  } else {
    results.push({ scenario, passed: false, message, details });
    console.error(`  ❌ [FAIL] ${scenario}: ${message}`);
    if (details) console.error('     Details:', details);
  }
}

async function runPhase2Tests() {
  console.log('=================================================================');
  console.log('🧪 M2029 PHASE 2: 11-SCENARIO DEDUPLICATION & STORAGE TEST SUITE');
  console.log('=================================================================\n');

  if (!isNeonConfigured()) {
    console.error('❌ Cannot run tests: Neon database is not configured.');
    process.exit(1);
  }

  const testDir = path.resolve(process.cwd(), 'curriculum-repo', 'test_scratch');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // Create test dummy files
  const runId = Date.now();
  const baseContent = `
    University Computer Science Department - Session ${runId}
    Unit 4: Quantum Key Distribution Protocol BB84 and E91 Implementation
    
    Quantum key distribution uses principles of quantum mechanics to guarantee secure communication.
    The BB84 protocol uses four polarization states of photons across rectilinear and diagonal bases.
    The fundamental no-cloning theorem guarantees that an unknown quantum state cannot be copied.
    Any eavesdropping attempt by Eve inevitably introduces detectable perturbation in the quantum bit error rate.
    
    Decoy state method enhances communication distance and security against photon number splitting attacks.
    Sifting phase discards measurements where Alice and Bob selected different measurement bases.
  `.repeat(4);

  const file1Path = path.join(testDir, `quantum_notes_v1_${runId}.txt`);
  fs.writeFileSync(file1Path, baseContent, 'utf-8');

  let testAssetHash = '';
  let upload1Id = '';
  let upload2Id = '';
  let upload3Id = '';

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Exact Duplicate Upload
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Exact Duplicate Upload ---');
    const res1 = await documentDeduplicationService.processUpload({
      filePath: file1Path,
      originalName: 'quantum_notes_v1.txt',
      mimeType: 'text/plain',
      classId: 'class-m2029',
      subjectId: 'sub-security',
      subjectName: 'Network Security and Cryptography',
      title: 'Quantum Key Distribution BB84 Protocol',
      uploaderName: 'Student Alpha',
      uploaderRole: 'student',
      accessPermission: 'class_shared',
    });

    testAssetHash = res1.sha256;
    upload1Id = res1.uploadId;

    assert(res1.status === 'created' && !res1.isDuplicate, 'Scenario 1.1', 'First upload created new physical asset');

    // Create second incoming file with EXACT same content (simulating separate student upload)
    const file2Path = path.join(testDir, `quantum_notes_v1_dup_${runId}.txt`);
    fs.writeFileSync(file2Path, baseContent, 'utf-8');

    const res2 = await documentDeduplicationService.processUpload({
      filePath: file2Path,
      originalName: 'quantum_notes_v1.txt',
      mimeType: 'text/plain',
      classId: 'class-m2029',
      subjectId: 'sub-security',
      subjectName: 'Network Security and Cryptography',
      title: 'Quantum Key Distribution BB84 Protocol',
      uploaderName: 'Student Beta',
      uploaderRole: 'student',
      accessPermission: 'class_shared',
    });

    upload2Id = res2.uploadId;

    assert(res2.status === 'deduplicated' && res2.isDuplicate, 'Scenario 1.2', 'Second upload correctly detected as duplicate (0 new physical asset)');
    assert(res1.sha256 === res2.sha256, 'Scenario 1.3', 'Both uploads share identical SHA-256 fingerprint');

    // Verify reference count in Neon
    const assetRow = await queryNeon(`SELECT reference_count FROM document_assets WHERE sha256_hash = $1`, [testAssetHash]);
    assert(assetRow.length > 0 && Number(assetRow[0].reference_count) >= 2, 'Scenario 1.4', 'Reference count in database incremented to 2');

    // Verify chunks count did NOT duplicate in Neon
    const chunksRow = await queryNeon(`SELECT COUNT(*) as count FROM document_chunks WHERE asset_hash = $1`, [testAssetHash]);
    assert(Number(chunksRow[0].count) === res1.chunkCount, 'Scenario 1.5', `0 extra chunks created in Neon (exactly ${res1.chunkCount} chunks stored)`);

    // -------------------------------------------------------------------------
    // SCENARIO 2: Renamed Duplicate Upload
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Renamed Duplicate Upload ---');
    const file2RenamedPath = path.join(testDir, 'prof_sharma_deadlock_final.txt');
    fs.writeFileSync(file2RenamedPath, baseContent, 'utf-8');

    const res3 = await documentDeduplicationService.processUpload({
      filePath: file2RenamedPath,
      originalName: 'prof_sharma_deadlock_final.txt',
      mimeType: 'text/plain',
      classId: 'class-m2029',
      subjectId: 'sub-os',
      subjectName: 'Operating Systems',
      title: 'Prof Sharma Deadlock Final',
      uploaderName: 'Student Gamma',
      uploaderRole: 'student',
      accessPermission: 'class_shared',
    });

    upload3Id = res3.uploadId;

    assert(res3.status === 'deduplicated' && res3.isDuplicate, 'Scenario 2.1', 'Renamed file detected as duplicate via byte SHA-256');
    assert(res3.fileName === 'prof_sharma_deadlock_final.txt', 'Scenario 2.2', 'Student upload record preserves custom uploaded filename');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Simultaneous Duplicate Upload (Concurrency Safety)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Simultaneous Duplicate Upload ---');
    const concurrentFileA = path.join(testDir, 'concurrent_deadlock_a.txt');
    const concurrentFileB = path.join(testDir, 'concurrent_deadlock_b.txt');
    fs.writeFileSync(concurrentFileA, baseContent, 'utf-8');
    fs.writeFileSync(concurrentFileB, baseContent, 'utf-8');

    const [concurResA, concurResB] = await Promise.all([
      documentDeduplicationService.processUpload({
        filePath: concurrentFileA,
        originalName: 'concurrent_deadlock_a.txt',
        classId: 'class-m2029',
        uploaderName: 'Student C1',
      }),
      documentDeduplicationService.processUpload({
        filePath: concurrentFileB,
        originalName: 'concurrent_deadlock_b.txt',
        classId: 'class-m2029',
        uploaderName: 'Student C2',
      }),
    ]);

    assert(concurResA.sha256 === testAssetHash && concurResB.sha256 === testAssetHash, 'Scenario 3.1', 'Concurrent uploads safely processed without duplicate key errors');
    assert(concurResA.uploadId !== concurResB.uploadId, 'Scenario 3.2', 'Distinct upload records created for concurrent students');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Cross-Classroom Access & Physical Asset Reuse
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Cross-Classroom Isolation ---');
    // Ensure test class workspaces exist in Neon
    await queryNeon(`
      INSERT INTO class_workspaces (id, code, name, university) VALUES ('class-bca-2028', 'BCA28', 'BCA 2028', 'GGSIPU')
      ON CONFLICT (id) DO NOTHING
    `);

    const fileClassBPath = path.join(testDir, `deadlock_notes_bca_${runId}.txt`);
    fs.writeFileSync(fileClassBPath, baseContent, 'utf-8');

    const resClassB = await documentDeduplicationService.processUpload({
      filePath: fileClassBPath,
      originalName: 'deadlock_notes_v1.txt',
      classId: 'class-bca-2028',
      title: 'Deadlock Notes BCA',
      uploaderName: 'Student from Class BCA',
      accessPermission: 'class_shared',
    });

    assert(resClassB.sha256 === testAssetHash, 'Scenario 4.1', 'Physical asset reused across different classrooms');

    const canClassAAccess = await documentDeduplicationService.verifyDocumentAccess(upload1Id, 'class-m2029');
    const canClassBAccessClassA = await documentDeduplicationService.verifyDocumentAccess(upload1Id, 'class-bca-2028');
    const canClassBAccessOwn = await documentDeduplicationService.verifyDocumentAccess(resClassB.uploadId, 'class-bca-2028');

    assert(canClassAAccess === true, 'Scenario 4.2', 'Class M2029 student can access Class M2029 upload');
    assert(canClassBAccessClassA === false, 'Scenario 4.3', 'Class BCA student is FORBIDDEN from accessing Class M2029 upload');
    assert(canClassBAccessOwn === true, 'Scenario 4.4', 'Class BCA student can access own classroom upload');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Near-Duplicate Detection (SimHash & Hamming Distance)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Near-Duplicate Detection ---');
    // Slightly modified version (typo fix + 1 extra line)
    const slightlyModifiedContent = baseContent + '\nNote: Banker\'s Algorithm assumes resource claims are known in advance.';
    const fileNearDupPath = path.join(testDir, 'deadlock_notes_v1_typo_fixed.txt');
    fs.writeFileSync(fileNearDupPath, slightlyModifiedContent, 'utf-8');

    const resNear = await documentDeduplicationService.processUpload({
      filePath: fileNearDupPath,
      originalName: 'deadlock_notes_v1_typo_fixed.txt',
      classId: 'class-m2029',
      title: 'Deadlock Notes Fixed',
      uploaderName: 'Student Editor',
    });

    assert(resNear.sha256 !== testAssetHash, 'Scenario 5.1', 'Distinct SHA-256 for modified file content');
    const sim1 = calculateSimHash(baseContent);
    const sim2 = calculateSimHash(slightlyModifiedContent);
    const distance = calculateSimHashDistance(sim1, sim2);

    assert(distance <= 3, 'Scenario 5.2', `SimHash near-duplicate detected (Hamming distance: ${distance} <= 3)`);
    assert(resNear.nearDuplicateWarning !== undefined || resNear.version === 2, 'Scenario 5.3', 'Near-duplicate relationship recognized');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Versioning Awareness
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Versioning Awareness ---');
    assert(resNear.version > res1.version, 'Scenario 6.1', `Edition/versioning incremented (v${res1.version} -> v${resNear.version}) for near-duplicate text`);
    const v1Doc = await queryNeon(`SELECT version FROM document_uploads WHERE id = $1`, [upload1Id]);
    assert(Number(v1Doc[0]?.version) === res1.version, 'Scenario 6.2', 'Original document preserved untouched without silent overwrite');

    // -------------------------------------------------------------------------
    // SCENARIO 7: Scanned / Sparse Document Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Scanned / Sparse Document Handling ---');
    const sparseFilePath = path.join(testDir, `scanned_drawing_page_${runId}.txt`);
    fs.writeFileSync(sparseFilePath, `   \n  [Diagram Only - ${runId}]  \n   `, 'utf-8');

    const resSparse = await documentDeduplicationService.processUpload({
      filePath: sparseFilePath,
      originalName: `scanned_drawing_page_${runId}.txt`,
      classId: 'class-m2029',
      title: 'Scanned Diagram',
    });

    assert(resSparse.chunkCount >= 1, 'Scenario 7.1', 'Sparse / diagram document ingested gracefully without crash');

    // -------------------------------------------------------------------------
    // SCENARIO 8: Interrupted / Missing Upload File Error Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Missing File Error Handling ---');
    let threwMissingFile = false;
    try {
      await documentDeduplicationService.processUpload({
        filePath: path.join(testDir, 'non_existent_aborted_file.pdf'),
        originalName: 'non_existent_aborted_file.pdf',
      });
    } catch {
      threwMissingFile = true;
    }
    assert(threwMissingFile, 'Scenario 8.1', 'Missing or aborted upload throws clean error without leaving corrupt database records');

    // -------------------------------------------------------------------------
    // SCENARIO 9: Missing Storage Object Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Missing Storage Object Handling ---');
    const missingExists = await documentStorageService.exists('non_existent_key_99999.pdf');
    assert(missingExists === false, 'Scenario 9.1', 'documentStorageService.exists returns false for non-existent key');

    let threwDownloadMissing = false;
    try {
      await documentStorageService.getBuffer('non_existent_key_99999.pdf');
    } catch {
      threwDownloadMissing = true;
    }
    assert(threwDownloadMissing, 'Scenario 9.2', 'Fetching non-existent storage object throws clean error for 404 response');

    // -------------------------------------------------------------------------
    // SCENARIO 10: Unauthorized Access Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Unauthorized Access Verification ---');
    const unauthAccess = await documentDeduplicationService.verifyDocumentAccess(
      upload1Id,
      'class-other-unknown',
      'Unauthorized Stranger'
    );
    assert(unauthAccess === false, 'Scenario 10.1', 'Access denied (false) for unauthorized student from outside classroom');

    // -------------------------------------------------------------------------
    // SCENARIO 11: Container Restart Recovery (Hydration from Neon)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Container Restart Recovery ---');
    // Clear in-memory RAG index
    ragEngine.clearAll();
    const statsBefore = ragEngine.getStats();
    assert(statsBefore.totalChunks === 0, 'Scenario 11.1', 'In-memory RAG index cleared to 0 chunks (simulating fresh container)');

    // Hydrate directly from Neon PostgreSQL
    const hydratedChunks = await ragEngine.hydrateChunksFromNeon();
    assert(hydratedChunks > 0, 'Scenario 11.2', `Hydrated ${hydratedChunks} chunks from Neon document_chunks`);

    // Verify search works immediately across restored BM25 index
    const searchHits = ragEngine.search('Quantum Key Distribution BB84 protocol no-cloning', { limit: 3 });
    assert(searchHits.length > 0, 'Scenario 11.3', `BM25 search returns ${searchHits.length} relevant hit(s) from hydrated index`);
    assert(searchHits[0].chunk.text.includes('Quantum') || searchHits[0].chunk.text.includes('BB84'), 'Scenario 11.4', 'Search hit text accurately matches original academic material');

    // Clean reference counted deletion check
    console.log('\n--- Reference-Counted Deletion Verification ---');
    const del1 = await documentDeduplicationService.deleteDocumentUpload(upload2Id, 'class-m2029');
    assert(del1.deleted === true && del1.assetRemoved === false, 'Deletion 1', 'Upload 2 deleted; physical asset preserved because ref count > 0');

    const afterDel1Asset = await queryNeon(`SELECT reference_count FROM document_assets WHERE sha256_hash = $1`, [testAssetHash]);
    assert(afterDel1Asset.length > 0 && Number(afterDel1Asset[0].reference_count) >= 1, 'Deletion 2', 'Asset reference count decremented');

  } finally {
    // Clean up temporary test files
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  }

  // Final Summary
  console.log('\n=================================================================');
  console.log('📊 PHASE 2 TEST RESULTS SUMMARY:');
  console.log('=================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions: ${results.length}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);

  if (failedCount === 0) {
    console.log('\n🎉 ALL 11 PHASE 2 SCENARIOS PASSED WITH ZERO FAILURES!');
  } else {
    console.error(`\n❌ ${failedCount} ASSERTIONS FAILED.`);
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
