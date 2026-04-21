export interface PredictionMarket {
  id: string;
  question: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  traderCount: number;
  category: string;
  tags: string[];
  endDate: string | null;
  resolutionTime: string | null;
  url: string;
  change24h: number;
}

export interface PredictionMarketsData {
  markets: PredictionMarket[];
  totalVolume: number;
  lastUpdate: string;
  categories: string[];
}

let cachedData: PredictionMarketsData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function fetchPredictionMarkets(): Promise<PredictionMarketsData> {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const response = await fetch('/api/prediction-markets');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: PredictionMarketsData = await response.json();

    cachedData = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.error('Prediction Markets API error:', error);
    // Return empty data on error
    return {
      markets: [],
      totalVolume: 0,
      lastUpdate: new Date().toISOString(),
      categories: [],
    };
  }
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

export function formatOdds(price: number): string {
  if (price >= 0.9) return `${(price * 100).toFixed(0)}%`;
  if (price >= 0.1) return `${(price * 100).toFixed(1)}%`;
  return `${(price * 100).toFixed(2)}%`;
}

export function getProbabilityColor(yesPrice: number): string {
  if (yesPrice >= 0.7) return 'text-green-400';
  if (yesPrice >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}