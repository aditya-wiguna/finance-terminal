<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCurrencyRates, getCentralBankRates, type CurrencyData } from '$lib/api/currency';

  let currencyData = $state<CurrencyData[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let selectedBase = $state('EUR');
  let strategyData = $state<any[]>([]);
  let strategyLoading = $state(true);

  const baseOptions = ['EUR', 'USD', 'GBP'];

  async function loadData() {
    try {
      loading = true;
      error = '';
      currencyData = await fetchCurrencyRates(selectedBase);
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch currency data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadStrategy() {
    try {
      strategyLoading = true;
      const response = await fetch('/api/currency/strategy');
      if (response.ok) {
        const data = await response.json();
        strategyData = data.currencies || [];
      }
    } catch (e) {
      console.error('Strategy load error:', e);
    } finally {
      strategyLoading = false;
    }
  }

  onMount(() => {
    loadData();
    loadStrategy();
    const interval = setInterval(loadData, 60000);
    const strategyInterval = setInterval(loadStrategy, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(strategyInterval);
    };
  });

  function formatPrice(price: number, decimals: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function getRangePosition(item: CurrencyData): number {
    if (item.high === 0 || item.low === 0 || item.high === item.low) return 50;
    return ((item.price - item.low) / (item.high - item.low)) * 100;
  }

  let centralBankRates = getCentralBankRates();

  function getSignalColor(signal: string): string {
    switch (signal) {
      case 'BUY': return 'text-[#00ff00]';
      case 'SELL': return 'text-[#ff0000]';
      case 'SIDEWAYS': return 'text-[#ffcc00]';
      default: return 'text-gray-400';
    }
  }

  function getSignalBg(signal: string): string {
    switch (signal) {
      case 'BUY': return 'bg-[#00ff00]/20 border-[#00ff00]';
      case 'SELL': return 'bg-[#ff0000]/20 border-[#ff0000]';
      case 'SIDEWAYS': return 'bg-[#ffcc00]/20 border-[#ffcc00]';
      default: return 'bg-[#333]/20 border-[#333]';
    }
  }

  function getTrendColor(trend: string): string {
    switch (trend) {
      case 'BULLISH': return 'text-[#00ff00]';
      case 'BEARISH': return 'text-[#ff0000]';
      default: return 'text-[#ffcc00]';
    }
  }

  function formatStrategyPrice(price: number, decimals: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#00ff00]">CURRENCY MARKETS</h1>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">Forex (Frankfurter API)</span>
        {#if loading}
          <span class="text-[#ffcc00] animate-pulse">● LOADING</span>
        {:else}
          <span class="text-[#00ff00] animate-pulse">● LIVE</span>
          <span class="text-gray-500 text-xs">Updated: {lastUpdate}</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-auto p-6">
    {#if error}
      <div class="terminal-panel p-4 mb-4 border-[#ff0000]">
        <span class="text-[#ff0000]">{error}</span>
        <button onclick={loadData} class="ml-4 text-[#0088ff] hover:underline">Retry</button>
      </div>
    {/if}

    <div class="terminal-panel mb-6">
      <div class="terminal-panel-header text-[#ffcc00]">BASE CURRENCY</div>
      <div class="p-4">
        <div class="flex gap-4">
          {#each baseOptions as base}
            <button
              onclick={() => { selectedBase = base; loadData(); }}
              class="px-4 py-2 rounded transition-colors {selectedBase === base ? 'bg-[#00ff00] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#333]'}">
              {base}
            </button>
          {/each}
        </div>
        <p class="text-gray-500 text-xs mt-2">Select base currency to view exchange rates</p>
      </div>
    </div>

    <!-- Strategy Cards -->
    {#if strategyData.length > 0}
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header text-[#00ff00]">📊 MOMENTUM STRATEGY (EMA 21/34/90 + BOLLINGER BANDS)</div>
        {#if strategyLoading && strategyData.length === 0}
          <div class="p-8 text-center text-gray-500">Loading strategy analysis...</div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {#each strategyData.slice(0, 6) as item}
              <div class="border rounded p-4 {getSignalBg(item.signal)}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-white font-bold">{item.symbol}</span>
                    <span class="text-xs px-2 py-0.5 rounded {getTrendColor(item.trend)} bg-black/30">
                      {item.trend}
                    </span>
                  </div>
                  <div class="text-right">
                    <div class="text-white font-mono">{formatPrice(item.price, item.price > 100 ? 2 : 4)}</div>
                    <div class="{item.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 rounded font-bold text-sm {getSignalColor(item.signal)}">
                    {item.signal}
                  </span>
                  <span class="text-gray-500 text-xs">Strength: {item.strength}%</span>
                </div>
                <div class="text-xs text-gray-400 mb-3">{item.reason}</div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div class="text-center">
                    <div class="text-gray-500">EMA 21</div>
                    <div class="text-white font-mono">{formatPrice(item.ema21, item.price > 100 ? 2 : 4)}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">EMA 34</div>
                    <div class="text-white font-mono">{formatPrice(item.ema34, item.price > 100 ? 2 : 4)}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">EMA 90</div>
                    <div class="text-white font-mono">{formatPrice(item.ema90, item.price > 100 ? 2 : 4)}</div>
                  </div>
                </div>
                <div class="mt-3 text-xs">
                  <div class="flex justify-between text-gray-500 mb-1">
                    <span>BB Upper</span>
                    <span class="text-white font-mono">{formatPrice(item.bbUpper, item.price > 100 ? 2 : 4)}</span>
                  </div>
                  <div class="flex justify-between text-gray-500 mb-1">
                    <span>BB Middle</span>
                    <span class="text-white font-mono">{formatPrice(item.bbMiddle, item.price > 100 ? 2 : 4)}</span>
                  </div>
                  <div class="flex justify-between text-gray-500">
                    <span>BB Lower</span>
                    <span class="text-white font-mono">{formatPrice(item.bbLower, item.price > 100 ? 2 : 4)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="terminal-panel">
      <div class="terminal-panel-header">EXCHANGE RATES ({selectedBase} BASE)</div>
      {#if loading && currencyData.length === 0}
        <div class="p-8 text-center text-gray-500">Loading currency data...</div>
      {:else}
        <div class="divide-y divide-[#222]">
          {#each currencyData as item}
            <div class="p-4 hover:bg-[#1a1a1a] transition-colors">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{item.flag}</span>
                  <div>
                    <div class="text-white font-bold">{item.symbol}</div>
                    <div class="text-gray-500 text-xs">{item.name}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-white font-mono text-lg">
                    {formatPrice(item.price, item.price > 100 ? 2 : 4)}
                  </div>
                  <div class={item.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(3)}%
                  </div>
                </div>
              </div>
              <div class="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  class="absolute top-0 left-0 h-full bg-[#00ff00] rounded-full"
                  style="width: {getRangePosition(item)}%"
                ></div>
                <div class="absolute top-0 left-0 w-1 h-full bg-[#ffcc00]"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>L: {formatPrice(item.low, item.low > 100 ? 2 : 4)}</span>
                <span>H: {formatPrice(item.high, item.high > 100 ? 2 : 4)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">CENTRAL BANK RATES</div>
        <div class="space-y-2 text-xs">
          {#each centralBankRates as bank}
            <div class="flex justify-between">
              <span class="text-gray-500">{bank.country}</span>
              <span class={bank.color}>{bank.rate}</span>
            </div>
          {/each}
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">CURRENCY INFO</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">API Provider</span>
            <span class="text-[#00ff00]">Frankfurter API</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Update Frequency</span>
            <span class="text-white">60 seconds</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Supported Currencies</span>
            <span class="text-white">30+</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Base Currency</span>
            <span class="text-white">{selectedBase}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
