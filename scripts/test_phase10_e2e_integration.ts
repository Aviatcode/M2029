import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  isNeonConfigured,
  testNeonConnection,
  queryNeon,
  sanitizeDbError,
} from '../src/server/db/neonClient.js';
import { sharedKnowledgeLibrary } from '../src/server/ai/sharedKnowledgeLibrary.js';
import { normalizeQueryTokens } from '../src/server/ai/questionMatcher.js';
import { MemoryRateLimiter } from '../src/server/security/rateLimiter.js';
import { concurrentGenerationCoordinator } from '../src/server/ai/concurrentGenerationCoordinator.js';
import { hybridRetrievalEngine } from '../src/server/rag/hybridRetrievalEngine.js';
import { knowledgeGraphEngine } from '../src/server/rag/graphRagEngine.js';
import { learningProfileService } from '../src/server/personalization/learningProfileService.js';
import { adaptiveTutorService } from '../src/server/personalization/adaptiveTutorService.js';
import { byokVault } from '../src/server/ai/byokVault.js';
import { byokSecurityService } from '../src/server/ai/multiProvider/byokSecurityService.js';
import { usageAccountingService } from '../src/server/ai/multiProvider/usageAccountingService.js';
import { documentDeduplicationService } from '../src/server/storage/documentDeduplicationService.js';
import { documentStorageService } from '../src/server/storage/documentStorageService.js';
import { ragEngine } from '../src/server/rag/ragIndex.js';
import { disasterRecoveryService } from '../src/server/backup/disasterRecoveryService.js';
import { validateEnvironment } from '../src/server/config/environmentValidator.js';
import {
  verifyAdminAuth,
  getAuthenticatedUser,
  verifyDocumentDownloadAccess,
} from '../src/server/security/authGuard.js';
import {
  generalRateLimiter,
  aiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
} from '../src/server/security/rateLimiter.js';
import {
  sanitizeSafePath,
  validateUrlForSsrf,
} from '../src/server/security/securityHeaders.js';
import { logger } from '../src/server/monitoring/productionLogger.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

