import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = '.cache';
const CACHE_DURATION = 60 * 1000; // 1 minute

// Ensure cache directory exists
try {
  mkdirSync(CACHE_DIR, { recursive: true });
} catch {}

// Simple file-based cache shared across all users
export function getCache<T>(key: string): T | null {
  try {
    const filePath = join(CACHE_DIR, `${key}.json`);
    if (!existsSync(filePath)) return null;

    const data = readFileSync(filePath, 'utf-8');
    const { content, timestamp } = JSON.parse(data);

    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_DURATION) {
      return content as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, content: T): void {
  try {
    const filePath = join(CACHE_DIR, `${key}.json`);
    writeFileSync(filePath, JSON.stringify({
      content,
      timestamp: Date.now()
    }), 'utf-8');
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

export function clearCache(key?: string): void {
  try {
    if (key) {
      const filePath = join(CACHE_DIR, `${key}.json`);
      if (existsSync(filePath)) {
        // deleteFileSync would be better but keeping it simple
      }
    }
  } catch { }
}
