import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SEED_CLASS,
  SEED_SUBJECTS,
  SEED_UNITS,
  SEED_TIMETABLE,
  SEED_MATERIALS,
  SEED_PYQS,
  SEED_EXAMS,
  SEED_ASSIGNMENTS,
} from './db/seedData.js';
import {
  ClassWorkspace,
  Subject,
  Unit,
  AcademicAssignment,
  ExamDateSheetItem,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../../curriculum-repo');
const STATE_FILE = path.join(REPO_DIR, '.last_sync.json');

export interface SyncStatus {
  isAutoSyncEnabled: boolean;
  lastSyncDate: string;
  lastSyncTimestamp: string;
  nextScheduledSync: string;
  repoDirectory: string;
  syncedFiles: string[];
  status: 'synced' | 'syncing' | 'idle' | 'error';
  recentLogs: Array<{ date: string; timestamp: string; message: string }>;
}

let syncState: SyncStatus = {
  isAutoSyncEnabled: true,
  lastSyncDate: '',
  lastSyncTimestamp: '',
  nextScheduledSync: '',
  repoDirectory: 'curriculum-repo/',
  syncedFiles: [
    'README.md',
    'SYLLABUS.md',
    'TIMETABLE.md',
    'CONTRIBUTING.md',
    'LICENSE',
    'assignments/README.md',
    'assignments/ACTIVE_DEADLINES.md',
    'assignments/PPT_SCHEDULE.md',
    'assignments/SOLUTIONS.md',
    'notes/README.md',
    'pyqs/README.md',
  ],
  status: 'idle',
  recentLogs: [],
};

// Database accessor provider to retrieve live data from memory store
let dbAccessor: () => any = () => null;

export function registerDbProvider(provider: () => any) {
  dbAccessor = provider;
}

function getLiveDb() {
  const customDb = dbAccessor();
  if (customDb) {
    return customDb;
  }
  return {
    classes: { 'BCA-2028': SEED_CLASS },
    subjects: { 'class-bca-2028': SEED_SUBJECTS },
    units: SEED_UNITS,
    timetable: { 'class-bca-2028': SEED_TIMETABLE },
    materials: { 'class-bca-2028': SEED_MATERIALS },
    pyqs: {
      'sub-dbms': SEED_PYQS.filter((p) => p.subjectId === 'sub-dbms'),
      'sub-java': SEED_PYQS.filter((p) => p.subjectId === 'sub-java'),
      'sub-os': SEED_PYQS.filter((p) => p.subjectId === 'sub-os'),
    },
    exams: { 'class-bca-2028': SEED_EXAMS },
    assignments: SEED_ASSIGNMENTS,
  };
}

// Load saved state from disk if exists
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    syncState.lastSyncDate = parsed.lastSyncDate || '';
    syncState.lastSyncTimestamp = parsed.lastSyncTimestamp || '';
    if (Array.isArray(parsed.recentLogs)) {
      syncState.recentLogs = parsed.recentLogs;
    }
  }
} catch (e) {
  console.warn('[AutoSync] Could not read sync state file:', e);
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateNextMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return tomorrow.toISOString();
}

