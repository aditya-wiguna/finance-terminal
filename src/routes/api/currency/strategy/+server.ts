import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface CurrencyQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
}

interface StrategySignal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'SIDEWAYS';
  strength: number;
  ema21: number;
  ema34: number;
  ema90: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  reason: string;
}

interface StrategyResult {
  currencies: StrategySignal[];
  lastUpdate: string;
}

// Major currency pairs
const CURRENCY_PAIRS = [
  { symbol: 'EURUSD=X', name: 'Euro / US Dollar', displayName: 'EUR/USD' },
  { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar', displayName: 'GBP/USD' },
  { symbol: 'USDJPY=X', name: 'US Dollar / Japanese Yen', displayName: 'USD/JPY' },
  { symbol: 'USDCHF=X', name: 'US Dollar / Swiss Franc', displayName: 'USD/CHF' },
  { symbol: 'AUDUSD=X', name: 'Australian Dollar / US Dollar', displayName: 'AUD/USD' },
  { symbol: 'USDCAD=X', name: 'US Dollar / Canadian Dollar', displayName: 'USD/CAD' },
  { symbol: 'NZDUSD=X', name: 'New Zealand Dollar / US Dollar', displayName: 'NZD/USD' },
  { symbol: 'EURGBP=X', name: 'Euro / British Pound', displayName: 'EUR/GBP' },
  { symbol: 'EURJPY=X', name: 'Euro / Japanese Yen', displayName: 'EUR/JPY' },
  { symbol: 'GBPJPY=X', name: 'British Pound / Japanese Yen', displayName: 'GBP/JPY' },
];

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateBollingerBands(prices: number[], period: number = 20) {
  const recentPrices = prices.slice(-period);
  if (recentPrices.length < period) return { upper: 0, middle: 0, lower: 0 };

  const sma = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / recentPrices.length;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + 2 * stdDev,
    middle: sma,
    lower: sma - 2 * stdDev,
  };
}

function analyzeCurrency(
  quote: CurrencyQuote,
  name: string,
  displayName: string,
  historicalPrices: number[]
): StrategySignal | null {
  const price = quote.regularMarketPrice || 0;
  const change = quote.regularMarketChangePercent || 0;

  if (price === 0 || historicalPrices.length < 34) return null;

  const closes = historicalPrices;
  const ema21 = calculateEMA(closes, 21);
  const ema34 = calculateEMA(closes, 34);
  const ema90 = calculateEMA(closes, 90);
  const bb = calculateBollingerBands(closes, 20);

  const bbPosition = bb.upper !== bb.lower
    ? ((price - bb.lower) / (bb.upper - bb.lower)) * 100
    : 50;

  // Determine trend based on EMA alignment
  let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
  let reason = '';

  const emaBullish = ema21 > ema34 && ema34 > ema90;
  const emaBearish = ema21 < ema34 && ema34 < ema90;
  const emaCompressed = Math.abs(ema21 - ema34) / ema34 < 0.005;

  if (emaCompressed) {
    trend = 'SIDEWAYS';
    reason = 'EMA compression - sideways market';
  } else if (emaBullish) {
    trend = 'BULLISH';
    reason = 'EMA bullish alignment (21>34>90)';
  } else if (emaBearish) {
    trend = 'BEARISH';
    reason = 'EMA bearish alignment (21<34<90)';
  } else {
    trend = 'SIDEWAYS';
    reason = 'Mixed EMA signals';
  }

  // Calculate signal strength and action
  let signal: 'BUY' | 'SELL' | 'HOLD' | 'SIDEWAYS' = 'HOLD';
  let strength = 0;

  if (trend === 'BULLISH') {
    if (price > ema21 && bbPosition < 40) {
      signal = 'BUY';
      strength = Math.min(100, 50 + (50 - bbPosition) / 2);
    } else if (price > ema21 && bbPosition < 60) {
      signal = 'HOLD';
      strength = 60;
    } else if (price > ema21) {
      signal = 'HOLD';
      strength = 70;
    } else {
      signal = 'SELL';
      strength = 50;
    }
  } else if (trend === 'BEARISH') {
    if (price < ema21 && bbPosition > 60) {
      signal = 'SELL';
      strength = Math.min(100, 50 + (bbPosition - 50) / 2);
    } else if (price < ema21 && bbPosition > 40) {
      signal = 'HOLD';
      strength = 60;
    } else if (price < ema21) {
      signal = 'HOLD';
      strength = 70;
    } else {
      signal = 'BUY';
      strength = 50;
    }
  } else {
    // SIDEWAYS - mean reversion signals
    signal = 'SIDEWAYS';
    if (bbPosition < 30) {
      strength = 60;
      signal = 'BUY';
    } else if (bbPosition > 70) {
      strength = 60;
      signal = 'SELL';
    } else {
      strength = 40;
      reason += ' - price near middle BB';
    }
  }

  return {
    symbol: displayName,
    name,
    price,
    change,
    signal,
    strength,
    ema21,
    ema34,
    ema90,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    bbPosition,
    trend,
    reason,
  };
}

export async function GET() {
  const cacheKey = 'currency_strategy';

  // Check cache first
  const cached = await getCache<StrategyResult>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const signals: StrategySignal[] = [];

    for (const currency of CURRENCY_PAIRS) {
      try {
        const quote = await yahooFinance.quote(currency.symbol) as CurrencyQuote;

        const chartData = await yahooFinance.chart(currency.symbol, {
          period1: Math.floor((Date.now() - 100 * 24 * 60 * 60 * 1000) / 1000),
          period2: Math.floor(Date.now() / 1000),
          interval: '1d',
        });

        const closes = (chartData.quotes || []).map((q: any) => q.close).filter((c: number) => c > 0);

        const signal = analyzeCurrency(quote, currency.name, currency.displayName, closes);
        if (signal) signals.push(signal);
      } catch (e) {
        console.error(`Error analyzing ${currency.symbol}:`, e);
      }
    }

    signals.sort((a, b) => b.strength - a.strength);

    const result: StrategyResult = {
      currencies: signals,
      lastUpdate: new Date().toISOString(),
    };

    // Store in cache
    await setCache(cacheKey, result);

    return json(result);
  } catch (error) {
    console.error('Currency strategy API error:', error);
    return json({ error: 'Failed to fetch strategy data' }, { status: 500 });
  }
}
