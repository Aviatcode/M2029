> 🌐 **Live Web Application & Autonomous AI Portal:**
> **[🚀 Open SyllabusOS Live Web Application](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)** | **[🛠️ Interactive Dev Workspace](https://ais-dev-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)**
>
> 📦 **Download Ready-to-Upload ZIP Bundles:**
> **[⬇️ Download Backend & App Source (`backend-source.zip`)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/backend-source.zip)** | **[⬇️ Download Curriculum Knowledge Base (`syllabus-repo.zip`)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/syllabus-repo.zip)**

---

# 🎓 SyllabusOS — Autonomous AI Curriculum & Class Knowledge Base

[![Live Web Application](https://img.shields.io/badge/Live_App-SyllabusOS-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)
[![University](https://img.shields.io/badge/University-USITE-0284c7.svg)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)
[![Semester](https://img.shields.io/badge/Semester-Semester%20III-0d9488.svg)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)
[![Instructor](https://img.shields.io/badge/Faculty-Dr.%20Rajesh%20Sharma-7c3aed.svg)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)
[![Credits](https://img.shields.io/badge/Credits-4.0%20Credits-16a34a.svg)](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)

An intelligent, autonomous curriculum management platform and academic class repository. SyllabusOS transforms raw university syllabus handouts and teacher timetables into an interactive, distraction-free study operating system:
* **7-Minute Pre-Lecture Primers:** High-yield conceptual prep delivered ahead of every class.
* **Autonomous Mindmaps & Knowledge Trees:** Interactive visual graphs of all core database units.
* **Past Year Exam (PYQ) Vault:** Solved university 10-marker model answers with schema diagrams.
* **One-Click GitHub Publishing:** Exports clean, structured Git markdown repositories (`README.md`, `SYLLABUS.md`, `TIMETABLE.md`).
* **Offline WebAPK PWA:** Progressive Web App with service-worker offline caching and mobile installation.

---

## 🔗 Quick Access Links

| Asset / Endpoint | Direct Link |
| :--- | :--- |
| **🚀 Production Web App** | [https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app) |
| **🛠️ Interactive Dev Environment** | [https://ais-dev-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app](https://ais-dev-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app) |
| **📦 Backend Source ZIP** | [Download `backend-source.zip`](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/backend-source.zip) |
| **📦 Curriculum Repo ZIP** | [Download `syllabus-repo.zip`](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/syllabus-repo.zip) |

---

## 🏛️ System Architecture & Backend Files

The full-stack application is organized into a modular, production-ready structure:

```
├── server.ts                       # Express + Vite backend entry point (Port 3000)
├── src/
│   ├── server/
│   │   ├── routes.ts               # Complete REST API router (/api/*)
│   │   ├── aiProvider.ts           # Gemini SDK & Heuristic parsing engine
│   │   └── githubExporter.ts       # Markdown generation & ZIP packaging
│   ├── types/
│   │   └── index.ts                # TypeScript data interfaces & models
│   ├── components/                 # React frontend views & interactive widgets
│   ├── defaultCurriculum.ts        # Seed academic syllabus & timetables
│   └── App.tsx                     # Main application layout & state coordinator
├── supabase/
│   └── schema.sql                  # PostgreSQL database migration & seed script
├── curriculum-repo/                # Ready-to-push academic GitHub repository scaffold
│   ├── README.md                   # Class knowledge base overview
│   ├── SYLLABUS.md                 # Complete unit breakdown
│   ├── TIMETABLE.md                # Weekly schedule & faculty office hours
│   ├── CONTRIBUTING.md             # Student contribution guidelines
│   └── LICENSE                     # MIT License
└── package.json                    # Project dependencies and npm scripts
```

### Backend Files Overview:
1. **`server.ts`**: Express server that binds to port `3000`, parses JSON request bodies, attaches API routes under `/api`, connects Vite middleware in development, and serves static production builds.
2. **`src/server/routes.ts`**: Implements 18+ endpoints for syllabus progress, AI parsing, PYQ search, mindmaps, timetable schedule, and GitHub ZIP generation.
3. **`src/server/aiProvider.ts`**: Connects to the `@google/genai` TypeScript SDK using `gemini-2.5-flash` with built-in heuristic fallback when offline.
4. **`src/server/githubExporter.ts`**: Converts structured academic metadata into production-grade Markdown files and in-memory zip buffers.
5. **`supabase/schema.sql`**: Production PostgreSQL script containing 6 relational tables, foreign key constraints, indexes, RLS policies, and starter seeds.

---

## 🚀 Step-by-Step Instructions: Run Backend & Connect Supabase

### 1. Prerequisites
Ensure you have installed:
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* A free account on [Supabase](https://supabase.com) (if using Cloud PostgreSQL)

### 2. Download and Extract the Source
Download [`backend-source.zip`](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/backend-source.zip) or clone this repository, then enter the project folder:
```bash
cd syllabus-os
npm install
```

### 3. Set Up Supabase Database (Step-by-Step)
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **"New Project"**, name it (e.g., `syllabus-os-db`), and set a secure database password.
3. Once the database is provisioned (~2 minutes), click on **"SQL Editor"** in the left sidebar.
4. Click **"+ New Query"**.
5. Open the `supabase/schema.sql` file from this project, copy the entire SQL script, paste it into the editor, and click **"Run"**.
6. The query will create:
   * `class_workspaces`
   * `subjects`
   * `units`
   * `topics`
   * `study_materials`
   * `weekly_timetable`
   * Automatic triggers, indexes, and initial seeds for BCA-302.

### 4. Configure Environment Variables
Create a `.env` file in the project root (note: `.env` is deliberately excluded from GitHub uploads to protect secrets):
```bash
PORT=3000
NODE_ENV=development

# Optional: Google Gemini API Key for dynamic syllabus extraction
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Supabase Credentials (if using direct client integration)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
*(Note: If no API key is provided, the backend seamlessly falls back to the embedded heuristic AI parsing engine).*

### 5. Start the Server
Start the unified full-stack server:
```bash
npm run dev
```

### 6. Verify Running Endpoints
* Open your browser: `http://localhost:3000`
* Test the backend health endpoint:
```bash
curl http://localhost:3000/api/health
```
Expected output:
```json
{
  "status": "ok",
  "service": "Classroom Syllabus to GitHub Exporter API"
}
```

---

## 📤 How to Upload & Publish to GitHub

### Option A: Upload Pre-packaged Curriculum Repository (`syllabus-repo.zip`)
1. Download [`syllabus-repo.zip`](https://ais-pre-3lebyttfd3xonbimbkspwq-101135134574.asia-southeast1.run.app/syllabus-repo.zip) and extract it on your computer.
2. Go to [GitHub New Repository](https://github.com/new) and create a repository (e.g. `bca-302-dbms-curriculum`).
3. Click **"uploading an existing file"**, drag all extracted files into GitHub, and click **Commit changes**.

### Option B: Publish using Git CLI
```bash
# In the repository directory:
git init
git add .
git commit -m "feat: initial syllabus, teacher profile, and lecture notes"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

*(Note: Sensitive environment files like `.env` and local caches are ignored to keep secrets safe and repository size small).*

---

## 👨‍🏫 Extracted Faculty & Course Metadata

| Field | Value |
| :--- | :--- |
| **Course Name** | Database Management Systems & Relational Architectures |
| **Course Code** | BCA-302 |
| **Lead Faculty** | **Dr. Rajesh Sharma** (Associate Professor & Head of Database Systems Lab) |
| **Official Email** | [`rajesh.sharma@cs.university.edu`](mailto:rajesh.sharma@cs.university.edu) |
| **Office Location** | Room 402, Block B, Technology Wing |
| **Academic Term** | Semester III (2026-2027) |
| **Credits** | 4.0 Credits (3L + 1T) |

---

## 📅 Lecture & Lab Timetable

| Day | Timings | Room / Venue | Session Type |
| :--- | :--- | :--- | :--- |
| **Monday** | 10:00 AM - 11:30 AM | `Lecture Hall 204` | Theory Lecture |
| **Wednesday** | 11:30 AM - 01:00 PM | `Lecture Hall 204` | Theory Lecture |
| **Friday** | 02:00 PM - 04:00 PM | `Database Systems Lab 3` | Practical / Hands-on Lab |

---

## 📚 Curriculum Units Checklist

### 📌 Unit 1: Data Modeling & Conceptual Database Architecture
- [ ] Three-Schema Database Architecture and Data Independence
- [ ] ER Modeling: Entity Sets, Weak Entities, Multiplicity, Recursive Relationships
- [ ] Enhanced ER (EER): Specialization, Generalization, and Union Types

### 📌 Unit 2: Relational Model, Constraints & Relational Algebra
- [ ] Relational Data Model, Tuple Relational Calculus, Domain Relational Calculus
- [ ] Integrity Constraints: Domain, Key, Entity Integrity, Referential Integrity (Foreign Keys)
- [ ] Relational Algebra Operators: Select, Project, Join, Cartesian Product, Division

### 📌 Unit 3: SQL Mastery & Stored Procedures
- [ ] Complex Subqueries, Correlated Subqueries, Analytical Window Functions
- [ ] Views, Triggers, Assertions, and Transactional Procedures in PL/SQL
- [ ] Indexing Mechanisms: B-Trees, B+ Trees, and Hash Indices

### 📌 Unit 4: Normalization & Schema Refinement
- [ ] Functional Dependencies, Armstrong's Axioms, Attribute Closure Algorithms
- [ ] Normal Forms: 1NF, 2NF, 3NF, Boyce-Codd Normal Form (BCNF)
- [ ] Lossless-Join Decomposition and Dependency Preservation

### 📌 Unit 5: Transactions, Concurrency Control & Recovery
- [ ] ACID Properties and Serializability (Conflict & View Serializability)
- [ ] Concurrency Protocols: Two-Phase Locking (2PL), Strict 2PL, Timestamp Ordering
- [ ] Recovery Subsystems: Write-Ahead Logging (WAL), Checkpoints, ARIES Recovery

---

## ⚖️ License
Distributed under the [MIT License](LICENSE).
