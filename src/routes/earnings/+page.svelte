<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchUpcomingEarnings, fetchRecentEarnings, type EarningsEvent } from '$lib/api/earnings';

  let upcoming = $state<EarningsEvent[]>([]);
  let recent = $state<EarningsEvent[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let activeTab = $state<'upcoming' | 'recent'>('upcoming');

  async function loadData() {
    try {
      loading = true;
      error = '';
      [upcoming, recent] = await Promise.all([
        fetchUpcomingEarnings(),
        fetchRecentEarnings(),
      ]);
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch earnings data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  });

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
      return dateStr;
    }
  }

  function getDaysUntil(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getSurpriseColor(value: number | null): string {
    if (value === null) return 'text-gray-500';
    if (value > 0) return 'text-[#00ff00]';
    if (value < 0) return 'text-[#ff0000]';
    return 'text-gray-400';
  }
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#ffcc00]">EARNINGS CALENDAR</h1>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">IDX Stock Earnings</span>
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

    <div class="flex gap-2 mb-4">
      <button
        onclick={() => activeTab = 'upcoming'}
        class="px-4 py-2 rounded {activeTab === 'upcoming' ? 'bg-[#ffcc00] text-black' : 'bg-[#222] text-gray-400'} font-bold text-sm"
      >
        UPCOMING ({upcoming.length})
      </button>
      <button
        onclick={() => activeTab = 'recent'}
        class="px-4 py-2 rounded {activeTab === 'recent' ? 'bg-[#ffcc00] text-black' : 'bg-[#222] text-gray-400'} font-bold text-sm"
      >
        RECENT ({recent.length})
      </button>
    </div>

    <div class="terminal-panel">
      <div class="terminal-panel-header text-[#ffcc00]">
        {activeTab === 'upcoming' ? '📅 UPCOMING EARNINGS' : '📊 RECENT EARNINGS'}
      </div>

      {#if loading && (activeTab === 'upcoming' ? upcoming.length : recent.length) === 0}
        <div class="p-8 text-center text-gray-500">Loading earnings data...</div>
      {:else}
        {@const events = activeTab === 'upcoming' ? upcoming : recent}
        {#if events.length === 0}
          <div class="p-8 text-center text-gray-500">No {activeTab} earnings found</div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-400 border-b border-[#333]">
                  <th class="text-left p-3">DATE</th>
                  <th class="text-left p-3">SYMBOL</th>
                  <th class="text-left p-3 hidden md:table-cell">NAME</th>
                  <th class="text-right p-3">ESTIMATE</th>
                  {#if activeTab === 'recent'}
                    <th class="text-right p-3">REPORTED</th>
                    <th class="text-right p-3">SURPRISE</th>
                  {:else}
                    <th class="text-right p-3 hidden md:table-cell">DAYS LEFT</th>
                  {/if}
                </tr>
              </thead>
              <tbody>
                {#each events as event}
                  <tr class="border-b border-[#222] hover:bg-[#1a1a1a]">
                    <td class="p-3">
                      <span class="text-white">{formatDate(event.date)}</span>
                      <span class="text-gray-500 text-xs block">{event.time}</span>
                    </td>
                    <td class="p-3">
                      <a href="/stocks/{event.symbol}" class="text-[#00ff00] font-bold hover:underline">
                        {event.symbol.replace('.JK', '')}
                      </a>
                    </td>
                    <td class="p-3 text-gray-400 hidden md:table-cell">{event.name}</td>
                    <td class="text-right p-3 font-mono">Rp {event.estimate.toFixed(0)}</td>
                    {#if activeTab === 'recent'}
                      <td class="text-right p-3 font-mono {event.reported !== null ? 'text-white' : 'text-gray-500'}">
                        {event.reported !== null ? `Rp ${event.reported.toFixed(0)}` : '-'}
                      </td>
                      <td class="text-right p-3 font-mono {getSurpriseColor(event.surprisePercent)}">
                        {event.surprisePercent !== null ? `${event.surprisePercent > 0 ? '+' : ''}${event.surprisePercent.toFixed(1)}%` : '-'}
                      </td>
                    {:else}
                      <td class="text-right p-3 hidden md:table-cell">
                        <span class="px-2 py-1 rounded text-xs {
                          getDaysUntil(event.date) <= 3 ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                          getDaysUntil(event.date) <= 7 ? 'bg-[#0088ff]/20 text-[#0088ff]' :
                          'text-gray-400'
                        }">
                          {getDaysUntil(event.date)} days
                        </span>
                      </td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>