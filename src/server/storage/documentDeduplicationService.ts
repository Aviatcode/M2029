import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getNeonSql, isNeonConfigured, sanitizeDbError } from '../db/neonClient.js';
import { documentStorageService } from './documentStorageService.js';
import { extractTextFromPdf } from '../rag/pdfExtractor.js';
import { chunkDocument } from '../rag/chunker.js';
import { ragEngine } from '../rag/ragIndex.js';
import { AcademicMaterial, UserRole, VerificationStatus } from '../../types/index.js';

export interface IngestionInputParams {
  filePath: string;
  originalName: string;
  mimeType?: string;
  fileSize?: number;
  classId?: string;
  subjectId?: string;
  subjectName?: string;
  title?: string;
  uploaderName?: string;
  uploaderRole?: UserRole;
  accessPermission?: 'class_shared' | 'private' | 'public';
}

export interface IngestionResult {
  status: 'created' | 'deduplicated';
  isDuplicate: boolean;
  sha256: string;
  assetHash: string;
  uploadId: string;
  materialId: string;
  title: string;
  fileName: string;
  fileSizeFormatted: string;
  pageCount: number;
  chunkCount: number;
  material: AcademicMaterial;
  version: number;
  duplicateOf?: string;
  nearDuplicateWarning?: string;
  savedProcessingTimeMs?: number;
}

/**
 * 64-bit SimHash for near-duplicate and content-based text detection
 */
export function calculateSimHash(text: string): string {
  if (!text || text.trim().length === 0) return '0000000000000000';

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (tokens.length === 0) return '0000000000000000';

  // 64-dimensional accumulator vector
  const v = new Array(64).fill(0);

  for (const token of tokens) {
    // 64-bit hash from token MD5
    const hashHex = crypto.createHash('md5').update(token).digest('hex').slice(0, 16);
    const hashBigInt = BigInt('0x' + hashHex);

    for (let i = 0; i < 64; i++) {
      const bit = (hashBigInt >> BigInt(i)) & 1n;
      if (bit === 1n) {
        v[i] += 1;
      } else {
        v[i] -= 1;
      }
    }
  }

  // Construct 64-bit binary fingerprint
  let fingerprint = 0n;
  for (let i = 0; i < 64; i++) {
    if (v[i] > 0) {
      fingerprint |= 1n << BigInt(i);
    }
  }

  return fingerprint.toString(16).padStart(16, '0');
}

/**
 * Calculate Hamming distance between two 64-bit SimHash hex strings
 */
export function calculateSimHashDistance(hash1: string, hash2: string): number {
  try {
    const b1 = BigInt('0x' + hash1);
    const b2 = BigInt('0x' + hash2);
    let xor = b1 ^ b2;
    let distance = 0;
    while (xor > 0n) {
      if (xor & 1n) distance++;
      xor >>= 1n;
    }
    return distance;
  } catch {
    return 64;
  }
}

