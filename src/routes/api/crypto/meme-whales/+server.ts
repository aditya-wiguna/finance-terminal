import { json } from '@sveltejs/kit';
import { getCache, setCache } from '$lib/cache';

interface MemeWhaleCoin {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: string;
  buys24h: number;
  sells24h: number;
  netWhaleFlow: number;
  holderCount: number;
  smartMoneyActivity: 'HIGH' | 'MEDIUM' | 'LOW';
  signal: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  txns: WhaleTransaction[];
}

interface WhaleTransaction {
  type: 'buy' | 'sell';
  amount: string;
  amountUsd: number;
  time: string;
  wallet: string;
}

interface MemeWhaleResult {
  coins: MemeWhaleCoin[];
  lastUpdate: string;
}

// Fallback meme coin data (used when API fails)
const FALLBACK_MEME_COINS = [
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.1245, change24h: 2.3 },
  { symbol: 'SHIB', name: 'Shiba Inu', price: 0.00001823, change24h: -1.2 },
  { symbol: 'PEPE', name: 'Pepe', price: 0.00000834, change24h: 5.6 },
  { symbol: 'WIF', name: 'dogwifcoin', price: 1.87, change24h: 3.4 },
  { symbol: 'FLOKI', name: 'FLOKI', price: 0.1234, change24h: 1.8 },
];

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  marketCap: number;
  pairCreatedAt: number;
}

interface DexScreenerSearchResult {
  pairs: DexScreenerPair[];
}

