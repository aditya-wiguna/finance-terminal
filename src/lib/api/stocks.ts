export interface StockData {
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

// Cache
let cachedStocks: StockData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function fetchIndonesianStocks(): Promise<StockData[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedStocks.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedStocks;
  }

  try {
    const response = await fetch('/api/stocks');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const stocks: StockData[] = await response.json();

    if (stocks.length > 0) {
      cachedStocks = stocks;
      lastFetchTime = now;
      return stocks;
    }

    throw new Error('No stock data returned');
  } catch (error) {
    console.error('Stocks API error:', error);
    // Return cached data if available, otherwise return empty
    return cachedStocks.length > 0 ? cachedStocks : [];
  }
}

export async function fetchStockQuote(symbol: string): Promise<StockData | null> {
  try {
    const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    const stock: StockData = await response.json();
    return stock;
  } catch (error) {
    console.error('Stock quote error:', error);
    return null;
  }
}

export interface StockStrategySignal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'SIDEWAYS';
  strength: number;
  ema21: number;
  ema34: number;
  ema50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  reason: string;
  history: number[];
}

let cachedStrategy: StockStrategySignal[] = [];
let lastStrategyFetchTime = 0;
const STRATEGY_CACHE_DURATION = 60000; // 1 minute

export async function fetchStocksEMABBStrategy(): Promise<StockStrategySignal[]> {
  const now = Date.now();

  if (cachedStrategy.length > 0 && now - lastStrategyFetchTime < STRATEGY_CACHE_DURATION) {
    return cachedStrategy;
  }

  try {
    const response = await fetch('/api/stocks/ema-bb');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    const stocks = result.stocks || [];

    cachedStrategy = stocks;
    lastStrategyFetchTime = now;
    return stocks;
  } catch (error) {
    console.error('Stocks EMA-BB API error:', error);
    return cachedStrategy.length > 0 ? cachedStrategy : [];
  }
}
