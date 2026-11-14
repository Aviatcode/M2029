import dotenv from 'dotenv';
dotenv.config();

import {
  isNeonConfigured,
  testNeonConnection,
  getNeonSql,
  queryNeon,
  sanitizeDbError
} from '../src/server/db/neonClient.js';
import { aiKnowledgeCache, AIKnowledgeCacheManager } from '../src/server/ai/aiKnowledgeCache.js';
import { db, verifyAdminAuth } from '../src/server/routes.js';
import { AcademicAssignment } from '../src/types/index.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName} ${detail ? `\n   └─ ${detail}` : ''}`);
  } else {
    failedTests++;
    console.error(`❌ [FAIL] ${testName} ${detail ? `\n   └─ ${detail}` : ''}`);
  }
}

async function runPhase1Tests() {
  console.log('=============================================================');
  console.log('🧪 M2029 PHASE 1 TEST SUITE: DATABASE-FIRST PERSISTENCE & SECURITY');
  console.log('=============================================================\n');

  // TEST 1: Database Connectivity
  console.log('--- 1. DATABASE CONNECTIVITY ---');
  assert(isNeonConfigured(), 'Neon is configured in environment', 'DATABASE_URL validated without placeholder');
  const conn = await testNeonConnection();
  assert(conn.ok, 'Neon connection test succeeds', `Database: ${conn.database}, Tables: ${conn.tableCount}, Latency: ${conn.latencyMs}ms`);

  // TEST 2: Error Sanitization (Security)
  console.log('\n--- 2. CREDENTIAL SAFETY & ERROR SANITIZATION ---');
  const dirtyError = new Error('Connection failed to postgresql://neondb_owner:secret_pass_1234@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require');
  const cleanError = sanitizeDbError(dirtyError);
  assert(!cleanError.message.includes('secret_pass_1234'), 'Passwords scrubbed from database errors', `Sanitized message: "${cleanError.message}"`);
  assert(cleanError.message.includes('postgresql://***:***@'), 'Connection credentials masked with wildcard replacement');

  // TEST 3: AI Knowledge Cache Neon Persistence & Retrieval
  console.log('\n--- 3. AI KNOWLEDGE CACHE PERSISTENCE & RETRIEVAL ---');
  const testQuery = `Phase1 Test Query ${Date.now()}`;
  const testAnswer = 'This is a test answer for Phase 1 verification.';
  const storedEntry = await aiKnowledgeCache.setAsync(
    testQuery,
    'Operating Systems',
    'all',
    testAnswer,
    { simple: 'Simple test answer' },
    'Phase1 Test Runner'
  );
  assert(Boolean(storedEntry && storedEntry.id), 'AI Cache entry stored and returned', `ID: ${storedEntry.id}`);

  // Query directly from Neon to verify persistence
  const sql = getNeonSql();
  const dbRows = await (sql as any).query(`SELECT * FROM ai_knowledge_cache WHERE id = $1`, [storedEntry.id]);
  assert(dbRows.length === 1, 'Entry verified directly in Neon PostgreSQL', `Row exists in database with id: ${dbRows[0]?.id}`);
  assert(dbRows[0].answer === testAnswer, 'Answer content matches exactly in Neon');

  // Test getAsync retrieval on fresh query
  const retrieved = await aiKnowledgeCache.getAsync(testQuery, 'Operating Systems', 'all');
  assert(Boolean(retrieved && retrieved.id === storedEntry.id), 'aiKnowledgeCache.getAsync successfully retrieves entry', `Hit count: ${retrieved?.hitCount}`);

  // TEST 4: Concurrent Atomic Voting
  console.log('\n--- 4. CONCURRENT ATOMIC VOTING (NO LOST UPDATES) ---');
  const initialVotes = retrieved?.positiveVotes || 0;
  // Simulate 5 concurrent upvotes from different students
  const votePromises = Array.from({ length: 5 }).map(() =>
    aiKnowledgeCache.voteAsync(testQuery, 'Operating Systems', 'all', 'up')
  );
  await Promise.all(votePromises);

  const neonVoteCheck = await (sql as any).query(`SELECT positive_votes FROM ai_knowledge_cache WHERE id = $1`, [storedEntry.id]);
  const finalVotes = Number(neonVoteCheck[0]?.positive_votes);
  assert(finalVotes === initialVotes + 5, '5 concurrent votes recorded atomically in Neon without lost updates', `Expected: ${initialVotes + 5}, Actual in Neon: ${finalVotes}`);

  // Clean up test entry
  await (sql as any).query(`DELETE FROM ai_knowledge_cache WHERE id = $1`, [storedEntry.id]);

  // TEST 5: Bounded LRU Memory Cache Eviction
  console.log('\n--- 5. BOUNDED LRU MEMORY CACHE EVICTION ---');
  assert(AIKnowledgeCacheManager.MAX_CACHE_ENTRIES === 250, 'Max in-memory cache capacity bounded to 250 entries', 'Prevents Render heap exhaustion');

  // TEST 6: Classroom Data Hydration
  console.log('\n--- 6. CLASSROOM DATA HYDRATION FROM NEON ---');
  const hydrated = await db.hydrateFromNeon();
  assert(hydrated, 'db.hydrateFromNeon() successfully loads data from Neon', `Workspaces loaded: ${Object.keys(db.classes).length}, Assignments: ${db.assignments.length}`);
  assert(Object.keys(db.classes).length > 0, 'Class workspaces populated from database');
  assert(db.assignments.length > 0, 'Academic assignments populated from database');

  // TEST 7: Classroom Mutation Persistence (Assignment Add & Delete)
  console.log('\n--- 7. CLASSROOM MUTATION PERSISTENCE (ADD & DELETE) ---');
  const testAssignmentId = `test-assign-${Date.now()}`;
  const testAssignment: AcademicAssignment = {
    id: testAssignmentId,
    classId: 'class-m2029',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    title: 'Phase 1 Automated Test Assignment',
    type: 'assignment',
    dueDate: '2026-11-30',
    instructions: 'Test instructions',
    integrityMode: 'teach_me',
    assignedBy: 'Test Suite',
    completed: false,
    outlineSteps: ['Step 1', 'Step 2'],
    keyReferences: ['Ref 1'],
  };

  await db.addAssignment(testAssignment);
  const verifyDbRow = await (sql as any).query(`SELECT id, title FROM academic_assignments WHERE id = $1`, [testAssignmentId]);
  assert(verifyDbRow.length === 1, 'Assignment persisted directly into Neon academic_assignments', `Found in Neon: ${verifyDbRow[0]?.title}`);

  // TEST 8: Ephemeral Restart Persistence Simulation
  console.log('\n--- 8. SIMULATE RENDER CONTAINER RESTART ---');
  // Re-instantiate fresh MemoryStore to simulate container spin-up with empty memory
  const simulatedRestartedStore = new (db.constructor as any)();
  // Clear memory to simulate pure startup
  simulatedRestartedStore.assignments = [];
  assert(simulatedRestartedStore.assignments.length === 0, 'Container memory initially clean/unloaded');
  
  await simulatedRestartedStore.hydrateFromNeon();
  const recoveredAssignment = simulatedRestartedStore.assignments.find((a: any) => a.id === testAssignmentId);
  assert(Boolean(recoveredAssignment), 'Newly created assignment recovered seamlessly from Neon on simulated container restart', `Recovered title: "${recoveredAssignment?.title}"`);

  // Clean up test assignment
  await db.deleteAssignment(testAssignmentId);
  const verifyDeleted = await (sql as any).query(`SELECT id FROM academic_assignments WHERE id = $1`, [testAssignmentId]);
  assert(verifyDeleted.length === 0, 'Assignment cleanly deleted from Neon database');

  // TEST 9: Security & Authorization for Destructive Endpoints
  console.log('\n--- 9. DESTRUCTIVE ENDPOINT AUTHORIZATION ---');
  // Mock request without header
  const reqUnauth: any = { headers: {} };
  assert(!verifyAdminAuth(reqUnauth), 'Unauthenticated request rejected by verifyAdminAuth');

  // Mock request with wrong key
  const reqWrong: any = { headers: { 'x-admin-key': 'wrong_secret_key' } };
  assert(!verifyAdminAuth(reqWrong), 'Request with incorrect key rejected by verifyAdminAuth');

  // Mock request with correct key
  process.env.ADMIN_API_KEY = 'm2029_secure_admin_test_key';
  const reqValid: any = { headers: { 'x-admin-key': 'm2029_secure_admin_test_key' } };
  assert(verifyAdminAuth(reqValid), 'Request with valid X-Admin-Key accepted by verifyAdminAuth');

  const reqBearer: any = { headers: { authorization: 'Bearer m2029_secure_admin_test_key' } };
  assert(verifyAdminAuth(reqBearer), 'Request with valid Bearer token accepted by verifyAdminAuth');

  console.log('\n=============================================================');
  console.log(`📊 PHASE 1 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (Total: ${totalTests})`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
