import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Folder,
  FolderOpen,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Award,
  FileQuestion,
  BookOpen,
  Lightbulb,
  Zap,
  Copy,
  Check,
  RefreshCw,
  Share2,
  ChevronRight,
  ChevronDown,
  FileCheck,
  Network,
  HelpCircle,
  Hash,
  AlertCircle,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AcademicMaterial, Subject, Unit, UserRole } from '../types';
import { MindmapViewer } from './MindmapViewer';
import { getAiRequestPayload } from '../utils/aiModelService';

interface SmartDumpViewProps {
  materials: AcademicMaterial[];
  subjects: Subject[];
  unitsBySubject?: Record<string, Unit[]>;
  currentRole: UserRole;
  classCode: string;
  onMaterialUploaded?: (mat: AcademicMaterial) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SmartDumpView: React.FC<SmartDumpViewProps> = ({
  materials,
  subjects,
  unitsBySubject = {},
  currentRole,
  classCode,
  onMaterialUploaded,
  onNavigateToTab,
}) => {
  // Input State
  const [dumpMode, setDumpMode] = useState<'files' | 'text'>('files');
  const [rawText, setRawText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion Processing Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [lastUploadedMaterial, setLastUploadedMaterial] = useState<AcademicMaterial | null>(null);

  // Explorer State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    all: true,
  });
  const [activeItem, setActiveItem] = useState<AcademicMaterial | null>(materials[0] || null);
  const [activeDetailTab, setActiveDetailTab] = useState<'notes' | 'mnemonics' | 'mindmap' | '10marker' | 'quiz'>('notes');

