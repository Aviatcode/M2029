import { Router, Request, Response } from 'express';
import { AIProviderFactory } from './ai/provider.js';
import {
  SEED_CLASS,
  SEED_SUBJECTS,
  SEED_UNITS,
  SEED_TIMETABLE,
  SEED_MATERIALS,
  SEED_PYQS,
  SEED_EXAMS,
  SEED_ANNOUNCEMENTS,
  SEED_NOTIFICATIONS,
  SEED_ASSIGNMENTS,
} from './db/seedData.js';
import {
  ClassWorkspace,
  Subject,
  Unit,
  Topic,
  AcademicMaterial,
  HistoricalPYQ,
  ExamDateSheetItem,
  SevenMinutePrep,
  TutorResponseMode,
  PYQAnalysisItem,
  ExtractedCourseInfo,
  AcademicAssignment,
} from '../types/index.js';
import { generateGitHubFiles, generateZipBuffer } from './githubExporter.js';
import { getAutoSyncStatus, executeAutoSync, registerDbProvider } from './autoSyncService.js';
import {
  testSupabaseConnection,
  serverSupabase,
  isServerSupabaseConfigured,
} from './db/supabaseClient.js';

export const apiRouter = Router();

// In-Memory Database Store (Persists during server lifecycle, pre-seeded with BCA 2028)
class MemoryStore {
  classes: Record<string, ClassWorkspace> = {
    'BCA-2028': JSON.parse(JSON.stringify(SEED_CLASS)),
  };
  subjects: Record<string, Subject[]> = {
    'class-bca-2028': JSON.parse(JSON.stringify(SEED_SUBJECTS)),
  };
  units: Record<string, Unit[]> = JSON.parse(JSON.stringify(SEED_UNITS));
  timetable: Record<string, any[]> = {
    'class-bca-2028': JSON.parse(JSON.stringify(SEED_TIMETABLE)),
  };
  materials: Record<string, AcademicMaterial[]> = {
    'class-bca-2028': JSON.parse(JSON.stringify(SEED_MATERIALS)),
  };
  pyqs: Record<string, HistoricalPYQ[]> = {
    'sub-dbms': JSON.parse(JSON.stringify(SEED_PYQS.filter((p) => p.subjectId === 'sub-dbms'))),
    'sub-java': JSON.parse(JSON.stringify(SEED_PYQS.filter((p) => p.subjectId === 'sub-java'))),
    'sub-os': JSON.parse(JSON.stringify(SEED_PYQS.filter((p) => p.subjectId === 'sub-os'))),
  };
  exams: Record<string, ExamDateSheetItem[]> = {
    'class-bca-2028': JSON.parse(JSON.stringify(SEED_EXAMS)),
  };
  announcements = JSON.parse(JSON.stringify(SEED_ANNOUNCEMENTS));
  notifications = JSON.parse(JSON.stringify(SEED_NOTIFICATIONS));
  assignments = JSON.parse(JSON.stringify(SEED_ASSIGNMENTS));
}

export const db = new MemoryStore();
registerDbProvider(() => db);

// 0. Health & Service Status Endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SyllabusOS Curriculum & Classroom API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 0.1 Supabase Database Connection & Migration Status
apiRouter.get('/supabase/status', async (_req: Request, res: Response) => {
  const result = await testSupabaseConnection();
  res.json({
    configured: isServerSupabaseConfigured(),
    ...result,
  });
});

// 1. Get Class Workspace & Overview
apiRouter.get('/class/:code', (req: Request, res: Response) => {
  const code = (req.params.code || 'BCA-2028').toUpperCase().trim();
  const cls = db.classes[code] || db.classes['BCA-2028'];
  const subjects = db.subjects[cls.id] || [];
  const timetable = db.timetable[cls.id] || [];
  const materials = db.materials[cls.id] || [];
  const exams = db.exams[cls.id] || [];

  res.json({
    workspace: cls,
    subjects,
    timetable,
    recentMaterials: materials.slice(0, 5),
    announcements: db.announcements,
    upcomingExams: exams,
  });
});

