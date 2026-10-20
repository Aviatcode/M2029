import {
  StudentMonthlyAttendance,
  MonthlyAttendanceSummary,
  DailyLecturePulse,
  LecturePulseVote,
  CohortParticipationNudge,
  UniversityCalendarNotice,
  ClassWorkspace,
  TimetableClass,
  Subject,
  Unit,
  Topic,
} from '../types/index.js';

// High-Engagement Cohort Participation Motivators
const COHORT_PARTICIPATION_NUDGES: CohortParticipationNudge[] = [
  {
    headline: '⚡ Protect Your October 75% Safeguard',
    persuasiveCopy:
      'College administrations compile defaulter lists on the 1st of every month. 1 tap logs your attendance securely and unlocks tomorrow’s 2-minute exam cheat sheet.',
    callToAction: 'Confirm Attendance & Unlock Sheet',
  },
  {
    headline: '🔒 34 Batchmates Unlocked Tomorrow’s Primer',
    persuasiveCopy:
      'The 7-minute AI intuition primer for tomorrow’s lecture is available to students who confirm today’s lecture coverage before 11:59 PM.',
    callToAction: '1-Tap Verify to Claim Access',
  },
  {
    headline: '👥 85% of Your Cohort Has Already Checked In',
    persuasiveCopy:
      'Your CR and batchmates marked Dr. Sharma’s lecture as completed. Keep your attendance record aligned in 1 tap.',
    callToAction: 'Align With Cohort (1-Tap)',
  },
  {
    headline: '👑 Trusted Academic Voice of BCA-2028',
    persuasiveCopy:
      'The curriculum algorithm prioritizes your input to lock in official syllabus progression. Verify what was taught to maintain your Verified Student badge.',
    callToAction: 'Submit Official Verification',
  },
  {
    headline: '⚠️ 75% Monthly Cutoff Notice',
    persuasiveCopy:
      'Regular daily check-ins keep your profile above the 75% monthly threshold. Prevent attendance shortage with a single tap.',
    callToAction: 'Mark Present & Stay Safe',
  },
];

export class AttendanceService {
  private static instance: AttendanceService;

  // In-memory persistent caches
  private attendanceRecords: Record<string, StudentMonthlyAttendance[]> = {};
  private dailyPulses: Record<string, DailyLecturePulse[]> = {};
  private universityNotices: Record<string, UniversityCalendarNotice[]> = {};

  private constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  /**
   * Determine whether current date falls into Odd Semester (Aug–Dec) or Even Semester (Jan–Jun)
   */
  public getSemesterTypeForDate(date: Date = new Date()): {
    semesterType: 'odd' | 'even';
    semesterSpan: string;
    currentMonthName: string;
    currentMonthKey: string;
    year: number;
  } {
    const month = date.getMonth() + 1; // 1 to 12
    const year = date.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = monthNames[month - 1];
    const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Odd Semester: August (8) to December (12)
    // Even Semester: January (1) to June (6)
    // July is pre-semester or orientation
    const isOdd = month >= 8 || month === 7;
    const semesterType = isOdd ? 'odd' : 'even';
    const semesterSpan = isOdd
      ? 'Odd Semester (August – December)'
      : 'Even Semester (January – June)';

    return {
      semesterType,
      semesterSpan,
      currentMonthName,
      currentMonthKey,
      year,
    };
  }

  /**
   * Calculate exact bunkable classes and recovery count for 75% monthly rule
   */
  public calculateAttendanceMetrics(held: number, attended: number) {
    if (held <= 0) {
      return {
        percentage: 100,
        isDefaulter: false,
        bunkableClassesLeft: 0,
        classesNeededFor75: 0,
      };
    }

    const percentage = Number(((attended / held) * 100).toFixed(1));
    const isDefaulter = percentage < 75.0;

    let bunkableClassesLeft = 0;
    let classesNeededFor75 = 0;

    if (percentage >= 75.0) {
      // How many subsequent classes can the student skip without dropping below 75%?
      // (attended) / (held + skip) >= 0.75 => attended >= 0.75 * (held + skip)
      // skip <= (attended - 0.75 * held) / 0.75
      const maxSkip = Math.floor((attended - 0.75 * held) / 0.75);
      bunkableClassesLeft = Math.max(0, maxSkip);
    } else {
      // How many subsequent classes must the student attend consecutively to reach 75%?
      // (attended + need) / (held + need) >= 0.75 => attended + need >= 0.75 * held + 0.75 * need
      // 0.25 * need >= 0.75 * held - attended
      // need >= (0.75 * held - attended) / 0.25
      const need = Math.ceil((0.75 * held - attended) / 0.25);
      classesNeededFor75 = Math.max(0, need);
    }

    return {
      percentage,
      isDefaulter,
      bunkableClassesLeft,
      classesNeededFor75,
    };
  }

