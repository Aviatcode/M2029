import dotenv from 'dotenv';
dotenv.config();

async function testDim() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: 'Operating Systems Deadlock Principles' }] },
      outputDimensionality: 768,
    }),
  });
  const data = await res.json();
  console.log('Output with outputDimensionality: 768 ->', data.error ? data.error : { dimensions: data.embedding?.values?.length });
}

testDim().catch(console.error);
