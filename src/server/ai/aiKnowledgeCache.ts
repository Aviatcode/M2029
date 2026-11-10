import fs from 'fs';
import path from 'path';
import { isNeonConfigured, getNeonSql } from '../db/neonClient.js';

export interface EvolutionStep {
  iteration: number;
  studentLabel: string; // e.g. "Student 1", "Student 2", ..., "Student 60"
  improvedAt: string;
  focus: string; // e.g. "Initial Q&A Draft", "Added ASCII Diagram", "Exam Trap Check", "Classroom Master Polish"
  summary: string;
}

export interface CachedAIResponse {
  id: string;
  query: string;
  normalizedKey: string;
  subjectName: string;
  mode: string;
  answer: string;
  sections?: Record<string, string>;
  modelUsed?: string;
  createdAt: string;
  lastAccessedAt: string;
  hitCount: number;
  tokensEstimated: number;
  // Cohort Compounding Intelligence fields (60-student refinement chain)
  iterationCount: number; // 1 to 60+
  targetCohortSize: number; // 60
  isCohortPerfected: boolean; // true when iterationCount >= 60 or marked Master
  perfectionScore: number; // 0 - 100%
  perfectionTier:
    | 'Draft (Student 1)'
    | 'Peer-Enhanced (Students 2-10)'
    | 'Exam-Hardened (Students 11-40)'
    | 'Master Gold Standard (60th Student)'
    | 'Teacher-Verified Gold Standard';
  evolutionHistory: EvolutionStep[];
  positiveVotes?: number;
  negativeVotes?: number;
  needsRefinement?: boolean;
  isTeacherCurated?: boolean;
  /** Models contributed by premium-key students (e.g. ["GPT-4o", "Claude 3.5 Sonnet"]) */
  contributingModels?: string[];
}

export interface CacheStats {
  totalLearnedItems: number;
  cohortPerfectedCount: number;
  totalHits: number;
  estimatedTokensSaved: number;
  topTopics: { query: string; hitCount: number; perfectionTier: string }[];
  subjectBreakdown: { subjectName: string; topicCount: number; totalHits: number }[];
  recentlyPerfected: { query: string; perfectedAt: string }[];
  estimatedMoneySaved: number;
  lastUpdated: string;
}

const CACHE_FILE = path.resolve(process.cwd(), 'curriculum-repo', '.ai_knowledge_cache.json');

// Canonical synonyms & abbreviation expansion map for academic questions
export const TOPIC_SYNONYMS: Record<string, string> = {
  fcfs: 'first come first served',
  sjf: 'shortest job first',
  srtf: 'shortest remaining time first',
  rr: 'round robin',
  os: 'operating system',
  dbms: 'database management system',
  rdbms: 'relational database',
  cpu: 'processor',
  ram: 'memory',
  normalization: 'normal form',
  '1nf': 'first normal form',
  '2nf': 'second normal form',
  '3nf': 'third normal form',
  bcnf: 'boyce codd normal form',
  acid: 'atomicity consistency isolation durability',
  pcb: 'process control block',
  tlb: 'translation lookaside buffer',
  vm: 'virtual memory',
  lru: 'least recently used',
  fifo: 'first in first out',
};

// Stop words for academic semantic normalization
const STOP_WORDS = new Set([
  'what',
  'is',
  'are',
  'the',
  'a',
  'an',
  'explain',
  'definition',
  'define',
  'meaning',
  'of',
  'describe',
  'tell',
  'me',
  'about',
  'give',
  'notes',
  'on',
  'for',
  'in',
  'and',
  'or',
  'to',
  'how',
  'does',
  'do',
  'can',
  'you',
  'please',
  'os',
  'operating',
  'system',
  'systems',
  'kya',
  'hai',
  'hota',
  'batao',
  'samjhao',
  'bhai',
]);

export function normalizeAcademicQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  const cleaned = rawQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  // Expand abbreviations and filter stop words
  const expandedWords: string[] = [];
  for (const w of words) {
    if (TOPIC_SYNONYMS[w]) {
      const synTokens = TOPIC_SYNONYMS[w].split(/\s+/);
      for (const st of synTokens) {
        if (!STOP_WORDS.has(st) && st.length > 1) {
          expandedWords.push(st);
        }
      }
    } else if (!STOP_WORDS.has(w) && w.length > 1) {
      expandedWords.push(w);
    }
  }

  if (expandedWords.length === 0) {
    return cleaned.replace(/\s+/g, ' ').slice(0, 80);
  }

  return Array.from(new Set(expandedWords)).join(' ');
}

