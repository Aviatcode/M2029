import { initializeNeonSchema, testNeonConnection } from '../src/server/db/neonClient.js';

async function run() {
  console.log('Testing Neon connection...');
  const conn = await testNeonConnection();
  console.log('Neon connected:', conn.ok, conn.message);

  console.log('Initializing schema for Phase 5...');
  const init = await initializeNeonSchema(false);
  console.log('Schema initialized:', init.ok, init.message);
  console.log('Tables created / checked:', init.tablesCreated);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
