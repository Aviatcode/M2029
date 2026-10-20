import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { ragEngine } from './ragIndex.js';
import { RagDocument } from './ragTypes.js';
import { AcademicMaterial } from '../../types/index.js';

export interface ParsedGitHubUrl {
  isValid: boolean;
  owner?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
  fileName?: string;
  downloadUrl?: string;
  isRelease?: boolean;
  releaseTag?: string;
  rawType?: 'blob' | 'raw' | 'release' | 'api' | 'direct';
}

/**
 * Parses any GitHub URL into a direct raw streaming download URL
 */
export function parseGitHubUrl(inputUrl: string): ParsedGitHubUrl {
  try {
    const trimmed = inputUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { isValid: false };
    }

    const url = new URL(trimmed);

    // 1. Release asset download: https://github.com/:owner/:repo/releases/download/:tag/:fileName
    const releaseMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/);
    if (releaseMatch && (url.hostname === 'github.com' || url.hostname === 'www.github.com')) {
      const [, owner, repo, tag, fileName] = releaseMatch;
      return {
        isValid: true,
        owner,
        repo,
        releaseTag: tag,
        fileName: decodeURIComponent(fileName),
        downloadUrl: trimmed,
        isRelease: true,
        rawType: 'release',
      };
    }

    // 2. Raw content: https://raw.githubusercontent.com/:owner/:repo/:branch/:path...
    if (url.hostname === 'raw.githubusercontent.com') {
      const parts = url.pathname.replace(/^\//, '').split('/');
      if (parts.length >= 3) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[2];
        const filePath = parts.slice(3).join('/');
        const fileName = parts[parts.length - 1];
        return {
          isValid: true,
          owner,
          repo,
          branch,
          filePath,
          fileName: decodeURIComponent(fileName),
          downloadUrl: trimmed,
          isRelease: false,
          rawType: 'raw',
        };
      }
    }

    // 3. Blob URL: https://github.com/:owner/:repo/blob/:branch/:path...
    const blobMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (blobMatch && (url.hostname === 'github.com' || url.hostname === 'www.github.com')) {
      const [, owner, repo, branch, filePath] = blobMatch;
      const fileName = path.basename(filePath);
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      return {
        isValid: true,
        owner,
        repo,
        branch,
        filePath,
        fileName: decodeURIComponent(fileName),
        downloadUrl: rawUrl,
        isRelease: false,
        rawType: 'blob',
      };
    }

    // 4. Raw link: https://github.com/:owner/:repo/raw/:branch/:path...
    const rawMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/);
    if (rawMatch && (url.hostname === 'github.com' || url.hostname === 'www.github.com')) {
      const [, owner, repo, branch, filePath] = rawMatch;
      const fileName = path.basename(filePath);
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      return {
        isValid: true,
        owner,
        repo,
        branch,
        filePath,
        fileName: decodeURIComponent(fileName),
        downloadUrl: rawUrl,
        isRelease: false,
        rawType: 'raw',
      };
    }

    // 5. GitHub API content: https://api.github.com/repos/:owner/:repo/contents/:path
    const apiMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/);
    if (apiMatch && url.hostname === 'api.github.com') {
      const [, owner, repo, filePath] = apiMatch;
      return {
        isValid: true,
        owner,
        repo,
        filePath,
        fileName: path.basename(filePath),
        downloadUrl: trimmed,
        isRelease: false,
        rawType: 'api',
      };
    }

    // Fallback: direct URL with fileName fallback
    const fileName = path.basename(url.pathname) || 'github_document.pdf';
    return {
      isValid: true,
      fileName: decodeURIComponent(fileName),
      downloadUrl: trimmed,
      isRelease: false,
      rawType: 'direct',
    };
  } catch {
    return { isValid: false };
  }
}

/**
 * Fetch and stream a file directly from GitHub into RAG backend memory
 */
