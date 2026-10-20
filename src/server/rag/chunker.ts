import { RagChunk } from './ragTypes.js';

export interface ChunkingOptions {
  chunkSize?: number; // Target characters per chunk (default 1200)
  overlap?: number; // Overlap characters (default 200)
  pageCount?: number; // Total pages if known
}

export interface ChunkingResult {
  chunks: RagChunk[];
  tableOfContents: { title: string; chunkIndex: number; page?: number }[];
  wordCount: number;
}

const SECTION_REGEX = /^(?:chapter|unit|section|module|part|lesson|\d+[\.\)]\s+[A-Z]|[A-Z\s]{4,40}$)/i;

/**
 * Intelligent Document Chunker
 * Chunks documents with semantic boundary awareness (headings, paragraphs, sentences),
 * extracts table of contents, and attaches page and section metadata.
 */
export function chunkDocument(
  docId: string,
  docTitle: string,
  fileName: string,
  fullText: string,
  options: ChunkingOptions = {}
): ChunkingResult {
  const chunkSize = options.chunkSize || 1200;
  const overlap = options.overlap || 200;
  const totalPages = options.pageCount || Math.max(1, Math.round(fullText.length / 2500));

  const chunks: RagChunk[] = [];
  const tableOfContents: { title: string; chunkIndex: number; page?: number }[] = [];

  // Normalize line breaks
  const normalizedText = fullText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalizedText.split(/\n\s*\n/);

  let currentSection = docTitle;
  let currentChunkText = '';
  let chunkIndex = 0;
  let runningCharOffset = 0;
  const totalLength = normalizedText.length || 1;

  const flushChunk = (text: string, force = false) => {
    const trimmed = text.trim();
    if (!trimmed || (trimmed.length < 50 && !force)) return;

    // Estimate page number from relative position in text
    const approxPage = Math.min(
      totalPages,
      Math.max(1, Math.round((runningCharOffset / totalLength) * totalPages))
    );

    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    const chunk: RagChunk = {
      id: `${docId}-c-${chunkIndex}`,
      docId,
      docTitle,
      fileName,
      chunkIndex,
      pageNumber: approxPage,
      sectionTitle: currentSection,
      text: trimmed,
      wordCount: words.length,
      tokenCount: Math.round(trimmed.length / 4),
    };

    chunks.push(chunk);
    chunkIndex++;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;

    runningCharOffset += p.length + 2;

    // Check if this paragraph or its first line looks like a header/section title
    const firstLine = p.split('\n')[0].trim();
    if (firstLine.length < 90 && SECTION_REGEX.test(firstLine)) {
      const cleanHeader = firstLine.replace(/^[#*_\-\s]+/, '').trim();
      if (cleanHeader.length > 3 && cleanHeader.length < 70) {
        currentSection = cleanHeader;
        const approxPage = Math.min(
          totalPages,
          Math.max(1, Math.round((runningCharOffset / totalLength) * totalPages))
        );
        tableOfContents.push({
          title: cleanHeader,
          chunkIndex,
          page: approxPage,
        });
      }
    }

    // If adding this paragraph fits comfortably in the chunk
    if (currentChunkText.length + p.length <= chunkSize) {
      currentChunkText += (currentChunkText ? '\n\n' : '') + p;
    } else {
      // If current chunk has content, flush it
      if (currentChunkText.length > 0) {
        flushChunk(currentChunkText);

        // Keep overlap from end of previous chunk
        if (overlap > 0 && currentChunkText.length > overlap) {
          const overlapText = currentChunkText.slice(-overlap);
          // Try to slice at word boundary
          const spaceIdx = overlapText.indexOf(' ');
          currentChunkText = spaceIdx !== -1 ? overlapText.slice(spaceIdx + 1) : overlapText;
        } else {
          currentChunkText = '';
        }
      }

      // If the paragraph itself is larger than chunkSize, slice it up by sentences
      if (p.length > chunkSize) {
        const sentences = p.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [p];
        for (const s of sentences) {
          if (currentChunkText.length + s.length > chunkSize) {
            flushChunk(currentChunkText);
            currentChunkText = overlap > 0 && currentChunkText.length > overlap
              ? currentChunkText.slice(-overlap)
              : '';
          }
          currentChunkText += (currentChunkText ? ' ' : '') + s.trim();
        }
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + p;
      }
    }
  }

  // Flush remaining text
  if (currentChunkText.trim().length > 0) {
    flushChunk(currentChunkText, true);
  }

  // Fallback if chunks array is empty (e.g. extremely short text)
  if (chunks.length === 0 && fullText.trim().length > 0) {
    flushChunk(fullText, true);
  }

  const allWords = fullText.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    chunks,
    tableOfContents: tableOfContents.slice(0, 50), // Cap TOC at 50 high-level markers
    wordCount: allWords,
  };
}
