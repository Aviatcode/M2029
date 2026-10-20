export interface RagDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  storagePath: string;
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

export interface RagChunk {
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

export interface RagSearchResult {
  chunk: RagChunk;
  score: number;
  matchHighlights: string[];
  docTitle: string;
  docId: string;
  fileName: string;
  pageNumber?: number;
  sectionTitle?: string;
}

export interface RagAskSource {
  docId: string;
  docTitle: string;
  fileName: string;
  chunkIndex: number;
  pageNumber?: number;
  sectionTitle?: string;
  snippet: string;
  score: number;
}

export interface RagAskResponse {
  answer: string;
  sources: RagAskSource[];
  modelUsed: string;
  cached: boolean;
  query: string;
  docId?: string;
  tokensEstimated: number;
}

export interface RagStats {
  totalDocuments: number;
  activeDocuments: number;
  totalChunks: number;
  totalWords: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  storageDirectory: string;
}
