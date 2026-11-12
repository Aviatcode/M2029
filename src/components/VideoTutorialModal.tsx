import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Check,
  Gamepad2,
  FolderOpen,
  Bot,
  Flame,
  Calendar,
  Share2,
  Search,
  Zap,
} from 'lucide-react';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: any) => void;
}

interface TutorialChapter {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  videoDuration: string;
  bulletPoints: string[];
  visualScene: 'share' | 'vault' | 'tutor' | 'radar';
}

const CHAPTERS: TutorialChapter[] = [
  {
    id: 'share',
    title: 'Share from WhatsApp & Direct Drop',
    badge: '01 INPUT',
    tagline: 'Upload from anywhere without even opening the app.',
    videoDuration: '0:05',
    bulletPoints: [
      'Click Share in WhatsApp or Files and tap M2028.',
      'Drop PDFs, Word docs, PPTs, or lecture notes anywhere on PC/Phone.',
      'Auto-chunked and indexed into memory immediately.',
    ],
    visualScene: 'share',
  },
  {
    id: 'tutor',
    title: 'AI Tutor & 10-Marker Generator',
    badge: '02 CRACK EXAMS',
    tagline: 'Instant exam answers, Hinglish intuition & block diagrams.',
    videoDuration: '0:06',
    bulletPoints: [
      'Generates university Section C 10-marker format.',
      'Simplifies complex jargon into Hinglish & intuitive ELI9 analogies.',
      'Pre-seeds master guides with zero token consumption.',
    ],
    visualScene: 'tutor',
  },
  {
    id: 'radar',
    title: 'Exam Radar & Predicted PYQs',
    badge: '03 RADAR',
    tagline: 'Track datesheets and target past-year questions.',
    videoDuration: '0:04',
    bulletPoints: [
      'Tracks upcoming semester papers and revision timers.',
      'Analyzes repeated 10-marker questions from past exams.',
      'One-tap revision packs saved straight to disk.',
    ],
    visualScene: 'radar',
  },
  {
    id: 'vault',
    title: 'Class Brain & Compounding Knowledge',
    badge: '04 SYNC',
    tagline: 'A collective classroom memory that never loses notes.',
    videoDuration: '0:05',
    bulletPoints: [
      'Notes uploaded by batchmates become instantly searchable.',
      '0 token hits for all previously analyzed university topics.',
      'Works offline with instant PWA storage.',
    ],
    visualScene: 'vault',
  },
];

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const timerRef = useRef<any>(null);

  const chapter = CHAPTERS[currentChapterIndex];

  // Auto-play progress simulation
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Next chapter
            setCurrentChapterIndex((c) => (c + 1) % CHAPTERS.length);
            return 0;
          }
          return prev + 2.5; // ~4 second cycle per chapter
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, currentChapterIndex]);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('m2028_tutorial_seen', 'true');
    } catch {}
    onClose();
  };

  const handleSelectChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in"
      onClick={handleFinish}
      role="dialog"
      aria-modal="true"
      aria-label="Video Tutorial Modal"
    >
      <div
        className="w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-zinc-100 flex flex-col space-y-5 cursor-default relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* 1. Header with Video Game HUD styling */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-wider font-sans uppercase">
                  M2029 // SYSTEM TUTORIAL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                  DIRECTIVE v2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Watch once, master the system, and figure the rest out.
              </p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Close Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Interactive Video Viewport (16:9 arcade simulation) */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#121215] aspect-video sm:aspect-21/9 flex flex-col justify-between p-4 sm:p-6 select-none shadow-inner">
          {/* Top HUD overlay */}
          <div className="flex items-center justify-between text-xs font-mono z-10">
            <span className="px-2.5 py-1 rounded-md bg-zinc-950/80 border border-zinc-700 text-zinc-200 font-bold tracking-wider">
              {chapter.badge}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                REC • 60 FPS
              </span>
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-1.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Center Dynamic Video Scene Rendering */}
          <div className="my-auto flex flex-col items-center justify-center text-center space-y-3 z-10 px-4">
            {chapter.visualScene === 'share' && (
              <div className="space-y-2 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/50 flex items-center justify-center text-indigo-300 mx-auto shadow-lg shadow-indigo-500/20">
                  <Share2 className="w-7 h-7 animate-pulse" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Share from WhatsApp or Drop Any Document
                </div>
                <div className="text-xs text-zinc-300 max-w-md mx-auto">
                  Click share in WhatsApp, choose M2029, and it indexes directly into the backend with zero manual sorting.
                </div>
              </div>
            )}

            {chapter.visualScene === 'tutor' && (
              <div className="space-y-2 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 mx-auto shadow-lg shadow-amber-500/20">
                  <Bot className="w-7 h-7 animate-pulse" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Section C 10-Marker Format & Hinglish Intuition
                </div>
                <div className="text-xs text-slate-300 max-w-md mx-auto">
                  Every query outputs university answer templates with block diagrams, definitions, and analogies.
                </div>
              </div>
            )}

            {chapter.visualScene === 'radar' && (
              <div className="space-y-2 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/50 flex items-center justify-center text-rose-300 mx-auto shadow-lg shadow-rose-500/20">
                  <Flame className="w-7 h-7 animate-pulse" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                  University Exam Datesheet & PYQ Predictions
                </div>
                <div className="text-xs text-slate-300 max-w-md mx-auto">
                  Pre-exam radar flags heavy-weight chapters and predicts the top university questions for finals.
                </div>
              </div>
            )}

            {chapter.visualScene === 'vault' && (
              <div className="space-y-2 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mx-auto shadow-lg shadow-emerald-500/20">
                  <FolderOpen className="w-7 h-7 animate-pulse" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Compounding Class Memory • 0 Tokens Spent
                </div>
                <div className="text-xs text-slate-300 max-w-md mx-auto">
                  One student generates a verified note, all 60 students retrieve it in 1ms with zero API cost.
                </div>
              </div>
            )}
          </div>

          {/* Bottom Video Controls & Scrubber */}
          <div className="space-y-2 z-10">
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-100 ease-linear shadow-xs shadow-indigo-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Replay Chapter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 font-semibold">
                  {chapter.title}
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                <span>Chapter {currentChapterIndex + 1}/{CHAPTERS.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Chapter Selector Cards (Game Level Selector style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHAPTERS.map((ch, idx) => {
            const isCurrent = idx === currentChapterIndex;
            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChapter(idx)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isCurrent
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-md'
                    : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={isCurrent ? 'text-white font-bold' : 'text-zinc-500'}>
                    {ch.badge}
                  </span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <div className="text-xs font-bold text-white tracking-tight line-clamp-1">
                  {ch.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. Controls HUD & Hotkeys Cheat Sheet */}
        <div className="p-3.5 rounded-2xl bg-[#121215] border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-white shrink-0" />
            <span className="font-semibold text-zinc-200">Game Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200">
              ⌘K / Ctrl+K
            </span>
            <span className="text-zinc-500">Universal Search</span>

            <span className="text-zinc-600">•</span>

            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200">
              Alt+Shift+M
            </span>
            <span className="text-zinc-500">Productivity Hub</span>

            <span className="text-zinc-600">•</span>

            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200">
              Drag & Drop
            </span>
            <span className="text-zinc-500">Any File Anywhere</span>
          </div>
        </div>

        {/* 5. Bottom Actions: "I'll figure it out" and Start Playing */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          <span className="text-[11px] text-zinc-500 font-mono">
            Always accessible later in Settings
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                const nextIdx = (currentChapterIndex + 1) % CHAPTERS.length;
                handleSelectChapter(nextIdx);
              }}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Next Scene</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFinish}
              className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <span>Start / Figure It Out</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

