import React, { useState } from 'react';
import { LessonContent } from '../types';
import { Sun, Sparkles, BookOpen, Lightbulb, Compass, Volume2, ArrowRight } from 'lucide-react';

interface MorningPrimerTabProps {
  lesson: LessonContent;
  topicTitle: string;
}

export const MorningPrimerTab: React.FC<MorningPrimerTabProps> = ({ lesson, topicTitle }) => {
  const [activeAnalogyStyle, setActiveAnalogyStyle] = useState<'standard' | 'traffic' | 'gaming'>('standard');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const getCustomAnalogy = () => {
    if (activeAnalogyStyle === 'traffic') {
      return `Think of ${topicTitle} like a busy highway rotary or roundabout. Instead of cars crashing into a dead-end street when the front traffic slows down, the traffic smoothly flows around in a circle, preventing gridlock!`;
    }
    if (activeAnalogyStyle === 'gaming') {
      return `Think of ${topicTitle} like a weapon hotbar in a battle royale game with fixed slots. When you drop slot 1, you don't need to re-equip your entire inventory—the slot pointer immediately shifts so your next weapon is drawn in zero latency!`;
    }
    return lesson.eli9.analogy;
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      const textToSpeak = `${lesson.eli9.hook}. ${getCustomAnalogy()}. ${lesson.eli9.coreMechanism}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      {/* 7:00 AM Dawn Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-blue-500/15 border border-amber-500/30 p-5 md:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 shadow-lg shadow-amber-500/10">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                  🌅 7:00 AM Morning Primer
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30 font-medium">
                  3-Min Read
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                Pre-Class Mental Model: {topicTitle}
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Read this before college lecture so you don't struggle in the classroom. You already know the real-life intuition before your professor writes on the board!
              </p>
            </div>
          </div>

          {/* Quick Voice Audio Readout */}
          <button
            onClick={handleReadAloud}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition self-start md:self-auto cursor-pointer ${
              isPlayingAudio
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse' : 'text-amber-400'}`} />
            <span>{isPlayingAudio ? 'Stop Audio' : 'Listen 🎧 (TTS)'}</span>
          </button>
        </div>
      </div>

      {/* The Hook Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>The Conceptual Hook</span>
        </div>
        <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed italic">
          "{lesson.eli9.hook}"
        </p>
      </div>

      {/* The ELI9 Everyday Analogy */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 p-6 md:p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Explain Like I'm 9 (ELI9) Real-Life Analogy</span>
          </div>

          {/* Analogy Variant Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Switch Metaphor:</span>
            <button
              onClick={() => setActiveAnalogyStyle('standard')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeAnalogyStyle === 'standard' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => setActiveAnalogyStyle('traffic')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeAnalogyStyle === 'traffic' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Traffic 🚗
            </button>
            <button
              onClick={() => setActiveAnalogyStyle('gaming')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeAnalogyStyle === 'gaming' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gaming 🎮
            </button>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-slate-200 text-sm md:text-base leading-relaxed">
          {getCustomAnalogy()}
        </div>

        {/* Core Mechanism in 2 Sentences */}
        <div className="mt-5 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>The Core Engineering Mechanism</span>
          </div>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-mono bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            {lesson.eli9.coreMechanism}
          </p>
        </div>
      </div>

      {/* Classroom Takeaway - What to listen for */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 border border-blue-500/30 p-5 md:p-6 shadow-xl flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-white text-sm md:text-base">
              🎓 When Your Professor Lectures Today:
            </h4>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Exam Hint
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
            {lesson.eli9.beforeClassTakeaway}
          </p>
        </div>
      </div>
    </div>
  );
};