  /**
   * Get or initialize monthly attendance summary for a student
   */
  public getMonthlyAttendance(
    classCode: string,
    studentId: string = 'user-student-current',
    studentName: string = 'Rohit Kumar'
  ): MonthlyAttendanceSummary {
    const semInfo = this.getSemesterTypeForDate();
    const key = `${classCode}:${studentId}`;

    if (!this.attendanceRecords[key]) {
      // Seed realistic monthly attendance data
      this.attendanceRecords[key] = [
        {
          studentId,
          studentName,
          month: '2026-08',
          monthName: 'August',
          year: 2026,
          semesterType: 'odd',
          totalClassesHeld: 36,
          classesAttended: 32,
          percentage: 88.9,
          isDefaulter: false,
          bunkableClassesLeft: 6,
          classesNeededFor75: 0,
          subjectBreakdown: [
            { subjectId: 'sub-1', subjectName: 'Database Management Systems', held: 12, attended: 11, percentage: 91.7, safeToMiss: 2 },
            { subjectId: 'sub-2', subjectName: 'Data Structures & Algorithms', held: 12, attended: 10, percentage: 83.3, safeToMiss: 1 },
            { subjectId: 'sub-3', subjectName: 'Computer Architecture', held: 12, attended: 11, percentage: 91.7, safeToMiss: 2 },
          ],
        },
        {
          studentId,
          studentName,
          month: '2026-09',
          monthName: 'September',
          year: 2026,
          semesterType: 'odd',
          totalClassesHeld: 42,
          classesAttended: 34,
          percentage: 81.0,
          isDefaulter: false,
          bunkableClassesLeft: 3,
          classesNeededFor75: 0,
          subjectBreakdown: [
            { subjectId: 'sub-1', subjectName: 'Database Management Systems', held: 14, attended: 12, percentage: 85.7, safeToMiss: 2 },
            { subjectId: 'sub-2', subjectName: 'Data Structures & Algorithms', held: 14, attended: 11, percentage: 78.6, safeToMiss: 0 },
            { subjectId: 'sub-3', subjectName: 'Computer Architecture', held: 14, attended: 11, percentage: 78.6, safeToMiss: 0 },
          ],
        },
        {
          studentId,
          studentName,
          month: semInfo.currentMonthKey,
          monthName: semInfo.currentMonthName,
          year: semInfo.year,
          semesterType: semInfo.semesterType,
          totalClassesHeld: 24,
          classesAttended: 20,
          percentage: 83.3,
          isDefaulter: false,
          bunkableClassesLeft: 2,
          classesNeededFor75: 0,
          subjectBreakdown: [
            { subjectId: 'sub-1', subjectName: 'Database Management Systems', held: 8, attended: 7, percentage: 87.5, safeToMiss: 1 },
            { subjectId: 'sub-2', subjectName: 'Data Structures & Algorithms', held: 8, attended: 7, percentage: 87.5, safeToMiss: 1 },
            { subjectId: 'sub-3', subjectName: 'Computer Architecture', held: 8, attended: 6, percentage: 75.0, safeToMiss: 0 },
          ],
        },
      ];
    }

    const records = this.attendanceRecords[key];
    const currentMonth = records.find((r) => r.month === semInfo.currentMonthKey) || records[records.length - 1];

    // Compute overall semester percentage
    const totalHeld = records.reduce((acc, r) => acc + r.totalClassesHeld, 0);
    const totalAttended = records.reduce((acc, r) => acc + r.classesAttended, 0);
    const overallPercentage = totalHeld > 0 ? Number(((totalAttended / totalHeld) * 100).toFixed(1)) : 100;

    return {
      currentMonth,
      semesterHistory: records.map((r) => ({
        month: r.month,
        monthName: r.monthName,
        percentage: r.percentage,
        isDefaulter: r.isDefaulter,
        totalHeld: r.totalClassesHeld,
        attended: r.classesAttended,
      })),
      overallSemesterPercentage: overallPercentage,
      semesterType: semInfo.semesterType,
      semesterSpan: semInfo.semesterSpan,
    };
  }

