import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, FileText, Award, Layers, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: string, title: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-20 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl text-slate-100 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder="Search syllabus, PPTs, verified PYQs, or mindmaps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm md:text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Searching class knowledge base...
            </div>
          ) : results.length > 0 ? (
            results.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelectResult(res.type, res.title);
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {res.type}
                    </span>
                    <h4 className="font-semibold text-xs md:text-sm text-slate-100">
                      {res.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{res.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching academic resources found for "{query}".
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Type at least 2 characters (e.g. "normalization", "deadlock", "inheritance").
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
