<script lang="ts">
  import { onMount } from 'svelte';

  interface GeoTensionEvent {
    id: string;
    date: string;
    country: string;
    region: string;
    category: string;
    event: string;
    intensity: number;
    tone: number;
    lat?: number;
    lng?: number;
  }

  interface Props {
    risks: GeoTensionEvent[];
  }

  let { risks }: Props = $props();
  let mapContainer: HTMLDivElement;
  let map: any = null;

  // Map coordinates for regions
  const regionCoords: Record<string, [number, number]> = {
    'Worldwide': [20, 0],
    'Europe': [54, 15],
    'Asia-Pacific': [25, 105],
    'MENA': [28, 40],
    'Asia': [35, 105],
    'Africa': [0, 20],
    'Americas': [40, -100],
    'Middle East': [30, 45],
    'Eastern Europe': [48, 32],
    'Indo-Pacific': [-5, 120],
    'South China Sea': [15, 115],
    'Taiwan Strait': [24, 119],
    'Korean Peninsula': [38, 127],
    'Persian Gulf': [26, 52],
    'Mediterranean': [38, 25],
    'Red Sea': [20, 38],
    'Arctic': [80, 0],
  };

  function getMarkerColor(intensity: number): string {
    if (intensity >= 7) return 'red';
    if (intensity >= 5) return 'orange';
    return 'yellow';
  }

  onMount(async () => {
    // Dynamic import to avoid SSR issues
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    // Initialize map centered on world
    map = L.map(mapContainer).setView([20, 0], 2);

    // Add OpenStreetMap tiles (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 8,
      minZoom: 1,
    }).addTo(map);

    // Add markers for each risk
    risks.forEach(risk => {
      const coords = regionCoords[risk.region] || regionCoords['Worldwide'];
      const color = getMarkerColor(risk.intensity);

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${color === 'red' ? '#ff0000' : color === 'orange' ? '#ff6600' : '#ffcc00'};
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker(coords as [number, number], { icon }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="font-family: monospace; font-size: 11px; min-width: 150px;">
          <strong style="color: ${color === 'red' ? '#ff0000' : color === 'orange' ? '#ff6600' : '#ffcc00'}">${risk.region}</strong><br/>
          <span style="color: #666">${risk.event}</span><br/>
          <span style="color: #888">Intensity: ${risk.intensity}/10</span>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    return () => {
      if (map) map.remove();
    };
  });
</script>

<div bind:this={mapContainer} class="w-full h-48 md:h-64 rounded"></div>

<style>
  :global(.custom-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.leaflet-popup-content-wrapper) {
    background: #1a1a1a;
    color: #fff;
    border: 1px solid #333;
    border-radius: 4px;
  }

  :global(.leaflet-popup-tip) {
    background: #1a1a1a;
  }
</style>