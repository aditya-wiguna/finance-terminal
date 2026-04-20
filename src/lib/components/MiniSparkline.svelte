<script lang="ts">
  interface Props {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
  }

  let { data, width = 80, height = 24, color = '#00ff00' }: Props = $props();

  function buildPath(values: number[]): string {
    if (values.length < 2) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }

  $effect(() => {
    // Reactive to data changes
  });
</script>

<svg width={width} height={height} class="inline-block">
  {#if data.length >= 2}
    <path
      d={buildPath(data)}
      fill="none"
      stroke={color}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/if}
</svg>