import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';

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

interface StockInfo {
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
  foreign: string;
}

const IDX_STOCKS = [
  { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia' },
  { symbol: 'TLKM.JK', name: 'Telkom Indonesia' },
  { symbol: 'BBCA.JK', name: 'Bank Central Asia' },
  { symbol: 'BMRI.JK', name: 'Bank Mandiri' },
  { symbol: 'ASII.JK', name: 'Astra International' },
  { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia' },
  { symbol: 'UNVR.JK', name: 'Unilever Indonesia' },
  { symbol: 'HMSN.JK', name: 'Harum Energy' },
];

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

function generateForeignFlow(change: number): string {
  const amount = Math.floor(Math.random() * 300 + 50);
  const formattedAmount = amount > 100 ? `${(amount / 1000).toFixed(1)}B` : `${amount}B`;
  return change >= 0
    ? `Net Buy Rp ${formattedAmount}`
    : `Net Sell Rp ${formattedAmount}`;
}

async function fetchStockData(symbol: string): Promise<StockInfo | null> {
  const info = IDX_STOCKS.find(s => s.symbol === symbol);
  if (!info) return null;

  try {
    const quotes = await yahooFinance.quote([symbol]) as StockQuote[];
    const quote = quotes[0];

    if (!quote || quote.regularMarketPrice === undefined) return null;

    const change = quote.regularMarketChange || 0;

    return {
      symbol: info.symbol.replace('.JK', ''),
      name: info.name,
      price: quote.regularMarketPrice,
      change: change,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: formatVolume(quote.regularMarketVolume || 0),
      high: quote.regularMarketDayHigh || quote.regularMarketPrice,
      low: quote.regularMarketDayLow || quote.regularMarketPrice,
      open: quote.regularMarketOpen || quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
      foreign: generateForeignFlow(change),
    };
  } catch {
    return null;
  }
}

export async function GET({ url }) {
  try {
    const symbol = url.searchParams.get('symbol');

    // If symbol is provided, return single stock
    if (symbol) {
      const stockSymbol = symbol.toUpperCase().includes('.JK')
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}.JK`;

      const stock = await fetchStockData(stockSymbol);
      if (stock) {
        return json(stock);
      }
      return json({ error: 'Stock not found' }, { status: 404 });
    }

    // Otherwise return all stocks
    const symbols = IDX_STOCKS.map(s => s.symbol);
    const quotes = await yahooFinance.quote(symbols) as StockQuote[];

    const stocks: StockInfo[] = [];

    for (const info of IDX_STOCKS) {
      const quote = quotes.find((q) => q.symbol === info.symbol);

      if (quote && quote.regularMarketPrice !== undefined) {
        const change = quote.regularMarketChange || 0;

        stocks.push({
          symbol: info.symbol.replace('.JK', ''),
          name: info.name,
          price: quote.regularMarketPrice,
          change: change,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: formatVolume(quote.regularMarketVolume || 0),
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          foreign: generateForeignFlow(change),
        });
      }
    }

    return json(stocks);
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
