import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface StockQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekChangePercent?: number;
  marketCap?: number;
  currency?: string;
  exchange?: string;
  quoteType?: string;
  language?: string;
  region?: string;
}

interface StockDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  avgVolume: string;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  exchange: string;
  currency: string;
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(2)}M`;
  return marketCap.toString();
}

export async function GET({ params }) {
  try {
    const symbol = params.symbol.toUpperCase();
    const fullSymbol = symbol.includes('.') ? symbol : symbol;

    const quotes = await yahooFinance.quote([fullSymbol]) as StockQuote[];
    const quote = quotes[0];

    if (!quote || quote.regularMarketPrice === undefined) {
      return json({ error: 'Stock not found' }, { status: 404 });
    }

    const change = quote.regularMarketChange || 0;

    const stockDetail: StockDetail = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      price: quote.regularMarketPrice,
      change: change,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: formatVolume(quote.regularMarketVolume || 0),
      avgVolume: formatVolume(quote.regularMarketVolume ? quote.regularMarketVolume * 1.5 : 0), // Approximation
      high: quote.regularMarketDayHigh || quote.regularMarketPrice,
      low: quote.regularMarketDayLow || quote.regularMarketPrice,
      open: quote.regularMarketOpen || quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
      marketCap: formatMarketCap(quote.marketCap || 0),
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.regularMarketPrice * 1.2,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.regularMarketPrice * 0.8,
      exchange: quote.exchange || 'Unknown',
      currency: quote.currency || 'USD',
    };

    return json(stockDetail);
  } catch (error) {
    console.error('Stock detail error:', error);
    return json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
