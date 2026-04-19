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

// Popular tickers for combined news feed
const POPULAR_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];

// Investing.com RSS feeds
const INVESTING_RSS_FEEDS: Record<string, string> = {
  all: 'https://www.investing.com/rss/news.rss',
  commodities: 'https://www.investing.com/rss/commodities_news.rss',
  gold: 'https://www.investing.com/rss/gold_news.rss',
  forex: 'https://www.investing.com/rss/forex_news.rss',
  crypto: 'https://www.investing.com/rss/crypto_news.rss',
};

async function parseRSSFeed(url: string): Promise<NewsArticle[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const text = await response.text();
    const articles: NewsArticle[] = [];

    // Simple XML parsing for RSS
    const itemRegex = /<item[^>]*>(.*?)<\/item>/gi;
    const matches = text.matchAll(itemRegex);

    let count = 0;
    for (const match of matches) {
      if (count >= 15) break;

      const item = match[1];
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i);
      const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i);

      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : '';
      const summary = descMatch ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim().slice(0, 200) : '';

      if (!title || !link) continue;

      // Parse pubDate
      let providerPublishTime = Date.now() / 1000;
      if (pubDateStr) {
        const date = new Date(pubDateStr);
        if (!isNaN(date.getTime())) {
          providerPublishTime = date.getTime() / 1000;
        }
      }

      articles.push({
        uuid: '',
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        publisher: 'Investing.com',
        link,
        providerPublishTime,
        type: 'STORY',
        relatedTickers: [],
        summary,
      });

      count++;
    }

    return articles;
  } catch (e) {
    console.error('RSS parse error:', e);
    return [];
  }
}

export async function GET({ url }) {
  try {
    const query = url.searchParams.get('q') || '';
    const newsCount = parseInt(url.searchParams.get('count') || '30');
    const category = url.searchParams.get('category') || 'all';

    // Check cache based on category (news is expensive)
    const cacheKey = `news_${category}`;
    const cached = getCache<NewsArticle[]>(cacheKey);
    if (cached) {
      return json(cached);
    }

    let articles: NewsArticle[] = [];

    if (category === 'all' || category === 'commodities') {
      // Fetch from investing.com RSS
      const rssUrl = category === 'commodities'
        ? INVESTING_RSS_FEEDS.commodities
        : INVESTING_RSS_FEEDS.all;

      const rssArticles = await parseRSSFeed(rssUrl);
      articles.push(...rssArticles);
    }

    if (category === 'all') {
      // Also add XAU/USD specific news via Yahoo Finance
      try {
        const xauResults = await yahooFinance.search('XAU USD gold', {
          quotesCount: 0,
          newsCount: 10,
        });

        const xauArticles: NewsArticle[] = xauResults.news.map((article: any) => ({
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

        articles.push(...xauArticles);
      } catch (e) {
        // Skip failed
      }

      // Also fetch from popular tickers
      for (const ticker of POPULAR_TICKERS.slice(0, 3)) {
        try {
          const results = await yahooFinance.search(ticker, {
            quotesCount: 0,
            newsCount: 5,
          });

          const tickerArticles: NewsArticle[] = results.news.map((article: any) => ({
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

          articles.push(...tickerArticles);
        } catch (e) {
          // Skip failed tickers
        }
      }

      // Sort by time and deduplicate
      const seen = new Set<string>();
      articles = articles
        .sort((a, b) => b.providerPublishTime - a.providerPublishTime)
        .filter(article => {
          const key = article.title.toLowerCase().slice(0, 50);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, newsCount);
    } else if (category === 'gold' || category === 'forex') {
      // Use investing.com RSS for gold/forex
      const rssArticles = await parseRSSFeed(INVESTING_RSS_FEEDS[category] || INVESTING_RSS_FEEDS.all);
      articles = rssArticles;
    } else if (category === 'crypto') {
      // Use investing.com RSS for crypto
      const rssArticles = await parseRSSFeed(INVESTING_RSS_FEEDS.crypto);
      articles = rssArticles;
    } else {
      // Use query-based search for other categories
      const results = await yahooFinance.search(query, {
        quotesCount: 0,
        newsCount: newsCount,
      });

      articles = results.news.map((article: any) => ({
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
    }

    // Store in cache
    setCache(cacheKey, articles);

    return json(articles);
  } catch (error) {
    console.error('News API error:', error);
    return json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
