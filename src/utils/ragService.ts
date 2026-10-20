export interface RagDocumentClient {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  classId: string;
  subjectId?: string;
  subjectName?: string;
  title: string;
  status: 'indexing' | 'active' | 'error';
  errorMessage?: string;
  chunkCount: number;
  wordCount: number;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  tableOfContents?: { title: string; chunkIndex: number; page?: number }[];
  materialId?: string;
  source?: 'local_upload' | 'github_raw' | 'github_release';
  githubUrl?: string;
  githubRepo?: string;
  githubTag?: string;
  githubAssetId?: number;
}

export interface RagChunkClient {
  id: string;
  docId: string;
  docTitle: string;
  fileName: string;
  chunkIndex: number;
  pageNumber?: number;
  sectionTitle?: string;
  text: string;
  wordCount: number;
  tokenCount: number;
}

export interface RagSearchResultClient {
  chunk: RagChunkClient;
  score: number;
  matchHighlights: string[];
  docTitle: string;
  docId: string;
  fileName: string;
  pageNumber?: number;
  sectionTitle?: string;
}

export interface RagAskResponseClient {
  status: string;
  answer: string;
  sources: {
    docId: string;
    docTitle: string;
    fileName: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    snippet: string;
    score: number;
  }[];
  modelUsed: string;
  cached: boolean;
  query: string;
  docId?: string;
  tokensEstimated: number;
}

export interface RagStatsClient {
  totalDocuments: number;
  activeDocuments: number;
  totalChunks: number;
  totalWords: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  storageDirectory: string;
}

/**
 * Uploads a large file (e.g. 300MB+) via streaming multipart/form-data with real-time progress
 */
