import fs from 'fs';
import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_CLASSROOM, DEFAULT_LESSONS } from './src/defaultCurriculum.js';
import { Classroom, LessonContent, ClassroomDoubt, Unit, Topic } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Initialize Google GenAI client (Server-Side only)
const rawKey = process.env.GEMINI_API_KEY || '';
const apiKey = (rawKey && !rawKey.includes('MY_GEMINI_API_KEY') && !rawKey.startsWith('your_')) ? rawKey.trim() : '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// In-memory persistent store of classrooms
const classroomsStore: Record<string, Classroom> = {};

import { apiRouter } from './src/server/routes.js';
import { initDailyAutoSyncScheduler } from './src/server/autoSyncService.js';
import {
  isNeonConfigured,
  testNeonConnection,
  getNeonSql,
} from './src/server/db/neonClient.js';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Enable CORS for all origins (e.g. GitHub Pages, WebAPK clients)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount M2028 API Router
  app.use('/api', apiRouter);

  // 1. Get or Create Classroom
  app.get('/api/classroom/:code', (req: Request, res: Response) => {
    const code = (req.params.code || 'BCA-SEM3').toUpperCase().trim();
    if (!classroomsStore[code]) {
      // Create new empty classroom template with this code
      classroomsStore[code] = {
        code,
        name: `Cohort ${code} Classroom`,
        course: 'Computer Applications & Engineering',
        semester: 'Semester III',
        units: [],
        datesheet: [],
        cachedLessons: {},
        doubts: [],
      };
    }
    res.json(classroomsStore[code]);
  });

  // 2. Parse uploaded syllabus
  app.post('/api/syllabus/parse', async (req: Request, res: Response) => {
    try {
      const { classCode, rawText, subjectName } = req.body;
      const code = (classCode || 'BCA-SEM3').toUpperCase().trim();

      if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 10) {
        return res.status(400).json({ error: 'Please provide valid syllabus content (minimum 10 characters).' });
      }

      if (!ai) {
        // Fallback: create structured units from headings or lines
        const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
        const parsedUnits: Unit[] = [];
        let currentUnit: Unit = {
          id: `unit-${Date.now()}-1`,
          number: 1,
          title: `Unit 1: ${subjectName || 'Core Fundamentals'}`,
          topics: [],
        };
        parsedUnits.push(currentUnit);

        lines.slice(0, 12).forEach((line, idx) => {
          const clean = line.replace(/^[-*•\d.]+\s*/, '').trim();
          if (clean.length > 3) {
            currentUnit.topics.push({
              id: `topic-${Date.now()}-${idx}`,
              unitId: currentUnit.id,
              unitTitle: currentUnit.title,
              title: clean,
              difficulty: idx % 3 === 0 ? 'Hard' : idx % 2 === 0 ? 'Medium' : 'Easy',
              examWeightage: idx % 2 === 0 ? 'Must Read (10 Marks)' : 'High',
              prerequisites: ['Basic Theory'],
              estimatedMinutes: 5,
              completed: false,
              masteryScore: 0,
            });
          }
        });

        if (!classroomsStore[code]) {
          classroomsStore[code] = {
            code,
            name: `${subjectName || 'BCA'} Cohort`,
            course: 'Degree Course',
            semester: 'Active Term',
            units: parsedUnits,
            datesheet: [],
            cachedLessons: {},
            doubts: [],
          };
        } else {
          classroomsStore[code].units = parsedUnits;
        }

        return res.json({
          status: 'success',
          source: 'local_parser',
          classroom: classroomsStore[code],
        });
      }

      // Use Gemini 3.8 Flash to parse into structured JSON
      const prompt = `You are an expert University Syllabus Parser for engineering and computer science students.
Parse the following syllabus text into a clean hierarchical JSON array of Units and Topics.

Syllabus Content:
"""
${rawText.slice(0, 15000)}
"""

Target Subject: ${subjectName || 'Computer Science / Engineering'}

STRICT JSON OUTPUT FORMAT (Return JSON only, no markdown ticks, no preamble):
[
  {
    "id": "unit-1",
    "number": 1,
    "title": "Unit 1: Title",
    "topics": [
      {
        "id": "topic-1-1",
        "title": "Clear Concept / Chapter Name",
        "difficulty": "Easy" | "Medium" | "Hard",
        "examWeightage": "Must Read (10 Marks)" | "High" | "Medium",
        "prerequisites": ["Prereq 1", "Prereq 2"],
        "estimatedMinutes": 5
      }
    ]
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const unitsData = JSON.parse(cleanJson);

      const formattedUnits: Unit[] = unitsData.map((u: any, uIdx: number) => {
        const uId = `unit-${Date.now()}-${uIdx + 1}`;
        return {
          id: uId,
          number: u.number || uIdx + 1,
          title: u.title || `Unit ${uIdx + 1}`,
          topics: (u.topics || []).map((t: any, tIdx: number) => ({
            id: `topic-${Date.now()}-${uIdx}-${tIdx}`,
            unitId: uId,
            unitTitle: u.title || `Unit ${uIdx + 1}`,
            title: t.title || `Topic ${tIdx + 1}`,
            difficulty: t.difficulty || 'Medium',
            examWeightage: t.examWeightage || 'High',
            prerequisites: t.prerequisites || ['Foundations'],
            estimatedMinutes: t.estimatedMinutes || 5,
            completed: false,
            masteryScore: 0,
          })),
        };
      });

      if (!classroomsStore[code]) {
        classroomsStore[code] = {
          code,
          name: `${subjectName || 'Syllabus'} Cohort`,
          course: 'University Course',
          semester: 'Active Term',
          units: formattedUnits,
          datesheet: [],
          cachedLessons: {},
          doubts: [],
        };
      } else {
        classroomsStore[code].units = formattedUnits;
      }

      return res.json({
        status: 'success',
        source: 'gemini_ai',
        classroom: classroomsStore[code],
      });
    } catch (err: any) {
      console.error('Error in /api/syllabus/parse:', err);
      res.status(500).json({ error: err.message || 'Failed to parse syllabus.' });
    }
  });

  // 3. Get or Generate Topic Lesson (with shared classroom token cache)
  app.get('/api/lesson/:classCode/:topicId', async (req: Request, res: Response) => {
    try {
      const code = (req.params.classCode || 'BCA-SEM3').toUpperCase().trim();
      const topicId = req.params.topicId;

      const classroom = classroomsStore[code] || classroomsStore['BCA-SEM3'];

      // Check Shared Classroom Cache (0 tokens consumed!)
      if (classroom?.cachedLessons?.[topicId]) {
        return res.json({
          ...classroom.cachedLessons[topicId],
          source: 'cache',
        });
      }

      // Check Neon Cloud Database Cache
      if (isNeonConfigured()) {
        try {
          const sql = getNeonSql();
          if (sql) {
            const rows = await sql`SELECT lesson_json FROM cached_lessons WHERE topic_id = ${topicId} LIMIT 1`;
            if (rows && rows.length > 0 && rows[0].lesson_json) {
              const cached = rows[0].lesson_json;
              classroom.cachedLessons[topicId] = cached;
              return res.json({ ...cached, source: 'neon_cloud_cache' });
            }
          }
        } catch (e) {
          // Gracefully continue to local defaults or AI generation
        }
      }

      // Check default lessons
      if (DEFAULT_LESSONS[topicId]) {
        classroom.cachedLessons[topicId] = DEFAULT_LESSONS[topicId];
        return res.json(DEFAULT_LESSONS[topicId]);
      }

      // Find topic details in classroom
      let foundTopic: Topic | null = null;
      for (const u of classroom.units) {
        const t = u.topics.find((item: any) => item.id === topicId);
        if (t) {
          foundTopic = t;
          break;
        }
      }

      const topicTitle = foundTopic ? foundTopic.title : 'Computer Science Topic';
      const unitTitle = foundTopic ? foundTopic.unitTitle : 'Core Curriculum';

      if (!ai) {
        // High quality offline fallback
        const mockLesson: LessonContent = {
          topicId,
          source: 'curated_offline',
          cachedAt: new Date().toISOString(),
          eli9: {
            hook: `Why do software engineers and examiners care so much about ${topicTitle}?`,
            analogy: `Think of ${topicTitle} like an organized postal sorting office or a kitchen assembly line. Without it, packages pile up and delivery stalls. With it, everything is routed with strict priority and zero confusion!`,
            coreMechanism: `${topicTitle} establishes formal rules and structured memory boundaries to guarantee predictability, speed, and safety in computing systems.`,
            beforeClassTakeaway: `When your professor starts writing equations or code on the blackboard for ${topicTitle}, keep in mind the main objective: avoiding resource deadlock and keeping operations fast.`,
          },
          mnemonic: {
            phrase: `F - A - S - T (Foundation, Allocation, Sequence, Termination)`,
            breakdown: [
              `F: Foundation & data definition`,
              `A: Allocation of memory/resources`,
              `S: Sequence of execution steps`,
              `T: Termination & error boundary conditions`,
            ],
            memoryTip: `Remember: FAST prevents exam errors when writing out the 10-marker answer!`,
          },
          mindmap: {
            mermaid: `graph TD
  A[${topicTitle}] --> B[Intuition & Purpose]
  A --> C[Core Architecture]
  A --> D[Operations & Algorithm]
  A --> E[Exam Pitfalls]
  B --> B1[Solves system bottleneck]
  C --> C1[Data structures & pointers]
  D --> D1[Time Complexity O(1) or O(N)]
  E --> E1[Boundary overflow check]`,
            nodes: [
              {
                id: 'n1',
                label: topicTitle,
                type: 'root',
                children: [
                  { id: 'n2', label: '1. Problem it Solves', type: 'category' },
                  { id: 'n3', label: '2. Formal Architecture', type: 'category' },
                  { id: 'n4', label: '3. University Exam GOTCHAS', type: 'category' },
                ],
              },
            ],
          },
          exam10Marker: {
            definition: `${topicTitle} is a core university syllabus concept that defines the systematic representation, operation, and state transitions within modern computing environments.`,
            architectureDiagramText: `+-------------------------------------------------------+\n|                 CONCEPT ARCHITECTURE                  |\n|       [ Input State ] ---> [ Processing Engine ]       |\n|                                    |                  |\n|                                    v                  |\n|                            [ Verified State ]         |\n+-------------------------------------------------------+`,
            stepByStepMechanism: [
              '1. State Initialization: Set base pointers or parameters.',
              '2. Execution Protocol: Process items according to FIFO/Priority rules.',
              '3. Boundary Enforcement: Prevent overflow and underflow violations.',
              '4. State Cleanup: Release allocated locks and memory structures.',
            ],
            codeOrAlgorithm: `/* Standard Implementation Algorithm for ${topicTitle} */\n// Time Complexity: O(1) average\n// Space Complexity: O(N)\nvoid execute() {\n    // 1. Verify precondition boundary\n    // 2. Perform atomic step\n    // 3. Update status flags\n}`,
            advantagesDisadvantages: {
              advantages: ['High operational efficiency', 'Predictable memory consumption'],
              disadvantages: ['Requires careful pointer and index boundary checks'],
            },
            examinerTraps: [
              'Trap 1: Forgetting boundary edge cases (size == 0 or size == MAX).',
              'Trap 2: Writing generic pseudocode without specifying time complexity.',
            ],
          },
          pyqs: [
            {
              id: `pyq-off-1`,
              type: '2_marks',
              marks: 2,
              question: `Define ${topicTitle} and state its primary use case in university exams.`,
              modelAnswer: `${topicTitle} provides structured data or process organization with predictable bounds and high runtime reliability.`,
              keyPointsForExaminer: ['Precise definition', 'Primary use case', 'Operational complexity'],
            },
            {
              id: `pyq-off-2`,
              type: '10_marks',
              marks: 10,
              question: `Explain the working mechanism of ${topicTitle} with a neat block diagram and working algorithm.`,
              modelAnswer: `Define the concept, draw the architectural state diagram, walk through the step-by-step mechanism with code or algorithm, and detail boundary conditions.`,
              keyPointsForExaminer: ['Neat block diagram', 'Algorithm with comments', 'Time and space complexity'],
            },
          ],
          conceptCheck: {
            question: `What is the primary objective of understanding ${topicTitle} before exam day?`,
            options: [
              'To memorize code without understanding pointer movements',
              'To master both intuition and boundary conditions required for 10-marker questions',
              'To skip drawing block diagrams in the answer sheet',
              'None of the above',
            ],
            correctIndex: 1,
            explanation: 'University examiners grade heavily on both conceptual understanding and precise boundary checks!',
          },
        };

        classroom.cachedLessons[topicId] = mockLesson;
        return res.json(mockLesson);
      }

      // Generate with Gemini 3.8 Flash
      const prompt = `You are a legendary University Computer Science Professor and Pedagogical Master.
Teach the following topic to a student:
Topic: "${topicTitle}"
Unit: "${unitTitle}"

Your task is to generate the ultimate, comprehensive learning pack structured for:
1. 🧒 ELI9 (Explain Like I'm 9) Morning Primer: A 3-minute pre-class read with everyday real-world analogy so they understand the topic intuitively BEFORE walking into college lecture.
2. 🧠 Catchy Mnemonic: Acronym/rhyme with breakdown to never forget in the exam hall.
3. 🗺️ Mindmap: Valid Mermaid.js diagram graph TD string (without markdown ticks), and structured hierarchical node list.
4. 📝 10-Marker University Model Answer: Formatted strictly as examiners want (Definition, ASCII Block Architecture Diagram, Step-by-step mechanism, Working C/Java/Python code or algorithm, Advantages/Disadvantages, and 3 Examiner Gotchas/Traps).
5. 🎯 Previous Year Questions (PYQs): 1 short 2-marker question and 1 comprehensive 10-marker question with step-by-step marking rubrics.
6. 💡 Formative Concept Check: 1 conceptual multiple choice question with 4 options, the correct index (0-3), and detailed diagnostic explanation.

RETURN STRICTLY VALID JSON ONLY (No markdown formatting, no backticks, no comments):
{
  "eli9": {
    "hook": "Compelling question or opening line",
    "analogy": "Everyday analogy (Ferris wheel, sushi belt, traffic light, restaurant kitchen, etc.)",
    "coreMechanism": "Why it works technically in 2 clear sentences",
    "beforeClassTakeaway": "What to listen for when the professor lectures today"
  },
  "mnemonic": {
    "phrase": "e.g. W - R - A - P",
    "breakdown": ["W: ...", "R: ...", "A: ...", "P: ..."],
    "memoryTip": "Quick tip"
  },
  "mindmap": {
    "mermaid": "graph TD\\n  A[...] --> B[...]",
    "nodes": [
      {
        "id": "root",
        "label": "${topicTitle}",
        "type": "root",
        "children": [
          { "id": "c1", "label": "Key Concept 1", "type": "category" }
        ]
      }
    ]
  },
  "exam10Marker": {
    "definition": "Formal rigorous textbook definition",
    "architectureDiagramText": "ASCII art block diagram of the concept architecture",
    "stepByStepMechanism": ["1. ...", "2. ...", "3. ...", "4. ..."],
    "codeOrAlgorithm": "Clean working code or algorithm in C or Python",
    "advantagesDisadvantages": {
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Disadvantage 1", "Disadvantage 2"]
    },
    "examinerTraps": ["Trap 1: ...", "Trap 2: ...", "Trap 3: ..."]
  },
  "pyqs": [
    {
      "id": "pyq-1",
      "type": "2_marks",
      "marks": 2,
      "question": "Question text...",
      "modelAnswer": "Model answer...",
      "keyPointsForExaminer": ["Point 1", "Point 2"]
    },
    {
      "id": "pyq-2",
      "type": "10_marks",
      "marks": 10,
      "question": "Question text...",
      "modelAnswer": "Model answer...",
      "keyPointsForExaminer": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "conceptCheck": {
    "question": "Check-in test question...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this is correct...",
    "openEndedPrompt": "Short open prompt for active recall"
  }
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const raw = aiResponse.text || '';
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const lessonData = JSON.parse(cleanJson);

      const completeLesson: LessonContent = {
        topicId,
        source: 'ai_generated',
        cachedAt: new Date().toISOString(),
        eli9: lessonData.eli9,
        mnemonic: lessonData.mnemonic,
        mindmap: lessonData.mindmap,
        exam10Marker: lessonData.exam10Marker,
        pyqs: lessonData.pyqs,
        conceptCheck: lessonData.conceptCheck,
      };

      // Store in classroom cache! Zero future tokens for all classmates!
      classroom.cachedLessons[topicId] = completeLesson;

      // Persist to Neon PostgreSQL
      if (isNeonConfigured()) {
        try {
          const sql = getNeonSql();
          if (sql) {
            sql`
              INSERT INTO cached_lessons (topic_id, class_code, lesson_json)
              VALUES (${topicId}, ${code}, ${JSON.stringify(completeLesson)}::jsonb)
              ON CONFLICT (topic_id) DO UPDATE SET lesson_json = ${JSON.stringify(completeLesson)}::jsonb
            `.catch((e: any) => console.error('[Neon lesson cache error]:', e));
          }
        } catch (e) {
          // ignore
        }
      }

      return res.json(completeLesson);
    } catch (err: any) {
      console.error('Error generating lesson:', err);
      res.status(500).json({ error: err.message || 'Failed to generate lesson content.' });
    }
  });

  // 4. Ask a Doubt & Pin to Shared Classroom Board
  app.post('/api/doubts/ask', async (req: Request, res: Response) => {
    try {
      const { classCode, topicId, studentName, question, topicTitle } = req.body;
      const code = (classCode || 'BCA-SEM3').toUpperCase().trim();
      const classroom = classroomsStore[code] || classroomsStore['BCA-SEM3'];

      if (!question || question.trim().length < 4) {
        return res.status(400).json({ error: 'Please enter a clear question.' });
      }

      let answer = '';
      if (!ai) {
        answer = `Great question on ${topicTitle || 'this topic'}! In university examinations, always focus on how state transitions and memory pointers behave. Make sure to draw a small diagram showing the boundary case when this occurs.`;
      } else {
        const prompt = `A college student asked this doubt about the topic "${topicTitle || 'Computer Science'}":
