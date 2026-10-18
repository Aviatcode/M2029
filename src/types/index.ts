export type UserRole = 'admin' | 'teacher' | 'student' | 'cr';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  classId: string;
}

export interface ClassWorkspace {
  id: string;
  code: string; // e.g. "BCA-2028"
  name: string; // e.g. "BCA Batch of 2028"
  university: string; // e.g. "Delhi University / IPU"
  semester: number; // e.g. 3
  academicYear: string; // e.g. "2026-2027"
  memberCount: number;
  adminId: string;
  verifiedByCR?: boolean;
  crName?: string;
  crRollNo?: string;
  crVerifiedAt?: string;
}

export interface Subject {
  id: string;
  classId: string;
  name: string; // e.g. "Database Management Systems"
  code: string; // e.g. "BCA-302"
  teacherName: string;
  credits: number;
  color: string;
  iconName?: string;
  totalUnits: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
}

export type TopicStatus = 'not_started' | 'learning' | 'revised' | 'strong' | 'weak';

export interface Topic {
  id: string;
  unitId: string;
  unitTitle?: string;
  subjectId?: string;
  title: string;
  order?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examWeightage: 'Must Read (10 Marks)' | 'High' | 'Medium' | 'Low';
  estimatedMinutes: number;
  status?: TopicStatus;
  lastRevisedAt?: string;
  completed?: boolean;
  masteryScore?: number;
  prerequisites?: string[];
}

export interface Unit {
  id: string;
  subjectId?: string;
  number: number;
  title: string;
  topics: Topic[];
}

export interface TimetableClass {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  time: string; // e.g. "10:00 AM - 11:00 AM"
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  room: string;
  teacherName: string;
  likelyTopic?: {
    id: string;
    title: string;
    confidence: number; // 0 - 100%
    reasoning: string;
  };
}

export type VerificationStatus = 'teacher_verified' | 'ai_generated' | 'student_shared';

export interface MaterialResources {
  summary: string;
  hinglishSummary?: string;
  mindmapMermaid?: string;
  mindmapNodes?: any[];
  keyConcepts: { concept: string; explanation: string }[];
  importantDefinitions: { term: string; definition: string }[];
  examples: { title: string; scenario: string; takeaway: string }[];
  examPoints: string[];
  mnemonics?: { term: string; acronym?: string; mnemonic: string; explanation: string }[];
  exam10Marker?: {
    question: string;
    answerStructure: string;
    modelAnswerMarkdown: string;
    keyDiagramText?: string;
  };
  flashcards: { id: string; question: string; answer: string }[];
  quiz: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  possibleQuestions: { marks: number; question: string; answerOutline: string }[];
  relatedPYQs: { year: number; marks: number; question: string }[];
  detectedCategory?: 'notes' | 'pyq' | 'assignment' | 'syllabus' | 'cheat_sheet' | 'lab';
  folderPath?: string;
  crossReferences?: string[];
}

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'reading'
  | 'understanding'
  | 'organizing'
  | 'generating'
  | 'complete'
  | 'error';

export interface AcademicMaterial {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicTitle?: string;
  unitNumber?: number;
  unitTitle?: string;
  folderPath?: string;
  detectedCategory?: 'notes' | 'pyq' | 'assignment' | 'syllabus' | 'cheat_sheet' | 'lab';
  title: string;
  fileName: string;
  fileType: 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'notes' | 'image' | 'jpg' | 'png' | 'txt' | string;
  fileSize: string;
  uploaderName: string;
  uploaderRole: UserRole;
  verificationStatus: VerificationStatus;
  createdAt: string;
  resources: MaterialResources;
  downloadUrl?: string;
  fileDataUrl?: string;
  rawTextContent?: string;
}

export interface HistoricalPYQ {
  id: string;
  subjectId: string;
  subjectName: string;
  unitNumber: number;
  topicTitle: string;
  year: number; // e.g. 2021, 2022, 2024, 2025
  marks: number;
  question: string;
  modelAnswer: string;
  source: string; // e.g. "BCA End-Term Paper Dec 2024"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isVerifiedHistorical: boolean; // TRUE for actual university papers, FALSE for AI predicted
  frequencyCount?: number;
}

export interface PYQAnalysisItem {
  topicTitle: string;
  subjectName: string;
  frequency: number;
  yearsAsked: number[];
  highestMarks: number;
  importanceTier: 'Very High (Must Prepare)' | 'High' | 'Medium';
}

export interface ExamDateSheetItem {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  time: string;
  examType: 'Mid-Term' | 'End-Term' | 'Practical';
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | 'Already Revised';
  revisionDaysPlan: {
    dayNumber: number;
    title: string;
    topics: string[];
    completed: boolean;
  }[];
}

export type ClassworkType = 'assignment' | 'ppt_presentation' | 'lab_record';

export interface AcademicAssignment {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  type?: ClassworkType;
  dueDate: string;
  instructions: string;
  integrityMode: 'teach_me' | 'create_draft' | 'improve_answer';
  outlineSteps: string[];
  keyReferences: string[];
  sampleDraftGuidance?: string;
  assignedBy?: string;
  rollNumber?: string;
  presenterName?: string;
  completed?: boolean;
  aiSolvedAnswer?: string;
  solution?: string;
  solvedBy?: string;
  solvedAt?: string;
}

export interface ClassAnnouncement {
  id: string;
  classId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  createdAt: string;
  badge?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'class_reminder' | 'prep_reminder' | 'exam_alert' | 'material_uploaded';
  time: string;
  read: boolean;
  actionUrl?: string;
}

export type TutorResponseMode =
  | 'simple'
  | 'eli9'
  | 'hinglish'
  | 'exam_10marker'
  | 'detailed'
  | 'revision'
  | 'example'
  | 'socratic'
  | 'all';

export interface ChatMessage {
  id: string;
  sender: 'student' | 'ai';
  text: string;
  modeUsed?: TutorResponseMode;
  timestamp: string;
  sourcesUsed?: { title: string; type: string }[];
}

export interface SevenMinutePrep {
  subjectName: string;
  topicTitle: string;
  room: string;
  time: string;
  step1WhatIsIt: string;
  step2WhyUsed: string;
  step3AnalogyAndExample: string;
  step4MiniQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface ExtractedCourseInfo {
  teacherName: string;
  teacherDesignation: string;
  teacherEmail: string;
  teacherOffice: string;
  courseName: string;
  courseCode: string;
  university: string;
  department: string;
  semester: string;
  academicYear: string;
  credits: string;
  weeklySchedule: {
    day: string;
    time: string;
    room: string;
    type?: string;
  }[];
  units: {
    unitNumber: number;
    title: string;
    topics: string[];
    hours?: number;
    examWeightage?: string;
  }[];
  textbooks: {
    title: string;
    authors: string;
    publisher?: string;
    edition?: string;
  }[];
  evaluationScheme?: {
    component: string;
    weightage: string;
  }[];
}

export interface GitHubPublishFiles {
  repoName: string;
  readmeMarkdown: string;
  syllabusMarkdown: string;
  timetableMarkdown: string;
  contributingMarkdown: string;
  gitignoreContent: string;
  licenseContent: string;
  gitCommands: {
    title: string;
    commands: string[];
  }[];
}
