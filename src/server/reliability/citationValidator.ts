import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import { ragEngine } from '../rag/ragIndex.js';

export type CitationValidationStatus =
  | 'VERIFIED'
  | 'DOCUMENT_NOT_FOUND'
  | 'UNAUTHORIZED_CROSS_CLASS'
  | 'OUTDATED_VERSION'
  | 'INVALID_PAGE_NUMBER'
  | 'UNSUPPORTED_CLAIM'
  | 'FABRICATED';

export interface CitationRef {
  docTitle: string;
  docId?: string;
  pageNumber?: number;
  sectionTitle?: string;
  version?: number;
  snippet?: string;
  retrievalMethod?: string;
  url?: string;
}

export interface CitationValidationResult {
  isValid: boolean;
  status: CitationValidationStatus;
  citation: CitationRef;
  reason: string;
  verifiedVersion?: number;
}

export class CitationValidator {
  /**
   * Validates a single document citation against the authoritative Neon database or local registry
   */
  public async validateCitation(
    citation: CitationRef,
    classId: string,
    claimContext?: string
  ): Promise<CitationValidationResult> {
    const titleClean = (citation.docTitle || '').trim().toLowerCase();

    // Rejection of obvious placeholders or non-existent citations
    if (
      !titleClean ||
      titleClean === 'unknown' ||
      titleClean === 'citation' ||
      titleClean.includes('undefined') ||
      titleClean.includes('null')
    ) {
      return {
        isValid: false,
        status: 'FABRICATED',
        citation,
        reason: 'Malformed or missing document citation title.',
      };
    }

    // 1. Check Neon PostgreSQL
    if (isNeonConfigured()) {
      try {
        // Query matching document, prioritizing active classroom first
        const docs = await queryNeon<any>(
          `SELECT id, class_id, title, version, is_active, page_count 
           FROM academic_materials 
           WHERE (LOWER(title) = $1 OR LOWER(file_name) = $1 OR id = $2)
           ORDER BY (CASE WHEN class_id = $3 THEN 0 WHEN class_id = 'universal' THEN 1 ELSE 2 END), created_at DESC
           LIMIT 5`,
          [titleClean, citation.docId || '', classId || '']
        );

        if (docs.length === 0) {
          // Document does not exist in the database
          return {
            isValid: false,
            status: 'DOCUMENT_NOT_FOUND',
            citation,
            reason: `Document "${citation.docTitle}" does not exist in the academic materials repository.`,
          };
        }

        const matchedDoc = docs[0];

        // Authorization check: Must match student's classroom
        if (matchedDoc.class_id !== classId && matchedDoc.class_id !== 'universal') {
          return {
            isValid: false,
            status: 'UNAUTHORIZED_CROSS_CLASS',
            citation,
            reason: `Document belongs to another classroom (${matchedDoc.class_id}) and cannot be accessed from "${classId}".`,
          };
        }

        // Version check
        if (citation.version && citation.version < matchedDoc.version) {
          return {
            isValid: false,
            status: 'OUTDATED_VERSION',
            citation,
            reason: `Citation references outdated document version v${citation.version}. Active classroom version is v${matchedDoc.version}.`,
            verifiedVersion: matchedDoc.version,
          };
        }

        // Page number check
        if (citation.pageNumber !== undefined && citation.pageNumber !== null) {
          const page = Number(citation.pageNumber);
          if (matchedDoc.page_count && (page <= 0 || page > matchedDoc.page_count + 2)) {
            return {
              isValid: false,
              status: 'INVALID_PAGE_NUMBER',
              citation,
              reason: `Page ${page} does not exist in "${citation.docTitle}" (total pages: ${matchedDoc.page_count}).`,
            };
          }

          // Verify chunk existence if content_hash is available
          let chunks: any[] = [];
          if (matchedDoc.content_hash) {
            chunks = await queryNeon<any>(
              `SELECT id, text FROM document_chunks 
               WHERE asset_hash = $1 AND page_number = $2 
               LIMIT 1`,
              [matchedDoc.content_hash, page]
            );
          }

          if (chunks.length > 0 && claimContext) {
            // Content grounding check: verify chunk actually contains key terms of claim
            const chunkText = (chunks[0].text || '').toLowerCase();
            const claimKeywords = claimContext
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter((w) => w.length > 4);

            const matchedKeywords = claimKeywords.filter((w) => chunkText.includes(w));
            if (claimKeywords.length >= 3 && matchedKeywords.length === 0) {
              return {
                isValid: false,
                status: 'UNSUPPORTED_CLAIM',
                citation,
                reason: `Page ${page} excerpt does not contain supporting keywords for the claim.`,
              };
            }
          }
        }

        return {
          isValid: true,
          status: 'VERIFIED',
          citation: {
            ...citation,
            docId: matchedDoc.id,
            version: matchedDoc.version,
          },
          reason: 'Citation successfully verified against classroom library document and active version.',
          verifiedVersion: matchedDoc.version,
        };
      } catch (err: any) {
        console.warn('[Citation Validator] Neon query notice:', err?.message || err);
      }
    }

    // 2. Fallback check against in-memory ragEngine registry
    const localDocs = ragEngine.getDocuments(classId);
    const localMatch = localDocs.find(
      (d: any) =>
        d.title.toLowerCase() === titleClean ||
        d.fileName.toLowerCase() === titleClean ||
        d.id === citation.docId
    );

    if (!localMatch) {
      return {
        isValid: false,
        status: 'DOCUMENT_NOT_FOUND',
        citation,
        reason: `Document "${citation.docTitle}" not found in local classroom registry.`,
      };
    }

    if (localMatch.classId && localMatch.classId !== classId && localMatch.classId !== 'universal') {
      return {
        isValid: false,
        status: 'UNAUTHORIZED_CROSS_CLASS',
        citation,
        reason: 'Document belongs to an unauthorized workspace.',
      };
    }

    return {
      isValid: true,
      status: 'VERIFIED',
      citation: {
        ...citation,
        docId: localMatch.id,
        version: (localMatch as any).version || 1,
      },
      reason: 'Citation verified against in-memory classroom store.',
      verifiedVersion: (localMatch as any).version || 1,
    };
  }

  /**
   * Filters a list of candidate citations, removing fabricated ones and returning verified ones
   */
  public async validateAndFilterCitations(
    citations: CitationRef[],
    classId: string,
    claimContext?: string
  ): Promise<{
    validCitations: CitationRef[];
    invalidCitations: CitationValidationResult[];
    citationString: string;
  }> {
    const validCitations: CitationRef[] = [];
    const invalidCitations: CitationValidationResult[] = [];

    for (const c of citations) {
      // If web source with real URL, keep as verified web citation
      if (c.url && (c.url.startsWith('http://') || c.url.startsWith('https://'))) {
        validCitations.push(c);
        continue;
      }

      const res = await this.validateCitation(c, classId, claimContext);
      if (res.isValid) {
        validCitations.push(res.citation);
      } else {
        invalidCitations.push(res);
      }
    }

    const citationString = validCitations
      .map((c, i) => {
        if (c.url) {
          return `[Web Source ${i + 1}] "${c.docTitle}" (${c.url})`;
        }
        return `[Source ${i + 1}] "${c.docTitle}" (Page ${c.pageNumber || 1}, Section: ${c.sectionTitle || 'Core Excerpt'}, v${c.version || 1})`;
      })
      .join('\n');

    return { validCitations, invalidCitations, citationString };
  }
}

export const citationValidator = new CitationValidator();
