export interface EarningsEvent {
  symbol: string;
  name: string;
  date: string;
  time: string;
  estimate: number;
  reported: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  period: string;
}

interface EarningsResult {
  upcoming: EarningsEvent[];
  recent: EarningsEvent[];
  lastUpdate: string;
}

let cachedData: EarningsResult | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000;

export async function fetchEarningsCalendar(): Promise<EarningsResult> {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const response = await fetch('/api/stocks/earnings');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    cachedData = await response.json();
    lastFetchTime = now;
    return cachedData!;
  } catch (error) {
    console.error('Earnings calendar error:', error);
    return { upcoming: [], recent: [], lastUpdate: new Date().toISOString() };
  }
}

export async function fetchUpcomingEarnings(): Promise<EarningsEvent[]> {
  const data = await fetchEarningsCalendar();
  return data.upcoming;
}

export async function fetchRecentEarnings(): Promise<EarningsEvent[]> {
  const data = await fetchEarningsCalendar();
  return data.recent;
}