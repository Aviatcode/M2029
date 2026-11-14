import { Request, Response, NextFunction } from 'express';
import { redactSecrets } from '../reliability/safetySanitizer.js';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  message: string;
  requestId?: string;
  context?: Record<string, any>;
  durationMs?: number;
}

export class ProductionLogger {
  private static instance: ProductionLogger;
  private recentLogs: LogEntry[] = [];
  private readonly maxRecentLogs = 200;
  private errorCounts: Record<string, number> = {};
  private requestStats = {
    total: 0,
    success: 0,
    clientErrors: 0,
    serverErrors: 0,
  };

  public static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private sanitizePayload(data: any): any {
    if (!data) return data;
    try {
      if (typeof data === 'string') {
        return redactSecrets(data);
      }
      if (typeof data === 'object') {
        const json = JSON.stringify(data);
        const redacted = redactSecrets(json);
        return JSON.parse(redacted);
      }
    } catch {
      return '[Unparseable Data]';
    }
    return data;
  }

  public log(level: 'info' | 'warn' | 'error' | 'security', message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const cleanMsg = redactSecrets(message);
    const cleanContext = context ? this.sanitizePayload(context) : undefined;

    const entry: LogEntry = {
      timestamp,
      level,
      message: cleanMsg,
      requestId: context?.requestId,
      context: cleanContext,
      durationMs: context?.durationMs,
    };

    // Store in bounded circular in-memory buffer
    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }

    if (level === 'error') {
      const errKey = cleanMsg.slice(0, 60);
      this.errorCounts[errKey] = (this.errorCounts[errKey] || 0) + 1;
    }

    // Console output with appropriate formatting
    const prefix = `[${timestamp}] [${level.toUpperCase()}]${context?.requestId ? ` [${context.requestId}]` : ''}`;
    if (level === 'error') {
      console.error(`${prefix} ${cleanMsg}`, cleanContext || '');
    } else if (level === 'warn' || level === 'security') {
      console.warn(`${prefix} ${cleanMsg}`, cleanContext || '');
    } else {
      console.log(`${prefix} ${cleanMsg}`);
    }
  }

  public info(msg: string, ctx?: Record<string, any>) {
    this.log('info', msg, ctx);
  }

  public warn(msg: string, ctx?: Record<string, any>) {
    this.log('warn', msg, ctx);
  }

  public error(msg: string, ctx?: Record<string, any>) {
    this.log('error', msg, ctx);
  }

  public security(msg: string, ctx?: Record<string, any>) {
    this.log('security', msg, ctx);
  }

  /**
   * Express middleware for structured HTTP request tracing
   */
  public requestMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = (req as any).requestId || (req.headers['x-request-id'] as string) || 'req-trace';

      this.requestStats.total++;

      res.on('finish', () => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        if (statusCode >= 500) {
          this.requestStats.serverErrors++;
          this.error(`HTTP ${req.method} ${req.path} -> ${statusCode} (${durationMs}ms)`, {
            requestId,
            method: req.method,
            path: req.path,
            statusCode,
            durationMs,
          });
        } else if (statusCode >= 400) {
          this.requestStats.clientErrors++;
          this.warn(`HTTP ${req.method} ${req.path} -> ${statusCode} (${durationMs}ms)`, {
            requestId,
            method: req.method,
            path: req.path,
            statusCode,
            durationMs,
          });
        } else {
          this.requestStats.success++;
          // Only log non-static successful requests to keep logs high-signal
          if (req.path.startsWith('/api') && !req.path.startsWith('/api/health')) {
            this.info(`HTTP ${req.method} ${req.path} -> ${statusCode} (${durationMs}ms)`, {
              requestId,
              method: req.method,
              path: req.path,
              statusCode,
              durationMs,
            });
          }
        }
      });

      next();
    };
  }

  public getTelemetrySummary() {
    return {
      requestStats: { ...this.requestStats },
      errorCounts: { ...this.errorCounts },
      recentLogCount: this.recentLogs.length,
    };
  }

  public getRecentLogs(limit: number = 50): LogEntry[] {
    return this.recentLogs.slice(-limit);
  }
}

export const logger = ProductionLogger.getInstance();
