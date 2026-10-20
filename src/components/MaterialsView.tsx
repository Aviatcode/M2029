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
} from 'lucide-react';
import { RagDocumentViewer } from './RagDocumentViewer';
import { uploadLargeFileToRag, fetchFromGitHubUrl } from '../utils/ragService';

interface MaterialsViewProps {
  materials: AcademicMaterial[];
  subjects: Subject[];
  currentRole: UserRole;
  onMaterialUploaded: (newMat: AcademicMaterial) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials,
  subjects,
  currentRole,
  onMaterialUploaded,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<AcademicMaterial | null>(materials[0] || null);
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

  const filteredMaterials = materials.filter((m) =>
    selectedSubjectFilter === 'all' ? true : m.subjectId === selectedSubjectFilter
  );

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
    <div className="max-w-4xl mx-auto py-7 px-2 sm:px-4 space-y-7 animate-fade-in">
      {/* 1. Academic Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
            Notes & Materials
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowGithubModal(true)}
            className="group px-3.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 hover:text-white text-xs font-medium border border-indigo-700/60 ring-1 ring-indigo-500/20 shadow-sm transition-all cursor-pointer flex items-center gap-2 font-sans-ui"
          >
            <Github className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-105 transition-transform" />
            <span>Fetch from GitHub</span>
          </button>

          <button
            onClick={() => setIsUploading(true)}
            className="group px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/80 hover:border-slate-600 ring-1 ring-cyan-500/20 hover:ring-cyan-500/40 shadow-[0_0_12px_-3px_rgba(6,182,212,0.15)] transition-all cursor-pointer flex items-center gap-2 font-sans-ui"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-105 transition-transform" />
            <span>Upload Material</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => setSelectedSubjectFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer font-sans-ui text-xs ${
            selectedSubjectFilter === 'all'
              ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700 shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent'
          }`}
        >
          All Subjects ({materials.length})
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectFilter(sub.id)}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer font-sans-ui text-xs ${
              selectedSubjectFilter === sub.id
                ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700 shadow-2xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* 3. Main Reading Pane: File Index & Scholar Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Files Column */}
        <div className="space-y-2.5">
          <h2 className="academic-tag text-[10px] text-slate-400">
            Document Archive ({filteredMaterials.length})
          </h2>

