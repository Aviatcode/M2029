import { ragEngine } from './ragIndex.js';
import { embeddingService } from './embeddingService.js';
import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import { UniversalKeyConfig } from '../ai/provider.js';
import { RagSearchResult } from './ragTypes.js';

export interface HybridChunkHit {
  chunkId: string;
  docId: string;
  assetHash: string;
  docTitle: string;
  fileName: string;
  classId: string;
  subjectId?: string;
  subjectName?: string;
  pageNumber: number;
  sectionTitle: string;
  chunkIndex: number;
  text: string;
  wordCount: number;
  version: number;
  bm25Score?: number;
  bm25Rank?: number;
  vectorSimilarity?: number;
  vectorRank?: number;
  rrfScore: number;
  retrievalMethod: 'hybrid' | 'bm25_only' | 'vector_only';
}

export interface HybridSearchOptions {
  classId: string;
  subjectId?: string;
  subjectName?: string;
  docId?: string;
  topK?: number;
  bm25Limit?: number;
  vectorLimit?: number;
  minSimilarity?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  rrfK?: number;
  versionPreference?: 'latest' | 'all' | number;
  userAiConfig?: UniversalKeyConfig;
  studentName?: string;
  conversationContext?: {
    previousQuery?: string;
    activeTopic?: string;
    previousAnswer?: string;
  };
}

export interface HybridSearchResponse {
  hits: HybridChunkHit[];
  totalBM25Hits: number;
  totalVectorHits: number;
  resolvedQuery: string;
  isFollowUp: boolean;
  citationString: string;
  retrievalSummary: string;
}

/**
 * Detects if incoming student query is a conversational follow-up
 */
