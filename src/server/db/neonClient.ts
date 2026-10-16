import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
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
  SEED_ANNOUNCEMENTS,
  SEED_ASSIGNMENTS,
} from './seedData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  '';

export const isPlaceholder = (val: string): boolean => {
  return (
    !val ||
    val.includes('ep-xyz') ||
    val.includes('your_neon_password') ||
    val.includes('your-neon-database-url') ||
    val.includes('placeholder')
  );
};

export const isNeonConfigured = (): boolean => {
  return Boolean(rawDbUrl && !isPlaceholder(rawDbUrl));
};

export function getNeonSql() {
  if (!isNeonConfigured()) {
    return null;
  }
  return neon(rawDbUrl.trim());
}

/**
 * Test connectivity and verify latency & table setup
 */
export async function testNeonConnection(): Promise<{
  ok: boolean;
  message: string;
  database?: string;
  timestamp?: string;
  latencyMs?: number;
  tables?: string[];
  tableCount?: number;
  details?: any;
}> {
  if (!isNeonConfigured()) {
    return {
      ok: false,
      message:
        'Neon PostgreSQL is not configured. Set DATABASE_URL in your .env file to your Neon connection string.',
    };
  }

  const start = Date.now();
  try {
    const sql = getNeonSql();
    if (!sql) throw new Error('Could not instantiate Neon SQL client');

    const basicResult = await sql`
      SELECT 
        current_database() AS db_name, 
        NOW() AS server_time, 
        version() AS pg_version
    `;

    const latencyMs = Date.now() - start;
    const dbName = basicResult[0]?.db_name || 'unknown';
    const serverTime = basicResult[0]?.server_time || new Date().toISOString();

    // Query tables in public schema
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    const tables = tablesResult.map((t: any) => t.table_name);

    return {
      ok: true,
      message: `Successfully connected to Neon PostgreSQL (${dbName}) in ${latencyMs}ms!`,
      database: dbName,
      timestamp: serverTime,
      latencyMs,
      tables,
      tableCount: tables.length,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Failed to connect to Neon PostgreSQL: ${err.message}`,
      details: err,
    };
  }
}

/**
 * Initialize all Neon tables and optionally seed them with BCA-2028 curriculum
 */
export async function initializeNeonSchema(seed: boolean = true): Promise<{
  ok: boolean;
  message: string;
  tablesCreated: string[];
  seededItems?: Record<string, number>;
}> {
  if (!isNeonConfigured()) {
    throw new Error('DATABASE_URL is not configured in .env');
  }

  const sql = getNeonSql();
  if (!sql) throw new Error('Neon client is unavailable');

  console.log('⚡ Initializing Neon PostgreSQL schema...');

  // 1. Workspaces
  await sql`
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
  `;

  // 2. Subjects
  await sql`
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
  `;

  // 3. Units
  await sql`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 4. Topics
  await sql`
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
  `;

  // 5. Timetable Classes
  await sql`
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
  `;

  // 6. Academic Materials
  await sql`
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
  `;

  // 7. Historical PYQs
  await sql`
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
  `;

  // 8. Exam Datesheets
  await sql`
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
  `;

  // 9. Class Announcements
  await sql`
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
  `;

  // 10. Academic Assignments
  await sql`
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
  `;

  // 11. Classroom Doubts
  await sql`
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
  `;

  // 12. Cached Lessons
  await sql`
    CREATE TABLE IF NOT EXISTS cached_lessons (
      topic_id TEXT PRIMARY KEY,
      class_code TEXT NOT NULL DEFAULT 'BCA-SEM3',
      lesson_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const tablesCreated = [
    'class_workspaces',
    'subjects',
    'units',
    'topics',
    'timetable_classes',
    'academic_materials',
    'historical_pyqs',
    'exam_datesheets',
    'class_announcements',
    'academic_assignments',
    'classroom_doubts',
    'cached_lessons',
  ];

  let seededCounts: Record<string, number> = {};

  if (seed) {
    // Check if class workspace already exists
    const existing = await sql`SELECT id FROM class_workspaces WHERE id = ${SEED_CLASS.id} LIMIT 1`;
    if (existing.length === 0) {
      console.log('🌱 Seeding initial BCA-2028 curriculum data into Neon...');

      // Workspace
      await sql`
        INSERT INTO class_workspaces (
          id, code, name, university, semester, academic_year, member_count, admin_id, verified_by_cr, cr_name, cr_roll_no
        ) VALUES (
          ${SEED_CLASS.id}, ${SEED_CLASS.code}, ${SEED_CLASS.name}, ${SEED_CLASS.university},
          ${SEED_CLASS.semester}, ${SEED_CLASS.academicYear}, ${SEED_CLASS.memberCount},
          ${SEED_CLASS.adminId}, true, 'Class Representative (CR)', 'CR-VERIFIED'
        ) ON CONFLICT (id) DO NOTHING;
      `;
      seededCounts.workspaces = 1;

      // Subjects
      for (const s of SEED_SUBJECTS) {
        await sql`
          INSERT INTO subjects (
            id, class_id, name, code, teacher_name, credits, color, icon_name, total_units, completed_topics_count, total_topics_count
          ) VALUES (
            ${s.id}, ${s.classId}, ${s.name}, ${s.code}, ${s.teacherName}, ${s.credits},
            ${s.color}, ${s.iconName}, ${s.totalUnits}, ${s.completedTopicsCount}, ${s.totalTopicsCount}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.subjects = SEED_SUBJECTS.length;

      // Units & Topics
      let unitCount = 0;
      let topicCount = 0;
      for (const [subId, units] of Object.entries(SEED_UNITS)) {
        for (const u of units) {
          await sql`
            INSERT INTO units (id, subject_id, number, title)
            VALUES (${u.id}, ${subId}, ${u.number}, ${u.title})
            ON CONFLICT (id) DO NOTHING;
          `;
          unitCount++;

          if (Array.isArray(u.topics)) {
            for (let idx = 0; idx < u.topics.length; idx++) {
              const t = u.topics[idx];
              await sql`
                INSERT INTO topics (
                  id, unit_id, subject_id, title, order_index, difficulty, exam_weightage, estimated_minutes, status
                ) VALUES (
                  ${t.id}, ${u.id}, ${subId}, ${t.title}, ${idx + 1},
                  ${t.difficulty || 'Medium'}, ${t.examWeightage || 'Medium'},
                  ${t.estimatedMinutes || 5}, ${t.status || 'not_started'}
                ) ON CONFLICT (id) DO NOTHING;
              `;
              topicCount++;
            }
          }
        }
      }
      seededCounts.units = unitCount;
      seededCounts.topics = topicCount;

      // Timetable
      for (const t of SEED_TIMETABLE) {
        await sql`
          INSERT INTO timetable_classes (
            id, class_id, day, time, subject_id, subject_name, subject_code, room, teacher_name,
            likely_topic_title, likely_topic_confidence, likely_topic_reasoning
          ) VALUES (
            ${t.id}, 'class-bca-2028', ${t.day}, ${t.time}, ${t.subjectId}, ${t.subjectName},
            ${t.subjectCode}, ${t.room}, ${t.teacherName},
            ${t.likelyTopic?.title || null}, ${t.likelyTopic?.confidence || null}, ${t.likelyTopic?.reasoning || null}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.timetable = SEED_TIMETABLE.length;

      // PYQs
      for (const p of SEED_PYQS) {
        await sql`
          INSERT INTO historical_pyqs (
            id, subject_id, subject_name, unit_number, topic_title, year, marks, question,
            model_answer, source, difficulty, is_verified_historical, frequency_count
          ) VALUES (
            ${p.id}, ${p.subjectId}, ${p.subjectName}, ${p.unitNumber}, ${p.topicTitle},
            ${p.year}, ${p.marks}, ${p.question}, ${p.modelAnswer}, ${p.source},
            ${p.difficulty}, ${p.isVerifiedHistorical}, ${p.frequencyCount}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.pyqs = SEED_PYQS.length;

      // Exams
      for (const e of SEED_EXAMS) {
        await sql`
          INSERT INTO exam_datesheets (
            id, class_id, subject_id, subject_name, date, time, exam_type, priority, revision_days_plan
          ) VALUES (
            ${e.id}, ${e.classId}, ${e.subjectId}, ${e.subjectName}, ${e.date}, ${e.time},
            ${e.examType}, ${e.priority}, ${JSON.stringify(e.revisionDaysPlan)}::jsonb
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.exams = SEED_EXAMS.length;

      // Announcements
      for (const a of SEED_ANNOUNCEMENTS) {
        await sql`
          INSERT INTO class_announcements (
            id, class_id, author_name, author_role, title, content, timestamp_text, priority
          ) VALUES (
            ${a.id}, ${a.classId}, ${a.authorName},
            ${a.authorRole === 'teacher' ? 'Faculty' : 'Class Representative'},
            ${a.title}, ${a.content}, ${a.createdAt},
            ${a.badge === 'Teacher Notice' ? 'urgent' : 'normal'}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.announcements = SEED_ANNOUNCEMENTS.length;

      // Assignments
      for (const a of SEED_ASSIGNMENTS) {
        await sql`
          INSERT INTO academic_assignments (
            id, class_id, subject_id, subject_name, title, type, due_date, instructions,
            integrity_mode, assigned_by, presenter_name, roll_number, completed,
            outline_steps, key_references
          ) VALUES (
            ${a.id}, ${a.classId}, ${a.subjectId}, ${a.subjectName}, ${a.title},
            ${a.type || 'assignment'}, ${a.dueDate}, ${a.instructions},
            ${a.integrityMode || 'teach_me'}, ${a.assignedBy || 'Faculty'},
            ${a.presenterName || null}, ${a.rollNumber || null}, ${a.completed || false},
            ${JSON.stringify(a.outlineSteps || [])}::jsonb,
            ${JSON.stringify(a.keyReferences || [])}::jsonb
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
      seededCounts.assignments = SEED_ASSIGNMENTS.length;
    }
  }

  return {
    ok: true,
    message: 'Neon PostgreSQL schema initialized successfully!',
    tablesCreated,
    seededItems: seededCounts,
  };
}
