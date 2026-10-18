# 🎓 M2029 — Academic Operating System & Autonomous AI Companion

[![Live Web Application](https://img.shields.io/badge/Live_App-M2029_PWA-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://aviatcode.github.io/M2029/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Aviatcode%2FM2029-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Aviatcode/M2029)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8.x-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Neon Database](https://img.shields.io/badge/Database-Neon_Serverless_PostgreSQL-00e599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)](LICENSE)

> 🌐 **Live Application:** [https://aviatcode.github.io/M2029/](https://aviatcode.github.io/M2029/)  
> 📦 **GitHub Repository:** [https://github.com/Aviatcode/M2029](https://github.com/Aviatcode/M2029)

**M2029** is a high-performance academic operating system and intelligent AI study companion built specifically for computer engineering and computer science university students. It bridges the gap between chaotic college curricula and top exam performance by delivering one-by-one syllabus topic mastery, intuitive Hinglish mental models, university 10-marker answer sheet schemes, interactive Gantt charts, and persistent zero-token classroom knowledge recall.

---

## 🌟 Key Features

### 🧠 1. Academic AI Companion (Guided Syllabus & 6-Stage Reference)
- **1-by-1 Guided Syllabus Progression**: Follows official university syllabi sequentially. Topic-by-topic guidance eliminates cognitive overwhelm.
- **💡 Hinglish Intuition (Exam Mental Models)**: Complex engineering concepts explained in authentic student Hinglish (*"Dekho bhai, seedhi baat hai..."*) with zero jargon.
- **👶 Real-World ELI9 Analogies**: Abstract operating systems, concurrency, and database concepts explained using relatable everyday analogies (cafeteria lines, traffic signals, hospital ER triage).
- **📝 10-Marker University Answer Blueprint**: Strict Section-C layout formatted for examiners: Definition, ASCII architectural schematics, step-by-step working mechanisms, code implementations, and gotchas.
- **📊 Interactive CPU Scheduling Gantt Charts**: Dynamic visual timelines for FCFS, SJF, SRTF, and Round Robin algorithms with animated process execution and completion calculations.
- **⚡ Quick Check Concept Evaluations**: Embedded interactive multiple-choice checkpoints with instant feedback and automatic advancement.

### 🔌 2. Universal Multi-Model Engine (Bring Your Own Key)
Switch models on the fly with live visual confirmation in the desk header:
- **Google Gemini**: `gemini-2.0-flash` (recommended), `gemini-1.5-flash`, `gemini-1.5-pro`.
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`.
- **Anthropic Claude**: `claude-3-5-sonnet`, `claude-3-7-sonnet`.
- **DeepSeek AI**: `deepseek-chat` (V3), `deepseek-reasoner` (R1).
- **Groq Cloud**: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b` (300+ tokens/sec).
- **OpenRouter**: Unified access to 100+ open-source and proprietary foundation models.
- **Local Ollama / LM Studio**: 100% private, free local inference (`http://localhost:11434`).
- **Simulated Sandbox**: Offline test mode with academic curriculum simulation.
- **Live Regeneration**: One-click `Regenerate Live` button to instantly re-synthesize any syllabus topic or study guide with your currently active model.

### ⚡ 3. Zero-Token Classroom Knowledge Base (Persistent Disk Recall)
- **Learn Once, Store Forever**: When any student asks a doubt or explores a syllabus topic, the response is semantically indexed and persisted to disk.
- **Repeating Query Bypass**: Subsequent queries for the same concept are fetched instantly with **0 tokens consumed** and **0 latency**.
- **Real-Time Token Savings**: Header badge tracks total classroom queries served and estimated tokens saved.

### 📋 4. Smart Syllabus & Notes Dump
- **Multi-Format Ingestion**: Upload or paste raw teacher PPT slides, syllabus PDFs, handwritten notes, or messy unformatted text.
- **Intelligent Entity Extraction**: Automatically extracts course codes, instructor information, weekly schedules, credit hours, and exam dates.
- **Unit & Topic Breakdown**: Assigns exam weightage, difficulty ratings, and recommended study durations.

### ⏰ 5. Timetable & Pre-Lecture Primers
- **7-Minute Pre-Lecture Primers**: High-yield conceptual briefings generated automatically for tomorrow's scheduled classes.
- **Attendance & Classroom Schedule**: Weekly lecture and lab timetable with venue mapping, faculty details, and attendance tracking.

### 📱 6. Offline-First PWA & Web Share Target
- **Installable PWA**: Installable on Windows, macOS, Android, and iOS via browser prompts.
- **Offline Resilience**: Service worker precaches application assets and study materials via Workbox.
- **Native Web Share Target**: Share lecture PDFs or study notes directly into M2029 from WhatsApp, Telegram, or file managers.

### ☁️ 7. Neon Serverless PostgreSQL Database
- **Enterprise Relational Storage**: Powered by Neon Serverless PostgreSQL (12 relational tables with foreign keys, indexes, and constraints).
- **Automated Midnight Sync**: Scheduled automated background sync verifies and persists local academic workspace updates to the cloud database.

---

## 🏛️ Project Architecture

```
M2029/
├── server.ts                       # Express + TSX full-stack server (Port 3000)
├── index.html                      # HTML5 entry point with PWA manifest links
├── package.json                    # Project dependencies & build scripts
├── vite.config.ts                  # Vite 8 config with PWA & React plugins
├── dist/                           # Production client bundle
├── docs/                           # GitHub Pages deployment build (Live PWA)
├── curriculum-repo/                # Shared classroom repository & persistent cache
│   ├── .ai_knowledge_cache.json    # Persistent learned topic cache (0-tokens)
│   ├── README.md                   # Class knowledge base documentation
│   └── SYLLABUS.md                 # Full unit syllabus checklist
├── src/
│   ├── server/
│   │   ├── routes.ts               # Core REST API router (/api/ai-tutor/*, /api/db/*)
│   │   ├── autoSyncService.ts      # Automated daily curriculum sync daemon
│   │   ├── ai/
│   │   │   ├── provider.ts         # UniversalAIProvider & AIProviderFactory
│   │   │   ├── aiKnowledgeCache.ts # Semantic normalization & persistent disk cache
│   │   │   └── academicKnowledgeBank.ts # Gold-standard 170-turn curriculum bank
│   │   └── db/
│   │       ├── neonClient.ts       # Neon Serverless PostgreSQL connection manager
│   │       └── seedData.ts         # Initial academic workspace seed dataset
│   ├── utils/
│   │   ├── aiModelService.ts       # Client model presets, API key storage & helpers
│   │   ├── dbSyncService.ts        # Client database sync coordination
│   │   └── shareTargetService.ts   # PWA Web Share Target handler
│   ├── components/
│   │   ├── AITutorView.tsx         # Guided syllabus chat & 6-stage reference desk
│   │   ├── AIKeyConfigModal.tsx    # Multi-provider model configuration modal
│   │   ├── SmartDumpView.tsx       # Syllabus & raw notes extractor
│   │   ├── ConceptCheckQuiz.tsx    # Diagnostic interactive quizzes
│   │   ├── AssignmentsView.tsx     # Student task tracker & rubrics
│   │   └── tutor/
│   │       ├── GanttChartWidget.tsx# CPU scheduling animated Gantt chart
│   │       └── QuickCheckCard.tsx  # Concept check MCQ interactive widget
│   ├── defaultCurriculum.ts        # Fallback curriculum and timetable data
│   ├── App.tsx                     # Main application view coordinator & navigation
│   └── main.tsx                    # React 19 root entry point
└── public/
    ├── manifest.json               # Web App Manifest
    └── sw-share-target.js          # Service worker share target listener
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **npm**: `v9.0.0` or higher
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/Aviatcode/M2029.git
cd M2029
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables (Optional)
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development

# Optional: Server-wide class shared AI key (Gemini, OpenAI, Groq, or Claude)
AI_API_KEY=your_shared_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Neon Serverless PostgreSQL Connection String
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-PROJECT.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

*(Note: Personal API keys can be entered directly in the frontend UI via the Model & API Key modal without modifying `.env`).*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build Production Bundle
```bash
npm run build
```
The compiled assets will be created in `dist/`.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/ai-tutor/step` | Progress through guided syllabus topics, evaluate quick checks, or request live remediation (ELI9, Hinglish) |
| `POST` | `/api/ai-tutor/ask` | 6-stage reference guide generator (Simple, ELI9, Hinglish, 10-Marker, Deep Dive, Quiz Me) |
| `GET` | `/api/ai-tutor/tracks` | Returns available syllabus tracks (e.g. CPU Scheduling, Process Sync, Deadlocks) |
| `POST` | `/api/ai/test` | Live connection & latency test for any user-provided API key or custom endpoint |
| `GET` | `/api/ai/config` | Returns active server class model status and provider name |
| `POST` | `/api/ai/config` | Updates default class model configuration (for course admins / CRs) |
| `GET` | `/api/ai/cache/stats` | Returns zero-token cache metrics (total learned lessons, total hits, estimated tokens saved) |
| `GET` | `/api/curriculum` | Fetches active semester curriculum, subjects, units, and timetable |
| `POST` | `/api/curriculum/sync` | Pushes client curriculum modifications to Neon PostgreSQL |
| `POST` | `/api/curriculum/extract` | AI extraction pipeline for raw notes and syllabus text dumps |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | React 19, TypeScript, Vite 8, TailwindCSS v4 |
| **Icons & Animation** | Lucide React, Motion, Canvas Confetti |
| **Backend & Routing** | Node.js, Express, TSX, REST API |
| **AI Providers** | Google GenAI SDK (`gemini-2.0-flash`), OpenAI API, Anthropic Messages API, Groq Cloud, DeepSeek, OpenRouter, Ollama |
| **Caching Engine** | File-backed Persistent JSON Cache with semantic stop-word query normalization |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`), Supabase client support |
| **PWA & Offline** | Vite Plugin PWA, Workbox, Web App Manifest, Web Share Target API |

---

## 🤝 Contributing

Contributions to improve M2029 for college students are welcome!
1. Fork the Project (`https://github.com/Aviatcode/M2029/fork`)
2. Create your Feature Branch (`git checkout -b feat/amazing-feature`)
3. Commit your Changes (`git commit -m "feat: add amazing feature"`)
4. Push to the Branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for details.
