import dotenv from 'dotenv';
import {
  isNeonConfigured,
  testNeonConnection,
  initializeNeonSchema,
} from '../src/server/db/neonClient.js';

dotenv.config();

async function main() {
  console.log('🔄 ==============================================');
  console.log('⚡ SyllabusOS -> Neon Serverless Postgres Setup');
  console.log('==============================================');

  if (!isNeonConfigured()) {
    console.error('\n❌ Error: DATABASE_URL is missing or contains placeholder values.');
    console.error('   Please add your Neon PostgreSQL connection string to your .env file:');
    console.error('   DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"');
    console.error('\n   You can get your free database connection URL from: https://console.neon.tech\n');
    process.exit(1);
  }

  console.log('📡 Testing connection to Neon PostgreSQL...');
  const connTest = await testNeonConnection();

  if (!connTest.ok) {
    console.error(`\n❌ Connection failed: ${connTest.message}`);
    if (connTest.details) {
      console.error('   Details:', connTest.details);
    }
    process.exit(1);
  }

  console.log(`✅ ${connTest.message}`);
  console.log(`   Database Name : ${connTest.database}`);
  console.log(`   Server Time   : ${connTest.timestamp}`);
  console.log(`   Latency       : ${connTest.latencyMs}ms`);
  console.log(`   Existing Tables: ${connTest.tables?.join(', ') || 'None'}`);

  console.log('\n📦 Creating schema and migrating curriculum data to Neon...');
  const migration = await initializeNeonSchema(true);

  console.log(`✅ ${migration.message}`);
  console.log(`   Tables Created/Verified: ${migration.tablesCreated.length} tables`);
  if (migration.seededItems && Object.keys(migration.seededItems).length > 0) {
    console.log('   Seeded Curriculum Items:');
    for (const [key, val] of Object.entries(migration.seededItems)) {
      console.log(`     - ${key}: ${val} records`);
    }
  } else {
    console.log('   Existing records found, skipped re-seeding to preserve live data.');
  }

  console.log('\n🎉 ==============================================');
  console.log('🚀 Neon PostgreSQL is fully operational for SyllabusOS!');
  console.log('==============================================\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal error running Neon migration:', err);
  process.exit(1);
});
