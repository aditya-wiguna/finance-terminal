<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { navigating } from '$app/stores';
  import { setCurrentUserId } from '$lib/api/portfolio';

  let { children, data }: { children: any; data?: { user?: { id?: string } } } = $props();
  let currentTime = $state('');
  let mobileMenuOpen = $state(false);

  onMount(() => {
    const updateClock = () => {
      currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (data?.user?.id) {
      setCurrentUserId(data.user.id);
    }
  });

  function isActive(path: string): boolean {
    if (path === '/') {
      return page.url.pathname === '/';
    }
    return page.url.pathname.startsWith(path);
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<svelte:head>
  <title>AW Terminal - Trading Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
</svelte:head>

<div class="flex h-screen bg-[#0a0a0a]">
  <!-- Mobile Header -->
  <header class="md:hidden fixed top-0 left-0 right-0 bg-[#121212] border-b border-[#333] px-4 py-3 z-50 flex items-center justify-between">
    <h1 class="text-lg font-bold text-[#00ff00] tracking-wider">AW TERMINAL</h1>
    <button
      onclick={() => mobileMenuOpen = !mobileMenuOpen}
      class="p-2 text-[#00ff00]"
      aria-label="Toggle menu"
    >
      {#if mobileMenuOpen}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      {:else}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      {/if}
    </button>
  </header>

  <!-- Mobile Menu Overlay -->
  {#if mobileMenuOpen}
    <div
      class="md:hidden fixed inset-0 bg-black/80 z-40"
      onclick={closeMobileMenu}
      onkeydown={(e) => e.key === 'Escape' && closeMobileMenu}
      role="button"
      tabindex="0"
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside class="w-56 bg-[#121212] border-r border-[#333] flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
    {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0">
    <div class="p-4 border-b border-[#333]">
      <h1 class="text-xl font-bold text-[#00ff00] tracking-wider">AW TERMINAL</h1>
      <p class="text-xs text-gray-500 mt-1">Simple Trading Terminal</p>
    </div>
    <nav class="flex-1 py-4 overflow-y-auto">
      <a href="/" class="nav-item {isActive('/') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#00ff00]">01</span> Dashboard
      </a>
      <a href="/crypto" class="nav-item {isActive('/crypto') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#00ff00]">02</span> Crypto
      </a>
      <a href="/currency" class="nav-item {isActive('/currency') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#00ff00]">03</span> Currency
      </a>
      <a href="/commodities" class="nav-item {isActive('/commodities') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#00ff00]">04</span> Commodities
      </a>
      <a href="/stocks" class="nav-item {isActive('/stocks') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#00ff00]">05</span> Indonesia Stocks
      </a>
      <a href="/sgx" class="nav-item {isActive('/sgx') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#ff6600]">06</span> Singapore Stocks
      </a>
      <a href="/whales" class="nav-item {isActive('/whales') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#ff0000]">07</span> Whale Tracker
      </a>
      <a href="/news" class="nav-item {isActive('/news') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#0088ff]">08</span> News
      </a>
      <a href="/earnings" class="nav-item {isActive('/earnings') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#ffcc00]">09</span> Earnings
      </a>
      <a href="/portfolio" class="nav-item {isActive('/portfolio') ? 'active' : ''}" onclick={closeMobileMenu}>
        <span class="text-[#0088ff]">10</span> Portfolio
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

  <main class="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
    <!-- Global Navigation Loading Bar -->
    {#if $navigating}
      <div class="h-1 bg-[#121212] fixed top-0 left-0 right-0 z-[100] overflow-hidden">
        <div class="h-full bg-[#00ff00] animate-pulse" style="width: 100%"></div>
      </div>
    {/if}
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