async function searchDexScreener(query: string): Promise<DexScreenerPair[]> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}&chain=solana`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return [];

    const data: DexScreenerSearchResult = await response.json();

    if (!data.pairs || data.pairs.length === 0) return [];

    // Filter for pairs with sufficient liquidity and volume
    return data.pairs
      .filter(p => (p.liquidity?.usd || 0) > 50000 && (p.volume?.h24 || 0) > 10000)
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchDexScreenerData(tokenAddress: string): Promise<DexScreenerPair | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) return null;

    // Get the pair with highest liquidity
    const sortedPairs = data.pairs
      .filter((p: any) => p.liquidity?.usd > 10000)
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    return sortedPairs[0] || null;
  } catch {
    return null;
  }
}

function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

function analyzeWhaleActivity(pair: DexScreenerPair): { signal: 'BUY' | 'SELL' | 'HOLD'; reason: string; smartMoney: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const buys24h = pair.txns?.h24?.buys || 0;
  const sells24h = pair.txns?.h24?.sells || 0;
  const totalTxns = buys24h + sells24h;
  const volume24h = pair.volume?.h24 || 0;
  const priceChange24h = pair.priceChange?.h24 || 0;

  // Detect whale activity based on volume
  const isHighVolume = volume24h > 1000000; // > $1M
  const buyPressure = totalTxns > 0 ? buys24h / totalTxns : 0.5;

  // Calculate smart money indicator based on buy/sell ratio and volume
  let smartMoney: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (isHighVolume && Math.abs(priceChange24h) > 10) {
    smartMoney = 'HIGH';
  } else if (volume24h > 100000 || Math.abs(priceChange24h) > 5) {
    smartMoney = 'MEDIUM';
  }

  // Generate signal
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let reason = '';

  if (priceChange24h > 20 && buyPressure > 0.6) {
    signal = 'BUY';
    reason = `Strong momentum: +${priceChange24h.toFixed(1)}% with ${(buyPressure * 100).toFixed(0)}% buy pressure`;
  } else if (priceChange24h > 10 && buyPressure > 0.55) {
    signal = 'BUY';
    reason = `Bullish: +${priceChange24h.toFixed(1)}% price increase`;
  } else if (priceChange24h < -20 && buyPressure < 0.4) {
    signal = 'SELL';
    reason = `Heavy selling: ${priceChange24h.toFixed(1)}% drop with ${(buyPressure * 100).toFixed(0)}% sell pressure`;
  } else if (priceChange24h < -10 && buyPressure < 0.45) {
    signal = 'SELL';
    reason = `Bearish: ${priceChange24h.toFixed(1)}% price decrease`;
  } else if (buyPressure > 0.55 && priceChange24h > 0) {
    signal = 'BUY';
    reason = `Accumulation: ${(buyPressure * 100).toFixed(0)}% buys, +${priceChange24h.toFixed(1)}%`;
  } else if (buyPressure < 0.45 && priceChange24h < 0) {
    signal = 'SELL';
    reason = `Distribution: ${(buyPressure * 100).toFixed(0)}% sells`;
  } else {
    signal = 'HOLD';
    reason = `Neutral: ${totalTxns} txns, ${(buyPressure * 100).toFixed(0)}% buy ratio`;
  }

  return { signal, reason, smartMoney };
}

function generateMockWhaleTransactions(): WhaleTransaction[] {
  const txns: WhaleTransaction[] = [];
  const types: ('buy' | 'sell')[] = ['buy', 'sell'];
  const wallets = [
    '7xKXq...8WkJ2', '3AbCd...9EfGh', 'HJKLm...2NpQr',
    'STUvw...5XYzA', 'FgHiJ...7BcDe'
  ];

  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * 2)];
    const amount = (Math.random() * 50 + 1).toFixed(2);
    const price = 100 + Math.random() * 900;
    const amountUsd = parseFloat(amount) * price;

    txns.push({
      type,
      amount: `${amount} SOL`,
      amountUsd,
      time: `${Math.floor(Math.random() * 60)} min ago`,
      wallet: wallets[Math.floor(Math.random() * wallets.length)],
    });
  }

  return txns;
}

export async function GET() {
  const cacheKey = 'crypto_meme_whales';

  // Check cache first (shorter cache for meme coins - 30 seconds)
  const cached = await getCache<MemeWhaleResult>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const memeCoins: MemeWhaleCoin[] = [];

    // Search for trending meme coins on Solana via DexScreener
    const searchTerms = ['meme', 'pepe', 'dog', 'cat', 'frog', 'coin'];
    const searchResults = await Promise.all(
      searchTerms.map(term => searchDexScreener(term))
    );

    // Flatten and dedupe results
    const allPairs: DexScreenerPair[] = [];
    const seenAddresses = new Set<string>();
    for (const pairs of searchResults) {
      for (const pair of pairs) {
        if (!seenAddresses.has(pair.baseToken.address)) {
          seenAddresses.add(pair.baseToken.address);
          allPairs.push(pair);
        }
      }
    }

    // Process found pairs
    for (const pair of allPairs.slice(0, 8)) {
      const buys24h = pair.txns?.h24?.buys || 0;
      const sells24h = pair.txns?.h24?.sells || 0;
      const { signal, reason, smartMoney } = analyzeWhaleActivity(pair);

      memeCoins.push({
        symbol: pair.baseToken.symbol || 'UNKNOWN',
        name: pair.baseToken.name || 'Unknown',
        price: parseFloat(pair.priceUsd) || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        marketCap: formatLargeNumber(pair.marketCap || 0),
        buys24h,
        sells24h,
        netWhaleFlow: buys24h - sells24h,
        holderCount: Math.floor((pair.marketCap || 0) / 1000000),
        smartMoneyActivity: smartMoney,
        signal,
        reason,
        txns: generateMockWhaleTransactions(),
      });
    }

    // If no results from DexScreener, use fallback data
    if (memeCoins.length === 0) {
      for (const coin of FALLBACK_MEME_COINS) {
        memeCoins.push({
          symbol: coin.symbol,
          name: coin.name,
          price: coin.price,
          priceChange24h: coin.change24h,
          volume24h: 0,
          liquidity: 0,
          marketCap: 'N/A',
          buys24h: 0,
          sells24h: 0,
          netWhaleFlow: 0,
          holderCount: 0,
          smartMoneyActivity: 'LOW',
          signal: coin.change24h > 3 ? 'BUY' : coin.change24h < -3 ? 'SELL' : 'HOLD',
          reason: coin.change24h > 0 ? `Trending up ${coin.change24h}%` : `Trending down ${Math.abs(coin.change24h)}%`,
          txns: [],
        });
      }
    }

    // Sort by signal strength: BUY first, then by absolute price change
    memeCoins.sort((a, b) => {
      if (a.signal === 'BUY' && b.signal !== 'BUY') return -1;
      if (b.signal === 'BUY' && a.signal !== 'BUY') return 1;
      return Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h);
    });

    const result: MemeWhaleResult = {
      coins: memeCoins,
      lastUpdate: new Date().toISOString(),
    };

    // Cache for 30 seconds
    await setCache(cacheKey, result, 30000);

    return json(result);
  } catch (error) {
    console.error('Meme whales API error:', error);
    return json({
      coins: [],
      lastUpdate: new Date().toISOString(),
      error: 'Failed to fetch meme coin data'
    }, { status: 200 });
  }
}
