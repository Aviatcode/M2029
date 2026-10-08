import JSZip from 'jszip';
import { ExtractedCourseInfo, GitHubPublishFiles } from '../types/index.js';

export async function generateZipBuffer(
  files: GitHubPublishFiles,
  info: ExtractedCourseInfo
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file('README.md', files.readmeMarkdown);
  zip.file('SYLLABUS.md', files.syllabusMarkdown);
  zip.file('TIMETABLE.md', files.timetableMarkdown);
  zip.file('CONTRIBUTING.md', files.contributingMarkdown);
  zip.file('.gitignore', files.gitignoreContent);
  zip.file('LICENSE', files.licenseContent);

  zip
    .folder('notes')
    ?.file(
      'README.md',
      `# Class Study Notes: ${info.courseName}\n\nInstructor: ${info.teacherName} (${info.teacherDesignation})\nEmail: ${info.teacherEmail}\nOffice: ${info.teacherOffice}\n\nStore lecture notes, study summaries, and mindmaps here.\n`
    );

  zip
    .folder('slides')
    ?.file(
      'README.md',
      `# Lecture Slides & Handouts\n\nCourse: ${info.courseName} (${info.courseCode})\nProfessor: ${info.teacherName}\n\nStore professor presentations, lecture PDFs, and classroom handouts here.\n`
    );

  zip
    .folder('pyqs')
    ?.file(
      'README.md',
      `# University Past Year Questions (PYQs)\n\nCourse: ${info.courseName} (${info.courseCode})\nUniversity: ${info.university}\n\nArchive previous semester question papers, marking guides, and model answers here.\n`
    );

  zip
    .folder('assignments')
    ?.file(
      'README.md',
      `# Homework & Lab Assignments\n\nCourse: ${info.courseName} (${info.courseCode})\n\nStore assignment questions, code solutions, lab exercises, and rubrics here.\n`
    );

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

export function generateGitHubFiles(info: ExtractedCourseInfo): GitHubPublishFiles {
  const cleanCode = (info.courseCode || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const repoName = `${cleanCode || 'academic'}-curriculum`;

  // Encode badges safely
  const uniBadge = encodeURIComponent(info.university || 'University');
  const semBadge = encodeURIComponent(info.semester || 'Semester');
  const teacherBadge = encodeURIComponent(info.teacherName || 'Faculty');
  const creditsBadge = encodeURIComponent(info.credits || '4 Credits');

  const readmeMarkdown = `# 🎓 ${info.courseName} (${info.courseCode})

[![University](https://img.shields.io/badge/University-${uniBadge}-0284c7.svg)](https://github.com)
[![Semester](https://img.shields.io/badge/Semester-${semBadge}-0d9488.svg)](https://github.com)
[![Instructor](https://img.shields.io/badge/Faculty-${teacherBadge}-7c3aed.svg)](https://github.com)
[![Credits](https://img.shields.io/badge/Credits-${creditsBadge}-16a34a.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)

> **Official Class Curriculum & Knowledge Base** for **${info.courseName}** (${info.courseCode}), offered by the **${info.department}**, **${info.university}** for academic year **${info.academicYear}**.

---

## 📋 Table of Contents
1. [👨‍🏫 Instructor & Faculty Details](#-instructor--faculty-details)
2. [📅 Class Schedule & Timetable](#-class-schedule--timetable)
3. [📚 Curriculum & Syllabus Units](#-curriculum--syllabus-units)
4. [📖 Prescribed Textbooks & References](#-prescribed-textbooks--references)
5. [🎯 Examination & Evaluation Scheme](#-examination--evaluation-scheme)
6. [📂 Repository Directory Structure](#-repository-directory-structure)
7. [🚀 How to Clone & Use This Repository](#-how-to-clone--use-this-repository)
8. [🤝 How to Contribute](#-how-to-contribute)
9. [⚖️ Academic Integrity & License](#-academic-integrity--license)

---

## 👨‍🏫 Instructor & Faculty Details

| Detail | Information |
| :--- | :--- |
| **Instructor / Professor** | **${info.teacherName}** |
| **Designation** | ${info.teacherDesignation || 'Course Lead & Instructor'} |
| **Official Email** | [\`${info.teacherEmail || 'faculty@university.edu'}\`](mailto:${info.teacherEmail || 'faculty@university.edu'}) |
| **Faculty Office** | ${info.teacherOffice || 'Department Building'} |
| **Academic Term** | ${info.semester} (${info.academicYear}) |
| **Course Credits** | ${info.credits} |

---

## 📅 Class Schedule & Timetable

| Day | Timings | Room / Venue | Session Type |
| :--- | :--- | :--- | :--- |
${
  info.weeklySchedule && info.weeklySchedule.length > 0
    ? info.weeklySchedule
        .map(
          (s) =>
            `| **${s.day}** | ${s.time} | \`${s.room}\` | ${s.type || 'Lecture'} |`
        )
        .join('\n')
    : '| **Monday** | 10:00 AM - 11:30 AM | `Room 204` | Lecture |\n| **Wednesday** | 11:30 AM - 01:00 PM | `Room 204` | Lecture |\n| **Friday** | 02:00 PM - 04:00 PM | `CS Lab 3` | Practical |'
}

---

## 📚 Curriculum & Syllabus Units

${
  info.units && info.units.length > 0
    ? info.units
        .map(
          (u) => `### 📌 Unit ${u.unitNumber}: ${u.title}
* **Estimated Teaching Hours:** ${u.hours ? `${u.hours} Hours` : '10 Hours'}
* **University Exam Weightage:** \`${u.examWeightage || '15 - 20 Marks'}\`

**Key Concepts & Topics Covered:**
${
  u.topics && u.topics.length > 0
    ? u.topics.map((t) => `- [ ] ${t}`).join('\n')
    : '- [ ] Core Theoretical Foundations\n- [ ] Practical Implementations'
}
`
        )
        .join('\n')
    : `### 📌 Unit 1: Foundations
- [ ] Core Concepts & Architecture
- [ ] Theoretical Foundations
`
}

---

## 📖 Prescribed Textbooks & References

| # | Book Title | Authors | Publisher & Edition |
| :-: | :--- | :--- | :--- |
${
  info.textbooks && info.textbooks.length > 0
    ? info.textbooks
        .map(
          (b, idx) =>
            `| ${idx + 1} | **${b.title}** | ${b.authors} | ${b.publisher || 'Academic Press'}${b.edition ? `, ${b.edition}` : ''} |`
        )
        .join('\n')
    : '| 1 | **Standard University Textbook** | Faculty Authors | Reference Edition |'
}

---

## 🎯 Examination & Evaluation Scheme

| Evaluation Component | Weightage | Description |
| :--- | :-: | :--- |
${
  info.evaluationScheme && info.evaluationScheme.length > 0
    ? info.evaluationScheme
        .map(
          (e) =>
            `| **${e.component}** | \`${e.weightage}\` | Evaluated based on syllabus performance |`
        )
        .join('\n')
    : '| **Continuous Internal Assessment** | `25%` | Quizzes, assignments, and tutorials |\n| **Practical Laboratory Examination** | `25%` | Viva-voce and lab execution |\n| **End-Semester University Exam** | `50%` | Formal written 3-hour examination |'
}

---

## 📂 Repository Directory Structure

This repository is organized to maintain all class materials, homeworks, and lecture notes in one collaborative place:

\`\`\`
├── README.md               # Main course overview, teacher info & syllabus
├── SYLLABUS.md             # Detailed unit-by-unit syllabus breakdown
├── TIMETABLE.md            # Weekly class schedule and office hours
├── CONTRIBUTING.md         # Guide for class students submitting notes & fixes
├── LICENSE                 # Open-source MIT License
├── notes/                  # Markdown summaries & handwritten notes
│   ├── unit-01/
│   ├── unit-02/
│   └── revision-sheets/
├── slides/                 # Lecture slide decks and handouts
├── pyqs/                   # University past year question papers & solutions
└── assignments/            # Problem sets, lab assignments & codes
\`\`\`

---

## 🚀 How to Clone & Use This Repository

### 1. Clone to your local machine
\`\`\`bash
git clone https://github.com/YOUR_GITHUB_USERNAME/${repoName}.git
cd ${repoName}
\`\`\`

### 2. View offline in VS Code or Obsidian
You can open this folder directly in **VS Code**, **Obsidian**, or any Markdown reader for rapid search and offline revision.

---

## 🤝 How to Contribute

We welcome contributions from all cohort students!
- Found a typo in the lecture notes? Open a Pull Request!
- Have solved past year questions (PYQs)? Drop them into \`/pyqs\`.
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for style guidelines.

---

## ⚖️ Academic Integrity & License

This curriculum repository is maintained for educational and study purposes. All textbook copyrights belong to their respective publishers.
Code and student notes are distributed under the [MIT License](LICENSE).
`;

  const syllabusMarkdown = `# 📖 Comprehensive Syllabus: ${info.courseName} (${info.courseCode})

**Course:** ${info.courseName}  
**Code:** ${info.courseCode}  
**Department:** ${info.department}  
**University:** ${info.university}  
**Instructor:** ${info.teacherName} (${info.teacherEmail})  
**Credits:** ${info.credits}  

---

${
  info.units && info.units.length > 0
    ? info.units
        .map(
          (u) => `## Unit ${u.unitNumber}: ${u.title}
* **Weightage:** ${u.examWeightage || '15-20 Marks'}
* **Allocated Hours:** ${u.hours || 10} Hours

### Topics:
${u.topics.map((t, idx) => `${idx + 1}. **${t}**`).join('\n')}

---`
        )
        .join('\n\n')
    : '## Unit 1: Foundations\n1. Theoretical Introduction'
}

## Prescribed References
${
  info.textbooks && info.textbooks.length > 0
    ? info.textbooks
        .map(
          (b, idx) =>
            `${idx + 1}. *${b.title}* by ${b.authors} (${b.publisher || 'Publisher'}, ${b.edition || ''})`
        )
        .join('\n')
    : '1. Standard Textbook'
}
`;

  const timetableMarkdown = `# 📅 Class Timetable & Faculty Hours: ${info.courseName}

## Weekly Lecture Schedule
| Day | Time | Room | Session |
| :--- | :--- | :--- | :--- |
${
  info.weeklySchedule && info.weeklySchedule.length > 0
    ? info.weeklySchedule
        .map((s) => `| **${s.day}** | ${s.time} | \`${s.room}\` | ${s.type || 'Lecture'} |`)
        .join('\n')
    : '| Monday | 10:00 AM - 11:30 AM | Room 204 | Lecture |'
}

