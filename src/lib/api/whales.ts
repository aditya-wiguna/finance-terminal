export interface WhaleWallet {
  rank: number;
  address: string;
  label: string;
  balance: string;
  change: string;
  type: 'btc' | 'eth';
  totalReceived: string;
  totalSent: string;
}

export interface WhaleTransaction {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: string;
  amountUsd: number;
  symbol: string;
  time: string;
  wallet: string;
  txHash: string;
}

let cachedTransactions: WhaleTransaction[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000;

export async function fetchWhaleTransactions(): Promise<WhaleTransaction[]> {
  const now = Date.now();

  if (cachedTransactions.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedTransactions;
  }

  try {
    const response = await fetch('/api/whales');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    cachedTransactions = data.transactions || [];
    lastFetchTime = now;
    return cachedTransactions;
  } catch (error) {
    console.error('Whale API error:', error);
    return cachedTransactions;
  }
}

export async function fetchBtcWhales(): Promise<WhaleWallet[]> {
  return [];
}

export async function fetchEthWhales(): Promise<WhaleWallet[]> {
  return [];
}

export function getWhaleStats() {
  const totalVolume = cachedTransactions.reduce((sum, tx) => sum + tx.amountUsd, 0);
  const buys = cachedTransactions.filter(tx => tx.type === 'buy').length;
  const sells = cachedTransactions.filter(tx => tx.type === 'sell').length;
  const transfers = cachedTransactions.filter(tx => tx.type === 'transfer').length;

  return {
    totalWhaleBalance: `$${(totalVolume / 1e9).toFixed(2)}B`,
    dailyVolume: `$${(totalVolume / 1e6).toFixed(2)}M`,
    largeTxs: `${cachedTransactions.length} txns`,
    exchangeInflows: `$${(sells * 100).toFixed(0)}M`,
    exchangeOutflows: `$${(buys * 100).toFixed(0)}M`,
    netFlow: buys > sells ? `+$${Math.abs(buys - sells) * 100}M (In)` : `-$${Math.abs(buys - sells) * 100}M (Out)`,
  };
}