<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

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

  let news = $state<NewsArticle[]>([]);
  let loading = $state(true);
  let error = $state('');
  let lastUpdate = $state('');
  let searchQuery = $state('finance stock market');
  let activeCategory = $state('all');

  const categories = [
    { id: 'all', label: 'Latest News', query: 'stock market' },
    { id: 'gold', label: 'Gold / XAU', query: 'gold XAU USD' },
    { id: 'tech', label: 'Technology', query: 'technology stocks AI' },
    { id: 'crypto', label: 'Crypto', query: 'bitcoin ethereum cryptocurrency' },
    { id: 'economy', label: 'Economy', query: 'federal reserve economy inflation interest rates' },
    { id: 'commodities', label: 'Commodities', query: 'oil gold commodities futures' },
  ];

  async function loadNews() {
    try {
      loading = true;
      error = '';

      const response = await fetch(`/api/news?category=${activeCategory}&q=${encodeURIComponent(searchQuery)}&count=30`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      news = await response.json();
      lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
    } catch (e) {
      error = 'Failed to fetch news';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function setCategory(category: typeof categories[0]) {
    activeCategory = category.id;
    searchQuery = category.query;
    loadNews();
  }

  function formatTime(timestamp: number): string {
    if (!timestamp || timestamp === 0) return 'Recently';

    let date: Date;
    if (timestamp > 1e12) {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp * 1000);
    }

    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours < 1) return minutes > 0 ? `${minutes}m ago` : 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function openArticle(link: string) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  function getRelatedTickerLink(ticker: string) {
    goto(`/stocks/${encodeURIComponent(ticker)}`);
  }

  function getThumbnailUrl(article: NewsArticle): string | null {
    if (article.thumbnail?.resolutions?.length) {
      return article.thumbnail.resolutions[0].url;
    }
    return null;
  }

  onMount(() => {
    loadNews();
    const interval = setInterval(loadNews, 300000);
    return () => clearInterval(interval);
  });
</script>

<div class="h-full flex flex-col">
  <div class="bg-[#121212] border-b border-[#333] px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-bold text-[#00ff00]">📰 FINANCIAL NEWS</h1>
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

  <!-- Category Tabs -->
  <div class="bg-[#121212] border-b border-[#333] px-6 py-2">
    <div class="flex gap-2 overflow-x-auto">
      {#each categories as cat}
        <button
          onclick={() => setCategory(cat)}
          class="px-4 py-2 rounded text-sm whitespace-nowrap transition-colors {activeCategory === cat.id ? 'bg-[#00ff00] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'}"
        >
          {cat.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex-1 overflow-auto p-4">
    {#if error}
      <div class="terminal-panel p-4 mb-4 border-[#ff0000]">
        <span class="text-[#ff0000]">{error}</span>
        <button onclick={loadNews} class="ml-4 text-[#0088ff] hover:underline">Retry</button>
      </div>
    {/if}

    {#if loading}
      <div class="terminal-panel p-8 text-center">
        <div class="animate-pulse text-[#ffcc00]">Loading news...</div>
      </div>
    {:else if news.length === 0}
      <div class="terminal-panel p-8 text-center text-gray-500">
        No news articles found
      </div>
    {:else}
      <div class="space-y-3">
        {#each news as article}
          {@const thumbnailUrl = getThumbnailUrl(article)}
          <div
            class="terminal-panel hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            onclick={() => openArticle(article.link)}
            onkeydown={(e) => e.key === 'Enter' && openArticle(article.link)}
            role="button"
            tabindex="0"
          >
            <div class="flex gap-3 p-3">
              {#if thumbnailUrl}
                <div class="flex-shrink-0">
                  <img
                    src={thumbnailUrl}
                    alt=""
                    class="w-24 h-16 object-cover rounded"
                    loading="lazy"
                    onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-white font-medium text-sm leading-snug mb-1 line-clamp-2">
                      {article.title}
                    </h3>
                    <div class="flex items-center gap-2 text-xs flex-wrap">
                      <span class="text-[#0088ff]">{article.publisher}</span>
                      <span class="text-gray-600">•</span>
                      <span class="text-gray-500">{formatTime(article.providerPublishTime)}</span>
                      {#if article.relatedTickers?.length > 0}
                        <span class="text-gray-600">•</span>
                        <div class="flex gap-1 flex-wrap">
                          {#each article.relatedTickers.slice(0, 3) as ticker}
                            <button
                              onclick={(e) => { e.stopPropagation(); getRelatedTickerLink(ticker); }}
                              class="text-[#00ff00] hover:underline bg-[#1a1a1a] px-1.5 py-0.5 rounded text-xs"
                            >
                              {ticker}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                  <span class="flex-shrink-0 inline-block px-1.5 py-0.5 text-xs rounded
                    {article.type === 'STORY' ? 'bg-[#0088ff] text-white' :
                     article.type === 'BLOG' ? 'bg-[#00ff00] text-black' :
                     article.type === 'PRESS_RELEASE' ? 'bg-[#ffcc00] text-black' :
                     'bg-[#333] text-white'}">
                    {article.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
