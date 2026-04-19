import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface StockQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
}

interface StrategyStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  strength: number; // 0-100 score
  signal: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

interface StrategyResult {
  bpjs: StrategyStock[]; // Beli Pagi Jual Sore
  bsjp: StrategyStock[]; // Beli Sore Jual Pagi
}

const IDX_STOCKS = [
  { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia' },
  { symbol: 'TLKM.JK', name: 'Telkom Indonesia' },
  { symbol: 'BBCA.JK', name: 'Bank Central Asia' },
  { symbol: 'BMRI.JK', name: 'Bank Mandiri' },
  { symbol: 'ASII.JK', name: 'Astra International' },
  { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia' },
  { symbol: 'UNVR.JK', name: 'Unilever Indonesia' },
  { symbol: 'HMSN.JK', name: 'Harum Energy' },
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
];

function calculateStrategy(quote: StockQuote, name: string): { bpjs: StrategyStock | null; bsjp: StrategyStock | null } {
  const price = quote.regularMarketPrice || 0;
  const open = quote.regularMarketOpen || price;
  const high = quote.regularMarketDayHigh || price;
  const low = quote.regularMarketDayLow || price;
  const prevClose = quote.regularMarketPreviousClose || price;
  const change = quote.regularMarketChange || 0;
  const changePercent = quote.regularMarketChangePercent || 0;

  if (price === 0) return { bpjs: null, bsjp: null };

  // Calculate intraday metrics
  const dayRange = high - low;
  const openToHigh = high - open;
  const openToLow = open - low;
  const closeToHigh = high - price;
  const priceFromOpen = price - open;
  const priceFromLow = price - low;

  // Open position relative to range (0-100, 50 = middle)
  const openPosition = dayRange > 0 ? ((open - low) / dayRange) * 100 : 50;

  // Current price position relative to range (0-100)
  const pricePosition = dayRange > 0 ? ((price - low) / dayRange) * 100 : 50;

  // Morning strength: how much price has moved from open
  const morningStrength = dayRange > 0 ? (priceFromOpen / dayRange) * 100 : 0;

  // Afternoon strength: how far price is from day's high
  const afternoonWeakness = dayRange > 0 ? (closeToHigh / dayRange) * 100 : 0;

  // Calculate scores (0-100)
  // Higher score = better for that strategy

  // BPJS Score: Open low in range + price moving up + near high = good for morning buy
  // We want stocks that opened low and are now rallying
  const bpjsScore = Math.min(100, Math.max(0,
    openPosition * 0.3 + // Opened low in range
    morningStrength * 0.4 + // Strong morning rally
    pricePosition * 0.3 // Currently in upper part of range
  ));

  // BSJP Score: Opened high in range + price pulled back + near low = good for evening buy
  // We want stocks that opened high and pulled back, likely to bounce tomorrow
  const bsjpScore = Math.min(100, Math.max(0,
    (100 - openPosition) * 0.3 + // Opened high in range
    afternoonWeakness * 0.4 + // Pulled back from high
    (100 - pricePosition) * 0.3 // Currently in lower part of range
  ));

  // Adjust scores based on volatility (prefer moderate volatility)
  const volatility = dayRange / price * 100;
  const volatilityFactor = volatility > 0.5 && volatility < 5 ? 1.2 : 0.8;

  const adjustedBpjsScore = Math.round(bpjsScore * volatilityFactor);
  const adjustedBsjpScore = Math.round(bsjpScore * volatilityFactor);

  // Generate reason
  let bpjsReason = '';
  if (adjustedBpjsScore >= 70) {
    bpjsReason = 'Strong morning rally, opened low and rallying';
  } else if (adjustedBpjsScore >= 50) {
    bpjsReason = 'Moderate upward momentum';
  } else {
    bpjsReason = 'Limited morning upside';
  }

  let bsjpReason = '';
  if (adjustedBsjpScore >= 70) {
    bsjpReason = 'Pulled back from high, potential tomorrow bounce';
  } else if (adjustedBsjpScore >= 50) {
    bsjpReason = 'Moderate pullback, holding support';
  } else {
    bsjpReason = 'Limited pullback opportunity';
  }

  const getSignal = (score: number): 'BUY' | 'SELL' | 'HOLD' => {
    if (score >= 65) return 'BUY';
    if (score <= 35) return 'SELL';
    return 'HOLD';
  };

  const baseStock: Omit<StrategyStock, 'signal' | 'reason'> = {
    symbol: quote.symbol.replace('.JK', ''),
    name,
    price,
    change,
    changePercent,
    strength: 0,
  };

  return {
    bpjs: adjustedBpjsScore >= 45 ? {
      ...baseStock,
      strength: adjustedBpjsScore,
      signal: getSignal(adjustedBpjsScore),
      reason: bpjsReason,
    } : null,
    bsjp: adjustedBsjpScore >= 45 ? {
      ...baseStock,
      strength: adjustedBsjpScore,
      signal: getSignal(adjustedBsjpScore),
      reason: bsjpReason,
    } : null,
  };
}

export async function GET() {
  try {
    const symbols = IDX_STOCKS.map(s => s.symbol);
    const quotes = await yahooFinance.quote(symbols) as StockQuote[];

    const bpjsStocks: StrategyStock[] = [];
    const bsjpStocks: StrategyStock[] = [];

    for (const info of IDX_STOCKS) {
      const quote = quotes.find(q => q.symbol === info.symbol);
      if (!quote || !quote.regularMarketPrice) continue;

      const result = calculateStrategy(quote, info.name);

      if (result.bpjs) {
        bpjsStocks.push(result.bpjs);
      }
      if (result.bsjp) {
        bsjpStocks.push(result.bsjp);
      }
    }

    // Sort by strength (highest first)
    bpjsStocks.sort((a, b) => b.strength - a.strength);
    bsjpStocks.sort((a, b) => b.strength - a.strength);

    // Take top 5 for each
    const result: StrategyResult = {
      bpjs: bpjsStocks.slice(0, 5),
      bsjp: bsjpStocks.slice(0, 5),
    };

    return json(result);
  } catch (error) {
    console.error('Strategy API error:', error);
    return json({ error: 'Failed to fetch strategy data' }, { status: 500 });
  }
}
