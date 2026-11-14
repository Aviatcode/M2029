import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import { normalizeConceptCanonicalName } from '../rag/graphTypes.js';
import {
  MasteryState,
  EvidenceSource,
  MasteryTransition,
  ConceptMasteryRecord,
  StudentLearningProfile,
  PracticeAttempt,
} from './learningProfileTypes.js';

export class LearningProfileService {
  private inMemoryProfiles: Map<string, StudentLearningProfile> = new Map();
  private inMemoryMastery: Map<string, ConceptMasteryRecord> = new Map();
  private inMemoryAttempts: Map<string, PracticeAttempt[]> = new Map();

  private getProfileKey(studentId: string, classId: string): string {
    return `${studentId}::${classId}`;
  }

  private getMasteryKey(studentId: string, classId: string, canonicalConcept: string): string {
    return `${studentId}::${classId}::${canonicalConcept}`;
  }

  /**
   * Retrieves or initializes an individual persistent learning profile
   */
  public async getOrCreateProfile(
    studentId: string,
    classId: string,
    studentName: string = 'Student'
  ): Promise<StudentLearningProfile> {
    const key = this.getProfileKey(studentId, classId);

    // Check in-memory cache
    if (this.inMemoryProfiles.has(key)) {
      return this.inMemoryProfiles.get(key)!;
    }

    if (isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT * FROM student_learning_profiles WHERE student_id = $1 AND class_id = $2`,
          [studentId, classId]
        );

        if (rows.length > 0) {
          const r = rows[0];
          const profile: StudentLearningProfile = {
            id: r.id,
            studentId: r.student_id,
            studentName: r.student_name,
            classId: r.class_id,
            enrolledCourse: r.enrolled_course,
            currentSubjectId: r.current_subject_id,
            currentUnitNumber: Number(r.current_unit_number) || 1,
            currentTopicId: r.current_topic_id,
            currentTopicTitle: r.current_topic_title,
            preferredLanguage: r.preferred_language || 'english',
            learningGoals: typeof r.learning_goals === 'string' ? JSON.parse(r.learning_goals) : (r.learning_goals || []),
            completedTopics: typeof r.completed_topics === 'string' ? JSON.parse(r.completed_topics) : (r.completed_topics || []),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
          this.inMemoryProfiles.set(key, profile);
          return profile;
        }
      } catch (err: any) {
        console.warn('[Learning Profile] DB query notice:', err?.message || err);
      }
    }

    // Create fresh initial profile
    const profileId = `prof-${studentId.replace(/[^\w-]/g, '')}-${classId.slice(0, 8)}`;
    const newProfile: StudentLearningProfile = {
      id: profileId,
      studentId,
      studentName,
      classId,
      enrolledCourse: 'BCA',
      currentUnitNumber: 1,
      preferredLanguage: 'english',
      learningGoals: [],
      completedTopics: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `INSERT INTO student_learning_profiles (
            id, student_id, student_name, class_id, enrolled_course,
            current_unit_number, preferred_language, learning_goals, completed_topics
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (student_id, class_id) DO NOTHING`,
          [
            newProfile.id,
            newProfile.studentId,
            newProfile.studentName,
            newProfile.classId,
            newProfile.enrolledCourse,
            newProfile.currentUnitNumber,
            newProfile.preferredLanguage,
            JSON.stringify(newProfile.learningGoals),
            JSON.stringify(newProfile.completedTopics),
          ]
        );
      } catch (err: any) {
        console.warn('[Learning Profile] DB insert notice:', err?.message || err);
      }
    }

    this.inMemoryProfiles.set(key, newProfile);
    return newProfile;
  }

  /**
   * Updates student learning profile attributes
   */
  public async updateProfile(
    studentId: string,
    classId: string,
    updates: Partial<StudentLearningProfile>
  ): Promise<StudentLearningProfile> {
    const profile = await this.getOrCreateProfile(studentId, classId);
    const updated: StudentLearningProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const key = this.getProfileKey(studentId, classId);
    this.inMemoryProfiles.set(key, updated);

    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `UPDATE student_learning_profiles SET
            student_name = COALESCE($1, student_name),
            enrolled_course = COALESCE($2, enrolled_course),
            current_subject_id = COALESCE($3, current_subject_id),
            current_unit_number = COALESCE($4, current_unit_number),
            current_topic_id = COALESCE($5, current_topic_id),
            current_topic_title = COALESCE($6, current_topic_title),
            preferred_language = COALESCE($7, preferred_language),
            learning_goals = COALESCE($8::jsonb, learning_goals),
            completed_topics = COALESCE($9::jsonb, completed_topics),
            updated_at = NOW()
          WHERE student_id = $10 AND class_id = $11`,
          [
            updates.studentName,
            updates.enrolledCourse,
            updates.currentSubjectId,
            updates.currentUnitNumber,
            updates.currentTopicId,
            updates.currentTopicTitle,
            updates.preferredLanguage,
            updates.learningGoals ? JSON.stringify(updates.learningGoals) : null,
            updates.completedTopics ? JSON.stringify(updates.completedTopics) : null,
            studentId,
            classId,
          ]
        );
      } catch (err: any) {
        console.warn('[Learning Profile] DB update notice:', err?.message || err);
      }
    }

    return updated;
  }

  /**
   * Transparent Knowledge Mastery State Machine
   * Evidence-based transitions:
   * - Ask for explanation: NOT_STARTED -> INTRODUCED / LEARNING
   * - Did Not Understand / confusion: -> NEEDS_PRACTICE
   * - Correct answer once: -> DEVELOPING (never DEMONSTRATED from a single answer)
   * - Consecutive correct answers >= 2: -> DEMONSTRATED
   * - Repeated incorrect answers: -> NEEDS_PRACTICE
   */
  public async recordEvidence(params: {
    studentId: string;
    classId: string;
    subjectId?: string;
    conceptName: string;
    evidenceSource: EvidenceSource;
    isCorrect?: boolean;
    confidence?: number;
    summary?: string;
  }): Promise<ConceptMasteryRecord> {
    const {
      studentId,
      classId,
      subjectId,
      conceptName,
      evidenceSource,
      isCorrect,
      confidence = 0.85,
      summary,
    } = params;

    const canonical = normalizeConceptCanonicalName(conceptName);
    const existing = await this.getMasteryRecord(studentId, classId, canonical);
    const fromState: MasteryState = existing ? existing.masteryState : 'NOT_STARTED';
    let toState: MasteryState = fromState;

    let consecutive = existing ? existing.consecutiveCorrectCount : 0;
    let attempts = existing ? existing.totalAttempts : 0;
    let correct = existing ? existing.totalCorrect : 0;

    if (evidenceSource === 'did_not_understand_click') {
      toState = 'NEEDS_PRACTICE';
      consecutive = 0;
    } else if (evidenceSource === 'ai_tutor_explanation') {
      if (fromState === 'NOT_STARTED') {
        toState = 'INTRODUCED';
      } else if (fromState === 'INTRODUCED') {
        toState = 'LEARNING';
      }
      // Never demote or alter already DEVELOPING/DEMONSTRATED simply because an explanation was viewed
    } else if (evidenceSource === 'practice_question' || evidenceSource === 'quiz_evaluation') {
      attempts++;
      if (isCorrect === true) {
        correct++;
        consecutive++;
        if (consecutive === 1) {
          // Rule: Single correct answer transitions to DEVELOPING, never DEMONSTRATED
          toState = fromState === 'DEMONSTRATED' ? 'DEMONSTRATED' : 'DEVELOPING';
        } else if (consecutive >= 2) {
          // Consistent correctness across multiple questions validates mastery
          toState = 'DEMONSTRATED';
        }
      } else if (isCorrect === false) {
        consecutive = 0;
        toState = 'NEEDS_PRACTICE';
      }
    } else if (evidenceSource === 'topic_marked_completed') {
      if (fromState === 'NOT_STARTED' || fromState === 'INTRODUCED') {
        toState = 'DEVELOPING';
      }
    }

    const transition: MasteryTransition = {
      fromState,
      toState,
      evidenceSource,
      confidence,
      timestamp: new Date().toISOString(),
      notes: summary || `Transition from ${fromState} to ${toState} via ${evidenceSource}`,
    };

    const history: MasteryTransition[] = existing ? [...existing.history, transition] : [transition];
    const recordId = `mst-${studentId.replace(/[^\w-]/g, '')}-${canonical.replace(/\s+/g, '-').slice(0, 30)}`;

    const updatedRecord: ConceptMasteryRecord = {
      id: recordId,
      studentId,
      classId,
      subjectId,
      conceptName,
      canonicalConcept: canonical,
      masteryState: toState,
      consecutiveCorrectCount: consecutive,
      totalAttempts: attempts,
      totalCorrect: correct,
      lastEvidenceSource: evidenceSource,
      lastEvidenceConfidence: confidence,
      lastEvidenceSummary: summary || transition.notes,
      history,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const key = this.getMasteryKey(studentId, classId, canonical);
    this.inMemoryMastery.set(key, updatedRecord);

    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `INSERT INTO student_concept_mastery (
            id, student_id, class_id, subject_id, concept_name, canonical_concept,
            mastery_state, consecutive_correct_count, total_attempts, total_correct,
            last_evidence_source, last_evidence_confidence, last_evidence_summary,
            history, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (student_id, class_id, canonical_concept) DO UPDATE SET
            mastery_state = EXCLUDED.mastery_state,
            consecutive_correct_count = EXCLUDED.consecutive_correct_count,
            total_attempts = EXCLUDED.total_attempts,
            total_correct = EXCLUDED.total_correct,
            last_evidence_source = EXCLUDED.last_evidence_source,
            last_evidence_confidence = EXCLUDED.last_evidence_confidence,
            last_evidence_summary = EXCLUDED.last_evidence_summary,
            history = EXCLUDED.history,
            updated_at = NOW()`,
          [
            updatedRecord.id,
            updatedRecord.studentId,
            updatedRecord.classId,
            updatedRecord.subjectId || null,
            updatedRecord.conceptName,
            updatedRecord.canonicalConcept,
            updatedRecord.masteryState,
            updatedRecord.consecutiveCorrectCount,
            updatedRecord.totalAttempts,
            updatedRecord.totalCorrect,
            updatedRecord.lastEvidenceSource,
            updatedRecord.lastEvidenceConfidence,
            updatedRecord.lastEvidenceSummary || null,
            JSON.stringify(updatedRecord.history),
          ]
        );
      } catch (err: any) {
        console.warn('[Learning Profile] Mastery DB save notice:', err?.message || err);
      }
    }

    return updatedRecord;
  }

  /**
   * Retrieves mastery state for a specific concept
   */
  public async getMasteryRecord(
    studentId: string,
    classId: string,
    rawConcept: string
  ): Promise<ConceptMasteryRecord | null> {
    const canonical = normalizeConceptCanonicalName(rawConcept);
    const key = this.getMasteryKey(studentId, classId, canonical);

    if (this.inMemoryMastery.has(key)) {
      return this.inMemoryMastery.get(key)!;
    }

    if (isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT * FROM student_concept_mastery 
           WHERE student_id = $1 AND class_id = $2 AND canonical_concept = $3`,
          [studentId, classId, canonical]
        );

        if (rows.length > 0) {
          const r = rows[0];
          const record: ConceptMasteryRecord = {
            id: r.id,
            studentId: r.student_id,
            classId: r.class_id,
            subjectId: r.subject_id,
            conceptName: r.concept_name,
            canonicalConcept: r.canonical_concept,
            masteryState: r.mastery_state as MasteryState,
            consecutiveCorrectCount: Number(r.consecutive_correct_count) || 0,
            totalAttempts: Number(r.total_attempts) || 0,
            totalCorrect: Number(r.total_correct) || 0,
            lastEvidenceSource: r.last_evidence_source as EvidenceSource,
            lastEvidenceConfidence: Number(r.last_evidence_confidence) || 0.85,
            lastEvidenceSummary: r.last_evidence_summary,
            history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
          this.inMemoryMastery.set(key, record);
          return record;
        }
      } catch (err: any) {
        console.warn('[Learning Profile] Mastery lookup notice:', err?.message || err);
      }
    }

    return null;
  }

  /**
   * Retrieves all concepts where student requires targeted remediation / practice
   */
  public async getConceptsNeedingPractice(
    studentId: string,
    classId: string,
    subjectId?: string
  ): Promise<ConceptMasteryRecord[]> {
    const inMem = Array.from(this.inMemoryMastery.values()).filter(
      (m) =>
        m.studentId === studentId &&
        m.classId === classId &&
        m.masteryState === 'NEEDS_PRACTICE' &&
        (!subjectId || m.subjectId === subjectId)
    );

    if (inMem.length > 0) {
      return inMem;
    }

    if (isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT * FROM student_concept_mastery 
           WHERE student_id = $1 AND class_id = $2 AND mastery_state = 'NEEDS_PRACTICE'
           ${subjectId ? 'AND (subject_id = $3 OR subject_id IS NULL)' : ''}
           ORDER BY updated_at DESC LIMIT 50`,
          subjectId ? [studentId, classId, subjectId] : [studentId, classId]
        );

        if (rows.length > 0) {
          const list: ConceptMasteryRecord[] = rows.map((r) => ({
            id: r.id,
            studentId: r.student_id,
            classId: r.class_id,
            subjectId: r.subject_id,
            conceptName: r.concept_name,
            canonicalConcept: r.canonical_concept,
            masteryState: r.mastery_state as MasteryState,
            consecutiveCorrectCount: Number(r.consecutive_correct_count) || 0,
            totalAttempts: Number(r.total_attempts) || 0,
            totalCorrect: Number(r.total_correct) || 0,
            lastEvidenceSource: r.last_evidence_source as EvidenceSource,
            lastEvidenceConfidence: Number(r.last_evidence_confidence) || 0.85,
            lastEvidenceSummary: r.last_evidence_summary,
            history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));

          list.forEach((item) => {
            const key = this.getMasteryKey(item.studentId, item.classId, item.canonicalConcept);
            this.inMemoryMastery.set(key, item);
          });
          return list;
        }
      } catch (err: any) {
        console.warn('[Learning Profile] Needs practice lookup notice:', err?.message || err);
      }
    }

    return inMem;
  }

  /**
   * Retrieves all concept mastery records for a student within a class
   */
  public async getAllMasteryForStudent(studentId: string, classId: string): Promise<ConceptMasteryRecord[]> {
    const inMem: ConceptMasteryRecord[] = [];
    for (const record of this.inMemoryMastery.values()) {
      if (record.studentId === studentId && record.classId === classId) {
        inMem.push(record);
      }
    }

    if (isNeonConfigured()) {
      try {
        const rows = await queryNeon<any>(
          `SELECT * FROM student_concept_mastery WHERE student_id = $1 AND class_id = $2`,
          [studentId, classId]
        );
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            studentId: r.student_id,
            classId: r.class_id,
            subjectId: r.subject_id,
            conceptName: r.concept_name,
            canonicalConcept: r.canonical_concept,
            masteryState: r.mastery_state as MasteryState,
            consecutiveCorrectCount: Number(r.consecutive_correct_count) || 0,
            totalAttempts: Number(r.total_attempts) || 0,
            totalCorrect: Number(r.total_correct) || 0,
            lastEvidenceSource: r.last_evidence_source as EvidenceSource,
            lastEvidenceConfidence: Number(r.last_evidence_confidence) || 0.85,
            lastEvidenceSummary: r.last_evidence_summary,
            history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }
      } catch (err: any) {
        console.warn('[Learning Profile] All mastery lookup notice:', err?.message || err);
      }
    }

    return inMem;
  }

  /**
   * Records an individual practice question attempt
   */
  public async recordPracticeAttempt(attempt: Omit<PracticeAttempt, 'id' | 'createdAt'>): Promise<PracticeAttempt> {
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rawAttempt = attempt as any;
    const conceptName = attempt.conceptName || rawAttempt.conceptTitle || 'General Practice';
    const topicTitle = attempt.topicTitle || conceptName;
    const isCorrect = attempt.isCorrect !== undefined ? Boolean(attempt.isCorrect) : Boolean(rawAttempt.passed);
    const questionText = attempt.questionText || 'Practice Question';
    const questionSource = attempt.questionSource || 'self_practice';
    const studentAnswer = attempt.studentAnswer || '';
    const feedback = attempt.feedback || '';
    const score = attempt.score !== undefined ? attempt.score : (isCorrect ? 10 : 0);

    const fullAttempt: PracticeAttempt = {
      ...attempt,
      conceptName,
      topicTitle,
      isCorrect,
      questionText,
      questionSource,
      studentAnswer,
      feedback,
      score,
      id,
      createdAt: new Date().toISOString(),
    };

    const key = this.getProfileKey(attempt.studentId, attempt.classId);
    if (!this.inMemoryAttempts.has(key)) {
      this.inMemoryAttempts.set(key, []);
    }
    this.inMemoryAttempts.get(key)!.unshift(fullAttempt);

    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `INSERT INTO student_practice_attempts (
            id, student_id, class_id, subject_id, topic_title, concept_name,
            question_text, question_source, source_doc_title, source_page_number,
            student_answer, is_correct, score, feedback, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
          [
            fullAttempt.id,
            fullAttempt.studentId,
            fullAttempt.classId,
            fullAttempt.subjectId || null,
            fullAttempt.topicTitle,
            fullAttempt.conceptName,
            fullAttempt.questionText,
            fullAttempt.questionSource,
            fullAttempt.sourceDocTitle || null,
            fullAttempt.sourcePageNumber || null,
            fullAttempt.studentAnswer,
            fullAttempt.isCorrect,
            fullAttempt.score,
            fullAttempt.feedback,
          ]
        );
      } catch (err: any) {
        console.warn('[Learning Profile] Practice attempt DB notice:', err?.message || err);
      }
    }

    // Update concept mastery state machine
    await this.recordEvidence({
      studentId: fullAttempt.studentId,
      classId: fullAttempt.classId,
      subjectId: fullAttempt.subjectId,
      conceptName: fullAttempt.conceptName,
      evidenceSource: 'practice_question',
      isCorrect: fullAttempt.isCorrect,
      confidence: 0.90,
      summary: `Practice question answered ${fullAttempt.isCorrect ? 'correctly' : 'incorrectly'}: score ${fullAttempt.score}/10`,
    });

    return fullAttempt;
  }

