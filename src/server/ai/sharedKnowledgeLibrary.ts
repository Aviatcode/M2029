import fs from 'fs';
import path from 'path';
import { isNeonConfigured, getNeonSql } from '../db/neonClient.js';
import { evaluateQuestionMatch, extractQueryIntent, normalizeQueryTokens, MatchEvaluationResult } from './questionMatcher.js';

export type QualityStatus =
  | 'GENERATED'
  | 'NEEDS_REVIEW'
  | 'CORRECTION_PROPOSED'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'SUPERSEDED';

export interface AnswerSectionMap {
  simple?: string;
  eli9?: string;
  hinglish?: string;
  exam_10marker?: string;
  detailed?: string;
  socratic?: string;
  quickCheck?: any;
  gantt?: any;
  [key: string]: any;
}

export interface AnswerSourceRef {
  title: string;
  docId?: string;
  version?: number;
  fileName?: string;
  pageNumber?: number | string;
  snippet?: string;
  score?: number;
  url?: string;
}

export interface AnswerCorrectionRecord {
  id: string;
  answerId: string;
  suggestedBy: string; // e.g. "Student 12"
  sectionTargeted: string; // "definition", "diagram", "code", "analogy", "scoring", or "all"
  originalContent: string;
  proposedContent: string;
  reason: string;
  supportingEvidence?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AnswerVersionSnapshot {
  version: number;
  answer: string;
  sections?: AnswerSectionMap;
  qualityStatus: QualityStatus;
  modifiedBy: string;
  modifiedAt: string;
  changeSummary: string;
}

export interface LibraryAuditLog {
  id: string;
  action: 'CREATED' | 'CACHE_HIT' | 'CORRECTION_PROPOSED' | 'VERIFIED' | 'DISPUTED' | 'SUPERSEDED' | 'UPVOTED' | 'DOWNVOTED';
  actor: string;
  details: string;
  timestamp: string;
}

export interface SharedAcademicAnswer {
  id: string;
  classId: string; // e.g. "M2029"
  institution?: string;
  course: string; // e.g. "B.Tech CSE"
  subjectName: string; // e.g. "Operating Systems"
  topic: string; // e.g. "CPU Scheduling"
  originalQuestion: string;
  normalizedKey: string;
  intent: string;
  answer: string;
  sections: AnswerSectionMap;
  sourcesUsed: AnswerSourceRef[];
  modelUsed: string;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  version: number;
  qualityStatus: QualityStatus;
  hitCount: number;
  tokensSaved: number;
  positiveVotes: number;
  negativeVotes: number;
  contributorStudentLabel: string;
  parentQuestionId?: string;
  followUpQuestionIds?: string[];
  previousVersions: AnswerVersionSnapshot[];
  corrections: AnswerCorrectionRecord[];
  auditTrail: LibraryAuditLog[];
}

const LIBRARY_FILE = path.resolve(process.cwd(), 'curriculum-repo', '.shared_classroom_answers.json');

export class SharedClassroomKnowledgeLibrary {
  private answers: Map<string, SharedAcademicAnswer> = new Map();
  private totalHits = 0;
  private totalTokensSaved = 0;

  constructor() {
    this.ensureDirectory();
    this.loadFromDisk();
    this.ensureDbTables().catch(() => {});
  }

