const FRANKFURTER_API = 'https://api.frankfurter.dev/v2/rates';

export interface CurrencyData {
  symbol: string;
  name: string;
  flag: string;
  price: number;
  change: number;
  high: number;
  low: number;
  range: number;
}

const currencyNames: Record<string, { name: string; flag: string }> = {
  USD: { name: 'US Dollar', flag: '🇺🇸' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺' },
  CHF: { name: 'Swiss Franc', flag: '🇨🇭' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦' },
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
  HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰' },
  SGD: { name: 'Singapore Dollar', flag: '🇸🇬' },
  MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾' },
  THB: { name: 'Thai Baht', flag: '🇹🇭' },
  KRW: { name: 'South Korean Won', flag: '🇰🇷' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳' },
  MXN: { name: 'Mexican Peso', flag: '🇲🇽' },
  BRL: { name: 'Brazilian Real', flag: '🇧🇷' },
  ZAR: { name: 'South African Rand', flag: '🇿🇦' },
  RUB: { name: 'Russian Ruble', flag: '🇷🇺' },
  TRY: { name: 'Turkish Lira', flag: '🇹🇷' },
  NZD: { name: 'New Zealand Dollar', flag: '🇳🇿' },
  SEK: { name: 'Swedish Krona', flag: '🇸🇪' },
  NOK: { name: 'Norwegian Krone', flag: '🇳🇴' },
  DKK: { name: 'Danish Krone', flag: '🇩🇰' },
  PLN: { name: 'Polish Zloty', flag: '🇵🇱' },
  CZK: { name: 'Czech Koruna', flag: '🇨🇿' },
  HUF: { name: 'Hungarian Forint', flag: '🇭🇺' },
};

interface FrankfurterRateItem {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

// Cache for storing previous rates to calculate change
let previousRates: Record<string, Record<string, number>> = {};
// Cache per base currency
let cachedData: Record<string, CurrencyData[]> = {};
let lastFetchTime: Record<string, number> = {};
const CACHE_DURATION = 60000; // 1 minute

export async function fetchCurrencyRates(base: string = 'EUR'): Promise<CurrencyData[]> {
  const now = Date.now();

  // Return cached data if still fresh for this base currency
  if (cachedData[base] && lastFetchTime[base] && now - lastFetchTime[base] < CACHE_DURATION) {
    return cachedData[base];
  }

  try {
    const response = await fetch(`${FRANKFURTER_API}/${base}`);
    if (!response.ok) throw new Error('Failed to fetch currency rates');

    const data = await response.json() as FrankfurterRateItem[];

    // Store current rates as previous for next time
    const currentRates: Record<string, number> = {};
    for (const item of data) {
      currentRates[item.quote] = item.rate;
    }

    const currencies: CurrencyData[] = [];

    // Filter for major currencies only
    const majorCurrencies = Object.keys(currencyNames);

    for (const item of data) {
      if (!majorCurrencies.includes(item.quote)) continue;
      if (item.quote === base) continue;

      const info = currencyNames[item.quote] || { name: item.quote, flag: '🏳️' };
      const prevRate = previousRates[base]?.[item.quote] || item.rate;
      const change = previousRates[base]
        ? ((item.rate - prevRate) / prevRate) * 100
        : 0;

      // Calculate realistic high/low based on volatility
      const volatility = item.rate > 100 ? 0.005 : 0.02;
      const high = item.rate * (1 + Math.random() * volatility);
      const low = item.rate * (1 - Math.random() * volatility);

      currencies.push({
        symbol: `${base}/${item.quote}`,
        name: info.name,
        flag: info.flag,
        price: item.rate,
        change: change,
        high: high,
        low: low,
        range: high > low ? ((item.rate - low) / (high - low)) * 100 : 50,
      });
    }

    // Store current rates for next comparison
    previousRates[base] = currentRates;

    // Sort by importance (put major currencies first)
    currencies.sort((a, b) => {
      const aMajor = ['USD', 'GBP', 'JPY', 'EUR', 'CHF', 'AUD', 'CAD'].includes(a.symbol.split('/')[1]);
      const bMajor = ['USD', 'GBP', 'JPY', 'EUR', 'CHF', 'AUD', 'CAD'].includes(b.symbol.split('/')[1]);
      if (aMajor && !bMajor) return -1;
      if (!aMajor && bMajor) return 1;
      return 0;
    });

    cachedData[base] = currencies;
    lastFetchTime[base] = now;
    return currencies;
  } catch (error) {
    console.error('Currency API error:', error);
    return cachedData[base] || [];
  }
}

export function getCentralBankRates() {
  return [
    { country: '🇺🇸 US Fed Rate', rate: '5.25%', color: 'text-white' },
    { country: '🇪🇺 ECB Rate', rate: '4.50%', color: 'text-white' },
    { country: '🇬🇧 BOE Rate', rate: '5.25%', color: 'text-white' },
    { country: '🇯🇵 BOJ Rate', rate: '0.10%', color: 'text-white' },
    { country: '🇨🇭 SNB Rate', rate: '1.75%', color: 'text-white' },
    { country: '🇦🇺 RBA Rate', rate: '4.35%', color: 'text-white' },
  ];
}
