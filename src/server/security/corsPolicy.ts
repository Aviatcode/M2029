import { Request, Response, NextFunction } from 'express';

export interface CorsValidationResult {
  allowed: boolean;
  normalizedOrigin?: string;
  reason?: string;
}

/**
 * Validates whether an incoming HTTP Origin header is authorized
 */
export function validateOrigin(
  rawOrigin: string,
  configuredOrigins: string[],
  isProduction: boolean
): CorsValidationResult {
  if (!rawOrigin || typeof rawOrigin !== 'string') {
    return { allowed: false, reason: 'Origin header is empty or invalid.' };
  }

  let originUrl: URL;
  try {
    originUrl = new URL(rawOrigin.trim());
    if (!['http:', 'https:'].includes(originUrl.protocol) || !originUrl.host) {
      return { allowed: false, reason: 'Origin header contains an invalid protocol or host.' };
    }
  } catch {
    return { allowed: false, reason: 'Origin header is malformed.' };
  }

  const normalized = `${originUrl.protocol}//${originUrl.host}`.toLowerCase();

  if (isProduction) {
    // In production, FAIL CLOSED if no allowed origins configured
    if (!configuredOrigins || configuredOrigins.length === 0) {
      return {
        allowed: false,
        normalizedOrigin: normalized,
        reason: 'No allowed origins configured in production (ALLOWED_ORIGINS is empty).',
      };
    }

    // Exact match only - wildcards like '*' or '*.vercel.app' are forbidden in production
    const isExplicitlyAllowed = configuredOrigins.some((allowed) => {
      const clean = allowed.trim().replace(/\/+$/, '').toLowerCase();
      return clean === normalized;
    });

    if (isExplicitlyAllowed) {
      return { allowed: true, normalizedOrigin: normalized };
    }

    return {
      allowed: false,
      normalizedOrigin: normalized,
      reason: `Origin "${normalized}" is not in configured ALLOWED_ORIGINS.`,
    };
  }

  // Development / Test mode
  const isLocal =
    originUrl.hostname === 'localhost' ||
    originUrl.hostname === '127.0.0.1' ||
    originUrl.hostname === '[::1]';

  if (configuredOrigins.length === 0 || isLocal) {
    return { allowed: true, normalizedOrigin: normalized };
  }

  const isConfigured = configuredOrigins.some((allowed) => {
    const clean = allowed.trim().replace(/\/+$/, '').toLowerCase();
    return clean === normalized;
  });

  return {
    allowed: isConfigured,
    normalizedOrigin: normalized,
    reason: isConfigured ? undefined : `Origin "${normalized}" is not allowed.`,
  };
}

/**
 * Factory for creating strict, production-ready CORS middleware
 */
export function createCorsMiddleware(options?: {
  isProd?: boolean;
  allowedOrigins?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const isProduction = options?.isProd !== undefined ? options.isProd : process.env.NODE_ENV === 'production';
    const rawOrigins = options?.allowedOrigins !== undefined
      ? options.allowedOrigins
      : (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);

    const origin = req.headers.origin;

    // 1. Missing Origin: Same-origin requests, Render health checks, server-to-server curl
    if (!origin) {
      // In production, never emit wildcard '*' header
      // Proceed directly to next middleware without injecting CORS headers
      return next();
    }

    // 2. Validate Origin
    const check = validateOrigin(origin, rawOrigins, isProduction);

    if (!check.allowed) {
      // Forbidden: reject immediately with 403
      return res.status(403).json({
        error: 'CORS_FORBIDDEN',
        message: 'Cross-Origin Request Blocked: Origin not authorized by CORS policy.',
        reason: check.reason,
      });
    }

    // 3. Authorized Origin: emit strict, scoped response headers
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Key, X-Student-Id, X-Class-Id, X-Request-Id, X-User-Role'
    );
    res.header('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  };
}

export const strictCorsMiddleware = createCorsMiddleware();
