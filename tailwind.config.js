/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'terminal-black': '#0a0a0a',
        'terminal-dark': '#121212',
        'terminal-gray': '#1a1a1a',
        'terminal-green': '#00ff00',
        'terminal-red': '#ff0000',
        'terminal-yellow': '#ffcc00',
        'terminal-blue': '#0088ff',
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
