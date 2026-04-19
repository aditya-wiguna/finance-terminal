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

// Top known whale wallets (public data)
const KNOWN_BTC_WHALES = [
  { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', label: 'Satoshi Nakamoto (Dormant)', rank: 1 },
  { address: 'bc1q9se...3k9j', label: 'Binance Cold Wallet', rank: 2 },
  { address: 'bc1q7x...2p5r', label: 'Robinhood', rank: 3 },
  { address: 'bc1q5r...8t3m', label: 'MicroStrategy', rank: 4 },
  { address: 'bc1q2w...9k6p', label: 'FTX/Alameda', rank: 5 },
  { address: 'bc1q8k...4v7n', label: 'Coinbase Cold', rank: 6 },
  { address: 'bc1q3m...1l8c', label: 'Bitfinex', rank: 7 },
  { address: 'bc1q6d...5h9j', label: 'Binance Hot', rank: 8 },
  { address: 'bc1q4n...7t2m', label: 'Unknown Whale', rank: 9 },
  { address: 'bc1q1v...6u8k', label: 'Binance Cold 2', rank: 10 },
];

const KNOWN_ETH_WHALES = [
  { address: '0x4a5e9f2d...8c3a', label: 'Vitalik Buterin', rank: 1 },
  { address: '0x8c3a2b7f...4a5e', label: 'Binance 1', rank: 2 },
  { address: '0x2b7f8c3a...9d4e', label: 'Lido DAO', rank: 3 },
  { address: '0x7f8c3a2b...5e6d', label: 'Crypto.com', rank: 4 },
  { address: '0x3a2b7f8c...1d9f', label: 'Huobi', rank: 5 },
  { address: '0x9f8c3a2b...7e5d', label: 'Kraken', rank: 6 },
  { address: '0x1d9f8c3a...3b6e', label: 'Unknown Whale', rank: 7 },
  { address: '0x6e5d9f8c...2a4b', label: 'Coinbase 2', rank: 8 },
  { address: '0x4b6e5d9f...8c3a', label: 'Binance 3', rank: 9 },
  { address: '0x3a8c4b6e...7d5f', label: 'Bitfinex', rank: 10 },
];

// Sample whale transactions for demo
const SAMPLE_TRANSACTIONS: WhaleTransaction[] = [
  { id: '1', type: 'buy', amount: '2,156 BTC', amountUsd: 145600000, symbol: 'BTC', time: '2 min ago', wallet: 'bc1qxy...7x8', txHash: '0x8f7e...2a4b' },
  { id: '2', type: 'sell', amount: '8,420 ETH', amountUsd: 29600000, symbol: 'ETH', time: '5 min ago', wallet: '0x4a5e...9f2d', txHash: '0x3c7d...9e2f' },
  { id: '3', type: 'buy', amount: '1,523 BTC', amountUsd: 102800000, symbol: 'BTC', time: '8 min ago', wallet: 'bc1q9se...3k9', txHash: '0x1a2b...4c5d' },
  { id: '4', type: 'transfer', amount: '15,670 SOL', amountUsd: 2230000, symbol: 'SOL', time: '12 min ago', wallet: '7n5kM...x4p', txHash: '0x9e8f...1a2b' },
  { id: '5', type: 'buy', amount: '3,892 ETH', amountUsd: 13700000, symbol: 'ETH', time: '15 min ago', wallet: '0x8c3a...2b7f', txHash: '0x5d4c...3b6a' },
  { id: '6', type: 'sell', amount: '567 BTC', amountUsd: 38300000, symbol: 'BTC', time: '18 min ago', wallet: 'bc1q2w...9k6p', txHash: '0x7c8d...2e3f' },
  { id: '7', type: 'buy', amount: '12,456 ETH', amountUsd: 43800000, symbol: 'ETH', time: '22 min ago', wallet: '0x2b7f...8c3a', txHash: '0x4b5a...1d2e' },
  { id: '8', type: 'transfer', amount: '4,231 SOL', amountUsd: 602000, symbol: 'SOL', time: '25 min ago', wallet: '9m4nP...q8r', txHash: '0x3a4b...5c6d' },
];

let cachedBtcWhales: WhaleWallet[] = [];
let cachedEthWhales: WhaleWallet[] = [];
let cachedTransactions: WhaleTransaction[] = [...SAMPLE_TRANSACTIONS];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function fetchBtcWhales(): Promise<WhaleWallet[]> {
  if (cachedBtcWhales.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedBtcWhales;
  }

  // In production, you would call a blockchain API here
  // For now, we use known whale data with simulated balances
  const btcPrice = 67500; // Would fetch real price in production

  cachedBtcWhales = KNOWN_BTC_WHALES.map((whale, index) => ({
    rank: whale.rank,
    address: whale.address,
    label: whale.label,
    balance: generateBtcBalance(whale.rank),
    change: generateChange(),
    type: 'btc' as const,
    totalReceived: generateTotal(btcPrice, whale.rank),
    totalSent: generateTotal(btcPrice, whale.rank * 0.7),
  }));

  lastFetchTime = Date.now();
  return cachedBtcWhales;
}

export async function fetchEthWhales(): Promise<WhaleWallet[]> {
  if (cachedEthWhales.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedEthWhales;
  }

  const ethPrice = 3500; // Would fetch real price in production

  cachedEthWhales = KNOWN_ETH_WHALES.map((whale) => ({
    rank: whale.rank,
    address: whale.address,
    label: whale.label,
    balance: generateEthBalance(whale.rank),
    change: generateChange(),
    type: 'eth' as const,
    totalReceived: generateTotal(ethPrice, whale.rank),
    totalSent: generateTotal(ethPrice, whale.rank * 0.6),
  }));

  return cachedEthWhales;
}

export async function fetchWhaleTransactions(): Promise<WhaleTransaction[]> {
  // Simulate new transactions appearing
  if (Math.random() > 0.7) {
    const newTx = generateRandomTransaction();
    cachedTransactions = [newTx, ...cachedTransactions.slice(0, 7)];
  }
  return cachedTransactions;
}

function generateBtcBalance(rank: number): string {
  const balances = [127543, 98421, 67892, 52254, 45678, 38912, 34521, 28456, 23789, 19234];
  const balance = balances[rank - 1] || 10000 + Math.random() * 50000;
  return `${balance.toLocaleString()} BTC`;
}

function generateEthBalance(rank: number): string {
  const balances = [892456, 678234, 543892, 412567, 387234, 345678, 298456, 256789, 212345, 187654];
  const balance = balances[rank - 1] || 100000 + Math.random() * 300000;
  return `${balance.toLocaleString()} ETH`;
}

function generateChange(): string {
  const change = (Math.random() - 0.5) * 10;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

function generateTotal(price: number, multiplier: number): string {
  const total = price * multiplier * 1000000;
  if (total >= 1e9) return `$${(total / 1e9).toFixed(2)}B`;
  if (total >= 1e6) return `$${(total / 1e6).toFixed(2)}M`;
  return `$${total.toFixed(2)}`;
}

function generateRandomTransaction(): WhaleTransaction {
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];
  const types: ('buy' | 'sell' | 'transfer')[] = ['buy', 'sell', 'transfer'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const type = types[Math.floor(Math.random() * types.length)];

  const amounts: Record<string, number> = {
    BTC: 100 + Math.random() * 2000,
    ETH: 1000 + Math.random() * 15000,
    SOL: 5000 + Math.random() * 50000,
    XRP: 100000 + Math.random() * 1000000,
    ADA: 500000 + Math.random() * 5000000,
  };

  const prices: Record<string, number> = {
    BTC: 67500,
    ETH: 3500,
    SOL: 145,
    XRP: 0.52,
    ADA: 0.45,
  };

  const amount = amounts[symbol];
  const price = prices[symbol];
  const total = amount * price;

  return {
    id: Date.now().toString(),
    type,
    amount: `${Math.floor(amount).toLocaleString()} ${symbol}`,
    amountUsd: total,
    symbol,
    time: 'Just now',
    wallet: `${symbol === 'BTC' ? 'bc1' : '0x'}${Math.random().toString(36).slice(2, 8)}...${Math.random().toString(36).slice(2, 5)}`,
    txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 5)}`,
  };
}

export function getWhaleStats() {
  return {
    totalWhaleBalance: '$14.2B',
    dailyVolume: '$892M',
    largeTxs: '47 txns',
    exchangeInflows: '$245M',
    exchangeOutflows: '$312M',
    netFlow: '-$67M (Out)',
  };
}
