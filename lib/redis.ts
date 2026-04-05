import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let memoryFallback: Map<string, { value: string; expiry: number }> | null = null;

export function getRedis(): Redis | null {
  if (redis) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production');
    return null;
  }

  return null;
}

function getMemory(): Map<string, { value: string; expiry: number }> {
  if (!memoryFallback) {
    memoryFallback = new Map();
  }

  const now = Date.now();
  for (const [key, entry] of memoryFallback.entries()) {
    if (entry.expiry > 0 && entry.expiry < now) {
      memoryFallback.delete(key);
    }
  }

  return memoryFallback;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.set(key, value, { ex: ttlSeconds });
    return;
  }

  getMemory().set(key, {
    value,
    expiry: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
  });
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (client) {
    return (await client.get<string>(key)) ?? null;
  }

  const entry = getMemory().get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiry > 0 && entry.expiry < Date.now()) {
    getMemory().delete(key);
    return null;
  }

  return entry.value;
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.del(key);
    return;
  }

  getMemory().delete(key);
}

export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const client = getRedis();
  if (client) {
    const value = await client.incr(key);
    if (ttlSeconds) {
      await client.expire(key, ttlSeconds);
    }
    return value;
  }

  const memory = getMemory();
  const current = Number.parseInt(memory.get(key)?.value || '0', 10) || 0;
  const next = current + 1;

  memory.set(key, {
    value: next.toString(),
    expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
  });

  return next;
}
