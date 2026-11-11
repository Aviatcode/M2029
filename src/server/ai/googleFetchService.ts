/**
 * Zero-Token Under-the-Hood Google & Web Search Fetcher
 *
 * Fetches search results, intuitive real-world analogies, and simplified definitions
 * directly via pure HTTP without requiring any AI models, API keys, or LLM tokens.
 * Operates silently under the hood without any UI clutter.
 */

export interface GoogleSearchItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface GoogleFetchResponse {
  query: string;
  items: GoogleSearchItem[];
  suggestions: string[];
  tokensSpent: 0;
  durationMs: number;
}

function cleanHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Performs a zero-token under-the-hood web & Google search fetch
 */
export async function fetchGoogleSearch(
  query: string,
  options: { limit?: number; timeoutMs?: number } = {}
): Promise<GoogleFetchResponse> {
  const startTime = Date.now();
  const limit = options.limit || 4;
  const timeoutMs = options.timeoutMs || 4000;

  const items: GoogleSearchItem[] = [];
  let suggestions: string[] = [];

  // 1. Fetch search snippets via high-speed zero-token HTTP endpoint
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timer);

    const html = await res.text();
    const snippetRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
    const titleRegex = /<h2 class="result__title[^>]*>.*?<a[^>]*>(.*?)<\/a>/gs;
    const urlRegex = /<a class="result__url"[^>]*href="([^"]*)"/gs;

    let sMatch;
    let tMatch;
    let uMatch;

    while ((sMatch = snippetRegex.exec(html)) !== null && items.length < limit) {
      tMatch = titleRegex.exec(html);
      uMatch = urlRegex.exec(html);

      const snippet = cleanHtmlEntities(sMatch[1]);
      const title = tMatch ? cleanHtmlEntities(tMatch[1]) : `Search Result #${items.length + 1}`;
      const rawUrl = uMatch ? uMatch[1].trim() : '';

      if (snippet && snippet.length > 20) {
        items.push({
          title,
          snippet,
          url: rawUrl,
          source: 'Google & Live Web Search Index (Zero-Token Fetch)',
        });
      }
    }
  } catch (err: any) {
    // Graceful fallback: return empty items without failing
  }

  // 2. Fetch Google Live Search Suggestions (Autocomplete API - 0 Tokens, 0 Auth)
  try {
    const suggestUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(
      query
    )}`;
    const sugController = new AbortController();
    const sugTimer = setTimeout(() => sugController.abort(), 2000);

    const sugRes = await fetch(suggestUrl, {
      signal: sugController.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(sugTimer);

    const sugData = await sugRes.json();
    if (Array.isArray(sugData) && Array.isArray(sugData[1])) {
      suggestions = sugData[1].map((s: any) => String(s)).slice(0, 5);
    }
  } catch (err: any) {
    // Non-blocking: continue without suggestions
  }

  const durationMs = Date.now() - startTime;

  return {
    query,
    items,
    suggestions,
    tokensSpent: 0,
    durationMs,
  };
}

/**
 * Fetches real-world analogies and simplified terms for difficult concepts
 * Completely under the hood, 0 tokens spent.
 */
export async function fetchRealWorldAnalogies(topic: string, subject?: string): Promise<string[]> {
  const query = `${topic} ${subject || ''} real world analogy easy explanation simplify in simple words`;
  const response = await fetchGoogleSearch(query, { limit: 3 });

  return response.items.map((item) => `${item.title}: ${item.snippet}`);
}