function calculateDaysLeft(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate Master README.md
 */
function buildMasterReadme(db: any): string {
  const cls: ClassWorkspace = db.classes['BCA-2028'] || SEED_CLASS;
  const subjects: Subject[] = db.subjects[cls.id] || SEED_SUBJECTS;
  const assignments: AcademicAssignment[] = db.assignments || SEED_ASSIGNMENTS;
  const timetable = db.timetable[cls.id] || SEED_TIMETABLE;

  const pendingAssignments = assignments.filter((a) => !a.completed);
  const pptPresentations = assignments.filter((a) => a.type === 'ppt_presentation');

  const assignmentRows =
    assignments.length > 0
      ? assignments
          .map((item, idx) => {
            const days = calculateDaysLeft(item.dueDate);
            const timeLeftBadge = item.completed
              ? '`Done ✓`'
              : days < 0
              ? '`Past Due`'
              : days === 0
              ? '**`Today`** ⚠️'
              : days === 1
              ? '**`Tomorrow`** ⚠️'
              : `${days} days left`;
            const statusBadge = item.completed ? '✅ **Completed**' : '⏳ **Pending**';
            return `| ${idx + 1} | **${item.subjectName}** | ${item.title} | \`${item.dueDate}\` | ${timeLeftBadge} | ${item.assignedBy || 'Faculty'} | ${statusBadge} |`;
          })
          .join('\n')
      : '| 1 | Core Subjects | All cohort assignments up to date | — | — | Faculty | ✅ Up to date |';

  const pptRows =
    pptPresentations.length > 0
      ? pptPresentations
          .map((ppt) => {
            const status = ppt.completed ? '✅ Done' : '⏳ Scheduled';
            const cleanTitle = ppt.title.replace('Class Presentation: ', '');
            return `| \`${ppt.rollNumber || 'Cohort'}\` | **${ppt.presenterName || 'Team'}** | ${ppt.subjectName} | ${cleanTitle} | \`${ppt.dueDate}\` | ${status} |`;
          })
          .join('\n')
      : '| `BCA-01 to 05` | **Aman Kumar & Team** | Operating Systems | Banker\'s Algorithm & Deadlock Avoidance | `2026-10-22` | ⏳ Scheduled |';

  const timetableRows =
    timetable.length > 0
      ? timetable
          .map(
            (t: any) =>
              `| **${t.day}** | ${t.time} | ${t.subjectName} (${t.subjectCode}) | \`${t.room}\` | ${t.teacherName} |`
          )
          .join('\n')
      : '| **Monday** | 09:30 AM - 10:45 AM | Database Management Systems (CS301) | `Room 402` | Dr. Rajesh Sharma |';

  const subjectRows = subjects
    .map(
      (s) =>
        `| **${s.code}** | [${s.name}](SYLLABUS.md#${s.code.toLowerCase()}) | ${s.credits || 4}.0 | ${s.teacherName} | \`${s.totalUnits} Units\` | ${s.completedTopicsCount}/${s.totalTopicsCount} Topics Revised |`
    )
    .join('\n');

  return `# 🎓 ${cls.name} (${cls.code}) — Academic Curriculum & Knowledge Hub

[![Cohort](https://img.shields.io/badge/Cohort-${encodeURIComponent(cls.code)}-0284c7.svg?style=flat-square)](#)
[![University](https://img.shields.io/badge/University-${encodeURIComponent(cls.university)}-0d9488.svg?style=flat-square)](#)
[![Semester](https://img.shields.io/badge/Semester-Semester_${cls.semester}-7c3aed.svg?style=flat-square)](#)
[![Active Subjects](https://img.shields.io/badge/Subjects-${subjects.length}_Active-16a34a.svg?style=flat-square)](#)
[![Assignments](https://img.shields.io/badge/Pending_Classwork-${pendingAssignments.length}_Items-f59e0b.svg?style=flat-square)](#)
[![Automated Sync](https://img.shields.io/badge/Sync-Automated_Daily-6366f1.svg?style=flat-square)](#)

> **Official Class Curriculum & Knowledge Base** for **${cls.name} (${cls.code})**, ${cls.university} (Academic Term: 2026–2028).  
> Automatically synchronizes and refines all classwork deadlines, teacher PPT presentation schedules, comprehensive unit syllabi, and 10-marker exam question analyses.

---

## 📋 Table of Contents
1. [⚡ Active Classwork & Deadlines Matrix](#-active-classwork--deadlines-matrix)
2. [🎤 Class Representative (CR) PPT Presentation Schedule](#-class-representative-cr-ppt-presentation-schedule)
3. [📅 Weekly Lecture & Lab Schedule](#-weekly-lecture--lab-schedule)
4. [📚 Core Subjects & Faculty Overview](#-core-subjects--faculty-overview)
5. [📂 Repository Directory Structure](#-repository-directory-structure)
6. [🤝 How to Contribute](#-how-to-contribute)
7. [⚖️ Academic Integrity & License](#-academic-integrity--license)

---

## ⚡ Active Classwork & Deadlines Matrix

All upcoming homework sets, laboratory exercises, and research assignments currently tracked for the cohort:

| # | Subject | Title | Due Date | Time Left | Assigned By | Status |
| :-: | :--- | :--- | :---: | :---: | :--- | :---: |
${assignmentRows}

*Detailed instructions, step-by-step rubrics, and model university answers are available in [assignments/ACTIVE_DEADLINES.md](assignments/ACTIVE_DEADLINES.md) and [assignments/SOLUTIONS.md](assignments/SOLUTIONS.md).*

---

## 🎤 Class Representative (CR) PPT Presentation Schedule

Official presentation roster synchronized by the Class Representative for technical seminars and lab evaluations:

| Roll Numbers | Presenter / Team | Subject | Seminar / Presentation Topic | Scheduled Date | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
${pptRows}

*Review presentation guidelines, slide structure rules, and viva evaluation rubrics in [assignments/PPT_SCHEDULE.md](assignments/PPT_SCHEDULE.md).*

---

## 📅 Weekly Lecture & Lab Schedule

| Day | Timings | Subject & Course Code | Room / Lab | Faculty In-Charge |
| :--- | :--- | :--- | :---: | :--- |
${timetableRows}

*Complete weekly timetable and faculty consultation hours are documented in [TIMETABLE.md](TIMETABLE.md).*

---

## 📚 Core Subjects & Faculty Overview

| Code | Subject Name | Credits | Faculty Lead | Room | Key Focus Area |
| :--- | :--- | :---: | :--- | :---: | :--- |
${subjectRows}

---

## 📂 Repository Directory Structure

\`\`\`
├── README.md                    # Cohort dashboard, active deadlines & timetable summary
├── SYLLABUS.md                  # Comprehensive unit-by-unit syllabus with 10-marker weightages
├── TIMETABLE.md                 # Daily lecture schedule, faculty office hours & exam datesheet
├── CONTRIBUTING.md              # Class contribution & peer notes submission guide
├── LICENSE                      # MIT Open Academic License
├── assignments/                 # Official classwork, PPT rosters & full-mark solutions
│   ├── README.md                # Classwork portal overview & metrics
│   ├── ACTIVE_DEADLINES.md      # Detailed problem statements & checklists
│   ├── PPT_SCHEDULE.md          # CR presentation order, team rosters & guidelines
│   └── SOLUTIONS.md             # AI-generated 800+ word university model solutions
├── notes/                       # High-yield revision primers & study summaries
│   └── README.md                # 7-minute pre-class primers & cheatsheets
└── pyqs/                        # University Past Year Questions (2021-2025)
    └── README.md                # 10-marker high-frequency questions & answer guides
\`\`\`

---

## 🤝 How to Contribute

1. **Submit Peer Lecture Notes:** Place markdown or PDF notes into \`notes/\`.
2. **Add Verified Past Year Questions:** Contribute university exam questions to \`pyqs/\`.
3. **Report Syllabus Discrepancies:** Submit a pull request or contact the Class Representative.

---

## ⚖️ Academic Integrity & License

This curriculum repository is maintained for educational cohort reference. All lecture materials, syllabus structures, and solution outlines are distributed under the [MIT License](LICENSE).
`;
}

/**
 * Generate Multi-Subject Comprehensive SYLLABUS.md
 */
function buildSyllabusMarkdown(db: any): string {
  const cls: ClassWorkspace = db.classes['BCA-2028'] || SEED_CLASS;
  const subjects: Subject[] = db.subjects[cls.id] || SEED_SUBJECTS;
  const unitsMap = db.units || SEED_UNITS;

  let content = `# 📖 Comprehensive Academic Syllabus & Exam Blueprint
## ${cls.name} (${cls.code}) — ${cls.university}
**Academic Year:** 2026–2028 | **Semester:** Semester ${cls.semester}

---

## 📋 Course Overview Matrix

| Code | Subject Name | Credits | Faculty Lead | Exam Pattern |
| :--- | :--- | :---: | :--- | :--- |
${subjects
  .map(
    (s: Subject) =>
      `| **${s.code}** | ${s.name} | ${s.credits || 4}.0 | ${s.teacherName} | 25% Mid-Term, 25% Practical Lab, 50% University Exam |`
  )
  .join('\n')}

---
`;

  // Append each subject syllabus
  subjects.forEach((subj) => {
    const units: Unit[] = unitsMap[subj.id] || [];
    const textbook =
      subj.name.toLowerCase().includes('database')
        ? 'Database System Concepts (7th Edition) by Silberschatz, Korth, Sudarshan (McGraw-Hill)'
        : subj.name.toLowerCase().includes('java')
        ? 'Java: The Complete Reference (12th Edition) by Herbert Schildt (Oracle Press)'
        : subj.name.toLowerCase().includes('web')
        ? "Learning Web Design: A Beginner's Guide (5th Edition) by Jennifer Robbins (O'Reilly)"
        : subj.name.toLowerCase().includes('network')
        ? 'Computer Networking: A Top-Down Approach (8th Edition) by Kurose and Ross (Pearson)'
        : 'Operating System Concepts (10th Edition) by Silberschatz, Galvin, Gagne (Wiley)';

    content += `
<a id="${subj.code.toLowerCase()}"></a>
## 📘 ${subj.name} (${subj.code})
* **Credits:** ${subj.credits || 4}.0 Credits
* **Faculty In-Charge:** ${subj.teacherName} (faculty@cs.university.edu)
* **Designated Lecture Room:** \`Room 402 / Lab 3\`
* **Prescribed Textbook:** *${textbook}*

### Units & Module Breakdown:
`;

    if (units.length > 0) {
      units.forEach((u) => {
        const cleanTitle = u.title.replace(/^Unit\s+\d+:\s*/i, '');
        content += `
#### 📌 Unit ${u.number}: ${cleanTitle}
* **Allocated Teaching Hours:** ${u.topics.length * 3} Hours
* **University Exam Weightage:** \`15 - 25 Marks\`

**Curriculum Topics & Competencies:**
`;
        u.topics.forEach((t) => {
          const highYield =
            t.examWeightage?.includes('High') ||
            t.title.includes('Normalization') ||
            t.title.includes('Deadlock') ||
            t.title.includes('Concurrency') ||
            t.title.includes('Paging') ||
            t.title.includes('Threads');
          const markerTag = highYield ? ' ⭐ **[10-MARKER UNIVERSITY EXAM TOPIC]**' : '';
          content += `- [${t.completed ? 'x' : ' '}] **${t.title}** (${t.estimatedMinutes} mins study)${markerTag}\n`;
        });
      });
    } else {
      content += `
#### 📌 Unit 1: Foundations & Core Concepts
- [ ] Architecture and theoretical paradigms
- [ ] Practical implementations and algorithms
`;
    }

    content += `\n---\n`;
  });

  return content;
}

/**
 * Generate TIMETABLE.md
 */
function buildTimetableMarkdown(db: any): string {
  const cls: ClassWorkspace = db.classes['BCA-2028'] || SEED_CLASS;
  const timetable = db.timetable[cls.id] || SEED_TIMETABLE;
  const exams: ExamDateSheetItem[] = db.exams[cls.id] || SEED_EXAMS;

  const timetableRows = timetable
    .map(
      (t: any) =>
        `| **${t.day}** | ${t.time} | ${t.subjectName} | \`${t.subjectCode}\` | \`${t.room}\` | **${t.teacherName}** |`
    )
    .join('\n');

  const examRows = exams
    .map(
      (e) =>
        `| **${e.date}** | ${e.time} | ${e.subjectName} | \`${e.examType}\` | ${e.priority} |`
    )
    .join('\n');

  return `# 📅 Official Academic Timetable & Examination Datesheet
## ${cls.name} (${cls.code}) — ${cls.university}

---

## 🕒 Weekly Lecture & Practical Schedule

| Day | Timings | Course Name | Code | Room / Venue | Faculty Instructor |
| :--- | :---: | :--- | :---: | :---: | :--- |
${timetableRows}

---

## 👨‍🏫 Faculty Directory & Office Hours

| Faculty Name | Subject | Designation | Office Location | Student Consultation Hours |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Rajesh Sharma** | DBMS (CS301) | Course Lead & Associate Professor | Room 402, Academic Wing | Mon & Wed: 03:00 PM - 04:30 PM |
| **Prof. Ananya Sen** | Core Java (CS302) | Assistant Professor (Computing) | Room 408, CS Department | Tue & Thu: 02:00 PM - 03:30 PM |
| **Dr. Vikram Malhotra** | Operating Systems (CS303) | Professor of Systems Architecture | Room 315, Tech Tower | Wed & Fri: 04:00 PM - 05:00 PM |

---

## 📑 Upcoming University Examination Datesheet

| Exam Date | Time Slot | Subject Name | Code | Exam Type | Venue |
| :---: | :---: | :--- | :---: | :---: | :--- :
${examRows}

*Students must report to the examination hall 20 minutes prior with official university ID credentials.*
`;
}

/**
 * Generate assignments/ACTIVE_DEADLINES.md
 */
function buildActiveDeadlinesMarkdown(db: any): string {
  const assignments: AcademicAssignment[] = db.assignments || SEED_ASSIGNMENTS;

  return `# 📝 Official Active Assignments & Lab Submissions
This register details all coursework assignments, problem sets, and submission criteria for BCA-2028.

---

${assignments
  .map((item, idx) => {
    const days = calculateDaysLeft(item.dueDate);
    const urgency =
      item.completed
        ? '✅ Completed'
        : days < 0
        ? '⚠️ Past Due'
        : days === 0
        ? '🔥 Due Today!'
        : days === 1
        ? '⚡ Due Tomorrow!'
        : `⏳ ${days} days remaining`;

    const stepList =
      item.outlineSteps && item.outlineSteps.length > 0
        ? item.outlineSteps.map((s) => `1. ${s}`).join('\n')
        : '1. Formulate theoretical proofs.\n2. Write tested clean implementation code.\n3. Validate boundary test cases.';

    const refList =
      item.keyReferences && item.keyReferences.length > 0
        ? item.keyReferences.map((r) => `- *${r}*`).join('\n')
        : '- University Semester Syllabus Handbook';

    const guidance = item.sampleDraftGuidance
      ? `> 💡 **Faculty Guidance & Hint:** ${item.sampleDraftGuidance}`
      : '';

    return `### ${idx + 1}. ${item.title}
* **Subject:** ${item.subjectName}
* **Official Due Date:** \`${item.dueDate}\` (${urgency})
* **Assigned By:** ${item.assignedBy || 'Faculty'}
* **Submission Status:** ${item.completed ? '✅ **DONE (Submitted)**' : '⏳ **PENDING (Action Required)**'}

#### 📋 Problem Statement & Instructions:
> ${item.instructions}

#### 🎯 Step-by-Step Execution Plan:
${stepList}

#### 📖 Prescribed Key References:
${refList}

${guidance}

---
`;
  })
  .join('\n')}
