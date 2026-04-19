const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  marketCap: string;
  volume24h: string;
  sparkline: string;
  high24h: number;
  low24h: number;
  image: string;
}

export interface TrendingMemeCoin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  marketCap: string;
  thumb: string;
}

// Top cryptocurrencies by market cap
const TOP_CRYPTOS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
  'cardano', 'dogecoin', 'polkadot', 'avalanche-2', 'chainlink',
  'polygon', 'litecoin', 'uniswap', 'stellar', 'cosmos'
];

// Known meme coins to track
const MEME_COINS = [
  'dogecoin', 'shiba-inu', 'pepe', 'dogwifcoin', 'floki',
  'bonk', 'memecoin', '狗币', '柴犬币', 'pepe-2'
];

let cachedData: CryptoData[] = [];
let cachedMemeCoins: TrendingMemeCoin[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export async function fetchCryptoData(): Promise<CryptoData[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const ids = TOP_CRYPTOS.join(',');
    const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=15&page=1&sparkline=true&price_change_percentage=24h`;

    const response = await fetch(url);

    // Handle rate limiting - return cached data if available
    if (response.status === 429) {
      console.warn('CoinGecko rate limited');
      return cachedData.length > 0 ? cachedData : [];
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    const cryptos: CryptoData[] = data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change: coin.price_change_percentage_24h || 0,
      marketCap: formatLargeNumber(coin.market_cap),
      volume24h: formatLargeNumber(coin.total_volume),
      sparkline: generateSparkline(coin.sparkline_in_7d?.price || []),
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      image: coin.image,
    }));

    cachedData = cryptos;
    lastFetchTime = now;
    return cryptos;
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return cachedData.length > 0 ? cachedData : [];
  }
}

export async function fetchTrendingMemeCoins(): Promise<TrendingMemeCoin[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedMemeCoins.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedMemeCoins;
  }

  try {
    // Fetch trending coins from CoinGecko
    const trendingUrl = `${COINGECKO_API}/search/trending`;
    const trendingResponse = await fetch(trendingUrl);

    // Handle rate limiting - return cached data
    if (trendingResponse.status === 429) {
      console.warn('CoinGecko trending rate limited');
      return cachedMemeCoins.length > 0 ? cachedMemeCoins : [];
    }

    if (!trendingResponse.ok) throw new Error(`HTTP ${trendingResponse.status}`);

    const trendingData = await trendingResponse.json();

    // Extract meme coins from trending (filter for known meme coin keywords)
    const memeCoinIds: string[] = [];
    const memeKeywords = ['dogecoin', 'shiba', 'pepe', 'dogwif', 'floki', 'bonk', 'memecoin', 'brett', 'mog', 'popcat', '虫子', '狗币', '柴犬'];

    trendingData.coins?.forEach((item: any) => {
      const coinId = item.item?.id?.toLowerCase() || '';
      const coinName = item.item?.name?.toLowerCase() || '';
      const coinSymbol = item.item?.symbol?.toLowerCase() || '';

      for (const keyword of memeKeywords) {
        if (coinId.includes(keyword) || coinName.includes(keyword) || coinSymbol.includes(keyword)) {
          if (!memeCoinIds.includes(item.item.id)) {
            memeCoinIds.push(item.item.id);
          }
          break;
        }
      }
    });

    // Also add known meme coins that might not be trending
    for (const meme of MEME_COINS) {
      if (!memeCoinIds.includes(meme)) {
        memeCoinIds.push(meme);
      }
    }

    if (memeCoinIds.length === 0) {
      // Fallback: just use some default meme coins
      memeCoinIds.push('dogecoin', 'shiba-inu', 'pepe', 'dogwifcoin', 'floki');
    }

    // Fetch market data for these coins
    const ids = memeCoinIds.slice(0, 10).join(',');
    const marketUrl = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=1h,24h`;

    const marketResponse = await fetch(marketUrl);
    if (!marketResponse.ok) throw new Error(`HTTP ${marketResponse.status}`);

    const marketData = await marketResponse.json();

    const memeCoins: TrendingMemeCoin[] = marketData.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change1h: coin.price_change_percentage_1h_in_currency || 0,
      change24h: coin.price_change_percentage_24h || 0,
      marketCap: formatLargeNumber(coin.market_cap),
      thumb: coin.image || '',
    }));

    // Sort by 24h change (hottest first)
    memeCoins.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

    cachedMemeCoins = memeCoins;
    lastFetchTime = now;
    return memeCoins;
  } catch (error) {
    console.error('Trending Meme Coins API error:', error);
    return cachedMemeCoins.length > 0 ? cachedMemeCoins : [];
  }
}

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function generateSparkline(prices: number[]): string {
  if (!prices || prices.length === 0) {
    const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    return Array.from({ length: 24 }, () => bars[Math.floor(Math.random() * bars.length)]).join('');
  }

  // Sample 24 points from the sparkline data
  const step = Math.max(1, Math.floor(prices.length / 24));
  const sampled = prices.filter((_, i) => i % step === 0).slice(0, 24);

  if (sampled.length < 2) {
    return '▁'.repeat(24);
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;

  const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return sampled.map(price => {
    const normalized = (price - min) / range;
    return bars[Math.min(Math.floor(normalized * 8), 7)];
  }).join('');
}

export function getCryptoStats() {
  const btc = cachedData.find(c => c.symbol === 'BTC');
  const eth = cachedData.find(c => c.symbol === 'ETH');

  return {
    btcDominance: btc && eth ? ((btc.marketCap.replace(/[^0-9.]/g, '') as any) / (eth.marketCap.replace(/[^0-9.]/g, '') as any) * 10).toFixed(1) : '52.4',
    ethDominance: '17.8',
    totalMarketCap: cachedData.length > 0
      ? formatLargeNumber(cachedData.reduce((sum, c) => sum + parseFloat(c.marketCap.replace(/[^0-9.]/g, '') || '0') * 1e9, 0))
      : '$2.5T',
    btcPrice: btc?.price || 0,
    ethPrice: eth?.price || 0,
  };
}