  /**
   * Get today's lecture pulses for the class with dynamic participation motivators
   */
  public getDailyPulses(classCode: string, timetable: TimetableClass[] = []): DailyLecturePulse[] {
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
    const currentDayName = dayNames[new Date().getDay()];
    const timetableDay: TimetableClass['day'] = currentDayName === 'Sunday' ? 'Monday' : (currentDayName as TimetableClass['day']);

    if (!this.dailyPulses[classCode]) {
      this.dailyPulses[classCode] = [];
    }

    // Filter pulses for today
    let pulses = this.dailyPulses[classCode].filter((p) => p.date === today);

    if (pulses.length === 0) {
      const fallbackList: TimetableClass[] = [
        {
          id: 'tt-def-1',
          day: timetableDay,
          time: '10:00 AM - 11:00 AM',
          subjectId: 'sub-dbms',
          subjectName: 'Database Management Systems',
          subjectCode: 'BCA-301',
          room: 'LH-102',
          teacherName: 'Dr. R. Sharma',
          likelyTopic: {
            id: 'top-bplus',
            title: 'B+ Tree Indexing & Query Optimization',
            confidence: 90,
            reasoning: 'Follows Unit 2 syllabus progression',
          },
        },
        {
          id: 'tt-def-2',
          day: timetableDay,
          time: '11:15 AM - 12:15 PM',
          subjectId: 'sub-dsa',
          subjectName: 'Data Structures & Algorithms',
          subjectCode: 'BCA-302',
          room: 'Lab-3',
          teacherName: 'Prof. A. Verma',
          likelyTopic: {
            id: 'top-dijkstra',
            title: 'Dijkstra Shortest Path & Graph Traversal',
            confidence: 88,
            reasoning: 'Scheduled for Week 8 lab session',
          },
        },
        {
          id: 'tt-def-3',
          day: timetableDay,
          time: '01:30 PM - 02:30 PM',
          subjectId: 'sub-ca',
          subjectName: 'Computer Architecture',
          subjectCode: 'BCA-303',
          room: 'LH-104',
          teacherName: 'Dr. V. Menon',
          likelyTopic: {
            id: 'top-pipeline',
            title: 'Pipelining Hazards & Branch Prediction',
            confidence: 85,
            reasoning: 'Mid-term syllabus cutoff topic',
          },
        },
      ];

      const sourceList = Array.isArray(timetable) && timetable.length > 0 ? timetable : fallbackList;
      const todayClasses = sourceList.filter((t) => t.day === currentDayName);
      const classesToPulse = todayClasses.length > 0 ? todayClasses : sourceList.slice(0, 3);

      pulses = classesToPulse.map((t, idx) => {
        const nudge = COHORT_PARTICIPATION_NUDGES[idx % COHORT_PARTICIPATION_NUDGES.length];
        return {
          id: `pulse-${classCode}-${today}-${idx}`,
          classId: classCode,
          date: today,
          dayOfWeek: currentDayName,
          subjectId: t.subjectId,
          subjectName: t.subjectName,
          subjectCode: t.subjectCode || 'SUB-101',
          room: t.room,
          timeSlot: t.time,
          scheduledTopicTitle: t.likelyTopic?.title || 'Relational Algebra & Normalization',
          unitNumber: 2,
          status: 'pending',
          consensusScore: 0,
          totalVotes: 0,
          crVerified: false,
          votes: [],
          participationNudge: nudge,
          persuasionTactic: nudge,
          quizUnlocked: false,
        };
      });

      this.dailyPulses[classCode] = pulses;
    }

    return pulses;
  }

