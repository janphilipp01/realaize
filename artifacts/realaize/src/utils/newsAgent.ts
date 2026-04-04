import type { NewsArticle, NewsCategory, DailyIntelligenceReport } from '../models/types';

export interface NewsResearchResult {
  success: boolean;
  report: DailyIntelligenceReport | null;
  error?: string;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    const retryAfter = response.headers.get('retry-after');
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(15000 * Math.pow(2, attempt), 60000);
    console.warn(`Rate limited. Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  return fetch(url, options);
}

export async function generateDailyIntelligenceReport(date: string): Promise<NewsResearchResult> {
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || '';
  if (!apiKey) {
    return { success: false, report: null, error: 'API key not configured (VITE_ANTHROPIC_API_KEY).' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'x-api-key': apiKey,
  };

  const prompt = `You are a German real estate market analyst. Today: ${date}.

Do ONE web search for "German real estate market news ${date}" or "Immobilienmarkt Deutschland aktuell", then compile 6-8 news items from the results.

Reply ONLY with valid JSON (no markdown):
{"articles":[{"title":"...","summary":"1-2 sentences","sourceLabel":"publication name","sourceUrl":"URL or empty","category":"Deals & Transactions|Leasing & Lettings|Interest Rates & Monetary Policy|Regulation & Policy|Capital Markets|Macro & Global Economy","impactRating":"high|medium|low"}],"executiveSummary":"3-4 sentences in German","marketImpactAnalysis":"4-5 sentences in German on impact for investors"}`;

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API error ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const textContent = data.content
      ?.filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n') || '';

    const cleanJson = textContent.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed.articles || !Array.isArray(parsed.articles)) {
      throw new Error('Invalid response: missing articles array');
    }

    const articles: NewsArticle[] = parsed.articles.map((a: any, i: number) => ({
      id: `news-${date}-${i}`,
      title: a.title || 'Untitled',
      summary: a.summary || '',
      sourceLabel: a.sourceLabel || 'Unknown',
      sourceUrl: a.sourceUrl || '',
      category: (a.category as NewsCategory) || 'Macro & Global Economy',
      publishedAt: date,
      impactRating: a.impactRating || 'medium',
    }));

    const report: DailyIntelligenceReport = {
      id: `report-${date}`,
      date,
      articles,
      executiveSummary: parsed.executiveSummary || '',
      marketImpactAnalysis: parsed.marketImpactAnalysis || '',
      generatedAt: new Date().toISOString(),
    };

    return { success: true, report };
  } catch (error: any) {
    console.error('News research failed:', error);
    return { success: false, report: null, error: error.message };
  }
}
