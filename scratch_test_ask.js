import { runAcademicAgent } from './src/server/ai/academicAgentGraph.js';

async function testAsk() {
  const question = 'What is binary search tree and how does insertion work?';
  const startTime = Date.now();
  const res = await runAcademicAgent({
    question,
    subjectName: 'Data Structures',
    topicName: question,
    mode: 'all',
    forceLive: true,
  });
  console.log(`Finished in ${Date.now() - startTime}ms:`);
  console.log('Model:', res.modelUsed);
  console.log('Answer preview:');
  console.log(res.answer.slice(0, 400));
}

testAsk();
