import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Subject, ExtractedCourseInfo, GitHubPublishFiles } from '../types';
import {
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  Upload,
  RefreshCw,
  Terminal,
  ExternalLink,
  BookOpen,
  User,
  Calendar,
  MapPin,
  Mail,
  FolderArchive,
  ChevronRight,
  Code2,
  FileCode,
} from 'lucide-react';

interface GitHubPublisherViewProps {
  subjects: Subject[];
  classCode: string;
}

const SAMPLE_SYLLABUS_TEXT = `University School of Information Technology & Engineering
Course Handout: BCA-302 Database Management Systems & Relational Architectures
Academic Year 2026-2027 | Semester III | 4 Credits (3L + 1T)

Course Instructor: Dr. Rajesh Sharma
Designation: Associate Professor & Head of Database Systems Lab
Email: rajesh.sharma@cs.university.edu | Office: Room 402, Block B, Technology Wing
Consultation Hours: Tuesdays & Thursdays 3:00 PM - 5:00 PM

Class Timings:
- Monday: 10:00 AM - 11:30 AM (Lecture Hall 204)
- Wednesday: 11:30 AM - 01:00 PM (Lecture Hall 204)
- Friday: 02:00 PM - 04:00 PM (Database Systems Lab 3)

Syllabus Modules:
Unit 1: Data Modeling and Conceptual Database Architecture (10 Hours)
- Introduction to Database Systems, Schema vs Instance, Three-Schema Architecture
- Entity-Relationship (ER) Modeling: Entities, Relationships, Multiplicity Constraints, Weak Entities
- Enhanced ER (EER) modeling, Generalization, Specialization, Categorization

Unit 2: The Relational Model and Relational Languages (11 Hours)
- Relational data structure, integrity constraints: domain, key, entity, and referential integrity
- Relational Algebra: Selection, Projection, Set operations, Cartesian product, Joins, Division
- Relational Calculus: Tuple Relational Calculus (TRC) and Domain Relational Calculus (DRC)
- SQL DDL, DML, DCL, Views, Complex Nested Subqueries, Aggregate Operators

Unit 3: Relational Database Design and Normalization (12 Hours)
- Informal design guidelines for relation schemas, Anomalies in schema design
- Functional Dependencies (FDs), Closure of attribute sets, Canonical cover, Armstrong Axioms
- Normal Forms based on primary keys: 1NF, 2NF, 3NF, Boyce-Codd Normal Form (BCNF)
- Multi-valued dependencies and 4NF, Join dependencies and 5NF, Lossless join and Dependency preservation

Unit 4: Transaction Processing, Concurrency, and Recovery (10 Hours)
- Transaction concept, ACID properties, Transaction states, Concurrent executions
- Serializability: Conflict and View serializability, Precedence Graph
- Concurrency Control: Two-Phase Locking (2PL), Strict 2PL, Timestamp ordering, Deadlocks
- Crash Recovery: Log-based recovery, Immediate vs Deferred update, Checkpoints, ARIES algorithm

Prescribed Textbooks:
1. Database System Concepts, 7th Edition by Abraham Silberschatz, Henry F. Korth, S. Sudarshan (McGraw-Hill)
2. Fundamentals of Database Systems, 8th Edition by Ramez Elmasri, Shamkant B. Navathe (Pearson)

Evaluation Scheme:
- Internal Sessional Exams (2 Mid-Terms): 25%
- Laboratory Practical Work & Mini-Project: 25%
- University End-Semester Examination: 50%`;

