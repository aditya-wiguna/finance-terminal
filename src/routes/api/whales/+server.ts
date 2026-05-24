import { json } from '@sveltejs/kit';
import { getCache, setCache } from '$lib/cache';

interface WhaleTransaction {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: string;
  amountUsd: number;
  symbol: string;
  time: string;
  wallet: string;
  txHash: string;
}

interface WhaleResult {
  transactions: WhaleTransaction[];
  lastUpdate: string;
}

const CRYPTOPULSE_API = 'https://cryptopulse.uno';

// CryptoPulse response interfaces
interface CryptoPulseWhale {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: string;
  amount_usd: number;
  symbol: string;
  time: string;
  wallet: string;
  tx_hash: string;
  chain?: string;
}

interface CryptoPulseResponse {
  transactions: CryptoPulseWhale[];
  last_update?: string;
}

async function fetchCryptoPulseWhales(): Promise<WhaleTransaction[]> {
  try {
    // Free tier: top 10 whale moves daily, 30-min delayed
    // No API key needed for basic access
    const response = await fetch(
      `${CRYPTOPULSE_API}/api/whales?limit=15&period=24h`,
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`CryptoPulse API error: ${response.status}`);
      return [];
    }

    const data: CryptoPulseResponse = await response.json();
    const whales = data?.transactions || [];

    return whales.map((tx: CryptoPulseWhale) => ({
      id: tx.id || `whale-${Date.now()}-${Math.random()}`,
      type: tx.type || 'transfer',
      amount: tx.amount || '0',
      amountUsd: tx.amount_usd || 0,
      symbol: tx.symbol || 'UNKNOWN',
      time: tx.time || new Date().toISOString(),
      wallet: tx.wallet || 'Unknown',
      txHash: tx.tx_hash || '',
    }));
  } catch (error) {
    console.error('CryptoPulse API error:', error);
    return [];
  }
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  } catch {
    return 'Unknown';
  }
}

export async function GET() {
  const cacheKey = 'whale_transactions';
  const cache = await getCache<WhaleResult>(cacheKey);
  if (cache) {
    return json(cache);
  }

  try {
    const whales = await fetchCryptoPulseWhales();

    const allTxns = whales
      .sort((a, b) => b.amountUsd - a.amountUsd)
      .slice(0, 15)
      .map(tx => ({
        ...tx,
        time: formatTime(tx.time),
      }));

    const result: WhaleResult = {
      transactions: allTxns,
      lastUpdate: new Date().toISOString(),
    };

    // Cache 1 minute for CryptoPulse free tier (30-min delay anyway)
    await setCache(cacheKey, result, 60000);

    return json(result);
  } catch (error) {
    console.error('Whale transactions API error:', error);
    return json({
      transactions: [],
      lastUpdate: new Date().toISOString(),
      error: 'Failed to fetch whale data',
    }, { status: 200 });
  }
}