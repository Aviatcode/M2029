import http from 'http';

// Let's test calling routes.ts or mock directly
import { AIProviderFactory } from './src/server/ai/provider.js';
import { aiKnowledgeCache } from './src/server/ai/aiKnowledgeCache.js';

async function testStep() {
  const customQuery = 'What is binary search tree and how does insertion work?';
  const trackName = 'Operating Systems';
  const prompt = `Student asked a doubt during the study of "Unit 1" in course "${trackName}":
Question: "${customQuery}"

Respond as the gold-standard academic tutor:
1. Direct, clear answer in easy English with natural Hinglish intuition.
2. Real-life analogy or concrete example.
3. Exam scoring point or trap to avoid.
4. Keep it focused and conversational.`;

  const ai = AIProviderFactory.getClassProvider();
  console.log('AI Provider:', ai.name);
  const startTime = Date.now();
  const resp = await ai.generateText(prompt);
  console.log(`Generated in ${Date.now() - startTime}ms:`);
  console.log(resp);
}

testStep();
