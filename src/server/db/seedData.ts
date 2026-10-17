import {
  ClassWorkspace,
  Subject,
  Unit,
  TimetableClass,
  AcademicMaterial,
  HistoricalPYQ,
  ExamDateSheetItem,
  ClassAnnouncement,
  AppNotification,
  AcademicAssignment,
} from '../../types/index.js';

/**
 * Pure Clean Initial State
 * All hardcoded demo/seed data has been completely removed to let real users
 * configure their real semester, subjects, timetable, notes, and exams.
 */

export const SEED_CLASS: ClassWorkspace = {
  id: '',
  code: '',
  name: '',
  university: '',
  semester: 1,
  academicYear: '',
  memberCount: 0,
  adminId: '',
};

export const SEED_SUBJECTS: Subject[] = [];

export const SEED_UNITS: Record<string, Unit[]> = {};

export const SEED_TIMETABLE: TimetableClass[] = [];

export const SEED_MATERIALS: AcademicMaterial[] = [];

export const SEED_PYQS: HistoricalPYQ[] = [];

export const SEED_EXAMS: ExamDateSheetItem[] = [];

export const SEED_ANNOUNCEMENTS: ClassAnnouncement[] = [];

export const SEED_ASSIGNMENTS: AcademicAssignment[] = [];

export const SEED_NOTIFICATIONS: AppNotification[] = [];
