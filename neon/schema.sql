-- ====================================================================
-- SyllabusOS - Neon Serverless PostgreSQL Schema & Migration
-- ====================================================================
-- Compatible with Neon Serverless Postgres (https://neon.tech)
-- Runs either via Neon Console SQL Editor or automatic initialization
-- ====================================================================

-- 1. Class Workspaces
CREATE TABLE IF NOT EXISTS class_workspaces (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    university TEXT NOT NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    member_count INTEGER NOT NULL DEFAULT 1,
    admin_id TEXT DEFAULT 'user-admin-self',
    verified_by_cr BOOLEAN DEFAULT true,
    cr_name TEXT DEFAULT 'Class Representative (CR)',
    cr_roll_no TEXT DEFAULT 'CR-VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 4,
    color TEXT NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
    icon_name TEXT NOT NULL DEFAULT 'BookOpen',
    total_units INTEGER NOT NULL DEFAULT 4,
    completed_topics_count INTEGER NOT NULL DEFAULT 0,
    total_topics_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Units
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Topics
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    exam_weightage TEXT NOT NULL DEFAULT 'Medium',
    estimated_minutes INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'not_started',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Timetable Classes
CREATE TABLE IF NOT EXISTS timetable_classes (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    room TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    likely_topic_title TEXT,
    likely_topic_confidence INTEGER,
    likely_topic_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Academic Materials
CREATE TABLE IF NOT EXISTS academic_materials (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    topic_id TEXT,
    topic_title TEXT,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    file_size TEXT NOT NULL DEFAULT '1.0 MB',
    uploader_name TEXT NOT NULL DEFAULT 'Faculty',
    uploader_role TEXT NOT NULL DEFAULT 'teacher',
    verification_status TEXT NOT NULL DEFAULT 'teacher_verified',
    resources_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Historical PYQs
CREATE TABLE IF NOT EXISTS historical_pyqs (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    unit_number INTEGER NOT NULL DEFAULT 1,
    topic_title TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2024,
    marks INTEGER NOT NULL DEFAULT 10,
    question TEXT NOT NULL,
    model_answer TEXT NOT NULL,
    source TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    is_verified_historical BOOLEAN NOT NULL DEFAULT true,
    frequency_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Exam Datesheets
CREATE TABLE IF NOT EXISTS exam_datesheets (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT 'End-Term',
    priority TEXT NOT NULL DEFAULT 'High Priority',
    revision_days_plan JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Class Announcements
CREATE TABLE IF NOT EXISTS class_announcements (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'Class Representative',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp_text TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Academic Assignments & PPT Rosters
CREATE TABLE IF NOT EXISTS academic_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'assignment',
    due_date TEXT NOT NULL,
    instructions TEXT,
    integrity_mode TEXT DEFAULT 'teach_me',
    assigned_by TEXT DEFAULT 'Faculty',
    presenter_name TEXT,
    roll_number TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    outline_steps JSONB DEFAULT '[]'::jsonb,
    key_references JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Classroom Doubts & Questions
CREATE TABLE IF NOT EXISTS classroom_doubts (
    id TEXT PRIMARY KEY,
    class_code TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Cached Lessons (AI-generated lessons saved to avoid duplicate API calls)
CREATE TABLE IF NOT EXISTS cached_lessons (
    topic_id TEXT PRIMARY KEY,
    class_code TEXT NOT NULL DEFAULT 'BCA-SEM3',
    lesson_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_neon_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_units_subject_id ON units(subject_id);
CREATE INDEX IF NOT EXISTS idx_neon_topics_unit_id ON topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_neon_timetable_class_id ON timetable_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_materials_class_id ON academic_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_pyqs_subject_id ON historical_pyqs(subject_id);
CREATE INDEX IF NOT EXISTS idx_neon_exams_class_id ON exam_datesheets(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_announcements_class_id ON class_announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_assignments_class_id ON academic_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_neon_doubts_class_code ON classroom_doubts(class_code);
