import { queryNeon } from '../src/server/db/neonClient.js';

async function audit() {
  console.log('--- AUDITING POSTGRES & PGVECTOR IN NEON ---');
  try {
    const v = await queryNeon('SELECT version()');
    console.log('Postgres Version:', v[0]?.version);

    const ext = await queryNeon("SELECT name, default_version, installed_version, comment FROM pg_available_extensions WHERE name = 'vector'");
    console.log('pgvector extension in catalog:', ext);

    await queryNeon('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ CREATE EXTENSION IF NOT EXISTS vector: SUCCESS!');

    const testVec = await queryNeon("SELECT '[1,2,3]'::vector as v");
    console.log('✅ Vector cast test:', testVec);

    const cosineTest = await queryNeon("SELECT 1 - ('[1,0,0]'::vector <=> '[0,1,0]'::vector) as cosine_sim");
    console.log('✅ Cosine similarity calculation test:', cosineTest);

    await queryNeon('CREATE TABLE IF NOT EXISTS test_hnsw (id serial primary key, v vector(768))');
    await queryNeon('CREATE INDEX IF NOT EXISTS idx_test_hnsw ON test_hnsw USING hnsw (v vector_cosine_ops)');
    console.log('✅ HNSW index test: SUCCESS!');
    await queryNeon('DROP TABLE test_hnsw');

    console.log('🎉 Neon pgvector is 100% available and functional at ₹0 cost!');
  } catch (err: any) {
    console.error('❌ pgvector audit failed:', err?.message || err);
  }
}

audit().catch(console.error);
