import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  relatedTickers: string[];
  thumbnail?: {
    resolutions: Array<{ url: string; width: number; height: number }>;
  };
  summary?: string;
}

export async function GET({ params }) {
  try {
    const symbol = params.symbol.toUpperCase();

    // Check cache
    const cacheKey = `news_stock_${symbol}`;
    const cached = await getCache<NewsArticle[]>(cacheKey);
    if (cached) {
      return json(cached);
    }

    // Use search with the symbol to get related news
    const results = await yahooFinance.search(symbol, {
      quotesCount: 0,
      newsCount: 10,
    });

    const articles: NewsArticle[] = results.news.map((article: any) => ({
      uuid: article.uuid || '',
      title: article.title || 'No title',
      publisher: article.publisher || 'Unknown',
      link: article.link || '#',
      providerPublishTime: article.providerPublishTime || Date.now() / 1000,
      type: article.type || 'STORY',
      relatedTickers: article.relatedTickers || [],
      thumbnail: article.thumbnail ? {
        resolutions: article.thumbnail.resolutions || []
      } : undefined,
      summary: article.summary || '',
    }));

    // Store in cache
    await setCache(cacheKey, articles);

    return json(articles);
  } catch (error) {
    console.error('News API error:', error);
    return json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
