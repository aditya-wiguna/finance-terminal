import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface StockQuote {
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
  ema50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  reason: string;
  history: number[];
}

interface StrategyResult {
  stocks: StrategySignal[];
  lastUpdate: string;
}

const IDX_STOCKS = [
  { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia' },
  { symbol: 'TLKM.JK', name: 'Telkom Indonesia' },
  { symbol: 'BBCA.JK', name: 'Bank Central Asia' },
  { symbol: 'BMRI.JK', name: 'Bank Mandiri' },
  { symbol: 'ASII.JK', name: 'Astra International' },
  { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia' },
  { symbol: 'UNVR.JK', name: 'Unilever Indonesia' },
  { symbol: 'PTBA.JK', name: 'Bukit Asam' },
  { symbol: 'ANTM.JK', name: 'Aneka Tambang' },
  { symbol: 'INDF.JK', name: 'Indofood CBP' },
  { symbol: 'ICBP.JK', name: 'Indofood CBP' },
  { symbol: 'SMGR.JK', name: 'Semen Indonesia' },
  { symbol: 'PGAS.JK', name: 'PGN Gas' },
  { symbol: 'ELSA.JK', name: 'Elnusa' },
  { symbol: 'RUIS.JK', name: 'Ruang Tua' },
  { symbol: 'BRPT.JK', name: 'Barito Renewables' },
  { symbol: 'CPIN.JK', name: 'Charoen Pokphand' },
  { symbol: 'JECC.JK', name: 'J Resources' },
  { symbol: 'ISAT.JK', name: 'Indosat' },
  { symbol: 'RAJA.JK', name: 'Raja Indonesia' },
  { symbol: 'HRUM.JK', name: 'Harum Energy' },
  { symbol: 'MEDC.JK', name: 'Medco Energi' },
  { symbol: 'AKRA.JK', name: 'AKR Corporindo' },
  { symbol: 'KLBF.JK', name: 'Kalbe Farma' },
  { symbol: 'BRIS.JK', name: 'Bank BRIS' },
  { symbol: 'BBNI.JK', name: 'Bank Negara Indonesia' },
  { symbol: 'BTPS.JK', name: 'BTPN Sharia' },
  { symbol: 'AMRT.JK', name: 'Amarta' },
  { symbol: 'MAPI.JK', name: 'Mata Hari' },
  { symbol: 'ACES.JK', name: 'Ace Hardware' },
  { symbol: 'BUKA.JK', name: 'Bukalapak' },
  { symbol: 'MTDL.JK', name: 'Metrodata' },
  { symbol: 'MPPA.JK', name: 'Matahari' },
  { symbol: 'KIJA.JK', name: 'Kijang' },
  { symbol: 'AALI.JK', name: 'Astra Agro' },
  { symbol: 'LSIP.JK', name: 'London Sumatra' },
  { symbol: 'DSNG.JK', name: 'Dharma Samu' },
  { symbol: 'SSMS.JK', name: 'Simba Sip' },
  { symbol: 'JPFA.JK', name: 'Japfa' },
  { symbol: 'SIMP.JK', name: 'Salim' },
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

function analyzeStock(
  quote: StockQuote,
  name: string,
  historicalPrices: number[]
): StrategySignal | null {
  const price = quote.regularMarketPrice || 0;
  const change = quote.regularMarketChangePercent || 0;

  if (price === 0 || historicalPrices.length < 50) return null;

  const closes = historicalPrices;
  const ema21 = calculateEMA(closes, 21);
  const ema34 = calculateEMA(closes, 34);
  const ema50 = calculateEMA(closes, 50);
  const bb = calculateBollingerBands(closes, 20);

  const bbPosition = bb.upper !== bb.lower
    ? ((price - bb.lower) / (bb.upper - bb.lower)) * 100
    : 50;

  let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
  let reason = '';

  const emaBullish = ema21 > ema34 && ema34 > ema50;
  const emaBearish = ema21 < ema34 && ema34 < ema50;
  const emaCompressed = Math.abs(ema21 - ema34) / ema34 < 0.005;

  if (emaCompressed) {
    trend = 'SIDEWAYS';
    reason = 'EMA compression - sideways market';
  } else if (emaBullish) {
    trend = 'BULLISH';
    reason = 'EMA bullish alignment (21>34>50)';
  } else if (emaBearish) {
    trend = 'BEARISH';
    reason = 'EMA bearish alignment (21<34<50)';
  } else {
    trend = 'SIDEWAYS';
    reason = 'Mixed EMA signals';
  }

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
    symbol: quote.symbol.replace('.JK', ''),
    name,
    price,
    change,
    signal,
    strength,
    ema21,
    ema34,
    ema50,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    bbPosition,
    trend,
    reason,
    history: closes.slice(-30),
  };
}

export async function GET() {
  const cacheKey = 'stocks_ema_bb';

  const cached = await getCache<StrategyResult>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const signals: StrategySignal[] = [];

    for (const stock of IDX_STOCKS) {
      try {
        const quote = await yahooFinance.quote(stock.symbol) as StockQuote;

        const chartData = await yahooFinance.chart(stock.symbol, {
          period1: Math.floor((Date.now() - 120 * 24 * 60 * 60 * 1000) / 1000),
          period2: Math.floor(Date.now() / 1000),
          interval: '1d',
        });

        const closes = (chartData.quotes || []).map((q: any) => q.close).filter((c: number) => c > 0);

        if (closes.length < 50) {
          console.log(`Skipping ${stock.symbol}: insufficient data (${closes.length} points)`);
          continue;
        }

        const signal = analyzeStock(quote, stock.name, closes);
        if (signal) signals.push(signal);
      } catch (e) {
        console.error(`Error analyzing ${stock.symbol}:`, e);
      }
    }

    signals.sort((a, b) => {
      // Prioritize BUY signals (momentum stocks) first
      if (a.signal === 'BUY' && b.signal !== 'BUY') return -1;
      if (b.signal === 'BUY' && a.signal !== 'BUY') return 1;
      // Then sort by strength
      return b.strength - a.strength;
    });

    const result: StrategyResult = {
      stocks: signals.slice(0, 10),
      lastUpdate: new Date().toISOString(),
    };

    await setCache(cacheKey, result);

    return json(result);
  } catch (error) {
    console.error('Stock EMA-BB strategy API error:', error);
    return json({ error: 'Failed to fetch strategy data' }, { status: 500 });
  }
}