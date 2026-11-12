import { runAcademicAgent } from './src/server/ai/academicAgentGraph.js';

async function test() {
  try {
    console.log('Testing runAcademicAgent with: "Explain binary search tree"...');
    const result = await runAcademicAgent({
      question: 'Explain binary search tree',
      subjectName: 'Data Structures',
      topicName: 'Binary Search Tree',
      mode: 'all',
      forceLive: false,
    });
    console.log('Success! Result answer preview:');
    console.log(result.answer.slice(0, 300));
    console.log('Sections keys:', Object.keys(result.sections));
    console.log('Sections.simple preview:', result.sections.simple?.slice(0, 100));
  } catch (err) {
    console.error('Error in runAcademicAgent:', err);
  }
}

test();