`;
}

/**
 * Generate assignments/PPT_SCHEDULE.md
 */
function buildPPTScheduleMarkdown(db: any): string {
  const assignments: AcademicAssignment[] = db.assignments || SEED_ASSIGNMENTS;
  const pptItems = assignments.filter((a) => a.type === 'ppt_presentation');

  const pptTableRows =
    pptItems.length > 0
      ? pptItems
          .map((p) => {
            const cleanTitle = p.title.replace('Class Presentation: ', '');
            return `| \`${p.rollNumber || 'BCA-01 to 05'}\` | **${p.presenterName || 'Team'}** | ${p.subjectName} | ${cleanTitle} | \`${p.dueDate}\` | ${p.completed ? '✅ Presented' : '⏳ Scheduled'} |`;
          })
          .join('\n')
      : '| `BCA-01 to BCA-05` | **Aman Kumar & Team** | Operating Systems | Banker\'s Algorithm & Deadlock Avoidance | `2026-10-22` | ⏳ Scheduled |';

  const detailedDirectives = pptItems
    .map((p, idx) => {
      const stepList =
        p.outlineSteps && p.outlineSteps.length > 0
          ? p.outlineSteps.map((s) => `- ${s}`).join('\n')
          : '- Slide 1: Problem Definition\n- Slide 2-5: System Architecture\n- Slide 6-8: Practical Use Case\n- Slide 9-10: Limitations';

      return `### ${idx + 1}. ${p.title}
* **Allocated Team:** ${p.presenterName || 'Designated Student Team'} (${p.rollNumber || 'Cohort'})
* **Subject:** ${p.subjectName}
* **Presentation Date:** \`${p.dueDate}\`
* **Directives & Focus Areas:**
> ${p.instructions}

**Recommended Slide Flow:**
${stepList}
`;
    })
    .join('\n---\n');

  return `# 🎤 Class Representative (CR) Technical Seminar & PPT Roster
**Cohort:** BCA-2028 | **Class Representative Broadcast**

Official seminar order and group presentation roster for the current semester.

---

## 📌 Seminar Guidelines & Evaluation Rubric
1. **Slide Count:** Strictly 8 to 12 slides per team.
2. **Timing:** 10 minutes presentation + 3 minutes live viva Q&A from faculty and cohort.
3. **Evaluation Criteria:**
   - **40%:** Technical depth, architectural clarity, and accuracy of diagrams.
   - **30%:** Live code walkthrough or numerical dry-run.
   - **30%:** Viva-voce comprehension and question handling.

---

## 👥 Presentation Schedule

| Roll Numbers | Student Presenter / Team | Subject | Seminar Title | Date | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
${pptTableRows}

---

## 📋 Detailed Presentation Topic Directives

${detailedDirectives}
`;
}

