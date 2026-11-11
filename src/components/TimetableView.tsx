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
  ChevronDown,
  MoreVertical,
  Zap,
} from 'lucide-react';

interface TimetableViewProps {
  timetable: TimetableClass[];
  subjects?: Subject[];
  onStudyTopic: (topicTitle: string, subjectName: string) => void;
  onAddClass?: (newClass: Omit<TimetableClass, 'id'>) => void;
  onDeleteClass?: (classId: string) => void;
  onOpenUploadModal?: () => void;
  studentName?: string;
  classCode?: string;
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
  studentName,
  classCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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

  const daysList: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const searchedFilteredClasses = filteredClasses.filter((c) =>
    !searchQuery.trim() ||
    c.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClassesCount = timetable.length;
  const attendanceRate = totalClassesCount > 0 ? 88 : 0;
  const allowedBunks = totalClassesCount > 0 ? Math.max(1, Math.floor(totalClassesCount * 0.25)) : 0;

  return (
    <div className="w-full space-y-5 font-sans-ui text-slate-100 animate-fade-in select-none">
      {/* 1. TOP HEADER (Matching reference design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              • {classCode || 'BCA-2028'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Weekly Schedule
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141926] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          {/* View Mode Toggle Pill */}
          <div className="flex items-center gap-1 bg-[#141926] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Matrix
            </button>
          </div>

          {/* Lab filter toggle */}
          <button
            onClick={() => setLabFilter(labFilter === 'all' ? 'labs' : 'all')}
            className={`h-8 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              labFilter === 'labs'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#141926] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {labFilter === 'labs' ? 'Labs Only' : 'All Classes'}
          </button>

          {/* Add Class Button */}
          {onAddClass && (
            <button
              onClick={() => handleOpenAddModal()}
              className="h-8 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DAILY 3-COLUMN CARDS GRID (Matching reference design) */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {/* CARD 1: Day Overview & Selectors */}
          <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">Schedule Day</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                {selectedDay}
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {searchedFilteredClasses.length}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Classes on {selectedDay.slice(0, 3)}
                </span>
              </div>
            </div>

            {/* Overlapping Circles */}
            <div className="relative h-40 flex items-center justify-center my-1">
              <div className="absolute left-6 top-2 w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex flex-col items-center justify-center shadow-lg z-10">
                <span className="text-lg font-extrabold">{timetable.length}</span>
                <span className="text-[10px] text-violet-200">Total</span>
              </div>
              <div className="absolute right-6 top-4 w-20 h-20 rounded-full bg-[#181d2a] border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg z-20">
                <span className="text-base font-extrabold">{subjects.length}</span>
                <span className="text-[10px] text-slate-400">Subjects</span>
              </div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-lg z-30 font-bold">
                <span className="text-sm font-black">{attendanceRate}%</span>
                <span className="text-[8px] uppercase tracking-wider">Attend</span>
              </div>
            </div>

            {/* Day Selector Pills */}
            <div className="grid grid-cols-6 gap-1 pt-2 border-t border-slate-800/60">
              {daysList.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer text-center ${
                    selectedDay === d
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          {/* CARD 2: Daily Agenda Classes */}
          <div className="bg-[#121724] border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">Lectures Agenda</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Room & Time
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 no-scrollbar">
              {searchedFilteredClasses.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                  <Clock className="w-6 h-6 text-slate-600" />
                  <span>No lectures on {selectedDay}</span>
                </div>
              ) : (
                searchedFilteredClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-2xl bg-[#0d111a] border border-slate-800/80 hover:border-slate-700 transition text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-white truncate">{cls.subjectName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">
                        {cls.room}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{cls.time}</span>
                      <span>{cls.teacherName}</span>
                    </div>
                    {cls.likelyTopic && (
                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-400 truncate">
                          Focus: {cls.likelyTopic.title}
                        </span>
                        <button
                          onClick={() => onStudyTopic(cls.likelyTopic!.title, cls.subjectName)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer shrink-0"
                        >
                          Prep →
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {onAddClass && (
              <button
                onClick={() => handleOpenAddModal()}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-200 transition cursor-pointer text-center"
              >
                + Add Class Slot
              </button>
            )}
          </div>

          {/* CARD 3: Attendance Buffer (The Dark Accent Card) */}
          <div className="bg-[#090d18] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100">Attendance Buffer</h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                attendanceRate >= 75 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
              }`}>
                {attendanceRate >= 75 ? 'Safe' : 'Review'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <div className={`w-1 h-8 rounded-full shrink-0 ${attendanceRate >= 75 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <div>
                  <div className="text-xl font-black text-white">{attendanceRate}%</div>
                  <div className="text-[10px] text-slate-400">Class Attendance</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
                <div>
                  <div className="text-xl font-black text-white">{allowedBunks} Bunks</div>
                  <div className="text-[10px] text-slate-400">Allowed Safely</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-56 pr-1 no-scrollbar text-xs">
              {subjects.length === 0 ? (
                <div className="h-28 flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-1">
                  <span>No subjects monitored</span>
                </div>
              ) : (
                subjects.slice(0, 3).map((sub) => {
                  const subPercent = sub.totalTopicsCount > 0 ? Math.round((sub.completedTopicsCount / sub.totalTopicsCount) * 100) : 85;
                  return (
                    <div key={sub.id} className="p-2.5 rounded-2xl bg-[#121724] border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-200 font-semibold truncate">{sub.name}</span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {subPercent}% Safe
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[10px]">75% Minimum Criteria</span>
              <span className="text-cyan-400 font-bold text-[10px]">Monitored</span>
            </div>
          </div>
        </div>
      )}
      {/* VIEW 2: NOTION WEEKLY MATRIX VIEW (6-Column Full Week Planner) */}
      {viewMode === 'matrix' && (
        <div className="overflow-x-auto no-scrollbar pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start min-w-[720px] sm:min-w-0">
          {days.map((day) => {
            const rawDayClasses = getFilteredDayClasses(day);
            const dayClasses = rawDayClasses.filter(
              (c) =>
                !searchQuery.trim() ||
                c.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
            );
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