## Faculty Consultation Hours
* **Professor:** ${info.teacherName}
* **Cabin / Office:** ${info.teacherOffice}
* **Email:** ${info.teacherEmail}
* **Open Office Hours:** Tuesdays & Thursdays, 03:00 PM - 05:00 PM (or by email appointment)
`;

  const contributingMarkdown = `# Contributing to ${info.courseName} Repository

Thank you for helping keep our class knowledge base up to date!

## How You Can Help
1. **Lecture Notes:** Submit markdown summaries of classes you attended in the \`/notes\` directory.
2. **PYQ Solutions:** Add step-by-step verified answers to past examination questions in \`/pyqs\`.
3. **Lab Code:** Share clean, commented code examples in \`/assignments\`.

## Submission Rules
- Keep markdown clean and readable.
- Cite any external sources or textbooks.
- Respect academic integrity: Do not upload direct exam leaks.

## Git Workflow
\`\`\`bash
# 1. Create a branch
git checkout -b note-unit3-update

# 2. Commit your changes
git commit -m "docs: add notes for Unit 3 Normalization"

# 3. Push and create PR
git push origin note-unit3-update
\`\`\`
`;

  const gitignoreContent = `# OS generated files
.DS_Store
Thumbs.db
Desktop.ini

# Editor directories and files
.idea/
.vscode/
*.swp
*.swo

# Node / Build artifacts (if adding code)
node_modules/
dist/
build/
*.log

# Temporary notes & backups
*.tmp
*~
`;

  const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} ${info.teacherName || 'Course Faculty'} & Class Cohort

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

  const gitCommands = [
    {
      title: 'Option A: Push using Git Terminal (Recommended)',
      commands: [
        '# 1. Initialize git inside your extracted syllabus folder',
        'git init',
        '',
        '# 2. Stage all generated files (README, SYLLABUS, TIMETABLE, etc.)',
        'git add .',
        '',
        '# 3. Create your initial commit',
        `git commit -m "feat: publish ${info.courseCode || 'course'} syllabus, teacher info, and schedule"`,
        '',
        '# 4. Set default branch to main',
        'git branch -M main',
        '',
        '# 5. Link to your GitHub repository (replace with your repo URL)',
        `git remote add origin https://github.com/YOUR_GITHUB_USERNAME/${repoName}.git`,
        '',
        '# 6. Push to GitHub!',
        'git push -u origin main',
      ],
    },
    {
      title: 'Option B: Create and Push with GitHub CLI (gh)',
      commands: [
        `gh repo create ${repoName} --public --source=. --description "${info.courseName} Syllabus & Notes taught by ${info.teacherName}" --push`,
      ],
    },
    {
      title: 'Option C: Web Browser (No Git Installed)',
      commands: [
        '1. Go to https://github.com/new and create a new repository called "' + repoName + '"',
        '2. Click "uploading an existing file" or "creating a new file"',
        '3. Drag and drop README.md (or copy-paste its content) into the GitHub editor',
        '4. Click "Commit changes" to publish instantly online!',
      ],
    },
  ];

  return {
    repoName,
    readmeMarkdown,
    syllabusMarkdown,
    timetableMarkdown,
    contributingMarkdown,
    gitignoreContent,
    licenseContent,
    gitCommands,
  };
}