/**
 * Generate assignments/SOLUTIONS.md
 */
function buildSolutionsMarkdown(_db: any): string {
  return `# 💡 Model Academic Solutions & Full-Credit Submission Templates
Comprehensive, university-grade reference solutions for BCA-2028 coursework assignments.

---

## 📘 1. Database Design & 3NF Normalization (Hostel Management System)
**Subject:** Database Management Systems (CS301) | **Faculty:** Dr. Rajesh Sharma

### 🎓 Executive Summary & Problem Formulation
In university student accommodation systems, un-normalized relational schemas cause significant redundancy, update anomalies, insertion anomalies, and deletion anomalies. This solution presents the formal functional dependency analysis and progressive schema normalization from 1NF to 3NF.

### 📐 Functional Dependencies (FDs)
Given un-normalized relation \`R(StudentID, StudentName, RoomNumber, HostelBlock, WardenName, MonthlyRent)\`:
1. \`StudentID → StudentName, RoomNumber, HostelBlock\`
2. \`RoomNumber, HostelBlock → MonthlyRent\`
3. \`HostelBlock → WardenName\`

### 📝 Step-by-Step 3NF Decomposition
* **First Normal Form (1NF):** Eliminate multi-valued attributes and ensure atomic domains for all attributes.
* **Second Normal Form (2NF):** Eliminate partial functional dependencies. All non-key attributes are fully functionally dependent on candidate key \`StudentID\`.
* **Third Normal Form (3NF):** Eliminate transitive dependencies (\`StudentID → HostelBlock\` and \`HostelBlock → WardenName\`).

#### Decomposed Relational Schemas:
\`\`\`sql
-- 1. Student Master Table
CREATE TABLE Students (
    StudentID VARCHAR(20) PRIMARY KEY,
    StudentName VARCHAR(100) NOT NULL,
    RoomNumber INT NOT NULL,
    HostelBlock VARCHAR(10) NOT NULL,
    FOREIGN KEY (HostelBlock, RoomNumber) REFERENCES HostelRooms(HostelBlock, RoomNumber)
);

-- 2. Hostel Room Specification Table
CREATE TABLE HostelRooms (
    HostelBlock VARCHAR(10) NOT NULL,
    RoomNumber INT NOT NULL,
    MonthlyRent DECIMAL(8,2) NOT NULL,
    PRIMARY KEY (HostelBlock, RoomNumber),
    FOREIGN KEY (HostelBlock) REFERENCES HostelBlocks(HostelBlock)
);

-- 3. Hostel Block & Warden Table (Eliminates Transitive Dependency)
CREATE TABLE HostelBlocks (
    HostelBlock VARCHAR(10) PRIMARY KEY,
    WardenName VARCHAR(100) NOT NULL,
    WardenContact VARCHAR(15)
);
\`\`\`

---

## ☕ 2. Producer-Consumer Problem using synchronized and wait/notify
**Subject:** Core Java Programming (CS302) | **Faculty:** Prof. Ananya Sen

### 🎓 Theoretical Architecture & Synchronization Invariants
The classical Bounded-Buffer Producer-Consumer model requires:
1. Mutual exclusion: Only one worker thread accesses the shared buffer queue at a time.
2. Underflow prevention: Consumer thread waits when buffer is empty (\`queue.isEmpty()\`).
3. Overflow prevention: Producer thread waits when buffer reaches capacity (\`queue.size() == capacity\`).
4. **Spurious Wakeup Prevention:** The condition check MUST be inside a \`while\` loop, never an \`if\` statement.

### 💻 Production Java Implementation
\`\`\`java
import java.util.LinkedList;
import java.util.Queue;

public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void produce(T item) throws InterruptedException {
        // ALWAYS use while loop to guard against spurious wakeups
        while (queue.size() == capacity) {
            wait();
        }
        queue.add(item);
        System.out.println("[PRODUCED]: " + item + " (Queue Size: " + queue.size() + ")");
        // Wake up sleeping consumer threads
        notifyAll();
    }

    public synchronized T consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        System.out.println("[CONSUMED]: " + item + " (Remaining: " + queue.size() + ")");
        // Wake up sleeping producer threads
        notifyAll();
        return item;
    }
}
\`\`\`

---

## 🖥️ 3. Deadlock Avoidance: Banker's Algorithm Numerical Matrix Trace
**Subject:** Operating Systems (CS303) | **Faculty:** Dr. Vikram Malhotra

### 🎓 System State Definition
Consider a system with 5 Processes (\`P0, P1, P2, P3, P4\`) and 3 Resource Types (\`A: 10, B: 5, C: 7\`).

#### Snapshot at Time T0:
* **Available Vector:** \`[3, 3, 2]\`
* **Need Matrix Calculation:** \`Need[i][j] = Max[i][j] - Allocation[i][j]\`

| Process | Allocation (A B C) | Max (A B C) | Need (A B C) |
| :-: | :-: | :-: | :-: |
| **P0** | 0 1 0 | 7 5 3 | 7 4 3 |
| **P1** | 2 0 0 | 3 2 2 | 1 2 2 |
| **P2** | 3 0 2 | 9 0 2 | 6 0 0 |
| **P3** | 2 1 1 | 2 2 2 | 0 1 1 |
| **P4** | 0 0 2 | 4 3 3 | 4 3 1 |

### 🔍 Safety Algorithm Step-by-Step Trace:
1. **Check P1:** Need \`[1, 2, 2] <= Available [3, 3, 2]\` -> **TRUE**.  
   *P1 executes.* \`New Available = [3, 3, 2] + Allocation[2, 0, 0] = [5, 3, 2]\`.
2. **Check P3:** Need \`[0, 1, 1] <= Available [5, 3, 2]\` -> **TRUE**.  
   *P3 executes.* \`New Available = [5, 3, 2] + Allocation[2, 1, 1] = [7, 4, 3]\`.
3. **Check P4:** Need \`[4, 3, 1] <= Available [7, 4, 3]\` -> **TRUE**.  
   *P4 executes.* \`New Available = [7, 4, 3] + Allocation[0, 0, 2] = [7, 4, 5]\`.
4. **Check P0:** Need \`[7, 4, 3] <= Available [7, 4, 5]\` -> **TRUE**.  
   *P0 executes.* \`New Available = [7, 4, 5] + Allocation[0, 1, 0] = [7, 5, 5]\`.
5. **Check P2:** Need \`[6, 0, 0] <= Available [7, 5, 5]\` -> **TRUE**.  
   *P2 executes.* \`New Available = [7, 5, 5] + Allocation[3, 0, 2] = [10, 5, 7]\`.

**Result:** The system is in a **SAFE STATE** with Safe Execution Sequence:  
\`<P1, P3, P4, P0, P2>\`
`;
}

