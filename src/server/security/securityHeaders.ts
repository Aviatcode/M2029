import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';

/**
 * Attaches enterprise security HTTP headers and unique Request ID
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // 1. Generate or forward unique Request ID for end-to-end distributed tracing
  const incomingRequestId = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
  const requestId = incomingRequestId && incomingRequestId.length < 64 ? incomingRequestId : `req-${crypto.randomBytes(8).toString('hex')}`;
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // 2. Defensive HTTP Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Strict-Transport-Security if on production or HTTPS
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

/**
 * Validates and safely normalizes file paths to prevent Path Traversal attacks
 */
export function sanitizeSafePath(baseDir: string, userFilename: string): { safePath: string; isSafe: boolean } {
  // Strip null bytes and control chars
  const cleanName = userFilename.replace(/\0/g, '').replace(/[\r\n\t]/g, '');
  const basename = path.basename(cleanName);
  const resolved = path.resolve(baseDir, basename);

  // Verify that resolved path remains strictly within baseDir
  const isSafe = resolved.startsWith(path.resolve(baseDir));
  return {
    safePath: resolved,
    isSafe: isSafe && basename.length > 0 && basename !== '.' && basename !== '..',
  };
}

/**
 * Validates an external URL to protect against Server-Side Request Forgery (SSRF)
 * Rejects private IPs, loopbacks, link-local, AWS/GCP cloud metadata endpoints
 */
export function validateUrlForSsrf(inputUrl: string): { allowed: boolean; reason?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(inputUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTP and HTTPS protocols are allowed.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return { allowed: false, reason: 'Loopback and localhost access is forbidden.' };
    }

    // Block cloud metadata services
    if (
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host.includes('metadata') ||
      host.endsWith('.internal')
    ) {
      return { allowed: false, reason: 'Cloud metadata access is strictly forbidden.' };
    }

    // Block RFC 1918 private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const p1 = parseInt(ipv4Match[1], 10);
      const p2 = parseInt(ipv4Match[2], 10);

      if (p1 === 10) return { allowed: false, reason: 'Private network access (10.0.0.0/8) is forbidden.' };
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return { allowed: false, reason: 'Private network access (172.16.0.0/12) is forbidden.' };
      if (p1 === 192 && p2 === 168) return { allowed: false, reason: 'Private network access (192.168.0.0/16) is forbidden.' };
      if (p1 === 169 && p2 === 254) return { allowed: false, reason: 'Link-local access (169.254.0.0/16) is forbidden.' };
    }

    return { allowed: true, parsedUrl: parsed };
  } catch (err: any) {
    return { allowed: false, reason: `Malformed URL: ${err?.message || 'Invalid format'}` };
  }
}
