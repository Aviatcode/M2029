import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  FileText,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Send,
  Loader2,
  Compass,
} from 'lucide-react';
import {
  RagDocumentClient,
  RagChunkClient,
  RagSearchResultClient,
  RagAskResponseClient,
  queryRag,
  askRag,
  fetchRagDocChunks,
  fetchRagDocument,
} from '../utils/ragService';

interface RagDocumentViewerProps {
  docId: string;
  initialDocument?: RagDocumentClient | null;
  onClose?: () => void;
}

export const RagDocumentViewer: React.FC<RagDocumentViewerProps> = ({
  docId,
  initialDocument,
  onClose,
}) => {
  const [doc, setDoc] = useState<RagDocumentClient | null>(initialDocument || null);
  const [activeTab, setActiveTab] = useState<'fetch' | 'ask' | 'browse' | 'toc'>('fetch');
  const [loading, setLoading] = useState(!initialDocument);

  // 1. Fetch Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RagSearchResultClient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // 2. Ask Tab State
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResponse, setAskResponse] = useState<RagAskResponseClient | null>(null);

  // 3. Browse Chunks State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [browseChunks, setBrowseChunks] = useState<RagChunkClient[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalChunksCount, setTotalChunksCount] = useState(0);
  const [browseFilter, setBrowseFilter] = useState('');
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);

  // Load document details if not provided
  useEffect(() => {
    let isMounted = true;
    async function loadDoc() {
      if (!docId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/rag/document/${encodeURIComponent(docId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.document) {
            setDoc(data.document);
          }
        }
      } catch (err) {
        console.error('Error fetching RAG document:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!doc || doc.id !== docId) {
      loadDoc();
    }
    return () => {
      isMounted = false;
    };
  }, [docId]);

  // Load paginated chunks for Browse tab
  useEffect(() => {
    if (activeTab === 'browse' && docId) {
      loadChunks(currentPage, browseFilter);
    }
  }, [activeTab, currentPage, browseFilter, docId]);

  const loadChunks = async (page: number, filterText: string) => {
    try {
      setIsBrowseLoading(true);
      const res = await fetchRagDocChunks(docId, page, pageSize, filterText);
      setBrowseChunks(res.chunks || []);
      setTotalPages(res.totalPages || 1);
      setTotalChunksCount(res.total || 0);
    } catch (err) {
      console.error('Error loading chunks:', err);
    } finally {
      setIsBrowseLoading(false);
    }
  };

  // Execute BM25 Search inside this 300MB Document
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await queryRag(searchQuery.trim(), { docId, limit: 8 });
      setSearchResults(res.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Execute Grounded Q&A against this 300MB Document
  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!askQuery.trim()) return;

    try {
      setIsAsking(true);
      const res = await askRag(askQuery.trim(), { docId });
      setAskResponse(res);
    } catch (err) {
      console.error('Ask error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(id);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Connecting to Active Backend RAG Engine...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center bg-red-950/20 rounded-2xl border border-red-900/40 text-red-300">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="font-semibold text-sm">Document not found in Active RAG Storage.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                ACTIVE ON BACKEND
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {doc.fileSizeFormatted} • {doc.chunkCount} Chunks
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight mt-0.5 truncate max-w-md">
              {doc.title || doc.originalName}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <a
            href={`/api/rag/file/${encodeURIComponent(doc.id)}`}
            download={doc.originalName}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all flex items-center space-x-1.5 shadow-sm"
            title="Download full original file directly from server storage"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download ({doc.fileSizeFormatted})</span>
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-4">
        <button
          onClick={() => setActiveTab('fetch')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'fetch'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Fetch Anything (BM25 RAG)</span>
        </button>

        <button
          onClick={() => setActiveTab('ask')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'ask'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI About This Book</span>
        </button>

        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'browse'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Browse Chunks ({doc.chunkCount})</span>
        </button>

        {doc.tableOfContents && doc.tableOfContents.length > 0 && (
          <button
            onClick={() => setActiveTab('toc')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'toc'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Table of Contents ({doc.tableOfContents.length})</span>
          </button>
        )}
      </div>

      {/* Tab 1: Fetch Anything from this Document */}
      {activeTab === 'fetch' && (
        <div className="p-5 space-y-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any concept, formula, algorithm, or chapter in this 300MB book (e.g. 'B-Tree deletion', 'Deadlock banker algorithm')..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md flex items-center space-x-1.5 shrink-0"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Fetch Chunks</span>
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  Found <strong className="text-slate-200">{searchResults.length} relevant passages</strong> in backend index:
                </span>
                <span className="text-[11px] font-mono text-emerald-400">⚡ Instant BM25 Retrieval</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {searchResults.map((result, idx) => (
                  <div
                    key={result.chunk.id || idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                          Chunk #{result.chunk.chunkIndex}
                        </span>
                        {result.pageNumber && (
                          <span className="text-slate-400 font-medium">Page {result.pageNumber}</span>
                        )}
                        {result.sectionTitle && (
                          <span className="text-slate-300 font-semibold truncate max-w-xs">
                            • {result.sectionTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Relevance: {result.score}
                        </span>
                        <button
                          onClick={() => copyToClipboard(result.chunk.text, result.chunk.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                          title="Copy text snippet"
                        >
                          {copiedChunkId === result.chunk.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                      {result.chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-400 text-xs">
              No direct matches found for "{searchQuery}". Try different keywords or browse all chunks below.
            </div>
          )}

          {!searchQuery && searchResults.length === 0 && (
            <div className="p-6 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <Search className="w-6 h-6 mx-auto text-indigo-400 opacity-80" />
              <p className="text-xs font-medium text-slate-300">
                Type any query above to instantly retrieve relevant paragraphs from this {doc.fileSizeFormatted} active document.
              </p>
              <p className="text-[11px] text-slate-500">
                The entire book has been chunked and stored in memory on the backend for zero-latency retrieval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Grounded Q&A against this Document */}
      {activeTab === 'ask' && (
        <div className="p-5 space-y-4">
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder={`Ask any university exam question about ${doc.title || 'this textbook'}...`}
              className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={isAsking || !askQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md flex items-center space-x-1.5 shrink-0"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Ask Document</span>
            </button>
          </form>

          {askResponse && (
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-indigo-300 border-b border-indigo-500/20 pb-2">
                  <span className="font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Grounded Answer ({askResponse.modelUsed})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Citations: {askResponse.sources?.length || 0} Chunks
                  </span>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {askResponse.answer}
                </div>
              </div>

              {/* Citations Excerpts */}
              {askResponse.sources && askResponse.sources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Authoritative Citations from Document
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {askResponse.sources.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300">
                            [Citation {idx + 1}] Chunk #{s.chunkIndex} (Page {s.pageNumber || 'N/A'})
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {s.sectionTitle}
                          </span>
                        </div>
                        <p className="text-slate-400 italic text-[11px]">"{s.snippet}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!askResponse && !isAsking && (
            <div className="p-6 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-purple-400 opacity-80" />
              <p className="text-xs font-medium text-slate-300">
                Ask any syllabus question or exam doubt directly to this 300MB book.
              </p>
              <p className="text-[11px] text-slate-500">
                The RAG engine automatically retrieves the exact chapters, passes them into the AI context, and provides grounded explanations with citations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Browse All Chunks */}
      {activeTab === 'browse' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={browseFilter}
                onChange={(e) => {
                  setBrowseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter chunks by keyword..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 shrink-0">
              <span>
                Page {currentPage} of {totalPages} ({totalChunksCount} chunks)
              </span>
              <button
                disabled={currentPage <= 1 || isBrowseLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages || isBrowseLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isBrowseLoading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading chunks from disk...</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {browseChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                        Chunk #{chunk.chunkIndex}
                      </span>
                      {chunk.pageNumber && (
                        <span className="text-slate-400 font-medium">Page {chunk.pageNumber}</span>
                      )}
                      {chunk.sectionTitle && (
                        <span className="text-slate-300 font-semibold truncate max-w-xs">
                          • {chunk.sectionTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {chunk.wordCount} words
                      </span>
                      <button
                        onClick={() => copyToClipboard(chunk.text, chunk.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                        title="Copy text"
                      >
                        {copiedChunkId === chunk.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Table of Contents */}
      {activeTab === 'toc' && doc.tableOfContents && (
        <div className="p-5 max-h-[460px] overflow-y-auto space-y-2">
          <p className="text-xs text-slate-400 pb-2">
            Click any chapter or module to jump directly to its chunks in the reader:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {doc.tableOfContents.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab('browse');
                  const targetPage = Math.floor(item.chunkIndex / pageSize) + 1;
                  setCurrentPage(targetPage);
                }}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Chunk #{item.chunkIndex} {item.page ? `• Page ${item.page}` : ''}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
