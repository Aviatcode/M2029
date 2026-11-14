import fs from 'fs';
import path from 'path';

function auditSecurity() {
  console.log('=== AUDITING CODEBASE SECURITY & PRODUCTION READINESS ===\n');

  function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'curriculum-repo'].includes(file)) {
          results = results.concat(walk(full));
        }
      } else if (full.endsWith('.ts') || full.endsWith('.js')) {
        results.push(full);
      }
    }
    return results;
  }

  const allFiles = walk('.');

  // 1. Audit SQL queries for potential concatenation / injection
  console.log('1. Checking SQL Queries...');
  let sqlIssues = 0;
  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('queryNeon(') || l.includes('query(')) {
        if (l.includes(' + ') || (l.includes('`') && l.includes('${') && !l.includes('sql`'))) {
          console.log(`[SQL Concatenation Risk] ${f}:${i + 1} -> ${l.trim()}`);
          sqlIssues++;
        }
      }
    });
  }
  if (sqlIssues === 0) console.log('  ✅ No unsafe string concatenation found in queryNeon calls.');

  // 2. Audit Path Traversal in File Operations
  console.log('\n2. Checking File Path Handlers...');
  let pathIssues = 0;
  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if ((l.includes('path.join(') || l.includes('path.resolve(')) && (l.includes('req.params') || l.includes('req.query') || l.includes('req.body'))) {
        console.log(`[Path Traversal Check] ${f}:${i + 1} -> ${l.trim()}`);
        pathIssues++;
      }
    });
  }
  if (pathIssues === 0) console.log('  ✅ No direct unvalidated req params in path.join/resolve.');

  // 3. Audit Unbounded SELECT queries without LIMIT
  console.log('\n3. Checking SELECT queries for missing LIMIT...');
  let unboundedQueries = 0;
  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      const upper = l.toUpperCase();
      if (upper.includes('SELECT ') && upper.includes('FROM ') && !upper.includes('LIMIT ') && !upper.includes('COUNT(')) {
        if (f.includes('src/server')) {
          console.log(`[Potential Unbounded Query] ${f}:${i + 1} -> ${l.trim().substring(0, 80)}`);
          unboundedQueries++;
        }
      }
    });
  }
  console.log(`  Found ${unboundedQueries} potential unbounded SELECT queries.`);

  // 4. Audit Admin / Sensitive routes missing verification
  console.log('\n4. Checking Sensitive Route Protection in routes.ts and ragRouter.ts...');
  // Inspect specific lines in routes.ts
  const routesContent = fs.readFileSync('src/server/routes.ts', 'utf8');
  const ragContent = fs.readFileSync('src/server/rag/ragRouter.ts', 'utf8');

  // Check destructive / admin operations
  const sensitivePatterns = [
    { name: 'POST /neon/init', in: routesContent, check: 'verifyAdminAuth' },
    { name: 'ALL /cache/reset-all', in: routesContent, check: 'verifyAdminAuth' },
    { name: 'ALL /ai/cache/reset-all', in: routesContent, check: 'verifyAdminAuth' },
    { name: 'POST /byok/rotate-master-key', in: routesContent, check: 'verifyAdminAuth' },
    { name: 'DELETE /document/:docId', in: ragContent, check: 'verifyAdmin' },
    { name: 'POST /graph/review-change', in: ragContent, check: 'verifyAdmin' },
    { name: 'POST /ai-tutor/approve-correction', in: routesContent, check: 'verifyAdmin' }
  ];

  sensitivePatterns.forEach(p => {
    const hasCheck = p.in.includes(p.name) && p.in.includes(p.check);
    console.log(`  ${p.name}: ${hasCheck ? '✅ Protected' : '⚠️ Missing Admin/Role verification'}`);
  });
}

auditSecurity();
