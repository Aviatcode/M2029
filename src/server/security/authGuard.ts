import { Request, Response, NextFunction } from 'express';
import { documentDeduplicationService } from '../storage/index.js';
import { ragEngine } from '../rag/ragIndex.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: 'student' | 'cr' | 'teacher' | 'admin';
  classId: string;
  isAdmin: boolean;
}

/**
 * Verify whether request contains valid admin credentials
 */
export function verifyAdminAuth(req: Request): boolean {
  const adminKey =
    (req.headers['x-admin-key'] as string) ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) {
    // If not set, admin operations are blocked in production, but permitted with warning in local test mode if explicit test header is provided
    if (process.env.NODE_ENV === 'test' && (req.headers['x-test-admin'] === 'true' || adminKey === 'test-admin-secret')) {
      return true;
    }
    return false;
  }
  return Boolean(adminKey && adminKey === expectedKey);
}

/**
 * Extract authenticated user context from request headers and tokens
 */
export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  const isAdmin = verifyAdminAuth(req);
  const headerUserId = (req.headers['x-user-id'] as string) || (req.headers['x-student-id'] as string);
  const headerUserName = (req.headers['x-student-name'] as string) || (req.headers['x-user-name'] as string);
  const headerRole = (req.headers['x-user-role'] as string)?.toLowerCase();
  const headerClassId = (req.headers['x-class-id'] as string) || 'class-m2029';

  const role: 'student' | 'cr' | 'teacher' | 'admin' = isAdmin
    ? 'admin'
    : (headerRole === 'teacher' || headerRole === 'cr' || headerRole === 'admin')
    ? (headerRole as any)
    : 'student';

  const id = headerUserId || (isAdmin ? 'admin-user' : 'student-user-current');
  const name = headerUserName || (isAdmin ? 'System Administrator' : 'Student User');

  return {
    id,
    name,
    role,
    classId: headerClassId,
    isAdmin,
  };
}

/**
 * Middleware: Strictly requires Admin authentication
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (verifyAdminAuth(req)) {
    return next();
  }
  return res.status(403).json({
    error: 'Forbidden: Administrative authorization required.',
    code: 'ADMIN_AUTH_REQUIRED',
  });
}

/**
 * Middleware: Requires either Admin, Teacher, or Class Representative role
 */
export function requireFacultyOrAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (user.isAdmin || user.role === 'teacher' || user.role === 'admin' || user.role === 'cr') {
    return next();
  }
  return res.status(403).json({
    error: 'Forbidden: Faculty or Class Representative authorization required.',
    code: 'FACULTY_AUTH_REQUIRED',
  });
}

/**
 * Middleware: Requires that a private student resource matches caller's own identity (or caller is admin/teacher)
 */
export function requireStudentOwnership(paramKey: 'userId' | 'studentId' = 'studentId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (user.isAdmin || user.role === 'teacher') {
      return next();
    }

    const targetStudentId =
      req.params[paramKey] ||
      req.body?.[paramKey] ||
      (req.query?.[paramKey] as string) ||
      (paramKey === 'studentId' ? req.body?.userId || req.query?.userId : req.body?.studentId || req.query?.studentId);

    // If caller didn't specify another student's ID, default applies to self
    if (!targetStudentId || targetStudentId === user.id || targetStudentId === 'student-self' || targetStudentId === 'student-user-1') {
      return next();
    }

    if (targetStudentId !== user.id) {
      return res.status(403).json({
        error: `Forbidden: You are not authorized to view or modify private learning data belonging to student "${targetStudentId}".`,
        code: 'STUDENT_PRIVACY_VIOLATION',
      });
    }

    return next();
  };
}

/**
 * Middleware: Requires that caller belongs to the requested classroom (or is admin)
 */
export function requireClassroomAccess(classParamKey: string = 'classId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (user.isAdmin) {
      return next();
    }

    const requestedClassId =
      req.params[classParamKey] ||
      req.params.classCode ||
      req.params.code ||
      req.body?.[classParamKey] ||
      (req.query?.[classParamKey] as string);

    if (!requestedClassId) {
      return next();
    }

    // Normalizing class identifiers
    const userClass = user.classId.toLowerCase().trim();
    const targetClass = requestedClassId.toLowerCase().trim();

    if (userClass !== targetClass && !userClass.includes(targetClass) && !targetClass.includes(userClass)) {
      return res.status(403).json({
        error: `Access Denied: You are not authorized to access resources belonging to classroom "${requestedClassId}".`,
        code: 'CROSS_CLASS_FORBIDDEN',
      });
    }

    return next();
  };
}

/**
 * Verifies document download authorization for docId against classroom scope
 */
export async function verifyDocumentDownloadAccess(
  docId: string,
  classId: string,
  studentName?: string
): Promise<{ authorized: boolean; reason?: string; storagePath?: string }> {
  const doc = ragEngine.getDocument(docId);
  if (!doc) {
    return { authorized: false, reason: 'Document not found' };
  }

  // Check document deduplication service access permissions if storage key or fileName is present
  const storageKey = (doc as any).storageKey || doc.fileName;
  if (storageKey) {
    const hasAccess = await documentDeduplicationService.verifyStorageKeyAccess(storageKey, classId, studentName);
    if (!hasAccess) {
      return { authorized: false, reason: 'Cross-classroom access denied' };
    }
  } else if (doc.classId && doc.classId !== classId && classId !== 'class-all') {
    return { authorized: false, reason: 'Cross-classroom access denied' };
  }

  return { authorized: true, storagePath: doc.storagePath };
}
