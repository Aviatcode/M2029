import { Subject, TimetableClass, Unit, Topic } from '../types';
import { getAiRequestPayload } from './aiModelService';

export type AcademicDocType = 'timetable' | 'syllabus' | 'notes' | 'pyq' | 'assignment' | 'cheat_sheet';

const SUBJECT_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-emerald-600',
];

/**
 * Extracts plain text from various file formats (txt, csv, docx, pdf fallback)
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  dataUrl?: string;
  fileExt: string;
}> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'txt';
  let dataUrl: string | undefined;

  // Read data URL for images and PDFs (so Gemini or server can read multimodal)
  if (file.type.startsWith('image/') || fileExt === 'pdf') {
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch {}
  }

  // 1. Plain text / CSV / JSON / Markdown
  if (
    file.type.includes('text') ||
    fileExt === 'txt' ||
    fileExt === 'csv' ||
    fileExt === 'tsv' ||
    fileExt === 'md' ||
    fileExt === 'json'
  ) {
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = reject;
        reader.readAsText(file);
      });
      return { text, dataUrl, fileExt };
    } catch {
      return { text: file.name, dataUrl, fileExt };
    }
  }

  // 2. DOCX Documents (Unzip XML)
  if (fileExt === 'docx') {
    try {
      const buffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      const docXml = await zip.file('word/document.xml')?.async('text');
      if (docXml) {
        const extracted = docXml
          .replace(/<w:p[^>]*>/g, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return { text: extracted, dataUrl, fileExt };
      }
    } catch (e) {
      console.warn('DOCX extraction fallback:', e);
    }
  }

  // 3. PDF Fallback: extract plain ASCII/text streams from array buffer
  if (fileExt === 'pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let extracted = '';
      // Look for text between parentheses in PDF content stream: (Text) Tj or (Text) '
      const rawString = new TextDecoder('latin1').decode(bytes);
      const matches = rawString.match(/\(([^)]{2,120})\)\s*(?:Tj|'|ET)/g);
      if (matches && matches.length > 5) {
        extracted = matches
          .map((m) => m.replace(/^[\s(]+/, '').replace(/[\s)'Tj]+$/, '').trim())
          .filter((s) => s.length > 2 && !s.includes('\\'))
          .join(' ');
      }
      if (extracted.length > 50) {
        return { text: extracted, dataUrl, fileExt };
      }
    } catch (e) {
      console.warn('PDF raw stream scan fallback:', e);
    }
  }

  return { text: `${file.name.replace(/\.[^/.]+$/, '')}`, dataUrl, fileExt };
}

/**
 * Checks whether content or filename represents a Timetable / Schedule
 */
export function isTimetableDocument(fileName: string = '', rawText: string = ''): boolean {
  const name = fileName.toLowerCase();
  const sample = `${name} ${rawText}`.toLowerCase();

  // Strong file name indicators
  if (
    name.includes('timetable') ||
    name.includes('time-table') ||
    name.includes('time_table') ||
    name.includes('schedule') ||
    name.includes('routine') ||
    name.includes('datesheet') ||
    name.includes('class_routine') ||
    name.includes('lecture_schedule')
  ) {
    return true;
  }

  // Count day names
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayMatches = days.filter((d) => new RegExp(`\\b${d}\\b`, 'i').test(sample));

  // Time format indicators (e.g. 09:00, 10:00, 11:30, AM, PM, period, slot)
  const hasTimeRanges =
    /\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\s*[-–to]\s*\d{1,2}[:.]\d{2}\s*(?:am|pm)?/i.test(sample) ||
    /\b(?:period|slot|lecture|lab)\s*[1-8]/i.test(sample) ||
    /\b(?:recess|lunch\s*break)\b/i.test(sample);

  // If at least 2 distinct days AND time ranges/period keywords exist, it's definitely a timetable
  if (dayMatches.length >= 2 && (hasTimeRanges || sample.includes('room') || sample.includes('slot'))) {
    return true;
  }

  if (sample.includes('timetable') || sample.includes('time table') || sample.includes('class routine')) {
    return true;
  }

  return false;
}

