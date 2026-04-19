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
