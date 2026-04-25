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

const BLOCKCHAIR_API = 'https://api.blockchair.com';

async function fetchBlockchairTxns(chain: 'bitcoin' | 'ethereum', limit = 20): Promise<WhaleTransaction[]> {
  try {
    const response = await fetch(
      `${BLOCKCHAIR_API}/${chain}/outputs?limit=${limit}&spending_status=unspent`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const txns = data?.data || [];

    return txns.map((tx: any, index: number) => {
      const amount = chain === 'bitcoin'
        ? (tx.value || 0) / 1e8
        : (tx.value || 0) / 1e18;

      const usdPrice = chain === 'bitcoin' ? 67500 : 3500;
      const amountUsd = amount * usdPrice;

      const isLargeTx = amountUsd > 1000000;
      const type = isLargeTx ? 'buy' : 'transfer';

      return {
        id: tx.hash || `tx-${index}`,
        type,
        amount: `${amount.toFixed(4)} ${chain === 'bitcoin' ? 'BTC' : 'ETH'}`,
        amountUsd,
        symbol: chain === 'bitcoin' ? 'BTC' : 'ETH',
        time: tx.time || new Date().toISOString(),
        wallet: tx.sender ? `${tx.sender.slice(0, 8)}...${tx.sender.slice(-4)}` : 'Unknown',
        txHash: tx.hash || '',
      };
    }).filter((tx: WhaleTransaction) => tx.amountUsd > 50000);
  } catch (error) {
    console.error(`Blockchair ${chain} error:`, error);
    return [];
  }
}

async function fetchEthereumWhaleTxns(limit = 20): Promise<WhaleTransaction[]> {
  try {
    const response = await fetch(
      `${BLOCKCHAIR_API}/ethereum/outputs?limit=${limit}&spending_status=unspent`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const txns = data?.data || [];

    return txns.map((tx: any, index: number) => {
      const amount = (tx.value || 0) / 1e18;
      const amountUsd = amount * 3500;

      return {
        id: tx.hash || `tx-${index}`,
        type: amountUsd > 1000000 ? 'buy' : 'transfer',
        amount: `${amount.toFixed(4)} ETH`,
        amountUsd,
        symbol: 'ETH',
        time: tx.time || new Date().toISOString(),
        wallet: tx.sender ? `${tx.sender.slice(0, 8)}...${tx.sender.slice(-4)}` : 'Unknown',
        txHash: tx.hash || '',
      };
    }).filter((tx: WhaleTransaction) => tx.amountUsd > 50000);
  } catch (error) {
    console.error('Blockchair ETH error:', error);
    return [];
  }
}

async function fetchSolanaLargeTxns(limit = 20): Promise<WhaleTransaction[]> {
  try {
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) return [];

    const pair = data.pairs[0];
    const buys = pair.txns?.h1?.buys || 0;
    const sells = pair.txns?.h1?.sells || 0;

    if (buys + sells === 0) return [];

    return [{
      id: `sol-${Date.now()}`,
      type: buys > sells ? 'buy' : 'sell',
      amount: `SOL`,
      amountUsd: pair.volume?.h1 || 0,
      symbol: 'SOL',
      time: new Date().toISOString(),
      wallet: ' DEX',
      txHash: pair.url || '',
    }];
  } catch (error) {
    console.error('DexScreener Solana error:', error);
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

  const cached = await getCache<WhaleResult>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const [btcTxns, ethTxns, solTxns] = await Promise.all([
      fetchBlockchairTxns('bitcoin', 30),
      fetchEthereumWhaleTxns(30),
      fetchSolanaLargeTxns(10),
    ]);

    const allTxns = [...btcTxns, ...ethTxns, ...solTxns]
      .sort((a, b) => b.amountUsd - a.amountUsd)
      .slice(0, 15)
      .map(tx => ({
        ...tx,
        time: tx.time ? formatTime(tx.time) : tx.time,
      }));

    const result: WhaleResult = {
      transactions: allTxns,
      lastUpdate: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 30000);

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