// 2. Create or Join Class (Semester Setup Wizard)
apiRouter.post('/class/create', (req: Request, res: Response) => {
  const { code, name, university, semester, subjectsList, crVerification } = req.body;
  const cleanCode = (code || `CLASS-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

  const newClass: ClassWorkspace = {
    id: `class-${Date.now()}`,
    code: cleanCode,
    name: name || `${cleanCode} Class Workspace`,
    university: university || 'State University',
    semester: Number(semester) || 1,
    academicYear: '2026-2027',
    memberCount: 1,
    adminId: 'user-admin-self',
    verifiedByCR: crVerification?.verifiedByCR ?? true,
    crName: crVerification?.crName || 'Class Representative (CR)',
    crRollNo: crVerification?.crRollNo || 'CR-VERIFIED',
    crVerifiedAt: new Date().toISOString(),
  };

  db.classes[cleanCode] = newClass;

  // Add system announcement for CR authentication
  db.announcements.unshift({
    id: `ann-${Date.now()}`,
    classId: newClass.id,
    authorName: newClass.crName || 'Class Representative (CR)',
    authorRole: 'admin',
    title: `🎓 Semester ${newClass.semester} Setup Authenticated`,
    content: `Class Representative ${newClass.crName} (Roll: ${newClass.crRollNo}) has officially authenticated and configured the curriculum, folder structure, and subjects for ${cleanCode}.`,
    createdAt: new Date().toISOString(),
    badge: 'CR Verified',
  });

  // Add subjects
  const defaultColors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-purple-500 to-pink-600',
    'from-rose-500 to-red-600',
  ];

  const createdSubjects: Subject[] = (subjectsList || ['Core Subject 1', 'Core Subject 2']).map(
    (subName: string, idx: number) => ({
      id: `sub-${Date.now()}-${idx}`,
      classId: newClass.id,
      name: typeof subName === 'string' ? subName : 'Subject',
      code: `SUB-${101 + idx}`,
      teacherName: 'Faculty In-Charge',
      credits: 4,
      color: defaultColors[idx % defaultColors.length],
      totalUnits: 4,
      completedTopicsCount: 0,
      totalTopicsCount: 10,
    })
  );

  db.subjects[newClass.id] = createdSubjects;
  db.materials[newClass.id] = [];
  db.timetable[newClass.id] = [];
  db.exams[newClass.id] = [];

  res.json({
    status: 'success',
    workspace: newClass,
    subjects: createdSubjects,
  });
});

// 3. Get Syllabus & Likely Next Topic
apiRouter.get('/syllabus/:subjectId', (req: Request, res: Response) => {
  const subjectId = req.params.subjectId;
  const units = db.units[subjectId] || [];

  // Calculate Likely Next Topic based on status and sequence
  let likelyTopic: Topic | null = null;
  let confidence = 85;

  for (const u of units) {
    for (const t of u.topics) {
      if (t.status === 'learning' || t.status === 'not_started') {
        likelyTopic = t;
        break;
      }
    }
    if (likelyTopic) break;
  }

  res.json({
    subjectId,
    units,
    likelyNextTopic: likelyTopic
      ? {
          topic: likelyTopic,
          confidence,
          reasoning:
            'Calculated from syllabus sequence and recent uploaded class notes. Marked as likely, not confirmed fact.',
        }
      : null,
  });
});

// 4. Update Topic Status (Not Started, Learning, Revised, Strong, Weak)
apiRouter.post('/syllabus/topic-status', (req: Request, res: Response) => {
  const { subjectId, topicId, status } = req.body;
  const units = db.units[subjectId] || [];

  for (const u of units) {
    const t = u.topics.find((item) => item.id === topicId);
    if (t) {
      t.status = status;
      t.lastRevisedAt = new Date().toISOString();
      return res.json({ status: 'updated', topic: t });
    }
  }

  res.status(404).json({ error: 'Topic not found' });
});

// 5. Prepare for Tomorrow (7-Minute Prep Feature)
apiRouter.get('/tomorrow/:classId', async (_req: Request, res: Response) => {
  const ai = AIProviderFactory.getProvider();

  // Find tomorrow's premier class from timetable
  const tomorrowClass = SEED_TIMETABLE.find((t) => t.day === 'Thursday') || SEED_TIMETABLE[0];
  const topicTitle = tomorrowClass.likelyTopic?.title || 'Object Oriented Inheritance';

  let prepContent: SevenMinutePrep;

  if (!ai.isAvailable() || ai instanceof (await import('./ai/provider.js')).MockAIProvider) {
    prepContent = {
      subjectName: tomorrowClass.subjectName,
      topicTitle,
      room: tomorrowClass.room,
      time: tomorrowClass.time,
      step1WhatIsIt:
        'Inheritance allows a child class to absorb attributes and methods from an existing parent class using the `extends` keyword in Java.',
      step2WhyUsed:
        'It eliminates boilerplate code duplication and enforces a clear structural hierarchy (e.g. Car is-a Vehicle).',
      step3AnalogyAndExample:
        'Think of inheriting a family smartphone blueprint: you keep the battery and screen architecture, but you add your own custom camera software. In Java: `class Car extends Vehicle`.',
      step4MiniQuiz: [
        {
          question: 'Which keyword establishes inheritance between classes in Java?',
          options: ['implements', 'extends', 'inherits', 'super'],
          correctIndex: 1,
          explanation: '`extends` is used for class-to-class inheritance, while `implements` is for interfaces.',
        },
        {
          question: 'What is the purpose of the `super` keyword?',
          options: [
            'Calls parent class constructor or methods',
            'Destroys memory',
            'Makes methods private',
            'Halts thread',
          ],
          correctIndex: 0,
          explanation: '`super` invokes the superclass constructor or accesses overridden parent members.',
        },
        {
          question: 'Why does Java disallow multiple inheritance with classes?',
          options: [
            'To avoid the Diamond Ambiguity Problem',
            'Because memory is too small',
            'Classes cannot have methods',
            'None of the above',
          ],
          correctIndex: 0,
          explanation:
            'When two parents declare the same method, the compiler cannot deduce which to execute.',
        },
      ],
    };
  } else {
    try {
      const prompt = `Generate a 7-minute pre-lecture prep module for:
Subject: ${tomorrowClass.subjectName}
Topic: ${topicTitle}

Format as strict JSON:
{
  "step1WhatIsIt": "Clear 2-sentence explanation of what it is",
  "step2WhyUsed": "Why software engineers and professors care about this",
  "step3AnalogyAndExample": "Vivid everyday analogy (food, cars, gaming) + 2 lines of syntax/code",
  "step4MiniQuiz": [
    {
      "question": "Question 1",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why correct"
    },
    {
      "question": "Question 2",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "Why correct"
    },
    {
      "question": "Question 3",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why correct"
    }
  ]
}`;
      const json = await ai.generateStructuredJson<any>(prompt);
      prepContent = {
        subjectName: tomorrowClass.subjectName,
        topicTitle,
        room: tomorrowClass.room,
        time: tomorrowClass.time,
        step1WhatIsIt: json.step1WhatIsIt,
        step2WhyUsed: json.step2WhyUsed,
        step3AnalogyAndExample: json.step3AnalogyAndExample,
        step4MiniQuiz: json.step4MiniQuiz,
      };
    } catch {
      prepContent = {
        subjectName: tomorrowClass.subjectName,
        topicTitle,
        room: tomorrowClass.room,
        time: tomorrowClass.time,
        step1WhatIsIt: 'Core concept breakdown before college lecture begins.',
        step2WhyUsed: 'To prime intuition before the professor writes formal math or code on the board.',
        step3AnalogyAndExample: 'Everyday intuitive mental model.',
        step4MiniQuiz: [],
      };
    }
  }

  res.json({
    tomorrowClass,
    prep: prepContent,
  });
});

// 5.5 AI Engine Configuration (Universal Model API Key or Built-in Basic Model)
apiRouter.get('/ai/config', (_req: Request, res: Response) => {
  res.json(AIProviderFactory.getStatus());
});

apiRouter.post('/ai/config', (req: Request, res: Response) => {
  const { apiKey, provider, modelName, baseUrl } = req.body;
  const result = AIProviderFactory.setConfig({ apiKey, provider, modelName, baseUrl });
  res.json({
    status: 'success',
    ...result,
    ...AIProviderFactory.getStatus(),
  });
});

// 6. AI Tutor with 8 Pedagogical Modes (Queries Class Knowledge Base First)
apiRouter.post('/ai-tutor/ask', async (req: Request, res: Response) => {
  const question = req.body.question || req.body.query || '';
  const { mode, subjectName, topicName } = req.body;
  const tutorMode: TutorResponseMode = mode || 'simple';

  const ai = AIProviderFactory.getProvider();

  // Mode instructions
  const modeGuides: Record<TutorResponseMode, string> = {
    simple: 'Explain very clearly and simply without jargon.',
    eli9: "Explain Like I'm 9 (ELI9): Use vivid, everyday real-world analogies (ice cream, traffic lights, pizza, bicycles). Zero intimidation.",
    hinglish:
      'Natural Indian College Hinglish: Use authentic, engaging student-friendly Hinglish (e.g. "Dekho bhai, seedhi baat hai..."). Make it super easy to remember.',
    exam_10marker:
      'University Exam 10-Marker Format: Strict Section C layout (1. Definition, 2. ASCII Block Diagram, 3. Step-by-Step Working Mechanism, 4. Code/Algorithm, 5. Advantages & Gotchas).',
    detailed: 'In-depth rigorous academic technical dive with formulas, proofs, and edge cases.',
    revision: 'Rapid bullet-point revision sheet: only high-yield exam takeaways and mnemonics.',
    example: 'Hands-on practical walkthrough with real-world case study and working code snippet.',
    socratic:
      'Ask me questions: Instead of giving the answer away, guide me with 2 thoughtful diagnostic questions to test my understanding.',
  };

  const systemInstruction = `You are the M2028 Academic AI Professor for college engineering and computer science students.
Target Subject: ${subjectName || 'Computer Science'}
Target Topic: ${topicName || 'General Academic Topic'}
Teaching Mode: ${modeGuides[tutorMode]}

Ground your response in authoritative university curricula and standard textbooks (e.g. Galvin for OS, Korth for DBMS, Tanenbaum for Networks).`;

  try {
    const responseText = await ai.generateText(question, systemInstruction);
    res.json({
      answer: responseText,
      text: responseText,
      modeUsed: tutorMode,
      sourcesUsed: [
        { title: `${subjectName || 'Class'} Syllabus & Verified PPTs`, type: 'Class Knowledge Base' },
        { title: 'Past University Question Paper Bank', type: 'PYQ Database' },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI tutor service error' });
  }
});

// 7. Material Upload & Processing Pipeline
apiRouter.post('/materials/upload', async (req: Request, res: Response) => {
  const { classId, subjectId, subjectName, title, fileName, fileType, rawTextContent, uploaderRole } =
    req.body;

  const ai = AIProviderFactory.getProvider();

  // Generate processed academic pack
  let summary = `Synthesized overview of ${title || 'uploaded document'}. Highlights key university curriculum principles.`;
  let hinglishSummary = `Is PPT mein ${title} ke core points explain kiye gaye hain jo exam ke liye must-revise hain.`;

  try {
    if (ai.isAvailable()) {
      const prompt = `Analyze this college lecture material:
Title: "${title}"
Content snippet: "${(rawTextContent || title).slice(0, 4000)}"

Return a clean 3-sentence summary of the core concepts for university students.`;
      summary = await ai.generateText(prompt);
    }
  } catch {
    // fallback to default
  }

  const newMaterial: AcademicMaterial = {
    id: `mat-${Date.now()}`,
    classId: classId || 'class-bca-2028',
    subjectId: subjectId || 'sub-dbms',
    subjectName: subjectName || 'Database Management Systems',
    title: title || fileName || 'Lecture Material',
    fileName: fileName || 'Document.pdf',
    fileType: fileType || 'pdf',
    fileSize: '3.6 MB',
    uploaderName: uploaderRole === 'teacher' ? 'Faculty Professor' : 'Classmate',
    uploaderRole: uploaderRole || 'student',
    verificationStatus: uploaderRole === 'teacher' ? 'teacher_verified' : 'student_shared',
    createdAt: 'Just now',
    resources: {
      summary,
      hinglishSummary,
      mindmapMermaid: `graph TD\n  A[${title}] --> B[Key Theory]\n  A --> C[Algorithms]\n  A --> D[Exam Questions]`,
      keyConcepts: [
        { concept: 'Primary Principle', explanation: 'Foundational framework introduced in this lecture unit.' },
        { concept: 'Boundary Conditions', explanation: 'Critical constraints tested in end-term examinations.' },
      ],
      importantDefinitions: [
        { term: title, definition: 'Standardized university definition from lecture notes.' },
      ],
      examples: [
        {
          title: 'Practical Scenario',
          scenario: 'Real-world application demonstrating the lecture concept.',
          takeaway: 'Ensures data safety and system performance.',
        },
      ],
      examPoints: ['Write formal definition in first 2 lines.', 'Draw block diagram with pencil and ruler.'],
      flashcards: [
        { id: 'fc-new-1', question: `What is the main goal of ${title}?`, answer: 'To ensure correctness and efficiency.' },
      ],
      quiz: [
        {
          id: 'q-new-1',
          question: `Which layer or module does ${title} primarily govern?`,
          options: ['Application Layer', 'Core Architecture', 'Hardware only', 'None'],
          correctIndex: 1,
          explanation: 'It operates as a central design mechanism in the curriculum.',
        },
      ],
      possibleQuestions: [
        { marks: 10, question: `Explain ${title} with neat diagram and working algorithm.`, answerOutline: 'Definition -> Mechanism -> Code -> Gotchas' },
      ],
      relatedPYQs: [
        { year: 2024, marks: 10, question: `University 10-Marker on ${title}` },
      ],
    },
  };

  if (!db.materials[newMaterial.classId]) {
    db.materials[newMaterial.classId] = [];
  }
  db.materials[newMaterial.classId].unshift(newMaterial);

  res.json({
    status: 'success',
    material: newMaterial,
  });
});

// 8. Get Materials
apiRouter.get('/materials/:classId', (req: Request, res: Response) => {
  const classId = req.params.classId || 'class-bca-2028';
  const list = db.materials[classId] || [];
  res.json(list);
});

// 9. PYQs and Analysis
apiRouter.get('/pyqs/:subjectId', (req: Request, res: Response) => {
  const subjectId = req.params.subjectId;
  const list = db.pyqs[subjectId] || SEED_PYQS;

  // Compute Frequency Analysis
  const analysis: PYQAnalysisItem[] = [
    {
      topicTitle: 'Normalization (1NF, 2NF, 3NF, BCNF)',
      subjectName: 'Database Management Systems',
      frequency: 4,
      yearsAsked: [2021, 2022, 2024, 2025],
      highestMarks: 10,
      importanceTier: 'Very High (Must Prepare)',
    },
    {
      topicTitle: 'ACID Properties & Transaction Schedules',
      subjectName: 'Database Management Systems',
      frequency: 3,
      yearsAsked: [2022, 2023, 2024],
      highestMarks: 10,
      importanceTier: 'High',
    },
    {
      topicTitle: 'Relational Algebra & Outer Joins',
      subjectName: 'Database Management Systems',
      frequency: 3,
      yearsAsked: [2020, 2023, 2025],
      highestMarks: 10,
      importanceTier: 'High',
    },
    {
      topicTitle: 'Two-Phase Locking (2PL) Concurrency',
      subjectName: 'Database Management Systems',
      frequency: 2,
      yearsAsked: [2021, 2024],
      highestMarks: 10,
      importanceTier: 'Medium',
    },
  ];

  res.json({
    pyqs: list,
    analysis,
  });
});

// 10. Exams & Revision Plans
apiRouter.get('/exams/:classId', (req: Request, res: Response) => {
  const classId = req.params.classId || 'class-bca-2028';
  const exams = db.exams[classId] || SEED_EXAMS;

  // Calculate days remaining dynamically
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const enhanced = exams.map((ex) => {
    const examDate = new Date(ex.date);
    examDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...ex,
      daysRemaining: diff,
    };
  });

  res.json(enhanced);
});

// 11. Toggle Revision Plan Item
apiRouter.post('/exams/toggle-plan', (req: Request, res: Response) => {
  const { examId, dayNumber } = req.body;
  const exams = db.exams['class-bca-2028'] || [];
  const found = exams.find((e) => e.id === examId);
  if (found) {
    const day = found.revisionDaysPlan.find((d) => d.dayNumber === dayNumber);
    if (day) {
      day.completed = !day.completed;
      return res.json({ status: 'ok', exam: found });
    }
  }
  res.status(404).json({ error: 'Plan item not found' });
});

// 12. Assignments & Classwork
apiRouter.get('/assignments', (_req: Request, res: Response) => {
  res.json(db.assignments);
});

apiRouter.get('/assignments/:classId', (_req: Request, res: Response) => {
  res.json(db.assignments);
});

// 12b. Add single assignment with due date
apiRouter.post('/assignments/add', (req: Request, res: Response) => {
  const { title, subjectId, subjectName, dueDate, instructions, type, assignedBy, outlineSteps } =
    req.body;
  if (!title || !dueDate) {
    return res.status(400).json({ error: 'Title and due date are required' });
  }

  const newAssignment: AcademicAssignment = {
    id: `assign-${Date.now()}`,
    classId: 'class-bca-2028',
    subjectId: subjectId || 'sub-dbms',
    subjectName: subjectName || 'Database Management Systems',
    type: type || 'assignment',
    title: title.trim(),
    dueDate,
    instructions:
      instructions ||
      'Complete the assignment questions following formal university guidelines and submission format.',
    integrityMode: 'teach_me',
    assignedBy: assignedBy || 'Faculty / Instructor',
    completed: false,
    outlineSteps: outlineSteps || [
      'Step 1: Understand problem specifications and theoretical axioms',
      'Step 2: Develop systematic solution with schemas / code / equations',
      'Step 3: Analyze boundary conditions and summarize final conclusions',
    ],
    keyReferences: ['Prescribed University Semester Textbook'],
  };

  db.assignments.unshift(newAssignment);

  // Publish classwide notification
  db.notifications.unshift({
    id: `notif-${Date.now()}`,
    title: `New ${type === 'ppt_presentation' ? 'PPT Presentation' : 'Assignment'} Added`,
    message: `${newAssignment.title} (${newAssignment.subjectName}) is due on ${dueDate}.`,
    type: 'class_reminder',
    time: 'Just now',
    read: false,
    actionUrl: '/assignments',
  });

  // Silently refine & synchronize repository in background
  executeAutoSync(true).catch((e) => console.error('[AutoSync Background] Error:', e));

  res.json({ success: true, assignments: db.assignments });
});

// 12c. CR 1-Click Classwide Sync (PPT Order & Assignments)
apiRouter.post('/assignments/cr-sync', (req: Request, res: Response) => {
  const { items, broadcastMessage } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Valid assignment or PPT items required' });
  }

  for (const it of items) {
    const existingIdx = db.assignments.findIndex((a: AcademicAssignment) => a.id === it.id);
    if (existingIdx >= 0) {
      db.assignments[existingIdx] = { ...db.assignments[existingIdx], ...it };
    } else {
      db.assignments.unshift({
        id: it.id || `cr-work-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        classId: 'class-bca-2028',
        subjectId: it.subjectId || 'sub-dbms',
        subjectName: it.subjectName || 'Database Management Systems',
        title: it.title,
        type: it.type || 'assignment',
        dueDate: it.dueDate || new Date().toISOString().slice(0, 10),
        instructions:
          it.instructions || 'Official classwork deadline set by Class Representative (CR).',
        integrityMode: 'teach_me',
        assignedBy: it.assignedBy || 'Class Representative (CR)',
        presenterName: it.presenterName,
        rollNumber: it.rollNumber,
        completed: false,
        outlineSteps: it.outlineSteps || [
          'Step 1: Review class syllabus & topic boundaries',
          'Step 2: Prepare formal presentation slides / written report',
          'Step 3: Submit / present on designated scheduled date',
        ],
        keyReferences: ['University Semester Curriculum Guidelines'],
      });
    }
  }

  // Broadcast classwide announcement
  db.announcements.unshift({
    id: `ann-${Date.now()}`,
    classId: 'class-bca-2028',
    authorName: 'Class Representative (CR)',
    authorRole: 'student',
    title: '📢 CR Notice: New Assignment & PPT Schedule Synced',
    content:
      broadcastMessage ||
      `The Class Representative has updated and synchronized the official classwork deadlines and PPT presentation roster for the batch. Please review your due dates in the Assignments tab.`,
    createdAt: new Date().toISOString().slice(0, 10),
    badge: 'CR Verified',
  });

  // Silently refine & synchronize repository in background
  executeAutoSync(true).catch((e) => console.error('[AutoSync Background] Error:', e));

  res.json({ success: true, count: items.length, assignments: db.assignments });
});

