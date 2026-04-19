<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchIndonesianStocks, type StockData } from '$lib/api/stocks';

  interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
  }

  interface StrategyStock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    strength: number;
    signal: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
  }

  interface StrategyData {
    bpjs: StrategyStock[];
    bsjp: StrategyStock[];
  }

  let stocksData = $state<StockData[]>([]);
  let strategyData = $state<StrategyData>({ bpjs: [], bsjp: [] });
  let searchQuery = $state('');
  let searchResults = $state<SearchResult[]>([]);
  let showDropdown = $state(false);
  let loading = $state(true);
  let strategyLoading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let marketSummary = $state({ idx: 0, change: 0 });
  let activeTab = $state<'all' | 'gainers' | 'losers' | 'volume'>('all');
  let searchTimeout: ReturnType<typeof setTimeout>;

  async function loadData() {
    try {
      loading = true;
      error = '';

      stocksData = await fetchIndonesianStocks();
      applyFilters();

      const avgChange = stocksData.reduce((sum, s) => sum + s.changePercent, 0) / (stocksData.length || 1);
      marketSummary = {
        idx: 7245.80 * (1 + avgChange / 100),
        change: avgChange,
      };

      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch stock data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadStrategy() {
    try {
      strategyLoading = true;
      const response = await fetch('/api/stocks/strategy');
      if (response.ok) {
        strategyData = await response.json();
      }
    } catch (e) {
      console.error('Strategy error:', e);
    } finally {
      strategyLoading = false;
    }
  }

  async function handleSearch() {
    clearTimeout(searchTimeout);

    if (!searchQuery.trim()) {
      searchResults = [];
      showDropdown = false;
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          searchResults = await response.json();
          showDropdown = searchResults.length > 0;
        }
      } catch (e) {
        console.error('Search error:', e);
        searchResults = [];
      }
    }, 300);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      selectStock(searchResults[0]);
    } else if (e.key === 'Escape') {
      showDropdown = false;
    }
  }

  function selectStock(stock: SearchResult) {
    goto(`/stocks/${encodeURIComponent(stock.symbol)}`);
    showDropdown = false;
    searchQuery = '';
  }

  function applyFilters() {
    // Local filtering is kept for Indonesian stocks view
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function getCandleColor(item: StockData): string {
    return item.price >= item.previousClose ? '#00ff00' : '#ff0000';
  }

  function parseVolume(vol: string): number {
    const num = parseFloat(vol.replace(/[^0-9.]/g, ''));
    if (vol.includes('B')) return num * 1e9;
    if (vol.includes('M')) return num * 1e6;
    if (vol.includes('K')) return num * 1e3;
    return num;
  }

  function getSignalColor(signal: string): string {
    switch (signal) {
      case 'BUY': return 'text-[#00ff00]';
      case 'SELL': return 'text-[#ff0000]';
      default: return 'text-[#ffcc00]';
    }
  }

  function getSignalBg(signal: string): string {
    switch (signal) {
      case 'BUY': return 'bg-[#00ff00] text-black';
      case 'SELL': return 'bg-[#ff0000] text-white';
      default: return 'bg-[#ffcc00] text-black';
    }
  }

  onMount(() => {
    loadData();
    loadStrategy();
    const interval = setInterval(() => {
      loadData();
      loadStrategy();
    }, 30000);
    return () => clearInterval(interval);
  });

  let topGainers = $derived([...stocksData].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3));
  let topLosers = $derived([...stocksData].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3));
  let topVolume = $derived([...stocksData].sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)).slice(0, 3));
  let topForeignBuy = $derived([...stocksData].filter(s => s.foreign.includes('Buy')).sort((a, b) => parseFloat(b.foreign.replace(/[^0-9.]/g, '')) - parseFloat(a.foreign.replace(/[^0-9.]/g, ''))).slice(0, 3));
  let topForeignSell = $derived([...stocksData].filter(s => s.foreign.includes('Sell')).sort((a, b) => parseFloat(b.foreign.replace(/[^0-9.]/g, '')) - parseFloat(a.foreign.replace(/[^0-9.]/g, ''))).slice(0, 3));
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-4 md:px-6 py-3">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-bold text-[#00ff00]">INDONESIA STOCKS</h1>
        <span class="text-gray-500 text-sm">
          JKSE: {marketSummary.idx.toFixed(2)} ({marketSummary.change >= 0 ? '+' : ''}{marketSummary.change.toFixed(2)}%)
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

    <!-- Global Search -->
    <div class="terminal-panel mb-6">
      <div class="terminal-panel-header">🔍 SEARCH GLOBAL STOCK</div>
      <div class="p-4 relative">
        <input
          type="text"
          bind:value={searchQuery}
          oninput={handleSearch}
          onkeydown={handleKeydown}
          onfocus={() => { if (searchResults.length > 0) showDropdown = true; }}
          placeholder="Enter stock symbol (e.g., AAPL, GOOGL)..."
          class="w-full bg-[#0a0a0a] border border-[#333] rounded px-4 py-2 text-white placeholder-gray-600 focus:border-[#00ff00] focus:outline-none"
        />
        {#if showDropdown && searchResults.length > 0}
          <div class="absolute left-4 right-4 mt-1 bg-[#0a0a0a] border border-[#333] rounded shadow-lg z-50 max-h-64 overflow-auto">
            {#each searchResults as result}
              <button
                onclick={() => selectStock(result)}
                class="w-full px-4 py-3 text-left hover:bg-[#1a1a1a] flex items-center justify-between border-b border-[#222] last:border-b-0"
              >
                <div>
                  <span class="text-[#0088ff] font-bold">{result.symbol}</span>
                  <span class="text-gray-400 ml-2 text-sm">{result.name}</span>
                </div>
                <span class="text-gray-500 text-xs">{result.exchange}</span>
              </button>
            {/each}
          </div>
        {/if}
        <p class="text-gray-500 text-xs mt-2">Press Enter to search or click a result to view details</p>
      </div>
    </div>

    <!-- Strategy Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- BPJS - Beli Pagi Jual Sore -->
      <div class="terminal-panel">
        <div class="terminal-panel-header bg-[#00cc00]">🌅 BPJS (Beli Pagi Jual Sore)</div>
        <div class="p-3">
          {#if strategyLoading}
            <div class="p-4 text-center text-gray-500">Loading...</div>
          {:else if strategyData.bpjs.length === 0}
            <div class="p-4 text-center text-gray-500">No strong BUY signals</div>
          {:else}
            <div class="space-y-2">
              {#each strategyData.bpjs as stock}
                <div class="bg-[#0a0a0a] rounded p-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer" onclick={() => goto(`/stocks/${encodeURIComponent(stock.symbol)}`)}>
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[#0088ff] font-bold">{stock.symbol}</span>
                      <span class="{getSignalBg(stock.signal)} px-2 py-0.5 rounded text-xs font-bold">{stock.signal}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-mono text-sm">Rp {formatPrice(stock.price)}</span>
                      <span class="{stock.changePercent >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                        <div class="h-full bg-[#00ff00]" style="width: {stock.strength}%"></div>
                      </div>
                      <span class="text-gray-500 text-xs">{stock.strength}%</span>
                    </div>
                  </div>
                  <p class="text-gray-500 text-xs mt-1">{stock.reason}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- BSJP - Beli Sore Jual Pagi -->
      <div class="terminal-panel">
        <div class="terminal-panel-header bg-[#cc6600]">🌙 BSJP (Beli Sore Jual Pagi)</div>
        <div class="p-3">
          {#if strategyLoading}
            <div class="p-4 text-center text-gray-500">Loading...</div>
          {:else if strategyData.bsjp.length === 0}
            <div class="p-4 text-center text-gray-500">No strong BUY signals</div>
          {:else}
            <div class="space-y-2">
              {#each strategyData.bsjp as stock}
                <div class="bg-[#0a0a0a] rounded p-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer" onclick={() => goto(`/stocks/${encodeURIComponent(stock.symbol)}`)}>
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[#0088ff] font-bold">{stock.symbol}</span>
                      <span class="{getSignalBg(stock.signal)} px-2 py-0.5 rounded text-xs font-bold">{stock.signal}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-mono text-sm">Rp {formatPrice(stock.price)}</span>
                      <span class="{stock.changePercent >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                        <div class="h-full bg-[#ffcc00]" style="width: {stock.strength}%"></div>
                      </div>
                      <span class="text-gray-500 text-xs">{stock.strength}%</span>
                    </div>
                  </div>
                  <p class="text-gray-500 text-xs mt-1">{stock.reason}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Top Movers Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="terminal-panel">
        <div class="terminal-panel-header text-[#00ff00]">🟢 MOST BUYER STOCK</div>
        <div class="p-2">
          {#if loading}
            <div class="p-4 text-center text-gray-500">Loading...</div>
          {:else}
            {#each topForeignBuy as item, i}
              <div class="flex items-center justify-between p-2 {i < topForeignBuy.length - 1 ? 'border-b border-[#222]' : ''}">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500 text-xs w-4">{i + 1}.</span>
                  <span class="text-white font-bold text-sm">{item.symbol}</span>
                </div>
                <span class="text-[#00ff00] text-xs">{item.foreign}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="terminal-panel">
        <div class="terminal-panel-header text-[#ff0000]">🔴 MOST OUTFLOW FOREIGN</div>
        <div class="p-2">
          {#if loading}
            <div class="p-4 text-center text-gray-500">Loading...</div>
          {:else}
            {#each topForeignSell as item, i}
              <div class="flex items-center justify-between p-2 {i < topForeignSell.length - 1 ? 'border-b border-[#222]' : ''}">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500 text-xs w-4">{i + 1}.</span>
                  <span class="text-white font-bold text-sm">{item.symbol}</span>
                </div>
                <span class="text-[#ff0000] text-xs">{item.foreign}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="terminal-panel">
        <div class="terminal-panel-header text-[#0088ff]">📊 MOST ACTIVE VOLUME</div>
        <div class="p-2">
          {#if loading}
            <div class="p-4 text-center text-gray-500">Loading...</div>
          {:else}
            {#each topVolume as item, i}
              <div class="flex items-center justify-between p-2 {i < topVolume.length - 1 ? 'border-b border-[#222]' : ''}">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500 text-xs w-4">{i + 1}.</span>
                  <span class="text-white font-bold text-sm">{item.symbol}</span>
                </div>
                <span class="text-[#0088ff] text-xs">{item.volume}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Indonesian Stocks Table -->
    <div class="terminal-panel overflow-x-auto">
      <div class="terminal-panel-header">🇮🇩 INDONESIAN STOCKS ({stocksData.length} stocks)</div>
      {#if loading && stocksData.length === 0}
        <div class="p-8 text-center text-gray-500">Loading stock data...</div>
      {:else if stocksData.length === 0}
        <div class="p-8 text-center text-gray-500">No stock data available</div>
      {:else}
        <!-- Table Header - hidden on mobile -->
        <div class="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-[#1a1a1a] text-xs text-gray-500 border-b border-[#333]">
          <div class="col-span-1">Symbol</div>
          <div class="col-span-2">Name</div>
          <div class="col-span-1 text-right">Price</div>
          <div class="col-span-1 text-right">Change</div>
          <div class="col-span-1 text-right">%</div>
          <div class="col-span-1 text-right">Volume</div>
          <div class="col-span-1 text-right">Open</div>
          <div class="col-span-1 text-right">High</div>
          <div class="col-span-1 text-right">Low</div>
          <div class="col-span-2 text-center">Foreign Flow</div>
        </div>
        <!-- Table Body -->
        <div class="divide-y divide-[#222]">
          {#each stocksData as item}
            <div class="p-3 md:grid md:grid-cols-12 md:gap-2 md:px-4 md:py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              onclick={() => goto(`/stocks/${encodeURIComponent(item.symbol)}`)}>
              <!-- Mobile view -->
              <div class="md:hidden flex items-center justify-between mb-2">
                <div>
                  <span class="text-[#0088ff] font-bold">{item.symbol}</span>
                  <span class="text-gray-400 ml-2 text-xs">{item.name}</span>
                </div>
                <div class="text-right">
                  <div class="text-white font-mono text-sm">Rp {formatPrice(item.price)}</div>
                  <div class="{item.changePercent >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-xs">
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
              <!-- Desktop view -->
              <div class="hidden md:block col-span-1">
                <span class="text-[#0088ff] font-bold">{item.symbol}</span>
              </div>
              <div class="hidden md:block col-span-2 text-gray-400 truncate text-xs" title={item.name}>
                {item.name}
              </div>
              <div class="hidden md:block col-span-1 text-right font-mono text-white">
                Rp {formatPrice(item.price)}
              </div>
              <div class="hidden md:block col-span-1 text-right {item.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
              </div>
              <div class="hidden md:block col-span-1 text-right {item.changePercent >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </div>
              <div class="hidden md:block col-span-1 text-right text-gray-500 text-xs">
                {item.volume}
              </div>
              <div class="hidden md:block col-span-1 text-right text-gray-400 text-xs">
                {formatPrice(item.open)}
              </div>
              <div class="hidden md:block col-span-1 text-right text-[#00ff00] text-xs">
                {formatPrice(item.high)}
              </div>
              <div class="hidden md:block col-span-1 text-right text-[#ff0000] text-xs">
                {formatPrice(item.low)}
              </div>
              <div class="hidden md:block col-span-2 text-center text-xs {item.foreign.includes('Buy') ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
                {item.foreign}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Market Summary -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">📊 MARKET SUMMARY</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Idx Composite</span>
            <span class="text-[#00ff00]">{marketSummary.idx.toFixed(2)} ({marketSummary.change >= 0 ? '+' : ''}{marketSummary.change.toFixed(2)}%)</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Most Active</span>
            <span class="text-white">{topVolume[0]?.symbol || '...'} ({topVolume[0]?.volume || '...'})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Advancers</span>
            <span class="text-[#00ff00]">{stocksData.filter(s => s.changePercent > 0).length} issues</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Decliners</span>
            <span class="text-[#ff0000]">{stocksData.filter(s => s.changePercent < 0).length} issues</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">💹 FOREIGN FLOW</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Foreign Buy</span>
            <span class="text-[#00ff00]">Rp 4.2T</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Foreign Sell</span>
            <span class="text-[#ff0000]">Rp 3.1T</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Net Foreign</span>
            <span class="text-[#00ff00]">+Rp 1.1T</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">YTD Net Foreign</span>
            <span class="text-white">Rp 28.5T</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
