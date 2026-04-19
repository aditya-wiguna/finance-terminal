<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCryptoData } from '$lib/api/crypto';
  import { fetchIndonesianStocks } from '$lib/api/stocks';
  import { fetchCommodities } from '$lib/api/commodities';
  import { fetchCurrencyRates } from '$lib/api/currency';

  interface MarketTicker {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    type: 'crypto' | 'currency' | 'commodity' | 'stock';
  }

  let tickers = $state<MarketTicker[]>([]);
  let currentTime = $state(new Date().toLocaleTimeString('en-US', { hour12: false }));

  async function loadData() {
    try {
      const [crypto, stocks, commodities, currencies] = await Promise.all([
        fetchCryptoData(),
        fetchIndonesianStocks(),
        fetchCommodities(),
        fetchCurrencyRates('EUR'),
      ]);

      // Build tickers from real data
      const newTickers: MarketTicker[] = [];

      // Add top crypto
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

      // Add currencies (EUR based)
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

      // Add commodities
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

      // Add stocks
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
    } catch (e) {
      console.error('Dashboard data fetch error:', e);
    }
  }

  onMount(() => {
    // Initial load
    loadData();

    // Update time every second
    const timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    }, 1000);

    // Refresh data every 30 seconds
    const dataInterval = setInterval(loadData, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
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
  <header class="terminal-header px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <h2 class="text-lg font-bold text-[#00ff00]">MARKET OVERVIEW</h2>
      <span class="text-xs text-gray-500">IDX • CRYPTO • FOREX • COMMODITIES</span>
    </div>
    <div class="flex items-center gap-6 text-sm">
      <span class="text-gray-400">JAKARTA: <span class="text-white">{currentTime}</span></span>
      <span class="px-2 py-1 bg-[#00ff00] text-black font-bold text-xs rounded">LIVE</span>
    </div>
  </header>

  <div class="flex-1 overflow-auto p-4">
    <div class="grid grid-cols-12 gap-4 h-full" style="grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr);">
      <div class="col-span-12 terminal-panel overflow-hidden">
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

      <div class="col-span-4 terminal-panel overflow-hidden">
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

      <div class="col-span-4 terminal-panel overflow-hidden">
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

      <div class="col-span-4 terminal-panel overflow-hidden">
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

      <div class="col-span-6 terminal-panel overflow-hidden">
        <div class="terminal-panel-header">INDONESIA STOCKS (IDX)</div>
        <div class="p-3 space-y-2">
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

      <div class="col-span-6 whale-alert">
        <div class="terminal-panel h-full overflow-hidden">
          <div class="terminal-panel-header flex items-center gap-2">
            <span>🚨</span> WHALE ALERTS (WALLET PAUS)
          </div>
          <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
            <div class="py-2 border-b border-[#333]">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 bg-[#ff0000] text-white text-xs rounded">SELL</span>
                <span class="text-xs text-gray-400">2 min ago</span>
              </div>
              <p class="text-sm"><span class="text-[#f7931a]">3Aw8...d9K2</span> sold <span class="text-[#00ff00]">1,250 BTC</span> ($84.2M)</p>
            </div>
            <div class="py-2 border-b border-[#333]">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 bg-[#00ff00] text-black text-xs rounded">BUY</span>
                <span class="text-xs text-gray-400">5 min ago</span>
              </div>
              <p class="text-sm"><span class="text-[#f7931a]">1Lz...9Xm</span> bought <span class="text-[#00ff00]">15,000 ETH</span> ($51.8M)</p>
            </div>
            <div class="py-2 border-b border-[#333]">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 bg-[#ff0000] text-white text-xs rounded">SELL</span>
                <span class="text-xs text-gray-400">8 min ago</span>
              </div>
              <p class="text-sm"><span class="text-[#f7931a]">bc1q...xy</span> sold <span class="text-[#00ff00]">500 BTC</span> ($33.7M)</p>
            </div>
            <a href="/whales" class="block text-center text-[#ff0000] text-xs mt-3 hover:underline">VIEW WHALE TRACKER →</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
