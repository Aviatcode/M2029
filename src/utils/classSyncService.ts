import {
  AcademicMaterial,
  AcademicAssignment,
  Unit,
  ExamDateSheetItem,
  AppNotification,
  ClassAnnouncement,
  TimetableClass,
} from '../types';

export interface ClassroomSyncPayload {
  classCode: string;
  classId: string;
  materials: AcademicMaterial[];
  assignments: AcademicAssignment[];
  units: Record<string, Unit[]> | Unit[];
  exams: ExamDateSheetItem[];
  announcements: ClassAnnouncement[];
  notifications: AppNotification[];
  timetable?: TimetableClass[];
  lastSyncedAt: string;
}

const SYNC_CACHE_KEY = 'm2029_class_sync_cache_v1';

/**
 * Fetch the latest shared classroom state from the central server.
 * Uses 0 AI tokens because it purely fetches pre-computed and cached data.
 */
export async function fetchClassroomSync(classCode = 'BCA-2028'): Promise<ClassroomSyncPayload | null> {
  try {
    const res = await fetch(`/api/sync/classroom/${encodeURIComponent(classCode)}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      throw new Error(`Sync HTTP error ${res.status}`);
    }
    const data: ClassroomSyncPayload = await res.json();
    try {
      localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    console.warn('[Class Sync] Live server sync notice, attempting cached copy:', err);
    try {
      const cached = localStorage.getItem(SYNC_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

/**
 * Initializes continuous background synchronization.
 * Updates the client automatically whenever another student uploads a material,
 * solves an assignment, or adds class notes.
 */
export function initClassroomAutoSync(
  classCode: string,
  onSyncReceived: (data: ClassroomSyncPayload) => void,
  intervalMs = 15000
): () => void {
  let isMounted = true;

  const performSync = async () => {
    if (!isMounted) return;
    const data = await fetchClassroomSync(classCode);
    if (data && isMounted) {
      onSyncReceived(data);
    }
  };

  // 1. Initial immediate sync
  performSync();

  // 2. Scheduled polling
  const intervalId = setInterval(performSync, intervalMs);

  // 3. Instant sync on tab focus or network reconnect
  const handleFocus = () => {
    performSync();
  };
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleFocus);
  };
}
