import fs from 'fs';
import path from 'path';

export interface CachedAIResponse {
  id: string;
  query: string;
  normalizedKey: string;
  subjectName: string;
  mode: string;
  answer: string;
  sections?: Record<string, string>;
  modelUsed?: string;
  createdAt: string;
  lastAccessedAt: string;
  hitCount: number;
  tokensEstimated: number;
}

export interface CacheStats {
  totalLearnedItems: number;
  totalHits: number;
  estimatedTokensSaved: number;
  lastUpdated: string;
}

const CACHE_FILE = path.resolve(process.cwd(), 'curriculum-repo', '.ai_knowledge_cache.json');

// Stop words for academic semantic normalization
const STOP_WORDS = new Set([
  'what',
  'is',
  'are',
  'the',
  'a',
  'an',
  'explain',
  'definition',
  'define',
  'meaning',
  'of',
  'describe',
  'tell',
  'me',
  'about',
  'give',
  'notes',
  'on',
  'for',
  'in',
  'and',
  'or',
  'to',
  'how',
  'does',
  'do',
  'can',
  'you',
  'please',
  'os',
  'operating',
  'system',
  'systems',
  'kya',
  'hai',
  'hota',
  'batao',
  'samjhao',
  'bhai',
]);

/**
 * Normalizes user queries so that variations like:
 * - "what is the convoy effect in operating systems?"
 * - "explain convoy effect"
 * - "convoy effect in os kya hota hai"
 * all map to the exact same canonical key: "convoy effect"
 */
export function normalizeAcademicQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  const cleaned = rawQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  if (words.length === 0) {
    // If all words were stop words, fall back to cleaned non-empty string
    return cleaned.replace(/\s+/g, ' ').slice(0, 80);
  }

  // Deduplicate and return space-separated key
  return Array.from(new Set(words)).join(' ');
}

class AIKnowledgeCacheManager {
  private cache: Map<string, CachedAIResponse> = new Map();
  private totalHits: number = 0;
  private totalTokensSaved: number = 0;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) {
          data.entries.forEach((entry: CachedAIResponse) => {
            this.cache.set(entry.id, entry);
          });
        }
        this.totalHits = Number(data.totalHits) || 0;
        this.totalTokensSaved = Number(data.totalTokensSaved) || 0;
        console.log(
          `[AI Knowledge Cache] Loaded ${this.cache.size} stored lessons. Total Hits: ${this.totalHits}, Tokens Saved: ${this.totalTokensSaved}`
        );
      }
    } catch (err) {
      console.warn('[AI Knowledge Cache] Disk read warning, starting fresh:', err);
    }
  }

  public saveToDisk() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        totalLearnedItems: this.cache.size,
        totalHits: this.totalHits,
        totalTokensSaved: this.totalTokensSaved,
        lastUpdated: new Date().toISOString(),
        entries: Array.from(this.cache.values()),
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[AI Knowledge Cache] Disk save warning:', err);
    }
  }

  /**
   * Search for a cached response using both exact and normalized semantic matching.
   */
  public get(query: string, subjectName = '', mode = 'all'): CachedAIResponse | null {
    if (!query || query.trim().length === 0) return null;

    const normalized = normalizeAcademicQuery(query);
    const cleanSub = (subjectName || '').toLowerCase().trim();
    const cleanMode = (mode || 'all').toLowerCase().trim();

    // 1. Exact match on raw query + mode
    for (const entry of this.cache.values()) {
      if (
        entry.query.toLowerCase().trim() === query.toLowerCase().trim() &&
        (entry.mode === cleanMode || cleanMode === 'all')
      ) {
        this.registerHit(entry);
        return entry;
      }
    }

    // 2. Normalized semantic key match
    if (normalized.length >= 3) {
      for (const entry of this.cache.values()) {
        if (entry.normalizedKey === normalized && (entry.mode === cleanMode || cleanMode === 'all')) {
          this.registerHit(entry);
          return entry;
        }

        // Substring / token containment for comprehensive matching
        if (
          normalized.length > 5 &&
          (entry.normalizedKey.includes(normalized) || normalized.includes(entry.normalizedKey)) &&
          (entry.mode === cleanMode || cleanMode === 'all')
        ) {
          this.registerHit(entry);
          return entry;
        }
      }
    }

    return null;
  }

  private registerHit(entry: CachedAIResponse) {
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastAccessedAt = new Date().toISOString();
    this.totalHits += 1;
    // Each cache hit saves roughly ~1500 tokens of prompt + generation
    const saved = entry.tokensEstimated || 1500;
    this.totalTokensSaved += saved;
    // Save to disk asynchronously
    setTimeout(() => this.saveToDisk(), 100);
  }

  /**
   * Store a newly learned AI response.
   */
  public set(
    query: string,
    subjectName: string,
    mode: string,
    answer: string,
    sections?: Record<string, string>,
    modelUsed = 'AI Model'
  ): CachedAIResponse {
    const normalized = normalizeAcademicQuery(query);
    const id = `cache-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const wordCount = answer.split(/\s+/).length;
    // Estimate tokens: ~1.3 tokens per English word
    const tokensEstimated = Math.max(800, Math.round(wordCount * 1.35) + 300);

    const entry: CachedAIResponse = {
      id,
      query: query.trim(),
      normalizedKey: normalized,
      subjectName: subjectName.trim(),
      mode: mode.trim(),
      answer: answer.trim(),
      sections,
      modelUsed,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      hitCount: 1,
      tokensEstimated,
    };

    this.cache.set(id, entry);
    this.saveToDisk();
    console.log(`[AI Knowledge Cache] 🧠 Stored new learned topic: "${query}" (Key: "${normalized}"). Total cached: ${this.cache.size}`);
    return entry;
  }

  public getStats(): CacheStats {
    return {
      totalLearnedItems: this.cache.size,
      totalHits: this.totalHits,
      estimatedTokensSaved: this.totalTokensSaved,
      lastUpdated: new Date().toISOString(),
    };
  }

  public getAllEntries(): CachedAIResponse[] {
    return Array.from(this.cache.values());
  }

  public clear() {
    this.cache.clear();
    this.totalHits = 0;
    this.totalTokensSaved = 0;
    this.saveToDisk();
  }
}

export const aiKnowledgeCache = new AIKnowledgeCacheManager();
