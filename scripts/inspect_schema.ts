import dotenv from 'dotenv';
dotenv.config();

import { getNeonSql } from '../src/server/db/neonClient.js';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;

  const cols = await (sql as any).query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const tables: Record<string, any[]> = {};
  for (const c of cols) {
    if (!tables[c.table_name]) tables[c.table_name] = [];
    tables[c.table_name].push(`${c.column_name} (${c.data_type})`);
  }

  for (const [t, colList] of Object.entries(tables)) {
    console.log(`\nTable: ${t}`);
    console.log(`  ${colList.join(', ')}`);
  }
}

main().catch(console.error);
