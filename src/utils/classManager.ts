import { ClassWorkspace, Subject } from '../types';

export const RECOMMENDED_BCA_SEM1_SUBJECTS: string[] = [];

export const getDefaultSubjectsForClass = (_classId: string, _semester: number = 1): Subject[] => {
  // Pure Clean Initial State: Do not inject any hardcoded or built-in default subjects
  return [];
};

/**
 * Returns the exact 2-liner invite message for sharing across WhatsApp, Telegram, etc.
 */
export const getTwoLineInviteMessage = (className: string, classCode: string): string => {
  const cleanCode = (classCode || 'BCA-2028').trim().toUpperCase();
  const cleanName = (className || cleanCode).trim();
  const origin = window.location.origin + window.location.pathname;
  const cleanUrl = origin.split('#')[0].split('?')[0];
  const inviteUrl = `${cleanUrl}#class=${encodeURIComponent(cleanCode)}`;

  return `Join our ${cleanName} class workspace on M2029!\nClass Code: ${cleanCode} • Open: ${inviteUrl}`;
};

/**
 * Share via Native Share API or fallback to clipboard
 */
export const shareClassInvite = async (
  className: string,
  classCode: string
): Promise<{ method: 'native' | 'clipboard'; success: boolean }> => {
  const message = getTwoLineInviteMessage(className, classCode);
  const cleanCode = (classCode || 'BCA-2028').trim().toUpperCase();
  const origin = window.location.origin + window.location.pathname;
  const cleanUrl = origin.split('#')[0].split('?')[0];
  const inviteUrl = `${cleanUrl}#class=${encodeURIComponent(cleanCode)}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Join ${className || cleanCode} on M2029`,
        text: message,
        url: inviteUrl,
      });
      return { method: 'native', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'native', success: false };
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(message);
    return { method: 'clipboard', success: true };
  } catch {
    return { method: 'clipboard', success: false };
  }
};

/**
 * Open direct WhatsApp share
 */
export const openWhatsAppInvite = (className: string, classCode: string) => {
  const message = getTwoLineInviteMessage(className, classCode);
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
};

/**
 * Save and retrieve class workspaces from localStorage
 */
export const saveClassLocally = (workspace: ClassWorkspace, subjects: Subject[]) => {
  try {
    const code = workspace.code.toUpperCase().trim();
    localStorage.setItem(`syllabus_class_${code}`, JSON.stringify({ workspace, subjects }));
    localStorage.setItem('syllabus_workspace', JSON.stringify(workspace));
    localStorage.setItem('syllabus_subjects', JSON.stringify(subjects));

    // Keep registry of all classes
    const existingRaw = localStorage.getItem('syllabus_all_classes');
    const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    if (!existing.includes(code)) {
      localStorage.setItem('syllabus_all_classes', JSON.stringify([...existing, code]));
    }
  } catch (err) {
    console.warn('Failed saving class locally:', err);
  }
};

export const getSavedClass = (code: string): { workspace: ClassWorkspace; subjects: Subject[] } | null => {
  try {
    const raw = localStorage.getItem(`syllabus_class_${code.toUpperCase().trim()}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};
