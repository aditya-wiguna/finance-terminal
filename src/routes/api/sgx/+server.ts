import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface StockQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
}

export interface SGXStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  dayRange: string;
  foreign: string;
}

// Popular Singapore Exchange (SGX) stocks
const SGX_STOCKS = [
  { symbol: 'D05.SI', name: 'DBS Group' },
  { symbol: 'O39.SI', name: 'OCBC Bank' },
  { symbol: 'U11.SI', name: 'UOB Bank' },
  { symbol: 'C6L.SI', name: 'Singapore Airlines' },
  { symbol: 'N4E.SI', name: 'Singapore Technologies' },
  { symbol: 'S68.SI', name: 'SBS Transit' },
  { symbol: 'Z74.SI', name: 'Singtel' },
  { symbol: 'ME8U.SI', name: 'Mapletree' },
  { symbol: 'TSLA.SI', name: 'Fraser & Neave' },
  { symbol: 'BN4.SI', name: 'Keppel Corp' },
  { symbol: 'VCF.SI', name: 'Venture Corp' },
  { symbol: 'A17U.SI', name: 'CapitaLand REIT' },
];

const CACHE_DURATION = 60 * 1000; // 1 minute

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

function generateForeignFlow(change: number): string {
  const amount = Math.floor(Math.random() * 200 + 50);
  const formattedAmount = amount > 100 ? `${(amount / 1000).toFixed(1)}B` : `${amount}M`;
  return change >= 0
    ? `Net Buy S$${formattedAmount}`
    : `Net Sell S$${formattedAmount}`;
}

async function fetchSGXStockData(symbol: string, name: string): Promise<SGXStock | null> {
  try {
    const quotes = await yahooFinance.quote([symbol]) as StockQuote[];
    const quote = quotes[0];

    if (!quote || quote.regularMarketPrice === undefined) return null;

    const change = quote.regularMarketChange || 0;
    const high = quote.regularMarketDayHigh || quote.regularMarketPrice;
    const low = quote.regularMarketDayLow || quote.regularMarketPrice;

    return {
      symbol: symbol.replace('.SI', ''),
      name,
      price: quote.regularMarketPrice,
      change: change,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: formatVolume(quote.regularMarketVolume || 0),
      high,
      low,
      open: quote.regularMarketOpen || quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
      dayRange: `${low.toFixed(2)} - ${high.toFixed(2)}`,
      foreign: generateForeignFlow(change),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const cacheKey = 'sgx_stocks_all';

  const cached = await getCache<SGXStock[]>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const symbols = SGX_STOCKS.map(s => s.symbol);
    const quotes = await yahooFinance.quote(symbols) as StockQuote[];

    const stocks: SGXStock[] = [];

    for (const info of SGX_STOCKS) {
      const quote = quotes.find((q) => q.symbol === info.symbol);

      if (quote && quote.regularMarketPrice !== undefined) {
        const change = quote.regularMarketChange || 0;
        const high = quote.regularMarketDayHigh || quote.regularMarketPrice;
        const low = quote.regularMarketDayLow || quote.regularMarketPrice;

        stocks.push({
          symbol: info.symbol.replace('.SI', ''),
          name: info.name,
          price: quote.regularMarketPrice,
          change: change,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: formatVolume(quote.regularMarketVolume || 0),
          high,
          low,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          dayRange: `${low.toFixed(2)} - ${high.toFixed(2)}`,
          foreign: generateForeignFlow(change),
        });
      }
    }

    // Store in cache
    await setCache(cacheKey, stocks, CACHE_DURATION);

    return json(stocks);
  } catch (error) {
    console.error('SGX Yahoo Finance error:', error);
    return json({ error: 'Failed to fetch SGX stock data' }, { status: 500 });
  }
}