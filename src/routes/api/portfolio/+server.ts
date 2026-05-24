import { json } from '@sveltejs/kit';
import { Query } from 'appwrite';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  findDocument,
  PORTFOLIO_COLLECTION_ID,
} from '$lib/server/db';

interface PortfolioPosition {
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

interface PortfolioSummary {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdate: string;
}

async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const symbolNoJK = symbol.replace('.JK', '');
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbolNoJK}?interval=1d&range=1d`);
    const data = await response.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
  } catch {
    return 0;
  }
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const dbPositions = await listDocuments(PORTFOLIO_COLLECTION_ID, [
      Query.equal('userId', userId),
      Query.limit(100),
    ]);

    const positions = dbPositions.documents || [];

    if (positions.length === 0) {
      return json({
        positions: [],
        totalValue: 0,
        totalCost: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        lastUpdate: new Date().toISOString(),
      });
    }

    let totalValue = 0;
    let totalCost = 0;

    const enriched = await Promise.all(
      positions.map(async (pos) => {
        const currentPrice = await fetchCurrentPrice(pos.symbol as string);
        const shares = parseFloat(pos.shares as string);
        const avgPrice = parseFloat(pos.avgPrice as string);
        const cost = shares * avgPrice;
        const value = shares * currentPrice;
        const pnl = value - cost;
        const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

        totalCost += cost;
        totalValue += value;

        return {
          id: pos.$id,
          symbol: pos.symbol,
          name: pos.name || pos.symbol,
          shares,
          avgPrice,
          currentPrice,
          change: currentPrice - avgPrice,
          changePercent: avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0,
          value,
          pnl,
          pnlPercent,
          addedAt: pos.$createdAt,
        };
      })
    );

    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    const result: PortfolioSummary = {
      positions: enriched,
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdate: new Date().toISOString(),
    };

    return json(result);
  } catch (error) {
    console.error('Portfolio API error:', error);
    return json({
      positions: [],
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdate: new Date().toISOString(),
      error: 'Failed to fetch portfolio',
    }, { status: 200 });
  }
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json();
  const { action, userId, symbol, name, shares, price } = body;

  if (!userId) {
    return json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    if (action === 'add') {
      const existing = await findDocument(PORTFOLIO_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('symbol', symbol),
        Query.limit(1),
      ]);

      if (existing) {
        const totalShares = parseFloat(existing.shares as string) + shares;
        const totalCost = parseFloat(existing.shares as string) * parseFloat(existing.avgPrice as string) + shares * price;
        const newAvgPrice = totalCost / totalShares;

        await updateDocument(PORTFOLIO_COLLECTION_ID, existing.$id, {
          shares: totalShares.toString(),
          avgPrice: newAvgPrice.toString(),
          name: name || symbol,
        });
      } else {
        await createDocument(PORTFOLIO_COLLECTION_ID, {
          userId,
          symbol,
          name: name || symbol,
          shares: shares.toString(),
          avgPrice: price.toString(),
        });
      }

      return json({ success: true });
    } else if (action === 'remove') {
      const existing = await findDocument(PORTFOLIO_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('symbol', symbol),
        Query.limit(1),
      ]);

      if (existing) {
        await deleteDocument(PORTFOLIO_COLLECTION_ID, existing.$id);
      }

      return json({ success: true });
    } else if (action === 'clear') {
      const positions = await listDocuments(PORTFOLIO_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]);

      for (const pos of positions.documents) {
        await deleteDocument(PORTFOLIO_COLLECTION_ID, pos.$id);
      }

      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return json({ error: 'Failed to update portfolio' }, { status: 500 });
  }
}