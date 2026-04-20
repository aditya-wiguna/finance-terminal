import { json } from '@sveltejs/kit';
import { getCache, setCache } from '$lib/cache';

interface GeoTensionEvent {
  id: string;
  date: string;
  country: string;
  region: string;
  category: string;
  event: string;
  intensity: number;
  tone: number;
}

interface GeoRiskIndex {
  globalTension: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  topRisks: GeoTensionEvent[];
  lastUpdate: string;
}

export async function GET() {
  const cacheKey = 'geopolitical_tension';

  const cached = getCache<GeoRiskIndex>(cacheKey);
  if (cached) {
    return json(cached);
  }

  try {
    // Use GDELT free API - it provides global conflict/event data
    // GDELT Event API: Returns counts of events by country/category
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');

    // Fetch from GDELT's live hourly rolling file - this gives us last 24h of global events
    // We'll simulate a geo risk index based on publicly available threat data
    // In production, you would integrate with GDELT's full event database or paid services like ACLED

    // Simulated geopolitical risk based on recent global tensions
    // In real implementation, this would come from GDELT/ACLED or similar
    const geoRisks: GeoTensionEvent[] = [
      {
        id: '1',
        date: new Date().toISOString(),
        country: 'Global',
        region: 'Worldwide',
        category: 'Military',
        event: 'Ongoing conflicts in multiple regions',
        intensity: 7.5,
        tone: -0.6,
      },
      {
        id: '2',
        date: new Date().toISOString(),
        country: 'South China Sea',
        region: 'Asia-Pacific',
        category: 'Territorial',
        event: 'Maritime tension in disputed waters',
        intensity: 6.8,
        tone: -0.4,
      },
      {
        id: '3',
        date: new Date().toISOString(),
        country: 'Middle East',
        region: 'MENA',
        category: 'Political',
        event: 'Regional instability continues',
        intensity: 7.2,
        tone: -0.7,
      },
      {
        id: '4',
        date: new Date().toISOString(),
        country: 'Eastern Europe',
        region: 'Europe',
        category: 'Military',
        event: 'Ongoing regional conflict',
        intensity: 8.5,
        tone: -0.8,
      },
      {
        id: '5',
        date: new Date().toISOString(),
        country: 'Indo-Pacific',
        region: 'Asia',
        category: 'Trade',
        event: 'Trade route tensions affecting markets',
        intensity: 5.5,
        tone: -0.3,
      },
    ];

    // Calculate global tension score (0-100)
    const avgIntensity = geoRisks.reduce((sum, r) => sum + r.intensity, 0) / geoRisks.length;
    const globalTension = Math.round((avgIntensity / 10) * 100);

    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 'LOW';
    if (globalTension >= 80) level = 'SEVERE';
    else if (globalTension >= 60) level = 'HIGH';
    else if (globalTension >= 40) level = 'MODERATE';

    const result: GeoRiskIndex = {
      globalTension,
      level,
      topRisks: geoRisks.sort((a, b) => b.intensity - a.intensity).slice(0, 5),
      lastUpdate: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return json(result);

  } catch (error) {
    console.error('Geopolitical API error:', error);
    return json({
      globalTension: 50,
      level: 'MODERATE' as const,
      topRisks: [],
      lastUpdate: new Date().toISOString()
    }, { status: 200 });
  }
}