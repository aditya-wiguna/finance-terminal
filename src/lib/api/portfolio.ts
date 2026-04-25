export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  addedAt: string;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdate: string;
}

let cachedSummary: PortfolioSummary | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000;

let currentUserId: string | null = null;

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
  cachedSummary = null;
  lastFetchTime = 0;
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  if (!currentUserId) {
    return {
      positions: [],
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdate: new Date().toISOString(),
    };
  }

  const now = Date.now();

  if (cachedSummary && now - lastFetchTime < CACHE_DURATION) {
    return cachedSummary;
  }

  try {
    const response = await fetch(`/api/portfolio?userId=${encodeURIComponent(currentUserId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    cachedSummary = await response.json() as PortfolioSummary;
    lastFetchTime = now;
    return cachedSummary as PortfolioSummary;
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return {
      positions: [],
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdate: new Date().toISOString(),
    };
  }
}

export async function addPosition(symbol: string, name: string, shares: number, price: number): Promise<boolean> {
  if (!currentUserId) return false;

  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', userId: currentUserId, symbol, name, shares, price }),
    });

    if (!response.ok) return false;

    cachedSummary = null;
    lastFetchTime = 0;
    return true;
  } catch (error) {
    console.error('Add position error:', error);
    return false;
  }
}

export async function removePosition(symbol: string): Promise<boolean> {
  if (!currentUserId) return false;

  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', userId: currentUserId, symbol }),
    });

    if (!response.ok) return false;

    cachedSummary = null;
    lastFetchTime = 0;
    return true;
  } catch (error) {
    console.error('Remove position error:', error);
    return false;
  }
}

export async function clearPortfolio(): Promise<boolean> {
  if (!currentUserId) return false;

  try {
    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', userId: currentUserId }),
    });

    if (!response.ok) return false;

    cachedSummary = null;
    lastFetchTime = 0;
    return true;
  } catch (error) {
    console.error('Clear portfolio error:', error);
    return false;
  }
}