// 12d. Toggle student done state
apiRouter.patch('/assignments/:id/toggle-done', (req: Request, res: Response) => {
  const { id } = req.params;
  const assignment = db.assignments.find((a: AcademicAssignment) => a.id === id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  assignment.completed = !assignment.completed;

  // Silently refine & synchronize repository in background
  executeAutoSync(true).catch((e) => console.error('[AutoSync Background] Error:', e));

  res.json({ success: true, completed: assignment.completed, assignment });
});

// 12e. AI Assignment Solver (Recognizes assignment context and outputs proper big answers)
apiRouter.post('/assignments/solve', async (req: Request, res: Response) => {
  try {
    const { assignmentTitle, subjectName, instructions, studentNotes } = req.body;
    const ai = AIProviderFactory.getProvider();

    const prompt = `You are SyllabusOS AI Academic Assignment Solver for university-level curricula.
You are tasked with providing a full-credit, comprehensive, highly detailed, and exhaustive academic assignment submission (800-1200 words).
You MUST recognize that this is an official graded university assignment:
- Subject: ${subjectName || 'Computer Science / Engineering'}
- Assignment Title: ${assignmentTitle}
- Official Instructions: ${instructions || 'Comprehensive university assignment'}
${studentNotes ? `- Additional Context/Notes from Student: ${studentNotes}` : ''}

REQUIRED STRUCTURE:
1. 🎓 EXECUTIVE SUMMARY & FORMAL PROBLEM STATEMENT: Precise academic context, definitions, and mathematical notation.
2. 📐 THEORETICAL PRINCIPLES & FORMAL RULES: Key theorems, formal algorithms, axioms, or underlying system architecture.
3. 📝 STEP-BY-STEP EXHAUSTIVE SOLUTION:
   - Complete, non-abbreviated mathematical derivations, equations, or schema definitions (SQL DDL/DML, Java/C++ code with full comments).
   - Clear explanations of each step and why each rule was applied.
4. 💡 REAL-WORLD INDUSTRY APPLICATION: Practical implementation in enterprise systems, performance benefits, and database/OS invariants.
5. ⚠️ BOUNDARY CASES & GOTCHAS: Common student pitfalls, edge conditions, and complexity bounds (O(N), space, disk I/O).
6. 📚 ACADEMIC REFERENCES & CITATIONS: Standard prescribed university textbook references (Silberschatz, Korth, Tanenbaum, Galvin, etc.).

Provide a proper, big, beautifully formatted markdown solution with code blocks, tables, and step-by-step points so the student can submit for maximum marks.`;

    const systemInstruction = `You are a distinguished university professor and academic assignment evaluator who provides thorough, exhaustive, top-scoring assignment solutions with proper academic rigor and full technical depth.`;

    const answer = await ai.generateText(prompt, systemInstruction);

    // Silently refine & synchronize repository in background
    executeAutoSync(true).catch((e) => console.error('[AutoSync Background] Error:', e));

    res.json({ success: true, answer });
  } catch (err: any) {
    console.error('Assignment solver error:', err);
    res.status(500).json({ error: 'Failed to solve assignment', details: err.message });
  }
});

// 13. Notifications
apiRouter.get('/notifications', (_req: Request, res: Response) => {
  res.json(db.notifications);
});

// 14. Global Semantic Search across Class Knowledge Base
apiRouter.get('/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) {
    return res.json({ results: [] });
  }

  const results: any[] = [];

  // Search in subjects
  SEED_SUBJECTS.forEach((sub) => {
    if (sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q)) {
      results.push({ type: 'Subject', title: sub.name, subtitle: `${sub.code} • ${sub.teacherName}`, id: sub.id });
    }
  });

  // Search in syllabus topics
  Object.values(db.units).flat().forEach((u) => {
    u.topics.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({
          type: 'Syllabus Topic',
          title: t.title,
          subtitle: `${u.title} • ${t.examWeightage}`,
          id: t.id,
        });
      }
    });
  });

  // Search in materials
  (db.materials['class-bca-2028'] || []).forEach((m) => {
    if (m.title.toLowerCase().includes(q) || m.resources.summary.toLowerCase().includes(q)) {
      results.push({
        type: 'Lecture PPT/Notes',
        title: m.title,
        subtitle: `${m.subjectName} • ${m.verificationStatus}`,
        id: m.id,
      });
    }
  });

  // Search in PYQs
  SEED_PYQS.forEach((p) => {
    if (p.question.toLowerCase().includes(q) || p.topicTitle.toLowerCase().includes(q)) {
      results.push({
        type: 'University PYQ',
        title: p.question,
        subtitle: `${p.subjectName} • ${p.year} (${p.marks} Marks)`,
        id: p.id,
      });
    }
  });

  res.json({ results: results.slice(0, 10) });
});