export class DocumentDeduplicationService {
  /**
   * Stream and calculate SHA-256 hash of a file on disk
   */
  async calculateFileSha256(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Central upload processing pipeline with intelligent two-layer deduplication:
   * Layer 1: Streaming SHA-256 Content Hash (Exact Duplicate)
   * Layer 2: Text SimHash & Page-Level Fingerprints (Content-Based / Renamed Duplicate)
   */
  async processUpload(params: IngestionInputParams): Promise<IngestionResult> {
    const startTime = Date.now();
    const filePath = params.filePath;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Upload file not found at path: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const fileSize = params.fileSize || stat.size;
    const originalName = params.originalName || path.basename(filePath);
    const classId = params.classId || 'class-m2029';
    const subjectId = params.subjectId || 'sub-general';
    const subjectName = params.subjectName || 'General Academic Curriculum';
    const cleanTitle = (params.title || originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();
    const uploaderName = params.uploaderName || 'Student';
    const uploaderRole = params.uploaderRole || 'student';
    const accessPermission = params.accessPermission || 'class_shared';
    const fileExt = path.extname(originalName).replace(/^\./, '').toLowerCase() || 'pdf';

    // 1. Calculate streaming SHA-256 fingerprint
    const sha256 = await this.calculateFileSha256(filePath);

    // 2. Exact Duplicate Check against Neon database
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          const existingAssets = await (sql as any).query(
            `SELECT * FROM document_assets WHERE sha256_hash = $1 LIMIT 1`,
            [sha256]
          );

          if (existingAssets && existingAssets.length > 0) {
            const asset = existingAssets[0];
            const uploadId = `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            console.log(`[Deduplication Engine] ⚡ EXACT DUPLICATE DETECTED for "${originalName}" (SHA-256: ${sha256.slice(0, 12)}...). Reusing physical asset.`);

            // Atomically increment reference count
            await (sql as any).query(
              `UPDATE document_assets SET reference_count = reference_count + 1, updated_at = NOW() WHERE sha256_hash = $1`,
              [sha256]
            );

            // Record distinct upload for the student & class
            await (sql as any).query(
              `INSERT INTO document_uploads (
                id, asset_hash, class_id, subject_id, subject_name, title, file_name,
                uploader_name, uploader_role, verification_status, access_permission, version, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12)`,
              [
                uploadId,
                sha256,
                classId,
                subjectId,
                subjectName,
                cleanTitle,
                originalName,
                uploaderName,
                uploaderRole,
                'teacher_verified',
                accessPermission,
                JSON.stringify({
                  originalAssetFileName: asset.original_name,
                  reusedAsset: true,
                  deduplicatedAt: new Date().toISOString(),
                }),
              ]
            );

            // Construct standard AcademicMaterial representation
            const material: AcademicMaterial = {
              id: uploadId,
              classId,
              subjectId,
              subjectName,
              title: cleanTitle,
              fileName: originalName,
              fileType: fileExt as any,
              fileSize: this.formatBytes(Number(asset.file_size)),
              uploaderName,
              uploaderRole,
              verificationStatus: 'teacher_verified',
              createdAt: 'Just now',
              ragDocId: `doc-${sha256.slice(0, 12)}`,
              chunkCount: Number(asset.page_count) || 1,
              downloadUrl: `/api/materials/download/${encodeURIComponent(asset.storage_key)}`,
              resources: {
                summary: asset.extracted_summary || `Synthesized overview of ${cleanTitle}. Reused verified academic index with 0 duplicate storage.`,
                hinglishSummary: `Is verified material (${cleanTitle}) ko cloud library se instantly reuse kiya gaya hai bina duplicate storage ke.`,
                mindmapMermaid: `graph TD\n  A[${cleanTitle.slice(0, 20)}] --> B[Verified Shared Asset]\n  A --> C[SHA-256 Verified: ${sha256.slice(0, 8)}]\n  A --> D[Full Text Search Active]`,
                keyConcepts: [],
                importantDefinitions: [
                  { term: cleanTitle, definition: `Verified university study material (${this.formatBytes(Number(asset.file_size))}). Reused via SHA-256 deduplication.` },
                ],
                examples: [],
                examPoints: [
                  'Instant verified classroom fetch (0 duplicate processing tokens)',
                  'Direct citation retrieval available in AI Tutor',
                ],
                flashcards: [],
                quiz: [],
                possibleQuestions: [],
                relatedPYQs: [],
              },
            };

            // Discard temporary incoming file safely now that asset is verified
            try {
              if (fs.existsSync(filePath)) {
                // If it's not the stored asset file itself, remove the temp copy
                const storageDir = documentStorageService.getLocalProvider().getStorageDir();
                const canonicalStoredPath = path.join(storageDir, asset.storage_key);
                if (path.resolve(filePath) !== path.resolve(canonicalStoredPath)) {
                  fs.unlinkSync(filePath);
                }
              }
            } catch (err: any) {
              console.warn('[Deduplication] Notice removing temp duplicate upload:', err?.message || err);
            }

            const savedProcessingTimeMs = Date.now() - startTime;
            return {
              status: 'deduplicated',
              isDuplicate: true,
              sha256,
              assetHash: sha256,
              uploadId,
              materialId: uploadId,
              title: cleanTitle,
              fileName: originalName,
              fileSizeFormatted: this.formatBytes(Number(asset.file_size)),
              pageCount: Number(asset.page_count) || 1,
              chunkCount: Number(asset.word_count) ? Math.round(Number(asset.word_count) / 180) : 1,
              material,
              version: 1,
              savedProcessingTimeMs,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Deduplication] Neon exact duplicate check warning:', sanitizeDbError(dbErr).message);
        }
      }
    }

    // 3. New Unique Document Ingestion Pipeline
    console.log(`[Deduplication Engine] Ingesting new unique physical document: "${originalName}" (${this.formatBytes(fileSize)})...`);

    let extractedText = '';
    let pageCount = 1;

    if (fileExt === 'pdf') {
      const pdfRes = await extractTextFromPdf(filePath);
      extractedText = pdfRes.text;
      pageCount = pdfRes.pageCount || 1;
    } else if (fileExt === 'docx') {
      const JSZip = (await import('jszip')).default;
      const buffer = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(buffer);
      const docXml = await zip.file('word/document.xml')?.async('text');
      if (docXml) {
        extractedText = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } else if (fileExt === 'pptx') {
      const JSZip = (await import('jszip')).default;
      const buffer = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter((f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));
      const slideTexts: string[] = [];
      for (const sf of slideFiles) {
        const sXml = await zip.file(sf)?.async('text');
        if (sXml) {
          const cleanSlide = sXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanSlide.length > 5) slideTexts.push(cleanSlide);
        }
      }
      extractedText = slideTexts.join('\n\n--- [Slide Break] ---\n\n');
      pageCount = Math.max(1, slideFiles.length);
    } else {
      try {
        extractedText = fs.readFileSync(filePath, 'utf-8');
        pageCount = Math.max(1, Math.round(extractedText.length / 2500));
      } catch {
        extractedText = `Document: ${originalName}\nTitle: ${cleanTitle}`;
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = `Document: ${originalName}\nTitle: ${cleanTitle}\nSubject: ${subjectName}`;
    }

    // 4. Calculate Content-Based Text Fingerprint (SimHash)
    const textFingerprint = calculateSimHash(extractedText);
    const wordCount = extractedText.split(/\s+/).length;

    // Check for near-duplicates (different bytes, but SimHash distance <= 3)
    let nearDuplicateWarning: string | undefined;
    let documentVersion = 1;

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          const similarAssets = await (sql as any).query(
            `SELECT sha256_hash, original_name, text_fingerprint FROM document_assets WHERE text_fingerprint IS NOT NULL LIMIT 100`
          );
          for (const sim of similarAssets) {
            const distance = calculateSimHashDistance(textFingerprint, sim.text_fingerprint);
            if (distance <= 3) {
              console.log(`[Deduplication Engine] ℹ️ Textually equivalent document detected (SimHash distance: ${distance}) with asset: "${sim.original_name}"`);
              nearDuplicateWarning = `Textually equivalent to existing document: "${sim.original_name}"`;
              documentVersion = 2;
              break;
            }
          }
        } catch {}
      }
    }

    // 5. Store File via Provider-Independent Storage Service
    const storageKey = `${sha256}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageMeta = await documentStorageService.storeFile({
      key: storageKey,
      filePath,
      mimeType: params.mimeType || 'application/pdf',
      expectedSha256: sha256,
    });

    const summary = `Synthesized overview of ${cleanTitle}. Total pages: ${pageCount}, Words: ${wordCount}.`;
    const docId = `doc-${sha256.slice(0, 12)}`;

    // 6. Chunk Document Text
    const chunkingResult = chunkDocument(docId, cleanTitle, originalName, extractedText, {
      chunkSize: 1200,
      overlap: 200,
      pageCount,
    });

    // 7. Persist to Neon Database (document_assets, document_chunks, document_uploads)
    const uploadId = `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          // A. Insert document_assets
          await (sql as any).query(
            `INSERT INTO document_assets (
              sha256_hash, storage_key, storage_provider, storage_url, file_size, mime_type,
              original_name, text_fingerprint, page_count, word_count, extracted_summary,
              table_of_contents, reference_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
            ON CONFLICT (sha256_hash) DO UPDATE SET
              reference_count = document_assets.reference_count + 1,
              updated_at = NOW()`,
            [
              sha256,
              storageKey,
              storageMeta.storageProvider,
              storageMeta.storageUrl || `/api/materials/download/${encodeURIComponent(storageKey)}`,
              fileSize,
              params.mimeType || 'application/pdf',
              originalName,
              textFingerprint,
              pageCount,
              wordCount,
              summary,
              JSON.stringify(chunkingResult.tableOfContents || []),
            ]
          );

          // B. Insert document_chunks (Persists RAG chunks into database)
          for (const chunk of chunkingResult.chunks) {
            const chunkId = `chk-${sha256.slice(0, 8)}-${chunk.chunkIndex}`;
            await (sql as any).query(
              `INSERT INTO document_chunks (
                id, asset_hash, chunk_index, section_title, page_number, text, word_count
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO NOTHING`,
              [
                chunkId,
                sha256,
                chunk.chunkIndex,
                chunk.sectionTitle || cleanTitle,
                chunk.page || 1,
                chunk.text,
                chunk.wordCount || 1,
              ]
            );
          }

          // C. Insert document_uploads
          await (sql as any).query(
            `INSERT INTO document_uploads (
              id, asset_hash, class_id, subject_id, subject_name, title, file_name,
              uploader_name, uploader_role, verification_status, access_permission, version, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              uploadId,
              sha256,
              classId,
              subjectId,
              subjectName,
              cleanTitle,
              originalName,
              uploaderName,
              uploaderRole,
              'teacher_verified',
              accessPermission,
              documentVersion,
              JSON.stringify({
                textFingerprint,
                chunkCount: chunkingResult.chunks.length,
                pageCount,
                storageKey,
              }),
            ]
          );
        } catch (dbErr: any) {
          console.error('[Deduplication] Neon persistence error:', sanitizeDbError(dbErr).message);
          throw sanitizeDbError(dbErr);
        }
      }
    }

    // 8. Register in RAG In-Memory Engine for active BM25 search
    try {
      ragEngine.registerAssetChunks({
        docId,
        title: cleanTitle,
        originalName,
        fileName: originalName,
        fileType: fileExt,
        fileSize,
        classId,
        subjectId,
        subjectName,
        pageCount,
        chunks: chunkingResult.chunks,
        tableOfContents: chunkingResult.tableOfContents,
        summary,
      });
    } catch (ragErr: any) {
      console.warn('[Deduplication] RAG index register notice:', ragErr?.message || ragErr);
    }

    // 9. Construct AcademicMaterial representation
    const material: AcademicMaterial = {
      id: uploadId,
      classId,
      subjectId,
      subjectName,
      title: cleanTitle,
      fileName: originalName,
      fileType: fileExt as any,
      fileSize: this.formatBytes(fileSize),
      uploaderName,
      uploaderRole,
      verificationStatus: 'teacher_verified',
      createdAt: 'Just now',
      ragDocId: docId,
      chunkCount: chunkingResult.chunks.length,
      downloadUrl: storageMeta.storageUrl || `/api/materials/download/${encodeURIComponent(storageKey)}`,
      resources: {
        summary,
        hinglishSummary: `Is textbook (${cleanTitle}) ke saare chapters backend par active hain, aap direct koi bhi topic ya question search kar sakte ho.`,
        mindmapMermaid: `graph TD\n  A[${cleanTitle.slice(0, 20)}] --> B[Active Chunks: ${chunkingResult.chunks.length}]\n  A --> C[Total Pages: ${pageCount}]\n  A --> D[Full Text Indexed]`,
        keyConcepts: (chunkingResult.tableOfContents || []).slice(0, 4).map((toc) => ({
          concept: toc.title,
          explanation: `Indexed at Chunk #${toc.chunkIndex} (Page ${toc.page || 1})`,
        })),
        importantDefinitions: [
          { term: cleanTitle, definition: `University study material (${this.formatBytes(fileSize)}). Accessible via RAG semantic search.` },
        ],
        examples: [],
        examPoints: [
          `Contains ${chunkingResult.chunks.length} active searchable chunks`,
          `Estimated ${pageCount} pages parsed & indexed`,
          'Direct citation retrieval available in AI Tutor',
        ],
        flashcards: [],
        quiz: [],
        possibleQuestions: [],
        relatedPYQs: [],
      },
    };

    return {
      status: 'created',
      isDuplicate: false,
      sha256,
      assetHash: sha256,
      uploadId,
      materialId: uploadId,
      title: cleanTitle,
      fileName: originalName,
      fileSizeFormatted: this.formatBytes(fileSize),
      pageCount,
      chunkCount: chunkingResult.chunks.length,
      material,
      version: documentVersion,
      nearDuplicateWarning,
    };
  }

  /**
   * Verify whether a student/class is authorized to access a document
   */
  async verifyDocumentAccess(uploadId: string, classId: string, studentName?: string): Promise<boolean> {
    if (!isNeonConfigured()) return true;
    const sql = getNeonSql();
    if (!sql) return true;

    try {
      const rows = await (sql as any).query(
        `SELECT id, class_id, uploader_name, access_permission FROM document_uploads WHERE id = $1 LIMIT 1`,
        [uploadId]
      );
      if (rows.length === 0) return false;

      const doc = rows[0];
      if (doc.access_permission === 'public') return true;
      if (doc.class_id === classId) return true;
      if (studentName && doc.uploader_name === studentName) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Safe, reference-counted document deletion
   * Only deletes physical asset and RAG chunks when reference_count reaches 0
   */
  async deleteDocumentUpload(uploadId: string, classId: string): Promise<{ deleted: boolean; assetRemoved: boolean }> {
    if (!isNeonConfigured()) return { deleted: false, assetRemoved: false };
    const sql = getNeonSql();
    if (!sql) return { deleted: false, assetRemoved: false };

    try {
      const uploadRows = await (sql as any).query(
        `SELECT id, asset_hash, class_id FROM document_uploads WHERE id = $1 AND class_id = $2 LIMIT 1`,
        [uploadId, classId]
      );
      if (uploadRows.length === 0) return { deleted: false, assetRemoved: false };

      const upload = uploadRows[0];
      const assetHash = upload.asset_hash;

      // Delete upload record
      await (sql as any).query(`DELETE FROM document_uploads WHERE id = $1`, [uploadId]);

      // Decrement reference count
      const updatedAsset = await (sql as any).query(
        `UPDATE document_assets 
         SET reference_count = reference_count - 1, updated_at = NOW() 
         WHERE sha256_hash = $1 
         RETURNING reference_count, storage_key`,
        [assetHash]
      );

      let assetRemoved = false;
      if (updatedAsset.length > 0 && Number(updatedAsset[0].reference_count) <= 0) {
        // Physical file has no more references: safely delete
        const storageKey = updatedAsset[0].storage_key;
        await documentStorageService.deleteObject(storageKey);
        await (sql as any).query(`DELETE FROM document_assets WHERE sha256_hash = $1`, [assetHash]);
        assetRemoved = true;
        console.log(`[Deduplication Engine] Physical asset "${assetHash}" safely removed (0 references remaining).`);
      }

      return { deleted: true, assetRemoved };
    } catch (err: any) {
      console.error('[Deduplication] Deletion error:', sanitizeDbError(err).message);
      throw sanitizeDbError(err);
    }
  }
}

export const documentDeduplicationService = new DocumentDeduplicationService();
