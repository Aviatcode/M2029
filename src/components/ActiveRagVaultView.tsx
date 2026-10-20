import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  UploadCloud,
  Search,
  Sparkles,
  FileText,
  Layers,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Cpu,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Github,
  FolderGit2,
  CloudUpload,
  Folder,
  Key,
  Settings,
  Globe,
  ArrowUpRight,
  ChevronRight,
  Link2,
} from 'lucide-react';
import {
  RagDocumentClient,
  RagStatsClient,
  RagSearchResultClient,
  GitHubRepoItem,
  fetchRagDocuments,
  fetchRagStats,
  uploadLargeFileToRag,
  queryRag,
  deleteRagDoc,
  fetchFromGitHubUrl,
  uploadDocToGitHubRelease,
  browseGitHubRepo,
  fetchGitHubConfig,
  getSavedGitHubToken,
  saveGitHubToken,
  getSavedGitHubRepo,
  saveGitHubRepo,
} from '../utils/ragService';
import { RagDocumentViewer } from './RagDocumentViewer';

interface ActiveRagVaultViewProps {
  classCode?: string;
  onMaterialCreated?: (material: any) => void;
}

export const ActiveRagVaultView: React.FC<ActiveRagVaultViewProps> = ({
  classCode = 'BCA-2028',
  onMaterialCreated,
}) => {
  const [documents, setDocuments] = useState<RagDocumentClient[]>([]);
  const [stats, setStats] = useState<RagStatsClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Ingestion Source Tab: 'local' | 'github_fetch' | 'github_releases'
  const [activeSourceTab, setActiveSourceTab] = useState<'local' | 'github_fetch' | 'github_releases'>('local');

  // Local File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub Fetch State
  const [githubUrl, setGithubUrl] = useState('');
  const [githubCustomTitle, setGithubCustomTitle] = useState('');
  const [isGithubFetching, setIsGithubFetching] = useState(false);
  const [githubFetchError, setGithubFetchError] = useState<string | null>(null);
  const [githubFetchSuccess, setGithubFetchSuccess] = useState<string | null>(null);

  // GitHub Repo Explorer State
  const [explorerRepo, setExplorerRepo] = useState(getSavedGitHubRepo());
  const [explorerPath, setExplorerPath] = useState('');
  const [explorerItems, setExplorerItems] = useState<GitHubRepoItem[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [ingestingFilePath, setIngestingFilePath] = useState<string | null>(null);

  // GitHub Release Upload State
  const [githubToken, setGithubToken] = useState(getSavedGitHubToken());
  const [targetRepo, setTargetRepo] = useState(getSavedGitHubRepo());
  const [isPushingRelease, setIsPushingRelease] = useState(false);
  const [pushingDocId, setPushingDocId] = useState<string | null>(null);
  const [releaseSuccessMsg, setReleaseSuccessMsg] = useState<string | null>(null);
  const [releaseErrorMsg, setReleaseErrorMsg] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Global Universal Search
  const [universalQuery, setUniversalQuery] = useState('');
  const [universalResults, setUniversalResults] = useState<RagSearchResultClient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active Inspector Modal
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, ragStats] = await Promise.all([
        fetchRagDocuments(),
        fetchRagStats(),
      ]);
      setDocuments(docs);
      setStats(ragStats);
    } catch (err) {
      console.error('Failed to load RAG vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Handle Local File Streaming Upload (up to 500 MB)
  const handleFileDrop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(5);
      setUploadStage(`📤 Streaming "${file.name}" to backend disk storage...`);

      const result = await uploadLargeFileToRag(file, {
        classId: 'class-bca-2028',
        subjectName: 'Core Semester Material',
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        onProgress: (pct) => {
          setUploadProgress(Math.max(5, Math.min(92, pct)));
          if (pct >= 95) {
            setUploadStage('⚡ Chunking & Building in-memory BM25 index on backend...');
          }
        },
      });

      setUploadProgress(100);
      setUploadStage(`✅ Active on backend! Indexed ${result.document.chunkCount} searchable chunks.`);

      if (onMaterialCreated && result.material) {
        onMaterialCreated(result.material);
      }

      await loadData();
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setSelectedDocId(result.document.id);
      }, 1200);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err?.message || 'Failed to upload and index document.');
      setIsUploading(false);
    }
  };

  // 2. Handle GitHub URL Fetch & Ingest
  const handleGithubFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!githubUrl.trim()) return;

    try {
      setIsGithubFetching(true);
      setGithubFetchError(null);
      setGithubFetchSuccess(null);

      const result = await fetchFromGitHubUrl({
        url: githubUrl.trim(),
        title: githubCustomTitle.trim() || undefined,
        classId: 'class-bca-2028',
        subjectName: 'GitHub Cloud Repository',
      });

      setGithubFetchSuccess(`🎉 Successfully fetched & indexed ${result.document.chunkCount} chunks into active RAG memory!`);
      setGithubUrl('');
      setGithubCustomTitle('');

      if (onMaterialCreated && result.material) {
        onMaterialCreated(result.material);
      }

      await loadData();
      setSelectedDocId(result.document.id);
    } catch (err: any) {
      console.error('GitHub fetch failed:', err);
      setGithubFetchError(err?.message || 'Failed to fetch document from GitHub.');
    } finally {
      setIsGithubFetching(false);
    }
  };

  // 3. Browse GitHub Repository
  const handleExploreRepo = async (path = '') => {
    try {
      setIsExploring(true);
      setExplorerError(null);
      setExplorerPath(path);

      const result = await browseGitHubRepo({
        repo: explorerRepo.trim() || 'Aviatcode/M2029',
        path,
      });

      setExplorerItems(result.items || []);
      saveGitHubRepo(explorerRepo.trim());
    } catch (err: any) {
      console.error('Repo explore failed:', err);
      setExplorerError(err?.message || 'Failed to explore GitHub repository. Make sure repository name is valid.');
    } finally {
      setIsExploring(false);
    }
  };

  // 4. Ingest File directly from Repo Browser
  const handleIngestFromBrowser = async (item: GitHubRepoItem) => {
    const downloadLink = item.downloadUrl || item.htmlUrl;
    if (!downloadLink) return;

    try {
      setIngestingFilePath(item.path);
      const result = await fetchFromGitHubUrl({
        url: downloadLink,
        title: item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        classId: 'class-bca-2028',
        subjectName: `GitHub: ${explorerRepo}`,
      });

      if (onMaterialCreated && result.material) {
        onMaterialCreated(result.material);
      }

      await loadData();
      setSelectedDocId(result.document.id);
    } catch (err: any) {
      console.error('Ingest from browser failed:', err);
      alert(`Failed to ingest "${item.name}": ${err?.message}`);
    } finally {
      setIngestingFilePath(null);
    }
  };

  // 5. Push Local Document to GitHub Release Asset (up to 2 GB)
  const handlePushDocToRelease = async (docId: string) => {
    const token = getSavedGitHubToken();
    if (!token) {
      setPushingDocId(docId);
      setShowTokenModal(true);
      return;
    }

    try {
      setIsPushingRelease(true);
      setPushingDocId(docId);
      setReleaseErrorMsg(null);
      setReleaseSuccessMsg(null);

      const result = await uploadDocToGitHubRelease({
        docId,
        repo: targetRepo.trim() || 'Aviatcode/M2029',
        token,
      });

      setReleaseSuccessMsg(`☁️ Document backed up to GitHub Releases! File is now hosted on GitHub CDN: ${result.githubUrl}`);
      await loadData();
    } catch (err: any) {
      console.error('Release push failed:', err);
      setReleaseErrorMsg(err?.message || 'Failed to upload document to GitHub Releases.');
    } finally {
      setIsPushingRelease(false);
      setPushingDocId(null);
    }
  };

  const handleSaveTokenSettings = () => {
    saveGitHubToken(githubToken);
    saveGitHubRepo(targetRepo);
    setShowTokenModal(false);
    if (pushingDocId) {
      handlePushDocToRelease(pushingDocId);
    }
  };

  const handleUniversalSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!universalQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await queryRag(universalQuery.trim(), { limit: 10 });
      setUniversalResults(res.results || []);
    } catch (err) {
      console.error('Universal search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove "${docName}" from active RAG memory?`)) return;
    try {
      await deleteRagDoc(docId);
      if (selectedDocId === docId) setSelectedDocId(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ACTIVE RAG RETRIEVAL & GITHUB CLOUD ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              300MB+ Large Document Intelligence & GitHub Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              Store 300MB–2GB university textbooks, slides, and giant syllabi on backend disk storage or GitHub CDN. Sub-millisecond BM25 keyword indices keep every section, formula, and code snippet active for instant retrieval.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center shadow-lg">
              <div className="flex items-center justify-center space-x-1 text-indigo-400 text-xs font-semibold mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Books</span>
              </div>
              <div className="text-xl font-bold text-slate-100">{stats?.activeDocuments || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium">Active Docs</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center shadow-lg">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 text-xs font-semibold mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Chunks</span>
              </div>
              <div className="text-xl font-bold text-emerald-300">{stats?.totalChunks || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium">In-Memory Index</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center shadow-lg">
              <div className="flex items-center justify-center space-x-1 text-purple-400 text-xs font-semibold mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Storage</span>
              </div>
              <div className="text-xl font-bold text-purple-300">{stats?.totalSizeFormatted || '0 B'}</div>
              <div className="text-[10px] text-slate-500 font-medium">Disk Footprint</div>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Ingestion Action Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSourceTab('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSourceTab === 'local'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Stream Local File (500 MB)</span>
            </button>

            <button
              onClick={() => setActiveSourceTab('github_fetch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSourceTab === 'github_fetch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>Fetch from GitHub</span>
            </button>

            <button
              onClick={() => setActiveSourceTab('github_releases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSourceTab === 'github_releases'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
              <span>GitHub 2GB CDN Releases</span>
            </button>
          </div>

          <button
            onClick={() => setShowTokenModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>GitHub Settings</span>
          </button>
        </div>

        {/* Tab 1: Local Disk Streaming (up to 500 MB) */}
        {activeSourceTab === 'local' && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileDrop(e.dataTransfer.files);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                isUploading
                  ? 'border-indigo-500/50 bg-indigo-950/10 cursor-not-allowed'
                  : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.csv,.json,.ppt,.pptx"
                onChange={(e) => handleFileDrop(e.target.files)}
              />

              {isUploading ? (
                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-300 font-semibold flex items-center space-x-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>{uploadStage || 'Processing...'}</span>
                    </span>
                    <span className="text-indigo-400 font-mono font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Streaming binary chunks directly to server storage without memory overhead.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drop your 300 MB Textbook, Handbook, or Lecture PDF here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Direct disk streaming • Supports PDF, DOCX, TXT, Markdown, CSV up to 500 MB.
                    </p>
                  </div>
                </>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Fetch Directly from GitHub (URLs & Repo Browser) */}
        {activeSourceTab === 'github_fetch' && (
          <div className="space-y-6">
            {/* Direct URL Fetch Form */}
            <form onSubmit={handleGithubFetch} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Github className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="Paste GitHub URL (e.g. https://github.com/owner/repo/blob/main/book.pdf or raw link)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <input
                  type="text"
                  value={githubCustomTitle}
                  onChange={(e) => setGithubCustomTitle(e.target.value)}
                  placeholder="Optional Title"
                  className="sm:w-56 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                />

                <button
                  type="submit"
                  disabled={isGithubFetching || !githubUrl.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-md shrink-0 cursor-pointer"
                >
                  {isGithubFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Fetch into RAG</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Quick Links */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-500">Quick Shortcuts:</span>
                <button
                  type="button"
                  onClick={() => {
                    setGithubUrl('https://github.com/Aviatcode/M2029/blob/main/curriculum-repo/TIMETABLE.md');
                    setGithubCustomTitle('BCA Semester Timetable & Lab Schedule');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-mono transition-all cursor-pointer"
                >
                  📅 Timetable Spec
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGithubUrl('https://github.com/Aviatcode/M2029/blob/main/curriculum-repo/SYLLABUS.md');
                    setGithubCustomTitle('Core University Syllabus Blueprint');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-mono transition-all cursor-pointer"
                >
                  📋 Syllabus Guide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGithubUrl('https://raw.githubusercontent.com/Aviatcode/M2029/main/README.md');
                    setGithubCustomTitle('M2029 Operating System Overview');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-mono transition-all cursor-pointer"
                >
                  📘 README Architecture
                </button>
              </div>

              {githubFetchSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{githubFetchSuccess}</span>
                </div>
              )}

              {githubFetchError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{githubFetchError}</span>
                </div>
              )}
            </form>

            {/* Interactive Repo Explorer */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Explore Repository Documents
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={explorerRepo}
                    onChange={(e) => setExplorerRepo(e.target.value)}
                    placeholder="owner/repo (e.g. Aviatcode/M2029)"
                    className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                  />
                  <button
                    type="button"
                    onClick={() => handleExploreRepo(explorerPath)}
                    disabled={isExploring}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
                  >
                    {isExploring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              {/* Breadcrumbs */}
              {explorerPath && (
                <div className="flex items-center space-x-1 text-xs text-slate-400 pt-1 font-mono">
                  <button
                    onClick={() => handleExploreRepo('')}
                    className="hover:text-indigo-400 underline cursor-pointer"
                  >
                    root
                  </button>
                  <span>/</span>
                  <span className="text-slate-200">{explorerPath}</span>
                </div>
              )}

              {/* Explorer Items List */}
              {explorerItems.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {explorerItems.map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 transition-all text-xs"
                    >
                      <div className="flex items-center space-x-2.5 truncate max-w-[70%]">
                        {item.type === 'dir' ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                        <span className="text-slate-200 truncate font-mono">{item.name}</span>
                        {item.type === 'file' && (
                          <span className="text-[10px] text-slate-500 font-mono">({item.sizeFormatted})</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {item.type === 'dir' ? (
                          <button
                            onClick={() => handleExploreRepo(item.path)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : item.isIndexable ? (
                          <button
                            onClick={() => handleIngestFromBrowser(item)}
                            disabled={ingestingFilePath === item.path}
                            className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-[11px] transition-all flex items-center space-x-1 shadow-sm cursor-pointer"
                          >
                            {ingestingFilePath === item.path ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Indexing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>📥 Fetch to RAG</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <a
                            href={item.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-500 hover:text-slate-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 py-2">
                  Click &ldquo;Browse&rdquo; to list all documents, PDFs, and notes inside <code className="text-indigo-300 font-mono">{explorerRepo}</code>.
                </p>
              )}

              {explorerError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                  {explorerError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: GitHub Releases (Up to 2 GB) */}
        {activeSourceTab === 'github_releases' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-indigo-950/30 border border-emerald-800/40 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <CloudUpload className="w-4 h-4" />
                <span>GITHUB RELEASES: 2 GB PER-FILE PERMANENT CLOUD CDN STORAGE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Standard Git repos limit files to 100 MB, but <strong>GitHub Releases supports up to 2 GB per file</strong>. Backup your active textbooks to GitHub Releases so they remain permanently hosted in the cloud, free of charge, with zero backend hosting costs!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                  <span>GitHub Cloud Configuration</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Target Repository</label>
                    <input
                      type="text"
                      value={targetRepo}
                      onChange={(e) => setTargetRepo(e.target.value)}
                      placeholder="owner/repo (e.g. Aviatcode/M2029)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Personal Access Token (PAT with repo scope)</label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveTokenSettings}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    Save GitHub Credentials
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Backup Active Books to GitHub Releases</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select any active document in your vault below to upload it as a release asset (up to 2 GB) to <code className="text-indigo-300 font-mono">{targetRepo}</code>.
                </p>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div className="truncate max-w-[60%]">
                        <div className="font-semibold text-slate-200 truncate">{d.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{d.fileSizeFormatted}</div>
                      </div>

                      {d.githubUrl ? (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Backed Up</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePushDocToRelease(d.id)}
                          disabled={isPushingRelease && pushingDocId === d.id}
                          className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold text-[10px] transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          {isPushingRelease && pushingDocId === d.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-3 h-3" />
                              <span>Push to GitHub</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {releaseSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="break-all">{releaseSuccessMsg}</span>
              </div>
            )}

            {releaseErrorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{releaseErrorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Universal Search across ALL Active Documents */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200">
              Universal RAG Search Across All Active Documents
            </h2>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            Sub-millisecond BM25 Hybrid Engine
          </span>
        </div>

        <form onSubmit={handleUniversalSearch} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={universalQuery}
              onChange={(e) => setUniversalQuery(e.target.value)}
              placeholder="Query any algorithm, formula, theorem, or question across all indexed textbooks..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !universalQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center space-x-2 shadow-md shrink-0 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Fetch Matches</span>
          </button>
        </form>

        {/* Universal Search Results */}
        {universalResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Found {universalResults.length} relevant passages</span>
              <button
                onClick={() => setUniversalResults([])}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {universalResults.map((r) => (
                <div
                  key={r.chunk.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 truncate max-w-[65%]">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">{r.docTitle}</span>
                      {r.pageNumber && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          p.{r.pageNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Score: {r.score}
                      </span>
                      <button
                        onClick={() => copySnippet(r.chunk.text, r.chunk.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                      >
                        {copiedId === r.chunk.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedDocId(r.docId)}
                        className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all font-semibold cursor-pointer"
                      >
                        Open In Book
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line line-clamp-4">
                    {r.chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Document Inspector Modal / View */}
      {selectedDocId && (
        <div className="p-1">
          <RagDocumentViewer
            docId={selectedDocId}
            onClose={() => setSelectedDocId(null)}
          />
        </div>
      )}

      {/* Active Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Active Documents in Backend Vault ({documents.length})</span>
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
            <Database className="w-8 h-8 mx-auto text-indigo-400/60" />
            <p className="text-xs font-semibold text-slate-300">No active documents uploaded yet.</p>
            <p className="text-[11px] text-slate-500">
              Upload a 300 MB file above or fetch directly from GitHub to activate in-memory RAG retrieval for your university exams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((d) => (
              <div
                key={d.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  selectedDocId === d.id
                    ? 'bg-slate-900/90 border-indigo-500 shadow-xl'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                        ACTIVE IN RAG
                      </span>

                      {d.githubUrl && (
                        <a
                          href={d.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all font-mono"
                          title="Open on GitHub"
                        >
                          <Github className="w-3 h-3" />
                          <span>GitHub Cloud</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {d.fileSizeFormatted}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {d.title || d.originalName}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {d.summary || `Extracted ${d.chunkCount} searchable chunks. Ready for grounded Q&A.`}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 font-mono">
                    {d.chunkCount} chunks • {d.pageCount || 1} pages
                  </div>

                  <div className="flex items-center space-x-2">
                    {!d.githubUrl && (
                      <button
                        onClick={() => handlePushDocToRelease(d.id)}
                        disabled={isPushingRelease && pushingDocId === d.id}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-semibold text-xs transition-all flex items-center space-x-1 cursor-pointer"
                        title="Backup to GitHub Releases (2GB limit)"
                      >
                        {isPushingRelease && pushingDocId === d.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CloudUpload className="w-3.5 h-3.5" />
                        )}
                        <span>Backup to GH</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedDocId(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Fetch / Explore</span>
                    </button>

                    <a
                      href={`/api/rag/file/${encodeURIComponent(d.id)}`}
                      download={d.originalName}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                      title="Download original file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleDelete(d.id, d.originalName)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete from RAG"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub Token & Repo Settings Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Github className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">GitHub Cloud Storage Settings</h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Repository</label>
                <input
                  type="text"
                  value={targetRepo}
                  onChange={(e) => setTargetRepo(e.target.value)}
                  placeholder="owner/repo (e.g. Aviatcode/M2029)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">GitHub Personal Access Token (PAT)</label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=SyllabusOS+RAG+Storage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-0.5"
                  >
                    <span>Generate token</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Requires <code className="text-indigo-300">repo</code> scope to create releases and upload files up to 2 GB. Stored safely in your browser.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTokenSettings}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                Save & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
