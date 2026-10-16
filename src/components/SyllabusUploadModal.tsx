import React, { useState } from 'react';
import { UploadCloud, FileText, Sparkles, X, CheckCircle, BookOpen } from 'lucide-react';

interface SyllabusUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  onSyllabusParsed: (data: any) => void;
}

export const SyllabusUploadModal: React.FC<SyllabusUploadModalProps> = ({
  isOpen,
  onClose,
  classCode,
  onSyllabusParsed,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (presetName: string, presetContent: string) => {
    setSubjectName(presetName);
    setRawText(presetContent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        if (!subjectName) {
          setSubjectName(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Please paste or upload your syllabus text.');
      return;
    }

    setIsParsing(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/syllabus/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode,
          subjectName: subjectName.trim() || 'Core Curriculum',
          rawText: rawText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse syllabus');
      }

      onSyllabusParsed(data.classroom);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing syllabus. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 md:p-7 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Upload Syllabus & Auto-Create Folders</h2>
              <p className="text-xs text-slate-400">
                M2029 parses chapters, builds 7 AM primers, mindmaps, and 10-markers for class {classCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick 1-Click University Presets */}
        <div className="mb-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            One-Click University Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleSelectPreset(
                  'BCA Sem 3: Data Structures & Algorithms',
                  `Unit 1: Linear Data Structures\n- Stack operations, Prefix to Postfix conversion\n- Circular Queue vs Linear Queue & Wrap Around Math\n- Singly vs Doubly Linked Lists & Traversal\n\nUnit 2: Trees & Graph Algorithms\n- Binary Search Tree (BST) Insertion and Deletion\n- AVL Tree Rotations (LL, RR, LR, RL)\n- Graph Traversal: BFS vs DFS & Shortest Path Dijkstra\n\nUnit 3: Sorting & Searching\n- Quick Sort & Merge Sort Time Complexity\n- Hashing Techniques & Collision Resolution Strategies`
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-cyan-300 transition cursor-pointer"
            >
              📚 BCA Sem 3 (Data Structures)
            </button>

            <button
              type="button"
              onClick={() =>
                handleSelectPreset(
                  'BCA Sem 3: Operating Systems & Systems Programming',
                  `Unit 1: Process Management\n- Process States, PCB, Context Switching\n- CPU Scheduling: Round Robin, FCFS, Shortest Job First\n\nUnit 2: Concurrency & Synchronization\n- Critical Section Problem, Semaphores & Mutex Locks\n- Deadlocks: 4 Coffman Conditions, Banker Avoidance Algorithm\n\nUnit 3: Memory Management\n- Paging, Segmentation, TLB Translation\n- Virtual Memory, Demand Paging, LRU Page Replacement Algorithm`
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-indigo-300 transition cursor-pointer"
            >
              💻 BCA Sem 3 (Operating Systems)
            </button>

            <button
              type="button"
              onClick={() =>
                handleSelectPreset(
                  'BCA Sem 3: Database Management Systems',
                  `Unit 1: Relational Model & ER Design\n- Entity Relationship Diagrams, Weak Entities\n- Relational Algebra Operations\n\nUnit 2: Normalization\n- Functional Dependencies\n- 1NF, 2NF, 3NF and Boyce-Codd Normal Form (BCNF)\n\nUnit 3: Transactions & Concurrency\n- ACID Properties\n- Serializability & Two-Phase Locking (2PL) Protocol`
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-neutral-200 transition cursor-pointer"
            >
              🗄️ BCA Sem 3 (DBMS)
            </button>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleParseSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Subject Name / Course Code
            </label>
            <input
              type="text"
              placeholder="e.g. Data Structures & Algorithms (BCA-301)"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Paste Syllabus Text or Upload File (.txt / .doc)
              </label>
              <label className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium">
                Browse File
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={8}
              placeholder="Paste units, chapters, and bullet points from your college syllabus PDF or textbook index here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono resize-none leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Auto-generates folders, mindmaps & 10-markers
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isParsing || !rawText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>{isParsing ? 'Analyzing & Building Folders...' : 'Parse & Build Curriculum'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
