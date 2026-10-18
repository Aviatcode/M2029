import { GoogleGenAI } from '@google/genai';

export type ModelProviderType =
  | 'auto'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'custom'
  | 'sandbox'
  | 'basic';

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateStructuredJson<T>(prompt: string, schemaDescription?: string): Promise<T>;
}

export interface UniversalKeyConfig {
  apiKey?: string;
  provider?: ModelProviderType;
  modelName?: string;
  baseUrl?: string;
}

export class UniversalAIProvider implements AIProvider {
  name: string;
  public apiKey: string;
  public provider: ModelProviderType;
  public modelName: string;
  public baseUrl: string;
  private geminiClient: GoogleGenAI | null = null;

  constructor(config: UniversalKeyConfig) {
    this.apiKey = (config.apiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    this.baseUrl = (config.baseUrl || '').trim();
    this.provider = config.provider || 'auto';

    // Auto-detect provider if auto
    if (this.provider === 'auto') {
      if (this.apiKey.startsWith('sk-ant-')) {
        this.provider = 'claude';
      } else if (this.apiKey.startsWith('AIzaSy')) {
        this.provider = 'gemini';
      } else if (this.apiKey.startsWith('gsk_')) {
        this.provider = 'groq';
      } else if (this.apiKey.startsWith('sk-or-')) {
        this.provider = 'openrouter';
      } else if (this.apiKey.startsWith('sk-') && (this.baseUrl.includes('deepseek') || this.apiKey.length === 35)) {
        this.provider = 'deepseek';
      } else if (this.apiKey.startsWith('sk-')) {
        this.provider = 'openai';
      } else if (this.baseUrl.length > 0) {
        this.provider = 'custom';
      } else if (this.apiKey.includes('TEST') || this.apiKey.includes('DEMO') || this.apiKey.includes('SANDBOX')) {
        this.provider = 'sandbox';
      } else {
        this.provider = 'basic';
      }
    }

    // Default models based on provider
    if (config.modelName && config.modelName.trim().length > 0) {
      this.modelName = config.modelName.trim();
    } else {
      switch (this.provider) {
        case 'openai':
          this.modelName = 'gpt-4o-mini';
          break;
        case 'claude':
          this.modelName = 'claude-3-5-sonnet-20241022';
          break;
        case 'deepseek':
          this.modelName = 'deepseek-chat';
          break;
        case 'groq':
          this.modelName = 'llama-3.3-70b-versatile';
          break;
        case 'openrouter':
          this.modelName = 'deepseek/deepseek-r1';
          break;
        case 'gemini':
          this.modelName = 'gemini-2.5-flash';
          break;
        case 'custom':
          this.modelName = 'llama3:latest';
          break;
        default:
          this.modelName = 'built-in-academic';
      }
    }

    const providerDisplayNames: Record<string, string> = {
      openai: `OpenAI (${this.modelName})`,
      claude: `Anthropic Claude (${this.modelName})`,
      deepseek: `DeepSeek AI (${this.modelName})`,
      groq: `Groq Cloud (${this.modelName})`,
      openrouter: `OpenRouter (${this.modelName})`,
      gemini: `Google Gemini (${this.modelName})`,
      custom: `Custom / Local (${this.baseUrl || 'Local'})`,
      sandbox: `Testing Sandbox (Simulated)`,
      basic: `Default Academic Engine (Offline)`,
    };

    this.name = providerDisplayNames[this.provider] || `Model Engine (${this.modelName})`;

    // Initialize Gemini SDK if Gemini is chosen and key is not placeholder
    if (this.provider === 'gemini' && this.apiKey && !this.apiKey.includes('MY_GEMINI_API_KEY')) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: this.apiKey });
      } catch {
        this.geminiClient = null;
      }
    }
  }

  isAvailable(): boolean {
    if (this.provider === 'basic') return false;
    if (this.provider === 'sandbox') return true;
    return this.apiKey.length > 5 || this.baseUrl.length > 5;
  }

  async generateText(prompt: string = '', systemInstruction?: string): Promise<string> {
    if (!this.isAvailable()) {
      return new MockAIProvider().generateText(prompt, systemInstruction);
    }

    if (this.provider === 'sandbox') {
      const mockRes = await new MockAIProvider().generateText(prompt, systemInstruction);
      return `[🧪 TEST MODE - Simulated Academic Engine]\n\n${mockRes}`;
    }

    try {
      // 1. Google Gemini via SDK or direct REST fallback
      if (this.provider === 'gemini') {
        const model = this.modelName || 'gemini-2.5-flash';
        if (this.geminiClient) {
          try {
            const resp = await this.geminiClient.models.generateContent({
              model,
              contents: prompt,
              config: systemInstruction ? { systemInstruction } : undefined,
            });
            if (resp.text) return resp.text;
          } catch (sdkErr: any) {
            console.warn(`Gemini SDK fallback trigger: ${sdkErr.message}`);
          }
        }

        // Direct REST API fallback for Gemini if SDK encounters environment issues
        if (this.apiKey) {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
          const contents: any[] = [];
          if (systemInstruction) {
            contents.push({ role: 'user', parts: [{ text: `[System Instruction: ${systemInstruction}]` }] });
          }
          contents.push({ role: 'user', parts: [{ text: prompt }] });

          const res = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
          });

          if (res.ok) {
            const data: any = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          }
        }
      }

      // 2. OpenAI / DeepSeek / Groq / OpenRouter / Custom via OpenAI-compatible Chat API
      if (
        this.provider === 'openai' ||
        this.provider === 'deepseek' ||
        this.provider === 'groq' ||
        this.provider === 'openrouter' ||
        this.provider === 'custom'
      ) {
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        if (this.provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
        if (this.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        if (this.provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        if (this.provider === 'custom' && this.baseUrl) {
          endpoint = this.baseUrl.endsWith('/chat/completions')
            ? this.baseUrl
            : `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
        }

        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        };
        if (this.provider === 'openrouter') {
          reqHeaders['HTTP-Referer'] = 'https://m2029.onrender.com';
          reqHeaders['X-Title'] = 'M2029 Curriculum OS';
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            model: this.modelName,
            messages,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API returned ${res.status}: ${errText.slice(0, 120)}`);
        }

        const data: any = await res.json();
        const msg = data.choices?.[0]?.message;
        const resultText = msg?.content || msg?.reasoning_content || '';
        if (resultText) return resultText;
      }

      // 3. Anthropic Claude via Messages API
      if (this.provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.modelName || 'claude-3-5-sonnet-20241022',
            max_tokens: 3072,
            system: systemInstruction || undefined,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Claude API returned ${res.status}: ${errText.slice(0, 120)}`);
        }

        const data: any = await res.json();
        const text = data.content?.map((c: any) => c.text || '').join('\n');
        if (text) return text;
      }
    } catch (err: any) {
      console.warn(`⚠️ [Universal AI Provider: ${this.name}] API call notice:`, err.message);
      return new MockAIProvider().generateText(prompt, systemInstruction);
    }

    return new MockAIProvider().generateText(prompt, systemInstruction);
  }

  async generateStructuredJson<T>(prompt: string, schemaDescription?: string): Promise<T> {
    if (!this.isAvailable()) {
      return new MockAIProvider().generateStructuredJson<T>(prompt, schemaDescription);
    }

    const fullPrompt = `${prompt}
${schemaDescription ? `\nStrict Schema:\n${schemaDescription}` : ''}
Return STRICT JSON ONLY. Do NOT wrap in markdown backticks or explanations.`;

    try {
      const rawText = await this.generateText(fullPrompt);
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanJson) as T;
    } catch {
      return new MockAIProvider().generateStructuredJson<T>(prompt, schemaDescription);
    }
  }
}

export class MockAIProvider implements AIProvider {
  name = 'Built-in Basic Academic Model (Free)';

  isAvailable(): boolean {
    return true;
  }

  async generateText(prompt: string = '', systemInstruction?: string): Promise<string> {
    const p = (prompt || '').toLowerCase();
    // Comprehensive 6-order academic study breakdown
    if (
      p.includes('6 sections') ||
      p.includes('in that order') ||
      p.includes('teaching mode: all') ||
      (systemInstruction && (systemInstruction.includes('6 sections') || systemInstruction.includes('Simple Overview')))
    ) {
      const topicMatch = prompt.match(/"([^"]+)"/) || prompt.match(/of\s+([A-Za-z0-9\s]+?)(?:\s+in|\.|$)/i);
      const cleanTopic = (topicMatch ? topicMatch[1] : prompt.replace(/explain.*?(?:of|about|for)/i, '').replace(/\..*$/, ''))
        .replace(/["']/g, '')
        .trim() || 'Core Engineering Concept';

      return `### 1. Simple Overview
${cleanTopic} is an essential academic concept designed to ensure reliable, coordinated, and predictable operations across modern computing systems.
- **Core Definition:** It defines a set of foundational protocols and structural invariants that govern state transitions and resource access.
- **Primary Objective:** Eliminates race conditions, structural anomalies, and uncoordinated state corruptions.
- **University Syllabus Context:** Consistently tested across mid-terms and end-terms due to its widespread practical importance in software engineering.

### 2. ELI9 (Analogies)
Imagine a busy school cafeteria where fifty students want ice cream, but there is only ONE golden ice cream spoon!
If all fifty students rush the counter at the same time and grab the spoon, the spoon breaks, ice cream spills everywhere, and nobody gets dessert.
Instead, the teacher puts a numbered token box on the counter. Student #1 takes token #1, uses the spoon for thirty seconds, and returns it for Student #2.
In this analogy:
- **The Ice Cream Spoon:** The critical resource / data memory.
- **The Students:** Concurrent processes, threads, or transactions.
- **The Token Rule:** **${cleanTopic}**, guaranteeing everyone gets served fairly without chaos or collisions!

### 3. Hinglish Breakdown
Dekho bhai, seedhi aur simple baat hai! Exam point of view se ${cleanTopic} bohot hi scoring aur high-yield topic hai.
Real life situation socho: jab do gaadiyan ek hi narrow one-way bridge par dono side se ghus jaayengi, toh bina signal ke dono phas jaayengi aur deadlock ho jaayega. ${cleanTopic} wahi intelligent traffic signal ka kaam karta hai.
- **Exam Memory Hook:** Examiner hamesha 3 cheezein check karega: Mutual Exclusion, Progress, aur Bounded Waiting.
- **Topper's Shortcut:** Definition mein keywords underline karo, ASCII flowchart banao, aur boundary conditions mention karo — pure 10 marks pakke!

### 4. 10-Marker University Exam Format
#### Section A: Standard Academic Definition (2 Marks)
**${cleanTopic}** is formally defined as an architectural invariant and algorithmic synchronization protocol that enforces mutual exclusion, bounded waiting, and safe state transitions across concurrent execution contexts.

#### Section B: Architecture & Schematic Diagram (2 Marks)
\`\`\`
  ┌────────────────────────────────────────────────────────┐
  │              Application / Client Tier                 │
  └───────────────────────────┬────────────────────────────┘
                              │ Standard Invocation / Invariant Check
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │         Entry Protocol (Token & Lock Verification)     │
  └───────────────────────────┬────────────────────────────┘
                              │ Condition Verified (Safe State)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │             [CRITICAL SECTION EXECUTION]               │
  │          Controlled Read / Write Operations            │
  └───────────────────────────┬────────────────────────────┘
                              │ Release Lock / Notify Blocked Entities
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │         Exit Protocol & State Synchronization          │
  └───────────────────────────┬────────────────────────────┘
\`\`\`

#### Section C: Step-by-Step Working Mechanism (3 Marks)
1. **Entry Protocol:** The thread evaluates entry flags. If the critical region is occupied, the entity yields CPU or waits on a condition queue.
2. **Atomic Execution:** Invariant guarantees hold throughout data mutation, backed by write-ahead persistence logs.
3. **Exit Protocol:** Shared flags are released atomically, triggering a wakeup broadcast to eligible waiting threads.
4. **Fault Recovery:** In case of an unexpected crash, transactional rollback restores the system to the last known consistent checkpoint.

#### Section D: Algorithmic Implementation (Java / C) (2 Marks)
\`\`\`java
public class ${cleanTopic.replace(/[^a-zA-Z]/g, '') || 'Topic'}Manager {
    private boolean isBusy = false;

    public synchronized void acquireAccess() throws InterruptedException {
        while (isBusy) {
            wait(); // Bounded wait condition
        }
        isBusy = true;
    }

    public synchronized void releaseAccess() {
        isBusy = false;
        notifyAll(); // Wake up queued candidates
    }
}
\`\`\`

#### Section E: Examiner Scoring Points & Traps (1 Mark)
- **Common Trap:** Omitting the Bounded Waiting condition or deadlock scenario.
- **Examiner's Favorite:** Mentioning standard textbook citations (Galvin for OS, Korth for DBMS, Tanenbaum for Networks).

### 5. Deep Dive & Edge Cases
- **Theoretical Formalism:** Let S represent the valid state space. The protocol ensures that for all t >= 0, State(t) is in S.
- **Time Complexity:** Constant time O(1) amortized overhead for entry and release protocols.
- **Space Complexity:** O(n) where n is the maximum queue depth of waiting threads.
- **Critical Edge Cases:**
  1. Priority Inversion: When high-priority tasks are starved by lower-priority lock holders. Solved via Priority Ceiling / Inheritance.
  2. Deadlock (Coffman Conditions): Prevented by enforcing strict resource ordering or timeout detection.

### 6. Quiz Me (Self-Check Questions)
**Question 1 (Conceptual Diagnostic - 2 Marks):**
Why is a busy-waiting spinlock inefficient on a single-processor core, and what alternative avoids CPU starvation?
*Model Answer:* On a single core, a spinlock monopolizes 100% of the CPU cycle time while waiting for a condition that only another thread could produce. A sleep/wake condition queue allows the operating system scheduler to dispatch ready threads instead.

**Question 2 (University Exam Scenario - 5 Marks):**
Can a system guarantee Mutual Exclusion without satisfying the Bounded Waiting condition? Give a concrete scenario.
*Model Answer:* Yes. If resource arbitration is purely unranked or random, a waiting process might continually be bypassed by newly arriving threads. Mutual exclusion is maintained (only one enters at a time), but the bypassed process suffers starvation due to the lack of bounded waiting.`;
    }

    // Intelligent heuristic pedagogical fallback
    if (p.includes('hinglish')) {
      return `Dekho bhai, seedhi baat hai! Yeh concept exam ke liye bohot zaroori hai. Simple shabdon mein samjho: jab system mein data ya resources organize karne hote hain, toh hum structured rules follow karte hain taaki koi deadlock ya confusion na ho. Professor ke lecture mein bas inke steps aur boundary conditions dhyan se note karna. 10-marker answer mein definition + flowchart + code zaroor likhna!`;
    }

    if (p.includes('eli9') || p.includes('explain like i\'m 9')) {
      return `Imagine a busy school cafeteria where everyone wants ice cream, but there is only one spoon! If nobody shares, nobody gets dessert. This concept is just the friendly teacher who sets fair turn-by-turn rules so every kid gets their ice cream without fighting or waiting forever!`;
    }

    if (p.includes('assignment') || p.includes('solve assignment')) {
      return `## 🎓 UNIVERSITY ASSIGNMENT SUBMISSION & MODEL SOLUTION

### 1. Executive Summary & Problem Scope
This assignment addresses the formal specification, architectural modeling, and rigorous implementation guarantees required in the university academic curriculum. The objective is to design a fault-tolerant, normalized, and optimized computational pipeline meeting university evaluation standards.

---

### 2. Theoretical Foundations & Mathematical Formalisms
- **Core Principles:** The fundamental rules governing this system require strict adherence to closure properties, atomicity guarantees, and boundary invariants.
- **Relational Invariant / Formal Equation:**
  $\\forall X \\rightarrow Y \\in F^+, \\quad \\text{either } Y \\subseteq X \\text{ (trivial) or } X \\text{ is a superkey of } R$
- **Preconditions & Assumptions:**
  1. Input data is deterministic with discrete state transitions.
  2. Deadlock conditions (Coffman criteria) are strictly guarded via pre-allocation or timeout protocols.
  3. Relational schemas are normalized to eliminate update, insertion, and deletion anomalies.

---

### 3. Structural Architecture & Algorithmic Blueprint
\`\`\`
[Input Tuple / Transaction]
        │
        ▼
 ┌──────────────┐      Violation
 │ Integrity    ├─────────────────────► [Abort / Rollback Protocol]
 │ Verification │
 └──────┬───────┘
        │ Validated
        ▼
 ┌──────────────┐
 │ Concurrency  │ (2-Phase Locking / Multiversion Timestamping)
 │ Scheduler    │
 └──────┬───────┘
        │ Serialized
        ▼
 [Committed Database State (ACID Guaranteed)]
\`\`\`

---

### 4. Implementation Artifact / Code Execution
\`\`\`java
public class AcademicSolutionEngine {
    private final String courseCode = "BCA-302";
    private boolean isConsistent = true;

    public void verifyInvariants() {
        if (!isConsistent) {
            throw new IllegalStateException("Integrity constraint violated: rolling back state.");
        }
        System.out.println("All schema invariants satisfied according to university syllabus.");
    }
}
\`\`\`

---

### 5. University Evaluation & Scoring Checklist
- [x] Defined all formal terminology with boundary conditions.
- [x] Illustrated architectural block diagrams with state transitions.
- [x] Outlined code snippets with time complexity bounds.
- [x] Cross-referenced past 5 years university PYQ variations.`;
    }

    if (p.includes('10-marker') || p.includes('exam')) {
      return `## 📝 UNIVERSITY 10-MARKER MODEL ANSWER SCHEME

### Section 1: Standard Definition (2 Marks)
A formal computational or structural paradigm designed to guarantee consistency, fault-isolation, and predictable resource allocation across interconnected software nodes.

### Section 2: Architectural Schematic Diagram (2 Marks)
\`\`\`
  ┌────────────────────────────────────────────────────────┐
  │                 Application / User Tier                 │
  └───────────────────────────┬────────────────────────────┘
                              │ Standard Queries (SQL / RPC)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │           Conceptual Schema / Normal Form Invariant     │
  └───────────────────────────┬────────────────────────────┘
                              │ Physical Storage Mapping
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │           Disk Storage & Write-Ahead Logging (WAL)     │
  └────────────────────────────────────────────────────────┘
\`\`\`

### Section 3: Step-by-Step Working Mechanism (3 Marks)
1. **Initiation & Validation:** Input parameters are checked against candidate key constraints.
2. **State Transition:** Operations are recorded in write-ahead logs prior to cache buffer flushes.
3. **Commit Guarantee:** Once committed, changes are non-volatile and withstand unexpected failures.

### Section 4: Key Gotchas & Scoring Takeaways (3 Marks)
- **Common Student Trap:** Forgetting to mention the closure test or dependency preservation check.
- **Examiner's Favorite:** State explicitly whether the solution guarantees serializability under concurrent schedules.`;
    }

    return `This is a foundational concept frequently tested in university examinations. It solves critical bottlenecks by introducing formal boundary conditions and predictable resource management. Key exam focus areas include architectural diagrams, time complexity bounds, and real-world failure handling.`;
  }

  async generateStructuredJson<T>(prompt: string, schemaDescription?: string): Promise<T> {
    const p = prompt.toLowerCase();

    // 1. Syllabus Parsing Heuristic
    if (p.includes('units') || p.includes('syllabus')) {
      return [
        {
          id: 'unit-gen-1',
          number: 1,
          title: 'Unit 1: Foundations & Relational Architecture',
          topics: [
            {
              id: 'top-1-1',
              title: 'Three Schema Architecture & Data Independence',
              difficulty: 'Easy',
              examWeightage: 'High',
              estimatedMinutes: 5,
              status: 'strong',
            },
            {
              id: 'top-1-2',
              title: 'Entity Relationship (ER) & Extended ER Modeling',
              difficulty: 'Medium',
              examWeightage: 'Must Read (10 Marks)',
              estimatedMinutes: 7,
              status: 'learning',
            },
            {
              id: 'top-1-3',
              title: 'Integrity Constraints: Domain, Entity & Referential',
              difficulty: 'Medium',
              examWeightage: 'High',
              estimatedMinutes: 6,
              status: 'not_started',
            },
          ],
        },
        {
          id: 'unit-gen-2',
          number: 2,
          title: 'Unit 2: Relational Calculus & Schema Refinement',
          topics: [
            {
              id: 'top-2-1',
              title: 'Relational Algebra: Select, Project, Join & Division',
              difficulty: 'Hard',
              examWeightage: 'Must Read (10 Marks)',
              estimatedMinutes: 8,
              status: 'learning',
            },
            {
              id: 'top-2-2',
              title: 'Functional Dependencies & Attribute Closure Algorithm',
              difficulty: 'Medium',
              examWeightage: 'Must Read (10 Marks)',
              estimatedMinutes: 7,
              status: 'not_started',
            },
            {
              id: 'top-2-3',
              title: 'Normalization: 1NF, 2NF, 3NF & BCNF Decomposition',
              difficulty: 'Hard',
              examWeightage: 'Must Read (10 Marks)',
              estimatedMinutes: 10,
              status: 'not_started',
            },
          ],
        },
      ] as unknown as T;
    }

    // 2. Pre-Lecture 7-Min Primer Heuristic
    if (p.includes('step1whatisit') || p.includes('prep') || p.includes('primer')) {
      return {
        step1WhatIsIt:
          'A fundamental architectural mechanism that prevents state inconsistencies and resource collisions.',
        step2WhyUsed:
          'Without this protocol, concurrent or nested operations lead to dirty reads, update loss, or system deadlocks.',
        step3AnalogyAndExample:
          'Think of an ATM transaction: either cash is dispensed AND your account balance is deducted, or nothing happens at all.',
        step4MiniQuiz: [
          {
            question: 'What is the primary guarantee provided by this mechanism?',
            options: ['Consistency & Atomicity', 'Faster Clock Speed', 'Lower Screen Brightness', 'None'],
            correctIndex: 0,
            explanation: 'It guarantees that intermediate failure leaves the system in a known valid state.',
          },
          {
            question: 'What happens if a constraint is violated during execution?',
            options: ['Abort and Rollback', 'Continue blindly', 'Delete the server', 'Ignore error'],
            correctIndex: 0,
            explanation: 'Transactions strictly rollback upon detecting constraint violations.',
          },
        ],
      } as unknown as T;
    }

    // 3. GitHub Exporter Course Info Heuristic
    if (p.includes('teachername') || p.includes('courseinfo')) {
      return {
        teacherName: 'Dr. Rajesh Sharma',
        teacherDesignation: 'Associate Professor & Lab Director',
        teacherEmail: 'rajesh.sharma@cs.university.edu',
        teacherOffice: 'Room 402, Block B, Academic Wing',
        courseName: 'Database Management Systems & Relational Architectures',
        courseCode: 'BCA-302',
        university: 'University School of Information Technology',
        department: 'Department of Computer Applications',
        semester: 'Semester III',
        academicYear: '2026-2027',
        credits: '4.0 Credits',
        weeklySchedule: [
          { day: 'Monday', time: '10:00 AM - 11:30 AM', room: 'LH-204', type: 'Lecture' },
          { day: 'Wednesday', time: '11:30 AM - 01:00 PM', room: 'LH-204', type: 'Lecture' },
          { day: 'Friday', time: '02:00 PM - 04:00 PM', room: 'Lab 3', type: 'Lab' },
        ],
        units: [
          {
            unitNumber: 1,
            title: 'Foundations & Data Modeling',
            topics: ['Three Schema Architecture', 'ER Diagrams', 'Relational Constraints'],
            hours: 10,
            examWeightage: '15 Marks',
          },
          {
            unitNumber: 2,
            title: 'Relational Algebra & Normalization',
            topics: ['Relational Operators', 'Functional Dependencies', '1NF, 2NF, 3NF, BCNF'],
            hours: 12,
            examWeightage: '25 Marks',
          },
        ],
        textbooks: [
          {
            title: 'Database System Concepts',
            authors: 'Silberschatz, Korth, Sudarshan',
            publisher: 'McGraw-Hill Higher Education',
            edition: '7th Edition',
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
  private static classInstance: AIProvider | null = null;
  private static classConfig: UniversalKeyConfig = {};

  /**
   * Returns a provider:
   * 1. If userConfig provides a valid personal API key or custom endpoint, returns a personal request-scoped provider.
   * 2. Otherwise returns the shared classroom server provider.
   */
  static getProvider(userConfig?: UniversalKeyConfig): AIProvider {
    if (userConfig && (userConfig.apiKey?.trim() || userConfig.baseUrl?.trim())) {
      return new UniversalAIProvider(userConfig);
    }
    return this.getClassProvider();
  }

  static getClassProvider(): AIProvider {
    if (!this.classInstance) {
      const envKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
      if (this.classConfig.apiKey || (envKey && !envKey.includes('MY_GEMINI_API_KEY') && !envKey.startsWith('your_'))) {
        this.classInstance = new UniversalAIProvider({
          apiKey: this.classConfig.apiKey || envKey,
          provider: this.classConfig.provider || (envKey.startsWith('AIzaSy') ? 'gemini' : 'auto'),
          modelName: this.classConfig.modelName || 'gemini-2.5-flash',
          baseUrl: this.classConfig.baseUrl,
        });
      } else {
        this.classInstance = new MockAIProvider();
      }
    }
    return this.classInstance;
  }

  static setConfig(config: UniversalKeyConfig): {
    success: boolean;
    modelType: 'custom_ai' | 'basic';
    providerName: string;
  } {
    const key = (config.apiKey || '').trim();
    if (key.length > 0 || (config.baseUrl && config.baseUrl.trim().length > 0)) {
      this.classConfig = {
        apiKey: key,
        provider: config.provider || 'auto',
        modelName: config.modelName,
        baseUrl: config.baseUrl,
      };
      this.classInstance = new UniversalAIProvider(this.classConfig);
      return {
        success: true,
        modelType: 'custom_ai',
        providerName: this.classInstance.name,
      };
    } else {
      this.classConfig = {};
      this.classInstance = null;
      return {
        success: true,
        modelType: 'basic',
        providerName: 'Built-in Basic Academic Model',
      };
    }
  }

  // Backward compatibility alias for single apiKey argument
  static setApiKey(apiKey?: string): { success: boolean; modelType: 'custom_ai' | 'basic'; providerName: string } {
    return this.setConfig({ apiKey });
  }

  static getStatus(): {
    hasCustomKey: boolean;
    modelType: 'custom_ai' | 'basic';
    providerName: string;
    provider: ModelProviderType;
    modelName: string;
    isClassShared: boolean;
  } {
    const provider = this.getClassProvider();
    const hasKey = provider instanceof UniversalAIProvider && provider.isAvailable();
    return {
      hasCustomKey: hasKey,
      modelType: hasKey ? 'custom_ai' : 'basic',
      providerName: hasKey ? provider.name : 'Built-in Basic Academic Model (Free)',
      provider: this.classConfig.provider || 'gemini',
      modelName: this.classConfig.modelName || 'gemini-2.5-flash',
      isClassShared: true,
    };
  }

  static setProvider(provider: AIProvider): void {
    this.classInstance = provider;
  }
}