export const GitHubPublisherView: React.FC<GitHubPublisherViewProps> = ({
  subjects,
  classCode,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [sourceMode, setSourceMode] = useState<'preset' | 'custom'>('preset');
  const [inputSyllabusText, setInputSyllabusText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isGeneratingFiles, setIsGeneratingFiles] = useState<boolean>(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<
    'readme' | 'syllabus' | 'timetable' | 'contributing' | 'git'
  >('readme');
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  // Extracted metadata
  const [extractedInfo, setExtractedInfo] = useState<ExtractedCourseInfo | null>(
    null
  );
  const [generatedFiles, setGeneratedFiles] = useState<GitHubPublishFiles | null>(
    null
  );

  // Auto-extract initial data on mount
  useEffect(() => {
    handleExtractInfo(selectedSubjectId, '');
  }, []);

  const handleExtractInfo = async (subjectId = selectedSubjectId, customText = '') => {
    setIsExtracting(true);
    try {
      const res = await fetch('/api/ai/extract-course-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subjectId || undefined,
          rawText: customText.trim() || undefined,
          classCode,
        }),
      });

      const data = await res.json();
      if (data.success && data.info) {
        setExtractedInfo(data.info);
        // Automatically generate GitHub repo files
        await handleGenerateFiles(data.info);
      }
    } catch (err) {
      console.error('Failed to extract course info:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateFiles = async (info: ExtractedCourseInfo) => {
    setIsGeneratingFiles(true);
    try {
      const res = await fetch('/api/github/generate-repo-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });

      const data = await res.json();
      if (data.success && data.files) {
        setGeneratedFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to generate repo files:', err);
    } finally {
      setIsGeneratingFiles(false);
    }
  };

  const handleCopy = (text: string, fileLabel: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileLabel);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    if (!generatedFiles || !extractedInfo) return;
    const zip = new JSZip();

    zip.file('README.md', generatedFiles.readmeMarkdown);
    zip.file('SYLLABUS.md', generatedFiles.syllabusMarkdown);
    zip.file('TIMETABLE.md', generatedFiles.timetableMarkdown);
    zip.file('CONTRIBUTING.md', generatedFiles.contributingMarkdown);
    zip.file('.gitignore', generatedFiles.gitignoreContent);
    zip.file('LICENSE', generatedFiles.licenseContent);

    // Create standard directory scaffolding
    zip
      .folder('notes')
      ?.file(
        'README.md',
        `# Class Study Notes: ${extractedInfo.courseName}\nStore student notes, lecture takeaways, and unit summaries here.\n\nInstructor: ${extractedInfo.teacherName}\nCourse: ${extractedInfo.courseCode}`
      );
    zip
      .folder('slides')
      ?.file(
        'README.md',
        `# Lecture Slides & Handouts\nUpload professor presentations, class PDFs, and handouts here.`
      );
    zip
      .folder('pyqs')
      ?.file(
        'README.md',
        `# University Past Year Questions (PYQs)\nArchive previous exam papers and step-by-step solutions for ${extractedInfo.courseName}.`
      );
    zip
      .folder('assignments')
      ?.file(
        'README.md',
        `# Homework & Lab Assignments\nStore question sheets, starter templates, and code assignments here.`
      );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedFiles.repoName || 'class-curriculum'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputSyllabusText(content);
        setSourceMode('custom');
        handleExtractInfo('', content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fade-in text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Automated Curriculum & GitHub Exporter</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-100 mt-1">
            Publish Class Syllabus to GitHub
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            AI automatically extracts instructor name, office hours, schedule, syllabus units, and builds a complete repository file.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDownloadFile(generatedFiles?.readmeMarkdown || '', 'README.md')}
            disabled={!generatedFiles}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download README.md</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={!generatedFiles}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition cursor-pointer shadow-sm disabled:opacity-40"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Download Full Repo (.zip)</span>
          </button>
        </div>
      </div>

      {/* Extraction Controller */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-4 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Step 1: Select or Upload Syllabus
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSourceMode('preset');
                handleExtractInfo(selectedSubjectId, '');
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                sourceMode === 'preset'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Class Subjects
            </button>
            <button
              onClick={() => {
                setSourceMode('custom');
                if (!inputSyllabusText) {
                  setInputSyllabusText(SAMPLE_SYLLABUS_TEXT);
                }
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                sourceMode === 'custom'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom File / Text
            </button>
          </div>
        </div>

        {sourceMode === 'preset' ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-400">Choose Subject:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                handleExtractInfo(e.target.value, '');
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code}) — {sub.teacherName}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleExtractInfo(selectedSubjectId, '')}
              disabled={isExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer ml-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${
                  isExtracting ? 'animate-spin' : ''
                }`}
              />
              <span>{isExtracting ? 'Extracting...' : 'Re-Extract with AI'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Paste syllabus text or drop a file:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputSyllabusText(SAMPLE_SYLLABUS_TEXT);
                    handleExtractInfo('', SAMPLE_SYLLABUS_TEXT);
                  }}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Load Sample Handout
                </button>
                <span>·</span>
                <label className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={4}
              value={inputSyllabusText}
              onChange={(e) => setInputSyllabusText(e.target.value)}
              placeholder="Paste syllabus text here... AI will extract instructor name, cabin, schedule, units, and textbooks automatically."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60"
            />

            <button
              onClick={() => handleExtractInfo('', inputSyllabusText)}
              disabled={isExtracting || !inputSyllabusText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-medium text-white transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Analyzing with AI...' : 'Auto-Extract All Information'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Extracted Academic Intelligence Summary */}
      {extractedInfo && (
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Step 2: AI-Extracted Information
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Auto-Extracted
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Repo Name: {generatedFiles?.repoName || 'course-syllabus'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Instructor */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instructor / Teacher</span>
              </span>
              <div className="font-semibold text-slate-100 text-sm">
                {extractedInfo.teacherName}
              </div>
              <div className="text-[11px] text-slate-400">
                {extractedInfo.teacherDesignation}
              </div>
            </div>

            {/* Email & Office */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Contact & Cabin</span>
              </span>
              <div className="text-slate-200 truncate">{extractedInfo.teacherEmail}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="truncate">{extractedInfo.teacherOffice}</span>
              </div>
            </div>

            {/* Course & Code */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Course & Code</span>
              </span>
              <div className="font-semibold text-slate-100 truncate">
                {extractedInfo.courseName}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {extractedInfo.courseCode} · {extractedInfo.credits}
              </div>
            </div>

            {/* Modules & Schedule */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Modules & Schedule</span>
              </span>
              <div className="text-slate-200">
                {extractedInfo.units?.length || 0} Units ·{' '}
                {extractedInfo.textbooks?.length || 0} Textbooks
              </div>
              <div className="text-[11px] text-slate-400">
                {extractedInfo.weeklySchedule?.length || 0} Weekly class slots
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZIP Download Hero Card */}
      {generatedFiles && extractedInfo && (
        <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-900/40 border border-blue-500/30 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FolderArchive className="w-4 h-4" />
                </span>
                <h2 className="text-sm md:text-base font-semibold text-white">
                  GitHub Repository ZIP Archive Ready
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Ready to Upload
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Bundled with complete <span className="text-cyan-300 font-mono">README.md</span>, instructor details ({extractedInfo.teacherName}), syllabus units, schedule, MIT license, and standard repository folders (<code className="text-slate-400">/notes</code>, <code className="text-slate-400">/slides</code>, <code className="text-slate-400">/pyqs</code>, <code className="text-slate-400">/assignments</code>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .ZIP File</span>
              </button>

              <a
                href="/syllabus-repo.zip"
                download={`${generatedFiles.repoName || 'class-curriculum'}.zip`}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Direct Link (.zip)</span>
              </a>
            </div>
          </div>

          {/* Included files preview pills */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="text-slate-400 font-medium">Included in archive:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">README.md</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">SYLLABUS.md</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">TIMETABLE.md</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">CONTRIBUTING.md</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">.gitignore</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">LICENSE</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">/notes/</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">/slides/</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">/pyqs/</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">/assignments/</span>
          </div>
        </div>
      )}

      {/* Generated GitHub Files Viewer */}
      {generatedFiles && (
        <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden space-y-0">
          {/* File Navigation Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveFileTab('readme')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeFileTab === 'readme'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>README.md</span>
              </button>

              <button
                onClick={() => setActiveFileTab('syllabus')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeFileTab === 'syllabus'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>SYLLABUS.md</span>
              </button>

              <button
                onClick={() => setActiveFileTab('timetable')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeFileTab === 'timetable'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>TIMETABLE.md</span>
              </button>

              <button
                onClick={() => setActiveFileTab('contributing')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeFileTab === 'contributing'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>CONTRIBUTING.md</span>
              </button>

              <button
                onClick={() => setActiveFileTab('git')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeFileTab === 'git'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Git Publish Commands</span>
              </button>
            </div>

            {/* Actions: View toggle & Copy */}
            <div className="flex items-center gap-2 text-xs">
              {activeFileTab !== 'git' && (
                <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      viewMode === 'preview'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      viewMode === 'raw'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw Markdown
                  </button>
                </div>
              )}

              {activeFileTab !== 'git' && (
                <button
                  onClick={() => {
                    const content =
                      activeFileTab === 'readme'
                        ? generatedFiles.readmeMarkdown
                        : activeFileTab === 'syllabus'
                        ? generatedFiles.syllabusMarkdown
                        : activeFileTab === 'timetable'
                        ? generatedFiles.timetableMarkdown
                        : generatedFiles.contributingMarkdown;
                    handleCopy(content, activeFileTab);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs transition cursor-pointer"
                >
                  {copiedFile === activeFileTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tab Contents */}
          <div className="p-5 md:p-6 bg-slate-950/60 min-h-[420px]">
            {activeFileTab === 'git' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>How to Publish this File to GitHub</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Follow either of these 3 simple methods to get your syllabus repository live on GitHub.
                  </p>
                </div>

                {generatedFiles.gitCommands.map((section, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        {section.title}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(section.commands.join('\n'), `git-${idx}`)
                        }
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedFile === `git-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Commands</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-900 text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {section.commands.join('\n')}
                    </pre>
                  </div>
                ))}

                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-medium text-blue-200 block">
                      Prefer Browser Web Interface?
                    </span>
                    <span className="text-slate-400">
                      Create a repository on GitHub, then drag and drop the downloaded README.md.
                    </span>
                  </div>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition shrink-0"
                  >
                    <span>Open GitHub.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : viewMode === 'raw' ? (
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-900">
                {activeFileTab === 'readme'
                  ? generatedFiles.readmeMarkdown
                  : activeFileTab === 'syllabus'
                  ? generatedFiles.syllabusMarkdown
                  : activeFileTab === 'timetable'
                  ? generatedFiles.timetableMarkdown
                  : generatedFiles.contributingMarkdown}
              </pre>
            ) : (
              /* Formatted Preview */
              <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed space-y-4">
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/60 font-mono text-xs text-slate-400 flex items-center justify-between">
                  <span>File: {activeFileTab.toUpperCase()}.md</span>
                  <span>Ready for GitHub Markdown Renderer</span>
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs md:text-sm text-slate-300 bg-slate-950/70 p-5 rounded-xl border border-slate-800/60 leading-relaxed font-mono">
                  {activeFileTab === 'readme'
                    ? generatedFiles.readmeMarkdown
                    : activeFileTab === 'syllabus'
                    ? generatedFiles.syllabusMarkdown
                    : activeFileTab === 'timetable'
                    ? generatedFiles.timetableMarkdown
                    : generatedFiles.contributingMarkdown}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