/**
 * Generate notes/README.md
 */
function buildNotesMarkdown(): string {
  return `# 📚 High-Yield Academic Revision Notes & 7-Minute Primers
Curated, high-retention study primers for BCA-2028 semester examinations.

---

## 📌 1. Database Normalization Quick Cheatsheet (CS301)
* **1NF:** All attribute values must be atomic. No repeating groups or arrays.
* **2NF:** Must be in 1NF + No partial dependency (No non-prime attribute depends on a proper subset of candidate key).
* **3NF:** Must be in 2NF + No transitive dependency (X -> Y is valid only if X is superkey OR Y is prime attribute).
* **BCNF:** For every non-trivial functional dependency X -> Y, X MUST be a superkey. Strictly stronger than 3NF.
* **Lossless Join vs Dependency Preservation:** 3NF decomposition guarantees both lossless join and dependency preservation. BCNF guarantees lossless join but may sacrifice dependency preservation.

---

## 📌 2. Java Concurrency & Multithreading Rules (CS302)
* **Thread States:** \`NEW\`, \`RUNNABLE\`, \`BLOCKED\`, \`WAITING\`, \`TIMED_WAITING\`, \`TERMINATED\`.
* **Synchronized Blocks vs Methods:** Synchronizing on \`this\` locks the current instance; synchronizing on a static method locks the \`Class\` object.
* **wait() vs sleep():** \`wait()\` releases the monitor lock and belongs to \`java.lang.Object\`. \`sleep()\` holds the lock and belongs to \`java.lang.Thread\`.
* **Volatile Keyword:** Ensures memory visibility across thread caches; prevents compiler reordering but does NOT guarantee atomicity for compound operations (e.g., \`count++\`).

---

## 📌 3. Operating Systems: 4 Coffman Deadlock Conditions (CS303)
Deadlock occurs if and only if all four conditions hold simultaneously:
1. **Mutual Exclusion:** At least one resource must be held in non-shareable mode.
2. **Hold and Wait:** A process holds at least one resource while requesting additional resources held by other processes.
3. **No Preemption:** Resources cannot be forcibly preempted; released only voluntarily by the process.
4. **Circular Wait:** A closed cycle exists {P0, P1, ..., Pn} such that Pi waits for a resource held by P(i+1).
`;
}

