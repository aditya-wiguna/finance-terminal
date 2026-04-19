<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCryptoData, fetchTrendingMemeCoins, getCryptoStats, type CryptoData, type TrendingMemeCoin } from '$lib/api/crypto';

  let cryptoData = $state<CryptoData[]>([]);
  let memeCoins = $state<TrendingMemeCoin[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let strategyData = $state<any[]>([]);
  let strategyLoading = $state(true);

  async function loadData() {
    try {
      loading = true;
      error = '';
      const [crypto, memes] = await Promise.all([
        fetchCryptoData(),
        fetchTrendingMemeCoins()
      ]);
      cryptoData = crypto;
      memeCoins = memes;
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch crypto data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadStrategy() {
    try {
      strategyLoading = true;
      const response = await fetch('/api/crypto/strategy');
      if (response.ok) {
        const data = await response.json();
        strategyData = data.cryptos || [];
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
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
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

  let stats = $derived(getCryptoStats());
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-bold text-[#00ff00]">CRYPTO MARKETS</h1>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-500">Top 15 by Market Cap</span>
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
        <button onclick={loadData} class="ml-4 text-[#0088ff] hover:underline"> Retry</button>
      </div>
    {/if}

    <!-- Strategy Cards -->
    {#if strategyData.length > 0}
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header text-[#00ff00]">📊 MOMENTUM STRATEGY (EMA 21/34/90 + BOLLINGER BANDS)</div>
        {#if strategyLoading && strategyData.length === 0}
          <div class="p-8 text-center text-gray-500">Loading strategy analysis...</div>
        {:else}
          <div class="grid grid-cols-2 gap-4 p-4">
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

    <!-- Trending Meme Coins -->
    {#if memeCoins.length > 0}
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header bg-[#ff6b00]">🐸 TRENDING MEME COINS</div>
        <div class="p-4">
          {#if loading && memeCoins.length === 0}
            <div class="p-4 text-center text-gray-500">Loading meme coins...</div>
          {:else}
            <div class="grid grid-cols-5 gap-3">
              {#each memeCoins.slice(0, 5) as coin}
                <div class="bg-[#0a0a0a] rounded p-3 text-center hover:bg-[#1a1a1a] transition-colors">
                  <div class="flex justify-center mb-2">
                    {#if coin.thumb}
                      <img src={coin.thumb} alt={coin.name} class="w-8 h-8 rounded-full" />
                    {:else}
                      <div class="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-[#ff6b00] font-bold text-xs">
                        {coin.symbol.slice(0, 2)}
                      </div>
                    {/if}
                  </div>
                  <div class="text-white font-bold text-sm">{coin.symbol}</div>
                  <div class="text-white font-mono text-xs mt-1">${formatPrice(coin.price)}</div>
                  <div class="flex justify-center gap-1 mt-2 text-xs">
                    <span class={coin.change1h >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}>
                      {coin.change1h >= 0 ? '+' : ''}{coin.change1h.toFixed(1)}%
                    </span>
                    <span class="text-gray-500">1h</span>
                  </div>
                  <div class="text-xs {coin.change24h >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
                    {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Top Meme Coins Table -->
    {#if memeCoins.length > 0}
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header">🐸 MEME COIN TRACKER</div>
        <div class="divide-y divide-[#222]">
          {#each memeCoins as coin}
            <div class="grid grid-cols-12 gap-4 items-center p-3 hover:bg-[#1a1a1a] transition-colors">
              <div class="col-span-3 flex items-center gap-2">
                {#if coin.thumb}
                  <img src={coin.thumb} alt={coin.name} class="w-6 h-6 rounded-full" />
                {/if}
                <div>
                  <div class="text-white font-bold text-sm">{coin.symbol}</div>
                  <div class="text-gray-500 text-xs truncate">{coin.name}</div>
                </div>
              </div>
              <div class="col-span-2 text-right">
                <div class="text-white font-mono text-sm">${formatPrice(coin.price)}</div>
              </div>
              <div class="col-span-2 text-right">
                <div class="{coin.change1h >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm">
                  {coin.change1h >= 0 ? '+' : ''}{coin.change1h.toFixed(2)}%
                  <span class="text-gray-500 text-xs">1h</span>
                </div>
              </div>
              <div class="col-span-2 text-right">
                <div class="{coin.change24h >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} text-sm">
                  {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                  <span class="text-gray-500 text-xs">24h</span>
                </div>
              </div>
              <div class="col-span-2 text-right text-gray-400 text-xs">
                {coin.marketCap}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Main Crypto Table -->
    <div class="terminal-panel">
      <div class="terminal-panel-header">
        <div class="grid grid-cols-12 gap-4 text-[#888] text-xs">
          <div class="col-span-2">ASSET</div>
          <div class="col-span-2 text-right">PRICE</div>
          <div class="col-span-1 text-right">24H</div>
          <div class="col-span-2 text-right">MARKET CAP</div>
          <div class="col-span-2 text-right">24H VOLUME</div>
          <div class="col-span-3 text-center">7D CHART</div>
        </div>
      </div>
      {#if loading && cryptoData.length === 0}
        <div class="p-8 text-center text-gray-500">Loading crypto data...</div>
      {:else}
        <div class="divide-y divide-[#222]">
          {#each cryptoData as item}
            <div class="grid grid-cols-12 gap-4 items-center p-4 hover:bg-[#1a1a1a] transition-colors">
              <div class="col-span-2">
                <div class="flex items-center gap-3">
                  {#if item.image}
                    <img src={item.image} alt={item.name} class="w-8 h-8 rounded-full" />
                  {:else}
                    <div class="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#ffcc00] font-bold">
                      {item.symbol.slice(0, 1)}
                    </div>
                  {/if}
                  <div>
                    <div class="text-white font-bold">{item.symbol}</div>
                    <div class="text-gray-500 text-xs">{item.name}</div>
                  </div>
                </div>
              </div>
              <div class="col-span-2 text-right">
                <div class="text-white font-mono">${formatPrice(item.price)}</div>
              </div>
              <div class="col-span-1 text-right">
                <div class={item.change >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                </div>
              </div>
              <div class="col-span-2 text-right text-gray-400">
                {item.marketCap}
              </div>
              <div class="col-span-2 text-right text-gray-400">
                {item.volume24h}
              </div>
              <div class="col-span-3 text-center">
                <span class="text-[#00ff00] text-sm font-mono tracking-tight">{item.sparkline}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-3 gap-4 mt-6">
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">BTC vs ALT SEASON</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">BTC Dominance</span>
            <span class="text-[#00ff00]">{stats.btcDominance}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">ETH Dominance</span>
            <span class="text-[#00ff00]">{stats.ethDominance}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Altcoin Season Index</span>
            <span class="text-[#ffcc00]">72/100</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">TOP PRICES</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-[#f7931a]">BTC</span>
            <span class="text-white">${formatPrice(stats.btcPrice)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#627eea]">ETH</span>
            <span class="text-white">${formatPrice(stats.ethPrice)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Total Market Cap</span>
            <span class="text-[#00ff00]">{stats.totalMarketCap}</span>
          </div>
        </div>
      </div>
      <div class="terminal-panel p-4">
        <div class="terminal-panel-header mb-3">DATA SOURCE</div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-500">Provider</span>
            <span class="text-[#00ff00]">CoinGecko API</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Update Frequency</span>
            <span class="text-white">30 seconds</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Coins Tracked</span>
            <span class="text-white">{cryptoData.length}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
