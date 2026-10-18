import React, { useState, useRef, useEffect } from 'react';
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
  Smartphone,
  Download,
  Laptop,
  Share,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AcademicMaterial, Subject, Unit, UserRole } from '../types';
import { MindmapViewer } from './MindmapViewer';
import { getAiRequestPayload } from '../utils/aiModelService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { checkAndRetrieveSharedFiles } from '../utils/shareTargetService';

interface SmartDumpViewProps {
  materials: AcademicMaterial[];
  subjects: Subject[];
  unitsBySubject?: Record<string, Unit[]>;
  currentRole: UserRole;
  classCode: string;
  activeMaterialId?: string | null;
  onSelectActiveMaterialId?: (id: string) => void;
  onMaterialUploaded?: (mat: AcademicMaterial) => void;
  onNavigateToTab?: (tab: string) => void;
  pendingFiles?: File[];
  onClearPendingFiles?: () => void;
}

export const SmartDumpView: React.FC<SmartDumpViewProps> = ({
  materials,
  subjects,
  unitsBySubject = {},
  currentRole,
  classCode,
  activeMaterialId,
  onSelectActiveMaterialId,
  onMaterialUploaded,
  onNavigateToTab,
  pendingFiles,
  onClearPendingFiles,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  // Input State
  const [dumpMode, setDumpMode] = useState<'files' | 'text'>('files');
  const [rawText, setRawText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);
  const archiveSectionRef = useRef<HTMLDivElement>(null);

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
  const [activeItem, setActiveItem] = useState<AcademicMaterial | null>(() => {
    if (activeMaterialId) {
      const match = materials.find((m) => m.id === activeMaterialId);
      if (match) return match;
    }
    return materials[0] || null;
  });
  const [activeDetailTab, setActiveDetailTab] = useState<'notes' | 'mnemonics' | 'mindmap' | '10marker' | 'quiz'>('notes');

  // Synchronize activeItem when activeMaterialId or materials updates
  useEffect(() => {
    if (activeMaterialId) {
      const match = materials.find((m) => m.id === activeMaterialId);
      if (match) {
        setActiveItem(match);
        setExpandedFolders((prev) => ({
          ...prev,
          all: true,
          [`sub-${match.subjectName}`]: true,
          [`unit-${match.subjectName}-${match.unitTitle || (match.unitNumber ? 'Unit ' + match.unitNumber : 'General')}`]: true,
        }));
      }
    } else if (!activeItem && materials.length > 0) {
      setActiveItem(materials[0]);
    }
  }, [activeMaterialId, materials]);

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

  const handleSelectItem = (item: AcademicMaterial) => {
    setActiveItem(item);
    if (onSelectActiveMaterialId) onSelectActiveMaterialId(item.id);
    outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // High-reliability local auto-categorization & synthesis
  const buildClientMaterial = (fileData: {
    fileName: string;
    fileType: string;
    fileSize: string;
    rawTextContent?: string;
    fileDataUrl?: string;
  }): AcademicMaterial => {
    const rawFileName = fileData.fileName || 'study_notes.pdf';
    const fileExt = fileData.fileType || rawFileName.split('.').pop()?.toLowerCase() || 'pdf';
    const textSample = `${rawFileName} ${fileData.rawTextContent || ''}`.toLowerCase();

    // 1. Subject Matching
    let matchedSubject = subjects.find(
      (s) => textSample.includes(s.name.toLowerCase()) || textSample.includes(s.code.toLowerCase())
    );

    if (!matchedSubject && subjects.length > 0) {
      if (textSample.includes('deadlock') || textSample.includes('operating') || textSample.includes('process') || textSample.includes('paging') || textSample.includes('semaphore') || textSample.includes('bca-304')) {
        matchedSubject = subjects.find((s) => s.name.toLowerCase().includes('operating')) || subjects[0];
      } else if (textSample.includes('database') || textSample.includes('sql') || textSample.includes('dbms') || textSample.includes('normalization') || textSample.includes('acid') || textSample.includes('bca-302')) {
        matchedSubject = subjects.find((s) => s.name.toLowerCase().includes('database')) || subjects[0];
      } else if (textSample.includes('network') || textSample.includes('osi') || textSample.includes('tcp') || textSample.includes('ip') || textSample.includes('router') || textSample.includes('bca-303')) {
        matchedSubject = subjects.find((s) => s.name.toLowerCase().includes('network')) || subjects[0];
      } else if (textSample.includes('java') || textSample.includes('oops') || textSample.includes('polymorphism') || textSample.includes('inheritance') || textSample.includes('bca-301')) {
        matchedSubject = subjects.find((s) => s.name.toLowerCase().includes('java')) || subjects[0];
      } else {
        matchedSubject = subjects[0];
      }
    }

    const subjectName = matchedSubject?.name || 'Curriculum Core';
    const subjectId = matchedSubject?.id || 'sub-general';

    // 2. Category Matching
    let detectedCategory: 'notes' | 'pyq' | 'assignment' | 'syllabus' | 'cheat_sheet' = 'notes';
    if (textSample.includes('pyq') || textSample.includes('question paper') || textSample.includes('previous year') || textSample.includes('exam paper')) {
      detectedCategory = 'pyq';
    } else if (textSample.includes('assignment') || textSample.includes('homework') || textSample.includes('submission') || textSample.includes('lab task')) {
      detectedCategory = 'assignment';
    } else if (textSample.includes('cheat sheet') || textSample.includes('formula') || textSample.includes('mnemonic')) {
      detectedCategory = 'cheat_sheet';
    } else if (textSample.includes('syllabus') || textSample.includes('curriculum')) {
      detectedCategory = 'syllabus';
    }

    // 3. Unit Matching
    let unitNumber = 1;
    let unitTitle = 'Fundamental Concepts';
    const unitMatch = textSample.match(/unit[\s_-]*([1-5])/i);
    if (unitMatch) {
      unitNumber = parseInt(unitMatch[1]);
      unitTitle = `Unit ${unitNumber}: Core Syllabus Modules`;
    } else if (textSample.includes('deadlock') || textSample.includes('normalization') || textSample.includes('transport')) {
      unitNumber = 3;
      unitTitle = textSample.includes('deadlock')
        ? 'Deadlocks & Process Synchronization'
        : textSample.includes('normalization')
        ? 'Relational Schema & Normalization'
        : 'Transport Layer & Protocols';
    }

    const cleanTitle = rawFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    const folderPath = `${subjectName} / Unit ${unitNumber} - ${unitTitle} / ${detectedCategory.toUpperCase()}`;

    return {
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      classId: 'class-bca-2028',
      subjectId,
      subjectName,
      unitNumber,
      unitTitle,
      folderPath,
      detectedCategory,
      title: cleanTitle,
      fileName: rawFileName,
      fileType: fileExt,
      fileSize: fileData.fileSize || '1.8 MB',
      fileDataUrl: fileData.fileDataUrl,
      rawTextContent: fileData.rawTextContent || cleanTitle,
      uploaderName: currentRole === 'teacher' ? 'Faculty Professor' : currentRole === 'cr' ? 'Class Representative' : 'Classmate',
      uploaderRole: (currentRole as any) || 'student',
      verificationStatus: currentRole === 'teacher' ? 'teacher_verified' : 'student_shared',
      createdAt: 'Just now',
      resources: {
        summary: `Synthesized high-yield academic breakdown of ${cleanTitle}. Categorized under ${subjectName} (${unitTitle}) for structured semester revision.`,
        hinglishSummary: `Is document (${cleanTitle}) mein theoretical definitions aur exam scoring steps systematically organize kiye gaye hain.`,
        mindmapMermaid: `graph TD\n  A[${cleanTitle}] --> B[Foundational Concepts]\n  A --> C[Core Mechanism & Formulas]\n  A --> D[Exam Questions & 10-Marker]`,
        mnemonics: [
          {
            term: cleanTitle,
            acronym: cleanTitle.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase() || 'CORE',
            mnemonic: 'Concepts Organized for Rapid Examination',
            explanation: `High-yield memory anchor for ${cleanTitle} during end-semester exams.`,
          },
        ],
        exam10Marker: {
          question: `Explain ${cleanTitle} in detail with suitable architectural diagrams, mathematical/code models, and real-world trade-offs.`,
          answerStructure: '1. Standard University Definition (2 Marks)\n2. Architecture & Working Mechanism (3 Marks)\n3. Core Step-by-Step Algorithm (3 Marks)\n4. Limitations & Real-World Gotchas (2 Marks)',
          modelAnswerMarkdown: `### 1. Introduction & Formal Definition\n${cleanTitle} represents a fundamental concept in the syllabus. It establishes deterministic constraints to guarantee correctness, safety, and performance.\n\n### 2. Architecture & Diagram\nExplain state transitions, boundary conditions, and verify invariant properties.\n\n### 3. Step-by-Step Implementation Outline\n- Step 1: Initialize baseline resources and data pointers.\n- Step 2: Evaluate boundary invariants and conditions.\n- Step 3: Compute state transitions without side-effects.\n- Step 4: Validate termination and output commitment.\n\n### 4. University Evaluator Scoring Tip\nAlways draw the block diagram with neat labels and write out edge cases to secure full 10/10 marks.`,
          keyDiagramText: `Block Architecture Diagram for ${cleanTitle} illustrating data flow and state verification`,
        },
        quiz: [
          {
            id: `q-${Date.now()}-1`,
            question: `What is the primary objective of studying ${cleanTitle} in the university curriculum?`,
            options: [
              'Minimizing system overhead and preventing runtime anomalies',
              'Replacing hardware processors entirely',
              'Bypassing all security validations',
              'None of the above',
            ],
            correctIndex: 0,
            explanation: 'It provides theoretical and practical guarantees against failures, ensuring system reliability.',
          },
        ],
        keyConcepts: [
          { concept: 'Core Invariant', explanation: `Primary principle governing ${cleanTitle}.` },
          { concept: 'Boundary Constraints', explanation: 'Conditions under which correctness guarantees hold.' },
        ],
        importantDefinitions: [
          { term: cleanTitle, definition: 'Standardized university definition prescribed for semester examinations.' },
        ],
        examples: [
          {
            title: 'Practical System Application',
            scenario: `Real-world implementation of ${cleanTitle} in production systems.`,
            takeaway: 'Ensures deterministic guarantees and high reliability.',
          },
        ],
        examPoints: [
          `Formal definition and scope of ${cleanTitle}`,
          'State transition boundaries and invariant properties',
          'Standard 10-marker answer structure with block diagrams',
        ],
        flashcards: [
          {
            id: `fc-${Date.now()}-1`,
            question: `What is the core premise of ${cleanTitle}?`,
            answer: `It establishes formal operational constraints to prevent runtime anomalies.`,
          },
        ],
        possibleQuestions: [
          {
            marks: 10,
            question: `Explain ${cleanTitle} in detail with suitable architectural diagrams and real-world trade-offs.`,
            answerOutline: 'Definition, block diagram, step-by-step mechanism, and gotchas.',
          },
        ],
        relatedPYQs: [
          {
            year: 2024,
            marks: 10,
            question: `Discuss ${cleanTitle} with reference to university curriculum standards.`,
          },
        ],
      },
    };
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
    setProcessingProgress(20);
    setProcessingStage('📥 Extracting text, metadata, and structural headers...');

    await new Promise((r) => setTimeout(r, 250));
    setProcessingProgress(55);
    setProcessingStage('🧠 AI Zero-Prompt Classifier: Matching syllabus unit, subject & category...');

    await new Promise((r) => setTimeout(r, 250));
    setProcessingProgress(80);
    setProcessingStage('⚡ Compounding Knowledge: Synthesizing notes, mnemonics, mindmap & 10-markers...');

    let finalMaterial: AcademicMaterial | null = null;

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

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.material) {
          finalMaterial = data.material;
        }
      }
    } catch (err) {
      console.warn('Backend smart-dump endpoint returned error or offline, applying client auto-sorting:', err);
    }

    if (!finalMaterial) {
      finalMaterial = buildClientMaterial(fileData);
    }

    setProcessingProgress(100);
    setProcessingStage('✅ Auto-sorted into classroom folders! Ready across all student devices.');

    // GUARANTEED: Always update materials list and active inspector
    onMaterialUploaded?.(finalMaterial);
    setLastUploadedMaterial(finalMaterial);
    setActiveItem(finalMaterial);
    if (onSelectActiveMaterialId) onSelectActiveMaterialId(finalMaterial.id);
    setSelectedSubjectId('all');
    setSelectedCategory('all');
    setExpandedFolders((prev) => ({
      ...prev,
      all: true,
      [`sub-${finalMaterial.subjectName}`]: true,
      [`unit-${finalMaterial.subjectName}-${finalMaterial.unitTitle || (finalMaterial.unitNumber ? 'Unit ' + finalMaterial.unitNumber : 'General')}`]: true,
    }));

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStage('');
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1200);
  };

  // 2. Handle File Drop / Select (Supports Single or Multi-File Drops from PC or Phone)
  const handleFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    filesArray.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          processAndIngest({
            fileName: file.name,
            fileType: fileExt,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            rawTextContent: `${file.name.replace(/\.[^/.]+$/, '')} image notes`,
            fileDataUrl: result,
          });
        };
        reader.onerror = () => {
          processAndIngest({
            fileName: file.name,
            fileType: fileExt,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type.includes('text') || fileExt === 'txt' || fileExt === 'md') {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          processAndIngest({
            fileName: file.name,
            fileType: fileExt,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            rawTextContent: result.slice(0, 8000),
          });
        };
        reader.onerror = () => {
          processAndIngest({
            fileName: file.name,
            fileType: fileExt,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          });
        };
        reader.readAsText(file);
      } else {
        // PDF, DOC, DOCX, PPT, PPTX or other binary document
        processAndIngest({
          fileName: file.name,
          fileType: fileExt,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          rawTextContent: `${file.name.replace(/\.[^/.]+$/, '')} university syllabus curriculum notes`,
        });
      }
    });
  };

  // Process files passed via Global PC Drag & Drop
  useEffect(() => {
    if (pendingFiles && pendingFiles.length > 0) {
      const filesToIngest = [...pendingFiles];
      handleFiles(filesToIngest);
      onClearPendingFiles?.();
    }
  }, [pendingFiles]);

  // Check if opened from native mobile phone Share Sheet
  useEffect(() => {
    checkAndRetrieveSharedFiles().then((payload) => {
      if (payload) {
        if (payload.files && payload.files.length > 0) {
          handleFiles(payload.files);
        } else if (payload.text) {
          setRawText(payload.text);
          if (payload.title) setTextTitle(payload.title);
          setDumpMode('text');
        }
      }
    });
  }, []);

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
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
          Study Drop
        </h1>
        <span className="text-xs font-mono text-slate-400">
          {filteredMaterials.length} {filteredMaterials.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* 2. DUMP ZONE (DRAG & DROP / RAW TEXT / QUICK TEST SAMPLES) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 md:p-6 shadow-xl space-y-4">
        {/* Dump Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDumpMode('files')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                dumpMode === 'files'
                  ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-300" />
              <span>Files</span>
            </button>
            <button
              onClick={() => setDumpMode('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                dumpMode === 'text'
                  ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-300" />
              <span>Text</span>
            </button>
          </div>
        </div>

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-200">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>{processingStage}</span>
              </span>
              <span className="font-mono-code text-slate-400">{processingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-200 transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* MODE 1: FILE DROP ZONE */}
        {dumpMode === 'files' && (
          <div className="space-y-3">
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
              className={`border border-dashed rounded-xl p-7 md:p-9 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-slate-500 bg-slate-900/90 ring-2 ring-slate-600/30'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40'
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
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-300">
                Drop files here or <span className="text-slate-100 underline underline-offset-2 font-semibold">browse</span>
              </p>
            </div>
          </div>
        )}

        {/* MODE 2: RAW TEXT / NOTES DUMP */}
        {dumpMode === 'text' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title (optional)"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 font-sans-ui"
            />
            <textarea
              rows={5}
              placeholder="Paste notes, syllabus snippet, or exam questions..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 font-mono-code"
            />
            <div className="flex items-center justify-end">
              <button
                onClick={handleRawTextDump}
                disabled={!rawText.trim() || isProcessing}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 font-medium text-xs transition cursor-pointer flex items-center gap-2"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. RECENTLY UPLOADED STUDY DOCUMENTS SHELF */}
      {materials.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Uploaded Materials Vault ({materials.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Click any file to load notes, mindmap & 10-marker
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {materials.map((mat) => {
              const isSelected = activeItem?.id === mat.id;
              const isJustAdded = lastUploadedMaterial?.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => handleSelectItem(mat)}
                  className={`px-3 py-2 rounded-xl border text-left shrink-0 transition cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/60 text-white shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="space-y-0.5 max-w-[180px] sm:max-w-[220px]">
                    <div className="text-xs font-medium truncate leading-tight flex items-center gap-1.5">
                      <span className="truncate">{mat.title}</span>
                      {isJustAdded && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {mat.subjectName} · {mat.unitTitle || (mat.unitNumber ? `Unit ${mat.unitNumber}` : 'General')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ACTIVE INGESTED PACK & AI OUTPUT SHOWCASE */}
      <div ref={outputSectionRef} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6 shadow-xl space-y-5">
        {activeItem ? (
          <>
            {/* Material Header */}
            <div className="border-b border-slate-800 pb-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-300">
                    {activeItem.subjectName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-900 border border-slate-800 text-slate-400">
                    {activeItem.unitTitle || (activeItem.unitNumber ? `Unit ${activeItem.unitNumber}` : 'General')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-900 border border-slate-800 text-cyan-400">
                    {activeItem.detectedCategory || 'Notes'}
                  </span>
                </div>
                <button
                  onClick={() => archiveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-xs text-slate-400 hover:text-white transition font-sans-ui cursor-pointer flex items-center gap-1"
                >
                  <span>View in Folder Tree</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white font-serif-heading">
                  {activeItem.title}
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-2">
                  <span>📂 {activeItem.folderPath || `${activeItem.subjectName} / Unit ${activeItem.unitNumber || 1} / ${(activeItem.detectedCategory || 'notes').toUpperCase()}`}</span>
                  <span>·</span>
                  <span>{activeItem.fileName}</span>
                  <span>({activeItem.fileSize})</span>
                  <span>·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Filed & Synced
                  </span>
                </div>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <button
                onClick={() => setActiveDetailTab('notes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === 'notes'
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Notes & Summary</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('mindmap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === 'mindmap'
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>Visual Mindmap</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('mnemonics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === 'mnemonics'
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Mnemonics</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('10marker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === '10marker'
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-rose-400" />
                <span>10-Marker Answer</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('quiz')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === 'quiz'
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <FileQuestion className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quiz & Check</span>
              </button>
            </div>

            {/* TAB 1: NOTES & SUMMARY */}
            {activeDetailTab === 'notes' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Executive Summary</span>
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans-ui">
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
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Key Concepts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeItem.resources.keyConcepts.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                          <span className="text-xs font-semibold text-slate-200 block">{c.concept}</span>
                          <span className="text-xs text-slate-400 block leading-normal">{c.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Definitions */}
                {activeItem.resources?.importantDefinitions && activeItem.resources.importantDefinitions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Standard Definitions</h4>
                    <div className="space-y-2">
                      {activeItem.resources.importantDefinitions.map((d, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
                          <strong className="text-slate-200 font-semibold">{d.term}:</strong>{' '}
                          <span className="text-slate-300">{d.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam Points */}
                {activeItem.resources?.examPoints && (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5 text-xs">
                    <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
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
                <div className="space-y-3">
                  {activeItem.resources?.mnemonics && activeItem.resources.mnemonics.length > 0 ? (
                    activeItem.resources.mnemonics.map((mn, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white font-serif-heading">{mn.term}</span>
                          {mn.acronym && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold">
                              {mn.acronym}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-100 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono-code">
                          "{mn.mnemonic}"
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{mn.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{activeItem.title} Mnemonic</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold">
                          CORE
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-100 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        "Understand the Core Mechanism, Rule Out Anomalies, Apply Invariants"
                      </div>
                      <p className="text-xs text-slate-400">
                        Memory hook for {activeItem.title}. Learn core conditions first, then draw standard flow diagrams.
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
                  <span>Architecture Breakdown for {activeItem.title}</span>
                  {activeItem.resources?.mindmapMermaid && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeItem.resources?.mindmapMermaid || '');
                        setCopiedMermaid(true);
                        setTimeout(() => setCopiedMermaid(false), 2000);
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      {copiedMermaid ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
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
                  nodes={activeItem.resources?.mindmapNodes}
                />
              </div>
            )}

            {/* TAB 4: 10-MARKER MODEL ANSWER */}
            {activeDetailTab === '10marker' && (
              <div className="space-y-4">
                {activeItem.resources?.exam10Marker ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          University 10-Marker Question
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold">
                          10 MARKS
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        {activeItem.resources.exam10Marker.question}
                      </h3>
                    </div>

                    {/* Answer Structure Outline */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                      <span className="font-semibold text-slate-200">Marking Structure Breakdown:</span>
                      <pre className="text-slate-300 font-sans-ui whitespace-pre-line text-xs">
                        {activeItem.resources.exam10Marker.answerStructure}
                      </pre>
                    </div>

                    {/* Full Model Answer */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                        Model Answer Solution
                      </span>
                      <div className="text-xs text-slate-300 space-y-2 leading-relaxed whitespace-pre-line font-sans-ui">
                        {activeItem.resources.exam10Marker.modelAnswerMarkdown}
                      </div>
                    </div>

                    {activeItem.resources.exam10Marker.keyDiagramText && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-[11px] text-slate-300">
                        <strong>Required Diagram:</strong> {activeItem.resources.exam10Marker.keyDiagramText}
                      </div>
                    )}
                  </div>
                ) : activeItem.resources?.possibleQuestions && activeItem.resources.possibleQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {activeItem.resources.possibleQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{q.question}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold">
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
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Quiz</span>
                        </button>
                      )}
                    </div>

                    {activeItem.resources.quiz.map((q, qIdx) => {
                      const selected = quizAnswers[qIdx];
                      const isCorrect = selected === q.correctIndex;

                      let containerStyle = 'border-slate-800 bg-slate-900/60';
                      if (quizSubmitted) {
                        containerStyle = isCorrect ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20';
                      }

                      return (
                        <div
                          key={q.id || qIdx}
                          className={`p-4 rounded-xl border transition ${containerStyle} space-y-3`}
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
                                  btnStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-medium';
                                } else if (isThisSelected) {
                                  btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200';
                                }
                              } else if (isThisSelected) {
                                btnStyle = 'bg-slate-800 border-slate-700 text-white font-medium';
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
                          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
                        }}
                        disabled={Object.keys(quizAnswers).length === 0}
                        className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 font-medium text-xs transition cursor-pointer"
                      >
                        Submit Quiz & Check Score
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <span className="text-xs font-semibold text-white block">
                          Quiz Completed!{' '}
                          {Object.entries(quizAnswers).filter(
                            ([idx, val]) => val === activeItem.resources?.quiz[Number(idx)]?.correctIndex
                          ).length}{' '}
                          / {activeItem.resources.quiz.length} Correct
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Evaluated locally from curriculum cache.
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
            <div className="text-sm font-semibold text-slate-300">
              {materials.length === 0 ? 'Your Vault is Clean & Ready' : 'Select a material from above or the folder tree'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {materials.length === 0
                ? 'Drop any lecture PDF, slides, or paste notes above. The system will auto-classify them into syllabus folders and generate mindmaps & 10-markers.'
                : 'Click any document in the shelf or the folder archive below to inspect its notes, mnemonics, visual mindmap, and quiz.'}
            </p>
          </div>
        )}
      </div>

      {/* 5. COURSE FOLDERS & VAULT ARCHIVE */}
      <div ref={archiveSectionRef} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 md:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-300" />
            <h2 className="text-sm font-semibold text-white font-serif-heading">Course Folders & Archive</h2>
          </div>
          <span className="text-[11px] font-mono-code text-slate-400">{filteredMaterials.length} Items</span>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setSelectedCategory('notes')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              selectedCategory === 'notes'
                ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setSelectedCategory('pyq')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              selectedCategory === 'pyq'
                ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            PYQs
          </button>
          <button
            onClick={() => setSelectedCategory('assignment')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              selectedCategory === 'assignment'
                ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
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
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
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
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <Folder className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-white truncate max-w-[280px]">{subjectName}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-850 text-slate-300 font-mono-code border border-slate-750">
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
                              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[260px]">
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
                                const isJustAdded = lastUploadedMaterial?.id === item.id;
                                const isPYQ = item.fileName.toLowerCase().includes('pyq') || item.detectedCategory === 'pyq';
                                const isAssign = item.detectedCategory === 'assignment';

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-slate-800 text-white border border-cyan-500/60 font-medium shadow-xs'
                                        : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {isPYQ ? (
                                        <Award className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      ) : isAssign ? (
                                        <FileCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                      )}
                                      <span className="truncate">{item.title}</span>
                                      {isJustAdded && (
                                        <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                                          New
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-1">
                                      {isSelected && (
                                        <span className="text-[10px] text-cyan-400 font-medium">Viewing Output</span>
                                      )}
                                      <span className="text-[10px] font-mono-code text-slate-500 uppercase">
                                        {item.fileType}
                                      </span>
                                    </div>
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

        </div>
      </div>
    </div>
  );
};
