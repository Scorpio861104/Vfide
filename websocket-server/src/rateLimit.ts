/**
 * WebSocket per-key rate limiter.
 *
 * Uses Upstash Redis fixed windows when configured to enforce limits across
 * replicas. Falls back to in-memory windows for local/dev unless explicitly
 * overridden.
 */

interface RateLimiterOptions {
  /** Namespace used in rate limit keys (e.g. connection/message) */
  name: string;
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly name: string;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly redisUrl: string | null;
  private readonly redisToken: string | null;
  private readonly useRedis: boolean;
  private readonly store = new Map<string, WindowEntry>();

  constructor(options: RateLimiterOptions) {
    this.name = options.name;
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || null;
    this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || null;
    this.useRedis = Boolean(this.redisUrl && this.redisToken);

    if (
      process.env.NODE_ENV === 'production' &&
      !this.useRedis &&
      process.env.WS_ALLOW_INMEMORY_RATELIMIT !== 'true'
    ) {
      throw new Error(
        'WebSocket rate limiter requires Upstash Redis in production. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or set WS_ALLOW_INMEMORY_RATELIMIT=true only as a temporary override.'
      );
    }

    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Periodic cleanup to prevent unbounded memory growth
    setInterval(() => this.cleanup(), this.windowMs).unref();
  }

  /**
   * Returns true if the request from `key` is allowed, false if rate-limited.
   */
  async allow(key: string): Promise<boolean> {
    if (this.useRedis) {
      return this.allowRedis(key);
    }

    return this.allowMemory(key);
  }

  private allowMemory(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // New window
      this.store.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private async allowRedis(key: string): Promise<boolean> {
    const now = Date.now();
    const windowIndex = Math.floor(now / this.windowMs);
    const redisKey = `ws:rl:${this.name}:${key}:${windowIndex}`;
    const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000) + 5);

    const incrUrl = `${this.redisUrl!.replace(/\/$/, '')}/incr/${encodeURIComponent(redisKey)}`;
    const incrResponse = await fetch(incrUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
      },
    });

    if (!incrResponse.ok) {
      throw new Error(`Upstash INCR failed: HTTP ${incrResponse.status}`);
    }

    const incrData = (await incrResponse.json()) as { result?: number };
    const count = Number(incrData.result ?? 0);

    const expireUrl = `${this.redisUrl!.replace(/\/$/, '')}/expire/${encodeURIComponent(redisKey)}/${ttlSeconds}`;
    const expireResponse = await fetch(expireUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
      },
    });

    if (!expireResponse.ok) {
      // Do not permanently fail requests on transient EXPIRE failures.
      console.warn(`[ws] Upstash EXPIRE failed for ${redisKey}: HTTP ${expireResponse.status}`);
    }

    return count <= this.maxRequests;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart >= this.windowMs * 2) {
        this.store.delete(key);
      }
    }
  }
}