  /**
   * Resets student's private learning progress without touching shared classroom knowledge
   */
  public async resetStudentProgress(
    studentId: string,
    classId: string
  ): Promise<{ success: boolean; clearedMasteryCount: number; message: string }> {
    let clearedMasteryCount = 0;

    // 1. Clear in-memory caches for this student
    const profKey = this.getProfileKey(studentId, classId);
    this.inMemoryAttempts.delete(profKey);

    const keysToDelete: string[] = [];
    for (const [k, v] of this.inMemoryMastery.entries()) {
      if (v.studentId === studentId && v.classId === classId) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach((k) => this.inMemoryMastery.delete(k));
    clearedMasteryCount = keysToDelete.length;

    // Reset completed topics in memory profile
    if (this.inMemoryProfiles.has(profKey)) {
      const p = this.inMemoryProfiles.get(profKey)!;
      p.completedTopics = [];
      p.learningGoals = [];
    }

    // 2. Clear Neon PostgreSQL records
    if (isNeonConfigured()) {
      try {
        const res = await queryNeon<any>(
          `DELETE FROM student_concept_mastery WHERE student_id = $1 AND class_id = $2`,
          [studentId, classId]
        );
        await queryNeon(
          `DELETE FROM student_practice_attempts WHERE student_id = $1 AND class_id = $2`,
          [studentId, classId]
        );
        await queryNeon(
          `UPDATE student_learning_profiles SET completed_topics = '[]'::jsonb, learning_goals = '[]'::jsonb, updated_at = NOW() 
           WHERE student_id = $1 AND class_id = $2`,
          [studentId, classId]
        );
        clearedMasteryCount = Math.max(clearedMasteryCount, res.length || 0);
      } catch (err: any) {
        console.warn('[Learning Profile] DB reset notice:', err?.message || err);
      }
    }

    return {
      success: true,
      clearedMasteryCount,
      message: 'Student private learning history cleared. Shared classroom knowledge preserved untouched.',
    };
  }

  /**
   * In-memory test helper to reset local caches
   */
  public clearAll() {
    this.inMemoryProfiles.clear();
    this.inMemoryMastery.clear();
    this.inMemoryAttempts.clear();
  }
}

export const learningProfileService = new LearningProfileService();