"${question}"

Provide a crisp, intuitive, and accurate answer (under 120 words).
1. Explain the "why" simply with zero confusion.
2. Highlight the university exam perspective or practical software context.`;

        const resp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        answer = resp.text?.trim() || 'No answer generated.';
      }

      const newDoubt: ClassroomDoubt = {
        id: `doubt-${Date.now()}`,
        topicId: topicId || 'general',
        studentName: studentName || 'Classmate',
        question: question.trim(),
        answer,
        createdAt: 'Just now',
        upvotes: 1,
      };

      classroom.doubts.unshift(newDoubt);

      // Persist to Neon PostgreSQL
      if (isNeonConfigured()) {
        try {
          const sql = getNeonSql();
          if (sql) {
            sql`
              INSERT INTO classroom_doubts (id, class_code, topic_id, student_name, question, answer, upvotes)
              VALUES (${newDoubt.id}, ${code}, ${newDoubt.topicId}, ${newDoubt.studentName}, ${newDoubt.question}, ${newDoubt.answer}, ${newDoubt.upvotes})
              ON CONFLICT (id) DO NOTHING
            `.catch((e: any) => console.error('[Neon doubt sync error]:', e));
          }
        } catch (e) {
          // ignore
        }
      }

      res.json(newDoubt);
    } catch (err: any) {
      console.error('Error answering doubt:', err);
      res.status(500).json({ error: err.message || 'Failed to submit doubt.' });
    }
  });

  // 5. Evaluate Quiz Answer (Formative assessment & error diagnosis)
  app.post('/api/quiz/evaluate', async (req: Request, res: Response) => {
    try {
      const { topicTitle, question, studentAnswer, correctOption, isOption } = req.body;

      if (isOption) {
        // Simple option comparison
        const passed = studentAnswer === correctOption;
        return res.json({
          score: passed ? 10 : 0,
          passed,
          feedback: passed
            ? 'Spot on! You nailed the core concept and avoided the examiner trap.'
            : 'Not quite. Check the explanation to see why the boundary condition matters.',
          misconceptions: passed ? [] : ['Review the modulo formula and boundary pointer checks.'],
        });
      }

      // Open-ended student answer evaluation
      if (!studentAnswer || studentAnswer.trim().length < 5) {
        return res.status(400).json({ error: 'Please provide your explanation.' });
      }

      if (!ai) {
        const passed = studentAnswer.length > 25;
        return res.json({
          score: passed ? 8 : 4,
          passed,
          feedback: passed
            ? 'Good conceptual attempt. You captured the primary purpose.'
            : 'A bit brief. Make sure to mention the mathematical wrap-around mechanism.',
          misconceptions: passed ? [] : ['Remember to mention what happens to memory space.'],
        });
      }

      const prompt = `You are a strict but encouraging University Exam Evaluator.
