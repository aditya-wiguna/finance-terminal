<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchSGXStocks, type SGXStock } from '$lib/api/sgx';

  let stocks = $state<SGXStock[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      stocks = await fetchSGXStocks();
    } catch (e) {
      console.error('Failed to fetch SGX stocks:', e);
    } finally {
      loading = false;
    }
  });

  function formatNumber(num: number, decimals = 2): string {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
</script>

<div class="col-span-1 md:col-span-6 terminal-panel overflow-hidden">
  <div class="terminal-panel-header flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span>🇸🇬</span> SGX (SINGAPORE)
    </div>
    {#if stocks.length > 0}
      <span class="text-[#00ff00] text-xs">LIVE</span>
    {/if}
  </div>

  {#if loading}
    <div class="p-4 text-center text-gray-500">Loading SGX stocks...</div>
  {:else if stocks.length === 0}
    <div class="p-4 text-center text-gray-500">No SGX data available</div>
  {:else}
    <div class="overflow-x-auto max-h-64 overflow-y-auto">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-[#0a0a0a]">
          <tr class="text-gray-400 border-b border-[#333]">
            <th class="text-left p-2">SYMBOL</th>
            <th class="text-right p-2">PRICE</th>
            <th class="text-right p-2">CHG%</th>
            <th class="text-right p-2">VOL</th>
          </tr>
        </thead>
        <tbody>
          {#each stocks.slice(0, 10) as stock}
            <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
              <td class="p-2">
                <span class="text-[#ff6600] font-bold">{stock.symbol}</span>
                <span class="text-gray-500 text-xs ml-1 block">{stock.name}</span>
              </td>
              <td class="text-right p-2 font-mono">
                S${formatNumber(stock.price, 2)}
              </td>
              <td class="text-right p-2 {stock.change >= 0 ? 'price-up' : 'price-down'}">
                {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </td>
              <td class="text-right p-2 font-mono text-gray-400">
                {stock.volume}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="p-2 border-t border-[#333] text-xs text-gray-500">
      <span>Day Range: {stocks[0]?.dayRange || 'N/A'}</span>
    </div>
  {/if}
</div>