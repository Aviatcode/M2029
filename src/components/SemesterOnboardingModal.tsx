import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Calendar,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  Layers,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, TimetableClass, Unit } from '../types';
import {
  extractTextFromFile,
  isTimetableDocument,
  isSyllabusDocument,
  parseTimetableWithAi,
  parseSyllabusClient,
} from '../utils/documentAiClassifier';

interface SemesterOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  onSetupComplete: (data: {
    subjects: Subject[];
    timetable?: TimetableClass[];
    unitsBySubject?: Record<string, Unit[]>;
  }) => void;
  onOpenManualSetup?: () => void;
}

export const SemesterOnboardingModal: React.FC<SemesterOnboardingModalProps> = ({
  isOpen,
  onClose,
  classCode,
  onSetupComplete,
  onOpenManualSetup,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preset'>('upload');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste Text State
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');

  // Processing & Review States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Parsed Output Preview
  const [parsedSubjects, setParsedSubjects] = useState<Subject[]>([]);
  const [parsedTimetable, setParsedTimetable] = useState<TimetableClass[]>([]);
  const [parsedUnits, setParsedUnits] = useState<Record<string, Unit[]>>({});
  const [detectedType, setDetectedType] = useState<'timetable' | 'syllabus'>('timetable');
  const [isReviewReady, setIsReviewReady] = useState(false);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage('');
    }
  };

  const handleProcessDocument = async (textToProcess?: string, fileToProcess?: File) => {
    setErrorMessage('');
    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessingStage('📥 Reading document text & extracting schedule matrix...');

    try {
      let text = textToProcess || '';
      let dataUrl: string | undefined;
      const file = fileToProcess || selectedFile;

      if (file) {
        setProcessingProgress(35);
        setProcessingStage(`📄 Unpacking ${file.name} and extracting content...`);
        const extracted = await extractTextFromFile(file);
        text = extracted.text || text;
        dataUrl = extracted.dataUrl;
      }

      if (!text.trim() && !dataUrl) {
        throw new Error('Please select a file or paste timetable/syllabus content.');
      }

      // Detect if Timetable or Syllabus
      const fileName = file?.name || pastedTitle || 'Document';
      const isTimetable = isTimetableDocument(fileName, text);
      const isSyllabus = isSyllabusDocument(fileName, text);

      setProcessingProgress(60);
      setProcessingStage('🧠 AI analyzing subjects, lecture timings, faculty, and modules...');

      if (isTimetable || (!isSyllabus && text.length > 0)) {
        // Parse as Timetable
        setDetectedType('timetable');
        const result = await parseTimetableWithAi({
          rawText: text,
          fileDataUrl: dataUrl,
          fileName,
          classCode,
        });

        if (result.subjects.length === 0) {
          throw new Error('Could not identify subjects in document. Please verify the timetable text or format.');
        }

        setProcessingProgress(90);
        setProcessingStage('✨ Configuring weekly schedule and classroom folders...');
        setParsedSubjects(result.subjects);
        setParsedTimetable(result.timetable);
        setIsReviewReady(true);
      } else {
        // Parse as Syllabus
        setDetectedType('syllabus');
        const result = parseSyllabusClient(text, fileName.replace(/\.[^/.]+$/, ''));

        setProcessingProgress(90);
        setProcessingStage('✨ Generating syllabus units, topics and study trackers...');
        setParsedSubjects(result.subjects);
        setParsedUnits(result.unitsBySubject);
        setIsReviewReady(true);
      }

      setProcessingProgress(100);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read document. Please try pasting the text directly.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndProceed = () => {
    onSetupComplete({
      subjects: parsedSubjects,
      timetable: parsedTimetable,
      unitsBySubject: parsedUnits,
    });
    onClose();
  };

  const loadSamplePreset = (presetType: 'bca' | 'cse') => {
    if (presetType === 'bca') {
      const bcaText = `BCA Semester 3 Weekly Class Timetable
Monday:
09:00 AM - 10:00 AM: Data Structures & Algorithms (CS-301) - Prof. Sharma - Room 302
10:00 AM - 11:00 AM: Operating Systems (CS-302) - Prof. Gupta - Room 304
11:15 AM - 12:15 PM: Database Management Systems (CS-303) - Dr. Verma - Room 301
02:00 PM - 04:00 PM: Data Structures Practical Lab - Lab 2

Tuesday:
09:00 AM - 10:00 AM: Computer Networks (CS-304) - Prof. Saxena - Room 305
10:00 AM - 11:00 AM: Discrete Mathematical Structures (CS-305) - Dr. Mathur - Room 302
11:15 AM - 12:15 PM: Operating Systems (CS-302) - Prof. Gupta - Room 304
02:00 PM - 04:00 PM: DBMS SQL Practical Lab - Lab 1

Wednesday:
09:00 AM - 10:00 AM: Database Management Systems (CS-303) - Dr. Verma - Room 301
10:00 AM - 11:00 AM: Data Structures & Algorithms (CS-301) - Prof. Sharma - Room 302
11:15 AM - 12:15 PM: Computer Networks (CS-304) - Prof. Saxena - Room 305

Thursday:
09:00 AM - 10:00 AM: Operating Systems (CS-302) - Prof. Gupta - Room 304
10:00 AM - 11:00 AM: Discrete Mathematical Structures (CS-305) - Dr. Mathur - Room 302
11:15 AM - 12:15 PM: Data Structures & Algorithms (CS-301) - Prof. Sharma - Room 302

Friday:
09:00 AM - 10:00 AM: Computer Networks (CS-304) - Prof. Saxena - Room 305
10:00 AM - 11:00 AM: Database Management Systems (CS-303) - Dr. Verma - Room 301
11:15 AM - 12:15 PM: Discrete Mathematical Structures (CS-305) - Dr. Mathur - Room 302`;

      setPastedTitle('BCA Sem 3 Timetable');
      setPastedText(bcaText);
      handleProcessDocument(bcaText);
    } else {
      const cseText = `B.Tech Computer Science Engineering Timetable
Monday:
09:00 AM - 10:00 AM: Design & Analysis of Algorithms (CS-401) - Dr. Rao - LT-1
10:00 AM - 11:00 AM: Computer Organization & Architecture (CS-402) - Prof. Khan - LT-2
11:15 AM - 12:15 PM: Web Technologies & Fullstack (CS-403) - Prof. Patel - Lab 4

Tuesday:
09:00 AM - 10:00 AM: Artificial Intelligence & Machine Learning (CS-404) - Dr. Nair - LT-3
10:00 AM - 11:00 AM: Design & Analysis of Algorithms (CS-401) - Dr. Rao - LT-1
11:15 AM - 12:15 PM: Software Engineering & Agile (CS-405) - Prof. Bose - LT-2

Wednesday:
09:00 AM - 10:00 AM: Computer Organization & Architecture (CS-402) - Prof. Khan - LT-2
10:00 AM - 11:00 AM: Web Technologies & Fullstack (CS-403) - Prof. Patel - Lab 4
11:15 AM - 12:15 PM: Artificial Intelligence & Machine Learning (CS-404) - Dr. Nair - LT-3

Thursday:
09:00 AM - 10:00 AM: Design & Analysis of Algorithms (CS-401) - Dr. Rao - LT-1
10:00 AM - 11:00 AM: Software Engineering & Agile (CS-405) - Prof. Bose - LT-2

Friday:
09:00 AM - 10:00 AM: Artificial Intelligence & Machine Learning (CS-404) - Dr. Nair - LT-3
10:00 AM - 11:00 AM: Web Technologies & Fullstack (CS-403) - Prof. Patel - Lab 4`;

      setPastedTitle('CSE Timetable');
      setPastedText(cseText);
      handleProcessDocument(cseText);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto cursor-pointer animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upload Timetable or Syllabus Modal"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 p-6 sm:p-7 shadow-2xl text-slate-100 my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1: Setup Your Semester</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Upload Your Timetable or Syllabus First
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Drop your class schedule or syllabus document. Our AI reads it to automatically generate your subjects, lecture rooms, and semester curriculum folders.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* REVIEW SCREEN: When parsed successfully */}
        {isReviewReady ? (
          <div className="py-5 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Document Read Successfully!</span>
              </div>
              <p className="text-xs text-slate-300">
                AI extracted <strong className="text-emerald-400">{parsedSubjects.length} Subjects</strong> and{' '}
                <strong className="text-emerald-400">{parsedTimetable.length} weekly lecture periods</strong>.
              </p>
            </div>

            {/* Subjects Pill Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Detected Subjects ({parsedSubjects.length}):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {parsedSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{sub.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sub.code} · {sub.teacherName}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                      {sub.credits} Credits
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timetable Slots Summary */}
            {parsedTimetable.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Weekly Schedule Configured
                  </span>
                  <span className="font-mono text-cyan-400">{parsedTimetable.length} lecture slots</span>
                </div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 pt-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => {
                    const count = parsedTimetable.filter((t) => t.day === d).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                      >
                        {d}: {count} classes
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsReviewReady(false)}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload a different document</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmAndProceed}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <span>✓ Proceed to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* INPUT SCREEN: Upload, Paste, or Presets */
          <div className="py-5 space-y-5">
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preset')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'preset'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sample Timetable Presets</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Processing Animation */}
            {isProcessing && (
              <div className="py-8 space-y-3 text-center animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">{processingStage}</h4>
                  <p className="text-xs text-slate-400 font-mono">{processingProgress}% complete</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden max-w-xs mx-auto">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {!isProcessing && (
              <>
                {/* TAB 1: FILE UPLOAD */}
                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        isDragOver
                          ? 'border-cyan-400 bg-cyan-950/30 scale-[0.99]'
                          : selectedFile
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            setErrorMessage('');
                          }
                        }}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-sm font-semibold text-white block truncate max-w-sm mx-auto">
                              {selectedFile.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 text-sm block">
                              Drag & drop your Timetable or Syllabus here
                            </span>
                            <span className="text-xs text-slate-400 mt-1 block">
                              Supports PDF, PNG/JPG image, Word (.docx), TXT, or CSV
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-750 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition"
                          >
                            Browse Computer / Phone
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedFile}
                      onClick={() => handleProcessDocument()}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedFile
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Analyze Document & Auto-Configure Workspace</span>
                    </button>
                  </div>
                )}

                {/* TAB 2: PASTE TEXT */}
                {activeTab === 'paste' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Schedule / Document Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={pastedTitle}
                        onChange={(e) => setPastedTitle(e.target.value)}
                        placeholder="e.g. BCA Semester 3 Timetable"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Paste Timetable or Syllabus Content
                      </label>
                      <textarea
                        rows={6}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Paste timetable or syllabus text here...\n\ne.g.\nMonday:\n09:00 - 10:00 AM: Data Structures & Algorithms (CS-301) - Room 302\n10:00 - 11:00 AM: Operating Systems (CS-302) - Room 304\n\nTuesday:\n09:00 - 10:00 AM: Database Management Systems (CS-303)...`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!pastedText.trim()}
                      onClick={() => handleProcessDocument(pastedText)}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                        pastedText.trim()
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Parse Text with AI</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: SAMPLE PRESETS */}
                {activeTab === 'preset' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Want to see SyllabusOS in action instantly? Click a sample timetable to test the AI scheduling engine:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => loadSamplePreset('bca')}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition cursor-pointer space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white group-hover:text-cyan-300">
                            📚 BCA Semester 3 Schedule
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300">
                            5 Subjects
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Data Structures, Operating Systems, DBMS, Networks, Discrete Math + Practical Labs.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => loadSamplePreset('cse')}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition cursor-pointer space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white group-hover:text-emerald-300">
                            💻 B.Tech Computer Science
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                            5 Subjects
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Algorithms, Computer Architecture, AI & ML, Web Tech, Software Engineering.
                        </p>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Manual Skip / Escape */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>No document on hand?</span>
              <div className="flex items-center gap-3">
                {onOpenManualSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManualSetup();
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium underline transition cursor-pointer"
                  >
                    Add subjects manually
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Skip for now →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
