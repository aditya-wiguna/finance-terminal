export interface GeoTensionEvent {
  id: string;
  date: string;
  country: string;
  region: string;
  category: string;
  event: string;
  intensity: number;
  tone: number;
}

export interface GeoRiskIndex {
  globalTension: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  topRisks: GeoTensionEvent[];
  lastUpdate: string;
}

let cachedData: GeoRiskIndex | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minutes cache

export async function fetchGeoRiskIndex(): Promise<GeoRiskIndex> {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const response = await fetch('/api/geopolitical');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: GeoRiskIndex = await response.json();

    cachedData = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.error('Geo Risk API error:', error);
    // Return default fallback
    return {
      globalTension: 50,
      level: 'MODERATE',
      topRisks: [],
      lastUpdate: new Date().toISOString()
    };
  }
}