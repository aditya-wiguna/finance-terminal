<script lang="ts">
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let isRegister = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit() {
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          name: isRegister ? name : undefined,
          action: isRegister ? 'register' : 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Something went wrong';
        return;
      }

      // Full page reload to ensure cookie is sent with request
      window.location.href = '/';
    } catch (e) {
      error = 'Connection error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
  <div class="terminal-panel w-full max-w-md p-6">
    <div class="terminal-panel-header mb-4">
      <h1 class="text-xl font-bold text-[#00ff00]">AW TERMINAL</h1>
      <p class="text-xs text-gray-400 mt-1">Financial Dashboard</p>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div>
        <label class="text-xs text-gray-400 block mb-1">EMAIL</label>
        <input
          type="email"
          bind:value={email}
          class="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#00ff00] focus:outline-none"
          required
        />
      </div>

      {#if isRegister}
        <div>
          <label class="text-xs text-gray-400 block mb-1">NAME</label>
          <input
            type="text"
            bind:value={name}
            class="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#00ff00] focus:outline-none"
          />
        </div>
      {/if}

      <div>
        <label class="text-xs text-gray-400 block mb-1">PASSWORD</label>
        <input
          type="password"
          bind:value={password}
          class="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#00ff00] focus:outline-none"
          required
        />
      </div>

      {#if error}
        <div class="text-[#ff0000] text-xs p-2 bg-[#ff0000]/10 border border-[#ff0000]/30 rounded">
          {error}
        </div>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-[#00ff00] text-black font-bold py-2 rounded hover:brightness-110 disabled:opacity-50"
      >
        {loading ? 'PROCESSING...' : isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}
      </button>
    </form>

    <div class="mt-4 text-center">
      <button
        onclick={() => { isRegister = !isRegister; error = ''; }}
        class="text-xs text-[#0088ff] hover:underline"
      >
        {isRegister ? 'Already have account? Login' : 'Need account? Register'}
      </button>
    </div>
  </div>
</div>
