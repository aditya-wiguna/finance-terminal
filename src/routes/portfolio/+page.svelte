<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPortfolio, addPosition, removePosition, clearPortfolio, type PortfolioSummary, type PortfolioPosition } from '$lib/api/portfolio';

  let summary = $state<PortfolioSummary | null>(null);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  
  let showAddModal = $state(false);
  let newSymbol = $state('');
  let newName = $state('');
  let newShares = $state(0);
  let newPrice = $state(0);

  async function loadData() {
    try {
      loading = true;
      error = '';
      summary = await fetchPortfolio();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch portfolio';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  });

  async function handleAdd() {
    if (!newSymbol || newShares <= 0 || newPrice <= 0) return;
    
    const success = await addPosition(newSymbol, newName || newSymbol, newShares, newPrice);
    if (success) {
      showAddModal = false;
      newSymbol = '';
      newName = '';
      newShares = 0;
      newPrice = 0;
      await loadData();
    }
  }

  async function handleRemove(symbol: string) {
    const success = await removePosition(symbol);
    if (success) {
      await loadData();
    }
  }

  async function handleClear() {
    if (!confirm('Clear all positions?')) return;
    const success = await clearPortfolio();
    if (success) {
      await loadData();
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#0088ff]">PORTFOLIO TRACKER</h1>
      <div class="flex items-center gap-4 text-sm">
        <button
          onclick={() => showAddModal = true}
          class="px-3 py-1 bg-[#0088ff] text-black rounded text-xs font-bold hover:brightness-110"
        >
          + ADD POSITION
        </button>
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

    {#if showAddModal}
      <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div class="terminal-panel p-6 w-full max-w-md">
          <div class="terminal-panel-header mb-4">ADD POSITION</div>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-gray-400 block mb-1">SYMBOL</label>
              <input
                type="text"
                bind:value={newSymbol}
                placeholder="BBRI.JK"
                class="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">NAME</label>
              <input
                type="text"
                bind:value={newName}
                placeholder="Bank Rakyat Indonesia"
                class="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">SHARES</label>
                <input
                  type="number"
                  bind:value={newShares}
                  placeholder="100"
                  class="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">AVERAGE PRICE (Rp)</label>
                <input
                  type="number"
                  bind:value={newPrice}
                  placeholder="5000"
                  class="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <div class="flex gap-2 pt-2">
              <button
                onclick={handleAdd}
                class="flex-1 py-2 bg-[#0088ff] text-black rounded font-bold"
              >
                ADD
              </button>
              <button
                onclick={() => showAddModal = false}
                class="flex-1 py-2 bg-[#333] text-white rounded"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if summary}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="terminal-panel p-4">
          <div class="text-xs text-gray-400 mb-1">TOTAL VALUE</div>
          <div class="text-2xl font-bold text-[#0088ff]">Rp {formatNumber(summary.totalValue)}</div>
        </div>
        <div class="terminal-panel p-4">
          <div class="text-xs text-gray-400 mb-1">TOTAL COST</div>
          <div class="text-2xl font-bold text-white">Rp {formatNumber(summary.totalCost)}</div>
        </div>
        <div class="terminal-panel p-4">
          <div class="text-xs text-gray-400 mb-1">TOTAL P&L</div>
          <div class="text-2xl font-bold {summary.totalPnL >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
            {summary.totalPnL >= 0 ? '+' : ''}Rp {formatNumber(summary.totalPnL)}
            <span class="text-sm">({summary.totalPnLPercent.toFixed(1)}%)</span>
          </div>
        </div>
        <div class="terminal-panel p-4">
          <div class="text-xs text-gray-400 mb-1">DAY CHANGE</div>
          <div class="text-2xl font-bold {summary.dayChange >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
            {summary.dayChange >= 0 ? '+' : ''}Rp {formatNumber(summary.dayChange)}
          </div>
        </div>
      </div>
    {/if}

    <div class="terminal-panel">
      <div class="terminal-panel-header flex items-center justify-between">
        <span>POSITIONS ({summary?.positions.length || 0})</span>
        {#if summary && summary.positions.length > 0}
          <button
            onclick={handleClear}
            class="text-xs text-[#ff0000] hover:underline"
          >
            CLEAR ALL
          </button>
        {/if}
      </div>

      {#if loading && (summary?.positions.length || 0) === 0}
        <div class="p-8 text-center text-gray-500">Loading portfolio...</div>
      {:else if !summary || summary.positions.length === 0}
        <div class="p-8 text-center">
          <div class="text-gray-500 mb-4">No positions yet</div>
          <button
            onclick={() => showAddModal = true}
            class="px-4 py-2 bg-[#0088ff] text-black rounded font-bold"
          >
            ADD YOUR FIRST POSITION
          </button>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-gray-400 border-b border-[#333]">
                <th class="text-left p-3">SYMBOL</th>
                <th class="text-right p-3">SHARES</th>
                <th class="text-right p-3">AVG PRICE</th>
                <th class="text-right p-3">CURRENT</th>
                <th class="text-right p-3">VALUE</th>
                <th class="text-right p-3">P&L</th>
                <th class="text-center p-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each summary.positions as pos}
                <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
                  <td class="p-3">
                    <a href="/stocks/{pos.symbol}" class="text-[#0088ff] font-bold hover:underline">
                      {pos.symbol.replace('.JK', '')}
                    </a>
                    <div class="text-gray-500 text-xs">{pos.name}</div>
                  </td>
                  <td class="text-right p-3 font-mono">{formatNumber(pos.shares)}</td>
                  <td class="text-right p-3 font-mono text-gray-400">Rp {formatNumber(pos.avgPrice)}</td>
                  <td class="text-right p-3 font-mono">
                    Rp {formatNumber(pos.currentPrice)}
                    <div class="{pos.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                      {pos.change >= 0 ? '+' : ''}{pos.changePercent.toFixed(1)}%
                    </div>
                  </td>
                  <td class="text-right p-3 font-mono text-white">Rp {formatNumber(pos.value)}</td>
                  <td class="text-right p-3">
                    <span class="{pos.pnl >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} font-mono">
                      {pos.pnl >= 0 ? '+' : ''}Rp {formatNumber(pos.pnl)}
                    </span>
                    <div class="{pos.pnlPercent >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                      ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%)
                    </div>
                  </td>
                  <td class="text-center p-3">
                    <button
                      onclick={() => handleRemove(pos.symbol)}
                      class="text-[#ff0000] hover:text-red-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>