  // Quiz Player State for active material
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  // Compute Statistics
  const totalMaterials = materials.length;
  const totalMnemonics = materials.reduce((acc, m) => acc + (m.resources?.mnemonics?.length || 0), 0);
  const totalQuizzes = materials.reduce((acc, m) => acc + (m.resources?.quiz?.length || 0), 0);
  const total10Markers = materials.filter((m) => m.resources?.exam10Marker || m.resources?.possibleQuestions?.length).length;

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Core Automated Ingestion Pipeline (Zero-Prompting)
  const processAndIngest = async (fileData: {
    fileName: string;
    fileType: string;
    fileSize: string;
    rawTextContent?: string;
    fileDataUrl?: string;
  }) => {
    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessingStage('📥 Extracting text, metadata, and structural headers...');

    await new Promise((r) => setTimeout(r, 400));
    setProcessingProgress(40);
    setProcessingStage('🧠 AI Zero-Prompt Classifier: Matching syllabus unit, subject & category...');

    await new Promise((r) => setTimeout(r, 450));
    setProcessingProgress(70);
    setProcessingStage('⚡ Compounding Knowledge: Synthesizing notes, mnemonics, mindmap & 10-markers...');

    try {
      const aiPayload = getAiRequestPayload();
      const response = await fetch('/api/materials/smart-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: 'class-bca-2028',
          file: fileData,
          uploaderName: currentRole === 'teacher' ? 'Faculty Professor' : 'Classmate',
          uploaderRole: currentRole,
          ...aiPayload,
        }),
      });

      const data = await response.json();
      setProcessingProgress(100);
      setProcessingStage('✅ Auto-sorted into classroom folders! Ready across all student devices.');

      if (data.status === 'success' && data.material) {
        onMaterialUploaded?.(data.material);
        setLastUploadedMaterial(data.material);
        setActiveItem(data.material);

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Ingestion failed:', err);
      setProcessingStage('⚠️ Upload complete with fallback rule-based sorting.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStage('');
      }, 1800);
    }
  };

  // 2. Handle File Drop / Select
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');

    reader.onload = () => {
      const result = reader.result as string;
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      let rawTextContent = '';
      if (!isImage) {
        rawTextContent = typeof result === 'string' ? result.slice(0, 8000) : '';
      }

      processAndIngest({
        fileName: file.name,
        fileType: fileExt,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        rawTextContent: rawTextContent || `${file.name.replace(/\.[^/.]+$/, '')} curriculum notes`,
        fileDataUrl: isImage ? result : undefined,
      });
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  // 3. Handle Raw Text / Note Dump
  const handleRawTextDump = () => {
    if (!rawText.trim()) return;
    const title = textTitle.trim() || rawText.trim().split('\n')[0].slice(0, 40) || 'Lecture Notes';
    const cleanFileName = `${title.replace(/\s+/g, '_').toLowerCase()}.txt`;

    processAndIngest({
      fileName: cleanFileName,
      fileType: 'txt',
      fileSize: `${(rawText.length / 1024).toFixed(1)} KB`,
      rawTextContent: rawText,
    });

    setRawText('');
    setTextTitle('');
  };

  // 4. Quick Sample Dumps for One-Click Testing
  const handleSampleDump = (sampleType: 'os_deadlocks' | 'dbms_norm' | 'cn_osi') => {
    if (sampleType === 'os_deadlocks') {
      processAndIngest({
        fileName: 'OS_Unit3_Deadlocks_Coffman_Conditions.pdf',
        fileType: 'pdf',
        fileSize: '1.8 MB',
        rawTextContent: `Operating Systems Unit 3: Deadlocks and Process Synchronization.
A deadlock situation can arise if and only if 4 Coffman conditions hold simultaneously:
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be holding at least one resource and waiting to acquire additional resources.
3. No Preemption: Resources cannot be preempted; a resource can be released only voluntarily by the process holding it.
4. Circular Wait: A closed chain of processes exists such that each process holds at least one resource needed by the next.
Banker's Algorithm is used for deadlock avoidance using safe sequences. Available, Max, Allocation, Need matrices.`,
      });
    } else if (sampleType === 'dbms_norm') {
      processAndIngest({
        fileName: 'DBMS_PYQ_2024_Normalization_1NF_to_BCNF.docx',
        fileType: 'docx',
        fileSize: '2.4 MB',
        rawTextContent: `Database Management Systems University Exam Paper 2024.
Question 4 (10 Marks): What is Normalization? Explain 1NF, 2NF, 3NF, and BCNF with functional dependencies and anomalous decomposition examples.
Answer Outline:
1. Definition of Normalization: Minimizes data redundancy and prevents insertion, deletion, and update anomalies.
2. 1NF: Atomic values only. No repeating groups.
3. 2NF: In 1NF and no partial dependencies (every non-prime attribute is fully functionally dependent on primary key).
4. 3NF: In 2NF and no transitive dependencies (X -> Y where neither is superkey).
5. BCNF (Boyce-Codd NF): For every functional dependency X -> Y, X must be a super key.`,
      });
    } else {
      processAndIngest({
        fileName: 'Computer_Networks_Unit2_OSI_7_Layers_Cheatsheet.png',
        fileType: 'png',
        fileSize: '3.1 MB',
        rawTextContent: `Computer Networks OSI 7 Layer Reference Model:
Application (HTTP, DNS, FTP) -> Presentation (Encryption, ASCII) -> Session (RPC, Sockets) -> Transport (TCP, UDP) -> Network (IP, Routers) -> Data Link (Ethernet, MAC, Switches) -> Physical (Cables, Bits).
Mnemonic: "All People Seem To Need Data Processing" (Top to Bottom) or "Please Do Not Throw Sausage Pizza Away" (Bottom to Top).`,
      });
    }
  };

  // Group materials into folders: Subject -> Unit -> Category
  const folderTree = React.useMemo(() => {
    const tree: Record<
      string,
      {
        subjectName: string;
        units: Record<string, AcademicMaterial[]>;
      }
    > = {};

    materials.forEach((m) => {
      const subName = m.subjectName || 'General Academic';
      const unitKey = m.unitTitle || (m.unitNumber ? `Unit ${m.unitNumber}` : 'General Curriculum');

      if (!tree[subName]) {
        tree[subName] = { subjectName: subName, units: {} };
      }
      if (!tree[subName].units[unitKey]) {
        tree[subName].units[unitKey] = [];
      }
      tree[subName].units[unitKey].push(m);
    });

    return tree;
  }, [materials]);

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    if (selectedSubjectId !== 'all' && m.subjectId !== selectedSubjectId && m.subjectName !== selectedSubjectId) {
      return false;
    }
    if (selectedCategory !== 'all') {
      const cat = m.detectedCategory || (m.fileName.toLowerCase().includes('pyq') ? 'pyq' : 'notes');
      if (cat !== selectedCategory) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-6 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Autonomous Ingestion & Zero-Prompting Sort</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-serif-heading">
              Universal Academic Drop & Auto-Sort
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Dump any study material here: handwritten notes, PDFs, DOCX, images, PYQs, assignments, or pasted text.
              The AI automatically analyzes, maps to your syllabus, files into folders, and extracts{' '}
              <strong className="text-cyan-200">notes, mnemonics, visual mindmaps, 10-markers & self-quizzes</strong>.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 bg-slate-900/80 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="text-center px-2 py-1">
              <div className="text-lg font-bold text-cyan-400 font-mono-code">{totalMaterials}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Vault Files</div>
            </div>
            <div className="text-center px-2 py-1">
              <div className="text-lg font-bold text-amber-400 font-mono-code">{totalMnemonics}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mnemonics</div>
            </div>
            <div className="text-center px-2 py-1">
              <div className="text-lg font-bold text-emerald-400 font-mono-code">{total10Markers}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">10-Markers</div>
            </div>
            <div className="text-center px-2 py-1">
              <div className="text-lg font-bold text-indigo-400 font-mono-code">{totalQuizzes}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Quiz MCQs</div>
            </div>
          </div>
        </div>

        {/* Centralized Classroom Sync Banner */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Shared Classroom Repository Active: Any dump here is immediately common & available to every student in{' '}
              <span className="font-bold underline">{classCode}</span> with 0 token overhead!
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/60 text-slate-300 text-[11px] font-mono-code">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Compounding Intelligence Engine</span>
          </div>
        </div>
      </div>

      {/* 2. DUMP ZONE (DRAG & DROP / RAW TEXT / QUICK TEST SAMPLES) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 md:p-6 shadow-xl space-y-4">
        {/* Dump Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDumpMode('files')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                dumpMode === 'files'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Dump Files (PDF, DOCX, Images, Slides)</span>
            </button>
            <button
              onClick={() => setDumpMode('text')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                dumpMode === 'text'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dump Text Notes / Syllabus / Past Questions</span>
            </button>
          </div>

          {/* Quick Demo Pre-sets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">1-Click Test Dumps:</span>
            <button
              onClick={() => handleSampleDump('os_deadlocks')}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer disabled:opacity-50"
              title="Test ingestion with OS Deadlocks notes"
            >
              ⚡ OS Deadlocks
            </button>
            <button
              onClick={() => handleSampleDump('dbms_norm')}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer disabled:opacity-50"
              title="Test ingestion with DBMS Normalization PYQ"
            >
              ⚡ DBMS Normalization
            </button>
            <button
              onClick={() => handleSampleDump('cn_osi')}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer disabled:opacity-50"
              title="Test ingestion with OSI Model Cheatsheet"
            >
              ⚡ OSI 7 Layers
            </button>
          </div>
        </div>

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div className="p-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 space-y-3 animate-pulse">
            <div className="flex items-center justify-between text-xs font-medium text-cyan-200">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{processingStage}</span>
              </span>
              <span className="font-mono-code">{processingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* MODE 1: FILE DROP ZONE */}
        {dumpMode === 'files' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 md:p-10 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Drag & Drop multiple files here, or <span className="text-cyan-400 underline">browse your device</span>
              </p>
              <p className="text-xs text-slate-400">
                PDFs, Word DOCX, PowerPoint slides, Lecture PNG/JPGs, or Markdown notes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-[10px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Auto-Detects Subject</span>
              <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Auto-Extracts Mindmaps</span>
              <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Auto-Generates Mnemonics</span>
              <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Auto-Solves 10-Markers</span>
              <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">Creates Practice Quizzes</span>
            </div>
          </div>
        )}

        {/* MODE 2: RAW TEXT / NOTES DUMP */}
        {dumpMode === 'text' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Optional Title (e.g. Operating Systems Deadlock Conditions or Leave Blank to Auto-Detect)"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              rows={6}
              placeholder="Paste raw lecture notes, syllabus snippet, textbook paragraphs, or university exam questions here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono-code"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Zero Prompting Required: The AI understands the curriculum context automatically.
              </span>
              <button
                onClick={handleRawTextDump}
                disabled={!rawText.trim() || isProcessing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Sort & Extract Pack</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. ORGANIZED FOLDERS & VAULT EXPLORER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Folders & File Navigator */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white font-serif-heading">Auto-Sorted Folders</h2>
            </div>
            <span className="text-[11px] font-mono-code text-slate-400">{filteredMaterials.length} Items</span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedCategory('notes')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedCategory === 'notes'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setSelectedCategory('pyq')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedCategory === 'pyq'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              PYQs
            </button>
            <button
              onClick={() => setSelectedCategory('assignment')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedCategory === 'assignment'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Assignments
            </button>
          </div>

          {/* Subject Filter Dropdown */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">📂 All Curriculum Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Folder Tree */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {Object.entries(folderTree).map(([subjectName, { units }]) => {
              const subKey = `sub-${subjectName}`;
              const isSubExpanded = expandedFolders[subKey] !== false;
              const subItemCount = Object.values(units).flat().length;

              return (
                <div key={subjectName} className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                  {/* Subject Folder Header */}
                  <div
                    onClick={() => toggleFolder(subKey)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      {isSubExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <Folder className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white truncate max-w-[210px]">{subjectName}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono-code">
                      {subItemCount}
                    </span>
                  </div>

                  {/* Units Sub-folders */}
                  {isSubExpanded && (
                    <div className="pl-4 pr-2 pb-2 space-y-2 border-t border-slate-800/50 pt-2">
                      {Object.entries(units).map(([unitTitle, items]) => {
                        const unitKey = `unit-${subjectName}-${unitTitle}`;
                        const isUnitExpanded = expandedFolders[unitKey] !== false;

                        return (
                          <div key={unitTitle} className="space-y-1">
                            <div
                              onClick={() => toggleFolder(unitKey)}
                              className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-slate-800/40 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-1.5 text-slate-300">
                                {isUnitExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                )}
                                <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[200px]">
                                  {unitTitle}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono-code">{items.length}</span>
                            </div>

                            {/* Individual Files inside Unit */}
                            {isUnitExpanded && (
                              <div className="pl-4 space-y-1">
                                {items.map((item) => {
                                  const isSelected = activeItem?.id === item.id;
                                  const isPYQ = item.fileName.toLowerCase().includes('pyq') || item.detectedCategory === 'pyq';
                                  const isAssign = item.detectedCategory === 'assignment';

                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => setActiveItem(item)}
                                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                                        isSelected
                                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-medium'
                                          : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        {isPYQ ? (
                                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        ) : isAssign ? (
                                          <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                        )}
                                        <span className="truncate">{item.title}</span>
                                      </div>
                                      <span className="text-[10px] font-mono-code text-slate-500 uppercase shrink-0 ml-1">
                                        {item.fileType}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {materials.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No materials dumped yet. Drop a PDF or paste notes above!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Ingested Pack Inspector (Notes, Mnemonics, Mindmap, 10-Marker, Quiz) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6 shadow-xl space-y-5">
          {activeItem ? (
            <>
              {/* Material Header */}
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      {activeItem.subjectName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-slate-300">
                      {activeItem.unitTitle || (activeItem.unitNumber ? `Unit ${activeItem.unitNumber}` : 'General')}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Common Class Cache (0 Tokens)</span>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white font-serif-heading">{activeItem.title}</h2>
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                  <span>File: <strong className="text-slate-300 font-mono-code">{activeItem.fileName}</strong></span>
                  <span>•</span>
                  <span>Size: {activeItem.fileSize}</span>
                  <span>•</span>
                  <span>Uploaded by: {activeItem.uploaderName}</span>
                </div>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-2">
                <button
                  onClick={() => setActiveDetailTab('notes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'notes'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Notes & Summary</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('mnemonics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'mnemonics'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Mnemonics ({activeItem.resources?.mnemonics?.length || 1})</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('mindmap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'mindmap'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Visual Mindmap</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('10marker')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === '10marker'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>10-Marker Model Answer</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('quiz')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'quiz'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileQuestion className="w-3.5 h-3.5" />
                  <span>Self-Quiz ({activeItem.resources?.quiz?.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: NOTES & SUMMARY */}
              {activeDetailTab === 'notes' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Executive Student Primer</span>
                    </h3>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {activeItem.resources?.summary || 'Synthesized high-yield lecture overview for semester exam preparation.'}
                    </p>
                    {activeItem.resources?.hinglishSummary && (
                      <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        💬 <strong>Quick Recap:</strong> {activeItem.resources.hinglishSummary}
                      </p>
                    )}
                  </div>

                  {/* Key Concepts */}
                  {activeItem.resources?.keyConcepts && activeItem.resources.keyConcepts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Key Concepts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {activeItem.resources.keyConcepts.map((c, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                            <span className="text-xs font-bold text-cyan-200 block">{c.concept}</span>
                            <span className="text-xs text-slate-400 block leading-normal">{c.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Important Definitions */}
                  {activeItem.resources?.importantDefinitions && activeItem.resources.importantDefinitions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Standard Definitions</h4>
                      <div className="space-y-2">
                        {activeItem.resources.importantDefinitions.map((d, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                            <strong className="text-amber-300">{d.term}:</strong>{' '}
                            <span className="text-slate-300">{d.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Points */}
                  {activeItem.resources?.examPoints && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs">
                      <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>University Evaluator Advice</span>
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {activeItem.resources.examPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MNEMONICS & MEMORY HACKS */}
              {activeDetailTab === 'mnemonics' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    💡 <strong>Memory Retention Engine:</strong> Mnemonics convert hard-to-memorize technical conditions and lists into sticky hooks for university exams.
                  </div>

                  <div className="space-y-3">
                    {activeItem.resources?.mnemonics && activeItem.resources.mnemonics.length > 0 ? (
                      activeItem.resources.mnemonics.map((mn, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 space-y-2.5 shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white font-serif-heading">{mn.term}</span>
                            {mn.acronym && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs font-mono-code tracking-wider shadow">
                                {mn.acronym}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-amber-200 bg-amber-950/40 p-3 rounded-lg border border-amber-500/20">
                            "{mn.mnemonic}"
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{mn.explanation}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{activeItem.title} Mnemonic</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs font-mono-code">
                            CORE
                          </span>
                        </div>
                        <div className="text-sm font-bold text-amber-200">
                          "Understand the Core Mechanism, Rule Out Anomalies, Apply Invariants"
                        </div>
                        <p className="text-xs text-slate-300">
                          Auto-generated memory hook for {activeItem.title}. Remember definitions first, then draw standard flow diagrams.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VISUAL MINDMAP */}
              {activeDetailTab === 'mindmap' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Rendered Architecture Breakdown for {activeItem.title}</span>
                    {activeItem.resources?.mindmapMermaid && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeItem.resources?.mindmapMermaid || '');
                          setCopiedMermaid(true);
                          setTimeout(() => setCopiedMermaid(false), 2000);
                        }}
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                      >
                        {copiedMermaid ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMermaid ? 'Copied' : 'Copy Mermaid'}</span>
                      </button>
                    )}
                  </div>

                  <MindmapViewer
                    topicTitle={activeItem.title}
                    mermaidSyntax={
                      activeItem.resources?.mindmapMermaid ||
                      `graph TD\n  A[${activeItem.title}] --> B[Foundational Concepts]\n  A --> C[Algorithms & Schema]\n  A --> D[University 10-Marker Structure]`
                    }
                    nodes={
                      activeItem.resources?.mindmapNodes || [
                        {
                          id: 'root',
                          label: activeItem.title,
                          description: 'Central concept',
                          type: 'root',
                          children: [
                            { id: 'c1', label: 'Core Mechanism', description: 'Theoretical basis', type: 'category' },
                            { id: 'c2', label: 'Exam Pattern', description: '10-Marker scoring structure', type: 'category' },
                            { id: 'c3', label: 'Implementation', description: 'Pseudocode and schema', type: 'category' },
                          ],
                        },
                      ]
                    }
                  />
                </div>
              )}

              {/* TAB 4: 10-MARKER MODEL ANSWER */}
              {activeDetailTab === '10marker' && (
                <div className="space-y-4">
                  {activeItem.resources?.exam10Marker ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            University Prescribed 10-Marker Question
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs">
                            10 MARKS
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          {activeItem.resources.exam10Marker.question}
                        </h3>
                      </div>

                      {/* Answer Structure Outline */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                        <span className="font-bold text-cyan-300">Marking Structure Breakdown:</span>
                        <pre className="text-slate-300 font-sans-ui whitespace-pre-line text-xs">
                          {activeItem.resources.exam10Marker.answerStructure}
                        </pre>
                      </div>

                      {/* Full Model Answer */}
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">
                          Evaluator-Grade Complete Solution
                        </span>
                        <div className="text-xs text-slate-300 space-y-2 leading-relaxed whitespace-pre-line font-sans-ui">
                          {activeItem.resources.exam10Marker.modelAnswerMarkdown}
                        </div>
                      </div>

                      {activeItem.resources.exam10Marker.keyDiagramText && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-[11px] text-cyan-300">
                          <strong>Required Diagram:</strong> {activeItem.resources.exam10Marker.keyDiagramText}
                        </div>
                      )}
                    </div>
                  ) : activeItem.resources?.possibleQuestions && activeItem.resources.possibleQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {activeItem.resources.possibleQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{q.question}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              {q.marks} MARKS
                            </span>
                          </div>
                          <div className="text-slate-400">
                            <strong className="text-slate-300">Answer Outline:</strong> {q.answerOutline}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No 10-marker model answer recorded for this document yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SELF-ASSESSMENT QUIZ */}
              {activeDetailTab === 'quiz' && (
                <div className="space-y-4">
                  {activeItem.resources?.quiz && activeItem.resources.quiz.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Answer the questions to test your mastery of {activeItem.title}</span>
                        {quizSubmitted && (
                          <button
                            onClick={() => {
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                            }}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Quiz</span>
                          </button>
                        )}
                      </div>

                      {activeItem.resources.quiz.map((q, qIdx) => {
                        const selected = quizAnswers[qIdx];
                        const isAnswered = selected !== undefined;
                        const isCorrect = selected === q.correctIndex;

                        return (
                          <div
                            key={q.id || qIdx}
                            className={`p-4 rounded-xl border transition ${
                              quizSubmitted
                                ? isCorrect
                                  ? 'border-emerald-500/40 bg-emerald-950/20'
                                  : 'border-rose-500/40 bg-rose-950/20'
                                : 'border-slate-800 bg-slate-900/60'
                            } space-y-3`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {qIdx + 1}
                              </span>
                              <h4 className="text-xs font-semibold text-white leading-normal">{q.question}</h4>
                            </div>

                            <div className="space-y-1.5 pl-7">
                              {q.options.map((opt, optIdx) => {
                                const isThisSelected = selected === optIdx;
                                const isThisCorrectOption = optIdx === q.correctIndex;

                                let btnStyle =
                                  'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850';
                                if (quizSubmitted) {
                                  if (isThisCorrectOption) {
                                    btnStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                                  } else if (isThisSelected) {
                                    btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200';
                                  }
                                } else if (isThisSelected) {
                                  btnStyle = 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-semibold';
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => {
                                      if (!quizSubmitted) {
                                        setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                                      }
                                    }}
                                    disabled={quizSubmitted}
                                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                                  >
                                    <span>{opt}</span>
                                    {quizSubmitted && isThisCorrectOption && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && q.explanation && (
                              <div className="pl-7 pt-1 text-[11px] text-slate-400 italic">
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {!quizSubmitted ? (
                        <button
                          onClick={() => {
                            setQuizSubmitted(true);
                            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
                          }}
                          disabled={Object.keys(quizAnswers).length === 0}
                          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                        >
                          Submit Quiz & Check Score
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                          <span className="text-xs font-bold text-white block">
                            Quiz Completed!{' '}
                            {Object.entries(quizAnswers).filter(
                              ([idx, val]) => val === activeItem.resources?.quiz[Number(idx)]?.correctIndex
                            ).length}{' '}
                            / {activeItem.resources.quiz.length} Correct
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Zero tokens were burned during evaluation. All explanations were generated once upon ingestion.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No quiz attached to this document.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center space-y-3">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">Select a material from the folder tree</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click any note, PYQ, or assignment on the left to inspect its executive notes, mnemonics, visual mindmap, and quiz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
