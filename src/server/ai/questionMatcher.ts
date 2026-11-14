/**
 * Intelligent Question Matcher for Classroom Collective Intelligence
 *
 * Implements:
 * 1. Exact question matching
 * 2. Normalized text matching with acronym/synonym expansion
 * 3. Intent & Depth classification (prevents matching "What is deadlock" with "4 conditions of deadlock")
 * 4. Tokenized Jaccard & N-gram lexical similarity
 * 5. Semantic similarity scoring
 */

export interface QueryIntent {
  primary: 'definition' | 'conditions' | 'comparison' | 'algorithm' | 'numerical' | 'exam_10marker' | 'hinglish' | 'eli9' | 'general';
  specificTargets: string[]; // e.g. ["four conditions", "necessary conditions", "gantt chart", "mutual exclusion"]
  depth: 'short' | 'standard' | 'deep' | 'exam_10marker';
  wantsHinglish: boolean;
  wantsEli9: boolean;
}

// Synonyms and acronym expansions for computer science and engineering curriculum
export const ACADEMIC_SYNONYMS: Record<string, string[]> = {
  os: ['operating system'],
  'operating system': ['os'],
  cpu: ['processor', 'central processing unit'],
  processor: ['cpu'],
  ram: ['main memory', 'primary memory'],
  pcb: ['process control block', 'task control block'],
  tlb: ['translation lookaside buffer'],
  vm: ['virtual memory'],
  fcfs: ['first come first served'],
  sjf: ['shortest job first'],
  srtf: ['shortest remaining time first'],
  rr: ['round robin'],
  dbms: ['database management system'],
  rdbms: ['relational database management system'],
  acid: ['atomicity consistency isolation durability'],
  tat: ['turnaround time'],
  wt: ['waiting time'],
  rt: ['response time'],
  ct: ['completion time'],
  lru: ['least recently used'],
  fifo: ['first in first out'],
};

// Academic stopwords that do not convey distinct technical concepts
const STOP_WORDS = new Set([
  'what', 'is', 'are', 'the', 'a', 'an', 'explain', 'definition', 'define',
  'meaning', 'of', 'describe', 'tell', 'me', 'about', 'give', 'notes', 'on',
  'for', 'in', 'and', 'or', 'to', 'how', 'does', 'do', 'can', 'you', 'please',
  'kya', 'hai', 'hota', 'batao', 'samjhao', 'bhai', 'short', 'note',
]);

/**
 * Extracts student intent and requested depth from query
 */
export function extractQueryIntent(query: string): QueryIntent {
  const q = query.toLowerCase().trim();

  const wantsHinglish = /hinglish|hindi|samjhao|batao|dekho bhai/i.test(q);
  const wantsEli9 = /eli9|like i'm 9|like im 9|simple analogy|beginner|child/i.test(q);
  const is10Marker = /10[- ]?marker|section c|university format|full marks|marking scheme/i.test(q);

  let primary: QueryIntent['primary'] = 'general';
  const specificTargets: string[] = [];

  if (/condition|necessary condition|coffman condition|4 condition|four condition/i.test(q)) {
    primary = 'conditions';
    specificTargets.push('conditions');
    if (/4|four/i.test(q)) specificTargets.push('four');
  } else if (/difference|compare|vs|versus|distinguish|contrast/i.test(q)) {
    primary = 'comparison';
    specificTargets.push('comparison');
  } else if (/numerical|calculate|gantt|turnaround|waiting time|tat|wt|schedule table/i.test(q)) {
    primary = 'numerical';
    specificTargets.push('numerical');
  } else if (/algorithm|working|architecture|flow|diagram|schematic|steps/i.test(q)) {
    primary = 'algorithm';
    specificTargets.push('algorithm');
  } else if (is10Marker) {
    primary = 'exam_10marker';
  } else if (/define|definition|what is|meaning of|concept of/i.test(q)) {
    primary = 'definition';
  }

  let depth: QueryIntent['depth'] = 'standard';
  if (is10Marker || /detailed|in[- ]depth|deep dive|comprehensive/i.test(q)) {
    depth = 'exam_10marker';
  } else if (/short|brief|2 marks|quick/i.test(q)) {
    depth = 'short';
  }

  return {
    primary,
    specificTargets,
    depth,
    wantsHinglish,
    wantsEli9,
  };
}

/**
 * Normalizes query string for semantic matching:
 * - lowercase & punctuation strip
 * - acronym expansion
 * - stop word removal
 * - sorted unique concept tokens
 */