/**
 * Generate pyqs/README.md
 */
function buildPYQsMarkdown(_db: any): string {
  return `# 📑 University Past Year Questions (PYQs) & Exam Frequency Analysis
High-yield 10-marker and 5-marker examination questions from 2021–2025 semester exams.

---

## 🎯 Top High-Frequency 10-Marker Questions

### 1. Database Management Systems (CS301)
1. **Explain 3NF and BCNF normalization with a suitable real-world example.** Compare their trade-offs with respect to dependency preservation. *(Asked in: 2024, 2023, 2021 — 10 Marks)*
2. **What are the ACID properties of a transaction?** Explain how Two-Phase Locking (2PL) guarantees conflict serializability. *(Asked in: 2024, 2022 — 10 Marks)*
3. **Construct an ER diagram for a Hospital Management System.** Convert it into relational tables specifying primary and foreign keys. *(Asked in: 2023, 2022 — 10 Marks)*

### 2. Core Java Programming (CS302)
1. **Explain the Producer-Consumer problem in Java.** Implement a solution using \`synchronized\`, \`wait()\`, and \`notifyAll()\`. *(Asked in: 2024, 2023 — 10 Marks)*
2. **Differentiate between Abstract Classes and Interfaces in Java 8/11.** Explain default and static methods in interfaces. *(Asked in: 2024, 2022 — 10 Marks)*
3. **Describe the Java Exception Hierarchy.** Explain the difference between checked and unchecked exceptions with code examples. *(Asked in: 2023, 2021 — 10 Marks)*

### 3. Operating Systems (CS303)
1. **Explain Banker's Algorithm for Deadlock Avoidance.** Dry run the algorithm on a given Allocation, Max, and Available state to find the safe sequence. *(Asked in: 2024, 2023, 2022 — 10 Marks)*
2. **Compare Paging and Segmentation.** Explain the role of TLB (Translation Lookaside Buffer) in virtual memory address translation with an architectural diagram. *(Asked in: 2024, 2021 — 10 Marks)*
3. **Explain CPU Scheduling Algorithms:** Round Robin and Shortest Job First (SJF) with Gantt charts, Average Waiting Time, and Turnaround Time calculations. *(Asked in: 2023, 2022 — 10 Marks)*

---

## 📝 10-Marker University Answer Writing Framework
To achieve maximum credit (9–10 marks out of 10) on theoretical questions:
1. **Section 1 (1.5 marks):** Formal definition, significance, and real-world system context.
2. **Section 2 (2.5 marks):** Clean, labelled architectural block diagram or mathematical formulation.
3. **Section 3 (3.0 marks):** Complete algorithm, step-by-step derivation, or syntactically correct code.
4. **Section 4 (1.5 marks):** Numerical dry-run or concrete example with input/output walkthrough.
5. **Section 5 (1.5 marks):** Advantages, limitations, time/space complexity analysis, and concluding summary.
`;
}

/**
 * Execute synchronization by writing updated Markdown files to curriculum-repo/
 */
