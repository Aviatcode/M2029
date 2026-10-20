import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ragEngine } from './ragIndex.js';
import { AcademicMaterial } from '../../types/index.js';
import {
  fetchAndIngestFromGitHub,
  uploadDocToGitHubRelease,
  browseGitHubRepo,
  getGitHubConfig,
} from './githubStorage.js';

export const ragRouter = Router();

// Configure Multer with Disk Storage for direct streaming up to 500MB without RAM spikes
const uploadDir = ragEngine.getUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 Megabytes!
  },
});

// Helper reference to classroom DB (set by routes.ts)
let dbRef: any = null;
export function setDbReference(db: any) {
  dbRef = db;
}

/**
 * 1. Stream & Ingest Large Document (up to 500MB)
 * Supports multipart/form-data
 */
ragRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file received in multipart request.' });
    }

    const {
      classId = 'class-bca-2028',
      subjectId,
      subjectName,
      title,
      uploaderName,
      uploaderRole,
    } = req.body;

    const fileExt = path.extname(file.originalname).replace(/^\./, '').toLowerCase() || 'pdf';
    const cleanTitle = (title || file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();

    console.log(`[RAG Upload] Received file "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(1)} MB). Starting RAG ingestion...`);

    // Ingest into RAG Engine (chunking, indexing, active in memory)
    const ragDoc = await ragEngine.ingestFile({
      filePath: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: fileExt,
      fileSize: file.size,
      classId,
      subjectId,
      subjectName: subjectName || 'Core Curriculum',
      title: cleanTitle,
    });

    // Create corresponding AcademicMaterial entry so it shows in Materials & SmartDump
    const materialId = `mat-${Date.now()}`;
    ragDoc.materialId = materialId;

    const newMaterial: AcademicMaterial = {
      id: materialId,
      classId,
      subjectId: subjectId || 'sub-general',
      subjectName: subjectName || 'Core Curriculum',
      title: cleanTitle,
      fileName: file.originalname,
      fileType: fileExt as any,
      fileSize: ragDoc.fileSizeFormatted,
      uploaderName: uploaderName || 'Student',
      uploaderRole: uploaderRole || 'student',
      verificationStatus: 'teacher_verified',
      createdAt: 'Just now',
      ragDocId: ragDoc.id,
      resources: {
        summary: ragDoc.summary || `Synthesized overview of ${cleanTitle}. Extracted ${ragDoc.chunkCount} active chunks for deep question retrieval.`,
        hinglishSummary: `Is textbook (${cleanTitle}) ke saare chapters backend par active hain, aap direct koi bhi topic ya algorithm search kar sakte ho.`,
        mindmapMermaid: `graph TD\n  A[${cleanTitle.slice(0, 25)}] --> B[Active RAG Chunks: ${ragDoc.chunkCount}]\n  A --> C[Total Pages: ${ragDoc.pageCount || 1}]\n  A --> D[Full Text Indexed]`,
        keyConcepts: (ragDoc.tableOfContents || []).slice(0, 4).map((toc) => ({
          concept: toc.title,
          explanation: `Indexed at Chunk #${toc.chunkIndex} (Page ${toc.page || 1})`,
        })),
        importantDefinitions: [
          {
            term: cleanTitle,
            definition: `Active university textbook stored on backend (${ragDoc.fileSizeFormatted}). Accessible via RAG semantic search.`,
          },
        ],
        examples: [],
        examPoints: [
          `Contains ${ragDoc.chunkCount} active searchable chunks`,
          `Estimated ${ragDoc.pageCount || 1} pages parsed & indexed`,
          'Direct citation retrieval available in AI Tutor',
        ],
        flashcards: [],
        quiz: [],
        possibleQuestions: [],
        relatedPYQs: [],
      },
    };

    if (dbRef && dbRef.materials) {
      if (!dbRef.materials[classId]) {
        dbRef.materials[classId] = [];
      }
      dbRef.materials[classId].unshift(newMaterial);
      if (typeof dbRef.saveToDisk === 'function') {
        dbRef.saveToDisk();
      }
    }

    res.json({
      status: 'success',
      message: `⚡ Document indexed successfully! ${ragDoc.chunkCount} chunks are now active on the backend.`,
      document: ragDoc,
      material: newMaterial,
    });
  } catch (err: any) {
    console.error('[RAG Upload Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to upload and index document.' });
  }
});

/**
 * 2. Get All Active RAG Documents
 */
ragRouter.get('/documents', (req: Request, res: Response) => {
  const classId = req.query.classId as string;
  const docs = ragEngine.getDocuments(classId);
  res.json({
    status: 'success',
    count: docs.length,
    documents: docs,
  });
});

/**
 * 3. Get Single Document Details & TOC
 */