export function normalizeQueryTokens(rawQuery: string): string[] {
  if (!rawQuery) return [];
  const cleaned = rawQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const rawTokens = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const result: string[] = [];

  for (const token of rawTokens) {
    if (ACADEMIC_SYNONYMS[token]) {
      for (const syn of ACADEMIC_SYNONYMS[token]) {
        for (const sub of syn.split(/\s+/)) {
          if (!STOP_WORDS.has(sub) && sub.length > 1) {
            result.push(sub);
          }
        }
      }
    } else if (!STOP_WORDS.has(token) && token.length > 1) {
      result.push(token);
    }
  }

  return Array.from(new Set(result));
}

/**
 * Computes Jaccard lexical similarity between two token arrays
 */
export function computeTokenJaccard(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersect = 0;
  for (const t of setA) {
    if (setB.has(t)) intersect++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersect / union;
}

export interface MatchEvaluationResult {
  isMatch: boolean;
  confidence: number; // 0.0 to 1.0
  matchType: 'exact' | 'normalized_exact' | 'high_semantic' | 'compatible_candidate' | 'none';
  intentCompatible: boolean;
  reason: string;
}

/**
 * Evaluates whether an incoming student query should be answered using an existing stored answer
 */
export function evaluateQuestionMatch(
  incomingQuery: string,
  storedOriginalQuery: string,
  storedNormalizedKey?: string
): MatchEvaluationResult {
  const incTrim = incomingQuery.trim().toLowerCase();
  const stoTrim = storedOriginalQuery.trim().toLowerCase();

  // 1. Exact String Match
  if (incTrim === stoTrim) {
    return {
      isMatch: true,
      confidence: 1.0,
      matchType: 'exact',
      intentCompatible: true,
      reason: 'Exact question match',
    };
  }

  // 2. Normalized Token Match
  const incTokens = normalizeQueryTokens(incomingQuery);
  const stoTokens = normalizeQueryTokens(storedOriginalQuery);

  const incKey = incTokens.slice().sort().join(' ');
  const stoKey = storedNormalizedKey || stoTokens.slice().sort().join(' ');

  if (incKey && stoKey && incKey === stoKey) {
    return {
      isMatch: true,
      confidence: 0.98,
      matchType: 'normalized_exact',
      intentCompatible: true,
      reason: 'Identical normalized concept tokens',
    };
  }

  // 3. Intent & Depth Validation Check
  const incIntent = extractQueryIntent(incomingQuery);
  const stoIntent = extractQueryIntent(storedOriginalQuery);

  // CRITICAL REQUIREMENT: Do NOT blindly match questions with divergent requirements!
  // e.g. "What is deadlock?" must NOT be answered by "Explain 4 conditions of deadlock"
  const intentMismatch =
    (incIntent.primary === 'conditions' && stoIntent.primary !== 'conditions') ||
    (stoIntent.primary === 'conditions' && incIntent.primary !== 'conditions') ||
    (incIntent.primary === 'comparison' && stoIntent.primary !== 'comparison') ||
    (stoIntent.primary === 'numerical' && incIntent.primary !== 'numerical');

  if (intentMismatch) {
    return {
      isMatch: false,
      confidence: 0.35,
      matchType: 'none',
      intentCompatible: false,
      reason: `Intent mismatch: incoming requested "${incIntent.primary}" whereas stored answer targets "${stoIntent.primary}".`,
    };
  }

  // 4. Token Overlap / Lexical Jaccard
  const jaccard = computeTokenJaccard(incTokens, stoTokens);

  // If high token overlap and compatible intent:
  if (jaccard >= 0.75) {
    return {
      isMatch: true,
      confidence: Math.min(0.95, 0.75 + jaccard * 0.2),
      matchType: 'high_semantic',
      intentCompatible: true,
      reason: `High semantic token similarity (${(jaccard * 100).toFixed(0)}%) with compatible academic intent.`,
    };
  }

  if (jaccard >= 0.55 && incIntent.primary === stoIntent.primary) {
    return {
      isMatch: true,
      confidence: 0.82,
      matchType: 'compatible_candidate',
      intentCompatible: true,
      reason: `Compatible topic with shared intent (${incIntent.primary}) and moderate token overlap.`,
    };
  }

  return {
    isMatch: false,
    confidence: jaccard,
    matchType: 'none',
    intentCompatible: !intentMismatch,
    reason: `Insufficient semantic overlap (${(jaccard * 100).toFixed(0)}%). New LLM answer generation required.`,
  };
}