export async function executeAutoSync(force = false): Promise<{ success: boolean; date: string; message: string }> {
  const today = getTodayDateString();

  if (!force && syncState.lastSyncDate === today) {
    return {
      success: true,
      date: today,
      message: `Curriculum already up-to-date for today (${today}).`,
    };
  }

  syncState.status = 'syncing';

  try {
    const db = getLiveDb();

    if (!fs.existsSync(REPO_DIR)) {
      fs.mkdirSync(REPO_DIR, { recursive: true });
    }

    // Ensure subdirectories exist
    const subDirs = ['assignments', 'notes', 'slides', 'pyqs'];
    for (const sub of subDirs) {
      const subPath = path.join(REPO_DIR, sub);
      if (!fs.existsSync(subPath)) {
        fs.mkdirSync(subPath, { recursive: true });
      }
    }

    // Build rich, refined markdown files
    const readmeContent = buildMasterReadme(db);
    const syllabusContent = buildSyllabusMarkdown(db);
    const timetableContent = buildTimetableMarkdown(db);
    const activeDeadlinesContent = buildActiveDeadlinesMarkdown(db);
    const pptScheduleContent = buildPPTScheduleMarkdown(db);
    const solutionsContent = buildSolutionsMarkdown(db);
    const notesContent = buildNotesMarkdown();
    const pyqsContent = buildPYQsMarkdown(db);

    const contributingContent = `# Contributing to BCA-2028 Academic Repository

Welcome cohort students and contributors!

## How to Contribute
- **Classwork Submissions:** Submit assignments or notes into \`notes/\` or \`assignments/\`.
- **Formatting:** Use standard Markdown formatting. Include equations in LaTeX ($...$) and code in language fences.
- **Academic Integrity:** Ensure student answers provide educational step-by-step guidance rather than direct plagiarism.
`;

    const licenseContent = `MIT License

Copyright (c) 2026 BCA-2028 Cohort & Faculty

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

    // Write all core files
    fs.writeFileSync(path.join(REPO_DIR, 'README.md'), readmeContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'SYLLABUS.md'), syllabusContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'TIMETABLE.md'), timetableContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'CONTRIBUTING.md'), contributingContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'LICENSE'), licenseContent, 'utf-8');

    // Subject folder-wise differentiation for assignments
    const assignments: AcademicAssignment[] = db.assignments || SEED_ASSIGNMENTS;
    const subjects: Subject[] = db.subjects['class-bca-2028'] || SEED_SUBJECTS;

    const subjectFolderMap: Record<string, { name: string; code: string; items: AcademicAssignment[] }> = {};

    // Seed from subjects
    subjects.forEach((s) => {
      const slug = s.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      subjectFolderMap[slug] = {
        name: s.name,
        code: s.code || 'BCA',
        items: [],
      };
    });

    // Distribute assignments into subject folders
    assignments.forEach((a) => {
      const slug = (a.subjectName || 'general')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!subjectFolderMap[slug]) {
        subjectFolderMap[slug] = {
          name: a.subjectName || 'General Studies',
          code: 'BCA',
          items: [],
        };
      }
      subjectFolderMap[slug].items.push(a);
    });

    const folderLinks: string[] = [];

    // Write subject-specific folders and assignment files
    for (const [slug, folderData] of Object.entries(subjectFolderMap)) {
      const subDirPath = path.join(REPO_DIR, 'assignments', slug);
      if (!fs.existsSync(subDirPath)) {
        fs.mkdirSync(subDirPath, { recursive: true });
      }

      // Generate subject folder README.md
      const folderReadme = `# 📁 ${folderData.name} (${folderData.code}) — Coursework & Assignments

> **Subject Directory:** \`assignments/${slug}/\`  
> Contains all official homework sets, laboratory exercises, and coursework assignments for **${folderData.name}**.

---

## 📋 Folder Classwork Overview

| # | Title | Type | Due Date | Status | File Link |
| :-: | :--- | :---: | :---: | :---: | :--- |
${
  folderData.items.length > 0
    ? folderData.items
        .map((it, idx) => {
          const fileBase = `${String(idx + 1).padStart(2, '0')}-${it.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 45)}.md`;
          const status = it.completed ? '✅ Done' : '⏳ Pending';
          const typeStr = it.type === 'ppt_presentation' ? 'Presentation' : 'Assignment';
          return `| ${idx + 1} | **${it.title}** | \`${typeStr}\` | \`${it.dueDate}\` | ${status} | [${fileBase}](${fileBase}) |`;
        })
        .join('\n')
    : '| 1 | No assignments currently assigned for this subject | — | — | — | — |'
}

---

## 📖 Instructions & Academic Integrity
All submissions must adhere to formal university formatting and include proper step-by-step mathematical proofs or syntactically validated code implementations.
`;
      fs.writeFileSync(path.join(subDirPath, 'README.md'), folderReadme, 'utf-8');

      // Write individual assignment files inside this subject folder
      folderData.items.forEach((it, idx) => {
        const fileBase = `${String(idx + 1).padStart(2, '0')}-${it.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 45)}.md`;

        const stepList =
          it.outlineSteps && it.outlineSteps.length > 0
            ? it.outlineSteps.map((s, sIdx) => `${sIdx + 1}. ${s}`).join('\n')
            : '1. Review theoretical foundations.\n2. Formulate schema or code.\n3. Validate with boundary test cases.';

        const refList =
          it.keyReferences && it.keyReferences.length > 0
            ? it.keyReferences.map((r) => `- *${r}*`).join('\n')
            : '- University Prescribed Semester Textbook';

        const itemContent = `# 📝 ${it.title}