ragRouter.get('/document/:docId', (req: Request, res: Response) => {
  const doc = ragEngine.getDocument(req.params.docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  res.json({
    status: 'success',
    document: doc,
  });
});

/**
 * 4. Browse / Paginate Chunks of a Specific Document
 */
ragRouter.get('/document/:docId/chunks', (req: Request, res: Response) => {
  const { docId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const filter = req.query.filter as string;

  const doc = ragEngine.getDocument(docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const result = ragEngine.getDocChunks(docId, page, pageSize, filter);
  res.json({
    status: 'success',
    document: doc,
    ...result,
  });
});

/**
 * 5. Fetch a Single Exact Chunk by Index
 */
ragRouter.get('/document/:docId/chunk/:chunkIndex', (req: Request, res: Response) => {
  const { docId, chunkIndex } = req.params;
  const chunk = ragEngine.fetchChunk(docId, parseInt(chunkIndex));
  if (!chunk) {
    return res.status(404).json({ error: 'Chunk not found.' });
  }
  res.json({
    status: 'success',
    chunk,
  });
});

/**
 * 6. Search across Active Documents (BM25 Semantic Hybrid)
 */
ragRouter.post('/query', (req: Request, res: Response) => {
  const { query, docId, classId, subjectId, limit } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query string is required.' });
  }

  const results = ragEngine.search(query.trim(), {
    docId,
    classId,
    subjectId,
    limit: limit || 8,
  });

  res.json({
    status: 'success',
    query: query.trim(),
    count: results.length,
    results,
  });
});

/**
 * 7. Grounded Q&A against Active Documents
 */
ragRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const { question, query, docId, classId, subjectId, geminiApiKey, tutorMode } = req.body;
    const userQuery = question || query;

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const result = await ragEngine.askQuestion(userQuery.trim(), {
      docId,
      classId,
      subjectId,
      geminiApiKey,
      tutorMode,
    });

    res.json({
      status: 'success',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'RAG Q&A evaluation error.' });
  }
});

/**
 * 8. Download / Stream Original File
 */
ragRouter.get('/file/:docId', (req: Request, res: Response) => {
  const doc = ragEngine.getDocument(req.params.docId);
  if (!doc || !fs.existsSync(doc.storagePath)) {
    return res.status(404).json({ error: 'File not found on backend storage.' });
  }

  const stat = fs.statSync(doc.storagePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Support Byte-Range Streaming (essential for PDF viewers and large files)
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(doc.storagePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': doc.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': doc.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
    };
    res.writeHead(200, head);
    fs.createReadStream(doc.storagePath).pipe(res);
  }
});

/**
 * 9. Overall RAG Engine Stats
 */
ragRouter.get('/stats', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    stats: ragEngine.getStats(),
  });
});

/**
 * 10. Delete Document & Chunks
 */
ragRouter.delete('/document/:docId', (req: Request, res: Response) => {
  const deleted = ragEngine.deleteDocument(req.params.docId);
  if (!deleted) {
    return res.status(404).json({ error: 'Document not found or could not be deleted.' });
  }
  res.json({
    status: 'success',
    message: 'Document and its active RAG index deleted successfully.',
  });
});

/**
 * 11. Fetch & Ingest File Directly from GitHub URL
 * Supports: GitHub blob, raw, release asset download URLs
 */
ragRouter.post('/github/fetch', async (req: Request, res: Response) => {
  try {
    const { url, token, classId, subjectId, subjectName, title, uploaderName } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'GitHub URL is required.' });
    }

    const customToken = token || (req.headers['x-github-token'] as string);

    const result = await fetchAndIngestFromGitHub({
      url: url.trim(),
      token: customToken,
      classId,
      subjectId,
      subjectName,
      title,
      uploaderName,
      dbRef,
    });

    res.json({
      status: 'success',
      message: `⚡ Successfully fetched from GitHub and indexed ${result.document.chunkCount} chunks into active RAG memory!`,
      document: result.document,
      material: result.material,
    });
  } catch (err: any) {
    console.error('[GitHub Fetch Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch and index file from GitHub.' });
  }
});

/**
 * 12. Upload Active Document to GitHub Release Asset (up to 2 GB)
 */
ragRouter.post('/github/upload', async (req: Request, res: Response) => {
  try {
    const { docId, repo, token, tagName } = req.body;
    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }

    const customToken = token || (req.headers['x-github-token'] as string);

    const result = await uploadDocToGitHubRelease({
      docId,
      repo,
      token: customToken,
      tagName,
      dbRef,
    });

    res.json({
      ...result,
      message: `☁️ Successfully backed up document to GitHub Releases! File is now permanently hosted on GitHub CDN.`,
    });
  } catch (err: any) {
    console.error('[GitHub Release Upload Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to upload document to GitHub Release.' });
  }
});

/**
 * 13. Browse Files in a GitHub Repository
 */
ragRouter.get('/github/browse', async (req: Request, res: Response) => {
  try {
    const repo = (req.query.repo as string) || undefined;
    const path = (req.query.path as string) || undefined;
    const token = (req.query.token as string) || (req.headers['x-github-token'] as string);

    const result = await browseGitHubRepo({
      repo,
      path,
      token,
    });

    res.json({
      status: 'success',
      ...result,
    });
  } catch (err: any) {
    console.error('[GitHub Browse Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to browse GitHub repository.' });
  }
});

/**
 * 14. Get GitHub Config & Status
 */
ragRouter.get('/github/config', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    config: getGitHubConfig(),
  });
});