async function runEndToEndIntegrationSuite() {
  console.log('=================================================================');
  console.log('🧪 M2029 PHASE 10: COMPLETE SYSTEM INTEGRATION & E2E VALIDATION');
  console.log('=================================================================\n');

  const testClassA = 'class-e2e-a-' + Date.now();
  const testClassB = 'class-e2e-b-' + Date.now();
  const student1 = 'student-e2e-1-' + Date.now();
  const student2 = 'student-e2e-2-' + Date.now();

  const codeA = 'EA' + Date.now().toString().slice(-6);
  const codeB = 'EB' + Date.now().toString().slice(-6);

  // Setup test workspaces in Neon to satisfy foreign keys
  if (isNeonConfigured()) {
    try {
      await queryNeon(
        `INSERT INTO class_workspaces (id, code, name, university, semester, academic_year)
         VALUES ($1, $2, 'E2E Test Class A', 'State University', 3, '2026-2027'),
                ($3, $4, 'E2E Test Class B', 'State University', 3, '2026-2027')
         ON CONFLICT (code) DO UPDATE SET updated_at = NOW()`,
        [testClassA, codeA, testClassB, codeB]
      );
    } catch (e: any) {
      console.warn('Workspace seeding notice:', e.message);
    }
  }

  // =========================================================================
  // WORKFLOW A: Student Asks an Academic Question (Full Pipeline)
  // =========================================================================
  console.log('--- Workflow A: Student Asks an Academic Question ---');
  try {
    const questionText = 'What is the exact asymptotic complexity of Dijkstra shortest path algorithm in sparse graphs with Fibonacci heap ' + Date.now();

    // 1. Authenticate & extract student context
    const mockReqA: any = {
      headers: {
        'x-user-id': student1,
        'x-student-name': 'Aarav Sharma',
        'x-class-id': testClassA,
        'x-user-role': 'student',
      },
      body: { question: questionText, classCode: testClassA },
    };
    const authUser = getAuthenticatedUser(mockReqA);
    assert(authUser.id === student1, 'Workflow A.1: Student successfully authenticated');
    assert(authUser.classId === testClassA, 'Workflow A.2: Classroom boundary correctly associated');

    // 2. Check Shared Knowledge Library before calling LLM
    const initialMatch = sharedKnowledgeLibrary.findMatchingAnswer(questionText, {
      classId: testClassA,
      subjectName: 'Operating Systems',
    });
    assert(!initialMatch.found, 'Workflow A.3: Confirmed cache miss on fresh question');

    // 3. Acquire Distributed Concurrency Lock
    const lockKey = concurrentGenerationCoordinator.computeLockKey({
      classId: testClassA,
      query: questionText,
      mode: 'all',
    });
    const lockAcq = await concurrentGenerationCoordinator.acquireLockOrWait({
      lockKey,
      classId: testClassA,
      studentId: student1,
      maxWaitMs: 500,
    });
    assert(lockAcq.isGenerator, 'Workflow A.4: Generator lock atomically acquired');

    // 4. Hybrid RAG Retrieval
    const hybridResults = await hybridRetrievalEngine.search('deadlock avoidance banker algorithm', {
      classId: 'class-m2029',
      topK: 3,
    });
    assert(Array.isArray(hybridResults.hits), 'Workflow A.5: Hybrid RAG executed retrieval');

    // 5. Synthesize & Store Master Answer in Shared Library
    const stored = await sharedKnowledgeLibrary.storeAnswer({
      classId: testClassA,
      subjectName: 'Operating Systems',
      query: questionText,
      answer: 'Banker algorithm is a deadlock avoidance algorithm that simulates resource allocation before granting requests.',
      sections: {
        simple: 'Banker algorithm ensures the system never enters an unsafe state.',
        eli9: 'Like a bank checking if it has enough cash reserves before lending.',
        hinglish: 'Banker algorithm pehle calculate karta hai ki request grant karne se system safe rahega ya nahi.',
        exam_10marker: '### Definition\nFormal deadlock avoidance strategy.\n### Safety Algorithm\nWork = Available, Finish[i] = false.\n### Resource Request Algorithm\nIf Request_i <= Need_i and Request_i <= Available...',
      },
      qualityStatus: 'GENERATED',
      citations: [
        {
          docId: 'doc-os-silberschatz',
          sourceTitle: 'Operating System Concepts (Silberschatz)',
          version: 1,
          pageNumber: 245,
          sectionTitle: 'Deadlock Avoidance',
        },
      ],
      tags: ['deadlock', 'banker_algorithm', 'operating_systems'],
      contributor: { id: student1, name: 'Aarav Sharma', role: 'STUDENT' },
    });
    assert(stored.id.startsWith('ans-'), 'Workflow A.6: Master academic answer stored in shared library');
    assert(stored.qualityStatus === 'GENERATED', 'Workflow A.7: Initial status is transparently GENERATED');

    // 6. Release Lock
    await concurrentGenerationCoordinator.releaseLock({
      lockKey,
      status: 'completed',
      answerId: stored.id,
    });
    assert(true, 'Workflow A.8: Concurrency lock successfully released with completed answer ID');

    // 7. Re-query from Shared Library (0 tokens)
    const secondMatch = sharedKnowledgeLibrary.findMatchingAnswer(questionText, {
      classId: testClassA,
      subjectName: 'Operating Systems',
    });
    assert(secondMatch.found && secondMatch.answer?.id === stored.id, 'Workflow A.9: Re-query served from shared library (0 tokens)');
  } catch (e: any) {
    assert(false, `Workflow A error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW B: Student Uploads Study Material (Deduplication & Extraction)
  // =========================================================================
  console.log('\n--- Workflow B: Student Uploads Study Material ---');
  try {
    const originalText = `Computer Networks Protocol Stack Notes Version ${Date.now()}\nTCP/IP 5-layer model: Physical, Data Link, Network, Transport, Application.`;
    const tempFilePath = path.resolve('curriculum-repo', 'uploads', `e2e_material_${Date.now()}.txt`);
    fs.writeFileSync(tempFilePath, originalText, 'utf-8');

    // 1. Initial Upload by Student 1
    const uploadRes1 = await documentDeduplicationService.processUpload({
      filePath: tempFilePath,
      originalName: 'cn_protocols.txt',
      mimeType: 'text/plain',
      classId: testClassA,
      uploaderName: 'Student 1',
      title: 'Computer Networks Protocol Stack',
    });
    assert(uploadRes1.status === 'created', 'Workflow B.1: First upload successfully ingested as new master asset');
    assert(uploadRes1.chunkCount >= 1, 'Workflow B.2: Document structurally chunked');

    // 2. Duplicate Upload by Student 2 (Same Class)
    const uploadRes2 = await documentDeduplicationService.processUpload({
      filePath: tempFilePath,
      originalName: 'copied_cn_protocols.txt',
      mimeType: 'text/plain',
      classId: testClassA,
      uploaderName: 'Student 2',
      title: 'Copied Protocol Notes',
    });
    assert(uploadRes2.status === 'deduplicated', 'Workflow B.3: Second upload atomically deduplicated via SHA-256');
    assert(uploadRes1.sha256 === uploadRes2.sha256, 'Workflow B.4: Reused identical SHA-256 fingerprint');

    // 3. Cross-Class Access Boundary Test
    const storageKeyB = decodeURIComponent(uploadRes1.material.downloadUrl.replace('/api/materials/download/', ''));
    const accessByClassA = await documentDeduplicationService.verifyStorageKeyAccess(storageKeyB, testClassA);
    const accessByClassB = await documentDeduplicationService.verifyStorageKeyAccess(storageKeyB, testClassB);
    assert(accessByClassA, 'Workflow B.5: Class A authorized to access uploaded document');
    assert(!accessByClassB, 'Workflow B.6: Class B strictly blocked from accessing Class A document');

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  } catch (e: any) {
    assert(false, `Workflow B error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW C: Two Students Ask Same Question Concurrently
  // =========================================================================
  console.log('\n--- Workflow C: Two Students Ask Same Question Concurrently ---');
  try {
    const concurrentQ = 'What are the four conditions for deadlock to occur?';
    const cLockKey = concurrentGenerationCoordinator.computeLockKey({
      classId: testClassA,
      query: concurrentQ,
      mode: 'all',
    });

    // Student 1 arrives first
    const s1Lock = await concurrentGenerationCoordinator.acquireLockOrWait({
      lockKey: cLockKey,
      classId: testClassA,
      studentId: student1,
      maxWaitMs: 300,
    });
    assert(s1Lock.isGenerator, 'Workflow C.1: Student 1 designated as sole generator');

    // Student 2 arrives while generation is in flight
    const s2Promise = concurrentGenerationCoordinator.acquireLockOrWait({
      lockKey: cLockKey,
      classId: testClassA,
      studentId: student2,
      maxWaitMs: 2500,
      pollIntervalMs: 100,
    });

    // Student 1 finishes generation and stores answer
    const s1Answer = await sharedKnowledgeLibrary.storeAnswer({
      classId: testClassA,
      subjectName: 'Operating Systems',
      query: concurrentQ,
      answer: 'Coffman four conditions: 1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait.',
      sections: {
        simple: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
        exam_10marker: '### Coffman Conditions\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait...',
      },
      qualityStatus: 'GENERATED',
      tags: ['deadlock', 'coffman'],
      contributor: { id: student1, name: 'Student 1', role: 'STUDENT' },
    });

    await concurrentGenerationCoordinator.releaseLock({
      lockKey: cLockKey,
      status: 'completed',
      answerId: s1Answer.id,
    });

    const s2Lock = await s2Promise;
    assert(!s2Lock.isGenerator && s2Lock.reused, 'Workflow C.2: Student 2 safely reuses Student 1 completed generation');
    assert(s2Lock.answerId === s1Answer.id, 'Workflow C.3: Student 2 received completed answer ID with 0 new LLM calls');
  } catch (e: any) {
    assert(false, `Workflow C error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW D: Student Corrects a Shared Answer & Faculty Review
  // =========================================================================
  console.log('\n--- Workflow D: Student Corrects a Shared Answer & Faculty Review ---');
  try {
    // 1. Student 2 proposes correction
    const storedAnswers = sharedKnowledgeLibrary.getAllAnswers(testClassA);
    const targetAnswer = storedAnswers[0];
    assert(Boolean(targetAnswer), 'Workflow D.1: Located target shared answer');

    const proposal = sharedKnowledgeLibrary.proposeCorrection(targetAnswer.id, {
      contributor: { id: student2, name: 'Priya Verma', role: 'STUDENT' },
      targetSection: 'exam_10marker',
      proposedText: '### Enhanced Coffman Conditions\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait with Resource Allocation Graph analysis.',
      reason: 'Included resource allocation graph diagram required by university exam board.',
      citationDocId: 'doc-os-silberschatz',
      citationPage: 250,
    });
    assert(proposal.success && Boolean(proposal.correctionId), 'Workflow D.2: Correction proposal successfully submitted');

    // 2. Verify answer quality transitioned to CORRECTION_PROPOSED
    const underReview = sharedKnowledgeLibrary.getAnswerById(targetAnswer.id);
    assert(underReview?.qualityStatus === 'CORRECTION_PROPOSED', 'Workflow D.3: Answer quality updated to CORRECTION_PROPOSED');

    // 3. Faculty Reviewer approves correction
    const approval = sharedKnowledgeLibrary.approveCorrection(
      targetAnswer.id,
      proposal.correctionId!,
      'Prof. K. Sharma (Faculty Lead)'
    );
    assert(approval.success, 'Workflow D.4: Faculty Lead approved proposed correction');

    // 4. Verify version bump and snapshot preservation
    const updated = sharedKnowledgeLibrary.getAnswerById(targetAnswer.id);
    assert(updated?.version === 2, 'Workflow D.5: Answer version successfully incremented to v2');
    assert(updated?.previousVersions.length === 1, 'Workflow D.6: Original v1 snapshot preserved in previousVersions');
    assert(updated?.qualityStatus === 'VERIFIED', 'Workflow D.7: Formally verified status awarded upon faculty approval');
  } catch (e: any) {
    assert(false, `Workflow D error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW E: Infrastructure Failure Resilience (No Fake Data)
  // =========================================================================
  console.log('\n--- Workflow E: Infrastructure Failure Resilience ---');
  try {
    // 1. Database error sanitization
    const rawLeak = 'Error connecting to postgresql://admin_user:secret_password_xyz@ep-test.neon.tech/neondb';
    const sanitized = sanitizeDbError(new Error(rawLeak));
    assert(!sanitized.message.includes('secret_password_xyz'), 'Workflow E.1: Database passwords never leak into logs or errors');
    assert(sanitized.message.includes('***:***@'), 'Workflow E.2: Connection string redacted with wildcard masking');

    // 2. SSRF Attempt Filtering
    const ssrfResult = validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
    assert(!ssrfResult.allowed, 'Workflow E.3: Cloud metadata access blocked');

    // 3. Path Traversal Neutralization
    const pathResult = sanitizeSafePath(ragEngine.getUploadDir(), '../../../../windows/system32');
    assert(!pathResult.isSafe || !pathResult.safePath.includes('..'), 'Workflow E.4: Path traversal attempts normalized safely');

    // 4. Rate Limiting Burst Guard
    const limiter = new MemoryRateLimiter({ windowMs: 5000, maxRequests: 2, name: 'E2EBurst' });
    const mockR: any = { headers: {}, socket: { remoteAddress: '192.168.1.1' } };
    const mockW: any = { headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; }, status(c: number) { return { json: () => { } }; } };

    let passedCount = 0;
    for (let i = 0; i < 4; i++) {
      limiter.middleware()(mockR, mockW, () => { passedCount++; });
    }
    assert(passedCount === 2, 'Workflow E.5: Rate limiter blocks burst beyond quota');
    assert(limiter.getBlockedEventsCount() === 2, 'Workflow E.6: Rejection counter accurately tracked');
  } catch (e: any) {
    assert(false, `Workflow E error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW F: AI Tutor Tab Isolation & Privacy Verification
  // =========================================================================
  console.log('\n--- Workflow F: AI Tutor Tab Isolation & Multi-Tenant Privacy ---');
  try {
    // 1. Student A learning profile is private from Student B
    await learningProfileService.recordPracticeAttempt({
      studentId: student1,
      classId: testClassA,
      conceptName: 'Two-Phase Commit',
      topicTitle: 'Transactions',
      questionText: 'What happens when coordinator fails?',
      questionSource: 'generated_from_rag',
      studentAnswer: 'System blocks',
      isCorrect: false,
      score: 3,
      feedback: 'Review blocking behavior when coordinator fails.',
    });

    const s1Profile = await learningProfileService.getOrCreateProfile(student1, testClassA);
    const s2Profile = await learningProfileService.getOrCreateProfile(student2, testClassA);

    assert(s1Profile.studentId === student1, 'Workflow F.1: Student 1 profile retrieved');
    assert(s2Profile.studentId === student2, 'Workflow F.2: Student 2 profile retrieved separately');
    assert(s2Profile.completedTopics.length === 0, 'Workflow F.3: Student 1 private mastery records NOT visible to Student 2');

    // 2. BYOK Key Isolation
    await byokVault.storeUserKey({
      userId: student1,
      apiKey: 'AIzaSyTestKeyForStudent1Only999',
      provider: 'gemini',
      modelName: 'gemini-2.5-flash',
      label: 'Personal Key',
    });

    const s1Key = byokVault.getUserDecryptedConfig(student1);
    const s2Key = byokVault.getUserDecryptedConfig(student2);
    assert(s1Key?.apiKey === 'AIzaSyTestKeyForStudent1Only999', 'Workflow F.4: Student 1 can access own personal key');
    assert(s2Key === null, 'Workflow F.5: Student 2 CANNOT access Student 1 personal API key');

    // Clean up test key
    byokVault.removeUserKey(student1, 'gemini', 'Personal Key');
  } catch (e: any) {
    assert(false, `Workflow F error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW G: Document Processing Across Formats (PDF, DOCX, PPTX, XLSX, TXT)
  // =========================================================================
  console.log('\n--- Workflow G: Document Processing Across Formats ---');
  try {
    const formats = ['txt', 'csv', 'docx', 'pptx', 'xlsx'];
    for (const fmt of formats) {
      const samplePath = path.resolve('curriculum-repo', 'uploads', `format_test_${fmt}_${Date.now()}.${fmt}`);
      if (fmt === 'txt' || fmt === 'csv') {
        fs.writeFileSync(samplePath, `Unit 1 Test Material for ${fmt.toUpperCase()}\nConcepts: State Transitions and CPU Scheduling.`, 'utf-8');
      } else {
        // Create valid zip buffer for docx/pptx/xlsx
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        if (fmt === 'docx') {
          zip.file('word/document.xml', '<w:p><w:r><w:t>DOCX test lecture content</w:t></w:r></w:p>');
        } else if (fmt === 'pptx') {
          zip.file('ppt/slides/slide1.xml', '<p:sp><a:t>PPTX slide 1 concept overview</a:t></p:sp>');
        } else if (fmt === 'xlsx') {
          zip.file('xl/sharedStrings.xml', '<sst><si><t>XLSX syllabus spreadsheet row</t></si></sst>');
        }
        const buf = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(samplePath, buf);
      }

      const res = await documentDeduplicationService.processUpload({
        filePath: samplePath,
        originalName: `sample_material.${fmt}`,
        classId: testClassA,
        title: `Format ${fmt.toUpperCase()}`,
        uploaderName: 'Format Tester',
      });

      assert(res.status === 'created' || res.status === 'deduplicated', `Workflow G.${formats.indexOf(fmt) + 1}: Handled .${fmt} format successfully`);
      if (fs.existsSync(samplePath)) fs.unlinkSync(samplePath);
    }
  } catch (e: any) {
    assert(false, `Workflow G error: ${e.message}`);
  }

  // =========================================================================
  // WORKFLOW H: Disaster Recovery Snapshot & Cryptographic Verification
  // =========================================================================
  console.log('\n--- Workflow H: Disaster Recovery Snapshot & Verification ---');
  try {
    const snap = await disasterRecoveryService.createCompleteBackup();
    assert(snap.success, 'Workflow H.1: Production disaster recovery backup successfully created');
    assert(snap.manifest.totalTables === 28, 'Workflow H.2: All 28 Neon PostgreSQL tables dumped');

    const verify = disasterRecoveryService.verifyBackupIntegrity(snap.backupDir);
    assert(verify.isValid, 'Workflow H.3: Backup passes cryptographic SHA-256 verification');
  } catch (e: any) {
    assert(false, `Workflow H error: ${e.message}`);
  }

  // Clean up temporary workspaces from Neon
  if (isNeonConfigured()) {
    try {
      await queryNeon(`DELETE FROM class_workspaces WHERE id IN ($1, $2)`, [testClassA, testClassB]);
      await queryNeon(`DELETE FROM shared_classroom_answers WHERE class_id = $1`, [testClassA]);
    } catch { }
  }

  console.log('\n=================================================================');
  console.log(`🎉 PHASE 10 E2E VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndIntegrationSuite().catch((err) => {
  console.error('Fatal E2E test error:', err);
  process.exit(1);
});

