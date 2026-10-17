import React, { useState } from 'react';
import { TimetableClass } from '../types';
import { Clock, MapPin, User, ArrowRight } from 'lucide-react';

interface TimetableViewProps {
  timetable: TimetableClass[];
  onStudyTopic: (topicTitle: string, subjectName: string) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  onStudyTopic,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('Wednesday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const filteredClasses = timetable.filter((t) => t.day === selectedDay);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* 1. Header */}
      <div className="border-b border-slate-800/60 pb-3">
        <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
          Timetable
        </h1>
      </div>

      {/* 2. Day Selector Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
        {days.map((day) => {
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded transition shrink-0 cursor-pointer font-sans-ui text-xs ${
                isSelected
                  ? 'bg-slate-900 text-white font-medium border border-slate-800 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* 3. Class Schedule Rows */}
      <div className="space-y-3">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12 rounded-md bg-slate-900/30 border border-slate-800 text-slate-400 text-xs font-sans-ui">
            No lectures scheduled for {selectedDay}.
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="p-4 sm:p-5 rounded-md bg-slate-900/30 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded">
                    {cls.subjectCode}
                  </span>
                  <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100">
                    {cls.subjectName}
                  </h3>
                </div>

                <div className="text-slate-400 flex flex-wrap items-center gap-2 font-sans-ui">
                  <span className="font-mono text-slate-300">{cls.time}</span>
                  <span aria-hidden="true">·</span>
                  <span>Room {cls.room}</span>
                  <span aria-hidden="true">·</span>
                  <span>Prof. {cls.teacherName}</span>
                </div>

                {cls.likelyTopic && (
                  <div className="text-slate-400 pt-1 font-sans-ui text-xs">
                    Curriculum focus: <span className="text-slate-200 italic font-editorial">{cls.likelyTopic.title}</span>
                  </div>
                )}
              </div>

              {cls.likelyTopic && (
                <button
                  onClick={() => onStudyTopic(cls.likelyTopic!.title, cls.subjectName)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5 font-sans-ui"
                >
                  <span>Prep Topic</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
