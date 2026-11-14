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

let cachedSqlInstance: any = null;

export function sanitizeDbError(err: any): Error {
  const msg = String(err?.message || err);
  const sanitized = msg.replace(/postgres(?:ql)?:\/\/[^@]+@/gi, 'postgresql://***:***@');
  const errorObj = new Error(sanitized);
  (errorObj as any).code = err?.code;
  return errorObj;
}

export function getNeonSql() {
  if (!isNeonConfigured()) {
    return null;
  }
  if (!cachedSqlInstance) {
    cachedSqlInstance = neon(rawDbUrl.trim());
  }
  return cachedSqlInstance;
}

/**
 * Execute parameterized SQL query against Neon PostgreSQL with connection pooling, timeout & bounded retry
 */
export async function queryNeon<T = any>(
  queryText: string,
  params: any[] = [],
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T[]> {
  if (!isNeonConfigured()) {
    throw new Error('Neon database is not configured. Set DATABASE_URL in environment.');
  }
  const sql = getNeonSql();
  if (!sql) throw new Error('Neon SQL client is unavailable');

  const timeoutMs = options.timeoutMs || 8000;
  const maxRetries = options.maxRetries ?? 2;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute with timeout race
      const queryPromise = (sql as any).query(queryText, params);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Neon query timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const res = await Promise.race([queryPromise, timeoutPromise]);
      return (res || []) as T[];
    } catch (err: any) {
      lastError = sanitizeDbError(err);
      const isTransient =
        err?.message?.includes('timed out') ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === '57P01' ||
        err?.code === '08006' ||
        err?.code === '08001';

      if (attempt < maxRetries && isTransient) {
        const delay = 150 * Math.pow(2, attempt) + Math.random() * 50;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }

  console.error('[Neon Query Error]', lastError?.message || lastError);
  throw lastError;
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
 * Initialize all Neon tables
 */
export async function initializeNeonSchema(seed: boolean = false): Promise<{
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
      class_code TEXT NOT NULL DEFAULT 'M2029',
      lesson_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 13. AI Knowledge Cache (Cohort Compounding Intelligence)
  await sql`
    CREATE TABLE IF NOT EXISTS ai_knowledge_cache (
      id TEXT PRIMARY KEY,
      normalized_key TEXT NOT NULL,
      query TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      answer TEXT NOT NULL,
      sections JSONB,
      model_used TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      hit_count INTEGER NOT NULL DEFAULT 0,
      tokens_estimated INTEGER NOT NULL DEFAULT 0,
      iteration_count INTEGER NOT NULL DEFAULT 1,
      target_cohort_size INTEGER NOT NULL DEFAULT 60,
      is_cohort_perfected BOOLEAN NOT NULL DEFAULT FALSE,
      perfection_score INTEGER NOT NULL DEFAULT 15,
      perfection_tier TEXT NOT NULL,
      evolution_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      positive_votes INTEGER NOT NULL DEFAULT 0,
      negative_votes INTEGER NOT NULL DEFAULT 0,
      needs_refinement BOOLEAN NOT NULL DEFAULT FALSE,
      is_teacher_curated BOOLEAN NOT NULL DEFAULT FALSE
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_key_subject_mode 
      ON ai_knowledge_cache(normalized_key, subject_name, mode);
  `;

  // Safe incremental column additions for existing tables
  try {
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS download_url TEXT;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS rag_doc_id TEXT;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS extra_metadata JSONB DEFAULT '{}'::jsonb;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;`);
    await (sql as any).query(`ALTER TABLE academic_materials ADD COLUMN IF NOT EXISTS content_hash TEXT;`);
    await (sql as any).query(`ALTER TABLE ai_knowledge_cache ADD COLUMN IF NOT EXISTS contributing_models JSONB DEFAULT '[]'::jsonb;`);
    await (sql as any).query(`ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS embedding_version TEXT DEFAULT 'v1';`);
    await (sql as any).query(`ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS chunk_hash TEXT;`);
  } catch (err: any) {
    console.warn('[Neon Schema Update Notice]', err?.message || err);
  }

  // 14. Document Assets (Deduplicated Physical Objects)
  await sql`
    CREATE TABLE IF NOT EXISTS document_assets (
      sha256_hash TEXT PRIMARY KEY,
      storage_key TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      storage_url TEXT,
      file_size BIGINT NOT NULL,
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      text_fingerprint TEXT,
      page_count INTEGER DEFAULT 1,
      word_count INTEGER DEFAULT 0,
      extracted_summary TEXT,
      table_of_contents JSONB DEFAULT '[]'::jsonb,
      reference_count INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 15. Document Uploads (Student & Classroom Associations and Access Permissions)
  await sql`
    CREATE TABLE IF NOT EXISTS document_uploads (
      id TEXT PRIMARY KEY,
      asset_hash TEXT NOT NULL REFERENCES document_assets(sha256_hash) ON DELETE RESTRICT,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      subject_id TEXT,
      subject_name TEXT NOT NULL,
      topic_id TEXT,
      topic_title TEXT,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      uploader_name TEXT NOT NULL,
      uploader_role TEXT NOT NULL DEFAULT 'student',
      verification_status TEXT NOT NULL DEFAULT 'teacher_verified',
      access_permission TEXT NOT NULL DEFAULT 'class_shared',
      version INTEGER NOT NULL DEFAULT 1,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 16. Document Chunks (RAG Ingestion Chunks in Database)
  await sql`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      asset_hash TEXT NOT NULL REFERENCES document_assets(sha256_hash) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      section_title TEXT,
      page_number INTEGER DEFAULT 1,
      text TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chunk_asset_index 
      ON document_chunks(asset_hash, chunk_index);
  `;

  // 17. Chunk Vector Embeddings (Neon pgvector HNSW Semantic Retrieval)
  try {
    await (sql as any).query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS chunk_embeddings (
        chunk_id TEXT PRIMARY KEY REFERENCES document_chunks(id) ON DELETE CASCADE,
        asset_hash TEXT NOT NULL REFERENCES document_assets(sha256_hash) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'gemini',
        model_name TEXT NOT NULL DEFAULT 'text-embedding-004',
        dimensions INTEGER NOT NULL DEFAULT 768,
        embedding vector(768) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await (sql as any).query(`
      CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_asset_hash 
        ON chunk_embeddings(asset_hash);
    `);
    await (sql as any).query(`
      CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_hnsw 
        ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);
    `);
  } catch (vecErr: any) {
    console.warn('[Neon Vector Schema Notice]', vecErr?.message || vecErr);
  }

  // 18. Knowledge Graph Nodes (Phase 4 Graph RAG)
  await sql`
    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      subject_id TEXT,
      subject_name TEXT NOT NULL DEFAULT 'Computer Science',
      name TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      node_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      unit_number INTEGER,
      source_doc_id TEXT,
      source_asset_hash TEXT REFERENCES document_assets(sha256_hash) ON DELETE SET NULL,
      doc_version INTEGER DEFAULT 1,
      page_number INTEGER,
      section_title TEXT,
      extraction_method TEXT NOT NULL DEFAULT 'curriculum_curated',
      confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_nodes_class_type_canon 
      ON graph_nodes(class_id, node_type, canonical_name);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_class_subj 
      ON graph_nodes(class_id, subject_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_canon 
      ON graph_nodes(canonical_name);
  `;

  // 19. Knowledge Graph Edges (Phase 4 Graph RAG)
  await sql`
    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      subject_id TEXT,
      source_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      source_doc_id TEXT,
      source_asset_hash TEXT REFERENCES document_assets(sha256_hash) ON DELETE SET NULL,
      doc_version INTEGER DEFAULT 1,
      page_number INTEGER,
      section_title TEXT,
      extraction_method TEXT NOT NULL DEFAULT 'curriculum_curated',
      confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      weight NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_edges_unique 
      ON graph_edges(class_id, source_node_id, target_node_id, relationship_type);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_source 
      ON graph_edges(source_node_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_target 
      ON graph_edges(target_node_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_rel_type 
      ON graph_edges(relationship_type);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_graph_edges_class_subj 
      ON graph_edges(class_id, subject_id);
  `;

  // 20. Graph Proposed Changes (Phase 4 Audit Trail & Verification)
  await sql`
    CREATE TABLE IF NOT EXISTS graph_proposed_changes (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      proposed_by TEXT NOT NULL,
      change_type TEXT NOT NULL,
      target_id TEXT,
      proposed_data JSONB NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_proposed_changes_class_status 
      ON graph_proposed_changes(class_id, status);
  `;

  // 21. Student Learning Profiles (Phase 5 Personalization)
  await sql`
    CREATE TABLE IF NOT EXISTS student_learning_profiles (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL DEFAULT 'Student',
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      enrolled_course TEXT NOT NULL DEFAULT 'BCA',
      current_subject_id TEXT,
      current_unit_number INTEGER DEFAULT 1,
      current_topic_id TEXT,
      current_topic_title TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'english',
      learning_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_student_class 
      ON student_learning_profiles(student_id, class_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_student_profiles_class 
      ON student_learning_profiles(class_id);
  `;

  // 22. Student Concept Mastery (Phase 5 Mastery Model)
  await sql`
    CREATE TABLE IF NOT EXISTS student_concept_mastery (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      subject_id TEXT,
      concept_name TEXT NOT NULL,
      canonical_concept TEXT NOT NULL,
      mastery_state TEXT NOT NULL DEFAULT 'NOT_STARTED',
      consecutive_correct_count INTEGER NOT NULL DEFAULT 0,
      total_attempts INTEGER NOT NULL DEFAULT 0,
      total_correct INTEGER NOT NULL DEFAULT 0,
      last_evidence_source TEXT NOT NULL DEFAULT 'ai_tutor_explanation',
      last_evidence_confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.85,
      last_evidence_summary TEXT,
      history JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_concept_mastery_student_concept 
      ON student_concept_mastery(student_id, class_id, canonical_concept);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_state 
      ON student_concept_mastery(student_id, mastery_state);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_concept_mastery_class 
      ON student_concept_mastery(class_id);
  `;

  // 23. Student Practice Attempts (Phase 5 Targeted Practice)
  await sql`
    CREATE TABLE IF NOT EXISTS student_practice_attempts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL REFERENCES class_workspaces(id) ON DELETE CASCADE,
      subject_id TEXT,
      topic_title TEXT NOT NULL,
      concept_name TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_source TEXT NOT NULL DEFAULT 'generated_from_rag',
      source_doc_title TEXT,
      source_page_number INTEGER,
      student_answer TEXT,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      score INTEGER NOT NULL DEFAULT 0,
      feedback TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_class 
      ON student_practice_attempts(student_id, class_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_practice_attempts_concept 
      ON student_practice_attempts(concept_name);
  `;

  // 24. Student BYOK Credentials (AES-256-GCM Encrypted Provider Keys)
  await sql`
    CREATE TABLE IF NOT EXISTS student_byok_credentials (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      masked_key TEXT NOT NULL,
      base_url TEXT,
      allow_fallback BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_byok_student_provider 
      ON student_byok_credentials(student_id, provider);
  `;

  // 25. Student AI Usage Accounting (Per-Student Token & Request Telemetry)
  await sql`
    CREATE TABLE IF NOT EXISTS student_ai_usage (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL DEFAULT 'class-m2029',
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      task_category TEXT NOT NULL DEFAULT 'general_qa',
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      is_provider_reported BOOLEAN NOT NULL DEFAULT true,
      is_success BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_student_time 
      ON student_ai_usage(student_id, created_at);
  `;

  // 26. Shared Classroom Answers (Collective Classroom Intelligence Repository)
  await sql`
    CREATE TABLE IF NOT EXISTS shared_classroom_answers (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL DEFAULT 'M2029',
      institution TEXT DEFAULT 'University',
      course TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      topic TEXT NOT NULL,
      original_question TEXT NOT NULL,
      normalized_key TEXT NOT NULL,
      intent TEXT NOT NULL,
      answer TEXT NOT NULL,
      sections JSONB DEFAULT '{}'::jsonb,
      sources_used JSONB DEFAULT '[]'::jsonb,
      model_used TEXT NOT NULL,
      prompt_version TEXT DEFAULT 'v2.0',
      version INTEGER NOT NULL DEFAULT 1,
      quality_status TEXT NOT NULL DEFAULT 'GENERATED',
      hit_count INTEGER NOT NULL DEFAULT 0,
      tokens_saved INTEGER NOT NULL DEFAULT 0,
      positive_votes INTEGER NOT NULL DEFAULT 0,
      negative_votes INTEGER NOT NULL DEFAULT 0,
      contributor_student_label TEXT DEFAULT 'Student 1',
      parent_question_id TEXT,
      follow_up_question_ids JSONB DEFAULT '[]'::jsonb,
      previous_versions JSONB DEFAULT '[]'::jsonb,
      corrections JSONB DEFAULT '[]'::jsonb,
      audit_trail JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_shared_answers_lookup 
      ON shared_classroom_answers(class_id, normalized_key, quality_status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_shared_answers_subject 
      ON shared_classroom_answers(class_id, subject_name);
  `;

  // 27. Shared Generation Locks (Cross-Instance Safe Concurrent Generation Coordination)
  await sql`
    CREATE TABLE IF NOT EXISTS shared_generation_locks (
      lock_key TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'generating',
      answer_id TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gen_locks_lookup 
      ON shared_generation_locks(class_id, status, expires_at);
  `;

  // 28. Shared Answer Metrics (Defensible Collaborative Learning Analytics)
  await sql`
    CREATE TABLE IF NOT EXISTS shared_answer_metrics (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value NUMERIC NOT NULL DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_shared_metrics_class 
      ON shared_answer_metrics(class_id, metric_type, created_at);
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
    'ai_knowledge_cache',
    'document_assets',
    'document_uploads',
    'document_chunks',
    'chunk_embeddings',
    'graph_nodes',
    'graph_edges',
    'graph_proposed_changes',
    'student_learning_profiles',
    'student_concept_mastery',
    'student_practice_attempts',
    'student_byok_credentials',
    'student_ai_usage',
    'shared_classroom_answers',
    'shared_generation_locks',
    'shared_answer_metrics',
  ];

  let seededCounts: Record<string, number> = {};

  if (seed) {
    // Check if class workspace already exists
    const existing = await sql`SELECT id FROM class_workspaces WHERE id = ${SEED_CLASS.id} LIMIT 1`;
    if (existing.length === 0) {
      console.log('🌱 Seeding initial M2029 curriculum data into Neon...');

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
            ${t.id}, 'class-m2029', ${t.day}, ${t.time}, ${t.subjectId}, ${t.subjectName},
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
