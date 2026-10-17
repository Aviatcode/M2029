import { Classroom, LessonContent } from './types';

/**
 * Pure Clean Initial State for Legacy Classroom Compatibility
 * All hardcoded lessons, preset BCA-SEM3 curriculum, and fake doubts
 * have been cleared out so cohorts initialize with empty states.
 */

export const DEFAULT_LESSONS: Record<string, LessonContent> = {};

export const DEFAULT_CLASSROOM: Classroom = {
  code: '',
  name: '',
  university: '',
  course: '',
  semester: '',
  datesheet: [],
  doubts: [],
  cachedLessons: {},
  units: [],
};
