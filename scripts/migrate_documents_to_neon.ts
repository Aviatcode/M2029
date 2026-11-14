import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isNeonConfigured, queryNeon, sanitizeDbError } from '../src/server/db/neonClient.js';
import { calculateSimHash } from '../src/server/storage/documentDeduplicationService.js';
import { documentStorageService } from '../src/server/storage/documentStorageService.js';
import { extractTextFromPdf } from '../src/server/rag/pdfExtractor.js';
import { chunkDocument } from '../src/server/rag/chunker.js';

interface MigrationStats {
  filesScanned: number;
  assetsCreated: number;
  assetsReused: number;
  chunksMigrated: number;
  uploadsCreated: number;
  bytesProcessed: number;
}

async function migrateDocumentsToNeon() {
  console.log('=================================================================');
  console.log('🚀 M2029 PHASE 2: DOCUMENT & CHUNK MIGRATION TO NEON POSTGRESQL');
  console.log('=================================================================\n');

  if (!isNeonConfigured()) {
    console.error('❌ Cannot run migration: DATABASE_URL is not configured.');
    process.exit(1);
  }

  const stats: MigrationStats = {
    filesScanned: 0,
    assetsCreated: 0,
    assetsReused: 0,
    chunksMigrated: 0,
    uploadsCreated: 0,
    bytesProcessed: 0,
  };

  const uploadDir = path.resolve(process.cwd(), 'curriculum-repo', 'uploads');
  const ragStoreDir = path.resolve(process.cwd(), 'curriculum-repo', 'rag_store');
  const registryFile = path.join(ragStoreDir, 'registry.json');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 1. Scan registry.json if present
  let registryDocs: any[] = [];
  if (fs.existsSync(registryFile)) {
    try {
      const raw = fs.readFileSync(registryFile, 'utf-8');
      const parsed = JSON.parse(raw);
      registryDocs = Array.isArray(parsed) ? parsed : Object.values(parsed);
      console.log(`📋 Found ${registryDocs.length} document(s) in registry.json`);
    } catch (err: any) {
      console.warn('⚠️ Could not parse registry.json:', err?.message || err);
    }
  }

  // 2. Scan upload directory for physical files
  const physicalFiles = fs.readdirSync(uploadDir).filter((f) => !f.startsWith('.'));
  console.log(`📁 Found ${physicalFiles.length} physical file(s) in ${uploadDir}`);

  // Combine files from registry and upload directory
  const filesToProcess = new Set<string>();
  for (const f of physicalFiles) {
    filesToProcess.add(path.join(uploadDir, f));
  }
  for (const doc of registryDocs) {
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      filesToProcess.add(doc.storagePath);
    } else if (doc.fileName && fs.existsSync(path.join(uploadDir, doc.fileName))) {
      filesToProcess.add(path.join(uploadDir, doc.fileName));
    }
  }

  console.log(`🔍 Total unique files to inspect: ${filesToProcess.size}\n`);

  for (const filePath of filesToProcess) {
    try {
      stats.filesScanned++;
      const fileName = path.basename(filePath);
      const stat = fs.statSync(filePath);
      stats.bytesProcessed += stat.size;

      // Calculate streaming SHA-256
      const hashSum = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      for await (const chunk of stream) {
        hashSum.update(chunk);
      }
      const sha256 = hashSum.digest('hex');

      console.log(`[Processing] File: "${fileName}" (Size: ${(stat.size / 1024).toFixed(1)} KB, SHA-256: ${sha256.slice(0, 12)}...)`);

      // Check if already in document_assets
      const existingAssets = await queryNeon(
        `SELECT sha256_hash, reference_count FROM document_assets WHERE sha256_hash = $1`,
        [sha256]
      );

      const fileExt = path.extname(fileName).replace(/^\./, '').toLowerCase() || 'pdf';
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/^[0-9]+_/, '').replace(/[_-]/g, ' ');
      const storageKey = `${sha256}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      if (existingAssets.length > 0) {
        console.log(`  ⚡ Asset already exists in Neon. Ensuring upload record...`);
        stats.assetsReused++;
      } else {
        // Extract text & chunks
        let extractedText = '';
        let pageCount = 1;
        let chunks: any[] = [];
        let tableOfContents: any[] = [];

        // Check if chunks JSON already exists in rag_store
        const matchedDoc = registryDocs.find((d) => d.fileName === fileName || d.storagePath === filePath);
        const docId = matchedDoc?.id || `doc-${sha256.slice(0, 12)}`;
        const chunkFile = path.join(ragStoreDir, `chunks_${docId}.json`);

        if (fs.existsSync(chunkFile)) {
          try {
            const rawChunks = fs.readFileSync(chunkFile, 'utf-8');
            chunks = JSON.parse(rawChunks);
            pageCount = matchedDoc?.pageCount || 1;
            tableOfContents = matchedDoc?.tableOfContents || [];
            extractedText = chunks.map((c) => c.text).join('\n\n');
            console.log(`  📄 Loaded ${chunks.length} existing chunk(s) from ${path.basename(chunkFile)}`);
          } catch {}
        }

        if (chunks.length === 0) {
          if (fileExt === 'pdf') {
            try {
              const pdfRes = await extractTextFromPdf(filePath);
              extractedText = pdfRes.text;
              pageCount = pdfRes.pageCount || 1;
            } catch (err: any) {
              console.warn(`  ⚠️ PDF extraction fallback for ${fileName}:`, err?.message || err);
              extractedText = `Document: ${cleanTitle}`;
            }
          } else {
            try {
              extractedText = fs.readFileSync(filePath, 'utf-8');
              pageCount = Math.max(1, Math.round(extractedText.length / 2500));
            } catch {
              extractedText = `Document: ${cleanTitle}`;
            }
          }

          const chunkRes = chunkDocument(docId, cleanTitle, fileName, extractedText, {
            chunkSize: 1200,
            overlap: 200,
            pageCount,
          });
          chunks = chunkRes.chunks;
          tableOfContents = chunkRes.tableOfContents || [];
        }

        const textFingerprint = calculateSimHash(extractedText);
        const wordCount = extractedText.split(/\s+/).length;
        const summary = `Synthesized overview of ${cleanTitle}. Total pages: ${pageCount}, Words: ${wordCount}.`;

        // Store file through documentStorageService
        const storageMeta = await documentStorageService.storeFile({
          key: storageKey,
          filePath,
          mimeType: fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream',
          expectedSha256: sha256,
        });

        // Insert into document_assets
        await queryNeon(
          `INSERT INTO document_assets (
            sha256_hash, storage_key, storage_provider, storage_url, file_size, mime_type,
            original_name, text_fingerprint, page_count, word_count, extracted_summary,
            table_of_contents, reference_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
          ON CONFLICT (sha256_hash) DO NOTHING`,
          [
            sha256,
            storageKey,
            storageMeta.storageProvider,
            storageMeta.storageUrl || `/api/materials/download/${encodeURIComponent(storageKey)}`,
            stat.size,
            fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream',
            fileName,
            textFingerprint,
            pageCount,
            wordCount,
            summary,
            JSON.stringify(tableOfContents),
          ]
        );

        // Insert chunks into document_chunks
        for (const chunk of chunks) {
          const chunkId = `chk-${sha256.slice(0, 8)}-${chunk.chunkIndex}`;
          await queryNeon(
            `INSERT INTO document_chunks (
              id, asset_hash, chunk_index, section_title, page_number, text, word_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING`,
            [
              chunkId,
              sha256,
              chunk.chunkIndex,
              chunk.sectionTitle || cleanTitle,
              chunk.pageNumber || 1,
              chunk.text,
              chunk.wordCount || 1,
            ]
          );
          stats.chunksMigrated++;
        }

        stats.assetsCreated++;
        console.log(`  ✅ Stored physical asset and migrated ${chunks.length} chunks to Neon.`);
      }

      // Ensure upload record in document_uploads
      const uploadId = `mat-migrated-${sha256.slice(0, 8)}`;
      await queryNeon(
        `INSERT INTO document_uploads (
          id, asset_hash, class_id, subject_id, subject_name, title, file_name,
          uploader_name, uploader_role, verification_status, access_permission, version, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12)
        ON CONFLICT (id) DO NOTHING`,
        [
          uploadId,
          sha256,
          'class-m2029',
          'sub-general',
          'General Academic Curriculum',
          cleanTitle,
          fileName,
          'Migration Engine',
          'teacher',
          'teacher_verified',
          'class_shared',
          JSON.stringify({ migratedAt: new Date().toISOString() }),
        ]
      );
      stats.uploadsCreated++;

    } catch (fileErr: any) {
      console.error(`  ❌ Error processing file ${path.basename(filePath)}:`, sanitizeDbError(fileErr).message);
    }
  }

  console.log('\n=================================================================');
  console.log('🎉 MIGRATION COMPLETE SUMMARY:');
  console.log('=================================================================');
  console.log(`• Files Scanned:          ${stats.filesScanned}`);
  console.log(`• New Assets Created:     ${stats.assetsCreated}`);
  console.log(`• Assets Reused:          ${stats.assetsReused}`);
  console.log(`• Chunks Persisted:       ${stats.chunksMigrated}`);
  console.log(`• Upload Records Synced:  ${stats.uploadsCreated}`);
  console.log(`• Total Bytes Processed:  ${(stats.bytesProcessed / 1024).toFixed(1)} KB`);
  console.log('=================================================================\n');
}

migrateDocumentsToNeon().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
