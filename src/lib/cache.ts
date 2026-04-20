import { getDb, api_cache } from '$lib/server/db';
import { eq, and, lt } from 'drizzle-orm';
import { getCache as getFileCache, setCache as setFileCache } from './cache-file';

const CACHE_DURATION = 60 * 1000; // 1 minute default

export async function getCache<T>(key: string): Promise<T | null> {
  const db = getDb();
  if (!db) {
    // Fallback to file cache if DB not available
    return getFileCache<T>(key);
  }

  try {
    const result = await db
      .select()
      .from(api_cache)
      .where(eq(api_cache.cacheKey, key))
      .limit(1);

    const cached = result[0];
    if (!cached) return null;

    // Check if cache expired
    if (new Date(cached.expiresAt) < new Date()) {
      // Delete expired cache
      await db.delete(api_cache).where(eq(api_cache.id, cached.id));
      return null;
    }

    return cached.content as T;
  } catch (e) {
    console.error('Cache read error:', e);
    // Fallback to file cache
    return getFileCache<T>(key);
  }
}

export async function setCache<T>(key: string, content: T, durationMs: number = CACHE_DURATION): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + durationMs);

  if (!db) {
    // Fallback to file cache if DB not available
    setFileCache(key, content);
    return;
  }

  try {
    // Upsert cache entry
    await db.insert(api_cache).values({
      cacheKey: key,
      content: content as object,
      expiresAt,
    }).onConflictDoUpdate({
      target: api_cache.cacheKey,
      set: {
        content: content as object,
        expiresAt,
      },
    });
  } catch (e) {
    console.error('Cache write error:', e);
    // Fallback to file cache
    setFileCache(key, content);
  }
}

export async function clearCache(key?: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    if (key) {
      await db.delete(api_cache).where(eq(api_cache.cacheKey, key));
    } else {
      // Clear all expired cache entries
      await db.delete(api_cache).where(lt(api_cache.expiresAt, new Date()));
    }
  } catch (e) {
    console.error('Cache clear error:', e);
  }
}
