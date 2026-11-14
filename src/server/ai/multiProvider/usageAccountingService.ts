import { queryNeon, isNeonConfigured } from '../../db/neonClient.js';
import { ProviderType, TaskCategory, TokenUsageReport } from './providerTypes.js';

export interface UsageRecord {
  id: string;
  studentId: string;
  classId: string;
  provider: ProviderType;
  modelName: string;
  taskCategory: TaskCategory;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  isProviderReported: boolean;
  isSuccess: boolean;
  timestamp: string;
}

export interface StudentUsageSummary {
  studentId: string;
  dailyRequests: number;
  dailyTotalTokens: number;
  providerReportedTokens: number;
  estimatedTokens: number;
  dailyLimitRequests: number;
  dailyLimitTokens: number;
  isWithinLimits: boolean;
}

export class UsageAccountingService {
  // In-memory bounded usage log for fast limit checking and offline resilience
  private recentUsage: UsageRecord[] = [];
  private readonly maxMemoryRecords = 1000;

  // Default daily student limits (prevents accidental runaway quota consumption)
  private defaultDailyRequestLimit = 100;
  private defaultDailyTokenLimit = 250000;

  /**
   * Records an AI model invocation with exact provider or estimated token telemetry
   */
  public async recordUsage(params: {
    studentId: string;
    classId?: string;
    provider: ProviderType;
    modelName: string;
    taskCategory: TaskCategory;
    usage: TokenUsageReport;
    isSuccess?: boolean;
  }): Promise<UsageRecord> {
    const {
      studentId,
      classId = 'class-m2029',
      provider,
      modelName,
      taskCategory,
      usage,
      isSuccess = true,
    } = params;

    const now = new Date().toISOString();
    const id = `use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const record: UsageRecord = {
      id,
      studentId,
      classId,
      provider,
      modelName,
      taskCategory,
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalTokens: usage.totalTokens || (usage.inputTokens + usage.outputTokens) || 0,
      isProviderReported: Boolean(usage.isProviderReported),
      isSuccess,
      timestamp: now,
    };

    // Push into bounded memory
    this.recentUsage.push(record);
    if (this.recentUsage.length > this.maxMemoryRecords) {
      this.recentUsage.shift();
    }

    // Persist to Neon DB asynchronously
    if (isNeonConfigured()) {
      try {
        await queryNeon(
          `INSERT INTO student_ai_usage (
            id, student_id, class_id, provider, model_name, task_category,
            input_tokens, output_tokens, total_tokens, is_provider_reported, is_success, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            record.id,
            record.studentId,
            record.classId,
            record.provider,
            record.modelName,
            record.taskCategory,
            record.inputTokens,
            record.outputTokens,
            record.totalTokens,
            record.isProviderReported,
            record.isSuccess,
            record.timestamp,
          ]
        );
      } catch (err: any) {
        console.warn('[Usage Accounting] DB record notice:', err?.message || err);
      }
    }

    return record;
  }

  /**
   * Checks whether a student has remaining request and token quota for the current 24-hour cycle
   */
  public async checkQuota(studentId: string): Promise<{ isAllowed: boolean; reason?: string }> {
    const summary = await this.getStudentUsage(studentId);

    if (summary.dailyRequests >= summary.dailyLimitRequests) {
      return {
        isAllowed: false,
        reason: `Daily request limit (${summary.dailyLimitRequests} requests) reached for your student account. Limit resets in 24 hours.`,
      };
    }

    if (summary.dailyTotalTokens >= summary.dailyLimitTokens) {
      return {
        isAllowed: false,
        reason: `Daily token limit (${summary.dailyLimitTokens.toLocaleString()} tokens) reached for your student account.`,
      };
    }

    return { isAllowed: true };
  }

  /**
   * Aggregates usage for a student over the trailing 24 hours
   */
  public async getStudentUsage(studentId: string): Promise<StudentUsageSummary> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Filter memory records
    const studentMemoryRecords = this.recentUsage.filter(
      (r) => r.studentId === studentId && new Date(r.timestamp).getTime() >= oneDayAgo
    );

    let dailyRequests = studentMemoryRecords.length;
    let dailyTotalTokens = 0;
    let providerReportedTokens = 0;
    let estimatedTokens = 0;

    for (const r of studentMemoryRecords) {
      dailyTotalTokens += r.totalTokens;
      if (r.isProviderReported) {
        providerReportedTokens += r.totalTokens;
      } else {
        estimatedTokens += r.totalTokens;
      }
    }

    // If Neon is configured and memory has few records, query DB for true aggregate
    if (isNeonConfigured() && studentMemoryRecords.length === 0) {
      try {
        const rows = await queryNeon<any>(
          `SELECT 
             COUNT(*) as req_count,
             COALESCE(SUM(total_tokens), 0) as total_tokens,
             COALESCE(SUM(CASE WHEN is_provider_reported THEN total_tokens ELSE 0 END), 0) as provider_tokens,
             COALESCE(SUM(CASE WHEN NOT is_provider_reported THEN total_tokens ELSE 0 END), 0) as estimated_tokens
           FROM student_ai_usage
           WHERE student_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
          [studentId]
        );

        if (rows.length > 0) {
          dailyRequests = Number(rows[0].req_count) || 0;
          dailyTotalTokens = Number(rows[0].total_tokens) || 0;
          providerReportedTokens = Number(rows[0].provider_tokens) || 0;
          estimatedTokens = Number(rows[0].estimated_tokens) || 0;
        }
      } catch {
        // Fall back to memory counts
      }
    }

    return {
      studentId,
      dailyRequests,
      dailyTotalTokens,
      providerReportedTokens,
      estimatedTokens,
      dailyLimitRequests: this.defaultDailyRequestLimit,
      dailyLimitTokens: this.defaultDailyTokenLimit,
      isWithinLimits: dailyRequests < this.defaultDailyRequestLimit && dailyTotalTokens < this.defaultDailyTokenLimit,
    };
  }

  /**
   * Sets custom limits for a student or test scenario
   */
  public setCustomLimits(dailyRequests: number, dailyTokens: number) {
    this.defaultDailyRequestLimit = dailyRequests;
    this.defaultDailyTokenLimit = dailyTokens;
  }

  /**
   * Resets in-memory usage (useful for test runs)
   */
  public resetMemory() {
    this.recentUsage = [];
    this.defaultDailyRequestLimit = 100;
    this.defaultDailyTokenLimit = 250000;
  }
}

export const usageAccountingService = new UsageAccountingService();
