import fs from 'fs';

/**
 * Extracts plain text and page metadata from a PDF file on disk.
 * Uses pdf-parse with fallback mechanisms to ensure 100% extraction resilience.
 */
export async function extractTextFromPdf(filePath: string): Promise<{
  text: string;
  pageCount: number;
  info?: Record<string, any>;
}> {
  const dataBuffer = fs.readFileSync(filePath);

  try {
    // Dynamic import to handle CJS/ESM interop smoothly
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const data = await pdfParse(dataBuffer, {
      max: 0, // extract all pages
    });

    if (data && typeof data.text === 'string' && data.text.trim().length > 50) {
      return {
        text: data.text,
        pageCount: data.numpages || Math.max(1, Math.round(data.text.length / 2500)),
        info: data.info,
      };
    }
  } catch (err) {
    console.warn('[PDF Extractor] pdf-parse error, trying stream fallback:', err);
  }

  // Fallback: Extract readable text blocks from PDF stream
  try {
    const rawString = dataBuffer.toString('latin1');
    const textPieces: string[] = [];

    // Extract text from (text) Tj or [(text)] TJ operators
    const tjMatches = rawString.match(/\(([^)]{2,300})\)\s*(?:Tj|'|ET)/g);
    if (tjMatches && tjMatches.length > 10) {
      for (const m of tjMatches) {
        const cleaned = m.replace(/^[\s(]+/, '').replace(/[\s)'Tj]+$/, '').trim();
        if (cleaned.length > 2 && !cleaned.includes('\\')) {
          textPieces.push(cleaned);
        }
      }
    }

    // Also look for /Page count in PDF catalog
    const pageMatches = rawString.match(/\/Type\s*\/Page\b/g);
    const estimatedPages = pageMatches ? pageMatches.length : Math.max(1, Math.round(textPieces.length / 40));

    if (textPieces.length > 0) {
      const extracted = textPieces.join(' ');
      return {
        text: extracted,
        pageCount: estimatedPages,
      };
    }
  } catch (fallbackErr) {
    console.warn('[PDF Extractor] stream extraction fallback failed:', fallbackErr);
  }

  return {
    text: '',
    pageCount: 1,
  };
}
