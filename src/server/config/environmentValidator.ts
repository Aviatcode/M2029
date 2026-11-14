import dotenv from 'dotenv';
dotenv.config();

import { validateByokMasterKey } from '../ai/multiProvider/byokSecurityService.js';

export interface EnvironmentVariableStatus {
  configured: boolean;
  status: 'valid' | 'missing' | 'insecure' | 'warning';
  message: string;
}

export interface EnvironmentAuditReport {
  isProduction: boolean;
  isValid: boolean;
  criticalVariables: Record<string, EnvironmentVariableStatus>;
  storageVariables: Record<string, EnvironmentVariableStatus>;
  optionalVariables: Record<string, EnvironmentVariableStatus>;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvironmentAuditReport {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  const nodeEnvStatus: EnvironmentVariableStatus = {
    configured: Boolean(process.env.NODE_ENV),
    status: 'valid',
    message: `Active Mode: ${nodeEnv.toUpperCase()}`,
  };

  // 2. PORT
  const rawPort = process.env.PORT || '3000';
  const portNum = Number(rawPort);
  const isPortValid = !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  if (!isPortValid) {
    errors.push(`INVALID_PORT: PORT must be an integer between 1 and 65535 (received "${rawPort}").`);
  }
  const portStatus: EnvironmentVariableStatus = {
    configured: Boolean(process.env.PORT),
    status: isPortValid ? 'valid' : 'insecure',
    message: isPortValid ? `Port ${portNum}` : `Invalid Port (${rawPort})`,
  };

  // 3. DATABASE_URL
  const rawDb = (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '').trim();
  const hasDb = Boolean(
    rawDb &&
      (rawDb.startsWith('postgres://') || rawDb.startsWith('postgresql://')) &&
      !rawDb.includes('placeholder') &&
      !rawDb.includes('ep-xyz')
  );
  if (isProduction && !hasDb) {
    errors.push('CRITICAL: DATABASE_URL is not configured or is a placeholder in production! Neon PostgreSQL persistence is mandatory.');
  } else if (!hasDb) {
    warnings.push('NOTICE: Running without Neon DATABASE_URL in development. In-memory mode active.');
  }
  const dbStatus: EnvironmentVariableStatus = {
    configured: hasDb,
    status: hasDb ? 'valid' : isProduction ? 'insecure' : 'warning',
    message: hasDb ? 'Configured (Neon PostgreSQL SSL)' : 'Missing or Invalid URI',
  };

  // 4. BYOK_MASTER_KEY
  const byokValidation = validateByokMasterKey();
  if (isProduction && !byokValidation.valid) {
    errors.push(`CRITICAL_SECURITY: ${byokValidation.reason} In production, an independent 32+ character BYOK_MASTER_KEY is mandatory.`);
  } else if (!byokValidation.valid) {
    warnings.push(`NOTICE: BYOK_MASTER_KEY: ${byokValidation.reason} (Using non-production fallback key in dev mode).`);
  }
  const byokStatus: EnvironmentVariableStatus = {
    configured: Boolean(process.env.BYOK_MASTER_KEY),
    status: byokValidation.valid ? 'valid' : isProduction ? 'insecure' : 'warning',
    message: byokValidation.valid ? 'Configured (AES-256 Validated, 32+ chars)' : byokValidation.reason || 'Missing',
  };

  // 5. ADMIN_API_KEY
  const adminKey = (process.env.ADMIN_API_KEY || '').trim();
  const isAdminValid = adminKey.length >= 16 && !['placeholder', 'admin1234567890'].includes(adminKey);
  if (isProduction && !isAdminValid) {
    errors.push('CRITICAL_SECURITY: ADMIN_API_KEY must be configured in production with at least 16 characters.');
  } else if (!isAdminValid && isProduction) {
    warnings.push('NOTICE: ADMIN_API_KEY is not set. Administrative endpoints restricted.');
  }
  const adminStatus: EnvironmentVariableStatus = {
    configured: Boolean(adminKey),
    status: isAdminValid ? 'valid' : isProduction ? 'insecure' : 'warning',
    message: isAdminValid ? 'Configured (16+ chars)' : Boolean(adminKey) ? 'Too Short (< 16 chars)' : 'Missing',
  };

  // 6. ALLOWED_ORIGINS
  const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || '').trim();
  const allowedList = rawAllowedOrigins
    ? rawAllowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  const hasWildcard = allowedList.some((o) => o.includes('*'));
  const hasInvalidUrl = allowedList.some((o) => {
    try {
      const u = new URL(o);
      return !['http:', 'https:'].includes(u.protocol);
    } catch {
      return true;
    }
  });

