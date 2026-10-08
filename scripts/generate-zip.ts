import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGitHubFiles, generateZipBuffer } from '../src/server/githubExporter.js';
import { ExtractedCourseInfo } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const courseInfo: ExtractedCourseInfo = {
  teacherName: 'Dr. Rajesh Sharma',
  teacherDesignation: 'Associate Professor & Head of Database Systems Lab',
  teacherEmail: 'rajesh.sharma@cs.university.edu',
  teacherOffice: 'Room 402, Block B, Technology Wing',
  courseName: 'Database Management Systems & Relational Architectures',
  courseCode: 'BCA-302',
  university: 'University School of Information Technology & Engineering',
  department: 'Department of Computer Science & Applications',
  semester: 'Semester III',
  academicYear: '2026-2027',
  credits: '4.0 Credits (3L + 1T)',
  weeklySchedule: [
    { day: 'Monday', time: '10:00 AM - 11:30 AM', room: 'Lecture Hall 204', type: 'Lecture' },
    { day: 'Wednesday', time: '11:30 AM - 01:00 PM', room: 'Lecture Hall 204', type: 'Lecture' },
    { day: 'Friday', time: '02:00 PM - 04:00 PM', room: 'Database Systems Lab 3', type: 'Practical Lab' },
  ],
  units: [
    {
      unitNumber: 1,
      title: 'Data Modeling and Conceptual Database Architecture',
      topics: [
        'Introduction to Database Systems, Schema vs Instance, Three-Schema Architecture',
        'Entity-Relationship (ER) Modeling: Entities, Relationships, Multiplicity Constraints, Weak Entities',
        'Enhanced ER (EER) modeling, Generalization, Specialization, Categorization',
      ],
      hours: 10,
      examWeightage: '15 Marks',
    },
    {
      unitNumber: 2,
      title: 'The Relational Model and Relational Languages',
      topics: [
        'Relational data structure, integrity constraints: domain, key, entity, and referential integrity',
        'Relational Algebra: Selection, Projection, Set operations, Cartesian product, Joins, Division',
        'Relational Calculus: Tuple Relational Calculus (TRC) and Domain Relational Calculus (DRC)',
        'SQL DDL, DML, DCL, Views, Complex Nested Subqueries, Aggregate Operators',
      ],
      hours: 11,
      examWeightage: '20 Marks',
    },
    {
      unitNumber: 3,
      title: 'Relational Database Design and Normalization',
      topics: [
        'Informal design guidelines for relation schemas, Anomalies in schema design',
        'Functional Dependencies (FDs), Closure of attribute sets, Canonical cover, Armstrong Axioms',
        'Normal Forms based on primary keys: 1NF, 2NF, 3NF, Boyce-Codd Normal Form (BCNF)',
        'Multi-valued dependencies and 4NF, Join dependencies and 5NF, Lossless join and Dependency preservation',
      ],
      hours: 12,
      examWeightage: '25 Marks',
    },
    {
      unitNumber: 4,
      title: 'Transaction Processing, Concurrency, and Recovery',
      topics: [
        'Transaction concept, ACID properties, Transaction states, Concurrent executions',
        'Serializability: Conflict and View serializability, Precedence Graph',
        'Concurrency Control: Two-Phase Locking (2PL), Strict 2PL, Timestamp ordering, Deadlocks',
        'Crash Recovery: Log-based recovery, Immediate vs Deferred update, Checkpoints, ARIES algorithm',
      ],
      hours: 10,
      examWeightage: '20 Marks',
    },
  ],
  textbooks: [
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
  evaluationScheme: [
    { component: 'Internal Sessional Exams (2 Mid-Terms)', weightage: '25%' },
    { component: 'Laboratory Practical Work & Mini-Project', weightage: '25%' },
    { component: 'University End-Semester Examination', weightage: '50%' },
  ],
};

async function main() {
  console.log('Generating GitHub repository files...');
  const files = generateGitHubFiles(courseInfo);

  // 1. Write zip file to public/syllabus-repo.zip
  const zipBuffer = await generateZipBuffer(files, courseInfo);
  const publicZipPath = path.join(rootDir, 'public', 'syllabus-repo.zip');
  fs.writeFileSync(publicZipPath, zipBuffer);
  console.log(`Generated zip file at: ${publicZipPath} (${zipBuffer.length} bytes)`);

  // 2. Also write extracted files into a dedicated repo directory 'curriculum-repo'
  const repoDir = path.join(rootDir, 'curriculum-repo');
  if (!fs.existsSync(repoDir)) {
    fs.mkdirSync(repoDir, { recursive: true });
  }

  fs.writeFileSync(path.join(repoDir, 'README.md'), files.readmeMarkdown);
  fs.writeFileSync(path.join(repoDir, 'SYLLABUS.md'), files.syllabusMarkdown);
  fs.writeFileSync(path.join(repoDir, 'TIMETABLE.md'), files.timetableMarkdown);
  fs.writeFileSync(path.join(repoDir, 'CONTRIBUTING.md'), files.contributingMarkdown);
  fs.writeFileSync(path.join(repoDir, '.gitignore'), files.gitignoreContent);
  fs.writeFileSync(path.join(repoDir, 'LICENSE'), files.licenseContent);

  ['notes', 'slides', 'pyqs', 'assignments'].forEach((sub) => {
    const subDir = path.join(repoDir, sub);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(subDir, 'README.md'),
      `# ${sub.toUpperCase()} Directory\nCurated materials for ${courseInfo.courseName} taught by ${courseInfo.teacherName}.\n`
    );
  });

  console.log(`Scaffolded ready-to-push repo at: ${repoDir}`);
}

main().catch((err) => {
  console.error('Error generating zip:', err);
  process.exit(1);
});