* **Subject:** ${folderData.name} (${folderData.code})
* **Folder Location:** \`assignments/${slug}/${fileBase}\`
* **Due Date:** \`${it.dueDate}\`
* **Assigned By:** ${it.assignedBy || 'Faculty'}
* **Submission Status:** ${it.completed ? '✅ Completed' : '⏳ Pending'}

---

## 📋 Problem Statement & Instructions
> ${it.instructions}

${it.presenterName ? `* **Presenter / Team:** ${it.presenterName} (${it.rollNumber || 'Cohort'})\n` : ''}

---

## 🎯 Step-by-Step Execution Plan
${stepList}

---

## 📖 References & Suggested Readings
${refList}

${it.sampleDraftGuidance ? `\n> 💡 **Instructor Guidance:** ${it.sampleDraftGuidance}\n` : ''}
`;
        fs.writeFileSync(path.join(subDirPath, fileBase), itemContent, 'utf-8');
      });

      folderLinks.push(
        `- [📁 **${folderData.name}** (\`${folderData.code}\`)](${slug}/README.md) — **${folderData.items.length} ${folderData.items.length === 1 ? 'file' : 'files'}** (${folderData.items.filter((i) => i.completed).length} completed)`
      );
    }

    // Special PPT Seminars folder
    const pptDirPath = path.join(REPO_DIR, 'assignments', 'ppt-seminars');
    if (!fs.existsSync(pptDirPath)) {
      fs.mkdirSync(pptDirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(pptDirPath, 'README.md'), pptScheduleContent, 'utf-8');
    folderLinks.push(`- [🎤 **Class Representative (CR) Seminars & PPT Roster**](ppt-seminars/README.md) — **Technical Seminar Presentations**`);

    // Write master assignments README.md with subject folder directory links
    fs.writeFileSync(
      path.join(REPO_DIR, 'assignments', 'README.md'),
      `# 📝 Classwork & Assignments Portal (Folder-Wise Organization)

All cohort coursework, homework sets, laboratory exercises, and seminar presentations are organized **folder-wise by subject**:

## 📂 Subject Directories & Folders
${folderLinks.join('\n')}

---

## 📑 Global Classwork Indexes
- [ACTIVE_DEADLINES.md](ACTIVE_DEADLINES.md) — Comprehensive list of all pending cohort deadlines.
- [PPT_SCHEDULE.md](PPT_SCHEDULE.md) — Official Class Representative seminar schedule.
- [SOLUTIONS.md](SOLUTIONS.md) — Full-credit model solutions and step-by-step write-ups.
`,
      'utf-8'
    );

    fs.writeFileSync(path.join(REPO_DIR, 'assignments', 'ACTIVE_DEADLINES.md'), activeDeadlinesContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'assignments', 'PPT_SCHEDULE.md'), pptScheduleContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'assignments', 'SOLUTIONS.md'), solutionsContent, 'utf-8');

    // Write notes & pyqs subfolder files
    fs.writeFileSync(path.join(REPO_DIR, 'notes', 'README.md'), notesContent, 'utf-8');
    fs.writeFileSync(path.join(REPO_DIR, 'pyqs', 'README.md'), pyqsContent, 'utf-8');

    const timestamp = new Date().toISOString();
    syncState.lastSyncDate = today;
    syncState.lastSyncTimestamp = timestamp;
    syncState.nextScheduledSync = calculateNextMidnight();
    syncState.status = 'synced';

    const logEntry = {
      date: today,
      timestamp,
      message: `Automated sync completed for date ${today}. Refined all curriculum, timetable, assignments, and notes files.`,
    };

    syncState.recentLogs.unshift(logEntry);
    if (syncState.recentLogs.length > 10) {
      syncState.recentLogs = syncState.recentLogs.slice(0, 10);
    }

    // Persist sync state to disk
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastSyncDate: today,
          lastSyncTimestamp: timestamp,
          recentLogs: syncState.recentLogs,
        },
        null,
        2
      ),
      'utf-8'
    );

    console.log(`✅ [Auto-Sync] Silently synchronized & refined curriculum repository for date: ${today}`);
    return {
      success: true,
      date: today,
      message: `Successfully synchronized curriculum repository for date ${today}.`,
    };
  } catch (err: any) {
    console.error('❌ [Auto-Sync] Error during curriculum sync:', err);
    syncState.status = 'error';
    return {
      success: false,
      date: today,
      message: err.message || 'Auto-sync failed',
    };
  }
}

export function getAutoSyncStatus(): SyncStatus {
  syncState.nextScheduledSync = calculateNextMidnight();
  return { ...syncState };
}

/**
 * Initializes the background scheduler that automatically triggers on every new date (midnight transition)
 */
export function initDailyAutoSyncScheduler() {
  console.log('🔄 Initializing Automated Daily Curriculum Sync Scheduler...');

  // 1. Run immediate sync check on server start
  executeAutoSync(false).catch((e) => console.error('[AutoSync Startup] Error:', e));

  // 2. Schedule next run at exact midnight
  const scheduleMidnightCheck = () => {
    const now = new Date();
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const msUntilMidnight = Math.max(1000, tomorrowMidnight.getTime() - now.getTime());

    console.log(
      `⏱️ [Auto-Sync] Next automatic daily sync scheduled in ${Math.round(msUntilMidnight / 60000)} minutes (${tomorrowMidnight.toLocaleTimeString()})`
    );

    setTimeout(() => {
      console.log('📅 [Auto-Sync] Midnight reached! Triggering automated sync for the new date...');
      executeAutoSync(true)
        .catch((e) => console.error('[AutoSync Midnight] Error:', e))
        .finally(() => {
          // Reschedule for next midnight
          scheduleMidnightCheck();
        });
    }, msUntilMidnight);
  };

  scheduleMidnightCheck();
}
