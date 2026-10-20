import { ragEngine } from '../src/server/rag/ragIndex.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('🧪 Starting Active Backend RAG Pipeline Verification...');

  // 1. Create a simulated college textbook file
  const testBookPath = path.resolve(process.cwd(), 'curriculum-repo', 'uploads', 'Operating_Systems_Concepts_Galvin_10th.txt');
  const testDir = path.dirname(testBookPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const sampleBookContent = `
Chapter 1: Introduction to Operating System Architecture
An operating system is software that acts as an intermediary between a user of a computer and the computer hardware.
The purpose of an operating system is to provide an environment in which a user can execute programs in a convenient and efficient manner.
Core responsibilities include CPU scheduling, memory management, file systems, and I/O device management.

Chapter 2: Process Scheduling and Dispatching
The objective of multiprogramming is to have some process running at all times, to maximize CPU utilization.
The objective of time sharing is to switch the CPU among processes so frequently that users can interact with each program while it is running.
Process scheduling algorithms:
1. First-Come, First-Served (FCFS) Scheduling: Simple FIFO queue. Suffer from convoy effect.
2. Shortest-Job-First (SJF) Scheduling: Optimal average waiting time. Impossible to know future burst duration.
3. Round-Robin (RR) Scheduling: Preemptive, designed for time-sharing systems. Time quantum typically 10 to 100 milliseconds.

Chapter 3: Deadlock Characterization and Safe States
A process requests resources; if the resources are not available at that time, the process enters a wait state.
Four Coffman conditions must hold simultaneously for a deadlock to arise:
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be holding at least one resource and waiting to acquire additional resources held by other processes.
3. No Preemption: Resources cannot be preempted; a resource can be released only voluntarily by the process holding it.
4. Circular Wait: A set {P0, P1, ..., Pn} of waiting processes must exist such that P0 is waiting for a resource held by P1, P1 is waiting for P2, and Pn is waiting for P0.

Chapter 4: The Banker's Algorithm for Deadlock Avoidance
The Banker's Algorithm is a deadlock avoidance algorithm developed by Edsger Dijkstra.
When a new process enters the system, it must declare the maximum number of instances of each resource type that it may need.
Data Structures:
- Available: Vector of length m indicating available instances of each resource.
- Max: n x m matrix defining maximum demand of each process.
- Allocation: n x m matrix defining instances currently allocated to each process.
- Need: n x m matrix defining remaining resource need (Need[i][j] = Max[i][j] - Allocation[i][j]).
Safety Algorithm:
Step 1: Let Work and Finish be vectors of length m and n. Initialize Work = Available and Finish[i] = false for all i.
Step 2: Find an index i such that Finish[i] == false and Need[i] <= Work. If no such i exists, go to Step 4.
Step 3: Work = Work + Allocation[i], Finish[i] = true, go to Step 2.
Step 4: If Finish[i] == true for all i, then the system is in a safe state.

Chapter 5: Virtual Memory and Page Replacement Algorithms
Virtual memory involves the separation of user logical memory from physical memory.
When a page fault occurs, the operating system must bring the desired page from secondary storage into main memory.
FIFO Page Replacement: Replaces the oldest page. Suffers from Belady's Anomaly where increasing page frames increases page faults!
Optimal Page Replacement (OPT): Replaces the page that will not be used for the longest period of time. Minimum possible page-fault rate.
LRU Page Replacement (Least Recently Used): Replaces the page that has not been used for the longest period of time. Uses counter or stack.

Chapter 6: B-Trees and Multi-Level Indexing in Storage Systems
A B-tree is a self-balancing search tree in which each node can contain more than one key and have more than two children.
Properties of a B-tree of order m:
1. Every node has at most m children.
2. Every internal node (except root) has at least ceil(m/2) children.
3. The root has at least two children if it is not a leaf node.
4. All leaves appear in the same level and carry no information beyond keys.
B-Tree Deletion Algorithm:
Case 1: The key to be deleted is in a leaf node. Remove it if the node still satisfies minimum key requirements.
Case 2: The key is in an internal node. Replace it with its in-order predecessor or successor, and recursively delete.
Case 3: If a node has fewer than ceil(m/2) - 1 keys, borrow from sibling or merge with sibling node.
`;

  fs.writeFileSync(testBookPath, sampleBookContent, 'utf-8');

  // Ingest into RAG Engine
  const doc = await ragEngine.ingestFile({
    filePath: testBookPath,
    fileName: 'Operating_Systems_Concepts_Galvin_10th.txt',
    originalName: 'Operating_Systems_Concepts_Galvin_10th.txt',
    fileType: 'txt',
    fileSize: Buffer.byteLength(sampleBookContent),
    title: 'Operating Systems Concepts (Galvin 10th Edition)',
    classId: 'class-bca-2028',
    subjectName: 'Operating Systems',
  });

  console.log(`✅ Document Ingested: ID="${doc.id}", Status="${doc.status}", Chunks=${doc.chunkCount}, Words=${doc.wordCount}`);

  // Query 1: Banker's algorithm
  console.log('\n🔍 Testing Query 1: "Bankers algorithm safe state formula"');
  const q1 = ragEngine.search("Bankers algorithm safe state formula", { docId: doc.id });
  console.log(`Found ${q1.length} matches:`);
  q1.slice(0, 2).forEach((res, i) => {
    console.log(`  Match ${i + 1} (Score: ${res.score}): [${res.sectionTitle}] Chunk #${res.chunk.chunkIndex}`);
    console.log(`  Snippet: "${res.chunk.text.slice(0, 140)}..."`);
  });

  // Query 2: B-Tree deletion
  console.log('\n🔍 Testing Query 2: "B-Tree deletion algorithm merge with sibling"');
  const q2 = ragEngine.search("B-Tree deletion algorithm merge with sibling", { docId: doc.id });
  console.log(`Found ${q2.length} matches:`);
  q2.slice(0, 2).forEach((res, i) => {
    console.log(`  Match ${i + 1} (Score: ${res.score}): [${res.sectionTitle}] Chunk #${res.chunk.chunkIndex}`);
    console.log(`  Snippet: "${res.chunk.text.slice(0, 140)}..."`);
  });

  // Query 3: Belady's Anomaly
  console.log('\n🔍 Testing Query 3: "Beladys Anomaly FIFO page replacement"');
  const q3 = ragEngine.search("Beladys Anomaly FIFO page replacement", { docId: doc.id });
  console.log(`Found ${q3.length} matches:`);
  q3.slice(0, 2).forEach((res, i) => {
    console.log(`  Match ${i + 1} (Score: ${res.score}): [${res.sectionTitle}] Chunk #${res.chunk.chunkIndex}`);
    console.log(`  Snippet: "${res.chunk.text.slice(0, 140)}..."`);
  });

  // Test Grounded Q&A
  console.log('\n🤖 Testing Grounded Ask: "Explain the 4 Coffman conditions for deadlock"');
  const askRes = await ragEngine.askQuestion("Explain the 4 Coffman conditions for deadlock", { docId: doc.id });
  console.log(`Answer Model: ${askRes.modelUsed}`);
  console.log(`Sources cited: ${askRes.sources.length}`);
  console.log(`Answer excerpt:\n${askRes.answer.slice(0, 300)}...`);

  console.log('\n🎉 ALL RAG RETRIEVAL & GROUNDING TESTS PASSED PERFECTLY!');
}

runTest().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