/**
 * Checks whether content or filename represents a Syllabus / Curriculum
 */
export function isSyllabusDocument(fileName: string = '', rawText: string = ''): boolean {
  const name = fileName.toLowerCase();
  const sample = `${name} ${rawText}`.toLowerCase();

  if (
    name.includes('syllabus') ||
    name.includes('curriculum') ||
    name.includes('course_outline') ||
    name.includes('course_structure')
  ) {
    return true;
  }

  const hasUnits = /\b(?:unit|module|chapter)\s*[1-5IVX]/i.test(sample);
  const hasAcademicTerms =
    sample.includes('syllabus') ||
    sample.includes('course outcomes') ||
    sample.includes('course objectives') ||
    sample.includes('learning outcomes') ||
    (sample.includes('prerequisites') && hasUnits);

  return hasUnits && hasAcademicTerms;
}

/**
 * Classifies the type of academic document
 */
export function detectDocumentType(fileName: string = '', rawText: string = ''): AcademicDocType {
  if (isTimetableDocument(fileName, rawText)) return 'timetable';
  if (isSyllabusDocument(fileName, rawText)) return 'syllabus';

  const sample = `${fileName} ${rawText}`.toLowerCase();
  if (sample.includes('pyq') || sample.includes('question paper') || sample.includes('previous year')) {
    return 'pyq';
  }
  if (sample.includes('assignment') || sample.includes('homework') || sample.includes('lab task') || sample.includes('problem set')) {
    return 'assignment';
  }
  if (sample.includes('cheat sheet') || sample.includes('formula') || sample.includes('mnemonic')) {
    return 'cheat_sheet';
  }

  return 'notes';
}

/**
 * Pure client-side intelligent Timetable Parser
 * Accurately extracts subjects and schedule slots even without an active AI key
 */
