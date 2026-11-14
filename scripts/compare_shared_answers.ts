import dotenv from 'dotenv';
dotenv.config();

import { getNeonSql } from '../src/server/db/neonClient.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;

  const neonAnswers = await (sql as any).query('SELECT id, question, class_id, version, votes FROM shared_classroom_answers');
  console.log(`Neon shared_classroom_answers (${neonAnswers.length}):`);
  for (const r of neonAnswers) {
    console.log(`- [${r.id}] "${r.question}" | class=${r.class_id} | v${r.version} | votes=${r.votes}`);
  }

  const file = path.resolve(process.cwd(), 'curriculum-repo', '.shared_classroom_answers.json');
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw);
    const answers = Object.values(data.answers || {});
    console.log(`\nLocal .shared_classroom_answers.json (${answers.length}):`);
    for (const a of answers as any[]) {
      console.log(`- [${a.id}] "${a.question}" | class=${a.classId} | v${a.version} | votes=${a.votes}`);
    }
  }
}

main().catch(console.error);
