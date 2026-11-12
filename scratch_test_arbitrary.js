import { generateAcademicDoubtAnswer, generateAcademicGuide } from './src/server/ai/academicKnowledgeEngine.js';

console.log('--- Testing Polymorphism doubt ---');
const doubt = generateAcademicDoubtAnswer('What is polymorphism and difference between overloading and overriding?');
console.log(doubt.slice(0, 400));

console.log('\n--- Testing General Question Guide ---');
const guide = generateAcademicGuide('Dijkstra Shortest Path Algorithm', 'Design and Analysis of Algorithms');
console.log(guide.fullText.slice(0, 400));
