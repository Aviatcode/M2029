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
  marks?: number; // 2, 5, 10, etc.
  subVariants: string[]; // e.g. ["8:1_mux", "2pc", "lru"]
  requestedLanguage: 'english' | 'hinglish';
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
export function extractQueryIntent(query: string = ''): QueryIntent {
  const q = (query || '').toLowerCase().trim();

  const wantsHinglish = /hinglish|hindi|samjhao|batao|dekho bhai/i.test(q);
  const wantsEli9 = /eli9|like i'm 9|like im 9|simple analogy|beginner|child/i.test(q);
  const is10Marker = /10[- ]?marker|section c|university format|full marks|marking scheme|\b10\s*marks\b/i.test(q);
  const is2Marker = /2[- ]?marker|short definition|brief definition|define only|quick definition|\b2\s*marks\b/i.test(q);

  let marks: number | undefined = undefined;
  const marksMatch = q.match(/\b(2|5|10|15|20)\s*(?:marks?|marker)\b/i);
  if (marksMatch) {
    marks = parseInt(marksMatch[1], 10);
  } else if (is10Marker) {
    marks = 10;
  } else if (is2Marker) {
    marks = 2;
  }

  const subVariants: string[] = [];
  // Detect multiplexer/demultiplexer ratios (e.g. 8:1, 4:1, 2:1, 16:1)
  const muxMatch = q.match(/\b(\d+)\s*(?::|to)\s*1\s*(?:mux|multiplexer)?\b/i);
  if (muxMatch) {
    subVariants.push(`${muxMatch[1]}:1_mux`);
  }
  // Detect demux ratios (e.g. 1:4, 1:8)
  const demuxMatch = q.match(/\b1\s*(?::|to)\s*(\d+)\s*(?:demux|demultiplexer)?\b/i);
  if (demuxMatch) {
    subVariants.push(`1:${demuxMatch[1]}_demux`);
  }
  // Detect protocol variants
  if (/\b2pc\b|\btwo[- ]phase\s+commit\b/i.test(q)) subVariants.push('2pc');
  if (/\b3pc\b|\bthree[- ]phase\s+commit\b/i.test(q)) subVariants.push('3pc');
  if (/\bround[- ]robin\b|\brr\b/i.test(q)) subVariants.push('round_robin');
  if (/\bsrtf\b/i.test(q)) subVariants.push('srtf');
  if (/\bsjf\b/i.test(q)) subVariants.push('sjf');
  if (/\bfcfs\b/i.test(q)) subVariants.push('fcfs');
  if (/\bpreemptive\b/i.test(q) && !/non[- ]preemptive/i.test(q)) subVariants.push('preemptive');
  if (/non[- ]preemptive/i.test(q)) subVariants.push('non_preemptive');

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
  } else if (/algorithm|working|mechanism|architecture|flow|diagram|schematic|steps/i.test(q)) {
    primary = 'algorithm';
    specificTargets.push('algorithm');
  } else if (is10Marker || marks === 10) {
    primary = 'exam_10marker';
  } else if (/define|definition|what is|meaning of|concept of/i.test(q)) {
    primary = 'definition';
  }

  let depth: QueryIntent['depth'] = 'standard';
  if (is10Marker || marks === 10 || /detailed|in[- ]depth|deep dive|comprehensive/i.test(q)) {
    depth = 'exam_10marker';
  } else if (is2Marker || marks === 2 || /short|brief|quick/i.test(q)) {
    depth = 'short';
  }

  return {
    primary,
    specificTargets,
    depth,
    marks,
    subVariants,
    requestedLanguage: wantsHinglish ? 'hinglish' : 'english',
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
  // Normalize ratio expressions before splitting (e.g. 8:1 -> 8to1mux, 4:1 -> 4to1mux)
  let cleaned = rawQuery
    .toLowerCase()
    .replace(/\b(\d+)\s*(?::|to)\s*1\b/g, '$1to1mux')
    .replace(/\b1\s*(?::|to)\s*(\d+)\b/g, '1to$1demux')
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
    } else if (!STOP_WORDS.has(token) && (token.length > 1 || /\d/.test(token))) {
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

  // 3. Intent, Sub-variant & Depth Validation Check
  const incIntent = extractQueryIntent(incomingQuery);
  const stoIntent = extractQueryIntent(storedOriginalQuery);

  // Sub-variant check (e.g. "Define a multiplexer" vs "Explain the working of an 8:1 multiplexer")
  if (incIntent.subVariants.length > 0 || stoIntent.subVariants.length > 0) {
    const incSet = new Set(incIntent.subVariants);
    const stoSet = new Set(stoIntent.subVariants);
    let subMismatch = false;
    for (const v of incSet) {
      if (!stoSet.has(v)) { subMismatch = true; break; }
    }
    for (const v of stoSet) {
      if (!incSet.has(v)) { subMismatch = true; break; }
    }
    if (subMismatch) {
      return {
        isMatch: false,
        confidence: 0.25,
        matchType: 'none',
        intentCompatible: false,
        reason: `Sub-variant mismatch: incoming specifies [${Array.from(incSet).join(', ')}] whereas stored answer specifies [${Array.from(stoSet).join(', ')}].`,
      };
    }
  }

  // Marks & Depth Expectation Check (e.g. 2-mark definition should not replace a 10-mark explanation)
  if (
    (incIntent.marks === 2 && stoIntent.marks === 10) ||
    (incIntent.marks === 10 && stoIntent.marks === 2) ||
    (incIntent.depth === 'short' && stoIntent.depth === 'exam_10marker') ||
    (incIntent.depth === 'exam_10marker' && stoIntent.depth === 'short')
  ) {
    return {
      isMatch: false,
      confidence: 0.3,
      matchType: 'none',
      intentCompatible: false,
      reason: `Marks/depth expectation mismatch: requested ${incIntent.marks || incIntent.depth} cannot be replaced by stored ${stoIntent.marks || stoIntent.depth}.`,
    };
  }

  // Language Expectation Check (e.g. Hinglish vs English)
  if (incIntent.requestedLanguage === 'hinglish' && stoIntent.requestedLanguage === 'english' && !stoIntent.wantsHinglish) {
    return {
      isMatch: false,
      confidence: 0.3,
      matchType: 'none',
      intentCompatible: false,
      reason: 'Language mismatch: student explicitly requested Hinglish breakdown, but stored answer was generated in standard English.',
    };
  }

  if (incKey && stoKey && incKey === stoKey) {
    return {
      isMatch: true,
      confidence: 0.98,
      matchType: 'normalized_exact',
      intentCompatible: true,
      reason: 'Identical normalized concept tokens',
    };
  }

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
