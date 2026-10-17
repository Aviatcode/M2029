import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  BookOpen,
  FileText,
  FileQuestion,
  Compass,
  ArrowRight,
  FileCheck,
  Award,
  Clock,
} from 'lucide-react';

interface SearchResultItem {
  type: string;
  title: string;
  subtitle: string;
  id?: string;
}

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
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        const items: SearchResultItem[] = data.results || [];
        setResults(items);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus on open & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectResult(results[selectedIndex].type, results[selectedIndex].title);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('subject')) return <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />;
    if (t.includes('syllabus') || t.includes('topic')) return <Compass className="w-4 h-4 text-slate-400 shrink-0" />;
    if (t.includes('pyq')) return <FileQuestion className="w-4 h-4 text-slate-400 shrink-0" />;
    if (t.includes('assignment')) return <FileCheck className="w-4 h-4 text-slate-400 shrink-0" />;
    if (t.includes('exam')) return <Award className="w-4 h-4 text-slate-400 shrink-0" />;
    if (t.includes('class') || t.includes('lecture')) return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const cleanBadgeLabel = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('subject')) return 'Subject';
    if (t.includes('syllabus') || t.includes('topic')) return 'Syllabus';
    if (t.includes('pyq')) return 'PYQ';
    if (t.includes('assignment')) return 'Assignment';
    if (t.includes('exam')) return 'Exam';
    if (t.includes('class') || t.includes('lecture')) return 'Class';
    return 'Notes';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-16 sm:pt-24 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search syllabus, notes, past exam questions, or subjects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-slate-500 font-sans">
              Searching curriculum knowledge base...
            </div>
          ) : results.length > 0 ? (
            results.map((res, i) => {
              const isSelected = selectedIndex === i;

              return (
                <div
                  key={i}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    onSelectResult(res.type, res.title);
                    onClose();
                  }}
                  className={`p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 border-slate-800 text-white shadow-xs'
                      : 'hover:bg-slate-900/60 border-transparent text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getTypeIcon(res.type)}</div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                          {cleanBadgeLabel(res.type)}
                        </span>
                        <h4 className="font-medium text-xs sm:text-sm text-slate-100 truncate">
                          {res.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate pl-0.5">{res.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 shrink-0 transition ${
                      isSelected ? 'text-slate-200 translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </div>
              );
            })
          ) : query.length >= 2 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-sans">
              No matching curriculum materials found for <span className="text-slate-300 font-mono">"{query}"</span>.
            </div>
          ) : (
            <div className="py-8 px-4 text-center space-y-1 text-slate-500 text-xs">
              <p className="text-slate-400 font-medium">Quick search across the cohort</p>
              <p className="text-[11px]">
                Type a subject, unit topic, or exam term (e.g. <span className="text-slate-300 font-mono">"normalization"</span>, <span className="text-slate-300 font-mono">"deadlock"</span>, <span className="text-slate-300 font-mono">"java"</span>).
              </p>
            </div>
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>SyllabusOS Knowledge Base</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400">
                ↵
              </kbd>
              <span>open</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
