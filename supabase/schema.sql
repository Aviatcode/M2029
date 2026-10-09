-- ====================================================================
-- SyllabusOS - Complete Supabase PostgreSQL Schema & Seed Migration
-- ====================================================================
-- Description: Creates full relational schema, indexes, Row Level Security (RLS)
--              policies, automatic timestamp triggers, and starter seed data
--              for SyllabusOS (BCA Cohort 2028 and subjects).
--
-- How to run:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your Project -> Click "SQL Editor" on the left menu.
-- 3. Click "+ New query", paste this entire script, and click "Run".
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLE 1: class_workspaces
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.class_workspaces (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    university TEXT NOT NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    member_count INTEGER NOT NULL DEFAULT 1,
    admin_id TEXT DEFAULT 'user-admin-1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 2: subjects
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    color TEXT NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
    icon_name TEXT NOT NULL DEFAULT 'BookOpen',
    total_units INTEGER NOT NULL DEFAULT 4,
    completed_topics_count INTEGER NOT NULL DEFAULT 0,
    total_topics_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 3: units
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.units (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 4: topics
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.topics (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    exam_weightage TEXT NOT NULL DEFAULT 'Medium',
    estimated_minutes INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'learning', 'strong')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 5: timetable_classes
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.timetable_classes (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    time TEXT NOT NULL,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    room TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    likely_topic_title TEXT,
    likely_topic_confidence INTEGER,
    likely_topic_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 6: academic_materials
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.academic_materials (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
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

-- ====================================================================
-- TABLE 7: historical_pyqs
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.historical_pyqs (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    unit_number INTEGER NOT NULL DEFAULT 1,
    topic_title TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2024,
    marks INTEGER NOT NULL DEFAULT 10,
    question TEXT NOT NULL,
    model_answer TEXT NOT NULL,
    source TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    is_verified_historical BOOLEAN NOT NULL DEFAULT true,
    frequency_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 8: exam_datesheets
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.exam_datesheets (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT 'End-Term',
    priority TEXT NOT NULL DEFAULT 'High Priority',
    revision_days_plan JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 9: class_announcements
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.class_announcements (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'Class Representative',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp_text TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'info')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 10: academic_assignments
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.academic_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES public.class_workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 11: app_notifications
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp_text TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    type TEXT NOT NULL DEFAULT 'schedule' CHECK (type IN ('schedule', 'upload', 'exam', 'ai')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_units_subject_id ON public.units(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_unit_id ON public.topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON public.timetable_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON public.academic_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyqs_subject_id ON public.historical_pyqs(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exam_datesheets(class_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
-- Enable Row Level Security on all tables
ALTER TABLE public.class_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_pyqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_datesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous clients
CREATE POLICY "Public Read Class Workspaces" ON public.class_workspaces FOR SELECT USING (true);
CREATE POLICY "Public Read Subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public Read Units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Public Read Topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Public Read Timetable" ON public.timetable_classes FOR SELECT USING (true);
CREATE POLICY "Public Read Materials" ON public.academic_materials FOR SELECT USING (true);
CREATE POLICY "Public Read PYQs" ON public.historical_pyqs FOR SELECT USING (true);
CREATE POLICY "Public Read Exams" ON public.exam_datesheets FOR SELECT USING (true);
CREATE POLICY "Public Read Announcements" ON public.class_announcements FOR SELECT USING (true);
CREATE POLICY "Public Read Assignments" ON public.academic_assignments FOR SELECT USING (true);
CREATE POLICY "Public Read Notifications" ON public.app_notifications FOR SELECT USING (true);

-- Allow authenticated or public insert/update/delete for workspace management
CREATE POLICY "Public Modify Class Workspaces" ON public.class_workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Topics" ON public.topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Timetable" ON public.timetable_classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Materials" ON public.academic_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify PYQs" ON public.historical_pyqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Exams" ON public.exam_datesheets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Announcements" ON public.class_announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Assignments" ON public.academic_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Modify Notifications" ON public.app_notifications FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED DATA INSERTION (BCA Batch of 2028 Workspace & Subjects)
-- ====================================================================

-- 1. Insert Class Workspace
INSERT INTO public.class_workspaces (id, code, name, university, semester, academic_year, member_count, admin_id)
VALUES (
    'class-bca-2028',
    'BCA-2028',
    'BCA Batch of 2028',
    'University School of Information Technology',
    3,
    '2026-2027',
    64,
    'user-admin-1'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Subjects
INSERT INTO public.subjects (id, class_id, name, code, teacher_name, credits, color, icon_name, total_units, completed_topics_count, total_topics_count)
VALUES 
    ('sub-java', 'class-bca-2028', 'Java Programming', 'BCA-301', 'Prof. Sharma', 4, 'from-amber-500 to-orange-600', 'Coffee', 4, 8, 16),
    ('sub-dbms', 'class-bca-2028', 'Database Management Systems', 'BCA-302', 'Dr. Neha Verma', 4, 'from-blue-500 to-cyan-600', 'Database', 4, 10, 18),
    ('sub-web', 'class-bca-2028', 'Web Development', 'BCA-303', 'Prof. Ankit Mehra', 3, 'from-emerald-500 to-teal-600', 'Globe', 4, 6, 14),
    ('sub-os', 'class-bca-2028', 'Operating Systems', 'BCA-304', 'Dr. K.R. Rao', 4, 'from-purple-500 to-indigo-600', 'Cpu', 4, 7, 16),
    ('sub-cn', 'class-bca-2028', 'Computer Networks', 'BCA-305', 'Prof. Sunita Rao', 3, 'from-rose-500 to-pink-600', 'Network', 4, 4, 15)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Units
INSERT INTO public.units (id, subject_id, number, title)
VALUES
    ('unit-dbms-1', 'sub-dbms', 1, 'Unit 1: Relational Model & ER Design'),
    ('unit-dbms-2', 'sub-dbms', 2, 'Unit 2: Relational Calculus & Normalization'),
    ('unit-dbms-3', 'sub-dbms', 3, 'Unit 3: Transaction Processing & Concurrency'),
    ('unit-java-1', 'sub-java', 1, 'Unit 1: OOP Paradigms & JVM Architecture'),
    ('unit-java-2', 'sub-java', 2, 'Unit 2: Inheritance, Polymorphism & Interfaces'),
    ('unit-os-1', 'sub-os', 1, 'Unit 1: OS Principles, Processes & Threads'),
    ('unit-os-2', 'sub-os', 2, 'Unit 2: CPU Scheduling & Synchronization')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Topics
INSERT INTO public.topics (id, unit_id, subject_id, title, order_index, difficulty, exam_weightage, estimated_minutes, status)
VALUES
    ('topic-dbms-er', 'unit-dbms-1', 'sub-dbms', 'Entity Relationship (ER) & Extended ER Modeling', 1, 'Medium', 'Must Read (10 Marks)', 5, 'strong'),
    ('topic-dbms-relalg', 'unit-dbms-1', 'sub-dbms', 'Relational Algebra: Select, Project, Join & Set Operations', 2, 'Hard', 'Must Read (10 Marks)', 7, 'strong'),
    ('topic-dbms-norm', 'unit-dbms-2', 'sub-dbms', 'Normalization (1NF, 2NF, 3NF, BCNF) & Lossless Join', 1, 'Hard', 'Must Read (10 Marks)', 8, 'strong'),
    ('topic-dbms-acid', 'unit-dbms-3', 'sub-dbms', 'ACID Properties & Transaction State Diagram', 1, 'Medium', 'Must Read (10 Marks)', 5, 'learning'),
    ('topic-dbms-2pl', 'unit-dbms-3', 'sub-dbms', 'Two-Phase Locking (2PL) Protocol & Serializability', 2, 'Hard', 'High', 6, 'not_started'),
    ('topic-java-jvm', 'unit-java-1', 'sub-java', 'JVM, JRE, JDK & Bytecode Execution Mechanism', 1, 'Easy', 'Medium', 4, 'strong'),
    ('topic-java-classes', 'unit-java-1', 'sub-java', 'Classes, Objects, Constructors & this Keyword', 2, 'Easy', 'High', 5, 'strong'),
    ('topic-java-inheritance', 'unit-java-2', 'sub-java', 'Inheritance: Types, super Keyword & Method Overriding', 1, 'Medium', 'Must Read (10 Marks)', 6, 'learning'),
    ('topic-java-interfaces', 'unit-java-2', 'sub-java', 'Abstract Classes vs Interfaces & Multiple Inheritance', 2, 'Hard', 'Must Read (10 Marks)', 7, 'not_started')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Timetable Classes
INSERT INTO public.timetable_classes (id, class_id, day, time, subject_id, subject_name, subject_code, room, teacher_name, likely_topic_title, likely_topic_confidence, likely_topic_reasoning)
VALUES
    ('tt-1', 'class-bca-2028', 'Monday', '09:00 AM - 10:00 AM', 'sub-dbms', 'Database Management Systems', 'BCA-302', 'Lab 3 (Ground Floor)', 'Dr. Neha Verma', 'BCNF Decomposition & Lossless Join Check', 94, 'Carried forward from Friday lecture on 3NF anomalies.'),
    ('tt-2', 'class-bca-2028', 'Monday', '10:15 AM - 11:15 AM', 'sub-java', 'Java Programming', 'BCA-301', 'LH-104 (1st Floor)', 'Prof. Sharma', 'Multiple Inheritance via Interfaces & Default Methods', 88, 'Abstract classes finished on Thursday.'),
    ('tt-3', 'class-bca-2028', 'Tuesday', '09:00 AM - 10:00 AM', 'sub-os', 'Operating Systems', 'BCA-304', 'LH-201', 'Dr. K.R. Rao', 'Round Robin & Multilevel Queue Scheduling Algorithms', 92, 'FCFS and SJF numerical covered last session.'),
    ('tt-4', 'class-bca-2028', 'Wednesday', '10:15 AM - 11:15 AM', 'sub-web', 'Web Development', 'BCA-303', 'Computer Lab 2', 'Prof. Ankit Mehra', 'JavaScript Promises, Async/Await & Fetch API', 90, 'DOM manipulation assignments completed.')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Historical PYQs
INSERT INTO public.historical_pyqs (id, subject_id, subject_name, unit_number, topic_title, year, marks, question, model_answer, source, difficulty, is_verified_historical, frequency_count)
VALUES
    ('pyq-1', 'sub-dbms', 'Database Management Systems', 1, 'ER Modeling & Relational Reduction', 2024, 10, 'Draw an ER diagram for a Hospital Management System showing Entities, Weak Entities, and Cardinalities. Explain step-by-step reduction to relational tables.', 'Identify Patient, Doctor, Treatment, Room entities. Mark Admission as weak entity. Map 1:N relations by placing primary key of 1 side into foreign key of N side. Create join table for M:N.', 'University End-Term Paper Dec 2024', 'Medium', true, 5),
    ('pyq-2', 'sub-dbms', 'Database Management Systems', 2, 'Normalization & Lossless Join', 2024, 10, 'What is functional dependency? Explain 1NF, 2NF, and 3NF with suitable student database examples.', 'Provide precise definition of FD. Walk through unnormalized tables with repeating groups to 1NF (atomic values), 2NF (remove partial dependencies), and 3NF (remove transitive dependencies).', 'University End-Term Paper May 2024', 'Medium', true, 4),
    ('pyq-3', 'sub-dbms', 'Database Management Systems', 3, 'ACID Properties of Transactions', 2024, 10, 'Explain the ACID properties of a database transaction. How does the DBMS ensure Atomicity and Durability during system crashes?', 'Atomicity (All-or-Nothing via undo logging/WAL), Consistency (Integrity constraints), Isolation (Concurrency control/locking), Durability (Redo logging in non-volatile storage). Draw state diagram.', 'University End-Term Paper Dec 2024', 'Medium', true, 3),
    ('pyq-4', 'sub-java', 'Java Programming', 2, 'Inheritance & Dynamic Binding', 2024, 10, 'What is dynamic method dispatch? Explain how run-time polymorphism is achieved in Java using inheritance and abstract classes.', 'Dynamic method dispatch is the mechanism by which a call to an overridden method is resolved at runtime rather than compile time. Demonstrate with Figure base class and Rectangle/Triangle subclasses overriding area().', 'BCA Semester III Exam 2024', 'Medium', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Exam Datesheets
INSERT INTO public.exam_datesheets (id, class_id, subject_id, subject_name, date, time, exam_type, priority, revision_days_plan)
VALUES
    ('exam-1', 'class-bca-2028', 'sub-dbms', 'Database Management Systems', '2026-11-14', '10:00 AM - 01:00 PM', 'End-Term', 'High Priority', '[{"dayNumber": 1, "title": "ER Diagrams & Relational Algebra", "completed": true}, {"dayNumber": 2, "title": "Functional Dependencies & Normalization", "completed": false}, {"dayNumber": 3, "title": "ACID Properties & Concurrency", "completed": false}]'::jsonb),
    ('exam-2', 'class-bca-2028', 'sub-java', 'Java Programming', '2026-11-20', '10:00 AM - 01:00 PM', 'End-Term', 'Medium Priority', '[{"dayNumber": 1, "title": "JVM Architecture & Basics", "completed": false}, {"dayNumber": 2, "title": "Inheritance & Interfaces", "completed": false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Class Announcements
INSERT INTO public.class_announcements (id, class_id, author_name, author_role, title, content, timestamp_text, priority)
VALUES
    ('ann-1', 'class-bca-2028', 'Dr. Neha Verma', 'Faculty Coordinator', 'DBMS Mid-Term Lab Evaluation on Friday', 'All students must bring signed practical files containing experiments 1 through 6. Lab evaluation starts sharp at 9:00 AM.', '2 hours ago', 'urgent'),
    ('ann-2', 'class-bca-2028', 'Aarav Malhotra', 'Class Representative (CR)', 'Teacher PPTs & PYQ Compilations uploaded', 'Uploaded Unit 2 verified slides and past 5 years question papers for DBMS and Java.', 'Yesterday', 'normal')
ON CONFLICT (id) DO NOTHING;