Topic: "${topicTitle}"
Prompt Question: "${question}"
Student's Typed Answer: "${studentAnswer}"

Evaluate the answer. Return STRICT JSON only:
{
  "score": number from 0 to 10,
  "passed": boolean (true if score >= 6),
  "feedback": "2-3 sentences diagnosing exact strengths and gaps",
  "misconceptions": ["Misconception 1 if any", "Misconception 2 if any"]
}`;

      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const cleanJson = (resp.text || '').replace(/```json/gi, '').replace(/```/gi, '').trim();
      const evalResult = JSON.parse(cleanJson);
      res.json(evalResult);
    } catch (err: any) {
      console.error('Error evaluating answer:', err);
      res.status(500).json({ error: err.message || 'Failed to evaluate quiz.' });
    }
  });

  // 6. Update Datesheet entry
  app.post('/api/datesheet/add', (req: Request, res: Response) => {
    const { classCode, subject, date, paperType } = req.body;
    const code = (classCode || 'BCA-SEM3').toUpperCase().trim();
    const classroom = classroomsStore[code] || classroomsStore['BCA-SEM3'];

    const newEntry = {
      id: `exam-${Date.now()}`,
      subject: subject || 'Subject Paper',
      date: date || new Date().toISOString().slice(0, 10),
      paperType: paperType || 'Theory',
      priority: 'Urgent' as const,
    };

    classroom.datesheet.push(newEntry);
    res.json(classroom.datesheet);
  });

  // Vite Integration
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))
      ? path.resolve(__dirname, 'dist')
      : (fs.existsSync(path.resolve(__dirname, 'docs', 'index.html'))
          ? path.resolve(__dirname, 'docs')
          : path.resolve(__dirname));
    const distIndex = path.resolve(distPath, 'index.html');

    if (!fs.existsSync(distIndex)) {
      console.log('⚡ dist/index.html not found, starting Vite middleware fallback in production...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(
        express.static(distPath, {
          setHeaders: (res, filePath) => {
            if (
              filePath.endsWith('index.html') ||
              filePath.endsWith('sw.js') ||
              filePath.endsWith('registerSW.js') ||
              filePath.endsWith('manifest.json') ||
              filePath.endsWith('manifest.webmanifest')
            ) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
            } else {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          },
        })
      );

      app.get('*', (_req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        try {
          let html = fs.readFileSync(distIndex, 'utf-8');
          html = html.replace(/<title>.*?<\/title>/i, '<title>SyllabusOS</title>');
          html = html.replace(/<meta property="og:title" content=".*?" \/>/i, '<meta property="og:title" content="SyllabusOS" />');
          res.send(html);
        } catch {
          res.sendFile(distIndex);
        }
      });
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SyllabusOS server running on http://0.0.0.0:${PORT}`);
    if (isNeonConfigured()) {
      console.log('⚡ Neon PostgreSQL is configured. Verifying cloud connection...');
      testNeonConnection()
        .then((res) => {
          if (res.ok) {
            console.log(
              `✅ Connected to Neon PostgreSQL database: ${res.database} (${res.tableCount} tables, ${res.latencyMs}ms latency)`
            );
          } else {
            console.warn(`⚠️ Neon connection warning: ${res.message}`);
          }
        })
        .catch(() => {});
    } else {
      console.log(
        'ℹ️ Running with fast in-memory store. (Configure DATABASE_URL in .env to persist to Neon PostgreSQL)'
      );
    }
    initDailyAutoSyncScheduler();
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