  let corsValid = true;
  let corsMsg = '';
  if (isProduction) {
    if (allowedList.length === 0) {
      corsValid = false;
      corsMsg = 'Missing in production (All cross-origin requests will be blocked)';
      errors.push('CRITICAL_CORS: ALLOWED_ORIGINS must be set in production (e.g., "https://m2029.vercel.app").');
    } else if (hasWildcard) {
      corsValid = false;
      corsMsg = 'Wildcard origins (*) strictly forbidden in production';
      errors.push('CRITICAL_CORS: Wildcard (*) is forbidden in ALLOWED_ORIGINS in production.');
    } else if (hasInvalidUrl) {
      corsValid = false;
      corsMsg = 'Contains malformed URLs';
      errors.push('CRITICAL_CORS: ALLOWED_ORIGINS contains malformed HTTP/HTTPS URLs.');
    } else {
      corsMsg = `Configured (${allowedList.length} origin${allowedList.length > 1 ? 's' : ''}: ${allowedList.join(', ')})`;
    }
  } else {
    corsMsg = allowedList.length > 0 ? `Configured (${allowedList.join(', ')})` : 'Dev Mode: Defaults to localhost + 127.0.0.1';
  }

  const corsStatus: EnvironmentVariableStatus = {
    configured: allowedList.length > 0,
    status: corsValid ? 'valid' : 'insecure',
    message: corsMsg,
  };

  // 7. Durable Storage Credentials (Backblaze B2)
  const b2KeyId = (process.env.B2_APPLICATION_KEY_ID || process.env.B2_KEY_ID || '').trim();
  const b2AppKey = (process.env.B2_APPLICATION_KEY || '').trim();
  const b2Bucket = (process.env.B2_BUCKET_NAME || '').trim();
  const hasB2 = Boolean(b2KeyId && b2AppKey && b2Bucket);

  if (isProduction && !hasB2) {
    warnings.push(
      'STORAGE NOTICE: Backblaze B2 durable storage is not configured. New binary document uploads will be safely rejected in production to prevent data loss on Render free tier.'
    );
  }

  const storageVariables: Record<string, EnvironmentVariableStatus> = {
    B2_APPLICATION_KEY_ID: {
      configured: Boolean(b2KeyId),
      status: b2KeyId ? 'valid' : 'warning',
      message: b2KeyId ? 'Configured' : 'Missing',
    },
    B2_APPLICATION_KEY: {
      configured: Boolean(b2AppKey),
      status: b2AppKey ? 'valid' : 'warning',
      message: b2AppKey ? 'Configured (Hidden)' : 'Missing',
    },
    B2_BUCKET_NAME: {
      configured: Boolean(b2Bucket),
      status: b2Bucket ? 'valid' : 'warning',
      message: b2Bucket || 'Missing',
    },
  };

  // 8. Optional Variables (Gemini, Github, etc.)
  const rawGemini = (process.env.GEMINI_API_KEY || '').trim();
  const hasGemini = Boolean(rawGemini && !rawGemini.startsWith('your_') && !rawGemini.includes('MY_GEMINI_API_KEY'));

  const criticalVariables: Record<string, EnvironmentVariableStatus> = {
    NODE_ENV: nodeEnvStatus,
    PORT: portStatus,
    DATABASE_URL: dbStatus,
    BYOK_MASTER_KEY: byokStatus,
    ADMIN_API_KEY: adminStatus,
    ALLOWED_ORIGINS: corsStatus,
  };

  const optionalVariables: Record<string, EnvironmentVariableStatus> = {
    GEMINI_API_KEY: {
      configured: hasGemini,
      status: hasGemini ? 'valid' : 'warning',
      message: hasGemini ? 'Configured' : 'Missing (BYOK / Curated Fallback Active)',
    },
    GITHUB_TOKEN: {
      configured: Boolean(process.env.GITHUB_TOKEN),
      status: process.env.GITHUB_TOKEN ? 'valid' : 'warning',
      message: process.env.GITHUB_TOKEN ? 'Configured' : 'Not configured',
    },
  };

  const isValid = errors.length === 0;

  return {
    isProduction,
    isValid,
    criticalVariables,
    storageVariables,
    optionalVariables,
    errors,
    warnings,
  };
}

export function printEnvironmentSummary() {
  const report = validateEnvironment();
  console.log('=================================================================');
  console.log(`🚀 SyllabusOS / M2029 Environment Audit: [${report.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  console.log('=================================================================');

  console.log('Critical Production Configuration:');
  for (const [key, val] of Object.entries(report.criticalVariables)) {
    const symbol = val.status === 'valid' ? '✅' : val.status === 'insecure' ? '❌' : '⚠️';
    console.log(`  ${symbol} ${key.padEnd(20)} : ${val.message}`);
  }

  console.log('\nDurable Cloud Storage Configuration (Backblaze B2):');
  for (const [key, val] of Object.entries(report.storageVariables)) {
    const symbol = val.status === 'valid' ? '✅' : '⚠️';
    console.log(`  ${symbol} ${key.padEnd(22)} : ${val.message}`);
  }

  if (report.warnings.length > 0) {
    console.log('\nDiagnostic Warnings:');
    report.warnings.forEach((w) => console.log(`  🔸 ${w}`));
  }

  if (report.errors.length > 0) {
    console.log('\n❌ Production Blocking Errors:');
    report.errors.forEach((e) => console.log(`  🛑 ${e}`));
  }
  console.log('=================================================================\n');

  return report;
}
