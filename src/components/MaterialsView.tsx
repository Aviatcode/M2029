import React, { useState } from 'react';
import { AcademicMaterial, Subject, ProcessingStage, UserRole } from '../types';
import {
  UploadCloud,
  FileText,
  Clock,
  X,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

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
  const [uploadSubjectId, setUploadSubjectId] = useState<string>(subjects[0]?.id || 'sub-dbms');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadTextSnippet, setUploadTextSnippet] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');

  const filteredMaterials = materials.filter((m) =>
    selectedSubjectFilter === 'all' ? true : m.subjectId === selectedSubjectFilter
  );

  const handleStartProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setProcessingStage('uploading');
    await new Promise((r) => setTimeout(r, 400));

    setProcessingStage('reading');
    await new Promise((r) => setTimeout(r, 400));

    setProcessingStage('understanding');
    await new Promise((r) => setTimeout(r, 400));

    setProcessingStage('organizing');
    await new Promise((r) => setTimeout(r, 400));

    setProcessingStage('generating');

    try {
      const targetSub = subjects.find((s) => s.id === uploadSubjectId);
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: 'class-bca-2028',
          subjectId: uploadSubjectId,
          subjectName: targetSub?.name || 'Academic Subject',
          title: uploadTitle.trim(),
          fileName: uploadFileName.trim() || `${uploadTitle.trim().replace(/\s+/g, '_')}.pdf`,
          fileType: 'pdf',
          rawTextContent: uploadTextSnippet.trim(),
          uploaderRole: currentRole,
        }),
      });

      const data = await res.json();
      setProcessingStage('complete');
      await new Promise((r) => setTimeout(r, 400));

      onMaterialUploaded(data.material);
      setSelectedMaterial(data.material);
      setIsUploading(false);
      setProcessingStage('idle');
      setUploadTitle('');
      setUploadFileName('');
      setUploadTextSnippet('');
    } catch (err) {
      console.error('Failed processing material:', err);
      setProcessingStage('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
            Class Notes & PPTs
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Shared repository of teacher slides, lecture notes, and synthesized concepts.
          </p>
        </div>

        <button
          onClick={() => setIsUploading(true)}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => setSelectedSubjectFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
            selectedSubjectFilter === 'all'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Subjects ({materials.length})
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectFilter(sub.id)}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              selectedSubjectFilter === sub.id
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Main Grid: Files List & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Files Column */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Files ({filteredMaterials.length})
          </h2>

          <div className="space-y-1.5">
            {filteredMaterials.map((mat) => {
              const isSelected = selectedMaterial?.id === mat.id;

              return (
                <div
                  key={mat.id}
                  onClick={() => setSelectedMaterial(mat)}
                  className={`p-3 rounded-lg border cursor-pointer transition text-xs space-y-1 ${
                    isSelected
                      ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm'
                      : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-750 text-slate-300'
                  }`}
                >
                  <h3 className="font-medium truncate">{mat.title}</h3>
                  <div className="text-[11px] text-slate-400">
                    {mat.subjectName} · {mat.uploaderName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected File Details */}
        <div className="md:col-span-2">
          {selectedMaterial ? (
            <div className="rounded-xl bg-slate-900/30 border border-slate-800/80 p-5 space-y-5">
              <div className="pb-3 border-b border-slate-800/60">
                <div className="text-xs text-slate-400">
                  {selectedMaterial.subjectName} · Shared by {selectedMaterial.uploaderName}
                </div>
                <h2 className="text-base font-medium text-slate-100 mt-0.5">
                  {selectedMaterial.title}
                </h2>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Summary
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/60">
                  {selectedMaterial.resources.summary}
                </p>
              </div>

              {/* Hinglish Explanation */}
              {selectedMaterial.resources.hinglishSummary && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Intuitive Understanding (Hinglish)
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/60">
                    {selectedMaterial.resources.hinglishSummary}
                  </p>
                </div>
              )}

              {/* Definitions */}
              {selectedMaterial.resources.importantDefinitions.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Key Definitions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedMaterial.resources.importantDefinitions.map((d, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                        <strong className="text-slate-200 block mb-0.5">{d.term}</strong>
                        <span className="text-slate-400">{d.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flashcards */}
              {selectedMaterial.resources.flashcards.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Flashcards
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedMaterial.resources.flashcards.map((fc) => (
                      <div key={fc.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
                        <span className="text-slate-200 font-medium block">Q: {fc.question}</span>
                        <span className="text-slate-400 block">A: {fc.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select a lecture file to view synthesized notes.
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-950 border border-slate-800 p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <h2 className="font-semibold text-base text-slate-100">Upload Lecture Material</h2>
              {processingStage === 'idle' && (
                <button
                  onClick={() => setIsUploading(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {processingStage !== 'idle' ? (
              <div className="py-6 text-center space-y-3">
                <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin inline-block" />
                <p className="text-xs text-slate-300 capitalize">
                  {processingStage} lecture material...
                </p>
              </div>
            ) : (
              <form onSubmit={handleStartProcessing} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject</label>
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 3 Concurrency PPT"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Lecture Text / Notes Outline</label>
                  <textarea
                    rows={4}
                    placeholder="Paste slides text or outline here..."
                    value={uploadTextSnippet}
                    onChange={(e) => setUploadTextSnippet(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploading(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                  >
                    Process with AI
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
