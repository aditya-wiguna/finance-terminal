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

let cachedStocks: SGXStock[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function fetchSGXStocks(): Promise<SGXStock[]> {
  const now = Date.now();

  if (cachedStocks.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedStocks;
  }

  try {
    const response = await fetch('/api/sgx');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const stocks: SGXStock[] = await response.json();

    if (stocks.length > 0) {
      cachedStocks = stocks;
      lastFetchTime = now;
      return stocks;
    }

    throw new Error('No SGX stock data returned');
  } catch (error) {
    console.error('SGX Stocks API error:', error);
    return cachedStocks.length > 0 ? cachedStocks : [];
  }
}