export function parseTimetableClient(
  rawText: string,
  classCode: string = 'BCA-2028'
): { subjects: Subject[]; timetable: TimetableClass[] } {
  const daysList: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const standardTimeSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:15 AM - 12:15 PM',
    '12:15 PM - 01:15 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
  ];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Track discovered subjects
  const subjectMap = new Map<string, { name: string; code: string; teacher?: string }>();
  const timetableEntries: TimetableClass[] = [];

  let currentDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' = 'Monday';
  let slotIndex = 0;

  // Common blacklisted non-subject header words
  const ignoreWords = new Set([
    'time', 'table', 'timetable', 'schedule', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'room', 'period', 'slot', 'class', 'sem',
    'semester', 'session', 'batch', 'break', 'lunch', 'recess', 'university',
    'college', 'department', 'date', 'faculty', 'teacher', 'day', 'time-table',
  ]);

  for (const line of lines) {
    // Check if line indicates a day of the week
    const lowerLine = line.toLowerCase();
    const matchedDay = daysList.find((d) => lowerLine.startsWith(d.toLowerCase()) || lowerLine === d.toLowerCase());
    if (matchedDay) {
      currentDay = matchedDay;
      slotIndex = 0;
      continue;
    }

    // Check for lunchtime / recess
    if (lowerLine.includes('lunch') || lowerLine.includes('recess') || lowerLine.includes('interval')) {
      continue;
    }

    // Extract time slot if explicitly present
    let detectedTime = standardTimeSlots[slotIndex % standardTimeSlots.length];
    const timeMatch = line.match(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?\s*[-–to]\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)/i);
    if (timeMatch) {
      detectedTime = timeMatch[1].toUpperCase();
    }

    // Extract Room if present
    let room = 'Room 101';
    const roomMatch = line.match(/\b(?:Room|Lab|Hall|LT)[\s_-]*([0-9A-Z]+)\b/i);
    if (roomMatch) {
      room = roomMatch[0];
    } else if (lowerLine.includes('lab')) {
      room = 'Computer Lab 1';
    }

    // Extract potential subject name
    // Strip time, room, teacher info to isolate subject
    let candidate = line
      .replace(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?\s*[-–to]\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)/gi, '')
      .replace(/\b(?:Room|Lab|Hall|LT)[\s_-]*([0-9A-Z]+)\b/gi, '')
      .replace(/[-|:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check if candidate has meaningful text
    if (!candidate || candidate.length < 3) continue;

    const firstWord = candidate.split(' ')[0].toLowerCase();
    if (ignoreWords.has(firstWord) && candidate.split(' ').length <= 2) {
      continue;
    }

    // Extract Subject Code if exists, e.g. BCA-301, CS204, SUB-101
    const codeMatch = candidate.match(/\b([A-Z]{2,4}[-\s]?[0-9]{3}[A-Z]?)\b/);
    const cleanCode = codeMatch ? codeMatch[1].replace(/\s+/, '-') : '';

    // Clean subject title
    let cleanName = candidate
      .replace(/\b([A-Z]{2,4}[-\s]?[0-9]{3}[A-Z]?)\b/g, '')
      .replace(/\b(prof|dr|mr|mrs|ms)\.?\s+[A-Za-z]+\b/gi, '') // remove teacher name from title
      .trim();

    if (!cleanName || cleanName.length < 3) {
      cleanName = cleanCode || candidate;
    }

    // Extract teacher name if present
    let teacher = 'Faculty In-Charge';
    const teacherMatch = line.match(/\b(?:prof|dr|mr|mrs|ms)\.?\s+([A-Za-z\s]{3,25})\b/i);
    if (teacherMatch) {
      teacher = teacherMatch[0];
    }

    // Add to subject map
    const subjectKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!subjectMap.has(subjectKey)) {
      const generatedCode = cleanCode || `SUB-${101 + subjectMap.size}`;
      subjectMap.set(subjectKey, {
        name: cleanName,
        code: generatedCode,
        teacher,
      });
    }

    const subInfo = subjectMap.get(subjectKey)!;

    timetableEntries.push({
      id: `slot-${Date.now()}-${timetableEntries.length}-${Math.random().toString(36).slice(2, 6)}`,
      day: currentDay,
      time: detectedTime,
      subjectId: `sub-${subInfo.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      subjectName: subInfo.name,
      subjectCode: subInfo.code,
      room,
      teacherName: subInfo.teacher || teacher,
      likelyTopic: {
        id: `topic-auto-${timetableEntries.length}`,
        title: `Core Fundamentals of ${subInfo.name}`,
        confidence: 85,
        reasoning: 'Extracted from uploaded weekly timetable',
      },
    });

    slotIndex++;
  }

  // Convert map to Subject[]
  const subjects: Subject[] = Array.from(subjectMap.values()).map((sub, idx) => ({
    id: `sub-${sub.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    classId: classCode,
    name: sub.name,
    code: sub.code,
    teacherName: sub.teacher || 'Faculty In-Charge',
    credits: 4,
    color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
    totalUnits: 4,
    completedTopicsCount: 0,
    totalTopicsCount: 12,
  }));

  return { subjects, timetable: timetableEntries };
}

/**
 * Pure client-side intelligent Syllabus Parser
 */
