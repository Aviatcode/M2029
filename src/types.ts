export * from './types/index';

// Compatibility types for previous curriculum engine
export interface TopicCompat {
  id: string;
  unitId: string;
  unitTitle?: string;
  title: string;
  order?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examWeightage: 'High' | 'Medium' | 'Low' | 'Must Read (10 Marks)';
  prerequisites?: string[];
  estimatedMinutes: number;
  status?: 'not_started' | 'learning' | 'revised' | 'strong' | 'weak';
  completed?: boolean;
  masteryScore?: number;
  lastRevisedAt?: string;
}

export interface UnitCompat {
  id: string;
  subjectId?: string;
  number: number;
  title: string;
  topics: any[];
}

export interface MindmapNode {
  id: string;
  label: string;
  description?: string;
  type?: 'root' | 'category' | 'detail' | 'example';
  children?: MindmapNode[];
}

export interface LessonContent {
  topicId: string;
  source: 'cache' | 'ai_generated' | 'curated_offline';
  cachedAt?: string;
  eli9: {
    hook: string;
    analogy: string;
    coreMechanism: string;
    beforeClassTakeaway: string;
  };
  mnemonic: {
    phrase: string;
    breakdown: string[];
    memoryTip: string;
  };
  mindmap: {
    mermaid: string;
    nodes: MindmapNode[];
  };
  exam10Marker: {
    definition: string;
    architectureDiagramText: string;
    stepByStepMechanism: string[];
    codeOrAlgorithm: string;
    advantagesDisadvantages: {
      advantages: string[];
      disadvantages: string[];
    };
    examinerTraps: string[];
  };
  pyqs: {
    id: string;
    type: '2_marks' | '5_marks' | '10_marks';
    marks: number;
    question: string;
    modelAnswer: string;
    keyPointsForExaminer: string[];
  }[];
  conceptCheck: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    openEndedPrompt?: string;
  };
}

export interface ClassroomDoubt {
  id: string;
  topicId: string;
  studentName: string;
  question: string;
  answer: string;
  createdAt: string;
  upvotes: number;
}

export interface ExamDateEntry {
  id: string;
  subject: string;
  date: string;
  paperType: 'Theory' | 'Practical';
  priority: 'Urgent' | 'Approaching' | 'Planned';
}

export interface Classroom {
  code: string;
  name: string;
  university?: string;
  course: string;
  semester: string;
  units: any[];
  datesheet: ExamDateEntry[];
  cachedLessons: Record<string, LessonContent>;
  doubts: ClassroomDoubt[];
}