export function resolveFollowUpQuery(
  currentQuery: string,
  context?: { previousQuery?: string; activeTopic?: string; previousAnswer?: string }
): { query: string; isFollowUp: boolean; detectedIntent: string } {
  const q = currentQuery.trim().toLowerCase();

  const followUpTriggers: Array<{ pattern: RegExp; intent: string }> = [
    { pattern: /\b(?:explain\s+(?:that|this|it)\s+again|repeat\s+that|say\s+again|didn't\s+understand|not\s+clear)\b/i, intent: 'repeat_explanation' },
    { pattern: /\b(?:give\s+(?:me\s+)?(?:[\w-]+\s+)*example|another\s+example|real[- ]world\s+example|show\s+(?:me\s+)?an?\s+example|example\s+of\s+(?:this|it))\b/i, intent: 'example' },
    { pattern: /\b(?:what\s+is\s+the\s+difference|compare|versus|vs\.?|difference\s+between)\b/i, intent: 'comparison' },
    { pattern: /\b(?:make\s+it\s+(?:a\s+)?(?:5|10)\s*[- ]?mark(?:er)?|for\s+(?:5|10)\s*marks?|exam\s+format)\b/i, intent: 'exam_marks' },
    { pattern: /\b(?:explain\s+the\s+next\s+topic|what\s+next|next\s+concept|continue)\b/i, intent: 'next_topic' },
    { pattern: /\b(?:more\s+details?|elaborate|deep\s+dive|go\s+deeper|expand\s+on\s+this)\b/i, intent: 'elaborate' },
    { pattern: /\b(?:code\s+for\s+this|program|implementation|pseudo[- ]?code)\b/i, intent: 'code' },
    { pattern: /\b(?:in\s+hinglish|hindi\s+mein|simple\s+bhasha)\b/i, intent: 'hinglish' },
    { pattern: /\b(?:why|how)\s+(?:does\s+it|is\s+this|is\s+that)\b/i, intent: 'how_why' },
  ];

  for (const t of followUpTriggers) {
    if (t.pattern.test(q)) {
      const topic = context?.activeTopic || context?.previousQuery || '';
      if (topic) {
        return {
          query: `${topic} ${currentQuery}`,
          isFollowUp: true,
          detectedIntent: t.intent,
        };
      }
    }
  }

  return { query: currentQuery, isFollowUp: false, detectedIntent: 'direct_question' };
}

export class HybridRetrievalEngine {
  private defaultK = 60; // Standard RRF smoothing constant

  /**
   * Main Hybrid Search Method: BM25 + Vector Semantic Search via Reciprocal Rank Fusion
   */
  async search(
    rawQuery: string,
    options: HybridSearchOptions
  ): Promise<HybridSearchResponse> {
    const classId = options.classId || 'class-m2029';
    const topK = options.topK || 5;
    const bm25Limit = options.bm25Limit || 10;
    const vectorLimit = options.vectorLimit || 10;
    const minSimilarity = options.minSimilarity ?? 0.32;
    const bm25Weight = options.bm25Weight ?? 0.5;
    const vectorWeight = options.vectorWeight ?? 0.5;
    const rrfK = options.rrfK || this.defaultK;

    // 1. Resolve conversational follow-up query context
    const { query, isFollowUp } = resolveFollowUpQuery(rawQuery, options.conversationContext);

    // 2. Fetch Authorized Assets & Latest Version Map for this classroom (Pre-Filtering)
    const authorizedAssetsMap = new Map<string, { latestVersion: number; classId: string; title: string }>();

    if (isNeonConfigured()) {
      try {
        const authRows = await queryNeon<{
          asset_hash: string;
          class_id: string;
          title: string;
          max_v: number;
        }>(
          `SELECT asset_hash, class_id, title, MAX(version) as max_v 
           FROM document_uploads 
           WHERE (class_id = $1 OR access_permission = 'public' ${options.studentName ? 'OR uploader_name = $2' : ''})
           GROUP BY asset_hash, class_id, title`,
          options.studentName ? [classId, options.studentName] : [classId]
        );

        for (const row of authRows) {
          authorizedAssetsMap.set(row.asset_hash, {
            latestVersion: Number(row.max_v) || 1,
            classId: row.class_id,
            title: row.title,
          });
        }
      } catch (err: any) {
        console.warn('[Hybrid Engine] Pre-filter query notice:', err?.message || err);
      }
    }

    // 3. Branch A: BM25 Keyword Retrieval
    const bm25RawHits: RagSearchResult[] = ragEngine.search(query, {
      classId,
      subjectId: options.subjectId,
      docId: options.docId,
      limit: bm25Limit,
    });

    // Filter BM25 hits by classroom authorization
    const bm25Filtered: RagSearchResult[] = [];
    for (const hit of bm25RawHits) {
      const doc = ragEngine.getDocument(hit.docId);
      if (!doc) continue;

      // Extract asset hash from docId: "doc-{sha256.slice(0, 12)}" or check doc.classId
      const normalizeClass = (c?: string) => (c || '').toLowerCase().replace(/^(class-)/, '').trim();
      const isClassMatch =
        !doc.classId ||
        !classId ||
        doc.classId === 'class-shared' ||
        doc.classId === 'public' ||
        normalizeClass(doc.classId) === normalizeClass(classId);
      if (isClassMatch) {
        bm25Filtered.push(hit);
      }
    }

    // 4. Branch B: Vector Semantic Retrieval (via Neon pgvector)
    let vectorRawHits: any[] = [];

    if (isNeonConfigured()) {
      try {
        // Embed the query using BYOK or default provider
        const queryVector = await embeddingService.embedQuery(query, options.userAiConfig);

        if (queryVector && queryVector.length > 0) {
          const vectorStr = `[${queryVector.join(',')}]`;
          vectorRawHits = await queryNeon(
            `SELECT 
              c.id as chunk_id,
              c.asset_hash,
              c.chunk_index,
              c.section_title,
              c.page_number,
              c.text,
              c.word_count,
              u.id as upload_id,
              u.title as doc_title,
              u.file_name,
              u.class_id,
              u.subject_id,
              u.subject_name,
              u.version,
              1 - (ce.embedding <=> $1::vector) as similarity
             FROM chunk_embeddings ce
             JOIN document_chunks c ON ce.chunk_id = c.id
             JOIN document_uploads u ON c.asset_hash = u.asset_hash
             WHERE (u.class_id = $2 OR u.access_permission = 'public' ${options.studentName ? 'OR u.uploader_name = $5' : ''})
               AND 1 - (ce.embedding <=> $1::vector) >= $3
             ORDER BY ce.embedding <=> $1::vector ASC
             LIMIT $4`,
            options.studentName
              ? [vectorStr, classId, minSimilarity, vectorLimit, options.studentName]
              : [vectorStr, classId, minSimilarity, vectorLimit]
          );
        }
      } catch (vecErr: any) {
        console.warn('[Hybrid Engine] Vector search notice (falling back to BM25):', vecErr?.message || vecErr);
      }
    }

    // 5. Combine via Reciprocal Rank Fusion (RRF)
    const combinedChunks = new Map<string, HybridChunkHit>();

    // Process BM25 rankings
    bm25Filtered.forEach((hit, idx) => {
      const chunkId = hit.chunk.id;
      const rank = idx + 1;
      const rrfComponent = bm25Weight / (rrfK + rank);

      combinedChunks.set(chunkId, {
        chunkId,
        docId: hit.docId,
        assetHash: hit.docId.replace(/^doc-/, ''),
        docTitle: hit.docTitle,
        fileName: hit.fileName,
        classId,
        subjectId: options.subjectId,
        pageNumber: hit.pageNumber || 1,
        sectionTitle: hit.sectionTitle || 'Core Content',
        chunkIndex: hit.chunk.chunkIndex,
        text: hit.chunk.text,
        wordCount: hit.chunk.wordCount || 1,
        version: 1,
        bm25Score: Math.round(hit.score * 100) / 100,
        bm25Rank: rank,
        rrfScore: rrfComponent,
        retrievalMethod: 'bm25_only',
      });
    });

    // Process Vector rankings
    vectorRawHits.forEach((vecHit, idx) => {
      const chunkId = vecHit.chunk_id;
      const rank = idx + 1;
      const rrfComponent = vectorWeight / (rrfK + rank);
      const similarity = Math.round(Number(vecHit.similarity) * 1000) / 1000;

      if (combinedChunks.has(chunkId)) {
        // Chunk appeared in BOTH BM25 and Vector search!
        const existing = combinedChunks.get(chunkId)!;
        existing.rrfScore += rrfComponent;
        existing.vectorSimilarity = similarity;
        existing.vectorRank = rank;
        existing.version = Number(vecHit.version) || existing.version;
        existing.retrievalMethod = 'hybrid';
      } else {
        combinedChunks.set(chunkId, {
          chunkId,
          docId: `doc-${vecHit.asset_hash.slice(0, 12)}`,
          assetHash: vecHit.asset_hash,
          docTitle: vecHit.doc_title || 'Classroom Material',
          fileName: vecHit.file_name || 'document.pdf',
          classId: vecHit.class_id,
          subjectId: vecHit.subject_id,
          subjectName: vecHit.subject_name,
          pageNumber: Number(vecHit.page_number) || 1,
          sectionTitle: vecHit.section_title || 'Core Content',
          chunkIndex: Number(vecHit.chunk_index),
          text: vecHit.text,
          wordCount: Number(vecHit.word_count) || 1,
          version: Number(vecHit.version) || 1,
          vectorSimilarity: similarity,
          vectorRank: rank,
          rrfScore: rrfComponent,
          retrievalMethod: 'vector_only',
        });
      }
    });

    // 6. Deduplicate Chunks and Filter Outdated Versions (if requested)
    let candidateHits = Array.from(combinedChunks.values());

    if (options.versionPreference === 'latest' && authorizedAssetsMap.size > 0) {
      candidateHits = candidateHits.filter((hit) => {
        const meta = authorizedAssetsMap.get(hit.assetHash);
        if (!meta) return true;
        // Keep chunk if its version matches latest known version for that asset
        return hit.version >= meta.latestVersion;
      });
    }

    // Sort by descending RRF score
    candidateHits.sort((a, b) => b.rrfScore - a.rrfScore);

    // Deduplicate by text similarity (remove near-identical chunks)
    const finalHits: HybridChunkHit[] = [];
    const seenTexts = new Set<string>();

    for (const h of candidateHits) {
      const textKey = h.text.slice(0, 120).replace(/\s+/g, ' ').toLowerCase();
      if (!seenTexts.has(textKey)) {
        seenTexts.add(textKey);
        finalHits.push(h);
      }
      if (finalHits.length >= topK) break;
    }

    // 7. Construct Citations and Retrieval Summary
    const citations = finalHits.map((h, i) => {
      const methodBadge = h.retrievalMethod === 'hybrid' ? '⚡ Hybrid' : h.retrievalMethod === 'vector_only' ? '🧠 Semantic' : '🔍 Keyword';
      return `[Citation ${i + 1}] "${h.docTitle}" (Page ${h.pageNumber}, Section: ${h.sectionTitle}, v${h.version}) [${methodBadge}]`;
    });

    const citationString = citations.join('\n');
    const retrievalSummary = finalHits.length > 0
      ? `Retrieved ${finalHits.length} verified excerpts (${bm25Filtered.length} BM25 hits, ${vectorRawHits.length} semantic vector hits).`
      : 'No matching classroom document excerpts found.';

    return {
      hits: finalHits,
      totalBM25Hits: bm25Filtered.length,
      totalVectorHits: vectorRawHits.length,
      resolvedQuery: query,
      isFollowUp,
      citationString,
      retrievalSummary,
    };
  }
}

export const hybridRetrievalEngine = new HybridRetrievalEngine();
