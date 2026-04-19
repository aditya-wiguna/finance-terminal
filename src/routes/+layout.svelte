<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let { children } = $props();
  let currentTime = $state('');

  onMount(() => {
    const updateClock = () => {
      currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  });

  function isActive(path: string): boolean {
    if (path === '/') {
      return page.url.pathname === '/';
    }
    return page.url.pathname.startsWith(path);
  }
</script>

<svelte:head>
  <title>AW Terminal - Trading Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
</svelte:head>

<div class="flex h-screen bg-[#0a0a0a]">
  <aside class="w-56 bg-[#121212] border-r border-[#333] flex flex-col">
    <div class="p-4 border-b border-[#333]">
      <h1 class="text-xl font-bold text-[#00ff00] tracking-wider">AW TERMINAL</h1>
      <p class="text-xs text-gray-500 mt-1">Simple Trading Terminal</p>
    </div>
    <nav class="flex-1 py-4">
      <a href="/" class="nav-item {isActive('/') ? 'active' : ''}">
        <span class="text-[#00ff00]">01</span> Dashboard
      </a>
      <a href="/crypto" class="nav-item {isActive('/crypto') ? 'active' : ''}">
        <span class="text-[#00ff00]">02</span> Crypto
      </a>
      <a href="/currency" class="nav-item {isActive('/currency') ? 'active' : ''}">
        <span class="text-[#00ff00]">03</span> Currency
      </a>
      <a href="/commodities" class="nav-item {isActive('/commodities') ? 'active' : ''}">
        <span class="text-[#00ff00]">04</span> Commodities
      </a>
      <a href="/stocks" class="nav-item {isActive('/stocks') ? 'active' : ''}">
        <span class="text-[#00ff00]">05</span> Indonesia Stocks
      </a>
      <a href="/whales" class="nav-item {isActive('/whales') ? 'active' : ''}">
        <span class="text-[#ff0000]">06</span> Whale Tracker
      </a>
      <a href="/news" class="nav-item {isActive('/news') ? 'active' : ''}">
        <span class="text-[#0088ff]">07</span> News
      </a>
    </nav>
    <div class="p-4 border-t border-[#333] text-xs text-gray-500">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse"></span>
        Market Open
      </div>
      <p class="mt-2">Last Update: <span class="text-white">{currentTime}</span></p>
    </div>
  </aside>
  <main class="flex-1 flex flex-col overflow-hidden">
    {@render children()}
  </main>
</div>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: #888;
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s;
    border-left: 3px solid transparent;
  }
  .nav-item:hover {
    background: #1a1a1a;
    color: #fff;
    border-left-color: #00ff00;
  }
  .nav-item.active {
    background: #1a1a1a;
    color: #fff;
    border-left-color: #00ff00;
  }
</style>
