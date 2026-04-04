import type { DealRadarListing, DealRadarSearchCriteria, UsageType } from '../models/types';

// ══════════════════════════════════════════════════════════
// Deal Radar Agent — AI-powered property search
// Searches for investment opportunities matching criteria
// ══════════════════════════════════════════════════════════

export interface DealRadarResult {
  success: boolean;
  listings: DealRadarListing[];
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

export async function searchDealRadar(criteria: DealRadarSearchCriteria): Promise<DealRadarResult> {
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || '';
  if (!apiKey) {
    return { success: false, listings: [], error: 'API key not configured (VITE_ANTHROPIC_API_KEY).' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'x-api-key': apiKey,
  };

  const citiesStr = criteria.cities.join(', ');
  const usageStr = criteria.usageTypes.join(', ');
  const priceRange = `€${(criteria.priceMin / 1e6).toFixed(1)}M - €${(criteria.priceMax / 1e6).toFixed(1)}M`;
  const areaRange = `${criteria.minArea} - ${criteria.maxArea} sqm`;

  const prompt = `You are a German real estate transaction scout. Search for current commercial and residential investment properties for sale in Germany.

Search criteria:
- Cities: ${citiesStr}
- Usage types: ${usageStr}
- Price range: ${priceRange}
- Area range: ${areaRange}

Do ONE web search for "Gewerbeimmobilien Anlageimmobilien kaufen ${criteria.cities[0]} ${criteria.cities[1] || ''} 2025 2026" to find current offerings from portals like ImmobilienScout24, Immowelt, BNP Paribas Real Estate, CBRE, JLL, Savills, Colliers, Engel & Völkers Commercial, DEAL Magazine.

Find 5-10 real, currently available investment properties. For each property provide a brief AI assessment.

Reply ONLY with valid JSON (no markdown):
{"listings":[{"title":"<property name/description>","address":"<street if available>","city":"<city>","zip":"<zip if available>","usageType":"Wohnen"|"Büro"|"Einzelhandel"|"Logistik"|"Mixed Use","askingPrice":0,"pricePerSqm":0,"totalArea":0,"yearBuilt":0,"description":"<2-3 sentence description>","sourceLabel":"<platform/broker name>","sourceUrl":"<URL or empty>","aiNotes":"<1-2 sentence AI assessment: is this interesting for a value-add investor?>","estimatedYield":0}]}`;

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
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

    if (!parsed.listings || !Array.isArray(parsed.listings)) {
      throw new Error('Invalid response: missing listings array');
    }

    const now = new Date().toISOString();
    const listings: DealRadarListing[] = parsed.listings
      .filter((l: any) => l.askingPrice >= criteria.priceMin * 0.8 && l.askingPrice <= criteria.priceMax * 1.2)
      .map((l: any, i: number) => ({
        id: `radar-${Date.now()}-${i}`,
        title: l.title || 'Untitled Property',
        address: l.address || '',
        city: l.city || criteria.cities[0],
        zip: l.zip || '',
        usageType: (l.usageType as UsageType) || 'Mixed Use',
        askingPrice: l.askingPrice || 0,
        pricePerSqm: l.pricePerSqm || (l.askingPrice && l.totalArea ? Math.round(l.askingPrice / l.totalArea) : 0),
        totalArea: l.totalArea || 0,
        yearBuilt: l.yearBuilt || undefined,
        description: l.description || '',
        sourceLabel: l.sourceLabel || 'Web Search',
        sourceUrl: l.sourceUrl || '',
        status: 'new' as const,
        aiNotes: l.aiNotes || '',
        estimatedYield: l.estimatedYield || undefined,
        foundAt: now,
      }));

    return { success: true, listings };
  } catch (error: any) {
    console.error('Deal Radar search failed:', error);
    return { success: false, listings: [], error: error.message };
  }
}
