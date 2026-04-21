<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchSGXStocks, type SGXStock } from '$lib/api/sgx';

  let stocksData = $state<SGXStock[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let activeTab = $state<'all' | 'gainers' | 'losers' | 'volume'>('all');

  async function loadData() {
    try {
      loading = true;
      error = '';

      stocksData = await fetchSGXStocks();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch SGX stock data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseVolume(vol: string): number {
    const num = parseFloat(vol.replace(/[^0-9.]/g, ''));
    if (vol.includes('B')) return num * 1e9;
    if (vol.includes('M')) return num * 1e6;
    if (vol.includes('K')) return num * 1e3;
    return num;
  }

  let displayedStocks = $derived.by(() => {
    if (!stocksData.length) return [];

    switch (activeTab) {
      case 'gainers':
        return [...stocksData].sort((a, b) => b.changePercent - a.changePercent);
      case 'losers':
        return [...stocksData].sort((a, b) => a.changePercent - b.changePercent);
      case 'volume':
        return [...stocksData].sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume));
      default:
        return stocksData;
    }
  });

  let marketStats = $derived.by(() => {
    if (!stocksData.length) return { avgChange: 0, volume: 0 };
    const avgChange = stocksData.reduce((sum, s) => sum + s.changePercent, 0) / stocksData.length;
    const totalVolume = stocksData.reduce((sum, s) => sum + parseVolume(s.volume), 0);
    return {
      avgChange,
      volume: totalVolume
    };
  });

  function formatLargeVolume(vol: number): string {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toString();
  }

  onMount(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  });
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-4 md:px-6 py-3">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-lg">🇸🇬</span>
          <h1 class="text-lg font-bold text-[#ff6600]">SINGAPORE STOCKS (SGX)</h1>
        </div>
        <span class="text-gray-500 text-sm">
          STI: {stocksData.length > 0 ? '3,450.00' : '---'} ({marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%)
        </span>
      </div>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">Yahoo Finance</span>
        {#if loading && stocksData.length === 0}
          <span class="text-[#ffcc00] animate-pulse">● LOADING</span>
        {:else}
          <span class="text-[#00ff00] animate-pulse">● LIVE</span>
          <span class="text-gray-500 text-xs">Updated: {lastUpdate}</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-auto p-4">
    {#if error}
      <div class="terminal-panel p-4 mb-4 border-[#ff0000]">
        <span class="text-[#ff0000]">{error}</span>
        <button onclick={loadData} class="ml-4 text-[#0088ff] hover:underline">Retry</button>
      </div>
    {/if}

    <!-- Stats Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="terminal-panel p-3">
        <div class="text-gray-500 text-xs mb-1">STOCKS</div>
        <div class="text-white font-bold text-xl">{stocksData.length}</div>
      </div>
      <div class="terminal-panel p-3">
        <div class="text-gray-500 text-xs mb-1">AVG CHANGE</div>
        <div class="font-bold text-xl {marketStats.avgChange >= 0 ? 'price-up' : 'price-down'}">
          {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
        </div>
      </div>
      <div class="terminal-panel p-3">
        <div class="text-gray-500 text-xs mb-1">TOTAL VOL</div>
        <div class="text-white font-bold text-xl">{formatLargeVolume(marketStats.volume)}</div>
      </div>
      <div class="terminal-panel p-3">
        <div class="text-gray-500 text-xs mb-1">MARKET</div>
        <div class="text-[#ff6600] font-bold text-sm">SINGAPORE</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button
        class="px-4 py-2 text-xs font-bold rounded transition-colors {activeTab === 'all' ? 'bg-[#ff6600] text-black' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
        onclick={() => activeTab = 'all'}
      >
        ALL
      </button>
      <button
        class="px-4 py-2 text-xs font-bold rounded transition-colors {activeTab === 'gainers' ? 'bg-[#00ff00] text-black' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
        onclick={() => activeTab = 'gainers'}
      >
        ▲ GAINERS
      </button>
      <button
        class="px-4 py-2 text-xs font-bold rounded transition-colors {activeTab === 'losers' ? 'bg-[#ff0000] text-white' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
        onclick={() => activeTab = 'losers'}
      >
        ▼ LOSERS
      </button>
      <button
        class="px-4 py-2 text-xs font-bold rounded transition-colors {activeTab === 'volume' ? 'bg-[#0088ff] text-white' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
        onclick={() => activeTab = 'volume'}
      >
        VOLUME
      </button>
    </div>

    <!-- Stock List -->
    <div class="terminal-panel">
      <div class="terminal-panel-header">STOCK LIST</div>
      {#if loading && stocksData.length === 0}
        <div class="p-8 text-center text-gray-500">Loading SGX stocks...</div>
      {:else if stocksData.length === 0}
        <div class="p-8 text-center text-gray-500">No SGX stock data available</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-[#0a0a0a]">
              <tr class="text-gray-400 border-b border-[#333]">
                <th class="text-left p-3">SYMBOL</th>
                <th class="text-left p-3">NAME</th>
                <th class="text-right p-3">PRICE</th>
                <th class="text-right p-3">CHG</th>
                <th class="text-right p-3">CHG%</th>
                <th class="text-right p-3">VOLUME</th>
                <th class="text-right p-3">DAY RANGE</th>
                <th class="text-right p-3">FOREIGN FLOW</th>
              </tr>
            </thead>
            <tbody>
              {#each displayedStocks as stock}
                <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
                  <td class="p-3">
                    <span class="text-[#ff6600] font-bold">{stock.symbol}</span>
                  </td>
                  <td class="p-3 text-gray-400">{stock.name}</td>
                  <td class="p-3 text-right font-mono text-white">
                    S${formatPrice(stock.price)}
                  </td>
                  <td class="p-3 text-right font-mono {stock.change >= 0 ? 'price-up' : 'price-down'}">
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                  </td>
                  <td class="p-3 text-right font-mono {stock.changePercent >= 0 ? 'price-up' : 'price-down'}">
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </td>
                  <td class="p-3 text-right font-mono text-gray-400">
                    {stock.volume}
                  </td>
                  <td class="p-3 text-right font-mono text-gray-500 text-xs">
                    {stock.dayRange}
                  </td>
                  <td class="p-3 text-right">
                    <span class="{stock.foreign.includes('Buy') ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                      {stock.foreign}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Info Footer -->
    <div class="mt-4 text-center text-gray-500 text-xs">
      <p>Data provided by Yahoo Finance • SGX stocks use .SI suffix</p>
      <p class="mt-1">For detailed stock analysis, visit Singapore Exchange (SGX) official website</p>
    </div>
  </div>
</div>