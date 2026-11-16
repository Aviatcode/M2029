import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { documentAnalysisService } from '../src/server/rag/documentAnalysisService.js';
import { documentDeduplicationService } from '../src/server/storage/documentDeduplicationService.js';
import { hybridRetrievalEngine } from '../src/server/rag/hybridRetrievalEngine.js';
import { ragEngine } from '../src/server/rag/ragIndex.js';

async function runTests() {
  console.log('=== TEST SUITE: Document Analysis on Upload & AI Tutor Grounded Referral ===\n');

  // Test 1: Verify DocumentAnalysisService synthesizes complete academic resources
  console.log('Test 1: DocumentAnalysisService heuristic & synthesis verification...');
  const sampleDocText = `
Deadlock Characterization and Banker's Algorithm in Operating Systems
A deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process.

Four Necessary Conditions for Deadlock (Coffman Conditions):
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be currently holding at least one resource and requesting additional resources that are being held by other processes.
3. No Preemption: Resources cannot be preempted; a resource can be released only voluntarily by the process holding it.
4. Circular Wait: A closed chain of processes exists such that each process holds at least one resource needed by the next process in the chain.

Banker's Algorithm:
The Banker's Algorithm is a deadlock avoidance algorithm developed by Edsger Dijkstra. It tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources, and then makes an 's-state' check to test for possible activities, before deciding whether allocation should be allowed to continue.
Data Structures:
- Available: Vector of length m indicating number of available resources of each type.
- Max: n x m matrix defining maximum demand of each process.
- Allocation: n x m matrix defining number of resources of each type currently allocated to each process.
- Need: n x m matrix defining remaining resource need. Need[i][j] = Max[i][j] - Allocation[i][j].
`;

  const analysis = await documentAnalysisService.analyzeDocument({
    title: "Operating Systems Unit 3 - Deadlocks and Banker's Algorithm",
    originalName: 'os_deadlocks.txt',
    extractedText: sampleDocText,
    fileType: 'txt',
    subjectName: 'Operating Systems',
    classId: 'class-m2029',
  });

  assert(analysis.summary && analysis.summary.length > 20, 'Expected non-empty summary');
  assert(analysis.hinglishSummary && analysis.hinglishSummary.length > 10, 'Expected non-empty Hinglish summary');
  assert(Array.isArray(analysis.keyConcepts) && analysis.keyConcepts.length > 0, 'Expected keyConcepts array');
  assert(Array.isArray(analysis.importantDefinitions) && analysis.importantDefinitions.length > 0, 'Expected importantDefinitions array');
  assert(analysis.exam10Marker && analysis.exam10Marker.question, 'Expected 10-marker question');
  assert(analysis.exam10Marker.answerStructure, 'Expected 10-marker answer structure');
  assert(analysis.exam10Marker.modelAnswerMarkdown, 'Expected 10-marker model answer markdown');
  assert(Array.isArray(analysis.examPoints) && analysis.examPoints.length > 0, 'Expected examPoints array');
  assert(Array.isArray(analysis.quiz) && analysis.quiz.length > 0, 'Expected quiz array');
  console.log('✅ Test 1 Passed: Complete academic analysis synthesized with 10-marker, quiz, and definitions.');

  // Test 2: Ingest sample file via DocumentDeduplicationService and verify active resources
  console.log('\nTest 2: DocumentDeduplicationService ingestion with live analysis...');
  const uploadDir = ragEngine.getUploadDir();
  const testRunId = Date.now();
  const uniqueDocText = `${sampleDocText}\n\nSession Verification Code: RUN-${testRunId}`;
  const testFilePath = path.join(uploadDir, `test_deadlocks_${testRunId}.txt`);
  fs.writeFileSync(testFilePath, uniqueDocText, 'utf-8');

  const uploadResult = await documentDeduplicationService.processUpload({
    filePath: testFilePath,
    originalName: `os_deadlock_notes_${testRunId}.txt`,
    mimeType: 'text/plain',
    fileSize: Buffer.byteLength(uniqueDocText, 'utf-8'),
    classId: 'class-m2029',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    title: `Operating Systems Deadlock Notes ${testRunId}`,
    uploaderName: 'Avikshit',
    uploaderRole: 'student',
    accessPermission: 'class_shared',
  });

  assert(uploadResult.material, 'Expected material in upload result');
  assert(uploadResult.material.resources, 'Expected resources in uploaded material');
  assert(uploadResult.material.resources.keyConcepts.length > 0, 'Expected keyConcepts populated in material');
  assert(uploadResult.material.resources.exam10Marker?.question, 'Expected exam10Marker in material resources');
  console.log(`✅ Test 2 Passed: Document ingested with ${uploadResult.chunkCount} active chunks and rich resources.`);

  // Test 3: Verify HybridRetrievalEngine searches and finds the uploaded document
  console.log('\nTest 3: HybridRetrievalEngine querying uploaded document chunks...');
  const searchResult = await hybridRetrievalEngine.search("Banker's Algorithm Need matrix", {
    classId: 'M2029', // Test class normalization (M2029 vs class-m2029)
    topK: 3,
  });

  assert(searchResult.hits.length > 0, 'Expected at least 1 hit from hybrid retrieval');
  const matchedDoc = searchResult.hits.find((h) => h.docTitle.includes('Deadlock') || h.text.includes('Banker'));
  assert(matchedDoc, 'Expected hit matching Deadlock or Banker');
  console.log(`✅ Test 3 Passed: Hybrid search retrieved chunk from "${matchedDoc.docTitle}" with normalized classId.`);

  // Test 4: Verify Class ID Normalization across M2029, class-m2029, and BCA-2028
  console.log('\nTest 4: Class ID normalization verification...');
  const bm25Hits = ragEngine.search("Coffman Conditions", {
    classId: 'm2029',
    limit: 3,
  });
  assert(bm25Hits.length > 0, 'Expected BM25 hits with lowercase classId m2029');
  console.log(`✅ Test 4 Passed: Class ID normalization verified for BM25 search (${bm25Hits.length} hits).`);

  // Clean up test file
  try {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  } catch {}

  console.log('\n🎉 ALL 4/4 INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
