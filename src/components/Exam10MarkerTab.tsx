import React, { useState } from 'react';
import { LessonContent } from '../types';
import { FileText, Copy, Check, AlertTriangle, CheckCircle2, Code2, Cpu } from 'lucide-react';

interface Exam10MarkerTabProps {
  lesson: LessonContent;
  topicTitle: string;
}

export const Exam10MarkerTab: React.FC<Exam10MarkerTabProps> = ({ lesson, topicTitle }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDiagram, setCopiedDiagram] = useState(false);
  const [copiedFullSheet, setCopiedFullSheet] = useState(false);

  const exam = lesson.exam10Marker;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exam.codeOrAlgorithm);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyDiagram = () => {
    navigator.clipboard.writeText(exam.architectureDiagramText);
    setCopiedDiagram(true);
    setTimeout(() => setCopiedDiagram(false), 2000);
  };

  const handleCopyFullSheet = () => {
    const fullText = `=== UNIVERSITY EXAM 10-MARKER MODEL ANSWER ===
TOPIC: ${topicTitle}

1. DEFINITION:
${exam.definition}

2. ARCHITECTURE / BLOCK DIAGRAM:
${exam.architectureDiagramText}

3. STEP-BY-STEP WORKING MECHANISM:
${exam.stepByStepMechanism.join('\n')}

4. CODE / WORKING ALGORITHM:
${exam.codeOrAlgorithm}

5. ADVANTAGES & DISADVANTAGES:
Advantages:
${exam.advantagesDisadvantages.advantages.map((a) => `- ${a}`).join('\n')}
Disadvantages:
${exam.advantagesDisadvantages.disadvantages.map((d) => `- ${d}`).join('\n')}

6. EXAMINER TRAPS & GOTCHAS:
${exam.examinerTraps.join('\n')}
`;
    navigator.clipboard.writeText(fullText);
    setCopiedFullSheet(true);
    setTimeout(() => setCopiedFullSheet(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header with University Exam Marking Scheme Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-mono font-semibold">
              📝 Section C / Long Answer
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-semibold">
              Target: 10 / 10 Marks
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            Standard University Model Answer Format
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Exact structure, formal academic terminology, diagram, and algorithm expected on your exam answer sheet.
          </p>
        </div>

        <button
          onClick={handleCopyFullSheet}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition cursor-pointer self-start md:self-auto"
        >
          {copiedFullSheet ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
          <span>{copiedFullSheet ? 'Copied Full Model Answer!' : 'Copy Entire 10-Marker'}</span>
        </button>
      </div>

      {/* 1. Formal Technical Definition */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 shadow-lg">
        <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>1. Formal Definition & Technical Terminology (2 Marks)</span>
        </div>
        <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          {exam.definition}
        </p>
      </div>

      {/* 2. Architecture / ASCII Block Diagram */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>2. Architectural Block Diagram (2 Marks)</span>
          </div>
          <button
            onClick={handleCopyDiagram}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 transition"
          >
            {copiedDiagram ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDiagram ? 'Copied' : 'Copy Diagram'}</span>
          </button>
        </div>
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto">
          <pre className="font-mono text-xs md:text-sm text-cyan-300 leading-tight whitespace-pre">
            {exam.architectureDiagramText}
          </pre>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 italic">
          💡 Tip: Draw this block diagram neatly using pencil and ruler in the first 3 minutes of answering Section C questions.
        </p>
      </div>

      {/* 3. Step-by-Step Execution Mechanism */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-3">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>3. Step-by-Step Working Mechanism (2 Marks)</span>
        </div>
        <div className="space-y-2.5">
          {exam.stepByStepMechanism.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Working Code or Algorithm */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span>4. Working Code & Algorithm Implementation (3 Marks)</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto">
          <pre className="font-mono text-xs md:text-sm text-neutral-200 leading-relaxed whitespace-pre">
            {exam.codeOrAlgorithm}
          </pre>
        </div>
      </div>

      {/* 5. Advantages & Disadvantages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-5 shadow-lg">
          <h4 className="text-neutral-200 font-semibold text-sm flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-neutral-300" /> Advantages (1 Mark)
          </h4>
          <ul className="space-y-2 text-xs md:text-sm text-slate-200">
            {exam.advantagesDisadvantages.advantages.map((adv, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-400 font-bold">•</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-5 shadow-lg">
          <h4 className="text-rose-300 font-semibold text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Disadvantages & Trade-offs
          </h4>
          <ul className="space-y-2 text-xs md:text-sm text-slate-200">
            {exam.advantagesDisadvantages.disadvantages.map((dis, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{dis}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Examiner Traps & Gotchas */}
      <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-5 md:p-6 shadow-xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>⚠️ Examiner Traps & Common Gotchas (Where Students Lose Marks)</span>
        </div>
        <div className="space-y-2.5">
          {exam.examinerTraps.map((trap, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-100 text-xs md:text-sm leading-relaxed">
              {trap}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
