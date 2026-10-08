import { GoogleGenAI } from '@google/genai';

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateStructuredJson<T>(prompt: string, schemaDescription?: string): Promise<T>;
}

export class GeminiAIProvider implements AIProvider {
  name = 'Google Gemini (gemini-3.8-flash)';
  private ai: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0) {
      this.ai = new GoogleGenAI({ apiKey: key.trim() });
    }
  }

  isAvailable(): boolean {
    return this.ai !== null;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API key is not configured.');
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    return response.text || '';
  }

  async generateStructuredJson<T>(prompt: string, schemaDescription?: string): Promise<T> {
    if (!this.ai) {
      throw new Error('Gemini API key is not configured.');
    }

    const fullPrompt = `${prompt}
${schemaDescription ? `\nStrict Schema:\n${schemaDescription}` : ''}
Return STRICT JSON ONLY. Do NOT wrap in markdown backticks or explanations.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
    });

    const raw = response.text || '{}';
    const cleanJson = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleanJson) as T;
  }
}

export class MockAIProvider implements AIProvider {
  name = 'Offline Academic Knowledge Engine (Zero Token Fallback)';

  isAvailable(): boolean {
    return true;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    // Intelligent heuristic pedagogical fallback
    if (prompt.toLowerCase().includes('hinglish')) {
      return `Dekho bhai, seedhi baat hai! Yeh concept exam ke liye bohot zaroori hai. Simple shabdon mein samjho: jab system mein data ya resources organize karne hote hain, toh hum structured rules follow karte hain taaki koi deadlock ya confusion na ho. Professor ke lecture mein bas inke steps aur boundary conditions dhyan se note karna. 10-marker answer mein definition + flowchart + code zaroor likhna!`;
    }

    if (prompt.toLowerCase().includes('eli9') || prompt.toLowerCase().includes('explain like i\'m 9')) {
      return `Imagine a busy school cafeteria where everyone wants ice cream, but there is only one spoon! If nobody shares, nobody gets dessert. This concept is just the friendly teacher who sets fair turn-by-turn rules so every kid gets their ice cream without fighting or waiting forever!`;
    }

    if (prompt.toLowerCase().includes('exam') || prompt.toLowerCase().includes('10-marker')) {
      return `### Formal Definition (2 Marks)\nA standardized computational mechanism ensuring atomicity, consistency, and structural integrity.\n\n### Architectural Mechanism (3 Marks)\n- State initialization\n- Boundary check execution\n- Resource allocation and cleanup\n\n### Working Algorithm & Syntax (3 Marks)\nO(1) runtime bounds with strict parameter verification.\n\n### Examiner Gotchas (2 Marks)\nAlways handle empty boundaries and index overflow!`;
    }

    return `This is a foundational concept frequently tested in university examinations. It solves critical bottlenecks by introducing formal boundary conditions and predictable resource management. Key exam focus areas include architectural diagrams, time complexity bounds, and real-world failure handling.`;
  }

  async generateStructuredJson<T>(prompt: string, _schemaDescription?: string): Promise<T> {
    if (prompt.toLowerCase().includes('prep') || prompt.toLowerCase().includes('tomorrow')) {
      return {
        step1WhatIsIt: 'A foundational object-oriented and structural paradigm.',
        step2WhyUsed: 'To reuse reliable logic without rewriting code and preventing bugs.',
        step3AnalogyAndExample: 'Like inheriting your family recipe: you keep what works and add your own twist!',
        step4MiniQuiz: [
          {
            question: 'What is the primary benefit of this concept?',
            options: ['Code reusability', 'Slower runtime', 'Increased memory leak', 'None'],
            correctIndex: 0,
            explanation: 'It allows modular extension while preserving baseline functionality.',
          },
        ],
      } as unknown as T;
    }

    if (
      prompt.toLowerCase().includes('course') ||
      prompt.toLowerCase().includes('syllabus') ||
      prompt.toLowerCase().includes('teacher') ||
      prompt.toLowerCase().includes('faculty') ||
      prompt.toLowerCase().includes('instructor')
    ) {
      const lower = prompt.toLowerCase();
      let courseName = 'Database Management Systems';
      let courseCode = 'BCA-302';
      let teacherName = 'Dr. Rajesh Sharma';
      let teacherDesignation = 'Associate Professor & Course Lead';
      let teacherEmail = 'r.sharma@cs.university.edu';
      let teacherOffice = 'Room 402, Block B, Tech Campus';

      if (lower.includes('java')) {
        courseName = 'Java Programming & OOP Paradigm';
        courseCode = 'BCA-301';
        teacherName = 'Prof. Sunita Rao';
        teacherDesignation = 'Professor, Department of Computer Applications';
        teacherEmail = 'sunita.rao@cs.university.edu';
        teacherOffice = 'Room 205, Main Academic Wing';
      } else if (lower.includes('network') || lower.includes('cn')) {
        courseName = 'Computer Networks & Protocols';
        courseCode = 'BCA-305';
        teacherName = 'Dr. Neha Verma';
        teacherDesignation = 'Associate Professor, Networking Systems';
        teacherEmail = 'n.verma@cs.university.edu';
        teacherOffice = 'Room 312, Telecomm Block';
      } else if (lower.includes('os') || lower.includes('operating')) {
        courseName = 'Operating Systems Architecture';
        courseCode = 'BCA-304';
        teacherName = 'Prof. Vikram Malhotra';
        teacherDesignation = 'Senior Lecturer & Lab In-charge';
        teacherEmail = 'v.malhotra@cs.university.edu';
        teacherOffice = 'Room 110, Systems Lab';
      } else if (lower.includes('web')) {
        courseName = 'Full-Stack Web Development';
        courseCode = 'BCA-303';
        teacherName = 'Dr. Amit Trivedi';
        teacherDesignation = 'Assistant Professor, Web Technologies';
        teacherEmail = 'a.trivedi@cs.university.edu';
        teacherOffice = 'Room 418, Tech Innovation Hub';
      }

      // Check if teacher name or email was passed in prompt
      const teacherMatch = prompt.match(/(?:Prof\.|Dr\.|Teacher|Instructor|Faculty)[:\s]+([A-Z][a-zA-Z\s.]+)/i);
      if (teacherMatch && teacherMatch[1]) {
        teacherName = teacherMatch[1].trim();
      }

      return {
        teacherName,
        teacherDesignation,
        teacherEmail,
        teacherOffice,
        courseName,
        courseCode,
        university: 'University School of Information Technology',
        department: 'Department of Computer Science & Applications',
        semester: 'Semester III',
        academicYear: '2026-2027',
        credits: '4.0 Credits (3L + 1T)',
        weeklySchedule: [
          { day: 'Monday', time: '10:00 AM - 11:30 AM', room: 'Lecture Hall 204', type: 'Lecture' },
          { day: 'Wednesday', time: '11:30 AM - 01:00 PM', room: 'Lecture Hall 204', type: 'Lecture' },
          { day: 'Friday', time: '02:00 PM - 04:00 PM', room: 'CS Lab 3', type: 'Practical Lab' },
        ],
        units: [
          {
            unitNumber: 1,
            title: 'Foundations & Data Modeling',
            topics: [
              'Database System Architecture',
              'Three-Schema Architecture',
              'Data Independence',
              'Entity-Relationship (ER) Modeling',
              'Enhanced ER Modeling and Specialization',
            ],
            hours: 9,
            examWeightage: '15 Marks',
          },
          {
            unitNumber: 2,
            title: 'Relational Model & Formal Query Languages',
            topics: [
              'Relational Model Concepts & Constraints',
              'Relational Algebra Operations (Select, Project, Join, Division)',
              'Tuple Relational Calculus & Domain Calculus',
              'SQL-99 Schema Definition & Constraints',
            ],
            hours: 10,
            examWeightage: '20 Marks',
          },
          {
            unitNumber: 3,
            title: 'Relational Database Design & Normalization',
            topics: [
              'Informal Design Guidelines for Relation Schemas',
              'Functional Dependencies (FDs) & Armstrong Axioms',
              'Normal Forms: 1NF, 2NF, 3NF, BCNF',
              'Multi-Valued Dependencies & 4NF, 5NF',
              'Lossless Decomposition & Dependency Preservation',
            ],
            hours: 12,
            examWeightage: '25 Marks',
          },
          {
            unitNumber: 4,
            title: 'Transaction Management & Concurrency Control',
            topics: [
              'ACID Properties of Transactions',
              'Transaction States & Serializability Schedules',
              'Two-Phase Locking (2PL) Protocol',
              'Deadlock Handling, Prevention, and Detection',
              'Log-Based Crash Recovery & Checkpointing',
            ],
            hours: 11,
            examWeightage: '20 Marks',
          },
          {
            unitNumber: 5,
            title: 'Storage, Indexing & Emerging Paradigms',
            topics: [
              'File Organization & Record Buffering',
              'B-Tree and B+ Tree Indexing Structures',
              'Hashing Techniques',
              'NoSQL Datastores & Distributed Architectures',
            ],
            hours: 8,
            examWeightage: '20 Marks',
          },
        ],
        textbooks: [
          {
            title: 'Database System Concepts',
            authors: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
            publisher: 'McGraw-Hill Education',
            edition: '7th International Edition',
          },
          {
            title: 'Fundamentals of Database Systems',
            authors: 'Ramez Elmasri, Shamkant B. Navathe',
            publisher: 'Pearson Education',
            edition: '8th Edition',
          },
          {
            title: 'Database Management Systems',
            authors: 'Raghu Ramakrishnan, Johannes Gehrke',
            publisher: 'McGraw-Hill Higher Education',
            edition: '3rd Edition',
          },
        ],
        evaluationScheme: [
          { component: 'Class Quizzes & Continuous Evaluation', weightage: '15%' },
          { component: 'Mid-Term Examination (Internal)', weightage: '25%' },
          { component: 'Practical Lab Assessment & Project', weightage: '20%' },
          { component: 'University End-Semester Examination', weightage: '40%' },
        ],
      } as unknown as T;
    }

    return {} as unknown as T;
  }
}

export class AIProviderFactory {
  private static instance: AIProvider | null = null;

  static getProvider(): AIProvider {
    if (!this.instance) {
      const gemini = new GeminiAIProvider();
      if (gemini.isAvailable()) {
        this.instance = gemini;
      } else {
        this.instance = new MockAIProvider();
      }
    }
    return this.instance;
  }

  static setProvider(provider: AIProvider): void {
    this.instance = provider;
  }
}
