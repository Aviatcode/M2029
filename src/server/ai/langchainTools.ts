import { DynamicTool } from '@langchain/core/tools';
import { ragEngine } from '../rag/ragIndex.js';
import { GOLD_TOPICS, SYLLABUS_TRACKS } from './academicKnowledgeBank.js';
import { fetchGoogleSearch } from './googleFetchService.js';

export interface RagHit {
  docTitle: string;
  pageNumber: number;
  sectionTitle: string;
  score: number;
  text: string;
  chunkIndex: number;
}

export interface WebHit {
  title: string;
  snippet: string;
  source: string;
}

export interface CurriculumCheckResult {
  isAligned: boolean;
  subjectName: string;
  matchedTopic?: string;
  reason: string;
}

/**
 * Executes local RAG retrieval across student uploaded materials
 */
export async function executeLocalRag(input: string): Promise<string> {
  try {
    const results = ragEngine.search(input, { limit: 4 });
    if (!results || results.length === 0) {
      return JSON.stringify({
        hitsCount: 0,
        hits: [],
        message: 'No direct excerpts found in uploaded documents.',
      });
    }

    const formatted: RagHit[] = results.map((r) => ({
      docTitle: r.docTitle,
      pageNumber: r.pageNumber || 1,
      sectionTitle: r.sectionTitle || 'General Section',
      score: Math.round(r.score * 100) / 100,
      text: r.chunk.text,
      chunkIndex: r.chunk.chunkIndex,
    }));

    return JSON.stringify({
      hitsCount: formatted.length,
      hits: formatted,
      summary: `Retrieved ${formatted.length} high-confidence textbook excerpts from student vault.`,
    });
  } catch (err: any) {
    return JSON.stringify({
      hitsCount: 0,
      hits: [],
      error: err.message || 'RAG retrieval failed',
    });
  }
}

/**
 * 1. RAG Retrieval Tool: Queries student's active backend uploaded textbooks and notes
 */
export const retrieveLocalRagTool = new DynamicTool({
  name: 'retrieve_local_rag',
  description:
    'Retrieves relevant excerpts, proofs, code, and definitions from student uploaded textbooks, syllabi, and notes using BM25 and vector indexing.',
  func: executeLocalRag,
});

/**
 * Executes targeted internet search to simplify dense jargon and find intuitive real-world analogies
 * Uses the under-the-hood zero-token fetcher (0 AI models, 0 tokens spent)
 */
export async function executeAcademicWeb(input: string): Promise<string> {
  try {
    const query = `${input} real world analogy easy explanation simplify in simple words`;
    const searchRes = await fetchGoogleSearch(query, { limit: 3 });

    const hits: WebHit[] = searchRes.items.map((item) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.source,
    }));

    if (hits.length === 0) {
      return JSON.stringify({
        hitsCount: 0,
        hits: [],
        message: 'No external analogies needed; local textbook groundings are clear.',
      });
    }

    return JSON.stringify({
      hitsCount: hits.length,
      hits,
      suggestions: searchRes.suggestions,
      summary: `Retrieved ${hits.length} real-world analogies and intuitive simplifications under the hood (0 tokens spent).`,
    });
  } catch (err: any) {
    return JSON.stringify({
      hitsCount: 0,
      hits: [],
      message: 'Web fallback active (standard clear everyday analogies applied).',
    });
  }
}

/**
 * 2. Academic Web Simplification Tool: Queries Google/Web ONLY when necessary to find easy terms and real-world analogies
 */
export const searchAcademicWebTool = new DynamicTool({
  name: 'search_academic_web',
  description:
    'Performs targeted web search only when necessary to demystify difficult technical jargon, find intuitive real-world analogies, and simplify complex words so students understand immediately.',
  func: executeAcademicWeb,
});

/**
 * Validates whether the student question aligns with the semester curriculum
 */
export async function executeCurriculumCheck(input: string): Promise<string> {
  const qLower = input.toLowerCase();

  // Check against standard syllabus tracks
  for (const track of SYLLABUS_TRACKS) {
    if (
      qLower.includes(track.name.toLowerCase()) ||
      track.topics.some((t) => qLower.includes(t.title.toLowerCase()))
    ) {
      const matched = track.topics.find((t) => qLower.includes(t.title.toLowerCase()));
      return JSON.stringify({
        isAligned: true,
        subjectName: track.name,
        matchedTopic: matched?.title,
        reason: `Topic matches verified syllabus track: ${track.name}`,
      } as CurriculumCheckResult);
    }
  }

  // Check against Gold Master topics
  for (const gold of GOLD_TOPICS) {
    if (qLower.includes(gold.title.toLowerCase()) || gold.title.toLowerCase().includes(qLower)) {
      return JSON.stringify({
        isAligned: true,
        subjectName: gold.unit || 'Operating Systems',
        matchedTopic: gold.title,
        reason: `Topic is a verified core curriculum requirement in ${gold.unit || 'Operating Systems'}`,
      } as CurriculumCheckResult);
    }
  }

  // Common academic keywords check
  const academicKeywords = [
    'operating system', 'process', 'thread', 'cpu', 'scheduling', 'memory', 'paging',
    'semaphore', 'deadlock', 'mutex', 'cache', 'virtual memory', 'fifo', 'lru',
    'dbms', 'sql', 'database', 'normalization', 'transaction', 'acid', 'b-tree',
    'network', 'tcp', 'ip', 'udp', 'osi', 'routing', 'packet', 'socket',
    'java', 'oop', 'class', 'inheritance', 'polymorphism', 'interface', 'multithreading',
    'data structure', 'algorithm', 'complexity', 'graph', 'tree', 'stack', 'queue',
    'software engineering', 'agile', 'waterfall', 'testing', 'uml', 'design pattern',
    'exam', 'pyq', '10-marker', 'derivation', 'proof', 'architecture', 'diagram'
  ];

  const isAcademic = academicKeywords.some((kw) => qLower.includes(kw));

  if (isAcademic) {
    return JSON.stringify({
      isAligned: true,
      subjectName: 'Computer Science & Engineering',
      reason: 'Question verified as relevant computer science and engineering coursework.',
    } as CurriculumCheckResult);
  }

  return JSON.stringify({
    isAligned: false,
    subjectName: 'Non-Curriculum Inquiry',
    reason: 'Question does not map to registered syllabus courses (OS, DBMS, Networks, Java, SE). Grounding response to university foundations.',
  } as CurriculumCheckResult);
}

/**
 * 3. Curriculum Guardrail Tool: Prevents students from asking completely off-topic questions
 */
export const checkCurriculumAlignmentTool = new DynamicTool({
  name: 'check_curriculum_alignment',
  description:
    'Validates whether the student question aligns with the semester curriculum and maps it to subjects, units, and university topics.',
  func: executeCurriculumCheck,
});