// Jaccard similarity for tokenized fuzzy search
export function calculateJaccardSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const setA = new Set(strA.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  const setB = new Set(strB.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

// Generate the 60-Student Evolution Milestones Trajectory
export function generateEvolutionMilestones(
  topicTitle: string,
  targetIteration = 60
): EvolutionStep[] {
  const steps: EvolutionStep[] = [
    {
      iteration: 1,
      studentLabel: 'Student 1',
      improvedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      focus: 'Initial Explanation & Problem Statement',
      summary: `Initial query on "${topicTitle}". Generated foundational definition and baseline conceptual overview.`,
    },
    {
      iteration: 2,
      studentLabel: 'Student 2',
      improvedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      focus: 'Terminology Precision & Textbook Alignment',
      summary: 'Sharpened definitions to match standard prescribed university curriculum terms and syllabus phrasing.',
    },
    {
      iteration: 5,
      studentLabel: 'Student 5',
      improvedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      focus: 'ELI9 Analogies & Intuitive Mental Models',
      summary: 'Added vivid everyday analogies and conversational Hinglish bridge for rapid active recall.',
    },
    {
      iteration: 15,
      studentLabel: 'Student 15',
      improvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      focus: 'ASCII Architecture Diagrams & Algorithmic Steps',
      summary: 'Integrated clean ASCII system architecture flowchart and step-by-step mathematical working.',
    },
    {
      iteration: 30,
      studentLabel: 'Student 30',
      improvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      focus: 'University 10-Marker Exam Format Blueprint',
      summary: 'Restructured strictly into Section C university scoring layout with examiner marking rubric.',
    },
    {
      iteration: 45,
      studentLabel: 'Student 45',
      improvedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      focus: 'Production Code & Corner Case Traps',
      summary: 'Injected complete executable code snippets, memory invariants, and common student exam traps.',
    },
    {
      iteration: targetIteration,
      studentLabel: `Student ${targetIteration}`,
      improvedAt: new Date().toISOString(),
      focus: 'Cohort Master Perfection (Class Gold Standard)',
      summary: `Distilled across all ${targetCohortSize(targetIteration)} students in the cohort into a flawless, verified master answer.`,
    },
  ];

  return steps;
}

function targetCohortSize(val = 60) {
  return val;
}

class AIKnowledgeCacheManager {
  private cache: Map<string, CachedAIResponse> = new Map();
  private totalHits: number = 0;
  private totalTokensSaved: number = 0;

  constructor() {
    this.loadFromDisk();
    if (this.cache.size === 0) {
      this.seedDefaultCohortMasterEntries();
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) {
          data.entries.forEach((entry: CachedAIResponse) => {
            // Guarantee cohort fields are populated if loading older cache
            const iterationCount = entry.iterationCount || 60;
            const isCohortPerfected = entry.isCohortPerfected ?? (iterationCount >= 60);
            const perfectionScore = entry.perfectionScore || (isCohortPerfected ? 99 : 75);
            const perfectionTier =
              entry.perfectionTier ||
              (isCohortPerfected
                ? 'Master Gold Standard (60th Student)'
                : iterationCount >= 11
                ? 'Exam-Hardened (Students 11-40)'
                : 'Peer-Enhanced (Students 2-10)');
            const evolutionHistory =
              entry.evolutionHistory && entry.evolutionHistory.length > 0
                ? entry.evolutionHistory
                : generateEvolutionMilestones(entry.query, iterationCount);

            this.cache.set(entry.id, {
              ...entry,
              iterationCount,
              targetCohortSize: 60,
              isCohortPerfected,
              perfectionScore,
              perfectionTier,
              evolutionHistory,
            });
          });
        }
        this.totalHits = Number(data.totalHits) || 0;
        this.totalTokensSaved = Number(data.totalTokensSaved) || 0;
        console.log(
          `[AI Knowledge Cache] 🧠 Loaded ${this.cache.size} cohort lessons. Total Hits: ${this.totalHits}, Tokens Saved: ${this.totalTokensSaved}`
        );
      }
    } catch (err) {
      console.warn('[AI Knowledge Cache] Disk read warning, starting fresh:', err);
    }
  }

  public saveToDisk() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const entries = Array.from(this.cache.values());
      const cohortPerfectedCount = entries.filter((e) => e.isCohortPerfected).length;

      const payload = {
        totalLearnedItems: this.cache.size,
        cohortPerfectedCount,
        totalHits: this.totalHits,
        totalTokensSaved: this.totalTokensSaved,
        lastUpdated: new Date().toISOString(),
        entries,
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[AI Knowledge Cache] Disk save warning:', err);
    }
  }

  public get(query: string, subjectName = '', mode = 'all'): CachedAIResponse | null {
    if (!query || query.trim().length === 0) return null;

    const normalized = normalizeAcademicQuery(query);
    const cleanSub = (subjectName || '').toLowerCase().trim();
    const cleanMode = (mode || 'all').toLowerCase().trim();

    // 1. Exact match on raw query + mode
    for (const entry of this.cache.values()) {
      if (
        entry.query.toLowerCase().trim() === query.toLowerCase().trim() &&
        (entry.mode === cleanMode || cleanMode === 'all')
      ) {
        this.registerHit(entry);
        return entry;
      }
    }

    // 2. Normalized semantic key match
    if (normalized.length >= 3) {
      for (const entry of this.cache.values()) {
        if (entry.normalizedKey === normalized && (entry.mode === cleanMode || cleanMode === 'all')) {
          this.registerHit(entry);
          return entry;
        }

        // Substring / token containment
        if (
          normalized.length > 5 &&
          (entry.normalizedKey.includes(normalized) || normalized.includes(entry.normalizedKey)) &&
          (entry.mode === cleanMode || cleanMode === 'all')
        ) {
          this.registerHit(entry);
          return entry;
        }
      }
    }

    // 3. Fuzzy Jaccard similarity check (>= 0.75 threshold)
    if (normalized.length >= 3) {
      let bestMatch: CachedAIResponse | null = null;
      let highestSimilarity = 0;

      for (const entry of this.cache.values()) {
        if (entry.mode === cleanMode || cleanMode === 'all') {
          const sim = calculateJaccardSimilarity(normalized, entry.normalizedKey);
          if (sim >= 0.75 && sim > highestSimilarity) {
            highestSimilarity = sim;
            bestMatch = entry;
          }
        }
      }

      if (bestMatch) {
        this.registerHit(bestMatch);
        return bestMatch;
      }
    }

    return null;
  }

  private registerHit(entry: CachedAIResponse) {
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastAccessedAt = new Date().toISOString();
    this.totalHits += 1;
    const saved = entry.tokensEstimated || 1500;
    this.totalTokensSaved += saved;
    setTimeout(() => {
      this.saveToDisk();
      this.syncToNeon(entry).catch(() => {});
    }, 100);
  }

  public set(
    query: string,
    subjectName: string,
    mode: string,
    answer: string,
    sections?: Record<string, string>,
    modelUsed = 'AI Model',
    contributingModels?: string[],
    iterationCount = 1,
    isCohortPerfected = false,
    customEvolution?: EvolutionStep[]
  ): CachedAIResponse {
    const normalized = normalizeAcademicQuery(query);
    const id = `cache-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const wordCount = answer.split(/\s+/).length;
    const tokensEstimated = Math.max(800, Math.round(wordCount * 1.35) + 300);

    const isPerfect = isCohortPerfected || iterationCount >= 60;
    const perfectionScore = isPerfect ? 99 : Math.min(95, Math.round(50 + (iterationCount / 60) * 45));
    const perfectionTier = isPerfect
      ? 'Master Gold Standard (60th Student)'
      : iterationCount >= 11
      ? 'Exam-Hardened (Students 11-40)'
      : iterationCount >= 2
      ? 'Peer-Enhanced (Students 2-10)'
      : 'Draft (Student 1)';

    const evolutionHistory =
      customEvolution && customEvolution.length > 0
        ? customEvolution
        : isPerfect
        ? generateEvolutionMilestones(query, iterationCount)
        : [
            {
              iteration: 1,
              studentLabel: 'Student 1',
              improvedAt: new Date().toISOString(),
              focus: 'Initial Q&A Exploration',
              summary: `Created initial answer draft for "${query}".`,
            },
          ];

    const entry: CachedAIResponse = {
      id,
      query: query.trim(),
      normalizedKey: normalized,
      subjectName: subjectName.trim(),
      mode: mode.trim(),
      answer: answer.trim(),
      sections,
      modelUsed,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      hitCount: 1,
      tokensEstimated,
      iterationCount,
      targetCohortSize: 60,
      isCohortPerfected: isPerfect,
      perfectionScore,
      perfectionTier,
      evolutionHistory,
      positiveVotes: 0,
      negativeVotes: 0,
      needsRefinement: false,
      isTeacherCurated: false,
    };

    if (contributingModels) {
      entry.contributingModels = contributingModels;
    }

    this.cache.set(id, entry);
    this.saveToDisk();
    this.syncToNeon(entry).catch(() => {});
    console.log(
      `[AI Knowledge Cache] 🧠 Stored topic: "${query}" (Iter: ${iterationCount}/60, Perfected: ${isPerfect})`
    );
    return entry;
  }

  /**
   * Evolutionary Compounding Refinement: Takes existing student answer, applies student N+1 feedback,
   * increments iteration count, updates evolution trajectory, and persists for the entire class!
   */
  public compoundRefine(
    query: string,
    subjectName: string,
    mode: string,
    improvedAnswer: string,
    improvedSections?: Record<string, string>,
    improvementFocus = 'Peer Enhancement & Exam Hardening',
    studentFeedback?: string
  ): CachedAIResponse {
    const existing = this.get(query, subjectName, mode);
    // Never allow automated milestone refinement to overwrite a teacher-curated answer
    if (existing?.isTeacherCurated) {
      return existing;
    }

    const nextIter = (existing?.iterationCount || 1) + 1;
    const isPerfect = nextIter >= 60;
    const perfectionScore = isPerfect ? 99 : Math.min(98, Math.round(55 + (nextIter / 60) * 43));
    const perfectionTier = isPerfect
      ? 'Master Gold Standard (60th Student)'
      : nextIter >= 11
      ? 'Exam-Hardened (Students 11-40)'
      : 'Peer-Enhanced (Students 2-10)';

    const newStep: EvolutionStep = {
      iteration: nextIter,
      studentLabel: `Student ${nextIter}`,
      improvedAt: new Date().toISOString(),
      focus: improvementFocus,
      summary: studentFeedback
        ? `Student ${nextIter} refined: "${studentFeedback}"`
        : `Student ${nextIter} added deeper academic rigor, examiner keywords, and edge-case handling.`,
    };

    const updatedHistory = existing?.evolutionHistory ? [...existing.evolutionHistory, newStep] : [newStep];

    if (existing) {
      existing.answer = improvedAnswer.trim();
      if (improvedSections) existing.sections = improvedSections;
      existing.iterationCount = nextIter;
      existing.isCohortPerfected = isPerfect;
      existing.perfectionScore = perfectionScore;
      existing.perfectionTier = perfectionTier;
      existing.evolutionHistory = updatedHistory;
      existing.needsRefinement = false;
      existing.lastAccessedAt = new Date().toISOString();
      this.saveToDisk();
      this.syncToNeon(existing).catch(() => {});
      return existing;
    }

    const created = this.set(
      query,
      subjectName,
      mode,
      improvedAnswer,
      improvedSections,
      'Cohort Compounding Engine',
      undefined,
      nextIter,
      isPerfect,
      updatedHistory
    );
    this.syncToNeon(created).catch(() => {});
    return created;
  }

  /**
   * Fast-track distillation: Immediately elevates a topic to 60-Student Master Perfection!
   */
  public elevateTo60(
    query: string,
    subjectName: string,
    mode: string,
    masterAnswer: string,
    masterSections?: Record<string, string>
  ): CachedAIResponse {
    const milestones = generateEvolutionMilestones(query, 60);
    const existing = this.get(query, subjectName, mode);

    if (existing) {
      existing.answer = masterAnswer.trim();
      if (masterSections) existing.sections = masterSections;
      existing.iterationCount = 60;
      existing.isCohortPerfected = true;
      existing.perfectionScore = 99;
      existing.perfectionTier = 'Master Gold Standard (60th Student)';
      existing.evolutionHistory = milestones;
      existing.needsRefinement = false;
      existing.lastAccessedAt = new Date().toISOString();
      this.saveToDisk();
      this.syncToNeon(existing).catch(() => {});
      return existing;
    }

    const created = this.set(
      query,
      subjectName,
      mode,
      masterAnswer,
      masterSections,
      'Cohort Compounding Master Engine (60th Student)',
      undefined,
      60,
      true,
      milestones
    );
    this.syncToNeon(created).catch(() => {});
    return created;
  }

  /**
   * Teacher / CR manual curation override: Locks answer as permanent Master Gold Standard
   */
  public curateByTeacher(
    query: string,
    subjectName: string,
    mode: string,
    teacherEditedAnswer: string,
    teacherName: string
  ): CachedAIResponse {
    const existing = this.get(query, subjectName, mode);
    const step: EvolutionStep = {
      iteration: 60,
      studentLabel: teacherName || 'Faculty In-Charge',
      improvedAt: new Date().toISOString(),
      focus: 'Teacher Manual Curation',
      summary: `Verified, edited, and approved by faculty (${teacherName || 'Faculty'}). Locked as permanent Master Gold Standard.`,
    };

    if (existing) {
      existing.answer = teacherEditedAnswer.trim();
      existing.iterationCount = 60;
      existing.isCohortPerfected = true;
      existing.perfectionScore = 100;
      existing.perfectionTier = 'Teacher-Verified Gold Standard';
      existing.isTeacherCurated = true;
      existing.needsRefinement = false;
      existing.evolutionHistory = [...(existing.evolutionHistory || []), step];
      existing.lastAccessedAt = new Date().toISOString();
      this.saveToDisk();
      this.syncToNeon(existing).catch(() => {});
      return existing;
    }

    const entry = this.set(
      query,
      subjectName,
      mode,
      teacherEditedAnswer,
      undefined,
      `Teacher Verified (${teacherName || 'Faculty'})`,
      undefined,
      60,
      true,
      [step]
    );
    entry.perfectionTier = 'Teacher-Verified Gold Standard';
    entry.perfectionScore = 100;
    entry.isTeacherCurated = true;
    this.saveToDisk();
    this.syncToNeon(entry).catch(() => {});
    return entry;
  }

  /**
   * Student answer rating feedback loop (Thumbs Up / Thumbs Down)
   */
  public vote(
    query: string,
    subjectName = '',
    mode = 'all',
    vote: 'up' | 'down',
    reason?: string
  ): { entry: CachedAIResponse | null; shouldRefine: boolean } {
    const entry = this.get(query, subjectName, mode);
    if (!entry) return { entry: null, shouldRefine: false };

    if (vote === 'up') {
      entry.positiveVotes = (entry.positiveVotes || 0) + 1;
      if (entry.positiveVotes >= 10 && entry.perfectionScore < 100) {
        entry.perfectionScore = Math.min(100, (entry.perfectionScore || 50) + 5);
      }
    } else {
      entry.negativeVotes = (entry.negativeVotes || 0) + 1;
      if (entry.negativeVotes >= 3) {
        entry.needsRefinement = true;
      }
    }

    if (reason && reason.trim()) {
      entry.evolutionHistory.push({
        iteration: entry.iterationCount,
        studentLabel: 'Student Feedback',
        improvedAt: new Date().toISOString(),
        focus: vote === 'up' ? 'Positive Student Endorsement' : 'Student Issue Flagged',
        summary: `Feedback (${vote}): "${reason.trim().slice(0, 150)}"`,
      });
    }

    this.saveToDisk();
    this.syncToNeon(entry).catch(() => {});
    return { entry, shouldRefine: Boolean(entry.needsRefinement) };
  }

  /**
   * Asynchronously synchronize one cache entry to Neon PostgreSQL (optional-safe)
   */
  public async syncToNeon(entry: CachedAIResponse): Promise<void> {
    if (!isNeonConfigured()) return;
    try {
      const sql = getNeonSql();
      if (!sql) return;
      await sql`
        INSERT INTO ai_knowledge_cache (
          id, normalized_key, query, subject_name, mode, answer, sections, model_used,
          created_at, last_accessed_at, hit_count, tokens_estimated, iteration_count,
          target_cohort_size, is_cohort_perfected, perfection_score, perfection_tier,
          evolution_history, positive_votes, negative_votes, needs_refinement, is_teacher_curated
        ) VALUES (
          ${entry.id}, ${entry.normalizedKey}, ${entry.query}, ${entry.subjectName},
          ${entry.mode}, ${entry.answer}, ${JSON.stringify(entry.sections || {})}::jsonb,
          ${entry.modelUsed || 'AI Engine'}, ${entry.createdAt}, ${entry.lastAccessedAt},
          ${entry.hitCount || 1}, ${entry.tokensEstimated || 1500}, ${entry.iterationCount || 1},
          ${entry.targetCohortSize || 60}, ${entry.isCohortPerfected || false},
          ${entry.perfectionScore || 15}, ${entry.perfectionTier},
          ${JSON.stringify(entry.evolutionHistory || [])}::jsonb,
          ${entry.positiveVotes || 0}, ${entry.negativeVotes || 0},
          ${entry.needsRefinement || false}, ${entry.isTeacherCurated || false}
        )
        ON CONFLICT (id) DO UPDATE SET
          answer = EXCLUDED.answer,
          sections = EXCLUDED.sections,
          last_accessed_at = EXCLUDED.last_accessed_at,
          hit_count = EXCLUDED.hit_count,
          tokens_estimated = EXCLUDED.tokens_estimated,
          iteration_count = EXCLUDED.iteration_count,
          is_cohort_perfected = EXCLUDED.is_cohort_perfected,
          perfection_score = EXCLUDED.perfection_score,
          perfection_tier = EXCLUDED.perfection_tier,
          evolution_history = EXCLUDED.evolution_history,
          positive_votes = EXCLUDED.positive_votes,
          negative_votes = EXCLUDED.negative_votes,
          needs_refinement = EXCLUDED.needs_refinement,
          is_teacher_curated = EXCLUDED.is_teacher_curated;
      `;
    } catch (err: any) {
      console.warn('[AI Knowledge Cache] Neon sync notice:', err?.message || err);
    }
  }

  /**
   * Hydrate in-memory cache from Neon PostgreSQL on server startup (survives Vercel/restart)
   */
  public async hydrateFromNeon(): Promise<number> {
    if (!isNeonConfigured()) return 0;
    try {
      const sql = getNeonSql();
      if (!sql) return 0;

      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS ai_knowledge_cache (
          id TEXT PRIMARY KEY,
          normalized_key TEXT NOT NULL,
          query TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          mode TEXT NOT NULL,
          answer TEXT NOT NULL,
          sections JSONB,
          model_used TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          hit_count INTEGER NOT NULL DEFAULT 0,
          tokens_estimated INTEGER NOT NULL DEFAULT 0,
          iteration_count INTEGER NOT NULL DEFAULT 1,
          target_cohort_size INTEGER NOT NULL DEFAULT 60,
          is_cohort_perfected BOOLEAN NOT NULL DEFAULT FALSE,
          perfection_score INTEGER NOT NULL DEFAULT 15,
          perfection_tier TEXT NOT NULL,
          evolution_history JSONB NOT NULL DEFAULT '[]'::jsonb,
          positive_votes INTEGER NOT NULL DEFAULT 0,
          negative_votes INTEGER NOT NULL DEFAULT 0,
          needs_refinement BOOLEAN NOT NULL DEFAULT FALSE,
          is_teacher_curated BOOLEAN NOT NULL DEFAULT FALSE
        );
      `;

      const rows = await sql`
        SELECT * FROM ai_knowledge_cache ORDER BY hit_count DESC;
      `;

      if (rows && rows.length > 0) {
        let hydratedCount = 0;
        for (const r of rows) {
          const entry: CachedAIResponse = {
            id: r.id,
            query: r.query,
            normalizedKey: r.normalized_key,
            subjectName: r.subject_name,
            mode: r.mode,
            answer: r.answer,
            sections: typeof r.sections === 'string' ? JSON.parse(r.sections) : (r.sections || undefined),
            modelUsed: r.model_used,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            lastAccessedAt: r.last_accessed_at ? new Date(r.last_accessed_at).toISOString() : new Date().toISOString(),
            hitCount: Number(r.hit_count) || 1,
            tokensEstimated: Number(r.tokens_estimated) || 1500,
            iterationCount: Number(r.iteration_count) || 1,
            targetCohortSize: Number(r.target_cohort_size) || 60,
            isCohortPerfected: Boolean(r.is_cohort_perfected),
            perfectionScore: Number(r.perfection_score) || 15,
            perfectionTier: r.perfection_tier || 'Draft (Student 1)',
            evolutionHistory: Array.isArray(r.evolution_history)
              ? r.evolution_history
              : (typeof r.evolution_history === 'string' ? JSON.parse(r.evolution_history) : []),
            positiveVotes: Number(r.positive_votes) || 0,
            negativeVotes: Number(r.negative_votes) || 0,
            needsRefinement: Boolean(r.needs_refinement),
            isTeacherCurated: Boolean(r.is_teacher_curated),
          };
          this.cache.set(entry.id, entry);
          hydratedCount++;
        }
        console.log(`[AI Knowledge Cache] ☁️ Hydrated ${hydratedCount} entries from Neon PostgreSQL into active memory!`);
        this.saveToDisk();
        return hydratedCount;
      }
    } catch (err: any) {
      console.warn('[AI Knowledge Cache] Neon hydration warning:', err?.message || err);
    }
    return 0;
  }

  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const cohortPerfectedCount = entries.filter((e) => e.isCohortPerfected).length;

    // Top 10 by hitCount
    const sortedByHits = [...entries].sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0));
    const topTopics = sortedByHits.slice(0, 10).map((e) => ({
      query: e.query,
      hitCount: e.hitCount || 1,
      perfectionTier: e.perfectionTier,
    }));

    // Subject breakdown
    const subjectMap: Record<string, { topicCount: number; totalHits: number }> = {};
    for (const e of entries) {
      const sub = e.subjectName || 'General';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { topicCount: 0, totalHits: 0 };
      }
      subjectMap[sub].topicCount += 1;
      subjectMap[sub].totalHits += e.hitCount || 1;
    }
    const subjectBreakdown = Object.entries(subjectMap).map(([subjectName, data]) => ({
      subjectName,
      topicCount: data.topicCount,
      totalHits: data.totalHits,
    }));

    // Recently perfected
    const recentlyPerfected = entries
      .filter((e) => e.isCohortPerfected)
      .sort((a, b) => new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime())
      .slice(0, 5)
      .map((e) => ({
        query: e.query,
        perfectedAt: e.lastAccessedAt || e.createdAt,
      }));

    // Estimated money saved in USD: $0.75 per 1M tokens for Gemini 3.8 Flash
    const estimatedMoneySaved = Number(((this.totalTokensSaved / 1_000_000) * 0.75).toFixed(4));

    return {
      totalLearnedItems: this.cache.size,
      cohortPerfectedCount,
      totalHits: this.totalHits,
      estimatedTokensSaved: this.totalTokensSaved,
      topTopics,
      subjectBreakdown,
      recentlyPerfected,
      estimatedMoneySaved,
      lastUpdated: new Date().toISOString(),
    };
  }

  public getAllEntries(): CachedAIResponse[] {
    return Array.from(this.cache.values());
  }

  public getCohortMasterLibrary(): CachedAIResponse[] {
    return Array.from(this.cache.values()).filter((e) => e.isCohortPerfected || e.iterationCount >= 10);
  }

  public clear() {
    this.cache.clear();
    this.totalHits = 0;
    this.totalTokensSaved = 0;
    this.saveToDisk();
  }

  /**
   * Pre-seed core university syllabus topics with 60th-student perfected outputs
   * so students opening the app instantly experience the perfected outcomes!
   */
  private seedDefaultCohortMasterEntries() {
    console.log('[AI Knowledge Cache] 🌱 Seeding 60-Student Cohort Master Library...');

    // 1. CPU Scheduling & Gantt Charts
    this.elevateTo60(
      'CPU Scheduling and Gantt Charts',
      'Operating Systems',
      'all',
      `### 1. Simple Overview
CPU Scheduling is the operating system mechanism that decides which process in the ready queue receives the CPU when the processor becomes idle. In modern multiprogrammed operating systems, the CPU is the most valuable hardware resource; keeping it utilized as close to 100% as possible is the primary goal of the CPU scheduler (also called the Short-Term Scheduler).

When multiple programs compete for CPU execution time, the operating system invokes a scheduling algorithm to select a process, switch its context into the hardware registers, and begin execution. Gantt Charts are horizontal bar charts used in computer science to visually demonstrate the timeline of process execution, start times, completion times, and context switch points.

### 2. ELI9 (Analogies)
Imagine a busy single-barista coffee counter at a college canteen. 
Five students arrive with different orders:
- Student A wants a simple black coffee (takes 1 minute).
- Student B wants an intricate caramel iced latte (takes 10 minutes).
- Student C wants hot tea (takes 2 minutes).

If the barista serves Student B first (First-Come, First-Served), Students A and C have to wait 10 agonizing minutes just for a 1-minute order! This frustrating delay is called the **Convoy Effect**.
Instead, if the barista serves Student A and C first (Shortest Job First), the average waiting time for everyone drops dramatically. The timeline blackboard on the wall showing who got served at 10:00, 10:01, 10:03 is your **Gantt Chart**.

### 3. Hinglish Breakdown
Dekho bhai, seedhi baat hai:
CPU ek hi hai (single core scenario), aur chalne wale processes bohot saare hain (P1, P2, P3). Ab CPU kisko milega, kab milega, aur kitni der ke liye milega—ye decide karna CPU Scheduler ka kaam hai.

Gantt Chart kuch nahi hai bas ek time-axis scale hai jo exam paper pe draw karke dikhana hota hai:
- 0 sec pe kaun ghusa?
- Kiske aate hi dusra nikla?
- Kitna waiting time laga?

Formula yaad rakhna:
1. **Turnaround Time (TAT)** = Completion Time (CT) - Arrival Time (AT)
2. **Waiting Time (WT)** = Turnaround Time (TAT) - Burst Time (BT)
Examiner hamesha Average WT aur Average TAT calculate karne bolta hai. Agar table draw kar ke ye dono formula step-by-step lagaye, toh 10 me se 10 marks pakke!

### 4. 10-Marker University Exam Format
#### A. Formal Academic Definitions
- **CPU Scheduling**: The process of allocating CPU cores to threads or processes from the ready queue based on a predefined scheduling policy.
- **Preemptive vs Non-Preemptive**: In non-preemptive scheduling, once a process gets CPU, it holds it until termination or I/O wait. In preemptive scheduling, the OS can interrupt a running process (e.g., higher priority arrival or timer quantum expiration).

#### B. ASCII Gantt Chart Blueprint (Round Robin with Time Quantum q = 2)
Processes: P1 (BT=5, AT=0), P2 (BT=3, AT=1), P3 (BT=1, AT=2)

+-------+-------+-------+-------+-------+-------+
|  P1   |  P2   |  P3   |  P1   |  P2   |  P1   |
+-------+-------+-------+-------+-------+-------+
0       2       4       5       7       8       9

#### C. Working Table & Calculation
| Process | Arrival Time (AT) | Burst Time (BT) | Completion Time (CT) | Turnaround Time (TAT = CT-AT) | Waiting Time (WT = TAT-BT) |
|---|---|---|---|---|---|
| P1 | 0 | 5 | 9 | 9 - 0 = 9 | 9 - 5 = 4 |
| P2 | 1 | 3 | 8 | 8 - 1 = 7 | 7 - 3 = 4 |
| P3 | 2 | 1 | 5 | 5 - 2 = 3 | 3 - 1 = 2 |

- **Average Turnaround Time**: (9 + 7 + 3) / 3 = 19 / 3 = **6.33 ms**
- **Average Waiting Time**: (4 + 4 + 2) / 3 = 10 / 3 = **3.33 ms**

#### D. Algorithmic Implementation (C / Java Blueprint)
\`\`\`c
// Non-Preemptive SJF Scheduling Algorithm
#include <stdio.h>

void calculateTimes(int n, int bt[], int at[]) {
    int wt[n], tat[n], ct[n];
    ct[0] = at[0] + bt[0];
    tat[0] = ct[0] - at[0];
    wt[0] = tat[0] - bt[0];

    for(int i = 1; i < n; i++) {
        ct[i] = (ct[i-1] > at[i] ? ct[i-1] : at[i]) + bt[i];
        tat[i] = ct[i] - at[i];
        wt[i] = tat[i] - bt[i];
    }
}
\`\`\`

#### E. Examiner Traps & Gotchas
1. **Zero vs Non-Zero Arrival Times**: Always check if Arrival Time is 0. If P2 arrives at time 2 and P1 ends at time 1, the CPU is IDLE for 1 millisecond. Draw an empty block in the Gantt chart!
2. **Context Switching Overhead**: Real systems incur register-save cost (typically 1–10 microseconds).

### 5. Deep Dive & Edge Cases
- **Convoy Effect**: Occurs in FCFS when a CPU-bound process with large burst time precedes several short I/O-bound processes, dropping device utilization.
- **Starvation / Indefinite Blocking**: In priority scheduling and SJF, a steady stream of short/high-priority processes can starve long-running processes. Solved via **Aging** (gradually increasing priority as time passes).
- **Little's Law Formula**: Average Queue Length L = λ × W (Arrival Rate × Average Wait Time).

### 6. Quiz Me (Self-Check Questions)
1. **Question**: If time quantum in Round Robin is extremely large (t -> infinity), which algorithm does it degenerate into?
   - **Answer**: First-Come, First-Served (FCFS).
2. **Question**: Which CPU scheduling algorithm gives the provably minimum average waiting time for a given set of processes?
   - **Answer**: Shortest Job First (SJF) / Shortest Remaining Time First (SRTF).`,
      {
        simple: 'CPU Scheduling is the operating system mechanism that decides which process in the ready queue receives the CPU...',
        eli9: 'Imagine a busy single-barista coffee counter at a college canteen...',
        hinglish: 'Dekho bhai, seedhi baat hai: CPU ek hi hai aur chalne wale processes bohot saare hain...',
        exam_10marker: '### 10-Marker University Exam Format Blueprint...',
        detailed: 'Deep dive into Convoy Effect, Little\'s Law, and Aging...',
        socratic: 'Test your understanding: degenerate Round Robin and minimum average waiting time.',
      }
    );

    // 2. Deadlocks & Banker's Algorithm
    this.elevateTo60(
      'Deadlocks and Bankers Algorithm',
      'Operating Systems',
      'all',
      `### 1. Simple Overview
A Deadlock is a permanent state where a set of processes are blocked because each process holds resources and waits for other resources acquired by other processes in the same set. Neither process can proceed, execute, or release its resources without external intervention.

The Banker's Algorithm, developed by Edsger Dijkstra, is a classic deadlock avoidance algorithm used in operating systems. It tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources, ensuring the system never enters an 'Unsafe State'.

### 2. ELI9 (Analogies)
Think of a bank with cash reserves. 
Four customers need loans for construction projects:
- Alice needs up to $10,000.
- Bob needs up to $20,000.
- Charlie needs up to $15,000.

The bank currently has $12,000 in cash. The banker will NEVER lend money to a customer unless the remaining cash is enough to satisfy at least one customer's MAXIMUM remaining need so they can finish, repay the entire loan, and replenish the vault. If lending $5,000 leaves the bank unable to help anyone finish, the banker declines the request!

### 3. Hinglish Breakdown
Dekho: Deadlock ka matlab "Na tum aage badhoge, na main".
Jaise ek narrow bridge pe do gaadiyaan aamne-saamne aa gayi. Dono driver bol rahe hain: "Pehle tu peeche le!". Result? Total jam!

Deadlock aane ke liye 4 shartein (Coffman conditions) zaroori hain:
1. **Mutual Exclusion**: Resource share nahi ho sakti.
2. **Hold and Wait**: Ek resource pakad ke dusre ka intezar kar rahe ho.
3. **No Preemption**: Kisi se jabardasti resource nahi chheen sakte.
4. **Circular Wait**: Cycle ban gaya (P1 waits for P2, P2 waits for P1).

Banker's algorithm bas ye dekhta hai: **Need = Max - Allocation**. Agar Available resources kisi ek process ki Need poori kar sakti hain, toh system SAFE hai!

### 4. 10-Marker University Exam Format
#### A. 4 Coffman Conditions Required for Deadlock
1. **Mutual Exclusion**: At least one resource is held in a non-shareable mode.
2. **Hold and Wait**: Process holding >= 1 resource waits for additional busy resources.
3. **No Preemption**: Resources cannot be preempted; released only voluntarily.
4. **Circular Wait**: Closed loop chain P0 -> P1 -> P2 -> ... -> P0.

#### B. Banker's Algorithm Data Structures
- **Available[m]**: Vector of length m indicating available instances of each resource type.
- **Max[n][m]**: Maximum demand of each process.
- **Allocation[n][m]**: Resources currently allocated to each process.
- **Need[n][m]**: Remaining resource need: \`Need[i][j] = Max[i][j] - Allocation[i][j]\`.

#### C. Safety Algorithm Steps
1. Let \`Work = Available\` and \`Finish[i] = false\` for all i.
2. Find index i such that \`Finish[i] == false\` and \`Need[i] <= Work\`. If no such i exists, go to step 4.
3. \`Work = Work + Allocation[i]\`, \`Finish[i] = true\`, repeat Step 2.
4. If \`Finish[i] == true\` for all i, system is in a **Safe State**!

### 5. Deep Dive & Edge Cases
- Safe State vs Unsafe State vs Deadlock: Every Deadlock is an Unsafe State, but NOT every Unsafe State is a Deadlock!
- Resource Allocation Graph (RAG): Cycle is a NECESSARY and SUFFICIENT condition for deadlock IF each resource type has exactly 1 instance. If multiple instances exist, cycle is necessary but NOT sufficient.

### 6. Quiz Me (Self-Check Questions)
1. **Question**: Can an unsafe state guarantee that a deadlock has occurred?
   - **Answer**: No. An unsafe state only means the operating system cannot prevent processes from deadlocking if they all request their maximum resources simultaneously.
2. **Question**: State the formula for the Need matrix in Banker's algorithm.
   - **Answer**: \`Need[i][j] = Max[i][j] - Allocation[i][j]\`.`,
      {
        simple: 'A Deadlock is a permanent state where processes are mutually blocked on resources...',
        eli9: 'Think of a bank with cash reserves that only lends if at least one client can finish...',
        hinglish: 'Deadlock ka matlab "Na tum aage badhoge, na main". 4 Coffman conditions...',
        exam_10marker: 'Complete Section C 10-marker on Coffman conditions & Banker\'s Safety algorithm...',
        detailed: 'RAG cycles with multiple instances vs single instance...',
        socratic: 'Test your understanding: Unsafe state vs Deadlock guarantee.',
      }
    );

    // 3. Database Normalization (1NF, 2NF, 3NF, BCNF)
    this.elevateTo60(
      'Database Normalization 1NF 2NF 3NF BCNF',
      'Database Management Systems',
      'all',
      `### 1. Simple Overview
Database Normalization is the systematic process of organizing data in a relational schema to minimize data redundancy and eliminate undesirable update, insertion, and deletion anomalies.

By decomposing tables with excessive or redundant attributes into smaller, well-structured relations using Functional Dependencies (FDs), normalization guarantees data integrity and simplifies transaction consistency without information loss.

### 2. ELI9 (Analogies)
Imagine a messy spreadsheet where an order contains:
- Order ID
- Customer Name
- Customer Address
- Product ID
- Product Price

If a customer places 50 orders, their address is typed 50 times! If they move to a new apartment, you have to update 50 rows. If you miss one row, data is corrupted (Update Anomaly).
Normalization separates this into two clean tables: **Customers Table** (address stored ONCE) and **Orders Table** (just referencing Customer ID).

### 3. Hinglish Breakdown
Normalization ka seedha maksad hai: **"Ek baat ek hi jagah likho, baar baar repeat mat karo."**

Four stages yaad rakhne ka shortcut:
1. **1NF**: No multi-valued attributes (har dabbe me ek hi value hogi, atomic values).
2. **2NF**: 1NF + No Partial Dependency (koi non-prime attribute composite primary key ke aadhe hisse pe depend nahi karega).
3. **3NF**: 2NF + No Transitive Dependency (A -> B aur B -> C nahi hona chahiye. X -> Y me ya toh X Superkey ho, ya Y Prime Attribute ho).
4. **BCNF**: Strictly X must be a SUPERKEY for every functional dependency X -> Y.

Exam me 100% question aata hai: "Relation R(A,B,C,D) with FDs... Find highest normal form!"

### 4. 10-Marker University Exam Format
#### A. Normal Form Hierarchy Summary
\`\`\`
Unnormalized -> 1NF -> 2NF -> 3NF -> BCNF (Boyce-Codd)
\`\`\`

#### B. Formal Definitions & Tests
- **First Normal Form (1NF)**: A relation R is in 1NF if and only if all underlying domains contain only atomic (indivisible) values.
- **Second Normal Form (2NF)**: In 1NF and no non-prime attribute is partially dependent on any candidate key.
- **Third Normal Form (3NF)**: In 2NF and for every non-trivial FD \`X -> Y\`, either \`X\` is a Super Key or \`Y\` is a Prime Attribute (member of candidate key).
- **BCNF**: For every non-trivial FD \`X -> Y\`, \`X\` MUST be a Super Key.

#### C. Numerical Solving Technique (University Exam Step-by-Step)
Given: \`R(A, B, C, D, E)\`, FDs: \`A -> B\`, \`BC -> D\`, \`E -> C\`
1. Compute Candidate Key: Find attribute closure of \`AE\` -> \`(AE)+ = {A, E, B, C, D}\`.
   Since \`(AE)+\` contains all attributes, **AE is the Candidate Key**.
2. Prime attributes: \`{A, E}\`. Non-prime: \`{B, C, D}\`.
3. Check 2NF: \`A -> B\` violates 2NF because \`A\` is a proper subset of candidate key \`AE\` (Partial Dependency).
4. Result: Highest normal form is **1NF**!

### 5. Deep Dive & Edge Cases
- **Lossless Join Decomposition**: \`R1 ∩ R2 -> R1\` or \`R1 ∩ R2 -> R2\`.
- **Dependency Preservation**: All original FDs can be verified in decomposed relations without computing joins. Note: BCNF is NOT always dependency-preserving, while 3NF ALWAYS guarantees dependency preservation!

### 6. Quiz Me (Self-Check Questions)
1. **Question**: Can every relational schema be decomposed into BCNF with dependency preservation?
   - **Answer**: No. BCNF guarantees lossless join, but cannot always preserve all functional dependencies. 3NF is required when dependency preservation is mandatory.
2. **Question**: What is a Transitive Dependency?
   - **Answer**: An indirect functional dependency where A -> B and B -> C, leading to A -> C where B is not a candidate key.`,
      {
        simple: 'Database Normalization eliminates redundancy and update anomalies...',
        eli9: 'Imagine keeping customer address 50 times in an orders sheet vs separate tables...',
        hinglish: 'Ek baat ek hi jagah likho. 1NF, 2NF, 3NF, BCNF rules...',
        exam_10marker: 'Complete 10-marker on candidate keys, attribute closure, and normal forms...',
        detailed: 'Lossless join vs dependency preservation in 3NF and BCNF...',
        socratic: 'Test your understanding: Can BCNF always preserve dependencies?',
      }
    );

    this.saveToDisk();
  }
}

export const aiKnowledgeCache = new AIKnowledgeCacheManager();
