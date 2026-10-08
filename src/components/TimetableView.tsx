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
    <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Calm Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-100">
          Timetable & Schedule
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Weekly lecture timings, room locations, and instructors.
        </p>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
        {days.map((day) => {
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Class Schedule Cards */}
      <div className="space-y-2.5">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400 text-xs">
            No lectures scheduled for {selectedDay}.
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-slate-200">{cls.subjectName}</h3>
                  <span className="text-[11px] font-mono text-slate-400">{cls.subjectCode}</span>
                </div>

                <div className="text-slate-400 flex items-center gap-2">
                  <span>{cls.time}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cls.room}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cls.teacherName}</span>
                </div>

                {cls.likelyTopic && (
                  <div className="text-slate-400 pt-0.5">
                    Expected topic: <span className="text-slate-300">{cls.likelyTopic.title}</span>
                  </div>
                )}
              </div>

              {cls.likelyTopic && (
                <button
                  onClick={() => onStudyTopic(cls.likelyTopic!.title, cls.subjectName)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
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
