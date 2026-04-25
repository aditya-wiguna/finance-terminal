<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchWhaleTransactions, getWhaleStats, type WhaleTransaction } from '$lib/api/whales';

  let transactions = $state<WhaleTransaction[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');

  async function loadData() {
    try {
      loading = true;
      error = '';
      transactions = await fetchWhaleTransactions();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch whale data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  });

  function formatAmountUsd(amount: number): string {
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    return `$${amount.toLocaleString()}`;
  }

  let stats = $derived(getWhaleStats());
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#ff0000]">WHALE TRACKER</h1>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">Real-time Blockchain Transactions</span>
        {#if loading}
          <span class="text-[#ffcc00] animate-pulse">● LOADING</span>
        {:else}
          <span class="text-[#ffcc00] animate-pulse">● LIVE</span>
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

    <div class="terminal-panel">
      <div class="terminal-panel-header text-[#ff0000] animate-pulse">🐋 RECENT WHALE TRANSACTIONS (>$50K)</div>
      {#if loading && transactions.length === 0}
        <div class="p-8 text-center text-gray-500">Loading transactions...</div>
      {:else if transactions.length === 0}
        <div class="p-8 text-center text-gray-500">No large transactions found</div>
      {:else}
        <div class="divide-y divide-[#222]">
          {#each transactions as tx}
            <div class="p-4 hover:bg-[#1a1a1a] transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded bg-[#1a1a1a] flex items-center justify-center">
                    {#if tx.type === 'buy'}
                      <span class="text-[#00ff00] text-xl">▲</span>
                    {:else if tx.type === 'sell'}
                      <span class="text-[#ff0000] text-xl">▼</span>
                    {:else}
                      <span class="text-[#ffcc00] text-xl">↔</span>
                    {/if}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class={tx.type === 'buy' ? 'text-[#00ff00]' : tx.type === 'sell' ? 'text-[#ff0000]' : 'text-[#ffcc00]'}>
                        {tx.type.toUpperCase()}
                      </span>
                      <span class="text-white font-bold">{tx.amount}</span>
                      <span class="text-gray-500 text-xs">({formatAmountUsd(tx.amountUsd)})</span>
                    </div>
                    <div class="text-gray-500 text-xs mt-1">
                      @{tx.wallet} • {tx.symbol} • Tx: {tx.txHash.slice(0, 12)}...
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-[#ffcc00] font-bold">{formatAmountUsd(tx.amountUsd)}</div>
                  <div class="text-gray-500 text-xs">{tx.time}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">📊 WHALE STATISTICS</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Total Whale Volume</span>
            <span class="text-[#ffcc00]">{stats.totalWhaleBalance}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">24h Volume</span>
            <span class="text-white">{stats.dailyVolume}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Large Txs (>$50K)</span>
            <span class="text-[#00ff00]">{stats.largeTxs}</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">📈 TRANSACTION TYPES</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-[#00ff00]">BUY/Accumulation</span>
            <span class="text-white">{transactions.filter(t => t.type === 'buy').length}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#ff0000]">SELL/Distribution</span>
            <span class="text-white">{transactions.filter(t => t.type === 'sell').length}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#ffcc00]">Transfers</span>
            <span class="text-white">{transactions.filter(t => t.type === 'transfer').length}</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">🔗 DATA SOURCES</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Bitcoin</span>
            <span class="text-[#ff9900]">Blockchair</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Ethereum</span>
            <span class="text-[#0088ff]">Blockchair</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Solana</span>
            <span class="text-[#00ff00]">DexScreener</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>