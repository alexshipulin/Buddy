import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJson, setJson } from '../data/storage/storage';

const CACHE_PREFIX = 'ai_cache_';

type CacheEntry<T> = { value: T; expiresAt: number };

// FNV-1a 32-bit hash — compact, no external deps
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function hashCacheKey(parts: string[]): string {
  return fnv1a(parts.join('|'));
}

export async function getCached<T>(key: string): Promise<T | null> {
  const entry = await getJson<CacheEntry<T> | null>(`${CACHE_PREFIX}${key}`, null);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.value;
}

export async function setCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
  await setJson(`${CACHE_PREFIX}${key}`, entry);
}

/**
 * Clears all AI cache entries stored by this module.
 * Note: includes menu scan + other AI task caches that use ai_cache_ prefix.
 */
export async function clearAICache(): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const aiKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
  if (aiKeys.length === 0) return 0;
  await AsyncStorage.multiRemove(aiKeys);
  return aiKeys.length;
}

const TTL_24H = 24 * 60 * 60 * 1000;

export { TTL_24H };