export function uploadLargeFileToRag(
  file: File,
  params: {
    classId?: string;
    subjectId?: string;
    subjectName?: string;
    title?: string;
    uploaderName?: string;
    uploaderRole?: string;
    onProgress?: (progressPercent: number) => void;
  }
): Promise<{ status: string; document: RagDocumentClient; material: any; message: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file);
    if (params.classId) formData.append('classId', params.classId);
    if (params.subjectId) formData.append('subjectId', params.subjectId);
    if (params.subjectName) formData.append('subjectName', params.subjectName);
    if (params.title) formData.append('title', params.title);
    if (params.uploaderName) formData.append('uploaderName', params.uploaderName);
    if (params.uploaderRole) formData.append('uploaderRole', params.uploaderRole);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && params.onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        params.onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error('Invalid JSON response from server'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error || `Server responded with ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    xhr.open('POST', '/api/rag/upload');
    xhr.send(formData);
  });
}

/**
 * Searches across active backend RAG documents (BM25 Hybrid)
 */
export async function queryRag(
  query: string,
  options: {
    docId?: string;
    classId?: string;
    subjectId?: string;
    limit?: number;
  } = {}
): Promise<{ query: string; count: number; results: RagSearchResultClient[] }> {
  const res = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...options }),
  });
  if (!res.ok) {
    throw new Error(`RAG query failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Grounded Q&A against active backend RAG documents
 */
export async function askRag(
  question: string,
  options: {
    docId?: string;
    classId?: string;
    subjectId?: string;
    geminiApiKey?: string;
  } = {}
): Promise<RagAskResponseClient> {
  const res = await fetch('/api/rag/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, ...options }),
  });
  if (!res.ok) {
    throw new Error(`RAG ask failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Get all active RAG documents
 */
export async function fetchRagDocuments(classId?: string): Promise<RagDocumentClient[]> {
  const url = classId ? `/api/rag/documents?classId=${encodeURIComponent(classId)}` : '/api/rag/documents';
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents || [];
}

/**
 * Get single active RAG document by ID
 */
export async function fetchRagDocument(docId: string): Promise<RagDocumentClient | null> {
  const res = await fetch(`/api/rag/document/${encodeURIComponent(docId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.document || null;
}

/**
 * Browse paginated chunks of a document
 */
export async function fetchRagDocChunks(
  docId: string,
  page = 1,
  pageSize = 10,
  filter?: string
): Promise<{
  chunks: RagChunkClient[];
  total: number;
  page: number;
  totalPages: number;
  document: RagDocumentClient;
}> {
  let url = `/api/rag/document/${encodeURIComponent(docId)}/chunks?page=${page}&pageSize=${pageSize}`;
  if (filter) url += `&filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch document chunks');
  return res.json();
}

/**
 * Fetch a single exact chunk
 */
export async function fetchRagChunk(docId: string, chunkIndex: number): Promise<RagChunkClient | null> {
  const res = await fetch(`/api/rag/document/${encodeURIComponent(docId)}/chunk/${chunkIndex}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.chunk || null;
}

/**
 * Get overall RAG engine statistics
 */
export async function fetchRagStats(): Promise<RagStatsClient | null> {
  const res = await fetch('/api/rag/stats');
  if (!res.ok) return null;
  const data = await res.json();
  return data.stats || null;
}

/**
 * Delete a document from active RAG engine
 */
export async function deleteRagDoc(docId: string): Promise<boolean> {
  const res = await fetch(`/api/rag/document/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ==========================================
// GITHUB INTEGRATION & CLOUD STORAGE HELPERS
// ==========================================

export interface GitHubRepoItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sizeFormatted: string;
  downloadUrl: string | null;
  htmlUrl: string;
  isIndexable: boolean;
}

export function getSavedGitHubToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('syllabus_github_token') || '';
}

export function saveGitHubToken(token: string) {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem('syllabus_github_token');
  } else {
    localStorage.setItem('syllabus_github_token', token.trim());
  }
}

export function getSavedGitHubRepo(): string {
  if (typeof window === 'undefined') return 'Aviatcode/M2029';
  return localStorage.getItem('syllabus_github_repo') || 'Aviatcode/M2029';
}

export function saveGitHubRepo(repo: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('syllabus_github_repo', repo.trim() || 'Aviatcode/M2029');
}

/**
 * Fetch and stream file directly from GitHub into active RAG memory
 */
export async function fetchFromGitHubUrl(params: {
  url: string;
  token?: string;
  classId?: string;
  subjectId?: string;
  subjectName?: string;
  title?: string;
  uploaderName?: string;
}): Promise<{ status: string; message: string; document: RagDocumentClient; material: any }> {
  const token = params.token || getSavedGitHubToken();
  const res = await fetch('/api/rag/github/fetch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-github-token': token } : {}),
    },
    body: JSON.stringify({
      ...params,
      token,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch file from GitHub.');
  }
  return data;
}

/**
 * Upload an active RAG document to GitHub Releases as a permanent cloud asset (up to 2GB)
 */
export async function uploadDocToGitHubRelease(params: {
  docId: string;
  repo?: string;
  token?: string;
  tagName?: string;
}): Promise<{ status: string; message: string; githubUrl: string; assetId: number; document: RagDocumentClient }> {
  const token = params.token || getSavedGitHubToken();
  const repo = params.repo || getSavedGitHubRepo();

  const res = await fetch('/api/rag/github/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-github-token': token } : {}),
    },
    body: JSON.stringify({
      ...params,
      token,
      repo,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload document to GitHub Releases.');
  }
  return data;
}

/**
 * Browse a GitHub repository's contents to find documents and PDFs
 */
export async function browseGitHubRepo(params: {
  repo?: string;
  path?: string;
  token?: string;
} = {}): Promise<{
  repo: string;
  currentPath: string;
  items: GitHubRepoItem[];
}> {
  const token = params.token || getSavedGitHubToken();
  const repo = params.repo || getSavedGitHubRepo();
  let url = `/api/rag/github/browse?repo=${encodeURIComponent(repo)}`;
  if (params.path) {
    url += `&path=${encodeURIComponent(params.path)}`;
  }

  const res = await fetch(url, {
    headers: {
      ...(token ? { 'x-github-token': token } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to browse GitHub repository.');
  }
  return data;
}

/**
 * Get GitHub configuration status from backend
 */
export async function fetchGitHubConfig(): Promise<{
  configured: boolean;
  defaultRepo: string;
  defaultTag: string;
}> {
  const res = await fetch('/api/rag/github/config');
  if (!res.ok) return { configured: false, defaultRepo: 'Aviatcode/M2029', defaultTag: 'academic-vault-v1' };
  const data = await res.json();
  return data.config;
}
