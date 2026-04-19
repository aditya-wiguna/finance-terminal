export interface CommodityData {
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

let cachedData: CommodityData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function fetchCommodities(): Promise<CommodityData[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const response = await fetch('/api/commodities');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const commodities: CommodityData[] = await response.json();

    if (commodities.length > 0) {
      cachedData = commodities;
      lastFetchTime = now;
      return commodities;
    }

    throw new Error('No data returned');
  } catch (error) {
    console.error('Commodities API error:', error);
    // Return cached data if available, otherwise return empty
    return cachedData.length > 0 ? cachedData : [];
  }
}

export function getCommodityStats() {
  const gold = cachedData.find(c => c.symbol === 'GOLD');
  const silver = cachedData.find(c => c.symbol === 'SILVER');
  const platinum = cachedData.find(c => c.symbol === 'PLATINUM');
  const ng = cachedData.find(c => c.symbol === 'NGAS');

  return {
    goldSilverRatio: gold && silver && silver.price > 0
      ? (gold.price / silver.price)
      : 84.1,
    platinumSpot: platinum?.price || 985,
    palladiumSpot: 1025,
    opacBasket: 84.20,
    henryHub: ng?.price || 2.85,
    newcastleCoal: 142,
    wheat: 5.85,
    corn: 4.52,
    sugar: 0.21,
  };
}