export function parseSyllabusClient(
  rawText: string,
  subjectHint: string = 'Course Curriculum'
): { subjects: Subject[]; unitsBySubject: Record<string, Unit[]> } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let currentSubjectName = subjectHint;
  let currentSubjectCode = 'SUB-101';

  // Detect subject title from first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (l.toLowerCase().includes('subject:') || l.toLowerCase().includes('course:')) {
      currentSubjectName = l.replace(/^[^:]+:\s*/, '').trim();
      break;
    }
  }

  const subjectId = `sub-${currentSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'core'}`;

  const units: Unit[] = [];
  let currentUnit: Unit | null = null;

  for (const line of lines) {
    const unitMatch = line.match(/^(?:Unit|Module|Chapter)\s*([0-9IVX]+)[:\s-]*(.*)/i);
    if (unitMatch) {
      const uNum = parseInt(unitMatch[1]) || units.length + 1;
      const uTitle = unitMatch[2].trim() || `Module ${uNum}`;
      currentUnit = {
        id: `unit-${subjectId}-${uNum}`,
        subjectId,
        number: uNum,
        title: `Unit ${uNum}: ${uTitle}`,
        topics: [],
      };
      units.push(currentUnit);
      continue;
    }

    if (currentUnit && line.length > 3 && !line.toLowerCase().startsWith('textbooks')) {
      const cleanTopic = line.replace(/^[-*•\d.]+\s*/, '').trim();
      if (cleanTopic.length > 3) {
        currentUnit.topics.push({
          id: `topic-${currentUnit.id}-${currentUnit.topics.length + 1}`,
          unitId: currentUnit.id,
          unitTitle: currentUnit.title,
          subjectId,
          title: cleanTopic,
          difficulty: currentUnit.topics.length % 3 === 0 ? 'Hard' : currentUnit.topics.length % 2 === 0 ? 'Medium' : 'Easy',
          examWeightage: currentUnit.topics.length % 2 === 0 ? 'Must Read (10 Marks)' : 'High',
          estimatedMinutes: 7,
          status: 'not_started',
          completed: false,
        });
      }
    }
  }

  // Fallback if no explicit Unit headers found
  if (units.length === 0) {
    const fallbackUnit: Unit = {
      id: `unit-${subjectId}-1`,
      subjectId,
      number: 1,
      title: `Unit 1: ${currentSubjectName}`,
      topics: lines.slice(0, 8).map((l, idx) => ({
        id: `topic-${subjectId}-1-${idx}`,
        unitId: `unit-${subjectId}-1`,
        subjectId,
        title: l.replace(/^[-*•\d.]+\s*/, '').trim(),
        difficulty: 'Medium',
        examWeightage: 'High',
        estimatedMinutes: 7,
        status: 'not_started',
      })),
    };
    units.push(fallbackUnit);
  }

  const subject: Subject = {
    id: subjectId,
    classId: 'class-workspace',
    name: currentSubjectName,
    code: currentSubjectCode,
    teacherName: 'Faculty In-Charge',
    credits: 4,
    color: SUBJECT_COLORS[0],
    totalUnits: units.length,
    completedTopicsCount: 0,
    totalTopicsCount: units.reduce((acc, u) => acc + u.topics.length, 0),
  };

  return {
    subjects: [subject],
    unitsBySubject: { [subjectId]: units },
  };
}

/**
 * Parses timetable with backend AI endpoint and gracefully falls back to client parser
 */
export async function parseTimetableWithAi(payload: {
  rawText?: string;
  fileDataUrl?: string;
  fileName?: string;
  fileType?: string;
  classCode?: string;
}): Promise<{
  subjects: Subject[];
  timetable: TimetableClass[];
  source: 'ai' | 'heuristic';
}> {
  const cleanCode = payload.classCode || 'BCA-2028';
  const textContent = payload.rawText || '';

  try {
    const aiConfig = getAiRequestPayload();
    const res = await fetch('/api/timetable/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        classCode: cleanCode,
        ...aiConfig,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.subjects) && data.subjects.length > 0) {
        return {
          subjects: data.subjects,
          timetable: data.timetable || [],
          source: 'ai',
        };
      }
    }
  } catch (err) {
    console.warn('Backend timetable parse error, using client parser:', err);
  }

  // Pure client fallback
  const fallback = parseTimetableClient(textContent || payload.fileName || 'General Schedule', cleanCode);
  return {
    subjects: fallback.subjects,
    timetable: fallback.timetable,
    source: 'heuristic',
  };
}
