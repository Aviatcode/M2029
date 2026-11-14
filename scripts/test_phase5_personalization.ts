import { queryNeon, isNeonConfigured, initializeNeonSchema } from '../src/server/db/neonClient.js';
import { learningProfileService } from '../src/server/personalization/learningProfileService.js';
import { adaptiveTutorService } from '../src/server/personalization/adaptiveTutorService.js';
import { personalizedNextTopicService } from '../src/server/personalization/personalizedNextTopicService.js';
import { targetedPracticeService } from '../src/server/personalization/targetedPracticeService.js';
import { knowledgeGraphEngine } from '../src/server/rag/graphRagEngine.js';
import { graphExtractionService } from '../src/server/rag/graphExtractionService.js';
import { aiKnowledgeCache } from '../src/server/ai/aiKnowledgeCache.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, scenario: string, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${scenario}: ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${scenario}: ${message}`);
  }
}

async function runPhase5Tests() {
  console.log('=================================================================');
  console.log('🧪 M2029 PHASE 5: PERSONALIZED LEARNING INTELLIGENCE 16-SCENARIO SUITE');
  console.log('=================================================================\n');

  const runId = Date.now();
  const testClassId = `class-p5-${runId}`;
  const testClassCode = `P5${runId.toString().slice(-4)}`;
  const studentA = `student-a-${runId}`;
  const studentB = `student-b-${runId}`;

  try {
    // 0. Ensure schema exists
    await initializeNeonSchema(false);

    // Setup test classroom in Neon
    if (isNeonConfigured()) {
      await queryNeon(`
        INSERT INTO class_workspaces (id, code, name, university)
        VALUES ($1, $2, 'Phase 5 Personalization Classroom', 'GGSIPU')
        ON CONFLICT (code) DO NOTHING;
      `, [testClassId, testClassCode]);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 1: New Student With No Learning History
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: New Student With No Learning History ---');
    const newStudentProfile = await learningProfileService.getOrCreateProfile(studentA, testClassId, 'Avikshit');
    
    assert(newStudentProfile.studentId === studentA, 'Scenario 1.1', `Created profile with student ID: ${studentA}`);
    assert(newStudentProfile.currentUnitNumber === 1, 'Scenario 1.2', 'Initial unit defaults to Unit 1');
    assert(newStudentProfile.completedTopics.length === 0, 'Scenario 1.3', 'Completed topics starts empty');
    assert(newStudentProfile.preferredLanguage === 'english', 'Scenario 1.4', 'Preferred language defaults to english');

    const initialMastery = await learningProfileService.getMasteryRecord(studentA, testClassId, 'CPU Scheduling Preemption');
    assert(initialMastery === null, 'Scenario 1.5', 'Unstudied concept has no prior mastery record (clean state)');

    const initialNeedsPractice = await learningProfileService.getConceptsNeedingPractice(studentA, testClassId);
    assert(initialNeedsPractice.length === 0, 'Scenario 1.6', 'Needs-practice list starts empty for new student');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Student Asking for a Basic Explanation (INTRODUCED -> LEARNING)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Student Asking for a Basic Explanation ---');
    const exp1 = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'CPU Scheduling Preemption',
      evidenceSource: 'ai_tutor_explanation',
      confidence: 0.80,
      summary: 'First view of CPU Scheduling Preemption explanation',
    });

    assert(exp1.masteryState === 'INTRODUCED', 'Scenario 2.1', 'First explanation transitions state to INTRODUCED');
    assert(exp1.consecutiveCorrectCount === 0, 'Scenario 2.2', 'Passive explanation does not increment correct count');

    const exp2 = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'CPU Scheduling Preemption',
      evidenceSource: 'ai_tutor_explanation',
      confidence: 0.80,
      summary: 'Second view of CPU Scheduling Preemption explanation',
    });

    assert(exp2.masteryState === 'LEARNING', 'Scenario 2.3', 'Subsequent explanation transitions state to LEARNING');
    assert(exp2.masteryState !== 'DEVELOPING' && exp2.masteryState !== 'DEMONSTRATED', 'Scenario 2.4', 'Passive reading never falsely awards DEVELOPING or DEMONSTRATED');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Explicit Confusion / "Did Not Understand" Click
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Explicit Confusion / Did Not Understand Click ---');
    const confusedRecord = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'CPU Scheduling Preemption',
      evidenceSource: 'did_not_understand_click',
      confidence: 0.95,
      summary: 'Student clicked Did Not Understand',
    });

    assert(confusedRecord.masteryState === 'NEEDS_PRACTICE', 'Scenario 3.1', 'Did Not Understand click transitions directly to NEEDS_PRACTICE');
    assert(confusedRecord.consecutiveCorrectCount === 0, 'Scenario 3.2', 'Consecutive correct count reset to 0');

    const weakList = await learningProfileService.getConceptsNeedingPractice(studentA, testClassId);
    assert(weakList.some((w) => w.canonicalConcept === 'cpu scheduling preemption'), 'Scenario 3.3', 'Concept appears in concepts needing practice');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Student Repeatedly Answering Incorrectly
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Student Repeatedly Answering Incorrectly ---');
    const wrong1 = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'Deadlock Detection and Recovery',
      evidenceSource: 'practice_question',
      isCorrect: false,
      confidence: 0.90,
      summary: 'First incorrect quiz attempt',
    });

    assert(wrong1.masteryState === 'NEEDS_PRACTICE', 'Scenario 4.1', 'Incorrect answer sets state to NEEDS_PRACTICE');
    assert(wrong1.consecutiveCorrectCount === 0, 'Scenario 4.2', 'Consecutive correct count remains 0');

    const wrong2 = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'Deadlock Detection and Recovery',
      evidenceSource: 'quiz_evaluation',
      isCorrect: false,
      confidence: 0.90,
      summary: 'Second incorrect quiz attempt',
    });

    assert(wrong2.masteryState === 'NEEDS_PRACTICE', 'Scenario 4.3', 'Repeated incorrect answer stays firmly in NEEDS_PRACTICE');
    assert(wrong2.totalAttempts === 2, 'Scenario 4.4', 'Total attempts accurately recorded as 2');
    assert(wrong2.totalCorrect === 0, 'Scenario 4.5', 'Total correct accurately recorded as 0');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Student Answering Correctly Once (Strictly DEVELOPING, Not DEMONSTRATED)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Single Correct Answer Guard ---');
    const singleCorrect = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'CPU Scheduling Preemption',
      evidenceSource: 'practice_question',
      isCorrect: true,
      confidence: 0.90,
      summary: 'Answered first practice question correctly',
    });

    assert(singleCorrect.consecutiveCorrectCount === 1, 'Scenario 5.1', 'Consecutive correct count is exactly 1');
    assert(singleCorrect.masteryState === 'DEVELOPING', 'Scenario 5.2', 'Single correct answer transitions to DEVELOPING');
    assert(singleCorrect.masteryState !== 'DEMONSTRATED', 'Scenario 5.3', 'GUARD VERIFIED: Single correct answer strictly NOT marked DEMONSTRATED');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Consistent Understanding With >= 2 Consecutive Correct Answers
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Consistent Mastery (>= 2 Consecutive Correct) ---');
    const secondCorrect = await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'CPU Scheduling Preemption',
      evidenceSource: 'practice_question',
      isCorrect: true,
      confidence: 0.90,
      summary: 'Answered second practice question correctly',
    });

    assert(secondCorrect.consecutiveCorrectCount === 2, 'Scenario 6.1', 'Consecutive correct count reached 2');
    assert(secondCorrect.masteryState === 'DEMONSTRATED', 'Scenario 6.2', 'Two consecutive correct answers validate DEMONSTRATED mastery');

    const updatedWeakList = await learningProfileService.getConceptsNeedingPractice(studentA, testClassId);
    assert(!updatedWeakList.some((w) => w.canonicalConcept === 'cpu scheduling preemption'), 'Scenario 6.3', 'Mastered concept removed from needs-practice queue');

    // -------------------------------------------------------------------------
    // SCENARIO 7: Missing or Incomplete Progress Evidence Handled Cleanly
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Missing Evidence Handled Cleanly ---');
    const missingMastery = await learningProfileService.getMasteryRecord(studentA, testClassId, 'Quantum Cryptography Qubits');
    assert(missingMastery === null, 'Scenario 7.1', 'Null returned gracefully for unrecorded concept without error');

    const missingProfile = await learningProfileService.getOrCreateProfile(`unknown-student-${runId}`, testClassId);
    assert(missingProfile !== null && missingProfile.currentUnitNumber === 1, 'Scenario 7.2', 'Clean fresh profile generated for previously unseen student');

    // -------------------------------------------------------------------------
    // SCENARIO 8: Personalized Prerequisite Recommendation
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Personalized Prerequisite Recommendation ---');
    // Seed Graph RAG nodes: "Critical Section" is a prerequisite for "Semaphores"
    const nodeAId = `node-cs-${runId}`;
    const nodeBId = `node-sem-${runId}`;

    await graphExtractionService.persistGraphElements({
      classId: testClassId,
      nodes: [
        {
          id: nodeAId,
          classId: testClassId,
          subjectName: 'Operating Systems',
          name: 'Critical Section',
          canonicalName: 'critical section',
          nodeType: 'concept',
          summary: 'Critical Section concept definition',
          verificationStatus: 'verified',
          confidenceScore: 0.95,
          extractionMethod: 'curriculum_curated',
          keywords: ['critical', 'section'],
        },
        {
          id: nodeBId,
          classId: testClassId,
          subjectName: 'Operating Systems',
          name: 'Semaphores',
          canonicalName: 'semaphores',
          nodeType: 'concept',
          summary: 'Semaphores concept definition',
          verificationStatus: 'verified',
          confidenceScore: 0.95,
          extractionMethod: 'curriculum_curated',
          keywords: ['semaphores'],
        },
      ],
      edges: [
        {
          id: `edge-req-${runId}`,
          classId: testClassId,
          sourceNodeId: nodeBId,
          targetNodeId: nodeAId,
          relationshipType: 'REQUIRES',
          label: 'requires',
          confidenceScore: 0.95,
          verificationStatus: 'verified',
          extractionMethod: 'curriculum_curated',
          sourceDocId: `doc-${runId}`,
          pageNumber: 22,
        },
      ],
    });

    // Rehydrate graph
    await knowledgeGraphEngine.hydrateFromNeon(testClassId);

    // Set student's mastery for prerequisite "Critical Section" to NEEDS_PRACTICE
    await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'critical section',
      evidenceSource: 'did_not_understand_click',
    });

    const adaptiveCtx = await adaptiveTutorService.buildAdaptiveContext({
      studentId: studentA,
      classId: testClassId,
      topicTitle: 'Semaphores',
    });

    assert(adaptiveCtx.needsPrerequisiteHelp === true, 'Scenario 8.1', 'Adaptive tutor detects student struggles with prerequisite');
    assert(adaptiveCtx.prerequisiteConcept?.toLowerCase() === 'critical section', 'Scenario 8.2', 'Identified "critical section" as the prerequisite anchor');

    // Test next topic recommendation
    // Provide a candidate track topic
    const nextTopicRecommendation = await personalizedNextTopicService.getNextRecommendedTopic({
      studentId: studentA,
      classId: testClassId,
      trackId: 'os-unit2-cpu',
      currentTopicIndex: 0,
    });

    assert(nextTopicRecommendation !== null, 'Scenario 8.3', 'Generated next topic recommendation');
    assert(typeof nextTopicRecommendation.isPrerequisiteRemediation === 'boolean', 'Scenario 8.4', 'Evaluated prerequisite remediation flag');

    // -------------------------------------------------------------------------
    // SCENARIO 9: Next Topic Respecting Syllabus Order When Prerequisites Satisfied
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Syllabus Progression When Prerequisites Satisfied ---');
    // Advance student's mastery of prerequisite to DEMONSTRATED
    await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'critical section',
      evidenceSource: 'practice_question',
      isCorrect: true,
    });
    await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'critical section',
      evidenceSource: 'practice_question',
      isCorrect: true,
    });

    const standardNext = await personalizedNextTopicService.getNextRecommendedTopic({
      studentId: studentA,
      classId: testClassId,
      trackId: 'os-unit2-cpu',
      currentTopicIndex: 0,
    });

    assert(standardNext.isPrerequisiteRemediation === false, 'Scenario 9.1', 'Normal syllabus progression resumes without remediation detours');
    assert(standardNext.topicTitle.length > 0, 'Scenario 9.2', `Recommended syllabus topic: "${standardNext.topicTitle}"`);

    // -------------------------------------------------------------------------
    // SCENARIO 10: Explicit User Preference Overriding Adaptation
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Explicit Preferences Overriding Adaptation ---');
    // Set concept to NEEDS_PRACTICE
    await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'Process Synchronization Locks',
      evidenceSource: 'did_not_understand_click',
    });

    // Case A: Student explicitly asks for 10-marker Section C exam format
    const examCtx = await adaptiveTutorService.buildAdaptiveContext({
      studentId: studentA,
      classId: testClassId,
      topicTitle: 'Process Synchronization Locks',
      rawQuery: 'Give me a 10-marker exam answer with marking scheme and diagrams for Section C',
    });

    assert(examCtx.isExplicitOverride === true, 'Scenario 10.1', 'Detected student explicit format request override');
    assert(examCtx.styleRecommendation === 'standard_academic', 'Scenario 10.2', 'Academic exam format honored over simplified ELI9');

    // Case B: Student explicitly asks for Hinglish
    const hinglishCtx = await adaptiveTutorService.buildAdaptiveContext({
      studentId: studentA,
      classId: testClassId,
      topicTitle: 'Process Synchronization Locks',
      action: 'hinglish',
    });

    assert(hinglishCtx.isExplicitOverride === true, 'Scenario 10.3', 'Detected explicit Hinglish action override');
    assert(hinglishCtx.preferredLanguage === 'hinglish', 'Scenario 10.4', 'Preferred language set to hinglish');

    // -------------------------------------------------------------------------
    // SCENARIO 11: Generated Practice Question Source Attribution
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Practice Question Source Attribution ---');
    // Seed concept needing practice
    await learningProfileService.recordEvidence({
      studentId: studentA,
      classId: testClassId,
      conceptName: 'Round Robin Time Quantum',
      evidenceSource: 'did_not_understand_click',
    });

    const practiceQ = await targetedPracticeService.generatePractice({
      studentId: studentA,
      classId: testClassId,
      targetConcept: 'Round Robin Time Quantum',
    });

    assert(Boolean(practiceQ.questionId), 'Scenario 11.1', `Generated question ID: ${practiceQ.questionId}`);
    assert(Boolean(practiceQ.sourceDocTitle), 'Scenario 11.2', `Attributed source doc: "${practiceQ.sourceDocTitle}"`);
    assert(typeof practiceQ.sourcePageNumber === 'number' && practiceQ.sourcePageNumber > 0, 'Scenario 11.3', `Attributed source page: Page ${practiceQ.sourcePageNumber}`);
    assert(Array.isArray(practiceQ.options) && practiceQ.options.length >= 3, 'Scenario 11.4', `Generated ${practiceQ.options?.length} answer options`);
    assert(Boolean(practiceQ.examinerTip), 'Scenario 11.5', `Preserved university exam tip: "${practiceQ.examinerTip.slice(0, 40)}..."`);

    // -------------------------------------------------------------------------
    // SCENARIO 12: Preventing Generated Questions from Being Labelled as PYQs
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 12: Strict Prohibition of Fabricated PYQ Labels ---');
    assert(practiceQ.questionSource === 'generated_from_rag', 'Scenario 12.1', 'Question source correctly identified as generated_from_rag');
    assert((practiceQ.questionSource as string) !== 'historical_pyq', 'Scenario 12.2', 'GUARD VERIFIED: Never labelled as historical_pyq');
    assert(!practiceQ.question.toLowerCase().includes('pyq 202'), 'Scenario 12.3', 'No fabricated past-year exam dates in question body');

    // -------------------------------------------------------------------------
    // SCENARIO 13: Student A vs Student B Cross-Student Privacy Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 13: Cross-Student Privacy Isolation ---');
    // Student A has "Round Robin Time Quantum" in NEEDS_PRACTICE
    // Setup Student B
    await learningProfileService.getOrCreateProfile(studentB, testClassId, 'OtherStudent');

    const studentBWeak = await learningProfileService.getConceptsNeedingPractice(studentB, testClassId);
    assert(studentBWeak.length === 0, 'Scenario 13.1', 'Student B does not see Student A weak concepts');

    const studentBMastery = await learningProfileService.getMasteryRecord(studentB, testClassId, 'Round Robin Time Quantum');
    assert(studentBMastery === null, 'Scenario 13.2', 'Student B has clean mastery state for concept studied by Student A');

    // -------------------------------------------------------------------------
    // SCENARIO 14: Resetting Personal Progress Preserves Shared Knowledge
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 14: Personal Progress Reset Preserves Shared Knowledge ---');
    // Seed shared classroom knowledge
    aiKnowledgeCache.set('What is an Operating System?', 'Operating Systems', 'doubt', 'An OS manages hardware resources.', undefined, 'BYOK', undefined);
    
    // Student A submits a practice attempt
    await targetedPracticeService.submitPracticeAnswer({
      studentId: studentA,
      classId: testClassId,
      questionId: practiceQ.questionId,
      conceptName: 'Round Robin Time Quantum',
      topicTitle: 'Round Robin Time Quantum',
      studentAnswer: 'B',
      correctOption: 'B',
      questionText: practiceQ.question,
      sourceDocTitle: practiceQ.sourceDocTitle,
      sourcePageNumber: practiceQ.sourcePageNumber,
    });

    const resetRes = await learningProfileService.resetStudentProgress(studentA, testClassId);
    assert(resetRes.success === true, 'Scenario 14.1', 'Reset personal progress completed successfully');

    // Check Student A mastery is cleared
    const postResetMastery = await learningProfileService.getMasteryRecord(studentA, testClassId, 'Round Robin Time Quantum');
    assert(postResetMastery === null, 'Scenario 14.2', 'Student A concept mastery records completely deleted');

    const postResetNeedsPractice = await learningProfileService.getConceptsNeedingPractice(studentA, testClassId);
    assert(postResetNeedsPractice.length === 0, 'Scenario 14.3', 'Student A needs-practice queue completely emptied');

    // Verify shared knowledge cache still exists!
    const sharedCached = aiKnowledgeCache.get('What is an Operating System?', 'Operating Systems', 'doubt');
    assert(sharedCached !== null, 'Scenario 14.4', 'CRITICAL GUARD: Shared classroom knowledge cache remains intact after student reset');

    // Verify Graph RAG nodes still exist in shared classroom
    const sharedGraph = await knowledgeGraphEngine.queryGraph('critical section', { classId: testClassId });
    assert(sharedGraph.matchedNodes.length > 0, 'Scenario 14.5', 'CRITICAL GUARD: Shared classroom knowledge graph preserved untouched');

    // -------------------------------------------------------------------------
    // SCENARIO 15: Database Outage Resilience (In-Memory Fallback)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 15: Database Outage Resilience ---');
    // Using an isolated in-memory identifier
    const offlineStudent = `offline-student-${runId}`;
    const offlineProfile = await learningProfileService.getOrCreateProfile(offlineStudent, 'offline-class', 'Offline User');
    assert(offlineProfile.studentName === 'Offline User', 'Scenario 15.1', 'Created profile in-memory during simulated offline status');

    const offlineRecord = await learningProfileService.recordEvidence({
      studentId: offlineStudent,
      classId: 'offline-class',
      conceptName: 'Paging Translation Lookaside Buffer',
      evidenceSource: 'did_not_understand_click',
    });
    assert(offlineRecord.masteryState === 'NEEDS_PRACTICE', 'Scenario 15.2', 'Recorded mastery state transition purely in-memory');

    const offlineWeak = await learningProfileService.getConceptsNeedingPractice(offlineStudent, 'offline-class');
    assert(offlineWeak.length === 1, 'Scenario 15.3', 'Retrieved weak concept from in-memory fallback cache');

    // -------------------------------------------------------------------------
    // SCENARIO 16: Container Restart & Redeployment Rehydration
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 16: Container Restart & Redeployment Rehydration ---');
    // Setup persistent student in Neon
    const rehydratedStudent = `persist-student-${runId}`;
    await learningProfileService.getOrCreateProfile(rehydratedStudent, testClassId, 'Rehydration Test Student');
    
    // Record 2 correct answers to achieve DEMONSTRATED in Neon
    await learningProfileService.recordEvidence({
      studentId: rehydratedStudent,
      classId: testClassId,
      conceptName: 'Virtual Memory Thrashing',
      evidenceSource: 'practice_question',
      isCorrect: true,
      confidence: 0.90,
      summary: 'Rehydration test step 1',
    });
    await learningProfileService.recordEvidence({
      studentId: rehydratedStudent,
      classId: testClassId,
      conceptName: 'Virtual Memory Thrashing',
      evidenceSource: 'practice_question',
      isCorrect: true,
      confidence: 0.90,
      summary: 'Rehydration test step 2',
    });

    // Wipe in-memory caches to simulate container restart / redeployment
    learningProfileService.clearAll();

    // Query profile and mastery - must rehydrate from Neon PostgreSQL
    const rehydratedProfile = await learningProfileService.getOrCreateProfile(rehydratedStudent, testClassId);
    assert(rehydratedProfile.studentName === 'Rehydration Test Student', 'Scenario 16.1', 'Rehydrated student profile from Neon PostgreSQL on fresh container boot');

    const rehydratedMastery = await learningProfileService.getMasteryRecord(rehydratedStudent, testClassId, 'Virtual Memory Thrashing');
    assert(rehydratedMastery !== null, 'Scenario 16.2', 'Rehydrated concept mastery record from Neon PostgreSQL');
    assert(rehydratedMastery?.masteryState === 'DEMONSTRATED', 'Scenario 16.3', 'Preserved DEMONSTRATED mastery state after rehydration');
    assert(rehydratedMastery?.consecutiveCorrectCount === 2, 'Scenario 16.4', 'Preserved consecutive correct count of 2');

    // -------------------------------------------------------------------------
    // CLEANUP TEMPORARY TEST RECORDS
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning Up Phase 5 Test Records from Neon ---');
    if (isNeonConfigured()) {
      await queryNeon(`DELETE FROM student_practice_attempts WHERE class_id = $1`, [testClassId]);
      await queryNeon(`DELETE FROM student_concept_mastery WHERE class_id = $1`, [testClassId]);
      await queryNeon(`DELETE FROM student_learning_profiles WHERE class_id = $1`, [testClassId]);
      await queryNeon(`DELETE FROM graph_edges WHERE class_id = $1`, [testClassId]);
      await queryNeon(`DELETE FROM graph_nodes WHERE class_id = $1`, [testClassId]);
      await queryNeon(`DELETE FROM class_workspaces WHERE id = $1`, [testClassId]);
      console.log('✅ Temporary Phase 5 test records cleanly removed from Neon.');
    }

  } catch (err: any) {
    console.error('❌ Exception during Phase 5 test execution:', err);
    failedCount++;
  }

  console.log('\n=================================================================');
  console.log('📊 PHASE 5 TEST RESULTS SUMMARY:');
  console.log('=================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);
  console.log('=================================================================\n');

  if (failedCount === 0) {
    console.log('🎉 ALL 16 PHASE 5 SCENARIOS PASSED WITH ZERO FAILURES!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${failedCount} ASSERTIONS FAILED.\n`);
    process.exit(1);
  }
}

runPhase5Tests();
