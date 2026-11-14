import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { apiRouter, db } from '../src/server/routes.js';
import { SEED_TIMETABLE } from '../src/server/db/seedData.js';
import { AIProviderFactory, MockAIProvider } from '../src/server/ai/provider.js';
import { TimetableClass } from '../src/types/index.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, name: string, errDetail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    testResults.push({ name, passed: true });
  } else {
    console.error(`  ❌ FAIL: ${name}${errDetail ? ` (${errDetail})` : ''}`);
    testResults.push({ name, passed: false, error: errDetail || 'Assertion failed' });
  }
}

async function runTomorrowTests() {
  console.log('=================================================================');
  console.log('🧪 M2029 /api/tomorrow/:classId TEST SUITE');
  console.log('=================================================================\n');

  // Ensure tests use MockAIProvider (Zero external tokens consumed, zero network delays)
  (AIProviderFactory as any).classInstance = new MockAIProvider();

  // Set up mock express app with apiRouter
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const tomorrowDay = dayNames[(new Date().getDay() + 1) % 7];
  const otherDay = dayNames[(new Date().getDay() + 2) % 7];

  console.log(`[Test Environment] Detected Tomorrow's Weekday: ${tomorrowDay}`);
  console.log(`[Test Environment] Reference Other Weekday: ${otherDay}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST CASE 1: Completely Empty Timetable (Production Default State)
    // -------------------------------------------------------------------------
    console.log('--- TEST CASE 1: COMPLETELY EMPTY TIMETABLE ---');
    
    // Save original timetable state
    const originalTimetable = { ...db.timetable };
    db.timetable = {};

    assert(SEED_TIMETABLE.length === 0, '1.1 Confirmed SEED_TIMETABLE is empty array');
    assert(Object.keys(db.timetable).length === 0, '1.2 Confirmed db.timetable is empty object');

    const resEmpty = await fetch(`${baseUrl}/api/tomorrow/M2029`);
    assert(resEmpty.status === 200, '1.3 Empty timetable returns HTTP 200 OK (no 502/503 crash)');

    const bodyEmpty = await resEmpty.json();
    assert(bodyEmpty.tomorrowClass === null, '1.4 tomorrowClass is strictly null when timetable is empty');
    assert(Boolean(bodyEmpty.prep), '1.5 prep object is present in response');
    assert(bodyEmpty.prep.subjectName === 'Upcoming Lecture', '1.6 Default prep.subjectName is "Upcoming Lecture"');
    assert(bodyEmpty.prep.topicTitle === 'Lecture Preparation', '1.7 Default prep.topicTitle is "Lecture Preparation"');
    assert(bodyEmpty.prep.step1WhatIsIt.includes('Enter your timetable lectures'), '1.8 Default step1 instruction present');
    assert(Array.isArray(bodyEmpty.prep.step4MiniQuiz), '1.9 prep.step4MiniQuiz is an array');

    // -------------------------------------------------------------------------
    // TEST CASE 2: Class Scheduled Tomorrow (Dynamic Day Matching)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 2: CLASS SCHEDULED TOMORROW ---');

    const tomorrowScheduledClass: TimetableClass = {
      id: 'tt-tomorrow-class',
      day: tomorrowDay as any,
      time: '10:00 AM - 11:00 AM',
      subjectId: 'sub-os-adv',
      subjectName: 'Advanced Operating Systems',
      subjectCode: 'BCA-401',
      room: 'Lab-402',
      teacherName: 'Dr. Test',
      likelyTopic: {
        id: 'top-sched-1',
        title: 'Distributed Process Scheduling',
        confidence: 95,
        reasoning: 'Matches syllabus progression',
      },
    };

    db.timetable['class-tomorrow'] = [tomorrowScheduledClass];

    const resTomorrow = await fetch(`${baseUrl}/api/tomorrow/class-tomorrow`);
    assert(resTomorrow.status === 200, '2.1 Class scheduled tomorrow returns HTTP 200 OK');

    const bodyTomorrow = await resTomorrow.json();
    assert(Boolean(bodyTomorrow.tomorrowClass), '2.2 tomorrowClass is found and returned');
    assert(bodyTomorrow.tomorrowClass.id === 'tt-tomorrow-class', '2.3 Matched correct tomorrow class ID');
    assert(bodyTomorrow.tomorrowClass.day === tomorrowDay, '2.4 Matched exact tomorrow weekday');
    assert(bodyTomorrow.tomorrowClass.subjectName === 'Advanced Operating Systems', '2.5 Correct subject name returned');
    assert(bodyTomorrow.prep.subjectName === 'Advanced Operating Systems', '2.6 prep.subjectName matches tomorrow class');
    assert(bodyTomorrow.prep.topicTitle === 'Distributed Process Scheduling', '2.7 prep.topicTitle matches likelyTopic');

    // -------------------------------------------------------------------------
    // TEST CASE 3: Classes Scheduled ONLY on Other Days (No Lecture Tomorrow)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 3: CLASSES SCHEDULED ONLY ON OTHER DAYS ---');

    // Populate with classes strictly on otherDay, plus Thursday if otherDay is not Thursday
    const otherDayClasses: TimetableClass[] = [
      {
        id: 'tt-other-1',
        day: otherDay as any,
        time: '11:30 AM - 12:30 PM',
        subjectId: 'sub-dbms-adv',
        subjectName: 'Distributed Databases',
        subjectCode: 'BCA-402',
        room: 'Lab-403',
        teacherName: 'Prof. OtherDay',
        likelyTopic: {
          id: 'top-other-1',
          title: 'Two-Phase Commit Protocol',
          confidence: 90,
          reasoning: 'Scheduled on other day',
        },
      },
    ];

    db.timetable['class-other'] = otherDayClasses;

    const resOther = await fetch(`${baseUrl}/api/tomorrow/class-other`);
    assert(resOther.status === 200, '3.1 Unscheduled tomorrow returns HTTP 200 OK');

    const bodyOther = await resOther.json();
    assert(
      bodyOther.tomorrowClass === null,
      '3.2 tomorrowClass is strictly null when no class is scheduled tomorrow (No fallback to other days)'
    );
    assert(
      bodyOther.prep.subjectName === 'Upcoming Lecture',
      '3.3 Returns default prep.subjectName instead of misrepresenting an unrelated class'
    );
    assert(
      bodyOther.prep.topicTitle === 'Lecture Preparation',
      '3.4 Returns default prep.topicTitle instead of misrepresenting an unrelated class'
    );

    // -------------------------------------------------------------------------
    // TEST CASE 4: Tomorrow Slot without Optional likelyTopic
    // -------------------------------------------------------------------------
    console.log('\n--- TEST CASE 4: TOMORROW SLOT WITHOUT LIKELYTOPIC ---');

    db.timetable['class-no-topic'] = [
      {
        id: 'tt-no-topic',
        day: tomorrowDay as any,
        time: '02:00 PM - 03:00 PM',
        subjectId: 'sub-no-topic',
        subjectName: 'Software Engineering',
        subjectCode: 'BCA-403',
        room: 'Room-101',
        teacherName: 'Prof. Safe',
        // Note: likelyTopic is omitted
      },
    ];

    const resNoTopic = await fetch(`${baseUrl}/api/tomorrow/class-no-topic`);
    assert(resNoTopic.status === 200, '4.1 Slot without likelyTopic returns HTTP 200 OK without crashing');
    const bodyNoTopic = await resNoTopic.json();
    assert(Boolean(bodyNoTopic.tomorrowClass), '4.2 tomorrowClass is returned');
    assert(bodyNoTopic.tomorrowClass.subjectName === 'Software Engineering', '4.3 Subject name resolved');
    assert(bodyNoTopic.prep.topicTitle === 'Object Oriented Inheritance', '4.4 Safe fallback topicTitle used');

    // Restore original timetable
    db.timetable = originalTimetable;

  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log(`🎯 TOMORROW ENDPOINT TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log('=================================================================\n');

  if (passedCount < totalCount) {
    console.error('❌ Tests failed!');
    process.exit(1);
  } else {
    console.log('✅ ALL TOMORROW ENDPOINT TESTS PASSED CLEANLY.');
    process.exit(0);
  }
}

runTomorrowTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
