import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';
import { getCache, setCache } from '$lib/cache';

const yahooFinance = new YahooFinance();

interface EarningsEvent {
  symbol: string;
  name: string;
  date: string;
  time: string;
  estimate: number; // EPS estimate in IDR per share
  reported: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  period: string;
  revenueEstimate: number; // Revenue estimate in IDR
  isEstimated: boolean;
}

interface EarningsResult {
  upcoming: EarningsEvent[];
  recent: EarningsEvent[];
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
  { symbol: 'INDF.JK', name: 'Indofood Sukses' },
  { symbol: 'CPIN.JK', name: 'Charoen Pokphand' },
  { symbol: 'HMSP.JK', name: 'H.M. Sampoerna' },
  { symbol: 'KLBF.JK', name: 'Kalbe Farma' },
  { symbol: 'BTN.JK', name: 'Bank Tabungan Negara' },
  { symbol: 'BBTN.JK', name: 'Bank BTN' },
  { symbol: 'MIKA.JK', name: 'Mitra Keluarga' },
  { symbol: 'SCMA.JK', name: 'MNC Vista' },
  { symbol: 'MNCN.JK', name: 'MNC Networks' },
  { symbol: 'INTP.JK', name: 'Indocement Tunggal' },
  { symbol: 'SMGR.JK', name: 'Semen Indonesia' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetchEarningsForStock(symbol: string, name: string): Promise<EarningsEvent | null> {
  try {
    const quote = await yahooFinance.quoteSummary(symbol, {
      modules: ['calendarEvents'],
    });

    const earnings = quote?.calendarEvents?.earnings;
    if (!earnings) return null;

    const earningsDate = earnings.earningsDate?.[0];
    if (!earningsDate) return null;

    const dateStr = formatDate(new Date(earningsDate));
    const time = (earnings as any).earningsTimezone || 'ICT';

    const epsEstimate = earnings.earningsAverage ?? 0;
    const epsReported = earnings.earningsResult?.eps?.reported?.[0] ?? null;
    const surprise = earnings.earningsResult?.surprise?.[0] ?? null;
    const surprisePct = earnings.earningsResult?.surprisePercent?.[0] ?? null;

    // Revenue in IDR (actual, not per share)
    const revenueAvg = earnings.revenueAverage ?? 0;

    return {
      symbol,
      name,
      date: dateStr,
      time,
      estimate: epsEstimate,
      reported: epsReported,
      surprise: surprise,
      surprisePercent: surprisePct,
      period: '', // Not available in calendarEvents
      revenueEstimate: revenueAvg,
      isEstimated: (earnings as any).isEarningsDateEstimate ?? true,
    };
  } catch (error) {
    return null;
  }
}

export async function GET() {
  const cacheKey = 'earnings_calendar';

  const cached = await getCache<EarningsResult>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    const now = new Date();
    const upcoming: EarningsEvent[] = [];
    const recent: EarningsEvent[] = [];

    const results = await Promise.allSettled(
      IDX_STOCKS.map(stock => fetchEarningsForStock(stock.symbol, stock.name))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const event = result.value;
        const eventDate = new Date(event.date);
        
        if (eventDate >= now) {
          upcoming.push(event);
        } else {
          recent.push(event);
        }
      }
    }

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result: EarningsResult = {
      upcoming: upcoming.slice(0, 15),
      recent: recent.slice(0, 10),
      lastUpdate: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 3600000);

    return json(result);
  } catch (error) {
    console.error('Earnings calendar API error:', error);
    return json({
      upcoming: [],
      recent: [],
      lastUpdate: new Date().toISOString(),
      error: 'Failed to fetch earnings calendar',
    }, { status: 200 });
  }
}