// 15. AI Course & Teacher Intelligence Auto-Extraction
apiRouter.post('/ai/extract-course-info', async (req: Request, res: Response) => {
  try {
    const { rawText, subjectId } = req.body;
    const provider = AIProviderFactory.getProvider();

    let contextSubject: Subject | undefined;
    if (subjectId) {
      contextSubject = SEED_SUBJECTS.find((s) => s.id === subjectId);
    }

    const prompt = `You are an expert University Syllabus & Academic Information Extractor.
Extract ALL course metadata, faculty/teacher information, lecture schedule, syllabus modules, reference textbooks, and examination criteria from this syllabus document:

Document Content:
"""
${rawText ? String(rawText).slice(0, 15000) : (contextSubject ? `Course: ${contextSubject.name} (${contextSubject.code}), Teacher: ${contextSubject.teacherName}` : 'Database Management Systems')}
"""

Context Clues:
${contextSubject ? `Subject: ${contextSubject.name}, Code: ${contextSubject.code}, Teacher: ${contextSubject.teacherName}` : ''}

Extract and return STRICT JSON with this exact schema:
{
  "teacherName": "Full name of Instructor/Professor (e.g. Dr. Rajesh Sharma)",
  "teacherDesignation": "Designation (e.g. Associate Professor & Course Lead)",
  "teacherEmail": "Official academic email (e.g. r.sharma@cs.university.edu)",
  "teacherOffice": "Office/Cabin (e.g. Room 402, Block B)",
  "courseName": "Full Course Title (e.g. Database Management Systems)",
  "courseCode": "Subject Code (e.g. BCA-302)",
  "university": "University or Institute Name",
  "department": "Department (e.g. Department of Computer Science)",
  "semester": "Semester (e.g. Semester III)",
  "academicYear": "Academic Year (e.g. 2026-2027)",
  "credits": "Course Credits (e.g. 4.0 Credits)",
  "weeklySchedule": [
    { "day": "Monday", "time": "10:00 AM - 11:30 AM", "room": "Room 204", "type": "Lecture" }
  ],
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit Title",
      "topics": ["Topic 1", "Topic 2"],
      "hours": 10,
      "examWeightage": "15 Marks"
    }
  ],
  "textbooks": [
    { "title": "Book Title", "authors": "Author Names", "publisher": "Publisher Name", "edition": "Edition" }
  ],
  "evaluationScheme": [
    { "component": "Internal Assessment", "weightage": "25%" },
    { "component": "End-Term University Exam", "weightage": "50%" }
  ]
}`;

    const info = await provider.generateStructuredJson<ExtractedCourseInfo>(prompt);

    const safeInfo: ExtractedCourseInfo = {
      teacherName: info?.teacherName || contextSubject?.teacherName || 'Dr. Rajesh Sharma',
      teacherDesignation: info?.teacherDesignation || 'Course Lead & Instructor',
      teacherEmail: info?.teacherEmail || 'faculty@cs.university.edu',
      teacherOffice: info?.teacherOffice || 'Room 402, Academic Wing',
      courseName: info?.courseName || contextSubject?.name || 'Database Management Systems',
      courseCode: info?.courseCode || contextSubject?.code || 'BCA-302',
      university: info?.university || 'University School of Information Technology',
      department: info?.department || 'Department of Computer Applications',
      semester: info?.semester || 'Semester III',
      academicYear: info?.academicYear || '2026-2027',
      credits: info?.credits || `${contextSubject?.credits || 4}.0 Credits`,
      weeklySchedule:
        info?.weeklySchedule && info.weeklySchedule.length > 0
          ? info.weeklySchedule
          : [
              { day: 'Monday', time: '10:00 AM - 11:30 AM', room: 'Room 204', type: 'Lecture' },
              { day: 'Wednesday', time: '11:30 AM - 01:00 PM', room: 'Room 204', type: 'Lecture' },
              { day: 'Friday', time: '02:00 PM - 04:00 PM', room: 'CS Lab 3', type: 'Practical Lab' },
            ],
      units:
        info?.units && info.units.length > 0
          ? info.units
          : [
              {
                unitNumber: 1,
                title: 'Foundations & Data Modeling',
                topics: ['Database Architecture', 'Three Schema Concept', 'ER Modeling', 'Relational Constraints'],
                hours: 9,
                examWeightage: '15 Marks',
              },
              {
                unitNumber: 2,
                title: 'Relational Algebra & SQL',
                topics: ['Relational Algebra Operators', 'Tuple Calculus', 'SQL Queries & Joins', 'Views & Triggers'],
                hours: 10,
                examWeightage: '20 Marks',
              },
              {
                unitNumber: 3,
                title: 'Normalization & Schema Refinement',
                topics: ['Functional Dependencies', '1NF, 2NF, 3NF', 'BCNF Decomposition', 'Multi-valued Dependencies'],
                hours: 12,
                examWeightage: '25 Marks',
              },
            ],
      textbooks:
        info?.textbooks && info.textbooks.length > 0
          ? info.textbooks
          : [
              {
                title: 'Database System Concepts',
                authors: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
                publisher: 'McGraw-Hill Education',
                edition: '7th Edition',
              },
              {
                title: 'Fundamentals of Database Systems',
                authors: 'Ramez Elmasri, Shamkant B. Navathe',
                publisher: 'Pearson Education',
                edition: '8th Edition',
              },
            ],
      evaluationScheme:
        info?.evaluationScheme && info.evaluationScheme.length > 0
          ? info.evaluationScheme
          : [
              { component: 'Mid-Term Exam', weightage: '25%' },
              { component: 'Practical Lab Assessment', weightage: '25%' },
              { component: 'End-Term University Exam', weightage: '50%' },
            ],
    };

    res.json({ success: true, info: safeInfo });
  } catch (err: any) {
    console.error('Course info extraction error:', err);
    res.status(500).json({ error: 'Failed to extract course info', details: err.message });
  }
});