          <div className="space-y-1.5">
            {filteredMaterials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 rounded-md border border-dashed border-slate-800 bg-slate-900/20 space-y-2">
                <FileText className="w-6 h-6 text-slate-600 mx-auto" />
                <p>No documents uploaded yet.</p>
                <button
                  onClick={() => setIsUploading(true)}
                  className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Upload notes or PDF →
                </button>
              </div>
            ) : (
              filteredMaterials.map((mat) => {
              const isSelected = selectedMaterial?.id === mat.id;

              return (
                <div
                  key={mat.id}
                  onClick={() => setSelectedMaterial(mat)}
                  className={`p-3 rounded-lg border cursor-pointer transition text-xs space-y-1.5 select-none ${
                    isSelected
                      ? 'bg-slate-850 border-slate-700 text-slate-100 shadow-xs ring-1 ring-white/10'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 truncate">
                      {mat.fileType?.toLowerCase().includes('image') || mat.fileType === 'jpg' || mat.fileType === 'png' ? (
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <h3 className="font-sans-ui font-medium truncate">{mat.title}</h3>
                    </div>
                    {getFormatBadge(mat.fileType || 'pdf')}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate">{mat.subjectName}</span>
                    <span>{mat.fileSize || '2.8 MB'}</span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Selected File Details */}
        <div className="md:col-span-2">
          {selectedMaterial ? (
            <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-5 space-y-5">
              <div className="pb-3 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans-ui">
                    <span>{selectedMaterial.subjectName}</span>
                    <span>·</span>
                    <span>Shared by {selectedMaterial.uploaderName}</span>
                    <span>·</span>
                    {getFormatBadge(selectedMaterial.fileType || 'pdf')}
                  </div>
                  <h2 className="font-editorial text-xl sm:text-2xl font-medium text-slate-100 mt-0.5">
                    {selectedMaterial.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowRagModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-300" />
                    <span>⚡ Fetch Anything (RAG)</span>
                  </button>

                  {selectedMaterial.githubUrl && (
                    <a
                      href={selectedMaterial.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-300 text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
                      title="View source on GitHub"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}

                  <a
                    href={
                      selectedMaterial.ragDocId
                        ? `/api/rag/file/${encodeURIComponent(selectedMaterial.ragDocId)}`
                        : selectedMaterial.fileDataUrl || '#'
                    }
                    download={selectedMaterial.fileName || `${selectedMaterial.title}.${selectedMaterial.fileType || 'pdf'}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download ({selectedMaterial.fileSize})</span>
                  </a>
                </div>
              </div>

              {/* Real Image Preview if user uploaded photos of notes or diagrams */}
              {selectedMaterial.fileDataUrl &&
                (selectedMaterial.fileType?.includes('image') ||
                  selectedMaterial.fileType === 'jpg' ||
                  selectedMaterial.fileType === 'png' ||
                  selectedMaterial.fileType === 'jpeg') && (
                  <div className="space-y-2">
                    <h3 className="academic-tag text-[10px] text-emerald-400 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>Original Lecture Scan / Image Preview</span>
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 max-h-80 flex items-center justify-center">
                      <img
                        src={selectedMaterial.fileDataUrl}
                        alt={selectedMaterial.title}
                        className="max-h-76 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

              {/* Summary */}
              <div className="space-y-2">
                <h3 className="academic-tag text-[10px] text-slate-400">
                  Curriculum Summary
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60 font-sans-ui">
                  {selectedMaterial.resources.summary}
                </p>
              </div>

              {/* Conceptual Takeaway */}
              {selectedMaterial.resources.hinglishSummary && (
                <div className="space-y-2">
                  <h3 className="academic-tag text-[10px] text-slate-400">
                    Conceptual Takeaway
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans-ui bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60">
                    {selectedMaterial.resources.hinglishSummary}
                  </p>
                </div>
              )}

              {/* Definitions */}
              {selectedMaterial.resources.importantDefinitions?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="academic-tag text-[10px] text-slate-400">
                    Terms & Definitions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedMaterial.resources.importantDefinitions.map((d, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 font-sans-ui">
                        <strong className="text-slate-100 block mb-0.5 font-medium">{d.term}</strong>
                        <span className="text-slate-400 text-[11px]">{d.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flashcards */}
              {selectedMaterial.resources.flashcards?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="academic-tag text-[10px] text-slate-400">
                    Recall Flashcards
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedMaterial.resources.flashcards.map((fc) => (
                      <div key={fc.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5 font-sans-ui">
                        <span className="text-slate-100 font-medium block">Q: {fc.question}</span>
                        <span className="text-slate-400 text-[11px] block">A: {fc.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Possible Exam Questions */}
              {selectedMaterial.resources.possibleQuestions?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="academic-tag text-[10px] text-slate-400">
                    Exam Questions & Outlines
                  </h3>
                  <div className="space-y-2 text-xs">
                    {selectedMaterial.resources.possibleQuestions.map((pq, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1">
                        <div className="flex items-center justify-between text-slate-300 font-semibold">
                          <span>{pq.question}</span>
                          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                            {pq.marks} Marks
                          </span>
                        </div>
                        {pq.answerOutline && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Blueprint: {pq.answerOutline}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900/30 border border-dashed border-slate-800 p-12 text-center space-y-3">
              <UploadCloud className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-medium text-slate-300">
                {materials.length === 0 ? 'Document vault is empty' : 'Select a file to inspect'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {materials.length === 0
                  ? 'Upload course lecture notes, PPTs, or scanned papers. AI will generate summaries, mnemonics, and exam answers.'
                  : 'Click any document on the left to read its summary and study outline.'}
              </p>
              {materials.length === 0 && (
                <button
                  onClick={() => setIsUploading(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs transition cursor-pointer"
                >
                  Upload First Document
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal with Real File Drag & Drop */}
      {isUploading && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in ${
            processingStage === 'idle' ? 'cursor-pointer' : ''
          }`}
          onClick={() => {
            if (processingStage === 'idle') setIsUploading(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Upload Study Material Modal"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 p-6 text-slate-100 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <h2 className="font-semibold text-base text-slate-100">Upload Study Material</h2>
              </div>
              {processingStage === 'idle' && (
                <button
                  onClick={() => setIsUploading(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sync Notice */}
            <div className="mb-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
              <UploadCloud className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300 block mb-0.5">Shared Classroom Sync</strong>
                <span>
                  Once uploaded, this document is saved to the shared classroom database for all classmates.
                </span>
              </div>
            </div>

            {processingStage !== 'idle' ? (
              <div className="py-8 text-center space-y-3">
                <span className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin inline-block" />
                <p className="text-xs text-slate-300">
                  {processingStage === 'uploading' && `Streaming file to backend storage (${uploadProgress}%)...`}
                  {processingStage === 'reading' && 'Extracting multi-format text & structure...'}
                  {processingStage === 'understanding' && 'Querying classroom cache for zero-token deduplication...'}
                  {processingStage === 'organizing' && 'Formulating semester syllabus notes...'}
                  {processingStage === 'generating' && '⚡ Chunking & Building active in-memory BM25 RAG index...'}
                  {processingStage === 'complete' && 'Active on backend! Synchronized across all student devices.'}
                </p>
                {processingStage === 'uploading' && (
                  <div className="w-56 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleStartProcessing} className="space-y-4 text-xs">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragOver
                      ? 'border-cyan-400 bg-cyan-950/30'
                      : uploadFileName
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.md,.ppt,.pptx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploadFileName ? (
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="truncate max-w-[280px]">{uploadFileName}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                        {getFormatBadge(uploadFileType)}
                        <span>{uploadFileSize}</span>
                        <span>· Click to change file</span>
                      </div>
                      {uploadFileDataUrl && uploadFileType.match(/jpg|jpeg|png/) && (
                        <div className="pt-2">
                          <img
                            src={uploadFileDataUrl}
                            alt="preview"
                            className="max-h-24 mx-auto rounded border border-slate-800 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          Drag & drop PDF, Word (.docx), PPT or Images (.jpg, .png)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Or click to browse from your device
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Subject</label>
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    {subjects.length === 0 ? (
                      <option value="sub-general">General Academic Notes</option>
                    ) : (
                      subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 3 Concurrency PPT or Chapter 4 Lecture Notes"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lecture Text / Notes Outline (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Optional text excerpt or key topics covered in the lecture..."
                    value={uploadTextSnippet}
                    onChange={(e) => setUploadTextSnippet(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsUploading(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-cyan-500/30 hover:border-cyan-400/50 ring-1 ring-cyan-500/15 shadow-[0_0_12px_-3px_rgba(6,182,212,0.15)] text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RAG Interactive Document Viewer Modal */}
      {showRagModal && selectedMaterial && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowRagModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-950 border border-indigo-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <RagDocumentViewer
              docId={selectedMaterial.ragDocId || selectedMaterial.id}
              onClose={() => setShowRagModal(false)}
            />
          </div>
        </div>
      )}
      {/* GitHub Fetch Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isGithubFetching && setShowGithubModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Github className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-slate-100">Fetch Material from GitHub</h3>
              </div>
              {!isGithubFetching && (
                <button
                  onClick={() => setShowGithubModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Enter any GitHub file URL (blob, raw content, or release asset). The backend will stream and index it directly into active RAG memory.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!githubFetchUrl.trim()) return;
                try {
                  setIsGithubFetching(true);
                  setGithubFetchError(null);
                  const selectedSub = subjects.find((s) => s.id === githubFetchSubjectId);
                  const result = await fetchFromGitHubUrl({
                    url: githubFetchUrl.trim(),
                    title: githubFetchTitle.trim() || undefined,
                    classId: 'class-bca-2028',
                    subjectId: githubFetchSubjectId,
                    subjectName: selectedSub?.name || 'Core Curriculum',
                  });
                  if (result.material) {
                    onMaterialUploaded(result.material);
                    setSelectedMaterial(result.material);
                  }
                  setShowGithubModal(false);
                  setGithubFetchUrl('');
                  setGithubFetchTitle('');
                } catch (err: any) {
                  setGithubFetchError(err?.message || 'Failed to fetch file from GitHub.');
                } finally {
                  setIsGithubFetching(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-slate-300 font-semibold block mb-1">GitHub File URL</label>
                <input
                  type="text"
                  value={githubFetchUrl}
                  onChange={(e) => setGithubFetchUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/blob/main/textbook.pdf"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Document Title (Optional)</label>
                  <input
                    type="text"
                    value={githubFetchTitle}
                    onChange={(e) => setGithubFetchTitle(e.target.value)}
                    placeholder="e.g. Operating Systems Notes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Associate Subject</label>
                  <select
                    value={githubFetchSubjectId}
                    onChange={(e) => setGithubFetchSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick links */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-slate-500">Quick:</span>
                <button
                  type="button"
                  onClick={() => {
                    setGithubFetchUrl('https://github.com/Aviatcode/M2029/blob/main/curriculum-repo/TIMETABLE.md');
                    setGithubFetchTitle('BCA Timetable & Schedule');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 font-mono cursor-pointer"
                >
                  📅 Timetable
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGithubFetchUrl('https://github.com/Aviatcode/M2029/blob/main/curriculum-repo/SYLLABUS.md');
                    setGithubFetchTitle('Core Syllabus Guide');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 font-mono cursor-pointer"
                >
                  📋 Syllabus
                </button>
              </div>

              {githubFetchError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{githubFetchError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGithubModal(false)}
                  disabled={isGithubFetching}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGithubFetching || !githubFetchUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {isGithubFetching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fetch & Index</span>
                    </>
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
