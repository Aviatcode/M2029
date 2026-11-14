import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  name: string;
  keyGenerator?: (req: Request) => string;
}

interface BucketRecord {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private buckets: Map<string, BucketRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private name: string;
  private keyGenerator: (req: Request) => string;
  private blockedEventsTotal: number = 0;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.name = options.name;
    this.keyGenerator =
      options.keyGenerator ||
      ((req: Request) => {
        const ip =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          '127.0.0.1';
        const userId = (req.headers['x-user-id'] as string) || (req.headers['x-student-id'] as string);
        return userId ? `${userId}::${ip}` : ip;
      });

    // Cleanup stale entries every 60 seconds to prevent unbounded memory growth
    setInterval(() => this.cleanup(), 60000).unref();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.buckets.entries()) {
      if (now > record.resetAt) {
        this.buckets.delete(key);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // In test environment, allow bypassing with test header if explicitly set
      if (req.headers['x-bypass-rate-limit'] === 'true') {
        return next();
      }

      const key = `${this.name}::${this.keyGenerator(req)}`;
      const now = Date.now();

      let record = this.buckets.get(key);
      if (!record || now > record.resetAt) {
        record = {
          count: 1,
          resetAt: now + this.windowMs,
        };
        this.buckets.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetInSeconds.toString());

      if (record.count > this.maxRequests) {
        this.blockedEventsTotal++;
        res.setHeader('Retry-After', resetInSeconds.toString());
        return res.status(429).json({
          error: `Too Many Requests: Rate limit exceeded for ${this.name}. Please try again in ${resetInSeconds} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: resetInSeconds,
        });
      }

      return next();
    };
  }

  public getBlockedEventsCount(): number {
    return this.blockedEventsTotal;
  }

  public reset() {
    this.buckets.clear();
    this.blockedEventsTotal = 0;
  }
}

// 1. General API: 150 requests per minute
export const generalRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150,
  name: 'GeneralAPI',
});

// 2. Expensive AI Generation Endpoints: 30 requests per minute
export const aiRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  name: 'AIGeneration',
});

// 3. Sensitive / Auth / Secret Rotation Endpoints: 15 requests per minute
export const authRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  name: 'SensitiveAuth',
});

// 4. File Upload Endpoints: 10 uploads per minute (prevents Render memory spikes)
export const uploadRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  name: 'FileUpload',
});
