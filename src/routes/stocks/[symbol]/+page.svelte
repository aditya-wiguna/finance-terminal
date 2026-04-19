<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  interface StockDetail {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: string;
    avgVolume: string;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    marketCap: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    exchange: string;
    currency: string;
  }

  interface NewsArticle {
    uuid: string;
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
    type: string;
    relatedTickers: string[];
    thumbnail?: {
      resolutions: Array<{ url: string; width: number; height: number }>;
    };
    summary?: string;
  }

  let stock = $state<StockDetail | null>(null);
  let news = $state<NewsArticle[]>([]);
  let loading = $state(true);
  let newsLoading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');

  async function loadData() {
    try {
      loading = true;
      error = '';
      const symbol = $page.params.symbol as string;

      const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);
      if (!response.ok) {
        if (response.status === 404) {
          error = 'Stock not found';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      stock = await response.json();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch stock data';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadNews() {
    try {
      newsLoading = true;
      const symbol = $page.params.symbol as string;

      const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/news`);
      if (response.ok) {
        news = await response.json();
      }
    } catch (e) {
      console.error('Failed to load news:', e);
    } finally {
      newsLoading = false;
    }
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCandleColor(change: number): string {
    return change >= 0 ? '#00ff00' : '#ff0000';
  }

  function get52WeekPosition(price: number, low: number, high: number): number {
    if (high === low) return 50;
    return ((price - low) / (high - low)) * 100;
  }

  function formatTime(timestamp: number): string {
    if (!timestamp || timestamp === 0) return 'Recently';

    // Handle if timestamp is in seconds (convert to milliseconds)
    let date: Date;
    if (timestamp > 1e12) {
      // Already in milliseconds
      date = new Date(timestamp);
    } else {
      // Likely in seconds
      date = new Date(timestamp * 1000);
    }

    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getThumbnailUrl(article: NewsArticle): string | null {
    if (article.thumbnail?.resolutions?.length) {
      return article.thumbnail.resolutions[0].url;
    }
    return null;
  }

  function openArticle(link: string) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  function getRelatedTickerLink(ticker: string) {
    goto(`/stocks/${encodeURIComponent(ticker)}`);
  }

  onMount(() => {
    loadData();
    loadNews();
  });
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button onclick={() => goto('/stocks')} class="text-gray-500 hover:text-white mr-2">←</button>
        {#if stock}
          <h1 class="text-lg font-bold text-[#00ff00]">{stock.symbol}</h1>
          <span class="text-white text-sm">{stock.name}</span>
        {:else}
          <h1 class="text-lg font-bold text-[#00ff00]">LOADING...</h1>
        {/if}
      </div>
      <div class="flex items-center gap-4 text-sm">
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
        <button onclick={() => goto('/stocks')} class="ml-4 text-[#0088ff] hover:underline">← Back to Stocks</button>
      </div>
    {:else if loading}
      <div class="terminal-panel p-8 text-center">
        <div class="animate-pulse text-[#ffcc00]">Loading stock data...</div>
      </div>
    {:else if stock}
      <!-- Price Header -->
      <div class="terminal-panel mb-6">
        <div class="p-6">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-4xl font-bold font-mono" style="color: {getCandleColor(stock.change)}">
                {stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.price)}
              </div>
              <div class="text-lg mt-1 {getCandleColor(stock.change)}">
                {stock.change >= 0 ? '▲' : '▼'} {stock.change >= 0 ? '+' : ''}{formatPrice(stock.change)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </div>
              <div class="text-gray-500 text-sm mt-2">
                {stock.exchange} • {stock.name}
              </div>
            </div>
            <div class="text-right">
              <div class="text-gray-500 text-xs">Market Cap</div>
              <div class="text-white font-mono text-lg">{stock.marketCap}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Statistics -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="terminal-panel">
          <div class="terminal-panel-header">📊 KEY STATISTICS</div>
          <div class="p-4 space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Open</span>
              <span class="text-white font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.open)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Previous Close</span>
              <span class="text-white font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.previousClose)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Day High</span>
              <span class="text-[#00ff00] font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.high)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Day Low</span>
              <span class="text-[#ff0000] font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.low)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Volume</span>
              <span class="text-white font-mono">{stock.volume}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Avg Volume</span>
              <span class="text-white font-mono">{stock.avgVolume}</span>
            </div>
          </div>
        </div>

        <div class="terminal-panel">
          <div class="terminal-panel-header">📈 52 WEEK RANGE</div>
          <div class="p-4 space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">52 Week High</span>
              <span class="text-[#00ff00] font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.fiftyTwoWeekHigh)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">52 Week Low</span>
              <span class="text-[#ff0000] font-mono">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.fiftyTwoWeekLow)}</span>
            </div>
            <div class="mt-4">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-[#ff0000]">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.fiftyTwoWeekLow)}</span>
                <span class="text-gray-500">52 Week Range</span>
                <span class="text-[#00ff00]">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.fiftyTwoWeekHigh)}</span>
              </div>
              <div class="relative h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  class="absolute top-0 h-full rounded-full bg-gradient-to-r from-[#ff0000] to-[#00ff00]"
                  style="width: {get52WeekPosition(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh)}%; left: 0"
                ></div>
                <div
                  class="absolute top-0 h-full w-1 bg-white"
                  style="left: {get52WeekPosition(stock.price, stock.fiftyTwoWeekLow, stock.fiftyTwoWeekHigh)}%"
                ></div>
              </div>
              <div class="text-center mt-2">
                <span class="text-white font-mono text-sm">{stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.price)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Price Chart Placeholder -->
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header">📉 PRICE CHART</div>
        <div class="p-8 text-center text-gray-500">
          <div class="h-48 flex items-end justify-center gap-1">
            {#each Array(30) as _, i}
              <div
                class="w-4 rounded-t {stock.change >= 0 ? 'bg-[#00ff00]' : 'bg-[#ff0000]'}"
                style="height: {Math.random() * 80 + 20}%"
              ></div>
            {/each}
          </div>
          <div class="mt-4 text-xs text-gray-600">30 Day Price History (Placeholder)</div>
        </div>
      </div>

      <!-- Related News -->
      <div class="terminal-panel mb-6">
        <div class="terminal-panel-header">📰 RELATED NEWS</div>
        {#if newsLoading}
          <div class="p-8 text-center text-gray-500">
            <div class="animate-pulse">Loading news...</div>
          </div>
        {:else if news.length === 0}
          <div class="p-8 text-center text-gray-500">
            No related news found
          </div>
        {:else}
          <div class="divide-y divide-[#222]">
            {#each news.slice(0, 5) as article}
              {@const thumbnailUrl = getThumbnailUrl(article)}
              <div class="p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer" onclick={() => openArticle(article.link)}>
                <div class="flex gap-4">
                  {#if thumbnailUrl}
                    <div class="flex-shrink-0">
                      <img
                        src={thumbnailUrl}
                        alt=""
                        class="w-20 h-14 object-cover rounded"
                        onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <h4 class="text-white text-sm leading-snug mb-1 line-clamp-2">{article.title}</h4>
                    <div class="flex items-center gap-3 text-xs">
                      <span class="text-[#0088ff]">{article.publisher}</span>
                      <span class="text-gray-600">•</span>
                      <span class="text-gray-500">{formatTime(article.providerPublishTime)}</span>
                      {#if article.relatedTickers?.length > 0}
                        <span class="text-gray-600">•</span>
                        <div class="flex gap-1">
                          {#each article.relatedTickers.slice(0, 3) as ticker}
                            {#if ticker !== stock.symbol}
                              <button
                                onclick={(e) => { e.stopPropagation(); getRelatedTickerLink(ticker); }}
                                class="text-[#00ff00] hover:underline bg-[#1a1a1a] px-2 py-0.5 rounded text-xs"
                              >
                                {ticker}
                              </button>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <div class="p-3 border-t border-[#222] text-center">
            <a href="/news" class="text-[#0088ff] hover:underline text-sm">View all news →</a>
          </div>
        {/if}
      </div>

      <!-- Additional Info -->
      <div class="terminal-panel">
        <div class="terminal-panel-header">ℹ️ STOCK INFORMATION</div>
        <div class="p-4 grid grid-cols-2 gap-4 text-sm">
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">Symbol</span>
              <span class="text-[#0088ff] font-bold">{stock.symbol}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Exchange</span>
              <span class="text-white">{stock.exchange}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Currency</span>
              <span class="text-white">{stock.currency}</span>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">52W Change</span>
              <span class="{stock.fiftyTwoWeekHigh > stock.fiftyTwoWeekLow ? 'text-[#00ff00]' : 'text-[#ff0000]'}">
                {((stock.price - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow * 100).toFixed(2)}%
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Day Range</span>
              <span class="text-white">
                {stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.low)} - {stock.currency === 'IDR' ? 'Rp ' : '$'}{formatPrice(stock.high)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Data Provider</span>
              <span class="text-[#0088ff]">Yahoo Finance</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
