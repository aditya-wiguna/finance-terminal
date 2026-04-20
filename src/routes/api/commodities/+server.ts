import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface CommodityQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
}

interface CommodityInfo {
  symbol: string;
  name: string;
  unit: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: string;
  category: string;
}

const COMMODITY_SYMBOLS = [
  { symbol: 'GOLD', yahooSymbol: 'GC=F', name: 'Gold', unit: 'oz', category: 'Metals' },
  { symbol: 'SILVER', yahooSymbol: 'SI=F', name: 'Silver', unit: 'oz', category: 'Metals' },
  { symbol: 'PLATINUM', yahooSymbol: 'PL=F', name: 'Platinum', unit: 'oz', category: 'Metals' },
  { symbol: 'OIL', yahooSymbol: 'CL=F', name: 'Crude Oil WTI', unit: 'bbl', category: 'Energy' },
  { symbol: 'BRENT', yahooSymbol: 'BZ=F', name: 'Brent Crude', unit: 'bbl', category: 'Energy' },
  { symbol: 'NGAS', yahooSymbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', category: 'Energy' },
  { symbol: 'COFFEE', yahooSymbol: 'KC=F', name: 'Coffee', unit: 'lb', category: 'Soft' },
  { symbol: 'COCOA', yahooSymbol: 'CC=F', name: 'Cocoa', unit: 'MT', category: 'Soft' },
];

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

export async function GET() {
  const cacheKey = 'commodities_all';

  // Check cache first
  const cached = await getCache<CommodityInfo[]>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const yahooSymbols = COMMODITY_SYMBOLS.map(c => c.yahooSymbol);

    const quotes = await yahooFinance.quote(yahooSymbols) as CommodityQuote[];

    const commodities: CommodityInfo[] = [];

    for (const commodity of COMMODITY_SYMBOLS) {
      const quote = quotes.find((q) => q.symbol === commodity.yahooSymbol);

      if (quote && quote.regularMarketPrice !== undefined) {
        commodities.push({
          symbol: commodity.symbol,
          name: commodity.name,
          unit: commodity.unit,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent || 0,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          volume: formatVolume(quote.regularMarketVolume || 0),
          category: commodity.category,
        });
      }
    }

    // Store in cache
    await setCache(cacheKey, commodities);

    return json(commodities);
  } catch (error) {
    console.error('Commodities API error:', error);
    return json({ error: 'Failed to fetch commodity data' }, { status: 500 });
  }
}
