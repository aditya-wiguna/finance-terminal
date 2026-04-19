import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function GET({ url }) {
  try {
    const query = url.searchParams.get('q');

    if (!query || query.length < 1) {
      return json([]);
    }

    const results = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    const searchResults: SearchResult[] = results.quotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        exchange: q.exchange || '',
        type: q.quoteType || '',
      }));

    return json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}