export async function fetchAndIngestFromGitHub(params: {
  url: string;
  token?: string;
  classId?: string;
  subjectId?: string;
  subjectName?: string;
  title?: string;
  uploaderName?: string;
  dbRef?: any;
}): Promise<{ document: RagDocument; material: AcademicMaterial }> {
  const parsed = parseGitHubUrl(params.url);
  if (!parsed.isValid || !parsed.downloadUrl) {
    throw new Error('Invalid GitHub URL. Please provide a GitHub file link (blob, raw, or release download URL).');
  }

  const token = params.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    'User-Agent': 'SyllabusOS-RAG/1.0',
    Accept: 'application/octet-stream, */*',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[GitHub Fetch] Downloading from "${parsed.downloadUrl}"...`);
  const response = await fetch(parsed.downloadUrl, {
    headers,
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`GitHub file not found (404). If this is a private repository, please configure your GitHub Token.`);
    }
    if (response.status === 403) {
      throw new Error(`GitHub API rate limit or permission error (403). Please provide a GitHub Personal Access Token.`);
    }
    throw new Error(`Failed to fetch file from GitHub: HTTP ${response.status} ${response.statusText}`);
  }

  // Derive filename
  let fileName = parsed.fileName || 'downloaded_document.pdf';
  // Check Content-Disposition if present
  const contentDisp = response.headers.get('content-disposition');
  if (contentDisp && contentDisp.includes('filename=')) {
    const match = contentDisp.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }
  }

  const uploadDir = ragEngine.getUploadDir();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const diskFileName = `${Date.now()}_gh_${sanitized}`;
  const diskPath = path.join(uploadDir, diskFileName);

  // Stream directly to disk to ensure 0 RAM spike for 300MB+ files
  if (!response.body) {
    throw new Error('Response body is empty.');
  }

  const fileStream = fs.createWriteStream(diskPath);
  // @ts-ignore
  await pipeline(Readable.fromWeb(response.body), fileStream);

  const stat = fs.statSync(diskPath);
  const fileExt = path.extname(fileName).replace(/^\./, '').toLowerCase() || 'pdf';
  const cleanTitle = (params.title || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();

  console.log(`[GitHub Fetch] Downloaded "${fileName}" (${(stat.size / (1024 * 1024)).toFixed(1)} MB). Ingesting into RAG...`);

  const classId = params.classId || 'class-bca-2028';
  const ragDoc = await ragEngine.ingestFile({
    filePath: diskPath,
    fileName: diskFileName,
    originalName: fileName,
    fileType: fileExt,
    fileSize: stat.size,
    classId,
    subjectId: params.subjectId,
    subjectName: params.subjectName || 'Core Curriculum',
    title: cleanTitle,
  });

  // Attach GitHub Metadata
  const source = parsed.isRelease ? 'github_release' : 'github_raw';
  const githubRepo = parsed.owner && parsed.repo ? `${parsed.owner}/${parsed.repo}` : undefined;
  ragEngine.updateDocument(ragDoc.id, {
    source,
    githubUrl: params.url,
    githubRepo,
    githubTag: parsed.releaseTag,
  });

  // Create corresponding AcademicMaterial
  const materialId = `mat-gh-${Date.now()}`;
  ragDoc.materialId = materialId;

  const newMaterial: AcademicMaterial = {
    id: materialId,
    classId,
    subjectId: params.subjectId || 'sub-general',
    subjectName: params.subjectName || 'Core Curriculum',
    title: cleanTitle,
    fileName,
    fileType: fileExt as any,
    fileSize: ragDoc.fileSizeFormatted,
    uploaderName: params.uploaderName || (githubRepo ? `GitHub: ${githubRepo}` : 'GitHub Import'),
    uploaderRole: 'teacher',
    verificationStatus: 'teacher_verified',
    createdAt: 'Just now (GitHub)',
    ragDocId: ragDoc.id,
    downloadUrl: params.url,
    githubUrl: params.url,
    source: 'github',
    resources: {
      summary: ragDoc.summary || `Fetched from GitHub (${githubRepo || 'remote'}). Indexed ${ragDoc.chunkCount} active chunks for deep question retrieval.`,
      hinglishSummary: `Ye file GitHub (${githubRepo || 'cloud'}) se fetch ho chuki hai aur backend RAG par 100% active hai.`,
      mindmapMermaid: `graph TD\n  A[${cleanTitle.slice(0, 25)}] --> B[GitHub Cloud Source]\n  A --> C[Active Chunks: ${ragDoc.chunkCount}]\n  A --> D[BM25 Indexed]`,
      keyConcepts: (ragDoc.tableOfContents || []).slice(0, 4).map((toc) => ({
        concept: toc.title,
        explanation: `Indexed at Chunk #${toc.chunkIndex} (Page ${toc.page || 1})`,
      })),
      importantDefinitions: [
        {
          term: cleanTitle,
          definition: `GitHub Cloud Material (${ragDoc.fileSizeFormatted}). Indexed into local sub-millisecond RAG vector/BM25 memory.`,
        },
      ],
      examples: [],
      examPoints: [
        `Cloud-synced from GitHub: ${params.url}`,
        `Contains ${ragDoc.chunkCount} active searchable chunks`,
        'Direct citation retrieval available in AI Tutor',
      ],
      flashcards: [],
      quiz: [],
      possibleQuestions: [],
      relatedPYQs: [],
    },
  };

  const db = params.dbRef;
  if (db && db.materials) {
    if (!db.materials[classId]) {
      db.materials[classId] = [];
    }
    db.materials[classId].unshift(newMaterial);
    if (typeof db.saveToDisk === 'function') {
      db.saveToDisk();
    }
  }

  return { document: ragDoc, material: newMaterial };
}

