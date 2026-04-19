<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCommodities, getCommodityStats, type CommodityData } from '$lib/api/commodities';

  let commoditiesData = $state<CommodityData[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let strategyData = $state<any[]>([]);
  let strategyLoading = $state(true);

  async function loadData() {
    try {
      error = '';
      commoditiesData = await fetchCommodities();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch commodity data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadStrategy() {
    try {
      strategyLoading = true;
      const response = await fetch('/api/commodities/strategy');
      if (response.ok) {
        const data = await response.json();
        strategyData = data.commodities || [];
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
    const interval = setInterval(loadData, 30000);
    const strategyInterval = setInterval(loadStrategy, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(strategyInterval);
    };
  });

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getRangePosition(item: CommodityData): number {
    if (item.high === 0 || item.low === 0 || item.high === item.low) return 50;
    return ((item.price - item.low) / (item.high - item.low)) * 100;
  }

  function getCategoryColor(category: string): string {
    switch (category) {
      case 'Metals': return 'text-[#ffcc00]';
      case 'Energy': return 'text-[#ff6600]';
      case 'Soft': return 'text-[#00ff00]';
      default: return 'text-white';
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'Metals': return '🥇';
      case 'Energy': return '🛢️';
      case 'Soft': return '☕';
      default: return '📦';
    }
  }

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

  // Get gold price for display
  $effect(() => {
    const gold = commoditiesData.find(c => c.symbol === 'GOLD');
    const oil = commoditiesData.find(c => c.symbol === 'OIL');
    const coffee = commoditiesData.find(c => c.symbol === 'COFFEE');
    const cocoa = commoditiesData.find(c => c.symbol === 'COCOA');
  });

  let goldData = $derived(commoditiesData.find(c => c.symbol === 'GOLD'));
  let oilData = $derived(commoditiesData.find(c => c.symbol === 'OIL'));
  let coffeeData = $derived(commoditiesData.find(c => c.symbol === 'COFFEE'));
  let cocoaData = $derived(commoditiesData.find(c => c.symbol === 'COCOA'));
  let stats = $derived(getCommodityStats());
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#00ff00]">COMMODITIES MARKETS</h1>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">Global Commodities</span>
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

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="terminal-panel p-4">
        <div class="text-[#ffcc00] text-2xl font-bold">
          {goldData ? `$${formatPrice(goldData.price)}` : '$...'}
        </div>
        <div class="text-gray-500 text-xs mt-1">GOLD (per oz)</div>
        <div class="{goldData && goldData.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm mt-2">
          {goldData ? `${goldData.change >= 0 ? '+' : ''}${goldData.change.toFixed(2)}%` : '...'}
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="text-[#ff6600] text-2xl font-bold">
          {oilData ? `$${formatPrice(oilData.price)}` : '$...'}
        </div>
        <div class="text-gray-500 text-xs mt-1">WTI OIL (per bbl)</div>
        <div class="{oilData && oilData.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm mt-2">
          {oilData ? `${oilData.change >= 0 ? '+' : ''}${oilData.change.toFixed(2)}%` : '...'}
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="text-[#00ff00] text-2xl font-bold">
          {coffeeData ? `$${formatPrice(coffeeData.price)}` : '$...'}
        </div>
        <div class="text-gray-500 text-xs mt-1">COFFEE (per lb)</div>
        <div class="{coffeeData && coffeeData.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm mt-2">
          {coffeeData ? `${coffeeData.change >= 0 ? '+' : ''}${coffeeData.change.toFixed(2)}%` : '...'}
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="text-[#00ff00] text-2xl font-bold">
          {cocoaData ? `$${formatPrice(cocoaData.price)}` : '$...'}
        </div>
        <div class="text-gray-500 text-xs mt-1">COCOA (per MT)</div>
        <div class="{cocoaData && cocoaData.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm mt-2">
          {cocoaData ? `${cocoaData.change >= 0 ? '+' : ''}${cocoaData.change.toFixed(2)}%` : '...'}
        </div>
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
                    <div class="text-white font-mono">${formatPrice(item.price)}</div>
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
                    <div class="text-white font-mono">{formatPrice(item.ema21)}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">EMA 34</div>
                    <div class="text-white font-mono">{formatPrice(item.ema34)}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">EMA 90</div>
                    <div class="text-white font-mono">{formatPrice(item.ema90)}</div>
                  </div>
                </div>
                <div class="mt-3 text-xs">
                  <div class="flex justify-between text-gray-500 mb-1">
                    <span>BB Upper</span>
                    <span class="text-white font-mono">{formatPrice(item.bbUpper)}</span>
                  </div>
                  <div class="flex justify-between text-gray-500 mb-1">
                    <span>BB Middle</span>
                    <span class="text-white font-mono">{formatPrice(item.bbMiddle)}</span>
                  </div>
                  <div class="flex justify-between text-gray-500">
                    <span>BB Lower</span>
                    <span class="text-white font-mono">{formatPrice(item.bbLower)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="terminal-panel">
      <div class="terminal-panel-header">ALL COMMODITIES</div>
      {#if loading && commoditiesData.length === 0}
        <div class="p-8 text-center text-gray-500">Loading commodity data...</div>
      {:else}
        <div class="divide-y divide-[#222]">
          {#each commoditiesData as item}
            <div class="p-4 hover:bg-[#1a1a1a] transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded bg-[#1a1a1a] flex items-center justify-center">
                    <span class="text-2xl">{getCategoryIcon(item.category)}</span>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-bold">{item.symbol}</span>
                      <span class={getCategoryColor(item.category)}>{item.category}</span>
                    </div>
                    <div class="text-gray-500 text-xs">{item.name} ({item.unit})</div>
                  </div>
                </div>
                <div class="flex items-center gap-8">
                  <div class="text-right">
                    <div class="text-white font-mono">${formatPrice(item.price)}</div>
                    <div class="text-gray-500 text-xs">{item.volume} volume</div>
                  </div>
                  <div class="text-right min-w-[80px]">
                    <div class={item.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-3 relative h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  class="absolute top-0 left-0 h-full rounded-full"
                  style="width: {getRangePosition(item)}%; background-color: {item.change >= 0 ? '#00ff00' : '#ff0000'}"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>L: ${formatPrice(item.low)}</span>
                <span>H: ${formatPrice(item.high)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">PRECIOUS METALS</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Gold/Silver Ratio</span>
            <span class="text-[#ffcc00]">{stats.goldSilverRatio.toFixed(1)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Platinum Spot</span>
            <span class="text-white">${formatPrice(stats.platinumSpot)}/oz</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Palladium Spot</span>
            <span class="text-white">${formatPrice(stats.palladiumSpot)}/oz</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">ENERGY MARKETS</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">OPEC Basket</span>
            <span class="text-[#ff6600]">${formatPrice(stats.opacBasket)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Henry Hub Gas</span>
            <span class="text-white">${formatPrice(stats.henryHub)}/MMBtu</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Coal (Newcastle)</span>
            <span class="text-white">${formatPrice(stats.newcastleCoal)}/ton</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">AGRICULTURAL</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Wheat</span>
            <span class="text-[#00ff00]">${formatPrice(stats.wheat)}/bu</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Corn</span>
            <span class="text-[#00ff00]">${formatPrice(stats.corn)}/bu</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Sugar</span>
            <span class="text-white">${formatPrice(stats.sugar)}/lb</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
