<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCryptoData } from '$lib/api/crypto';
  import { fetchIndonesianStocks, fetchStocksEMABBStrategy, type StockStrategySignal } from '$lib/api/stocks';
  import { fetchCommodities } from '$lib/api/commodities';
  import { fetchGeoRiskIndex, type GeoRiskIndex } from '$lib/api/geopolitical';
  import GeoRiskMap from '$lib/components/GeoRiskMap.svelte';
  import MiniSparkline from '$lib/components/MiniSparkline.svelte';
  import { fetchCurrencyRates } from '$lib/api/currency';
  import PredictionMarkets from '$lib/components/PredictionMarkets.svelte';
  import SGXStocks from '$lib/components/SGXStocks.svelte';
  import { fetchWhaleTransactions, type WhaleTransaction } from '$lib/api/whales';

  interface MarketTicker {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    type: 'crypto' | 'currency' | 'commodity' | 'stock';
  }

  interface MarketStatus {
    name: string;
    status: 'OPEN' | 'CLOSED';
    color: string;
    bgColor: string;
  }

  interface SectorData {
    name: string;
    change: number;
    volume: string;
    topStock: string;
  }

  let tickers = $state<MarketTicker[]>([]);
  let sectorData = $state<SectorData[]>([]);
  let stocksEMABB = $state<StockStrategySignal[]>([]);
  let geoRisk = $state<GeoRiskIndex | null>(null);
  let currentTime = $state(new Date().toLocaleTimeString('en-US', { hour12: false }));
  let marketStatuses = $state<MarketStatus[]>([]);
  let whaleTransactions = $state<WhaleTransaction[]>([]);

  function getMarketStatuses(): MarketStatus[] {
    const now = new Date();

    const formatTime = (timezone: string) => {
      return now.toLocaleString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short' });
    };

    const parseTime = (formatted: string) => {
      const parts = formatted.split(' ');
      const timeParts = parts[1].split(':');
      return { hour: parseInt(timeParts[0]), minute: parseInt(timeParts[1]), day: parts[0] };
    };

    const jakartaTime = parseTime(formatTime('Asia/Singapore'));
    const nyseTime = parseTime(formatTime('America/New_York'));
    const londonTime = parseTime(formatTime('Europe/London'));
    const tokyoTime = parseTime(formatTime('Asia/Tokyo'));

    const isWeekday = (day: string) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day);

    const idxOpen = isWeekday(jakartaTime.day) && jakartaTime.hour >= 9 && (jakartaTime.hour < 15 || (jakartaTime.hour === 15 && jakartaTime.minute < 30));
    const nyseOpen = isWeekday(nyseTime.day) && nyseTime.hour >= 9 && nyseTime.hour < 16;
    const londonOpen = isWeekday(londonTime.day) && londonTime.hour >= 8 && (londonTime.hour < 16 || (londonTime.hour === 16 && jakartaTime.minute < 30));
    const tokyoOpen = isWeekday(tokyoTime.day) && tokyoTime.hour >= 9 && tokyoTime.hour < 15;

    return [
      { name: 'IDX', status: idxOpen ? 'OPEN' : 'CLOSED', color: 'text-[#00ff00]', bgColor: 'bg-[#00ff00]/20' },
      { name: 'NYSE', status: nyseOpen ? 'OPEN' : 'CLOSED', color: 'text-[#0088ff]', bgColor: 'bg-[#0088ff]/20' },
      { name: 'LSE', status: londonOpen ? 'OPEN' : 'CLOSED', color: 'text-[#ffcc00]', bgColor: 'bg-[#ffcc00]/20' },
      { name: 'TSE', status: tokyoOpen ? 'OPEN' : 'CLOSED', color: 'text-[#ff0000]', bgColor: 'bg-[#ff0000]/20' },
      { name: 'CRYPTO', status: 'OPEN', color: 'text-[#f7931a]', bgColor: 'bg-[#f7931a]/20' },
    ];
  }

  async function loadData() {
    try {
      const [crypto, stocks, commodities, currencies, sectorRes, emaBBStocks, geo, whales] = await Promise.all([
        fetchCryptoData(),
        fetchIndonesianStocks(),
        fetchCommodities(),
        fetchCurrencyRates('EUR'),
        fetch('/api/stocks/sectors').then(r => r.json()),
        fetchStocksEMABBStrategy(),
        fetchGeoRiskIndex(),
        fetchWhaleTransactions(),
      ]);

      const newTickers: MarketTicker[] = [];

      crypto.slice(0, 3).forEach(c => {
        newTickers.push({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          change: c.price * (c.change / 100),
          changePercent: c.change,
          type: 'crypto' as const,
        });
      });

      currencies.slice(0, 2).forEach(c => {
        newTickers.push({
          symbol: c.symbol.split('/')[1],
          name: c.name,
          price: c.price,
          change: c.price * (c.change / 100),
          changePercent: c.change,
          type: 'currency' as const,
        });
      });

      commodities.slice(0, 2).forEach(c => {
        newTickers.push({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          change: c.price * (c.change / 100),
          changePercent: c.change,
          type: 'commodity' as const,
        });
      });

      stocks.slice(0, 2).forEach(s => {
        newTickers.push({
          symbol: s.symbol,
          name: s.name,
          price: s.price,
          change: s.change,
          changePercent: s.changePercent,
          type: 'stock' as const,
        });
      });

      tickers = newTickers;
      marketStatuses = getMarketStatuses();
      sectorData = sectorRes?.sectors || [];
      stocksEMABB = emaBBStocks || [];
      geoRisk = geo;
      whaleTransactions = whales || [];
    } catch (e) {
      console.error('Dashboard data fetch error:', e);
    }
  }

  onMount(() => {
    loadData();
    marketStatuses = getMarketStatuses();

    const timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      marketStatuses = getMarketStatuses();
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  });

  function formatNumber(num: number, decimals = 2): string {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function getTypeColor(type: string): string {
    switch(type) {
      case 'crypto': return 'text-[#f7931a]';
      case 'currency': return 'text-[#0088ff]';
      case 'commodity': return 'text-[#ffcc00]';
      case 'stock': return 'text-[#00ff00]';
      default: return 'text-white';
    }
  }
</script>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="terminal-header px-4 md:px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-bold text-[#00ff00]">MARKET OVERVIEW</h2>
      <div class="flex flex-wrap gap-2">
        {#each marketStatuses as market}
          <div class="flex items-center gap-1.5 px-2 py-1 rounded {market.bgColor}">
            <span class="w-2 h-2 rounded-full {market.status === 'OPEN' ? 'bg-[#00ff00] animate-pulse' : 'bg-[#ff0000]'}"></span>
            <span class="text-xs font-bold {market.color}">{market.name}</span>
            <span class="text-xs {market.color}">{market.status}</span>
          </div>
        {/each}
      </div>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <span class="text-gray-400">SINGAPORE: <span class="text-white">{currentTime}</span></span>
      <span class="px-2 py-1 bg-[#00ff00] text-black font-bold text-xs rounded">LIVE</span>
    </div>
  </header>

  <div class="flex-1 overflow-auto p-2 md:p-4">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 min-h-0">
      <!-- MARKET TICKER -->
      <div class="col-span-1 md:col-span-12 terminal-panel overflow-hidden">
        <div class="terminal-panel-header flex items-center justify-between">
          <span>MARKET TICKER</span>
          <span class="text-[#00ff00] text-xs blink">●</span>
        </div>
        <div class="ticker-row overflow-x-auto">
          {#if tickers.length === 0}
            <div class="text-gray-500 p-4">Loading market data...</div>
          {:else}
            {#each tickers as ticker}
              <div class="ticker-item">
                <span class="text-gray-400 text-xs">{ticker.symbol}</span>
                <span class="font-bold {ticker.change >= 0 ? 'price-up' : 'price-down'}">
                  {ticker.type === 'currency' ? '' : '$'}{formatNumber(ticker.price, ticker.type === 'currency' ? 4 : 2)}
                </span>
                <span class="{ticker.change >= 0 ? 'price-up' : 'price-down'} text-xs">
                  {ticker.change >= 0 ? '▲' : '▼'} {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
                <span class="w-1 h-1 rounded-full {getTypeColor(ticker.type)}"></span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- CRYPTO -->
      <div class="col-span-1 md:col-span-4 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">CRYPTO</div>
        <div class="p-3 space-y-2">
          {#each tickers.filter(t => t.type === 'crypto') as crypto}
            <div class="flex items-center justify-between py-2 border-b border-[#222] last:border-0">
              <div>
                <span class="text-[#f7931a] font-bold">{crypto.symbol}</span>
                <span class="text-gray-400 text-xs ml-2">{crypto.name}</span>
              </div>
              <div class="text-right">
                <div class="font-bold">${formatNumber(crypto.price)}</div>
                <div class="{crypto.change >= 0 ? 'price-up' : 'price-down'} text-xs">
                  {crypto.change >= 0 ? '+' : ''}{formatNumber(crypto.change)} ({crypto.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          {/each}
          <a href="/crypto" class="block text-center text-[#0088ff] text-xs mt-3 hover:underline">VIEW ALL →</a>
        </div>
      </div>

      <!-- CURRENCY -->
      <div class="col-span-1 md:col-span-4 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">CURRENCY</div>
        <div class="p-3 space-y-2">
          {#each tickers.filter(t => t.type === 'currency') as currency}
            <div class="flex items-center justify-between py-2 border-b border-[#222] last:border-0">
              <div>
                <span class="text-[#0088ff] font-bold">{currency.symbol}</span>
                <span class="text-gray-400 text-xs ml-2">{currency.name}</span>
              </div>
              <div class="text-right">
                <div class="font-bold">{formatNumber(currency.price, 4)}</div>
                <div class="{currency.change >= 0 ? 'price-up' : 'price-down'} text-xs">
                  {currency.change >= 0 ? '+' : ''}{currency.changePercent.toFixed(3)}%
                </div>
              </div>
            </div>
          {/each}
          <a href="/currency" class="block text-center text-[#0088ff] text-xs mt-3 hover:underline">VIEW ALL →</a>
        </div>
      </div>

      <!-- COMMODITIES -->
      <div class="col-span-1 md:col-span-4 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">COMMODITIES</div>
        <div class="p-3 space-y-2">
          {#each tickers.filter(t => t.type === 'commodity') as commodity}
            <div class="flex items-center justify-between py-2 border-b border-[#222] last:border-0">
              <div>
                <span class="text-[#ffcc00] font-bold">{commodity.symbol}</span>
                <span class="text-gray-400 text-xs ml-2">{commodity.name}</span>
              </div>
              <div class="text-right">
                <div class="font-bold">${formatNumber(commodity.price)}</div>
                <div class="{commodity.change >= 0 ? 'price-up' : 'price-down'} text-xs">
                  {commodity.change >= 0 ? '+' : ''}{formatNumber(commodity.change)} ({commodity.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          {/each}
          <a href="/commodities" class="block text-center text-[#0088ff] text-xs mt-3 hover:underline">VIEW ALL →</a>
        </div>
      </div>

      <!-- GEOPOLITICAL RISK -->
      <div class="col-span-1 md:col-span-12 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">🌍 GEOPOLITICAL TENSION MAP</div>
        {#if geoRisk}
          <div class="flex flex-col md:flex-row gap-2">
            <div class="w-full md:w-1/3 p-3 space-y-2 border-r border-[#333]">
              <div class="flex items-center justify-between py-2 border-b border-[#333]">
                <span class="text-xs text-gray-400">GLOBAL TENSION</span>
                <span class="font-bold text-2xl {
                  geoRisk.level === 'SEVERE' ? 'text-[#ff0000]' :
                  geoRisk.level === 'HIGH' ? 'text-[#ff6600]' :
                  geoRisk.level === 'MODERATE' ? 'text-[#ffcc00]' :
                  'text-[#00ff00]'
                }">{geoRisk.globalTension}<span class="text-xs text-gray-400">/100</span></span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-[#333]">
                <span class="text-xs text-gray-400">LEVEL</span>
                <span class="px-2 py-0.5 rounded text-xs font-bold {
                  geoRisk.level === 'SEVERE' ? 'bg-[#ff0000]/20 text-[#ff0000]' :
                  geoRisk.level === 'HIGH' ? 'bg-[#ff6600]/20 text-[#ff6600]' :
                  geoRisk.level === 'MODERATE' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                  'bg-[#00ff00]/20 text-[#00ff00]'
                }">{geoRisk.level}</span>
              </div>
              <div class="space-y-1">
                {#each geoRisk.topRisks as risk}
                  <div class="py-1 text-xs">
                    <div class="flex items-center gap-1 mb-0.5">
                      <span class="w-1.5 h-1.5 rounded-full {
                        risk.intensity >= 7 ? 'bg-[#ff0000]' :
                        risk.intensity >= 5 ? 'bg-[#ff6600]' :
                        'bg-[#ffcc00]'
                      }"></span>
                      <span class="text-gray-400">{risk.region}</span>
                    </div>
                    <p class="text-gray-300 truncate">{risk.event}</p>
                  </div>
                {/each}
              </div>
            </div>
            <div class="w-full md:w-2/3 p-2">
              <GeoRiskMap risks={geoRisk.topRisks} />
            </div>
          </div>
        {:else}
          <div class="p-4 text-center text-gray-500">Loading geo risk data...</div>
        {/if}
      </div>

      <!-- IDX STOCKS -->
      <div class="col-span-1 md:col-span-6 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">INDONESIA STOCKS (IDX)</div>
        <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
          {#each tickers.filter(t => t.type === 'stock') as stock}
            <div class="flex items-center justify-between py-2 border-b border-[#222] last:border-0">
              <div>
                <span class="text-[#00ff00] font-bold">{stock.symbol}</span>
                <span class="text-gray-400 text-xs ml-2">{stock.name}</span>
              </div>
              <div class="text-right">
                <div class="font-bold">Rp {formatNumber(stock.price, 0)}</div>
                <div class="{stock.change >= 0 ? 'price-up' : 'price-down'} text-xs">
                  {stock.change >= 0 ? '+' : ''}{formatNumber(stock.change, 0)} ({stock.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          {/each}
          <a href="/stocks" class="block text-center text-[#0088ff] text-xs mt-3 hover:underline">VIEW ALL →</a>
        </div>
      </div>

      <!-- SGX STOCKS -->
      <SGXStocks />

      <!-- WHALE ALERTS -->
      <div class="col-span-1 md:col-span-6 terminal-panel overflow-hidden">
        <div class="terminal-panel-header flex items-center gap-2">
          <span>🚨</span> WHALE ALERTS
        </div>
        <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
          {#if whaleTransactions.length === 0}
            <div class="text-gray-500 text-sm py-4 text-center">Loading whale transactions...</div>
          {:else}
            {#each whaleTransactions.slice(0, 5) as tx}
              <div class="py-2 border-b border-[#333]">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 {tx.type === 'buy' ? 'bg-[#00ff00] text-black' : tx.type === 'sell' ? 'bg-[#ff0000] text-white' : 'bg-[#ffcc00] text-black'} text-xs rounded">
                    {tx.type.toUpperCase()}
                  </span>
                  <span class="text-xs text-gray-400">{tx.time}</span>
                </div>
                <p class="text-sm">
                  <span class="text-[#f7931a]">{tx.wallet}</span>
                  <span class="text-gray-400"> → </span>
                  <span class="text-[#00ff00]">{tx.amount}</span>
                  <span class="text-gray-400">(${tx.amountUsd >= 1000000 ? `$${(tx.amountUsd / 1000000).toFixed(1)}M` : `$${(tx.amountUsd / 1000).toFixed(0)}K`})</span>
                </p>
              </div>
            {/each}
          {/if}
          <a href="/whales" class="block text-center text-[#ff0000] text-xs mt-3 hover:underline">VIEW WHALE TRACKER →</a>
        </div>
      </div>

      <!-- PREDICTION MARKETS -->
      <PredictionMarkets />

      <!-- EMA-BB STRATEGY IDX STOCKS -->
      <div class="col-span-1 md:col-span-12 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">📈 IDX STOCKS (EMA 21/34/50 + BOLLINGER BANDS)</div>
        {#if stocksEMABB.length === 0}
          <div class="p-4 text-center text-gray-500">Loading strategy signals...</div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-400 border-b border-[#333]">
                  <th class="text-left p-2">SYMBOL</th>
                  <th class="text-right p-2">PRICE</th>
                  <th class="text-right p-2">CHG%</th>
                  <th class="text-center p-2">30D</th>
                  <th class="text-center p-2">SIGNAL</th>
                  <th class="text-center p-2">TREND</th>
                  <th class="text-right p-2">STRENGTH</th>
                  <th class="text-right p-2">BB POS</th>
                </tr>
              </thead>
              <tbody>
                {#each stocksEMABB as stock}
                  <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
                    <td class="p-2">
                      <span class="text-[#00ff00] font-bold">{stock.symbol}</span>
                    </td>
                    <td class="text-right p-2 font-mono">Rp {formatNumber(stock.price, 0)}</td>
                    <td class="text-right p-2 {stock.change >= 0 ? 'price-up' : 'price-down'}">
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                    </td>
                    <td class="text-center p-1">
                      {#if stock.history?.length > 0}
                        <MiniSparkline
                          data={stock.history}
                          width={60}
                          height={20}
                          color={stock.change >= 0 ? '#00ff00' : '#ff0000'}
                        />
                      {:else}
                        <span class="text-gray-500">-</span>
                      {/if}
                    </td>
                    <td class="text-center p-2">
                      <span class="px-2 py-0.5 rounded text-xs font-bold {
                        stock.signal === 'BUY' ? 'bg-[#00ff00]/20 text-[#00ff00]' :
                        stock.signal === 'SELL' ? 'bg-[#ff0000]/20 text-[#ff0000]' :
                        stock.signal === 'SIDEWAYS' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                        'bg-[#0088ff]/20 text-[#0088ff]'
                      }">{stock.signal}</span>
                    </td>
                    <td class="text-center p-2">
                      <span class="{
                        stock.trend === 'BULLISH' ? 'text-[#00ff00]' :
                        stock.trend === 'BEARISH' ? 'text-[#ff0000]' :
                        'text-[#ffcc00]'
                      }">{stock.trend}</span>
                    </td>
                    <td class="text-right p-2">
                      <div class="flex items-center justify-end gap-1">
                        <div class="w-12 h-1 bg-[#333] rounded overflow-hidden">
                          <div class="h-full bg-[#00ff00]" style="width: {stock.strength}%"></div>
                        </div>
                        <span class="font-mono">{stock.strength}</span>
                      </div>
                    </td>
                    <td class="text-right p-2 font-mono">
                      <span class="{stock.bbPosition < 30 ? 'text-[#00ff00]' : stock.bbPosition > 70 ? 'text-[#ff0000]' : 'text-gray-400'}">
                        {stock.bbPosition.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <a href="/stocks" class="block text-center text-[#0088ff] text-xs mt-3 hover:underline">VIEW ALL STOCKS →</a>
        {/if}
      </div>

      <!-- SECTOR HEATMAP -->
      <div class="col-span-1 md:col-span-12 terminal-panel">
        <div class="terminal-panel-header">📊 SECTOR HEATMAP (IDX)</div>
        {#if sectorData.length === 0}
          <div class="p-4 text-center text-gray-500">Loading sector data...</div>
        {:else}
          <div class="grid grid-cols-2 md:grid-cols-6 gap-1 p-2">
            {#each sectorData as sector}
              <div class="p-2 rounded text-center cursor-pointer hover:brightness-125 transition-all"
                style="background-color: {sector.change > 1 ? 'rgba(0, 255, 0, 0.3)' : sector.change > 0 ? 'rgba(0, 255, 0, 0.15)' : sector.change > -1 ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.3)'}">
                <div class="text-xs font-bold text-white">{sector.name}</div>
                <div class="{sector.change >= 0 ? 'price-up' : 'price-down'} text-xs font-mono">
                  {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>