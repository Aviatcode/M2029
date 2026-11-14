import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import { normalizeQueryTokens } from './questionMatcher.js';

export interface LockAcquisitionResult {
  isGenerator: boolean;
  reused: boolean;
  answerId?: string;
  lockKey: string;
  message?: string;
}

export class ConcurrentGenerationCoordinator {
  // Local in-memory fast-path promise map for identical concurrent requests within the same process
  private inFlightLocalPromises: Map<string, Promise<any>> = new Map();

  // Configurable lock timeout to prevent permanent deadlocks
  private readonly defaultLockTimeoutSeconds = 30;

  /**
   * Generates a stable, canonical lock key for a question within a classroom workspace
   */
  public computeLockKey(params: {
    classId: string;
    subjectName?: string;
    query: string;
    mode?: string;
    depth?: string;
  }): string {
    const { classId = 'M2029', subjectName = 'general', query, mode = 'all', depth = 'standard' } = params;
    const tokens = normalizeQueryTokens(query);
    const sortedTokens = tokens.slice().sort().join('_').slice(0, 100);
    const cleanSub = (subjectName || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanMode = (mode || 'all').toLowerCase();
    const cleanDepth = (depth || 'standard').toLowerCase();

    return `${classId}::${cleanSub}::${cleanMode}::${cleanDepth}::${sortedTokens}`;
  }

  /**
   * Safely acquires a distributed generation lock or waits for an existing in-flight generation.
   * Prevents duplicate LLM calls across multiple Render instances and concurrent requests.
   */
  public async acquireLockOrWait(params: {
    lockKey: string;
    classId: string;
    studentId: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<LockAcquisitionResult> {
    const {
      lockKey,
      classId,
      studentId,
      maxWaitMs = 3500,
      pollIntervalMs = 250,
    } = params;

    const timeoutSeconds = this.defaultLockTimeoutSeconds;

    // 1. Database-backed distributed lock acquisition in Neon
    if (isNeonConfigured()) {
      try {
        // Atomic insert: acquire lock if none exists, or if previous lock is expired/failed
        const rows = await queryNeon<any>(
          `INSERT INTO shared_generation_locks (
            lock_key, class_id, student_id, status, expires_at, created_at, updated_at
          ) VALUES ($1, $2, $3, 'generating', NOW() + ($4 || ' seconds')::INTERVAL, NOW(), NOW())
          ON CONFLICT (lock_key) DO UPDATE
          SET student_id = EXCLUDED.student_id,
              status = 'generating',
              answer_id = NULL,
              expires_at = NOW() + ($4 || ' seconds')::INTERVAL,
              updated_at = NOW()
          WHERE shared_generation_locks.expires_at < NOW() 
             OR shared_generation_locks.status = 'failed'
          RETURNING *;`,
          [lockKey, classId, studentId, timeoutSeconds.toString()]
        );

        if (rows.length > 0 && rows[0].student_id === studentId) {
          // Lock successfully acquired by this student
          return {
            isGenerator: true,
            reused: false,
            lockKey,
          };
        }

        // Another student currently holds an active lock! Enter bounded wait loop
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

          const checkRows = await queryNeon<any>(
            `SELECT status, answer_id, expires_at FROM shared_generation_locks WHERE lock_key = $1`,
            [lockKey]
          );

          if (checkRows.length > 0) {
            const currentLock = checkRows[0];

            if (currentLock.status === 'completed' && currentLock.answer_id) {
              // Generation completed by the other student! Reuse their answer with 0 LLM calls
              return {
                isGenerator: false,
                reused: true,
                answerId: currentLock.answer_id,
                lockKey,
                message: 'Successfully reused answer generated concurrently by classmate.',
              };
            }

            if (currentLock.status === 'failed' || new Date(currentLock.expires_at).getTime() < Date.now()) {
              // The other generation failed or timed out. Attempt to claim generator role
              const reclaimRows = await queryNeon<any>(
                `UPDATE shared_generation_locks
                 SET student_id = $1, status = 'generating', answer_id = NULL, expires_at = NOW() + ($2 || ' seconds')::INTERVAL, updated_at = NOW()
                 WHERE lock_key = $3 AND (status = 'failed' OR expires_at < NOW())
                 RETURNING *;`,
                [studentId, timeoutSeconds.toString(), lockKey]
              );

              if (reclaimRows.length > 0) {
                return {
                  isGenerator: true,
                  reused: false,
                  lockKey,
                };
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Concurrent Coordinator] Database lock notice, falling back to local lock:', err.message);
      }
    }

    // 2. Local in-process fallback lock if Neon is unavailable
    if (this.inFlightLocalPromises.has(lockKey)) {
      try {
        const result = await Promise.race([
          this.inFlightLocalPromises.get(lockKey),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Local lock timeout')), maxWaitMs)),
        ]);
        return {
          isGenerator: false,
          reused: true,
          answerId: result?.id,
          lockKey,
          message: 'Reused answer completed concurrently within local process.',
        };
      } catch {
        // Local wait timed out or failed; allow generation
        return {
          isGenerator: true,
          reused: false,
          lockKey,
        };
      }
    }

    // Default: this student is generator
    return {
      isGenerator: true,
      reused: false,
      lockKey,
    };
  }

  /**
   * Releases or updates a lock upon completion or failure
   */
  public async releaseLock(params: {
    lockKey: string;
    status: 'completed' | 'failed';
    answerId?: string;
    errorReason?: string;
  }): Promise<void> {
    const { lockKey, status, answerId } = params;

    // Clean up local in-process promise
    this.inFlightLocalPromises.delete(lockKey);

    if (isNeonConfigured()) {
      try {
        if (status === 'completed' && answerId) {
          await queryNeon(
            `UPDATE shared_generation_locks
             SET status = 'completed', answer_id = $1, updated_at = NOW()
             WHERE lock_key = $2`,
            [answerId, lockKey]
          );
        } else {
          // If generation failed, mark as failed so waiting students are not permanently blocked
          await queryNeon(
            `UPDATE shared_generation_locks
             SET status = 'failed', updated_at = NOW()
             WHERE lock_key = $1`,
            [lockKey]
          );
        }
      } catch (err: any) {
        console.warn('[Concurrent Coordinator] Notice releasing lock:', err.message);
      }
    }
  }

  /**
   * Registers an in-flight Promise for instant resolution of duplicate concurrent calls in the same node process
   */
  public registerLocalPromise(lockKey: string, promise: Promise<any>) {
    this.inFlightLocalPromises.set(lockKey, promise);
    promise.finally(() => {
      this.inFlightLocalPromises.delete(lockKey);
    });
  }

  /**
   * Cleans up expired locks from Neon PostgreSQL
   */
  public async cleanupExpiredLocks(): Promise<number> {
    if (!isNeonConfigured()) return 0;
    try {
      const res = await queryNeon<any>(
        `DELETE FROM shared_generation_locks WHERE expires_at < NOW() RETURNING lock_key;`
      );
      return res.length;
    } catch {
      return 0;
    }
  }
}

export const concurrentGenerationCoordinator = new ConcurrentGenerationCoordinator();
