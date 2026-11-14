import { RagHit, WebHit } from '../ai/langchainTools.js';
import { CitationRef } from './citationValidator.js';

export type EvidenceConfidenceTier =
  | 'HIGH_EVIDENCE'
  | 'PARTIAL_EVIDENCE'
  | 'CONFLICTING_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE';

export interface ContradictionReport {
  hasContradiction: boolean;
  topic: string;
  sourceA?: string;
  sourceB?: string;
  explanation?: string;
}

export interface EvidenceEvaluationResult {
  confidenceTier: EvidenceConfidenceTier;
  confidenceLabel: string;
  isGroundedInUploads: boolean;
  hasContradictoryEvidence: boolean;
  contradictionReport?: ContradictionReport;
  groundingExplanation: string;
  guidanceForResponse: string;
}

export class EvidenceConfidenceEngine {
  /**
   * Evaluates evidence strength across retrieved RAG chunks, knowledge graph, and external web sources
   */
  public evaluateEvidence(params: {
    query: string;
    ragHits: RagHit[];
    validCitations: CitationRef[];
    graphContext?: string;
    webHits?: WebHit[];
    sharedAnswerFound?: boolean;
  }): EvidenceEvaluationResult {
    const { query, ragHits, validCitations, graphContext, webHits = [], sharedAnswerFound } = params;

    const queryLower = (query || '').toLowerCase();
    const STOP_WORDS = new Set(['what', 'which', 'where', 'when', 'does', 'that', 'this', 'have', 'with', 'from', 'about', 'explain']);
    const cleanQuery = queryLower.replace(/['']/g, '').replace(/[^a-z0-9\s]/g, ' ');
    const queryTokens = Array.from(new Set(
      cleanQuery.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    ));

    // 1. Detect Potential Contradictions Between Uploaded Sources
    const contradictionReport = this.detectContradictions(ragHits);

    if (contradictionReport.hasContradiction) {
      return {
        confidenceTier: 'CONFLICTING_EVIDENCE',
        confidenceLabel: 'Conflicting Classroom Evidence',
        isGroundedInUploads: true,
        hasContradictoryEvidence: true,
        contradictionReport,
        groundingExplanation:
          'Multiple uploaded documents contain differing or contradictory claims regarding this topic.',
        guidanceForResponse: `Highlight the academic discrepancy clearly: "${contradictionReport.explanation}". Cite both sources so the student understands the different perspectives.`,
      };
    }

    // 2. High Evidence: Multiple verified excerpts directly cover the key terms of the query
    if (ragHits.length >= 2 && validCitations.length >= 1) {
      const cleanAllChunksText = ragHits
        .map((h) => h.text.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9\s]/g, ' '))
        .join(' ');
      const matchedTokens = queryTokens.filter((token) => cleanAllChunksText.includes(token));
      const coverage = queryTokens.length > 0 ? matchedTokens.length / queryTokens.length : 1;

      if (coverage >= 0.6) {
        return {
          confidenceTier: 'HIGH_EVIDENCE',
          confidenceLabel: 'Strong Classroom Evidence',
          isGroundedInUploads: true,
          hasContradictoryEvidence: false,
          groundingExplanation: `Directly supported by ${validCitations.length} verified excerpt(s) in uploaded materials.`,
          guidanceForResponse: 'Answer directly from verified classroom materials with precise document and page citations.',
        };
      }
    }

    // 3. Partial Evidence: 1 chunk or partial coverage
    if (ragHits.length >= 1 || (graphContext && graphContext.length > 50) || sharedAnswerFound) {
      return {
        confidenceTier: 'PARTIAL_EVIDENCE',
        confidenceLabel: 'Partial Classroom Evidence',
        isGroundedInUploads: ragHits.length > 0,
        hasContradictoryEvidence: false,
        groundingExplanation:
          'Some aspects are grounded in classroom literature, but full details require curriculum synthesis.',
        guidanceForResponse:
          'Clearly distinguish what is directly established in the uploaded notes versus what is supplemented from standard curriculum principles.',
      };
    }

    // 4. Insufficient Evidence: Zero RAG hits or query outside course materials
    return {
      confidenceTier: 'INSUFFICIENT_EVIDENCE',
      confidenceLabel: 'Insufficient Classroom Evidence',
      isGroundedInUploads: false,
      hasContradictoryEvidence: false,
      groundingExplanation:
        'The available materials in your authorized classroom library do not establish this answer.',
      guidanceForResponse:
        'Explicitly state: "The uploaded materials in your classroom library do not establish this answer." Offer a general educational overview based on standard curriculum standards without inventing citations.',
    };
  }

  /**
   * Scans multiple retrieved chunks for explicit numeric or conceptual contradictions
   */
  private detectContradictions(ragHits: RagHit[]): ContradictionReport {
    if (ragHits.length < 2) {
      return { hasContradiction: false, topic: '' };
    }

    // Check for common contradictions in computer science notes (e.g. quantum length, priority ordering)
    for (let i = 0; i < ragHits.length; i++) {
      for (let j = i + 1; j < ragHits.length; j++) {
        const textA = ragHits[i].text.toLowerCase();
        const textB = ragHits[j].text.toLowerCase();

        // Check 1: Non-preemptive vs Preemptive definition conflict
        if (
          (textA.includes('round robin is non-preemptive') && textB.includes('round robin is preemptive')) ||
          (textB.includes('round robin is non-preemptive') && textA.includes('round robin is preemptive'))
        ) {
          return {
            hasContradiction: true,
            topic: 'Preemption in Round Robin',
            sourceA: `"${ragHits[i].docTitle}" (Page ${ragHits[i].pageNumber})`,
            sourceB: `"${ragHits[j].docTitle}" (Page ${ragHits[j].pageNumber})`,
            explanation: `Source ${ragHits[i].docTitle} asserts Round Robin is non-preemptive, whereas Source ${ragHits[j].docTitle} defines it as preemptive. (Preemptive is the standard definition).`,
          };
        }

        // Check 2: Contradictory time quantum recommendations
        const quantumMatchA = textA.match(/time\s+quantum\s+(?:should\s+be|is)\s+(\d+)\s*(?:ms|milliseconds)/i);
        const quantumMatchB = textB.match(/time\s+quantum\s+(?:should\s+be|is)\s+(\d+)\s*(?:ms|milliseconds)/i);

        if (quantumMatchA && quantumMatchB && Math.abs(Number(quantumMatchA[1]) - Number(quantumMatchB[1])) > 50) {
          return {
            hasContradiction: true,
            topic: 'Recommended Time Quantum',
            sourceA: `"${ragHits[i].docTitle}" (Page ${ragHits[i].pageNumber}): ${quantumMatchA[1]}ms`,
            sourceB: `"${ragHits[j].docTitle}" (Page ${ragHits[j].pageNumber}): ${quantumMatchB[1]}ms`,
            explanation: `Uploaded notes disagree on ideal time quantum: ${ragHits[i].docTitle} recommends ${quantumMatchA[1]}ms while ${ragHits[j].docTitle} recommends ${quantumMatchB[1]}ms.`,
          };
        }
      }
    }

    return { hasContradiction: false, topic: '' };
  }
}

export const evidenceConfidenceEngine = new EvidenceConfidenceEngine();