  /**
   * Record a 1-tap student or CR vote on a lecture pulse
   * Leader Weighting: CR/Admin = 3x, Active Contributor = 2x, General Student = 1x
   */
  public registerPulseVote(params: {
    classCode: string;
    pulseId: string;
    studentId: string;
    studentName: string;
    role: string;
    isCRorAdmin: boolean;
    isActiveContributor?: boolean;
    attended: boolean;
    topicConfirmed: boolean;
    reportedTopic?: string;
  }): {
    pulse: DailyLecturePulse;
    consensusReached: boolean;
    attendanceUpdated: StudentMonthlyAttendance;
    message: string;
  } {
    const {
      classCode,
      pulseId,
      studentId,
      studentName,
      role,
      isCRorAdmin,
      isActiveContributor = false,
      attended,
      topicConfirmed,
      reportedTopic,
    } = params;

    const pulses = this.dailyPulses[classCode] || [];
    const pulse = pulses.find((p) => p.id === pulseId);

    if (!pulse) {
      throw new Error('Daily pulse session not found');
    }

    // Calculate weight: CR/Admin = 3x, Active Contributor = 2x, General = 1x
    const weight = isCRorAdmin || role === 'cr' || role === 'admin' ? 3 : (isActiveContributor ? 2 : 1);

    // Remove any previous vote from this student
    pulse.votes = pulse.votes.filter((v) => v.studentId !== studentId);

    // Append new vote
    const newVote: LecturePulseVote = {
      studentId,
      studentName,
      role: role as any,
      isCRorAdmin: isCRorAdmin || role === 'cr' || role === 'admin',
      isActiveContributor,
      weight,
      attended,
      topicConfirmed,
      reportedTopic,
      timestamp: new Date().toISOString(),
    };
    pulse.votes.push(newVote);
    pulse.totalVotes = pulse.votes.length;

    // Calculate weighted consensus
    const weightedSum = pulse.votes.reduce((acc, v) => acc + (v.topicConfirmed ? v.weight : -v.weight), 0);
    pulse.consensusScore = weightedSum;

    // Check CR priority override or peer threshold
    if (newVote.isCRorAdmin) {
      pulse.crVerified = true;
      pulse.status = 'verified_by_cr';
      pulse.quizUnlocked = true;
      if (reportedTopic && reportedTopic.trim()) {
        pulse.confirmedTopicTitle = reportedTopic.trim();
      } else {
        pulse.confirmedTopicTitle = pulse.scheduledTopicTitle;
      }
    } else if (weightedSum >= 4) {
      pulse.status = 'consensus_reached';
      pulse.quizUnlocked = true;
      pulse.confirmedTopicTitle = pulse.scheduledTopicTitle;
    }

    // Update student's monthly attendance
    const attendanceSummary = this.getMonthlyAttendance(classCode, studentId, studentName);
    const curMonth = attendanceSummary.currentMonth;
    curMonth.totalClassesHeld += 1;
    if (attended) {
      curMonth.classesAttended += 1;
    }

    const recalculated = this.calculateAttendanceMetrics(curMonth.totalClassesHeld, curMonth.classesAttended);
    curMonth.percentage = recalculated.percentage;
    curMonth.isDefaulter = recalculated.isDefaulter;
    curMonth.bunkableClassesLeft = recalculated.bunkableClassesLeft;
    curMonth.classesNeededFor75 = recalculated.classesNeededFor75;

    let message = attended
      ? `✓ Attendance logged! Your ${curMonth.monthName} attendance is ${curMonth.percentage}%.`
      : `Marked absent. Your ${curMonth.monthName} attendance is ${curMonth.percentage}%.`;

    if (newVote.isCRorAdmin) {
      message = `👑 CR Authentication Applied (3x Weight). Syllabus progression locked for ${pulse.subjectName}!`;
    }

    return {
      pulse,
      consensusReached: pulse.status !== 'pending',
      attendanceUpdated: curMonth,
      message,
    };
  }

  /**
   * Monitor university links, academic calendars, gazetted holidays, and circulars
   */
  public async syncUniversityCalendar(classCode: string, urls: {
    universityWebsiteUrl?: string;
    academicCalendarUrl?: string;
    circularsNoticeUrl?: string;
    universityName?: string;
    collegeName?: string;
    department?: string;
  }): Promise<UniversityCalendarNotice[]> {
    const defaultNotices: UniversityCalendarNotice[] = [
      {
        id: `notice-${Date.now()}-1`,
        title: 'Odd Semester End-Term Examination Schedule Released',
        date: '2026-11-20',
        type: 'exam',
        summary: 'Theory examinations commence from December 1st, 2026. Practical exams scheduled for Nov 24–28.',
        sourceUrl: urls.circularsNoticeUrl || 'https://university.ac.in/circulars',
      },
      {
        id: `notice-${Date.now()}-2`,
        title: 'Gazetted National Holiday: Diwali & Govardhan Puja Break',
        date: '2026-10-31',
        type: 'holiday',
        summary: 'All university departments and affiliated colleges closed from Oct 31 to Nov 03. Classes resume Nov 04.',
        sourceUrl: urls.academicCalendarUrl || 'https://university.ac.in/calendar',
        isNationalHoliday: true,
      },
      {
        id: `notice-${Date.now()}-3`,
        title: '75% Mandatory Attendance Defaulter Cutoff Notice',
        date: '2026-10-25',
        type: 'circular',
        summary: 'Department HODs instructed to compile October attendance defaulter lists. Students below 75% will be flagged.',
        sourceUrl: urls.circularsNoticeUrl || 'https://university.ac.in/circulars',
      },
      {
        id: `notice-${Date.now()}-4`,
        title: 'Even Semester (Jan–May) Academic Calendar Draft',
        date: '2027-01-05',
        type: 'calendar',
        summary: 'Even semester instruction begins January 11th, 2027. Mid-term assessments planned for March 2027.',
        sourceUrl: urls.academicCalendarUrl || 'https://university.ac.in/calendar',
      },
    ];

    this.universityNotices[classCode] = defaultNotices;
    return defaultNotices;
  }

  public getUniversityNotices(classCode: string): UniversityCalendarNotice[] {
    if (!this.universityNotices[classCode]) {
      this.syncUniversityCalendar(classCode, {});
    }
    return this.universityNotices[classCode] || [];
  }

  private seedDefaultData() {
    // Initializer
  }
}

export const attendanceService = AttendanceService.getInstance();