/**
 * Upload an active RAG document to GitHub Releases (supports files up to 2 GB)
 */
export async function uploadDocToGitHubRelease(params: {
  docId: string;
  repo?: string;
  token?: string;
  tagName?: string;
  dbRef?: any;
}): Promise<{ status: string; githubUrl: string; assetId: number; document: RagDocument }> {
  const doc = ragEngine.getDocument(params.docId);
  if (!doc) {
    throw new Error(`Document with ID "${params.docId}" not found in RAG vault.`);
  }

  if (!fs.existsSync(doc.storagePath)) {
    throw new Error(`File binary not found at disk storage path: ${doc.storagePath}`);
  }

  const token = params.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (!token) {
    throw new Error('A GitHub Personal Access Token (PAT) with "repo" permission is required to upload files to GitHub Releases.');
  }

  const targetRepo = (params.repo || process.env.GITHUB_REPO || 'Aviatcode/M2029').trim().replace(/^https?:\/\/github\.com\//, '');
  const repoParts = targetRepo.split('/');
  if (repoParts.length !== 2) {
    throw new Error(`Invalid GitHub repository format: "${targetRepo}". Expected "owner/repo" (e.g. "Aviatcode/M2029").`);
  }

  const [owner, repo] = repoParts;
  const tagName = params.tagName || 'academic-vault-v1';

  console.log(`[GitHub Upload] Ensuring release tag "${tagName}" exists on "${owner}/${repo}"...`);

  // Step 1: Check or create GitHub Release
  let releaseId: number | null = null;
  const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tagName)}`;
  const getReleaseRes = await fetch(releaseUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SyllabusOS-RAG/1.0',
    },
  });

  if (getReleaseRes.ok) {
    const releaseData = await getReleaseRes.json();
    releaseId = releaseData.id;
  } else if (getReleaseRes.status === 404) {
    console.log(`[GitHub Upload] Release "${tagName}" not found. Creating new release...`);
    const createReleaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'SyllabusOS-RAG/1.0',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: 'Academic Vault Cloud Storage',
        body: 'Automated permanent CDN cloud storage for university textbooks, slide packages, and RAG materials (supports up to 2GB per file).',
        draft: false,
        prerelease: false,
      }),
    });

    if (!createReleaseRes.ok) {
      const errText = await createReleaseRes.text();
      throw new Error(`Failed to create GitHub release: ${createReleaseRes.status} ${errText}`);
    }

    const createdRelease = await createReleaseRes.json();
    releaseId = createdRelease.id;
  } else {
    const errText = await getReleaseRes.text();
    throw new Error(`Failed to access GitHub release info: ${getReleaseRes.status} ${errText}`);
  }

  if (!releaseId) {
    throw new Error('Failed to resolve GitHub release ID.');
  }

  // Step 2: Check for existing asset with same name and delete if found
  const listAssetsUrl = `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const listAssetsRes = await fetch(listAssetsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SyllabusOS-RAG/1.0',
    },
  });

  const uploadFileName = doc.originalName || `${doc.id}.pdf`;

  if (listAssetsRes.ok) {
    const assets: any[] = await listAssetsRes.json();
    const existingAsset = assets.find((a) => a.name === uploadFileName);
    if (existingAsset) {
      console.log(`[GitHub Upload] Found existing asset "${uploadFileName}" (ID: ${existingAsset.id}). Deleting before fresh upload...`);
      await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SyllabusOS-RAG/1.0',
        },
      });
    }
  }

  // Step 3: Upload binary stream to uploads.github.com
  const stat = fs.statSync(doc.storagePath);
  console.log(`[GitHub Upload] Uploading "${uploadFileName}" (${(stat.size / (1024 * 1024)).toFixed(1)} MB) to GitHub Releases...`);

  const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(uploadFileName)}`;
  const fileStream = fs.createReadStream(doc.storagePath);

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size.toString(),
      'User-Agent': 'SyllabusOS-RAG/1.0',
    },
    // @ts-ignore
    body: fileStream,
    duplex: 'half',
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`GitHub asset upload failed (${uploadRes.status}): ${errText}`);
  }

  const asset = await uploadRes.json();
  const downloadUrl = asset.browser_download_url;

  console.log(`[GitHub Upload] Success! Permanent URL: ${downloadUrl}`);

  // Step 4: Update document in RAG engine
  const updatedDoc = ragEngine.updateDocument(doc.id, {
    source: 'github_release',
    githubUrl: downloadUrl,
    githubRepo: `${owner}/${repo}`,
    githubTag: tagName,
    githubAssetId: asset.id,
  });

  // Step 5: Update matching AcademicMaterial if available
  const db = params.dbRef;
  if (db && db.materials) {
    for (const classKey of Object.keys(db.materials)) {
      const items: AcademicMaterial[] = db.materials[classKey] || [];
      const mat = items.find((m) => m.ragDocId === doc.id || m.fileName === doc.originalName);
      if (mat) {
        mat.githubUrl = downloadUrl;
        mat.downloadUrl = downloadUrl;
        mat.source = 'github_release';
      }
    }
    if (typeof db.saveToDisk === 'function') {
      db.saveToDisk();
    }
  }

  return {
    status: 'success',
    githubUrl: downloadUrl,
    assetId: asset.id,
    document: updatedDoc || doc,
  };
}

/**
 * List files and directories in any GitHub repository
 */
export async function browseGitHubRepo(params: {
  repo?: string;
  path?: string;
  token?: string;
}): Promise<{
  repo: string;
  currentPath: string;
  items: Array<{
    name: string;
    path: string;
    type: 'file' | 'dir';
    size: number;
    sizeFormatted: string;
    downloadUrl: string | null;
    htmlUrl: string;
    isIndexable: boolean;
  }>;
}> {
  const targetRepo = (params.repo || process.env.GITHUB_REPO || 'Aviatcode/M2029').trim().replace(/^https?:\/\/github\.com\//, '');
  const repoParts = targetRepo.split('/');
  if (repoParts.length !== 2) {
    throw new Error(`Invalid GitHub repository format: "${targetRepo}". Expected "owner/repo" (e.g. "Aviatcode/M2029").`);
  }

  const [owner, repo] = repoParts;
  const currentPath = (params.path || '').replace(/^\//, '');
  const token = params.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(currentPath).replace(/%2F/g, '/')}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SyllabusOS-RAG/1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository or path "${targetRepo}/${currentPath}" not found.`);
    }
    if (res.status === 403) {
      throw new Error(`GitHub rate limit or permission error (403). Configure a GitHub Token.`);
    }
    throw new Error(`Failed to browse GitHub repo: HTTP ${res.status}`);
  }

  const data = await res.json();
  const rawList: any[] = Array.isArray(data) ? data : [data];

  const indexableExtensions = new Set(['pdf', 'docx', 'doc', 'txt', 'md', 'csv', 'json', 'ppt', 'pptx', 'html', 'py', 'ts', 'js']);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const items = rawList.map((item) => {
    const ext = path.extname(item.name).replace(/^\./, '').toLowerCase();
    const isFile = item.type === 'file';
    return {
      name: item.name,
      path: item.path,
      type: item.type as 'file' | 'dir',
      size: item.size || 0,
      sizeFormatted: formatBytes(item.size || 0),
      downloadUrl: item.download_url || null,
      htmlUrl: item.html_url,
      isIndexable: isFile && indexableExtensions.has(ext),
    };
  });

  // Sort directories first, then indexable files, then other files
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    if (a.isIndexable !== b.isIndexable) return a.isIndexable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    repo: `${owner}/${repo}`,
    currentPath,
    items,
  };
}

/**
 * Returns GitHub integration configuration status
 */
export function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  const defaultRepo = process.env.GITHUB_REPO || 'Aviatcode/M2029';
  return {
    configured: !!token,
    defaultRepo,
    defaultTag: 'academic-vault-v1',
  };
}
