import React, { useState } from 'react';
import { TimetableClass, Subject } from '../types';
import {
  Clock,
  MapPin,
  User,
  ArrowRight,
  Plus,
  Trash2,
  X,
  Calendar,
  BookOpen,
  Sparkles,
  LayoutGrid,
  ListFilter,
  Search,
  UploadCloud,
} from 'lucide-react';

interface TimetableViewProps {
  timetable: TimetableClass[];
  subjects?: Subject[];
  onStudyTopic: (topicTitle: string, subjectName: string) => void;
  onAddClass?: (newClass: Omit<TimetableClass, 'id'>) => void;
  onDeleteClass?: (classId: string) => void;
  onOpenUploadModal?: () => void;
}

const getInitialDay = (): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' => {
  const dayIdx = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const map: Record<number, 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[dayIdx] || 'Monday';
};

const COMMON_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:15 AM - 12:15 PM',
  '12:15 PM - 01:15 PM',
  '02:00 PM - 03:00 PM',
  '02:00 PM - 04:00 PM (Lab)',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  subjects = [],
  onStudyTopic,
  onAddClass,
  onDeleteClass,
  onOpenUploadModal,
}) => {
  const [selectedDay, setSelectedDay] = useState<
    'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  >(getInitialDay);

  const [viewMode, setViewMode] = useState<'daily' | 'matrix'>('daily');
  const [labFilter, setLabFilter] = useState<'all' | 'labs'>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetAddDay, setTargetAddDay] = useState<
    'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  >(selectedDay);

  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [time, setTime] = useState(COMMON_SLOTS[0]);
  const [customTime, setCustomTime] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [room, setRoom] = useState('Room 301');
  const [teacher, setTeacher] = useState('Faculty In-Charge');
  const [topicFocus, setTopicFocus] = useState('');

  const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const handleOpenAddModal = (forDay?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday') => {
    setTargetAddDay(forDay || selectedDay);
    if (subjects.length > 0) {
      setSubName(subjects[0].name);
      setSubCode(subjects[0].code);
    } else {
      setSubName('');
      setSubCode('SUB-101');
    }
    setIsAddModalOpen(true);
  };

  const handleSubjectChange = (name: string) => {
    setSubName(name);
    const matched = subjects.find((s) => s.name === name);
    if (matched) {
      setSubCode(matched.code);
      if (matched.teacherName && matched.teacherName !== 'Faculty In-Charge') {
        setTeacher(matched.teacherName);
      }
    }
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddClass) return;

    const finalTime = useCustomTime ? customTime.trim() || '10:00 AM - 11:00 AM' : time;
    const finalSubjectName = subName.trim() || 'General Lecture';
    const finalSubjectCode = subCode.trim() || 'SUB-101';

    onAddClass({
      day: targetAddDay,
      time: finalTime,
      subjectId: `sub-${finalSubjectCode.toLowerCase()}`,
      subjectName: finalSubjectName,
      subjectCode: finalSubjectCode,
      room: room.trim() || 'Room 101',
      teacherName: teacher.trim() || 'Faculty In-Charge',
      likelyTopic: topicFocus.trim()
        ? {
            id: `topic-${Date.now()}`,
            title: topicFocus.trim(),
            confidence: 90,
            reasoning: 'Configured by student schedule',
          }
        : undefined,
    });

    setIsAddModalOpen(false);
    setTopicFocus('');
  };

  const getFilteredDayClasses = (day: string) => {
    return timetable.filter((t) => {
      if (t.day !== day) return false;
      if (labFilter === 'labs') {
        const isLab = t.time.toLowerCase().includes('lab') || t.room.toLowerCase().includes('lab');
        if (!isLab) return false;
      }
      return true;
    });
  };

  const filteredClasses = getFilteredDayClasses(selectedDay);

  return (
    <div className="space-y-6 animate-fade-in pb-8 font-sans-ui text-slate-100">
      {/* 1. Header & View Mode Switcher */}
      <div className="border-b border-slate-800/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal italic text-slate-100">
              Timetable
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              {viewMode === 'daily' ? 'Daily Agenda' : 'Notion Weekly Matrix'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Weekly class schedule, practical lab sessions & lecture rooms
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Notion View Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Week Matrix</span>
            </button>
          </div>

          {/* Lab filter */}
          <button
            type="button"
            onClick={() => setLabFilter(labFilter === 'all' ? 'labs' : 'all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
              labFilter === 'labs'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {labFilter === 'labs' ? 'Showing Labs Only' : 'Filter: Labs Only'}
          </button>

          {onOpenUploadModal && (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Timetable</span>
            </button>
          )}

          {onAddClass && (
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State Onboarding Prompt */}
      {timetable.length === 0 && (
        <div className="rounded-2xl border border-dashed border-cyan-500/30 bg-slate-900/40 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No Timetable Configured Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Upload your weekly class timetable or routine document. Our AI will automatically parse your subjects, room numbers, and lecture timings.
            </p>
          </div>
          <div className="pt-1 flex items-center justify-center gap-3">
            {onOpenUploadModal && (
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Timetable with AI</span>
              </button>
            )}
            {onAddClass && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                + Add Class Manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: DAILY AGENDA VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
            {days.map((day) => {
              const isSelected = selectedDay === day;
              const dayClassCount = timetable.filter((t) => t.day === day).length;
              const isCurrentToday = getInitialDay() === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl transition shrink-0 cursor-pointer text-xs flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold border border-slate-700 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }`}
                >
                  <span>{day}</span>
                  {isCurrentToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Today" />
                  )}
                  {dayClassCount > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({dayClassCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-400 text-xs space-y-3">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-300 font-medium">No classes scheduled for {selectedDay}.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Free period or self-study day. Add regular lectures, lab practicals, or tutorial sessions.
                </p>
                {onAddClass && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(selectedDay)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition inline-flex items-center gap-1.5 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Class for {selectedDay}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const isLab = cls.time.toLowerCase().includes('lab') || cls.room.toLowerCase().includes('lab');

                return (
                  <div
                    key={cls.id}
                    className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="academic-tag text-[9px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded font-mono">
                          {cls.subjectCode}
                        </span>
                        {isLab && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            LAB PRACTICAL
                          </span>
                        )}
                        <h3 className="font-editorial text-base sm:text-lg font-medium text-slate-100 truncate">
                          {cls.subjectName}
                        </h3>
                      </div>

                      <div className="text-slate-400 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{cls.time}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{cls.room}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>Prof. {cls.teacherName}</span>
                        </span>
                      </div>

                      {cls.likelyTopic && (
                        <div className="text-slate-400 pt-0.5 text-xs">
                          Curriculum focus: <span className="text-slate-200 italic font-editorial">{cls.likelyTopic.title}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      {cls.likelyTopic && (
                        <button
                          onClick={() => onStudyTopic(cls.likelyTopic!.title, cls.subjectName)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Prep Topic</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteClass && (
                        <button
                          type="button"
                          onClick={() => onDeleteClass(cls.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                          title="Remove lecture from timetable"
                          aria-label="Remove lecture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: NOTION WEEKLY MATRIX VIEW (6-Column Full Week Planner) */}
      {viewMode === 'matrix' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
          {days.map((day) => {
            const dayClasses = getFilteredDayClasses(day);
            const isToday = getInitialDay() === day;

            return (
              <div
                key={day}
                className={`rounded-2xl border p-3 flex flex-col min-h-[340px] transition ${
                  isToday
                    ? 'bg-slate-900/60 border-emerald-500/30 shadow-xs'
                    : 'bg-slate-900/30 border-slate-800'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white">{day.slice(0, 3)}</span>
                    {isToday && (
                      <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {dayClasses.length}
                  </span>
                </div>

                {/* Day Lecture Cards */}
                <div className="space-y-2 flex-1">
                  {dayClasses.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-600">
                      No classes
                    </div>
                  ) : (
                    dayClasses.map((cls) => {
                      const isLab = cls.time.toLowerCase().includes('lab') || cls.room.toLowerCase().includes('lab');

                      return (
                        <div
                          key={cls.id}
                          className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5 group relative"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-semibold text-slate-300 truncate">
                              {cls.subjectCode}
                            </span>
                            {isLab && (
                              <span className="text-[8px] font-bold px-1 rounded bg-amber-500/20 text-amber-300">
                                LAB
                              </span>
                            )}
                          </div>

                          <h5 className="text-[11px] font-semibold text-slate-100 leading-snug truncate">
                            {cls.subjectName}
                          </h5>

                          <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                            <div className="truncate">{cls.time}</div>
                            <div className="text-slate-500 truncate">{cls.room}</div>
                          </div>

                          {onDeleteClass && (
                            <button
                              type="button"
                              onClick={() => onDeleteClass(cls.id)}
                              className="absolute top-1.5 right-1.5 p-1 rounded text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add on this day button */}
                {onAddClass && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(day)}
                    className="w-full mt-2 py-1 text-center text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition cursor-pointer border border-dashed border-transparent hover:border-slate-700"
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Add Class Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add Class Modal"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-300" />
                <h3 className="font-semibold text-sm text-white">
                  Add Lecture / Lab on {targetAddDay}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              {/* Day selection inside modal */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Scheduled Day *
                </label>
                <select
                  value={targetAddDay}
                  onChange={(e) => setTargetAddDay(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Subject *
                </label>
                {subjects.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={subName}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                      <option value="__custom__">+ Other Custom Subject</option>
                    </select>
                    {subName === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter custom subject name..."
                        onChange={(e) => setSubName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Operating Systems / Python Lab"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                )}
              </div>

              {/* Time Slot */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Time Slot *</label>
                  <button
                    type="button"
                    onClick={() => setUseCustomTime(!useCustomTime)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    {useCustomTime ? 'Use preset slots' : 'Enter custom time'}
                  </button>
                </div>
                {!useCustomTime ? (
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition cursor-pointer font-mono"
                  >
                    {COMMON_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="e.g. 08:30 AM - 10:00 AM"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition"
                  />
                )}
              </div>

              {/* Room & Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room / Lab *</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Room 402 or CS Lab 2"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Faculty / Prof</label>
                  <input
                    type="text"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="e.g. Prof. Sneha"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                  />
                </div>
              </div>

              {/* Likely Topic Focus */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Expected Topic / Lab Task <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  placeholder="e.g. Process Scheduling Algorithms or Experiment 3"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold transition cursor-pointer"
                >
                  Save to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
