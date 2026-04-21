<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPredictionMarkets, formatVolume, formatOdds, getProbabilityColor, type PredictionMarketsData, type PredictionMarket } from '$lib/api/prediction-markets';

  let data = $state<PredictionMarketsData | null>(null);
  let loading = $state(true);
  let selectedCategory = $state<string>('All');

  onMount(async () => {
    try {
      data = await fetchPredictionMarkets();
    } catch (e) {
      console.error('Failed to fetch prediction markets:', e);
    } finally {
      loading = false;
    }
  });

  let filteredMarkets = $derived.by(() => {
    if (!data?.markets) return [];
    if (selectedCategory === 'All') return data.markets;
    return data.markets.filter(m => m.category === selectedCategory);
  });

  function getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'Politics': return '🏛️';
      case 'Crypto': return '₿';
      case 'Economy': return '📊';
      case 'Sports': return '⚽';
      case 'Commodities': return '🪙';
      default: return '📈';
    }
  }

  function getCategoryColor(cat: string): string {
    switch (cat) {
      case 'Politics': return 'text-[#ff6600]';
      case 'Crypto': return 'text-[#f7931a]';
      case 'Economy': return 'text-[#0088ff]';
      case 'Sports': return 'text-[#00ff00]';
      case 'Commodities': return 'text-[#ffcc00]';
      default: return 'text-gray-400';
    }
  }
</script>

<div class="col-span-1 md:col-span-12 terminal-panel overflow-hidden">
  <div class="terminal-panel-header flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span>🎯</span> PREDICTION MARKETS
    </div>
    {#if data}
      <div class="flex items-center gap-2 text-xs">
        <span class="text-gray-400">VOL:</span>
        <span class="text-[#00ff00] font-mono">${formatVolume(data.totalVolume)}</span>
        <span class="text-gray-400 ml-2">24H</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="p-4 text-center text-gray-500">Loading prediction markets...</div>
  {:else if !data?.markets?.length}
    <div class="p-4 text-center text-gray-500">No markets available</div>
  {:else}
    <!-- Category filter -->
    <div class="flex flex-wrap gap-1 p-2 border-b border-[#333]">
      <button
        class="px-2 py-1 text-xs rounded transition-colors {selectedCategory === 'All' ? 'bg-[#00ff00] text-black font-bold' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
        onclick={() => selectedCategory = 'All'}
      >
        All
      </button>
      {#each data.categories as cat}
        <button
          class="px-2 py-1 text-xs rounded transition-colors {selectedCategory === cat ? 'bg-[#00ff00] text-black font-bold' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}"
          onclick={() => selectedCategory = cat}
        >
          {getCategoryIcon(cat)} {cat}
        </button>
      {/each}
    </div>

    <!-- Markets list -->
    <div class="overflow-x-auto max-h-80">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-[#0a0a0a]">
          <tr class="text-gray-400 border-b border-[#333]">
            <th class="text-left p-2">MARKET</th>
            <th class="text-center p-2">YES</th>
            <th class="text-center p-2">NO</th>
            <th class="text-right p-2">VOLUME</th>
            <th class="text-right p-2">LIQUIDITY</th>
            <th class="text-right p-2">TRADERS</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredMarkets as market}
            <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
              <td class="p-2 max-w-xs">
                <div class="flex items-start gap-2">
                  <span class="text-sm">{getCategoryIcon(market.category)}</span>
                  <div>
                    <p class="text-white font-medium leading-tight">{market.question}</p>
                    <div class="flex items-center gap-1 mt-0.5">
                      <span class="text-xs {getCategoryColor(market.category)}">{market.category}</span>
                      {#if market.endDate}
                        <span class="text-gray-500">•</span>
                        <span class="text-xs text-gray-500">Ends: {new Date(market.endDate).toLocaleDateString()}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              </td>
              <td class="text-center p-2">
                <div class="flex flex-col items-center">
                  <span class="font-mono font-bold {getProbabilityColor(market.yesPrice)}">
                    {formatOdds(market.yesPrice)}
                  </span>
                  <div class="w-8 h-1 bg-[#333] rounded mt-1 overflow-hidden">
                    <div
                      class="h-full bg-[#00ff00]"
                      style="width: {market.yesPrice * 100}%"
                    ></div>
                  </div>
                </div>
              </td>
              <td class="text-center p-2">
                <span class="font-mono {getProbabilityColor(1 - market.noPrice)}">
                  {formatOdds(market.noPrice)}
                </span>
              </td>
              <td class="text-right p-2 font-mono text-gray-300">
                {formatVolume(market.volume)}
              </td>
              <td class="text-right p-2 font-mono text-gray-400">
                {formatVolume(market.liquidity)}
              </td>
              <td class="text-right p-2 font-mono text-gray-400">
                {market.traderCount.toLocaleString()}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="p-2 border-t border-[#333] flex items-center justify-between">
      <span class="text-xs text-gray-500">
        Source: Polymarket • Updated: {data?.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString() : 'N/A'}
      </span>
      <a
        href="https://polymarket.com"
        target="_blank"
        rel="noopener"
        class="text-xs text-[#0088ff] hover:underline"
      >
        Trade on Polymarket →
      </a>
    </div>
  {/if}
</div>

<style>
  .overflow-x-auto {
    overflow-x: auto;
  }
</style>