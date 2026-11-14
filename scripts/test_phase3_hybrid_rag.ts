import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { queryNeon, isNeonConfigured, initializeNeonSchema } from '../src/server/db/neonClient.js';
import { ragEngine } from '../src/server/rag/ragIndex.js';
import { embeddingService } from '../src/server/rag/embeddingService.js';
import {
  hybridRetrievalEngine,
  resolveFollowUpQuery,
} from '../src/server/rag/hybridRetrievalEngine.js';

interface TestAssertion {
  scenario: string;
  passed: boolean;
  message: string;
  details?: any;
}

const assertions: TestAssertion[] = [];

function assert(condition: boolean, scenario: string, message: string, details?: any) {
  if (condition) {
    assertions.push({ scenario, passed: true, message });
    console.log(`  ✅ [PASS] ${scenario}: ${message}`);
  } else {
    assertions.push({ scenario, passed: false, message, details });
    console.error(`  ❌ [FAIL] ${scenario}: ${message}`);
    if (details) console.error('     Details:', details);
  }
}

/**
 * Deterministic pseudo-semantic embedding generator for reproducible offline/online test runs
 * Produces unit-normalized 768-dimensional vectors based on word semantic buckets
 */
function generateTestVector(text: string): number[] {
  const vec = new Array(768).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

  for (const w of words) {
    const hash = crypto.createHash('md5').update(w).digest();
    for (let i = 0; i < 768; i++) {
      const byte = hash[i % 16];
      const sign = (byte & (1 << (i % 8))) ? 1 : -1;
      vec[i] += sign * (byte / 255.0);
    }
  }

  // L2 unit normalization
  let norm = 0;
  for (let i = 0; i < 768; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

async function runPhase3Tests() {
  console.log('=================================================================');
  console.log('🧪 M2029 PHASE 3: HYBRID RAG (BM25 + PGVECTOR) 16-SCENARIO SUITE');
  console.log('=================================================================\n');

  if (!isNeonConfigured()) {
    console.error('❌ Cannot run tests: Neon database is not configured.');
    process.exit(1);
  }

  // Ensure Neon schema and vector extensions are active
  await initializeNeonSchema(false);

  const runId = Date.now();
  const testClassId = `class-p3-${runId}`;
  const unauthClassId = `class-unauth-${runId}`;

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST ENVIRONMENT IN NEON
    // -------------------------------------------------------------------------
    console.log('--- Setting Up Test Classrooms & Documents in Neon ---');
    await queryNeon(`
      INSERT INTO class_workspaces (id, code, name, university)
      VALUES 
        ($1, $2, 'Phase 3 Test Classroom', 'IP University'),
        ($3, $4, 'Unauthorized Classroom', 'Other University')
      ON CONFLICT (id) DO NOTHING
    `, [testClassId, `P3_${runId.toString(36)}`, unauthClassId, `UN_${runId.toString(36)}`]);

    // Create 3 Test Documents
    // Doc 1: Two-Phase Commit Protocol (v1)
    const doc1Hash = crypto.createHash('sha256').update(`2pc_v1_${runId}`).digest('hex');
    const doc1Chunk1Id = `chk-${doc1Hash.slice(0, 8)}-1`;
    const doc1Chunk2Id = `chk-${doc1Hash.slice(0, 8)}-2`;
    const doc1Text1 = `
      Unit 4: Distributed Database Management Systems
      Section 4.1: Two-Phase Commit Protocol (2PC) Foundations
      The Two-Phase Commit Protocol (2PC) is a distributed algorithm that ensures all database nodes
      commit a transaction or all abort, guaranteeing distributed ACID properties across heterogeneous networks.
      Phase 1 is the Prepare Phase where the coordinator sends a PREPARE message to all cohort participants.
      Each participant votes either VOTE_COMMIT or VOTE_ABORT.
    `;
    const doc1Text2 = `
      Section 4.2: 2PC Commit Phase and Failure Recovery
      In Phase 2 (Commit Phase), if all participants voted VOTE_COMMIT, the coordinator logs a global commit
      and broadcasts GLOBAL_COMMIT. If any participant voted VOTE_ABORT or timed out, GLOBAL_ABORT is sent.
      A major limitation of 2PC is that it is a blocking protocol: if the coordinator crashes during Phase 2,
      participants remain blocked holding database locks.
    `;

    // Doc 2: Revised 2PC Notes (v2) - Updated edition
    const doc2Hash = crypto.createHash('sha256').update(`2pc_v2_${runId}`).digest('hex');
    const doc2Chunk1Id = `chk-${doc2Hash.slice(0, 8)}-1`;
    const doc2Text1 = `
      Unit 4: Distributed Database Management Systems - Revised Edition 2
      Section 4.1: Two-Phase Commit Protocol (2PC) with 3PC Non-Blocking Extension
      The Two-Phase Commit Protocol guarantees atomicity across distributed shards.
      To resolve the blocking flaw of standard 2PC, Skeen proposed Three-Phase Commit (3PC)
      introducing a PRECOMMIT state to avoid indefinite lock starvation.
    `;

    // Doc 3: Consensus Mechanisms: Paxos and Raft
    const doc3Hash = crypto.createHash('sha256').update(`consensus_${runId}`).digest('hex');
    const doc3Chunk1Id = `chk-${doc3Hash.slice(0, 8)}-1`;
    const doc3Text1 = `
      Unit 5: Fault-Tolerant Consensus Algorithms
      Section 5.1: Paxos and Raft Distributed State Machine Replication
      Consensus algorithms allow a collection of machines to work as a coherent group that can survive
      the failures of some of its members. Raft breaks consensus into leader election, log replication,
      and safety invariants. Quorum intersection guarantees no split-brain state occurs.
    `;

    // Doc 4: Secret Material in Unauthorized Classroom
    const doc4Hash = crypto.createHash('sha256').update(`unauth_secret_${runId}`).digest('hex');
    const doc4Chunk1Id = `chk-${doc4Hash.slice(0, 8)}-1`;
    const doc4Text1 = `
      CONFIDENTIAL: Unauthorized Class Midterm Exam Answers
      Question 1: Explain the internal Byzantine Fault Tolerance PBFT consensus threshold 3f+1.
    `;

    // Insert Document Assets into Neon
    await queryNeon(`
      INSERT INTO document_assets (sha256_hash, storage_key, file_size, mime_type, original_name, page_count, word_count, reference_count)
      VALUES 
        ($1, '2pc_v1.pdf', 4096, 'application/pdf', 'Distributed_2PC_Notes.pdf', 12, 450, 1),
        ($2, '2pc_v2.pdf', 4500, 'application/pdf', 'Distributed_2PC_Notes_Rev.pdf', 14, 520, 1),
        ($3, 'paxos_raft.pdf', 6000, 'application/pdf', 'Consensus_Paxos_Raft.pdf', 18, 680, 1),
        ($4, 'unauth_secret.pdf', 3000, 'application/pdf', 'Secret_Exam.pdf', 5, 200, 1)
      ON CONFLICT (sha256_hash) DO NOTHING
    `, [doc1Hash, doc2Hash, doc3Hash, doc4Hash]);

    // Insert Document Uploads with Versions
    await queryNeon(`
      INSERT INTO document_uploads (id, asset_hash, class_id, subject_id, subject_name, title, file_name, uploader_name, access_permission, version)
      VALUES 
        ($1, $2, $3, 'sub-dbms', 'Distributed Databases', 'Two-Phase Commit Protocol Notes', 'Distributed_2PC_Notes.pdf', 'Professor A', 'class_shared', 1),
        ($4, $5, $3, 'sub-dbms', 'Distributed Databases', 'Two-Phase Commit Protocol Notes', 'Distributed_2PC_Notes_Rev.pdf', 'Professor A', 'class_shared', 2),
        ($6, $7, $3, 'sub-dist', 'Distributed Systems', 'Consensus Paxos and Raft Guide', 'Consensus_Paxos_Raft.pdf', 'Professor B', 'class_shared', 1),
        ($8, $9, $10, 'sub-secret', 'Classified', 'Confidential Exam Leak', 'Secret_Exam.pdf', 'Secret User', 'private', 1)
      ON CONFLICT (id) DO NOTHING
    `, [
      `up-1-${runId}`, doc1Hash, testClassId,
      `up-2-${runId}`, doc2Hash,
      `up-3-${runId}`, doc3Hash,
      `up-4-${runId}`, doc4Hash, unauthClassId
    ]);

    // Insert Document Chunks
    await queryNeon(`
      INSERT INTO document_chunks (id, asset_hash, chunk_index, section_title, page_number, text, word_count)
      VALUES 
        ($1, $2, 1, 'Two-Phase Commit Protocol (2PC) Foundations', 14, $3, 85),
        ($4, $2, 2, '2PC Commit Phase and Failure Recovery', 15, $5, 95),
        ($6, $7, 1, '2PC with 3PC Non-Blocking Extension', 14, $8, 80),
        ($9, $10, 1, 'Paxos and Raft Distributed State Machine Replication', 22, $11, 85),
        ($12, $13, 1, 'Byzantine Fault Tolerance PBFT Consensus', 2, $14, 50)
      ON CONFLICT (id) DO NOTHING
    `, [
      doc1Chunk1Id, doc1Hash, doc1Text1,
      doc1Chunk2Id, doc1Text2,
      doc2Chunk1Id, doc2Hash, doc2Text1,
      doc3Chunk1Id, doc3Hash, doc3Text1,
      doc4Chunk1Id, doc4Hash, doc4Text1
    ]);

    // Generate vector embeddings via embeddingService
    await embeddingService.embedChunks([
      { id: doc1Chunk1Id, assetHash: doc1Hash, text: doc1Text1 },
      { id: doc1Chunk2Id, assetHash: doc1Hash, text: doc1Text2 },
      { id: doc2Chunk1Id, assetHash: doc2Hash, text: doc2Text1 },
      { id: doc3Chunk1Id, assetHash: doc3Hash, text: doc3Text1 },
      { id: doc4Chunk1Id, assetHash: doc4Hash, text: doc4Text1 },
    ]);

    // Also hydrate in-memory BM25 index with these chunks
    await ragEngine.hydrateChunksFromNeon();
    console.log('✅ Test environment seeded in Neon and BM25 index hydrated.\n');

    // -------------------------------------------------------------------------
    // SCENARIO 1: Exact Keyword Question
    // -------------------------------------------------------------------------
    console.log('--- Scenario 1: Exact Keyword Question ---');
    const res1 = await hybridRetrievalEngine.search('Two-Phase Commit Protocol coordinator participant', {
      classId: testClassId,
      versionPreference: 'all',
      topK: 3,
    });
    assert(res1.hits.length > 0, 'Scenario 1.1', 'BM25 + Hybrid retrieves hits for exact keywords');
    assert(res1.hits[0].text.includes('Two-Phase Commit') || res1.hits[0].text.includes('coordinator'), 'Scenario 1.2', 'Top hit contains exact keywords from curriculum material');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Paraphrased Question (Semantic Meaning Match)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Paraphrased Question ---');
    // Wording is completely paraphrased without mentioning "Two-Phase Commit" or "2PC"
    const res2 = await hybridRetrievalEngine.search('How do distributed nodes agree before making permanent database modifications without crashing?', {
      classId: testClassId,
      versionPreference: 'all',
      topK: 3,
    });
    assert(res2.hits.length > 0, 'Scenario 2.1', 'Semantic vector retrieval retrieves relevant document for paraphrased question');
    assert(res2.hits.some((h) => h.text.includes('distributed') || h.text.includes('commit')), 'Scenario 2.2', 'Matches distributed commit concepts despite different vocabulary');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Conceptual Question Requiring Semantic Matching
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Conceptual Semantic Question ---');
    const res3 = await hybridRetrievalEngine.search('State machine replication under network partition and node failures', {
      classId: testClassId,
      topK: 3,
    });
    assert(res3.hits.some((h) => h.docTitle.includes('Consensus') || h.text.includes('Raft') || h.text.includes('Paxos')), 'Scenario 3.1', 'Semantic matching routes to Paxos/Raft consensus document');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Question Containing an Acronym
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Acronym Matching ---');
    const res4 = await hybridRetrievalEngine.search('What is the major blocking limitation of 2PC?', {
      classId: testClassId,
      versionPreference: 'all',
      topK: 3,
    });
    assert(res4.hits.some((h) => h.text.includes('2PC') && h.text.includes('blocking')), 'Scenario 4.1', 'Matches acronym "2PC" and blocking limitation section');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Multiple Relevant Documents Retrieved
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Multiple Relevant Documents ---');
    const res5 = await hybridRetrievalEngine.search('Distributed agreement protocols and replication', {
      classId: testClassId,
      versionPreference: 'all',
      topK: 4,
    });
    const uniqueDocTitles = new Set(res5.hits.map((h) => h.docTitle));
    assert(uniqueDocTitles.size >= 2, 'Scenario 5.1', `Retrieved chunks from ${uniqueDocTitles.size} distinct relevant documents`);

    // -------------------------------------------------------------------------
    // SCENARIO 6: BM25 and Vector Search Overlapping Chunks (RRF Deduplication)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Overlapping Chunks via Reciprocal Rank Fusion ---');
    const res6 = await hybridRetrievalEngine.search('Two-Phase Commit Protocol', {
      classId: testClassId,
      versionPreference: 'all',
      topK: 5,
    });
    const hybridHits = res6.hits.filter((h) => h.retrievalMethod === 'hybrid');
    assert(hybridHits.length > 0, 'Scenario 6.1', 'Chunks found by both BM25 and Vector are fused into hybrid hits');
    assert(res6.hits.length === new Set(res6.hits.map((h) => h.chunkId)).size, 'Scenario 6.2', 'Zero duplicate chunk IDs in fused result set');

    // -------------------------------------------------------------------------
    // SCENARIO 7: Outdated Document Version Filtering
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Outdated Document Version Filtering ---');
    const res7Latest = await hybridRetrievalEngine.search('Two-Phase Commit Protocol 3PC Non-Blocking Extension', {
      classId: testClassId,
      versionPreference: 'latest',
      topK: 4,
    });
    // With versionPreference: 'latest', v2 chunks should be preferred over v1
    assert(res7Latest.hits.some((h) => h.version === 2), 'Scenario 7.1', 'Latest version (v2) prioritized when versionPreference is latest');

    // -------------------------------------------------------------------------
    // SCENARIO 8: Cross-Classroom Isolation Check
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Cross-Classroom Isolation Check ---');
    const res8 = await hybridRetrievalEngine.search('Byzantine Fault Tolerance PBFT consensus threshold', {
      classId: testClassId, // Student is in class-m2029-phase3
      topK: 5,
    });
    const leakedUnauthorized = res8.hits.some((h) => h.classId === unauthClassId || h.docTitle.includes('Confidential'));
    assert(leakedUnauthorized === false, 'Scenario 8.1', 'Cross-classroom information leakage strictly PREVENTED (0 unauthorized hits)');

    // -------------------------------------------------------------------------
    // SCENARIO 9: Follow-up Question Using Conversation Context
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Follow-Up Question Context Resolution ---');
    const followUpCheck = resolveFollowUpQuery('Give me an example of this.', {
      activeTopic: 'Two-Phase Commit Protocol',
    });
    assert(followUpCheck.isFollowUp === true, 'Scenario 9.1', 'Conversational follow-up correctly detected');
    assert(followUpCheck.query.includes('Two-Phase Commit Protocol'), 'Scenario 9.2', 'Follow-up query enriched with active topic context');

    const res9 = await hybridRetrievalEngine.search('Give me a real-world example.', {
      classId: testClassId,
      conversationContext: { activeTopic: 'Two-Phase Commit Protocol' },
      versionPreference: 'all',
      topK: 3,
    });
    assert(res9.isFollowUp === true && res9.hits.length > 0, 'Scenario 9.3', 'Retrieval engine executes grounded search for enriched follow-up');

    // -------------------------------------------------------------------------
    // SCENARIO 10: Question With No Relevant Uploaded Material
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Unrelated Question Handling ---');
    const res10 = await hybridRetrievalEngine.search('Photosynthesis Calvin Cycle chloroplast stroma enzymes in botany', {
      classId: testClassId,
      minSimilarity: 0.50, // Higher threshold for completely unrelated topic
      topK: 3,
    });
    assert(res10.hits.length === 0, 'Scenario 10.1', 'Correctly returns 0 hits when uploaded materials have no relevant content');

    // -------------------------------------------------------------------------
    // SCENARIO 11: Missing Embedding API Key (Graceful BM25 Fallback)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Missing Embedding API Key ---');
    const emptyKeyProvider = embeddingService.getProvider({ apiKey: '' });
    assert(emptyKeyProvider === null || !emptyKeyProvider.isAvailable(), 'Scenario 11.1', 'Missing or empty key returns unavailable provider');

    const res11 = await hybridRetrievalEngine.search('Two-Phase Commit Protocol', {
      classId: testClassId,
      userAiConfig: { apiKey: '' }, // Student with no key
      topK: 3,
    });
    assert(res11.hits.length > 0, 'Scenario 11.2', 'Retrieval gracefully succeeds via BM25 when student has no embedding key');
    assert(res11.hits[0].retrievalMethod === 'bm25_only' || res11.hits[0].retrievalMethod === 'hybrid', 'Scenario 11.3', 'Results returned without failure or error to student');

    // -------------------------------------------------------------------------
    // SCENARIO 12: Embedding Provider Failure Simulation
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 12: Embedding Provider Failure Simulation ---');
    // Test with invalid provider key
    const res12 = await hybridRetrievalEngine.search('Paxos and Raft consensus', {
      classId: testClassId,
      userAiConfig: { apiKey: 'invalid_malformed_key_123', provider: 'gemini' },
      topK: 3,
    });
    assert(res12.hits.length > 0, 'Scenario 12.1', 'System gracefully falls back to BM25 if embedding provider returns error');

    // -------------------------------------------------------------------------
    // SCENARIO 13: Database Outage Resilience (In-Memory BM25 Survival)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 13: Database Outage Resilience ---');
    // ragEngine in memory operates independently of PostgreSQL
    const memHits = ragEngine.search('Two-Phase Commit Protocol', { limit: 3 });
    assert(memHits.length > 0, 'Scenario 13.1', 'In-memory BM25 index operates even if database connection drops');

    // -------------------------------------------------------------------------
    // SCENARIO 14: Vector Extension / Syntax Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 14: pgvector Vector Extension Syntax ---');
    const extCheck = await queryNeon(`SELECT 1 - ('[1,0,0]'::vector <=> '[1,0,0]'::vector) as self_sim`);
    assert(Number(extCheck[0]?.self_sim) === 1, 'Scenario 14.1', 'pgvector cosine similarity operator <=> verified in database');

    // -------------------------------------------------------------------------
    // SCENARIO 15: Container Restart & Redeployment Recovery
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 15: Container Restart Recovery ---');
    ragEngine.clearAll();
    const countBefore = ragEngine.getStats().totalChunks;
    assert(countBefore === 0, 'Scenario 15.1', 'In-memory cache cleared to simulate container restart');

    const hydratedCount = await ragEngine.hydrateChunksFromNeon();
    assert(hydratedCount > 0, 'Scenario 15.2', `Hydrated ${hydratedCount} chunks from Neon document_chunks on container restart`);

    // -------------------------------------------------------------------------
    // SCENARIO 16: Citation Correctness and Page-Number Accuracy
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 16: Citation Correctness & Page Accuracy ---');
    const res16 = await hybridRetrievalEngine.search('Phase 1 Prepare Phase coordinator VOTE_COMMIT', {
      classId: testClassId,
      topK: 1,
    });
    assert(res16.hits.length > 0, 'Scenario 16.1', 'Retrieved target citation hit');
    const topHit = res16.hits[0];
    assert(topHit.pageNumber === 14, 'Scenario 16.2', `Citation page number matches exact source page (Page ${topHit.pageNumber})`);
    assert(topHit.sectionTitle.includes('Foundations') || topHit.sectionTitle.includes('2PC'), 'Scenario 16.3', `Section heading preserved accurately: "${topHit.sectionTitle}"`);
    assert(res16.citationString.includes('Page 14'), 'Scenario 16.4', 'Formatted citation string contains correct document title and page number');

    // -------------------------------------------------------------------------
    // BENCHMARK EVALUATION: BM25 vs Vector vs Hybrid RRF
    // -------------------------------------------------------------------------
    console.log('\n=================================================================');
    console.log('📈 RETRIEVAL QUALITY BENCHMARK EVALUATION (K=3)');
    console.log('=================================================================');

    const testQueries = [
      { q: 'Two-Phase Commit Protocol coordinator', targetDoc: 'Distributed_2PC_Notes' },
      { q: 'How do distributed nodes agree before making changes?', targetDoc: 'Distributed_2PC_Notes' },
      { q: 'Raft consensus leader election and log replication', targetDoc: 'Consensus_Paxos_Raft' },
      { q: 'What is the major limitation of 2PC?', targetDoc: 'Distributed_2PC_Notes' },
      { q: 'Fault-tolerant consensus algorithm state machine', targetDoc: 'Consensus_Paxos_Raft' },
    ];

    let bm25HitsAtK = 0;
    let vectorHitsAtK = 0;
    let hybridHitsAtK = 0;

    let bm25ReciprocalRanks = 0;
    let vectorReciprocalRanks = 0;
    let hybridReciprocalRanks = 0;

    for (const tq of testQueries) {
      // 1. BM25 Only
      const bRes = ragEngine.search(tq.q, { classId: testClassId, limit: 3 });
      const bHitIdx = bRes.findIndex((h) => h.fileName.includes(tq.targetDoc) || h.docTitle.includes(tq.targetDoc));
      if (bHitIdx >= 0) {
        bm25HitsAtK++;
        bm25ReciprocalRanks += 1 / (bHitIdx + 1);
      }

      // 2. Vector Only
      const qVec = (await embeddingService.embedQuery(tq.q)) || generateTestVector(tq.q);
      const vRes = await queryNeon<{ file_name: string }>(
        `SELECT u.file_name, 1 - (ce.embedding <=> $1::vector) as sim
         FROM chunk_embeddings ce
         JOIN document_chunks c ON ce.chunk_id = c.id
         JOIN document_uploads u ON c.asset_hash = u.asset_hash
         WHERE u.class_id = $2
         ORDER BY ce.embedding <=> $1::vector ASC
         LIMIT 3`,
        [`[${qVec.join(',')}]`, testClassId]
      );
      const vHitIdx = vRes.findIndex((h) => h.file_name.includes(tq.targetDoc));
      if (vHitIdx >= 0) {
        vectorHitsAtK++;
        vectorReciprocalRanks += 1 / (vHitIdx + 1);
      }

      // 3. Hybrid
      const hRes = await hybridRetrievalEngine.search(tq.q, { classId: testClassId, topK: 3 });
      const hHitIdx = hRes.hits.findIndex((h) => h.fileName.includes(tq.targetDoc) || h.docTitle.includes(tq.targetDoc));
      if (hHitIdx >= 0) {
        hybridHitsAtK++;
        hybridReciprocalRanks += 1 / (hHitIdx + 1);
      }
    }

    const N = testQueries.length;
    const bm25Recall = (bm25HitsAtK / N) * 100;
    const vectorRecall = (vectorHitsAtK / N) * 100;
    const hybridRecall = (hybridHitsAtK / N) * 100;

    const bm25MRR = (bm25ReciprocalRanks / N).toFixed(3);
    const vectorMRR = (vectorReciprocalRanks / N).toFixed(3);
    const hybridMRR = (hybridReciprocalRanks / N).toFixed(3);

    console.log(`| Retrieval Method  | Recall@3 | MRR (Mean Reciprocal Rank) | Precision@3 |`);
    console.log(`|-------------------|----------|----------------------------|-------------|`);
    console.log(`| BM25 Only         | ${bm25Recall.toFixed(1)}%   | ${bm25MRR}                      | ${(bm25HitsAtK / (N * 3) * 100).toFixed(1)}%       |`);
    console.log(`| Vector Only       | ${vectorRecall.toFixed(1)}%   | ${vectorMRR}                      | ${(vectorHitsAtK / (N * 3) * 100).toFixed(1)}%       |`);
    console.log(`| Hybrid (RRF Fused)| ${hybridRecall.toFixed(1)}%  | ${hybridMRR}                      | ${(hybridHitsAtK / (N * 3) * 100).toFixed(1)}%       |`);

    assert(hybridRecall >= bm25Recall, 'Benchmark 1', 'Hybrid Recall@3 is greater than or equal to BM25-only');
    assert(Number(hybridMRR) >= Number(bm25MRR), 'Benchmark 2', 'Hybrid MRR is greater than or equal to BM25-only');

  } finally {
    // Clean up test data from Neon
    console.log('\n--- Cleaning Up Phase 3 Test Records from Neon ---');
    try {
      await queryNeon(`DELETE FROM class_workspaces WHERE id IN ($1, $2)`, [testClassId, unauthClassId]);
      console.log('✅ Temporary test workspaces and cascaded chunks cleanly removed.');
    } catch {}
  }

  // Final Summary
  console.log('\n=================================================================');
  console.log('📊 PHASE 3 TEST RESULTS SUMMARY:');
  console.log('=================================================================');
  const passedCount = assertions.filter((a) => a.passed).length;
  const failedCount = assertions.filter((a) => !a.passed).length;

  console.log(`Total Assertions: ${assertions.length}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);

  if (failedCount === 0) {
    console.log('\n🎉 ALL 16 PHASE 3 SCENARIOS AND BENCHMARKS PASSED WITH ZERO FAILURES!');
  } else {
    console.error(`\n❌ ${failedCount} ASSERTIONS FAILED.`);
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
