import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  SEED_CLASS,
  SEED_SUBJECTS,
  SEED_UNITS,
  SEED_TIMETABLE,
  SEED_MATERIALS,
  SEED_PYQS,
  SEED_EXAMS,
  SEED_ANNOUNCEMENTS,
  SEED_NOTIFICATIONS,
  SEED_ASSIGNMENTS,
} from '../src/server/db/seedData.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

async function main() {
  console.log('🔄 ==============================================');
  console.log('🚀 SyllabusOS -> Supabase Data Migration & Push');
  console.log('==============================================');

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('your-project-id') ||
    supabaseKey.includes('your-anon-public-key') ||
    supabaseKey.includes('your-service-role-key')
  ) {
    console.error('❌ Error: Supabase credentials are missing or set to placeholders in .env');
    console.error('   Please configure SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('   Then ensure supabase/schema.sql has been executed in your Supabase SQL editor.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Supabase URL: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Push Class Workspace
    console.log('\n📦 1. Upserting Class Workspace...');
    const { error: classErr } = await client.from('class_workspaces').upsert({
      id: SEED_CLASS.id,
      code: SEED_CLASS.code,
      name: SEED_CLASS.name,
      university: SEED_CLASS.university,
      semester: SEED_CLASS.semester,
      academic_year: SEED_CLASS.academicYear,
      member_count: SEED_CLASS.memberCount,
      admin_id: SEED_CLASS.adminId,
    });
    if (classErr) throw new Error(`class_workspaces failed: ${classErr.message}`);
    console.log(`   ✓ Class Workspace "${SEED_CLASS.name}" (${SEED_CLASS.code}) synced.`);

    // 2. Push Subjects
    console.log('\n📚 2. Upserting Subjects...');
    const subjectRows = SEED_SUBJECTS.map((s) => ({
      id: s.id,
      class_id: s.classId,
      name: s.name,
      code: s.code,
      teacher_name: s.teacherName,
      credits: s.credits,
      color: s.color,
      icon_name: s.iconName,
      total_units: s.totalUnits,
      completed_topics_count: s.completedTopicsCount,
      total_topics_count: s.totalTopicsCount,
    }));
    const { error: subErr } = await client.from('subjects').upsert(subjectRows);
    if (subErr) throw new Error(`subjects failed: ${subErr.message}`);
    console.log(`   ✓ ${subjectRows.length} Subjects synced.`);

    // 3. Push Units and Topics
    console.log('\n📑 3. Upserting Units & Topics...');
    const unitRows: any[] = [];
    const topicRows: any[] = [];

    for (const [subId, units] of Object.entries(SEED_UNITS)) {
      units.forEach((u: any) => {
        unitRows.push({
          id: u.id,
          subject_id: subId,
          number: u.number,
          title: u.title,
        });

        if (Array.isArray(u.topics)) {
          u.topics.forEach((t: any, idx: number) => {
            topicRows.push({
              id: t.id,
              unit_id: u.id,
              subject_id: subId,
              title: t.title,
              order_index: idx + 1,
              difficulty: t.difficulty || 'Medium',
              exam_weightage: t.examWeightage || 'Medium',
              estimated_minutes: t.estimatedMinutes || 5,
              status: t.status || 'not_started',
            });
          });
        }
      });
    }

    if (unitRows.length > 0) {
      const { error: unitErr } = await client.from('units').upsert(unitRows);
      if (unitErr) throw new Error(`units failed: ${unitErr.message}`);
      console.log(`   ✓ ${unitRows.length} Units synced.`);
    }

    if (topicRows.length > 0) {
      const { error: topicErr } = await client.from('topics').upsert(topicRows);
      if (topicErr) throw new Error(`topics failed: ${topicErr.message}`);
      console.log(`   ✓ ${topicRows.length} Topics synced.`);
    }

    // 4. Push Timetable Classes
    console.log('\n🕒 4. Upserting Timetable Classes...');
    const timetableRows = SEED_TIMETABLE.map((t) => ({
      id: t.id,
      class_id: 'class-bca-2028',
      day: t.day,
      time: t.time,
      subject_id: t.subjectId,
      subject_name: t.subjectName,
      subject_code: t.subjectCode,
      room: t.room,
      teacher_name: t.teacherName,
      likely_topic_title: t.likelyTopic?.title || null,
      likely_topic_confidence: t.likelyTopic?.confidence || null,
      likely_topic_reasoning: t.likelyTopic?.reasoning || null,
    }));
    const { error: ttErr } = await client.from('timetable_classes').upsert(timetableRows);
    if (ttErr) throw new Error(`timetable_classes failed: ${ttErr.message}`);
    console.log(`   ✓ ${timetableRows.length} Timetable classes synced.`);

    // 5. Push Historical PYQs
    console.log('\n📜 5. Upserting Historical PYQs...');
    const pyqRows = SEED_PYQS.map((p) => ({
      id: p.id,
      subject_id: p.subjectId,
      subject_name: p.subjectName,
      unit_number: p.unitNumber,
      topic_title: p.topicTitle,
      year: p.year,
      marks: p.marks,
      question: p.question,
      model_answer: p.modelAnswer,
      source: p.source,
      difficulty: p.difficulty,
      is_verified_historical: p.isVerifiedHistorical,
      frequency_count: p.frequencyCount,
    }));
    const { error: pyqErr } = await client.from('historical_pyqs').upsert(pyqRows);
    if (pyqErr) throw new Error(`historical_pyqs failed: ${pyqErr.message}`);
    console.log(`   ✓ ${pyqRows.length} Historical PYQs synced.`);

    // 6. Push Exam Datesheets
    console.log('\n🎯 6. Upserting Exam Datesheets...');
    const examRows = SEED_EXAMS.map((e) => ({
      id: e.id,
      class_id: e.classId,
      subject_id: e.subjectId,
      subject_name: e.subjectName,
      date: e.date,
      time: e.time,
      exam_type: e.examType,
      priority: e.priority,
      revision_days_plan: e.revisionDaysPlan,
    }));
    const { error: examErr } = await client.from('exam_datesheets').upsert(examRows);
    if (examErr) throw new Error(`exam_datesheets failed: ${examErr.message}`);
    console.log(`   ✓ ${examRows.length} Exam Datesheet entries synced.`);

    // 7. Push Announcements
    console.log('\n📢 7. Upserting Announcements...');
    const annRows = SEED_ANNOUNCEMENTS.map((a) => ({
      id: a.id,
      class_id: a.classId,
      author_name: a.authorName,
      author_role: a.authorRole === 'teacher' ? 'Faculty' : 'Class Representative',
      title: a.title,
      content: a.content,
      timestamp_text: a.createdAt,
      priority: a.badge === 'Teacher Notice' ? 'urgent' : 'normal',
    }));
    const { error: annErr } = await client.from('class_announcements').upsert(annRows);
    if (annErr) throw new Error(`class_announcements failed: ${annErr.message}`);
    console.log(`   ✓ ${annRows.length} Announcements synced.`);

    // 8. Push Assignments
    console.log('\n📝 8. Upserting Assignments...');
    const assignRows = SEED_ASSIGNMENTS.map((a) => ({
      id: a.id,
      class_id: a.classId,
      subject_id: a.subjectId,
      subject_name: a.subjectName,
      title: a.title,
      due_date: a.dueDate,
      points: 20,
      status: a.completed ? 'submitted' : 'pending',
    }));
    const { error: assignErr } = await client.from('academic_assignments').upsert(assignRows);
    if (assignErr) throw new Error(`academic_assignments failed: ${assignErr.message}`);
    console.log(`   ✓ ${assignRows.length} Assignments synced.`);

    console.log('\n🎉 ==============================================');
    console.log('✅ All SyllabusOS data successfully pushed to Supabase!');
    console.log('==============================================');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
