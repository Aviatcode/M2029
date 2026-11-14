import fs from 'fs';
import path from 'path';

function auditRoutes() {
  const files = [
    { name: 'server.ts', path: path.resolve('server.ts') },
    { name: 'src/server/routes.ts', path: path.resolve('src/server/routes.ts') },
    { name: 'src/server/rag/ragRouter.ts', path: path.resolve('src/server/rag/ragRouter.ts') }
  ];

  console.log('=== AUDITING ROUTES & ENDPOINTS ===');
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.log(`File not found: ${file.name}`);
      continue;
    }
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n');
    console.log(`\n--- ${file.name} (Total lines: ${lines.length}) ---`);

    lines.forEach((line, idx) => {
      const match = line.match(/(app|apiRouter|ragRouter)\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (match) {
        const lineNum = idx + 1;
        const method = match[2].toUpperCase();
        const routePath = match[3];
        // Check surrounding 10 lines for auth checks (e.g., req.headers, admin, auth, secret)
        const context = lines.slice(idx, idx + 25).join('\n');
        const hasAdminCheck = context.includes('admin') || context.includes('X-Admin-Key') || context.includes('ADMIN_SECRET') || context.includes('verifyAdmin');
        const hasAuthCheck = context.includes('Authorization') || context.includes('userId') || context.includes('studentId') || context.includes('classId');
        console.log(`[${lineNum.toString().padStart(4, ' ')}] ${method.padEnd(6, ' ')} ${routePath} ${hasAdminCheck ? '(ADMIN-CHECKED)' : ''}`);
      }
    });
  }
}

auditRoutes();
