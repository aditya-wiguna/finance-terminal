import { Query } from 'appwrite';
import {
  createDocument,
  findDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  CACHE_COLLECTION_ID,
} from '$lib/server/db';
import { getCache as getFileCache, setCache as setFileCache } from './cache-file';

const CACHE_DURATION = 60 * 1000; // 1 minute default

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cacheDoc = await findDocument(CACHE_COLLECTION_ID, [
      Query.equal('cacheKey', key),
      Query.limit(1),
    ]);

    if (!cacheDoc) return null;

    if (new Date(cacheDoc.expiresAt as string) < new Date()) {
      await deleteDocument(CACHE_COLLECTION_ID, cacheDoc.$id);
      return null;
    }

    return cacheDoc.content as T;
  } catch (e) {
    console.error('Cache read error:', e);
    return getFileCache<T>(key);
  }
}

export async function setCache<T>(key: string, content: T, durationMs: number = CACHE_DURATION): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  try {
    const existing = await findDocument(CACHE_COLLECTION_ID, [
      Query.equal('cacheKey', key),
      Query.limit(1),
    ]);

    if (existing) {
      await updateDocument(CACHE_COLLECTION_ID, existing.$id, {
        content,
        expiresAt,
      });
    } else {
      await createDocument(CACHE_COLLECTION_ID, {
        cacheKey: key,
        content,
        expiresAt,
      });
    }
  } catch (e) {
    console.error('Cache write error:', e);
    setFileCache(key, content);
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      const cacheDoc = await findDocument(CACHE_COLLECTION_ID, [
        Query.equal('cacheKey', key),
        Query.limit(1),
      ]);
      if (cacheDoc) {
        await deleteDocument(CACHE_COLLECTION_ID, cacheDoc.$id);
      }
    } else {
      const { documents } = await listDocuments(CACHE_COLLECTION_ID, [Query.limit(100)]);
      const now = new Date();
      for (const doc of documents) {
        if (new Date(doc.expiresAt as string) < now) {
          await deleteDocument(CACHE_COLLECTION_ID, doc.$id);
        }
      }
    }
  } catch (e) {
    console.error('Cache clear error:', e);
  }
}