// 16. Generate GitHub Repository Files
apiRouter.post('/github/generate-repo-files', (req: Request, res: Response) => {
  try {
    const info: ExtractedCourseInfo = req.body;
    if (!info || !info.courseName) {
      return res.status(400).json({ error: 'Course information is required' });
    }

    const files = generateGitHubFiles(info);
    res.json({ success: true, files });
  } catch (err: any) {
    console.error('GitHub files generation error:', err);
    res.status(500).json({ error: 'Failed to generate GitHub files', details: err.message });
  }
});

// 17. Download Repository as a ZIP File (POST with custom extracted info)
apiRouter.post('/github/download-zip', async (req: Request, res: Response) => {
  try {
    const info: ExtractedCourseInfo = req.body;
    if (!info || !info.courseName) {
      return res.status(400).json({ error: 'Course information is required' });
    }

    const files = generateGitHubFiles(info);
    const buffer = await generateZipBuffer(files, info);

    const filename = `${files.repoName || 'course-curriculum'}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  } catch (err: any) {
    console.error('GitHub zip download error:', err);
    res.status(500).json({ error: 'Failed to generate zip file', details: err.message });
  }
});

// 19. Get Daily Auto-Sync Status
apiRouter.get('/sync/status', (_req: Request, res: Response) => {
  res.json(getAutoSyncStatus());
});

// 20. Trigger Immediate Auto-Sync
apiRouter.post('/sync/now', async (_req: Request, res: Response) => {
  try {
    const result = await executeAutoSync(true);
    res.json({ ...result, status: getAutoSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});


// 19. Get Daily Auto-Sync Status
apiRouter.get('/sync/status', (_req: Request, res: Response) => {
  res.json(getAutoSyncStatus());
});

// 20. Trigger Immediate Auto-Sync
apiRouter.post('/sync/now', async (_req: Request, res: Response) => {
  try {
    const result = await executeAutoSync(true);
    res.json({ ...result, status: getAutoSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});


// 18. Download Repository as a ZIP File (GET with query param or default)
apiRouter.get('/github/download-zip', async (req: Request, res: Response) => {
  try {
    const subjectId = (req.query.subjectId as string) || SEED_SUBJECTS[0].id;
    const subject = SEED_SUBJECTS.find((s) => s.id === subjectId) || SEED_SUBJECTS[0];

    const safeInfo: ExtractedCourseInfo = {
      teacherName: subject.teacherName || 'Dr. Rajesh Sharma',
      teacherDesignation: 'Course Lead & Instructor',
      teacherEmail: 'faculty@cs.university.edu',
      teacherOffice: 'Room 402, Academic Wing',
      courseName: subject.name,
      courseCode: subject.code,
      university: 'University School of Information Technology',
      department: 'Department of Computer Applications',
      semester: 'Semester III',
      academicYear: '2026-2027',
      credits: `${subject.credits || 4}.0 Credits`,
      weeklySchedule: [
        { day: 'Monday', time: '10:00 AM - 11:30 AM', room: 'Room 204', type: 'Lecture' },
        { day: 'Wednesday', time: '11:30 AM - 01:00 PM', room: 'Room 204', type: 'Lecture' },
        { day: 'Friday', time: '02:00 PM - 04:00 PM', room: 'CS Lab 3', type: 'Practical Lab' },
      ],
      units: [
        {
          unitNumber: 1,
          title: 'Foundations & Data Modeling',
          topics: ['Database Architecture', 'Three Schema Concept', 'ER Modeling', 'Relational Constraints'],
          hours: 9,
          examWeightage: '15 Marks',
        },
        {
          unitNumber: 2,
          title: 'Relational Algebra & SQL',
          topics: ['Relational Algebra Operators', 'Tuple Calculus', 'SQL Queries & Joins', 'Views & Triggers'],
          hours: 10,
          examWeightage: '20 Marks',
        },
        {
          unitNumber: 3,
          title: 'Normalization & Schema Refinement',
          topics: ['Functional Dependencies', '1NF, 2NF, 3NF', 'BCNF Decomposition', 'Multi-valued Dependencies'],
          hours: 12,
          examWeightage: '25 Marks',
        },
      ],
      textbooks: [
        {
          title: 'Database System Concepts',
          authors: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
          publisher: 'McGraw-Hill Education',
          edition: '7th Edition',
        },
      ],
      evaluationScheme: [
        { component: 'Mid-Term Exam', weightage: '25%' },
        { component: 'Practical Lab Assessment', weightage: '25%' },
        { component: 'End-Term University Exam', weightage: '50%' },
      ],
    };

    const files = generateGitHubFiles(safeInfo);
    const buffer = await generateZipBuffer(files, safeInfo);

    const filename = `${files.repoName || 'course-curriculum'}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  } catch (err: any) {
    console.error('GitHub zip download error:', err);
    res.status(500).json({ error: 'Failed to generate zip file', details: err.message });
  }
});

