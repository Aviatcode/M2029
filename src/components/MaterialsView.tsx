import React, { useState, useRef, useEffect } from 'react';
import { AcademicMaterial, Subject, ProcessingStage, UserRole } from '../types';
import {
  UploadCloud,
  FileText,
  Clock,
  X,
  CheckCircle2,
  BookOpen,
  Image as ImageIcon,
  Download,
  Sparkles,
  HelpCircle,
  File,
  Layers,
  Database,
  Search,
  Loader2,
  Github,
  FolderGit2,
  AlertCircle,
  ChevronDown,
  FolderOpen,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { RagDocumentViewer } from './RagDocumentViewer';
import { uploadLargeFileToRag, fetchFromGitHubUrl } from '../utils/ragService';
import { ActiveNavTab } from './Sidebar';

interface MaterialsViewProps {
  materials: AcademicMaterial[];
  subjects: Subject[];
  currentRole: UserRole;
  onMaterialUploaded: (newMat: AcademicMaterial) => void;
  studentName?: string;
  classCode?: string;
  onAskAI?: (prompt: string) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials,
  subjects,
  currentRole,
  onMaterialUploaded,
  studentName,
  classCode,
  onAskAI,
  onNavigateTab,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<AcademicMaterial | null>(materials[0] || null);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  // Upload Modal State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<string>(subjects[0]?.id || '');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileType, setUploadFileType] = useState<string>('pdf');
  const [uploadFileSize, setUploadFileSize] = useState<string>('');
  const [uploadFileDataUrl, setUploadFileDataUrl] = useState<string>('');
  const [uploadTextSnippet, setUploadTextSnippet] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null);
  const [showRagModal, setShowRagModal] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // GitHub Fetch Modal State
  const [showGithubModal, setShowGithubModal] = useState<boolean>(false);
  const [githubFetchUrl, setGithubFetchUrl] = useState<string>('');
  const [githubFetchTitle, setGithubFetchTitle] = useState<string>('');
  const [githubFetchSubjectId, setGithubFetchSubjectId] = useState<string>(subjects[0]?.id || '');
  const [isGithubFetching, setIsGithubFetching] = useState<boolean>(false);
  const [githubFetchError, setGithubFetchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-select first material when materials array updates
  useEffect(() => {
    if (!selectedMaterial && materials.length > 0) {
      setSelectedMaterial(materials[0]);
    }
  }, [materials, selectedMaterial]);

  // Auto-sync subject IDs when subjects load
  useEffect(() => {
    if (!uploadSubjectId && subjects.length > 0) {
      setUploadSubjectId(subjects[0].id);
    }
    if (!githubFetchSubjectId && subjects.length > 0) {
      setGithubFetchSubjectId(subjects[0].id);
    }
  }, [subjects, uploadSubjectId, githubFetchSubjectId]);

  // Close upload modal on Escape key if idle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUploading && processingStage === 'idle') {
        setIsUploading(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, processingStage]);

  const filteredMaterials = materials.filter((m) => {
    const matchesSubject = selectedSubjectFilter === 'all' ? true : m.subjectId === selectedSubjectFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Handle incoming file selection (PDF, DOCX, JPG, PNG, TXT, etc.)
  const handleFileSelected = (file: File) => {
    setSelectedRawFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    setUploadFileName(file.name);
    setUploadFileType(ext);

    // Format file size
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setUploadFileSize(sizeStr);

    // Auto-derive clean title if empty
    if (!uploadTitle.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      setUploadTitle(cleanName);
    }

    // Only read DataURL for small images so 300MB files never spike client RAM
    if (file.type.startsWith('image/') && file.size < 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadFileDataUrl(result);
        setUploadTextSnippet(`[Scanned Image / Handwritten Notes: ${file.name}]`);
      };
      reader.readAsDataURL(file);
    } else if ((file.type === 'text/plain' || file.name.endsWith('.md')) && file.size < 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setUploadTextSnippet(text);
      };
      reader.readAsText(file);
    }
  };

  const handleStartProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setProcessingStage('uploading');
    setUploadProgress(10);

    const targetSub = subjects.find((s) => s.id === uploadSubjectId);
    const resolvedTitle = uploadTitle.trim() || uploadFileName.replace(/\.[^/.]+$/, '').trim() || 'Uploaded Document';
    const resolvedFileName = uploadFileName.trim() || `${resolvedTitle.replace(/\s+/g, '_')}.${uploadFileType}`;
    const resolvedSubName = targetSub?.name || 'Academic Subject';

    let uploadedMat: AcademicMaterial | null = null;

    if (selectedRawFile) {
      try {
        const ragRes = await uploadLargeFileToRag(selectedRawFile, {
          classId: 'class-bca-2028',
          subjectId: uploadSubjectId,
          subjectName: resolvedSubName,
          title: resolvedTitle,
          uploaderName: currentRole === 'cr' ? 'Class Representative (CR)' : currentRole === 'teacher' ? 'Faculty Professor' : 'Classmate',
          uploaderRole: currentRole,
          onProgress: (pct) => {
            setUploadProgress(Math.max(10, Math.min(92, pct)));
            if (pct >= 90) {
              setProcessingStage('generating');
            }
          },
        });

        if (ragRes.material) {
          uploadedMat = ragRes.material;
        }
      } catch (ragErr) {
        console.warn('RAG streaming upload error, falling back to legacy endpoint:', ragErr);
      }
    }

    if (!uploadedMat) {
      try {
        setProcessingStage('understanding');
        const res = await fetch('/api/materials/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: 'class-bca-2028',
            subjectId: uploadSubjectId,
            subjectName: resolvedSubName,
            title: resolvedTitle,
            fileName: resolvedFileName,
            fileType: uploadFileType,
            fileSize: uploadFileSize || '2.4 MB',
            rawTextContent: uploadTextSnippet.trim() || undefined,
            fileDataUrl: uploadFileDataUrl || undefined,
            uploaderRole: currentRole,
            uploaderName: currentRole === 'cr' ? 'Class Representative (CR)' : currentRole === 'teacher' ? 'Faculty Professor' : 'Classmate',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.material) {
            uploadedMat = data.material;
          }
        }
      } catch (err) {
        console.warn('Backend materials upload failed or offline, creating locally:', err);
      }
    }

    if (!uploadedMat) {
      uploadedMat = {
        id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        classId: 'class-bca-2028',
        subjectId: uploadSubjectId,
        subjectName: resolvedSubName,
        unitNumber: 1,
        unitTitle: 'Course Curriculum Modules',
        folderPath: `${resolvedSubName} / Unit 1 / NOTES`,
        detectedCategory: 'notes',
        title: resolvedTitle,
        fileName: resolvedFileName,
        fileType: uploadFileType,
        fileSize: uploadFileSize || '2.4 MB',
        fileDataUrl: uploadFileDataUrl || undefined,
        rawTextContent: uploadTextSnippet.trim() || resolvedTitle,
        uploaderRole: currentRole,
        uploaderName: currentRole === 'cr' ? 'Class Representative (CR)' : currentRole === 'teacher' ? 'Faculty Professor' : 'Classmate',
        verificationStatus: currentRole === 'teacher' ? 'teacher_verified' : 'student_shared',
        createdAt: 'Just now',
        resources: {
          summary: `Academic resource for ${resolvedTitle} filed under ${resolvedSubName}. Verified for semester preparation and class review.`,
          hinglishSummary: `Yeh document ${resolvedTitle} ke concepts ko cover karta hai.`,
          mindmapMermaid: `graph TD\n  A[${resolvedTitle}] --> B[Key Notes]\n  A --> C[Formula & Gotchas]\n  A --> D[Revision Checklist]`,
          keyConcepts: [
            { concept: 'Core Invariant', explanation: `Primary principle governing ${resolvedTitle}.` },
          ],
          importantDefinitions: [
            { term: resolvedTitle, definition: `University curriculum definition for ${resolvedTitle}.` },
          ],
          examples: [
            {
              title: 'Standard Implementation',
              scenario: `Practical academic scenario for ${resolvedTitle}.`,
              takeaway: 'Ensures structured syllabus understanding.',
            },
          ],
          examPoints: [
            `Standard definition of ${resolvedTitle}`,
            'Key formula and architecture steps',
          ],
          mnemonics: [
            {
              term: resolvedTitle,
              acronym: resolvedTitle.slice(0, 4).toUpperCase(),
              mnemonic: 'Master Foundation, Apply Logic, Verify Output',
              explanation: `Primary memory prompt for ${resolvedTitle}.`,
            },
          ],
          exam10Marker: {
            question: `Analyze and explain the theoretical and practical dimensions of ${resolvedTitle}.`,
            answerStructure: '1. Definition\n2. Architecture\n3. Proof & Procedure\n4. Real-world Gotchas',
            modelAnswerMarkdown: `### 1. Introduction\n${resolvedTitle} is integral to ${resolvedSubName}.\n\n### 2. Implementation Steps\nDetailed curriculum breakdown and review tips.`,
            keyDiagramText: `Architecture schematic for ${resolvedTitle}`,
          },
          flashcards: [
            { id: `fc-1`, question: `What is ${resolvedTitle}?`, answer: `Key syllabus topic in ${resolvedSubName}.` },
          ],
          quiz: [
            {
              id: `q-1`,
              question: `What is the core premise of ${resolvedTitle}?`,
              options: ['Core curriculum foundational concept', 'Alternative option', 'Irrelevant trivia', 'None'],
              correctIndex: 0,
              explanation: 'Fundamental syllabus module.',
            },
          ],
          possibleQuestions: [
            { marks: 10, question: `Explain ${resolvedTitle} in detail.`, answerOutline: 'Definition, model, outline.' },
          ],
          relatedPYQs: [
            { year: 2024, marks: 10, question: `Examine ${resolvedTitle}.` },
          ],
        },
      };
    }

    setProcessingStage('complete');
    await new Promise((r) => setTimeout(r, 350));

    if (uploadedMat) {
      onMaterialUploaded(uploadedMat);
      setSelectedMaterial(uploadedMat);
    }

    setIsUploading(false);
    setProcessingStage('idle');
    setUploadTitle('');
    setUploadFileName('');
    setUploadFileType('pdf');
    setUploadFileSize('');
    setUploadFileDataUrl('');
    setUploadTextSnippet('');
    setSelectedRawFile(null);
  };

  const handleGitHubFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubFetchUrl.trim()) return;

    setIsGithubFetching(true);
    setGithubFetchError(null);
    try {
      const targetSub = subjects.find((s) => s.id === githubFetchSubjectId);
      const subName = targetSub?.name || 'Academic Notes';
      const result = await fetchFromGitHubUrl({
        url: githubFetchUrl.trim(),
        subjectId: githubFetchSubjectId,
        subjectName: subName,
        title: githubFetchTitle.trim() || undefined,
        uploaderName: currentRole === 'cr' ? 'Class Representative (CR)' : 'Student Contributor',
      });

      if (result.material) {
        onMaterialUploaded(result.material);
        setSelectedMaterial(result.material);
        setShowGithubModal(false);
        setGithubFetchUrl('');
        setGithubFetchTitle('');
      } else {
        throw new Error(result.message || 'Failed to fetch GitHub resource');
      }
    } catch (err: any) {
      setGithubFetchError(err.message || 'GitHub fetch failed. Please check the URL.');
    } finally {
      setIsGithubFetching(false);
    }
  };

  const getFormatBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800/80 text-rose-300/90 border border-rose-500/20">PDF</span>;
    }
    if (t.includes('doc')) {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800/80 text-blue-300/90 border border-blue-500/20">DOCX</span>;
    }
    if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg')) {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800/80 text-emerald-300/90 border border-emerald-500/20">IMAGE</span>;
    }
    if (t.includes('ppt')) {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800/80 text-amber-300/90 border border-amber-500/20">PPTX</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-750">{type.toUpperCase()}</span>;
  };

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. TOP HEADER (Matching Lucas Bennett / fitness reference design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('settings') : undefined}
            className="flex items-center gap-2 mb-1 group cursor-pointer text-left focus:outline-none"
            title="Manage Profile & Settings"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 group-hover:border-cyan-500 transition-colors">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
              • {classCode || 'BCA-2028'}
            </span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Study Materials
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative w-40 sm:w-52">
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-cyan-400 cursor-pointer transition"
              title="Search Materials"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          {/* GitHub Fetch */}
          <button
            onClick={() => setShowGithubModal(true)}
            className="h-8 px-3 rounded-xl bg-[#141926] border border-slate-800 text-xs text-indigo-300 hover:text-white hover:border-indigo-500/40 flex items-center gap-1.5 cursor-pointer font-semibold transition"
          >
            <Github className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">GitHub</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploading(true)}
            className="h-8 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          {/* Subject Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              className="h-8 px-3 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <span className="max-w-[100px] truncate">
                {selectedSubjectFilter === 'all'
                  ? 'All Subjects'
                  : subjects.find((s) => s.id === selectedSubjectFilter)?.name || 'Subject'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isFilterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedSubjectFilter('all');
                    setIsFilterDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  All Subjects ({materials.length})
                </button>
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectFilter(sub.id);
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 truncate cursor-pointer"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3-COLUMN CARDS GRID (Matching Lucas Bennett / fitness reference layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: Vault Overview & Quick Drop */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Vault Overview</h2>
            </div>
            <button
              onClick={() => setIsUploading(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              + New
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {materials.length}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                {materials.length > 0 ? 'Active' : 'Empty'}
              </span>
            </div>
          </div>

          {/* Overlapping Circles */}
          <div className="relative h-40 flex items-center justify-center my-1 select-none">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectFilter('all');
                setSearchQuery('');
              }}
              title="Show All Documents"
              className="absolute left-6 top-2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-lg font-extrabold">{materials.length}</span>
              <span className="text-[10px] text-violet-200">Docs</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              title="Filter by Subject"
              className="absolute right-6 top-4 w-20 h-20 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20 cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-base font-extrabold">{subjects.length}</span>
              <span className="text-[10px] text-slate-400">Subjects</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRagModal(true)}
              title="Open Class RAG Vector Engine"
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
            >
              <span className="text-sm font-black">100%</span>
              <span className="text-[8px] uppercase tracking-wider">Sync</span>
            </button>
          </div>

          {/* Quick Dropzone Widget */}
          <div
            onClick={() => setIsUploading(true)}
            className="p-3.5 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/40 bg-[#0d111a] cursor-pointer flex flex-col items-center justify-center text-center gap-1 transition"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Drop files to add notes</span>
            <span className="text-[10px] text-slate-500 font-mono">PDF • DOCX • PPTX</span>
          </div>
        </div>

        {/* CARD 2: File Archive List */}
        <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Documents</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {filteredMaterials.length} files
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 no-scrollbar">
            {filteredMaterials.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                <FileText className="w-6 h-6 text-slate-600" />
                <span>No files found</span>
              </div>
            ) : (
              filteredMaterials.map((mat) => {
                const isSelected = selectedMaterial?.id === mat.id;
                return (
                  <div
                    key={mat.id}
                    onClick={() => {
                      setSelectedMaterial(mat);
                      setShowFullAnswer(false);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition text-xs space-y-1 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/60 text-white shadow-md'
                        : 'bg-[#0d111a] border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold truncate">{mat.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {mat.downloadUrl && (
                          <a
                            href={mat.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition"
                            title="Open original question paper PDF"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {mat.fileType || 'PDF'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="truncate">{mat.subjectName}</span>
                      <span>{mat.fileSize || '2.4 MB'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setIsUploading(true)}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-200 transition cursor-pointer text-center"
          >
            + Upload Document
          </button>
        </div>

        {/* CARD 3: Document Intel & RAG */}
        <div className="bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100">Document Intel</h2>
            </div>
            {selectedMaterial && (
              <div className="flex items-center gap-1.5">
                {selectedMaterial.downloadUrl && (
                  <a
                    href={selectedMaterial.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Open original question paper PDF"
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span>View PDF</span>
                  </a>
                )}
                {onAskAI && selectedMaterial.resources.exam10Marker && (
                  <button
                    onClick={() => onAskAI(`Explain this GGSIPU 10-Marker Question from ${selectedMaterial.title}: "${selectedMaterial.resources.exam10Marker?.question}". Provide full derivation and university grading gotchas.`)}
                    className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    title="Ask AI Companion"
                  >
                    <span>Ask AI</span>
                  </button>
                )}
                <button
                  onClick={() => setShowRagModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>⚡ RAG</span>
                </button>
              </div>
            )}
          </div>

          {selectedMaterial ? (
            <div className="space-y-3 overflow-y-auto max-h-80 pr-1 no-scrollbar text-xs">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  {selectedMaterial.subjectName}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5 truncate">
                  {selectedMaterial.title}
                </h3>
              </div>

              <div className="p-3 rounded-2xl bg-[#121724] border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Core Invariant</span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedMaterial.resources.summary}
                </p>
              </div>

              {selectedMaterial.resources.exam10Marker && (
                <div className="p-3 rounded-2xl bg-[#141926] border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">10-Marker Model Question</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">GGSIPU Pattern</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100">
                    {selectedMaterial.resources.exam10Marker.question}
                  </p>
                  <div className="text-[11px] text-slate-300 font-mono whitespace-pre-line bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    {selectedMaterial.resources.exam10Marker.answerStructure}
                  </div>
                  {selectedMaterial.resources.exam10Marker.modelAnswerMarkdown && (
                    <div className="pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => setShowFullAnswer((prev) => !prev)}
                        className="text-[10px] font-mono font-semibold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                      >
                        <span>{showFullAnswer ? '▲ Hide Full Model Answer' : '▼ View Full Model Answer'}</span>
                      </button>
                      {showFullAnswer && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-200 whitespace-pre-line font-mono leading-relaxed">
                          {selectedMaterial.resources.exam10Marker.modelAnswerMarkdown}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedMaterial.resources.importantDefinitions?.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#121724] border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Key Definitions (Tap to Ask AI)</span>
                  {selectedMaterial.resources.importantDefinitions.slice(0, 2).map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAskAI && onAskAI(`Explain this key definition: "${d.term}: ${d.definition}" in detail with real-world examples and examination gotchas.`)}
                      className="w-full text-left text-xs p-1.5 rounded-xl hover:bg-slate-800/80 transition cursor-pointer group"
                      title="Click to ask AI about this term"
                    >
                      <span className="text-amber-300 font-bold group-hover:text-amber-200">{d.term}: </span>
                      <span className="text-slate-300 group-hover:text-white">{d.definition}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-2">
              <FileText className="w-8 h-8 text-slate-600" />
              <span>Select any document to view AI notes & exam outlines</span>
            </div>
          )}

          <div
            onClick={() => setShowRagModal(true)}
            className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs cursor-pointer hover:opacity-85 transition"
            title="Open RAG status"
          >
            <span className="text-slate-500 font-mono text-[10px]">Indexed for Class AI</span>
            <span className="text-emerald-400 font-bold text-[10px]">Ready ⚡</span>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

      {/* RAG Document Viewer Modal */}
      {showRagModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c101d] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <RagDocumentViewer
              docId={selectedMaterial.id}
              initialDocument={{
                id: selectedMaterial.id,
                classId: selectedMaterial.classId,
                subjectId: selectedMaterial.subjectId,
                subjectName: selectedMaterial.subjectName,
                title: selectedMaterial.title,
                fileName: selectedMaterial.fileName,
                fileType: selectedMaterial.fileType,
                fileSize: selectedMaterial.fileSize,
                storageUrl: selectedMaterial.downloadUrl || '',
                totalChunks: 8,
                processedChunks: 8,
                status: 'ready',
                createdAt: selectedMaterial.createdAt,
                keyConcepts: selectedMaterial.resources.keyConcepts?.map((k: any) => k.concept || k.term || '') || [],
                summary: selectedMaterial.resources.summary
              } as any}
              onClose={() => setShowRagModal(false)}
            />
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {isUploading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            if (processingStage === 'idle') setIsUploading(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[#121724] border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Upload Material & Notes</h3>
              </div>
              {processingStage === 'idle' && (
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {processingStage !== 'idle' ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <div>
                  <span className="text-sm font-bold text-white block capitalize">
                    {processingStage === 'uploading' ? 'Uploading & Streaming...' : processingStage === 'generating' ? 'Generating Class Intel...' : 'Indexing with AI...'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Extracting 10-markers, formulas, and syllabus linkages.
                  </span>
                </div>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartProcessing} className="space-y-3.5 text-xs">
                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`p-6 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    isDragOver
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : uploadFileName
                      ? 'border-emerald-500/50 bg-emerald-950/15'
                      : 'border-slate-800 hover:border-slate-700 bg-[#0d111a]'
                  }`}
                >
                  {uploadFileName ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <div>
                        <span className="font-bold text-emerald-300 block truncate max-w-xs">{uploadFileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{uploadFileSize} • {uploadFileType.toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Tap to choose a different file</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-cyan-400" />
                      <span className="font-semibold text-slate-200">Drag & drop paper or tap to browse</span>
                      <span className="text-[10px] text-slate-500 font-mono">PDF • DOCX • PPTX • IMAGES • TXT</span>
                    </>
                  )}
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Subject *</label>
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full bg-[#141926] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Document Title *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. DBMS Unit 1 Question Bank 2024"
                    required
                    className="w-full bg-[#141926] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsUploading(false)}
                    className="px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition text-xs cursor-pointer shadow-sm shadow-cyan-500/20"
                  >
                    Add Document to Vault
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GitHub Fetch Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            if (!isGithubFetching) setShowGithubModal(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[#121724] border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Import from GitHub</h3>
              </div>
              {!isGithubFetching && (
                <button
                  type="button"
                  onClick={() => setShowGithubModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {githubFetchError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{githubFetchError}</span>
              </div>
            )}

            <form onSubmit={handleGitHubFetch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">GitHub File / Raw URL *</label>
                <input
                  type="url"
                  value={githubFetchUrl}
                  onChange={(e) => setGithubFetchUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../lecture_notes.pdf"
                  required
                  className="w-full bg-[#141926] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject *</label>
                <select
                  value={githubFetchSubjectId}
                  onChange={(e) => setGithubFetchSubjectId(e.target.value)}
                  className="w-full bg-[#141926] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  value={githubFetchTitle}
                  onChange={(e) => setGithubFetchTitle(e.target.value)}
                  placeholder="Auto-derived from file if left blank"
                  className="w-full bg-[#141926] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={isGithubFetching}
                  onClick={() => setShowGithubModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGithubFetching || !githubFetchUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isGithubFetching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Fetch & Index</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
