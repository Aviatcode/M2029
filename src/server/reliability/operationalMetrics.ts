/**
 * AI Tutor Operational Metrics & Cost Control Tracker
 *
 * Privacy-First Telemetry: Records quantitative operational reliability metrics
 * without logging plaintext API keys, passwords, or private student conversations.
 * Strictly zero cost (operates in bounded in-memory storage).
 */

export interface OperationalMetricsSnapshot {
  uptimeSeconds: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    cacheHits: number;
    sharedLibraryHits: number;
  };
  providerStats: Record<string, { calls: number; errors: number; avgLatencyMs: number }>;
  latencies: {
    retrievalAvgMs: number;
    generationAvgMs: number;
    totalAvgMs: number;
  };
  citationStats: {
    totalChecked: number;
    verified: number;
    rejectedFabricated: number;
    rejectedOutdated: number;
    rejectedCrossClass: number;
  };
  safetyEvents: {
    promptInjectionsBlocked: number;
    secretLeakagesPrevented: number;
  };
  errorCategoryCounts: Record<string, number>;
  tokensSavedTotal: number;
}

export class OperationalMetricsService {
  private startTime: number = Date.now();

  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private cacheHits: number = 0;
  private sharedLibraryHits: number = 0;
  private tokensSavedTotal: number = 0;

  private providerCalls: Map<string, { calls: number; errors: number; totalLatencyMs: number }> = new Map();

  private retrievalLatencies: number[] = [];
  private generationLatencies: number[] = [];
  private totalLatencies: number[] = [];

  private citationsChecked: number = 0;
  private citationsVerified: number = 0;
  private citationsFabricated: number = 0;
  private citationsOutdated: number = 0;
  private citationsCrossClass: number = 0;

  private promptInjectionsBlocked: number = 0;
  private secretLeakagesPrevented: number = 0;

  private errorCounts: Map<string, number> = new Map();

  /**
   * Records a request completion with latency and cache status
   */
  public recordRequest(params: {
    success: boolean;
    cached?: boolean;
    isSharedLibrary?: boolean;
    tokensSaved?: number;
    totalLatencyMs: number;
    retrievalLatencyMs?: number;
    generationLatencyMs?: number;
  }) {
    this.totalRequests++;
    if (params.success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    if (params.cached) this.cacheHits++;
    if (params.isSharedLibrary) this.sharedLibraryHits++;
    if (params.tokensSaved) this.tokensSavedTotal += params.tokensSaved;

    this.pushBoundedLatency(this.totalLatencies, params.totalLatencyMs);
    if (params.retrievalLatencyMs) this.pushBoundedLatency(this.retrievalLatencies, params.retrievalLatencyMs);
    if (params.generationLatencyMs) this.pushBoundedLatency(this.generationLatencies, params.generationLatencyMs);
  }

  /**
   * Records provider-level call statistics
   */
  public recordProviderCall(providerName: string, success: boolean, latencyMs: number) {
    if (!this.providerCalls.has(providerName)) {
      this.providerCalls.set(providerName, { calls: 0, errors: 0, totalLatencyMs: 0 });
    }
    const stat = this.providerCalls.get(providerName)!;
    stat.calls++;
    if (!success) stat.errors++;
    stat.totalLatencyMs += latencyMs;
  }

  /**
   * Records citation validation outcomes
   */
  public recordCitationCheck(status: string) {
    this.citationsChecked++;
    if (status === 'VERIFIED') this.citationsVerified++;
    else if (status === 'FABRICATED' || status === 'DOCUMENT_NOT_FOUND') this.citationsFabricated++;
    else if (status === 'OUTDATED_VERSION') this.citationsOutdated++;
    else if (status === 'UNAUTHORIZED_CROSS_CLASS') this.citationsCrossClass++;
  }

  /**
   * Records security boundary events
   */
  public recordSafetyEvent(type: 'prompt_injection' | 'secret_leakage') {
    if (type === 'prompt_injection') this.promptInjectionsBlocked++;
    if (type === 'secret_leakage') this.secretLeakagesPrevented++;
  }

  /**
   * Records an error category
   */
  public recordError(category: string) {
    this.errorCounts.set(category, (this.errorCounts.get(category) || 0) + 1);
  }

  private pushBoundedLatency(arr: number[], val: number) {
    arr.push(val);
    if (arr.length > 200) arr.shift();
  }

  private calcAvg(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round(sum / arr.length);
  }

  /**
   * Resets metrics (useful for testing or daily telemetry cycles)
   */
  public reset() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.cacheHits = 0;
    this.sharedLibraryHits = 0;
    this.tokensSavedTotal = 0;
    this.providerCalls.clear();
    this.retrievalLatencies = [];
    this.generationLatencies = [];
    this.totalLatencies = [];
    this.citationsChecked = 0;
    this.citationsVerified = 0;
    this.citationsFabricated = 0;
    this.citationsOutdated = 0;
    this.citationsCrossClass = 0;
    this.promptInjectionsBlocked = 0;
    this.secretLeakagesPrevented = 0;
    this.errorCounts.clear();
  }

  /**
   * Generates a clean telemetry snapshot for dashboard or monitoring endpoint
   */
  public getSnapshot(): OperationalMetricsSnapshot {
    const providerStats: Record<string, { calls: number; errors: number; avgLatencyMs: number }> = {};
    for (const [name, stat] of this.providerCalls.entries()) {
      providerStats[name] = {
        calls: stat.calls,
        errors: stat.errors,
        avgLatencyMs: stat.calls > 0 ? Math.round(stat.totalLatencyMs / stat.calls) : 0,
      };
    }

    const errorCategoryCounts: Record<string, number> = {};
    for (const [cat, count] of this.errorCounts.entries()) {
      errorCategoryCounts[cat] = count;
    }

    return {
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        cacheHits: this.cacheHits,
        sharedLibraryHits: this.sharedLibraryHits,
      },
      providerStats,
      latencies: {
        retrievalAvgMs: this.calcAvg(this.retrievalLatencies),
        generationAvgMs: this.calcAvg(this.generationLatencies),
        totalAvgMs: this.calcAvg(this.totalLatencies),
      },
      citationStats: {
        totalChecked: this.citationsChecked,
        verified: this.citationsVerified,
        rejectedFabricated: this.citationsFabricated,
        rejectedOutdated: this.citationsOutdated,
        rejectedCrossClass: this.citationsCrossClass,
      },
      safetyEvents: {
        promptInjectionsBlocked: this.promptInjectionsBlocked,
        secretLeakagesPrevented: this.secretLeakagesPrevented,
      },
      errorCategoryCounts,
      tokensSavedTotal: this.tokensSavedTotal,
    };
  }
}

export const operationalMetrics = new OperationalMetricsService();
