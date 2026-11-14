import dotenv from 'dotenv';
dotenv.config();

import { testNeonConnection } from '../src/server/db/neonClient.js';
import { hybridRetrievalEngine } from '../src/server/rag/hybridRetrievalEngine.js';
import { knowledgeGraphEngine } from '../src/server/rag/graphRagEngine.js';
import { concurrentGenerationCoordinator } from '../src/server/ai/concurrentGenerationCoordinator.js';
import { MemoryRateLimiter } from '../src/server/security/rateLimiter.js';
import { encryptApiKey, decryptApiKey } from '../src/server/ai/multiProvider/byokSecurityService.js';

async function runBenchmark() {
  console.log('====================================================');
  console.log('⚡ M2029 PHASE 10: REAL-WORLD PERFORMANCE BENCHMARK');
  console.log('====================================================\n');

  // 1. Neon DB latency
  const t0 = performance.now();
  const dbHealth = await testNeonConnection();
  const dbLatency = performance.now() - t0;
  console.log(`[Database] Neon PostgreSQL Ping: ${dbLatency.toFixed(2)} ms (Connected: ${dbHealth.ok})`);

  // 2. Hybrid RAG retrieval latency
  const t1 = performance.now();
  const ragResults = await hybridRetrievalEngine.search('deadlock prevention Banker algorithm', {
    classId: 'class-m2029',
    topK: 5,
  });
  const ragLatency = performance.now() - t1;
  console.log(`[RAG Engine] Hybrid Search (BM25 + Semantic): ${ragLatency.toFixed(2)} ms (Hits: ${ragResults.hits.length})`);

  // 3. Knowledge Graph traversal latency
  const t2 = performance.now();
  const graphResults = await knowledgeGraphEngine.queryGraph('Deadlock Operating Systems', {
    classId: 'class-m2029',
  });
  const kgLatency = performance.now() - t2;
  const totalNodes = (graphResults.matchedNodes?.length || 0) + (graphResults.connectedNodes?.length || 0);
  console.log(`[Knowledge Graph] Subgraph Traversal: ${kgLatency.toFixed(2)} ms (Matched Nodes: ${totalNodes})`);

  // 4. Concurrency lock overhead
  const t3 = performance.now();
  const lockKey = concurrentGenerationCoordinator.computeLockKey({
    classId: 'bench-class',
    query: 'bench query',
    mode: 'all',
  });
  const lock = await concurrentGenerationCoordinator.acquireLockOrWait({
    lockKey,
    classId: 'bench-class',
    studentId: 'bench-s1',
    maxWaitMs: 100,
  });
  await concurrentGenerationCoordinator.releaseLock({ lockKey, status: 'completed' });
  const lockLatency = performance.now() - t3;
  console.log(`[Concurrency] Distributed Lock Acquire + Release: ${lockLatency.toFixed(2)} ms`);

  // 5. Memory Rate limiter overhead (1,000 requests)
  const limiter = new MemoryRateLimiter({ windowMs: 60000, maxRequests: 5000, name: 'bench' });
  const mockReq: any = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
  const mockRes: any = { headers: {}, setHeader() {}, status() { return { json() {} }; } };
  const t4 = performance.now();
  for (let i = 0; i < 1000; i++) {
    limiter.middleware()(mockReq, mockRes, () => {});
  }
  const limiterOverhead = (performance.now() - t4) / 1000;
  console.log(`[Security] In-Memory Rate Limiter Overhead: ${limiterOverhead.toFixed(4)} ms/req`);

  // 6. BYOK AES-256-GCM encryption/decryption (100 cycles)
  const testKey = 'AIzaSyBenchmarkTestKeyXYZ1234567890';
  const t5 = performance.now();
  for (let i = 0; i < 100; i++) {
    const enc = encryptApiKey(testKey);
    const dec = decryptApiKey(enc);
  }
  const cryptoOverhead = (performance.now() - t5) / 100;
  console.log(`[BYOK Vault] AES-256-GCM Encrypt + Decrypt Cycle: ${cryptoOverhead.toFixed(4)} ms`);

  // 7. Process Memory Footprint
  const mem = process.memoryUsage();
  console.log('\n[Memory Footprint] Render 512MB Budget Compliance:');
  console.log(`  - Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Resident Set Size (RSS): ${(mem.rss / 1024 / 1024).toFixed(2)} MB / 512 MB (${((mem.rss / 1024 / 1024 / 512) * 100).toFixed(1)}% of Render free-tier limit)`);
  console.log('====================================================\n');
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