  private ensureDirectory() {
    const dir = path.dirname(LIBRARY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async ensureDbTables() {
    if (!isNeonConfigured()) return;
    try {
      const sql = getNeonSql();
      if (!sql) return;

      await sql`
        CREATE TABLE IF NOT EXISTS shared_classroom_answers (
          id TEXT PRIMARY KEY,
          class_id TEXT NOT NULL DEFAULT 'M2029',
          institution TEXT DEFAULT 'University',
          course TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          topic TEXT NOT NULL,
          original_question TEXT NOT NULL,
          normalized_key TEXT NOT NULL,
          intent TEXT NOT NULL,
          answer TEXT NOT NULL,
          sections JSONB DEFAULT '{}'::jsonb,
          sources_used JSONB DEFAULT '[]'::jsonb,
          model_used TEXT NOT NULL,
          prompt_version TEXT DEFAULT 'v2.0',
          version INTEGER NOT NULL DEFAULT 1,
          quality_status TEXT NOT NULL DEFAULT 'GENERATED',
          hit_count INTEGER NOT NULL DEFAULT 0,
          tokens_saved INTEGER NOT NULL DEFAULT 0,
          positive_votes INTEGER NOT NULL DEFAULT 0,
          negative_votes INTEGER NOT NULL DEFAULT 0,
          contributor_student_label TEXT DEFAULT 'Student 1',
          parent_question_id TEXT,
          follow_up_question_ids JSONB DEFAULT '[]'::jsonb,
          previous_versions JSONB DEFAULT '[]'::jsonb,
          corrections JSONB DEFAULT '[]'::jsonb,
          audit_trail JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
    } catch (err: any) {
      console.warn('[Shared Library] DB table verification notice:', err.message);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(LIBRARY_FILE)) {
        const raw = fs.readFileSync(LIBRARY_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.answers)) {
          for (const item of data.answers) {
            this.answers.set(item.id, item);
          }
          this.totalHits = data.totalHits || 0;
          this.totalTokensSaved = data.totalTokensSaved || 0;
        }
        console.log(`[Shared Library] Loaded ${this.answers.size} verified academic answers from persistent disk.`);
      }
    } catch (err: any) {
      console.warn('[Shared Library] Error loading disk file:', err.message);
    }
  }

  private saveToDisk() {
    try {
      this.ensureDirectory();
      const list = Array.from(this.answers.values());
      const payload = {
        totalAnswers: list.length,
        totalHits: this.totalHits,
        totalTokensSaved: this.totalTokensSaved,
        lastUpdated: new Date().toISOString(),
        answers: list,
      };
      fs.writeFileSync(LIBRARY_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err: any) {
      console.error('[Shared Library] Failed saving to disk:', err.message);
    }
  }

  /**
   * Search for a relevant, verified answer in the shared classroom library.
   * Scoped by classId to preserve academic isolation across distinct classrooms.
   */
  public findMatchingAnswer(
    query: string,
    options: {
      classId?: string;
      subjectName?: string;
      topic?: string;
      formatPreference?: 'simple' | 'eli9' | 'hinglish' | 'exam_10marker' | 'detailed';
    } = {}
  ): {
    found: boolean;
    answer?: SharedAcademicAnswer;
    adaptedContent?: string;
    matchResult?: MatchEvaluationResult;
    source: 'shared_library';
  } {
    const classId = options.classId || 'M2029';
    const queryTrim = query.trim();
    if (!queryTrim) return { found: false, source: 'shared_library' };

    let bestMatch: SharedAcademicAnswer | null = null;
    let bestEval: MatchEvaluationResult = {
      isMatch: false,
      confidence: 0,
      matchType: 'none',
      intentCompatible: false,
      reason: 'No candidate evaluated',
    };

    for (const item of this.answers.values()) {
      // Check authorization scope: Strict class isolation
      // A private class answer is accessible ONLY within the authorized class or if explicitly marked universal
      if (item.classId !== classId && item.classId !== 'universal') {
        continue;
      }

      // Quality Status Guard: Strictly reject DISPUTED or SUPERSEDED answers
      if (item.qualityStatus === 'DISPUTED' || item.qualityStatus === 'SUPERSEDED') {
        continue;
      }

      // Check subject match if specified
      if (options.subjectName && item.subjectName) {
        const subA = options.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const subB = item.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (subA.length > 3 && subB.length > 3 && !subA.includes(subB) && !subB.includes(subA)) {
          // Different subject entirely
          continue;
        }
      }

      const evalResult = evaluateQuestionMatch(queryTrim, item.originalQuestion, item.normalizedKey);
      if (evalResult.isMatch && evalResult.confidence > bestEval.confidence) {
        bestMatch = item;
        bestEval = evalResult;
      }
    }

    if (bestMatch && bestEval.isMatch) {
      // Increment hit statistics and tokens saved
      bestMatch.hitCount++;
      const savedTokens = Math.max(450, Math.round(bestMatch.answer.length / 3.8));
      bestMatch.tokensSaved += savedTokens;
      bestMatch.lastAccessedAt = new Date().toISOString();
      this.totalHits++;
      this.totalTokensSaved += savedTokens;

      // Audit log entry for collaborative reuse
      bestMatch.auditTrail.unshift({
        id: `audit-${Date.now()}`,
        action: 'CACHE_HIT',
        actor: 'Classmate',
        details: `Reused answer without LLM inference (${savedTokens} tokens saved). Match confidence: ${(bestEval.confidence * 100).toFixed(0)}%`,
        timestamp: new Date().toISOString(),
      });
      if (bestMatch.auditTrail.length > 30) bestMatch.auditTrail.pop();

      this.saveToDisk();

      // Adapt presentation format if requested (Hinglish, ELI9, 10-marker, etc.)
      let adaptedContent = bestMatch.answer;
      if (options.formatPreference && bestMatch.sections[options.formatPreference]) {
        adaptedContent = bestMatch.sections[options.formatPreference]!;
      } else {
        const queryIntent = extractQueryIntent(queryTrim);
        if (queryIntent.wantsHinglish && bestMatch.sections.hinglish) {
          adaptedContent = bestMatch.sections.hinglish;
        } else if (queryIntent.wantsEli9 && bestMatch.sections.eli9) {
          adaptedContent = bestMatch.sections.eli9;
        } else if (queryIntent.depth === 'exam_10marker' && bestMatch.sections.exam_10marker) {
          adaptedContent = bestMatch.sections.exam_10marker;
        }
      }

      return {
        found: true,
        answer: bestMatch,
        adaptedContent,
        matchResult: bestEval,
        source: 'shared_library',
      };
    }

    return {
      found: false,
      source: 'shared_library',
    };
  }

  /**
   * Stores a newly generated answer into the shared classroom library
   */
  public async storeAnswer(params: {
    classId?: string;
    course?: string;
    subjectName?: string;
    topic?: string;
    question?: string;
    query?: string;
    answer: string;
    sections?: AnswerSectionMap;
    citations?: any[];
    tags?: string[];
    contributor?: { id: string; name: string; role: string };
    sourcesUsed?: AnswerSourceRef[];
    modelUsed?: string;
    contributorStudentLabel?: string;
    parentQuestionId?: string;
    qualityStatus?: QualityStatus;
  }): Promise<SharedAcademicAnswer> {
    const effectiveQuestion = (params.question || params.query || '').trim();
    const {
      classId = 'M2029',
      course = 'B.Tech / BCA Computer Science',
      subjectName,
      topic,
      answer,
      sections = {},
      sourcesUsed = params.citations || [],
      modelUsed = 'gemini-1.5-flash',
      contributorStudentLabel = params.contributor?.name || 'Student 1',
      parentQuestionId,
      qualityStatus = 'GENERATED',
    } = params;

    const normalizedTokens = normalizeQueryTokens(effectiveQuestion);
    const normalizedKey = normalizedTokens.sort().join(' ');
    const intent = extractQueryIntent(effectiveQuestion).primary;
    const now = new Date().toISOString();
    const id = `ans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newAnswer: SharedAcademicAnswer = {
      id,
      classId,
      course,
      subjectName: subjectName || 'Computer Science',
      topic: topic || 'Academic Concept',
      originalQuestion: effectiveQuestion,
      normalizedKey,
      intent,
      answer: answer.trim(),
      sections: {
        definition: sections.definition || sections.simple || answer.slice(0, 300),
        simple: sections.simple || answer.slice(0, 500),
        eli9: sections.eli9,
        hinglish: sections.hinglish,
        exam_10marker: sections.exam_10marker,
        detailed: sections.detailed || answer,
        socratic: sections.socratic,
        quickCheck: sections.quickCheck,
        gantt: sections.gantt,
        ...sections,
      },
      sourcesUsed,
      modelUsed,
      promptVersion: 'v2.0',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      version: 1,
      qualityStatus,
      hitCount: 1,
      tokensSaved: 0,
      positiveVotes: 1,
      negativeVotes: 0,
      contributorStudentLabel,
      parentQuestionId,
      followUpQuestionIds: [],
      previousVersions: [],
      corrections: [],
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          action: 'CREATED',
          actor: contributorStudentLabel,
          details: `Initial academic answer created and shared with class ${classId} using ${modelUsed}.`,
          timestamp: now,
        },
      ],
    };

    // If follow-up, link to parent
    if (parentQuestionId && this.answers.has(parentQuestionId)) {
      const parent = this.answers.get(parentQuestionId)!;
      if (!parent.followUpQuestionIds) parent.followUpQuestionIds = [];
      parent.followUpQuestionIds.push(newAnswer.id);
    }

    this.answers.set(id, newAnswer);
    this.saveToDisk();

    // Asynchronously insert into Neon DB if available
    if (isNeonConfigured()) {
      try {
        const sql = getNeonSql();
        if (sql) {
          await sql`
            INSERT INTO shared_classroom_answers (
              id, class_id, course, subject_name, topic, original_question, normalized_key, intent, answer, sections, sources_used, model_used, prompt_version, version, quality_status, contributor_student_label, parent_question_id, created_at, updated_at, last_accessed_at
            ) VALUES (
              ${newAnswer.id}, ${classId}, ${course}, ${newAnswer.subjectName}, ${newAnswer.topic}, ${newAnswer.originalQuestion}, ${normalizedKey}, ${intent}, ${newAnswer.answer}, ${JSON.stringify(newAnswer.sections)}, ${JSON.stringify(sourcesUsed)}, ${modelUsed}, 'v2.0', 1, ${qualityStatus}, ${contributorStudentLabel}, ${parentQuestionId || null}, NOW(), NOW(), NOW()
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }
      } catch (dbErr: any) {
        console.warn('[Shared Library] DB insertion warning:', dbErr.message);
      }
    }

    console.log(`[Shared Library] Stored new academic answer for "${effectiveQuestion.slice(0, 45)}" (Class ${classId})`);
    return newAnswer;
  }

  /**
   * Returns all stored answers, optionally filtered by classId
   */
  public getAllAnswers(classId?: string): SharedAcademicAnswer[] {
    const list = Array.from(this.answers.values());
    if (!classId) return list;
    return list.filter((a) => a.classId === classId || a.classId === 'universal');
  }

  /**
   * Proposes a collaborative correction or improvement to an existing answer
   */
  public proposeCorrection(
    arg1: string | {
      answerId?: string;
      studentLabel?: string;
      sectionTargeted?: string;
      proposedContent?: string;
      reason?: string;
      supportingEvidence?: string;
      targetSection?: string;
      proposedText?: string;
      contributor?: { id?: string; name?: string; role?: string };
      citationDocId?: string;
      citationPage?: number;
    },
    arg2?: {
      studentLabel?: string;
      sectionTargeted?: string;
      proposedContent?: string;
      reason?: string;
      supportingEvidence?: string;
      targetSection?: string;
      proposedText?: string;
      contributor?: { id?: string; name?: string; role?: string };
      citationDocId?: string;
      citationPage?: number;
    }
  ): {
    success: boolean;
    answer?: SharedAcademicAnswer;
    correction?: AnswerCorrectionRecord;
    correctionId?: string;
    error?: string;
  } {
    let answerId: string;
    let params: any;

    if (typeof arg1 === 'string') {
      answerId = arg1;
      params = arg2 || {};
    } else {
      params = arg1 || {};
      answerId = params.answerId || '';
    }

    const studentLabel = params.studentLabel || params.contributor?.name || 'Student Contributor';
    const sectionTargeted = params.sectionTargeted || params.targetSection || 'all';
    const proposedContent = (params.proposedContent || params.proposedText || '').trim();
    const reason = (params.reason || '').trim();
    const supportingEvidence = (params.supportingEvidence || params.citationDocId ? `Doc: ${params.citationDocId || ''} Page: ${params.citationPage || ''}` : '').trim();

    const item = this.answers.get(answerId);
    if (!item) {
      return { success: false, error: 'Answer ID not found in shared library' };
    }

    const now = new Date().toISOString();
    const corrId = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const correction: AnswerCorrectionRecord = {
      id: corrId,
      answerId,
      suggestedBy: studentLabel,
      sectionTargeted,
      originalContent: (item.sections as any)[sectionTargeted] || item.answer,
      proposedContent,
      reason,
      supportingEvidence: supportingEvidence || undefined,
      status: 'pending',
      createdAt: now,
    };

    item.corrections.push(correction);
    item.qualityStatus = 'CORRECTION_PROPOSED';

    // Snapshot previous version before proposing correction
    const snapshot: AnswerVersionSnapshot = {
      version: item.version,
      answer: item.answer,
      sections: { ...item.sections },
      qualityStatus: item.qualityStatus,
      modifiedBy: item.contributorStudentLabel,
      modifiedAt: item.updatedAt,
      changeSummary: `Version ${item.version} snapshot: Student proposed correction on ${sectionTargeted}`,
    };
    item.previousVersions.unshift(snapshot);

    // Guard: Do NOT silently overwrite an existing verified master answer!
    // Stored as pending for peer review / faculty approval
    correction.status = 'pending';
    correction.reviewedBy = 'Pending Review';

    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: 'CORRECTION_PROPOSED',
      actor: studentLabel,
      details: `Student proposed correction for "${sectionTargeted}": ${reason} (Evidence: ${supportingEvidence || 'Course syllabus'}). Pending peer/faculty review.`,
      timestamp: now,
    });

    this.saveToDisk();
    return { success: true, answer: item, correction, correctionId: correction.id };
  }

  /**
   * Approves a pending correction after peer or faculty review
   */
  public approveCorrection(
    answerId: string,
    correctionId: string,
    reviewer: string = 'Faculty Reviewer'
  ): { success: boolean; answer?: SharedAcademicAnswer; error?: string } {
    const item = this.answers.get(answerId);
    if (!item) return { success: false, error: 'Answer not found' };

    const corr = item.corrections.find((c) => c.id === correctionId);
    if (!corr) return { success: false, error: 'Correction not found' };

    const now = new Date().toISOString();
    corr.status = 'approved';
    corr.reviewedBy = reviewer;
    corr.reviewedAt = now;

    // Apply the correction to update the current master answer
    item.version += 1;
    if (corr.sectionTargeted === 'all' || corr.sectionTargeted === 'general') {
      item.answer = corr.proposedContent;
    } else {
      (item.sections as any)[corr.sectionTargeted] = corr.proposedContent;
      if (corr.sectionTargeted === 'definition') {
        item.sections.simple = corr.proposedContent;
      }
    }
    item.updatedAt = now;
    item.qualityStatus = 'VERIFIED';

    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: 'VERIFIED',
      actor: reviewer,
      details: `Correction ${correctionId} approved by ${reviewer}. Master answer updated to v${item.version}.`,
      timestamp: now,
    });

    this.saveToDisk();
    return { success: true, answer: item };
  }

  /**
   * Retrieves an answer directly by its ID
   */
  public getAnswerById(answerId: string): SharedAcademicAnswer | undefined {
    return this.answers.get(answerId);
  }

  /**
   * Explicitly flags an answer as DISPUTED with an audit trail entry
   */
  public flagAnswerDisputed(answerId: string, reason: string): boolean {
    const item = this.answers.get(answerId);
    if (!item) return false;
    item.qualityStatus = 'DISPUTED';
    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: 'DISPUTED',
      actor: 'System / SharedAnswerController',
      details: reason,
      timestamp: new Date().toISOString(),
    });
    this.saveToDisk();
    return true;
  }

  /**
   * Registers a student vote (upvote or downvote) on a shared answer.
   * Student votes never automatically label an answer VERIFIED; verification requires
   * formal faculty review or ground-truth curriculum citation evidence.
   */
  public voteAnswer(
    answerId: string,
    vote: 'up' | 'down',
    studentLabel = 'Classmate',
    feedback?: string
  ): { success: boolean; answer?: SharedAcademicAnswer; newStatus?: QualityStatus } {
    const item = this.answers.get(answerId);
    if (!item) return { success: false };

    if (vote === 'up') {
      item.positiveVotes += 1;
      // Step 4 non-negotiable rule: Never label an answer VERIFIED simply because students upvoted or viewed it.
      // Upvotes track peer appreciation, but VERIFIED status strictly requires faculty review or textbook citation verification.
    } else {
      item.negativeVotes += 1;
      if (item.negativeVotes >= 3 && item.negativeVotes > item.positiveVotes) {
        item.qualityStatus = 'DISPUTED';
      } else if (item.negativeVotes >= 2) {
        item.qualityStatus = 'NEEDS_REVIEW';
      }
    }

    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: vote === 'up' ? 'UPVOTED' : 'DOWNVOTED',
      actor: studentLabel,
      details: `${vote === 'up' ? 'Upvoted' : 'Downvoted'} by ${studentLabel}${feedback ? `: "${feedback}"` : ''}`,
      timestamp: new Date().toISOString(),
    });

    this.saveToDisk();
    return { success: true, answer: item, newStatus: item.qualityStatus };
  }

  /**
   * Formally verifies an answer through faculty review or verified textbook citations
   */
  public verifyAnswer(
    answerId: string,
    verifier: string = 'Faculty / Course In-Charge',
    evidenceSummary?: string
  ): boolean {
    const item = this.answers.get(answerId);
    if (!item) return false;

    item.qualityStatus = 'VERIFIED';
    item.updatedAt = new Date().toISOString();
    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: 'VERIFIED',
      actor: verifier,
      details: `Academic verification confirmed by ${verifier}${evidenceSummary ? `: ${evidenceSummary}` : ''}.`,
      timestamp: new Date().toISOString(),
    });

    this.saveToDisk();
    return true;
  }

  /**
   * Watches for document version changes and flags dependent shared answers as NEEDS_REVIEW
   */
  public checkAndFlagOutdatedDocumentReferences(docId: string, newVersion: number): {
    flaggedAnswerIds: string[];
    count: number;
  } {
    const flaggedAnswerIds: string[] = [];

    for (const item of this.answers.values()) {
      if (!Array.isArray(item.sourcesUsed)) continue;

      const matchedSource = item.sourcesUsed.find(
        (src: any) =>
          src.docId === docId ||
          (src.fileName && docId.includes(src.fileName)) ||
          (src.title && docId.includes(src.title))
      );

      if (matchedSource) {
        const citedVersion = matchedSource.version || 1;
        if (citedVersion < newVersion) {
          const oldStatus = item.qualityStatus;
          item.qualityStatus = 'NEEDS_REVIEW';
          flaggedAnswerIds.push(item.id);

          item.auditTrail.unshift({
            id: `audit-${Date.now()}`,
            action: 'DISPUTED' as any,
            actor: 'System / DocumentValidityWatcher',
            details: `Cited document "${docId}" was updated to version ${newVersion} (answer was based on v${citedVersion}). Status changed from ${oldStatus} to NEEDS_REVIEW.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    if (flaggedAnswerIds.length > 0) {
      this.saveToDisk();
    }

    return { flaggedAnswerIds, count: flaggedAnswerIds.length };
  }

  /**
   * Marks an answer as SUPERSEDED when a newer approved version replaces it
   */
  public invalidateOrSupersedeAnswer(answerId: string, reason: string, newAnswerId?: string): boolean {
    const item = this.answers.get(answerId);
    if (!item) return false;

    item.qualityStatus = 'SUPERSEDED';
    item.updatedAt = new Date().toISOString();
    item.auditTrail.unshift({
      id: `audit-${Date.now()}`,
      action: 'SUPERSEDED',
      actor: 'System / QualityLifecycle',
      details: `${reason}${newAnswerId ? ` Replaced by answer ${newAnswerId}.` : ''}`,
      timestamp: new Date().toISOString(),
    });

    this.saveToDisk();
    return true;
  }

  /**
   * Returns aggregated analytics for the classroom knowledge library
   */
  public getLibraryAnalytics(classId = 'M2029') {
    const classAnswers = Array.from(this.answers.values()).filter(
      (a) => a.classId === classId || a.classId === 'universal'
    );

    const totalQuestions = classAnswers.length;
    let totalClassHits = 0;
    let totalTokensSaved = 0;
    let verifiedCount = 0;
    let correctionCount = 0;

    for (const a of classAnswers) {
      totalClassHits += a.hitCount;
      totalTokensSaved += a.tokensSaved;
      if (a.qualityStatus === 'VERIFIED') verifiedCount++;
      correctionCount += a.corrections.length;
    }

    const estimatedCostUsd = (totalTokensSaved / 1000000) * 0.35; // ~$0.35 per 1M tokens
    const estimatedCostInr = estimatedCostUsd * 87;

    return {
      classId,
      totalQuestions,
      totalClassHits,
      avoidedLlmCalls: Math.max(0, totalClassHits - totalQuestions),
      totalTokensSaved,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
      estimatedCostInr: Math.round(estimatedCostInr),
      verifiedCount,
      correctionCount,
      topAnswers: classAnswers
        .sort((a, b) => b.hitCount - a.hitCount)
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          question: a.originalQuestion,
          subject: a.subjectName,
          hits: a.hitCount,
          version: a.version,
          status: a.qualityStatus,
        })),
    };
  }
}

export const sharedKnowledgeLibrary = new SharedClassroomKnowledgeLibrary();
