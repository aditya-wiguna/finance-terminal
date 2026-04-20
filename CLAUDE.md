# AW Terminal - Claude Code Instructions

## Core Principle
**All features must use real, live data. Mock/hardcoded data is strictly prohibited.**

---

## Project Overview

**Purpose:** Terminal-style dashboard for monitoring financial markets
**Tech Stack:** SvelteKit, TypeScript, Tailwind CSS, Yahoo Finance API, GDELT

---

## Data Sources

### Stock Data
- **Yahoo Finance API** (`yahoo-finance2`) for Indonesian stocks (IDX)
- Stock symbols use `.JK` suffix (e.g., `BBRI.JK`, `TLKM.JK`)
- Always fetch live price data, historical candles, and technical indicators from Yahoo Finance

### Geopolitical Data
- **GDELT Project** (`api.gdeltproject.org`) - free global conflict event database
- Fetch real-time tension indices and risk events
- Fallback to curated real-world data only if GDELT fails

### Other Markets
- Crypto: CoinGecko via Yahoo Finance
- Commodities: Yahoo Finance
- Currencies: Yahoo Finance

---

## Feature Development Rules

### DO: Use Real Data
- Fetch from actual APIs (Yahoo Finance, GDELT, etc.)
- Display live prices, real technical indicators (EMA, Bollinger Bands)
- Use actual geopolitical risk indices from GDELT

### DO NOT: Use Mock/Placeholder Data
- ❌ "30 Day Price History (Placeholder)"
- ❌ Hardcoded sample whale alerts
- ❌ Static/fake stock lists
- ❌ Simulated geopolitical tensions

If an API is unavailable or fails, implement proper fallback with data from alternative real sources, not fake static data.

---

## Technical Approach

### Fetching Stock Data
```typescript
// Use Yahoo Finance for Indonesian stocks
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

// Fetch quote
const quote = await yahooFinance.quote('BBRI.JK');

// Fetch historical chart for indicators
const chartData = await yahooFinance.chart('BBRI.JK', {
  period1: Math.floor((Date.now() - 120 * 24 * 60 * 60 * 1000) / 1000),
  period2: Math.floor(Date.now() / 1000),
  interval: '1d',
});
```

### Technical Indicators
- **EMA Calculation:** Calculate manually from historical close prices
- **Bollinger Bands:** Calculate SMA and standard deviation from 20-period data
- **Signals:** Derive from EMA alignment (21 > 34 > 50 = bullish) and BB position

### Geopolitical Risk
```typescript
// Fetch from GDELT API
const response = await fetch(
  'https://api.gdeltproject.org/api/v2/docdoc/docdoc?query=sourcecountry:(...)&mode=artlist&maxrows=50&format=json'
);
```

---

## Caching

- Use the `getCache`/`setCache` utility for API response caching
- Stock strategy data: cache 1-5 minutes
- Geopolitical data: cache 5-10 minutes
- Never cache "placeholder" or mock data

---

## UI/UX

- Terminal aesthetic (dark theme, monospace fonts)
- Cards for each data section (stocks, crypto, geo risk, etc.)
- Real-time clock, market status indicators
- NO auto-refresh glitches - load data once on mount
- Charts: Use SVG sparklines or Leaflet maps for visualization

---

## File Structure

```
src/
├── routes/
│   ├── api/
│   │   ├── stocks/ema-bb/+server.ts    # Stock strategy with EMA/BB
│   │   ├── geopolitical/+server.ts     # GDELT real data
│   │   ├── stocks/+server.ts           # IDX stock quotes
│   │   └── ...
│   └── +page.svelte                    # Main dashboard
├── lib/
│   ├── api/
│   │   ├── stocks.ts                   # Client fetch functions
│   │   ├── geopolitical.ts             # Geo risk fetch
│   │   └── ...
│   └── components/
│       ├── GeoRiskMap.svelte           # Leaflet map
│       └── MiniSparkline.svelte        # SVG price chart
└── app.css                             # Terminal theme
```

---

## Important Notes

1. **Yahoo Finance Rate Limits:** Handle gracefully - some stocks may fail, continue with others
2. **Delisted Stocks:** Skip stocks that return "No data found, symbol may be delisted"
3. **GDELT Fallback:** If GDELT API fails, use curated real-world tensions (not fake data)
4. **No Auto-Refresh:** Data loads once on page mount to avoid UI glitches