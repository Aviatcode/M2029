export type MasteryState =
  | 'NOT_STARTED'
  | 'INTRODUCED'
  | 'LEARNING'
  | 'NEEDS_PRACTICE'
  | 'DEVELOPING'
  | 'DEMONSTRATED';

export type EvidenceSource =
  | 'ai_tutor_explanation'
  | 'did_not_understand_click'
  | 'quiz_evaluation'
  | 'practice_question'
  | 'topic_marked_completed';

export interface MasteryTransition {
  fromState: MasteryState;
  toState: MasteryState;
  evidenceSource: EvidenceSource;
  confidence: number;
  timestamp: string;
  notes?: string;
}

export interface ConceptMasteryRecord {
  id: string;
  studentId: string;
  classId: string;
  subjectId?: string;
  conceptName: string;
  canonicalConcept: string;
  masteryState: MasteryState;
  consecutiveCorrectCount: number;
  totalAttempts: number;
  totalCorrect: number;
  lastEvidenceSource: EvidenceSource;
  lastEvidenceConfidence: number;
  lastEvidenceSummary?: string;
  history: MasteryTransition[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentLearningProfile {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  enrolledCourse: string;
  currentSubjectId?: string;
  currentUnitNumber: number;
  currentTopicId?: string;
  currentTopicTitle?: string;
  preferredLanguage: 'english' | 'hinglish' | 'simple_english';
  learningGoals: string[];
  completedTopics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticeAttempt {
  id: string;
  studentId: string;
  classId: string;
  subjectId?: string;
  topicTitle: string;
  conceptName: string;
  questionText: string;
  questionSource: 'generated_from_rag' | 'syllabus_concept_check' | 'curriculum_vault';
  sourceDocTitle?: string;
  sourcePageNumber?: number;
  studentAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  createdAt?: string;
}

export interface AdaptiveExplanationContext {
  studentId: string;
  topicTitle: string;
  masteryState: MasteryState;
  needsPrerequisiteHelp: boolean;
  prerequisiteConcept?: string;
  prerequisitePath?: string;
  styleRecommendation: 'eli9_analogy' | 'advanced_deep_dive' | 'standard_academic';
  preferredLanguage: 'english' | 'hinglish';
  isExplicitOverride: boolean;
  reasoning: string;
}

export interface PersonalizedNextTopicResult {
  topicId: string;
  topicTitle: string;
  unitNumber: number;
  isPrerequisiteRemediation: boolean;
  prerequisiteFor?: string;
  reasoning: string;
  confidence: number;
}
