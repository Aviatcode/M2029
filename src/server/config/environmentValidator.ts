import dotenv from 'dotenv';
dotenv.config();

export interface EnvironmentAuditReport {
  isProduction: boolean;
  isValid: boolean;
  criticalVariables: Record<string, { configured: boolean; message: string }>;
  optionalVariables: Record<string, { configured: boolean; message: string }>;
  warnings: string[];
}

export function validateEnvironment(): EnvironmentAuditReport {
  const isProduction = process.env.NODE_ENV === 'production';
  const warnings: string[] = [];

  const rawDb = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  const hasDb = Boolean(rawDb && !rawDb.includes('placeholder') && !rawDb.includes('ep-xyz'));
  if (!hasDb) {
    warnings.push(
      isProduction
        ? 'CRITICAL: DATABASE_URL is not configured in production! Neon PostgreSQL persistence is disabled.'
        : 'NOTICE: Running without Neon DATABASE_URL. Classroom data will operate in fast in-memory mode.'
    );
  }

  const rawGemini = process.env.GEMINI_API_KEY || '';
  const hasGemini = Boolean(rawGemini && !rawGemini.startsWith('your_') && !rawGemini.includes('MY_GEMINI_API_KEY'));
  if (!hasGemini) {
    warnings.push('NOTICE: GEMINI_API_KEY is not configured. AI Tutor will operate via BYOK or curated offline fallback.');
  }

  const adminKey = process.env.ADMIN_API_KEY || '';
  const hasAdmin = Boolean(adminKey && adminKey.length >= 8);
  if (!hasAdmin) {
    warnings.push(
      isProduction
        ? 'SECURITY WARNING: ADMIN_API_KEY is missing or too short! Administrative endpoints are locked down.'
        : 'NOTICE: ADMIN_API_KEY is not set. Use X-Admin-Key in development to manage administrative operations.'
    );
  }

  const byokMaster = process.env.BYOK_MASTER_KEY || '';
  const hasByokMaster = Boolean(byokMaster && byokMaster.length >= 16);
  if (!hasByokMaster) {
    warnings.push('SECURITY NOTICE: BYOK_MASTER_KEY not set. Using secure fallback derived master key for student BYOK encryption.');
  }

  const criticalVariables = {
    DATABASE_URL: {
      configured: hasDb,
      message: hasDb ? 'Configured (Neon PostgreSQL)' : 'Missing/Placeholder',
    },
    GEMINI_API_KEY: {
      configured: hasGemini,
      message: hasGemini ? 'Configured' : 'Missing (BYOK/Offline active)',
    },
    ADMIN_API_KEY: {
      configured: hasAdmin,
      message: hasAdmin ? 'Configured' : 'Missing (Admin endpoints restricted)',
    },
    BYOK_MASTER_KEY: {
      configured: hasByokMaster,
      message: hasByokMaster ? 'Configured' : 'Derived Fallback Active',
    },
  };

  const optionalVariables = {
    ALLOWED_ORIGINS: {
      configured: Boolean(process.env.ALLOWED_ORIGINS),
      message: process.env.ALLOWED_ORIGINS || 'Defaults to *.vercel.app + localhost',
    },
    B2_APPLICATION_KEY: {
      configured: Boolean(process.env.B2_APPLICATION_KEY),
      message: process.env.B2_APPLICATION_KEY ? 'Configured (10GB Backblaze B2)' : 'Not configured (Local/GitHub active)',
    },
    GITHUB_TOKEN: {
      configured: Boolean(process.env.GITHUB_TOKEN),
      message: process.env.GITHUB_TOKEN ? 'Configured' : 'Not configured',
    },
  };

  return {
    isProduction,
    isValid: hasDb || !isProduction,
    criticalVariables,
    optionalVariables,
    warnings,
  };
}

export function printEnvironmentSummary() {
  const report = validateEnvironment();
  console.log('=================================================================');
  console.log(`🚀 SyllabusOS / M2029 Environment: [${report.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  console.log('=================================================================');

  for (const [key, val] of Object.entries(report.criticalVariables)) {
    const symbol = val.configured ? '✅' : '⚠️';
    console.log(`  ${symbol} ${key.padEnd(18)} : ${val.message}`);
  }

  if (report.warnings.length > 0) {
    console.log('\nStartup Diagnostic Warnings:');
    report.warnings.forEach((w) => console.log(`  🔸 ${w}`));
  }
  console.log('=================================================================\n');
}
