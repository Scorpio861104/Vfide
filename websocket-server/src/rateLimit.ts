/**
 * In-memory per-IP rate limiter for WebSocket connections and messages.
 *
 * Uses a fixed-window algorithm.  For production deployments with multiple
 * server replicas, replace this with a Redis-backed implementation using the
 * Upstash Ratelimit library (already used in lib/auth/rateLimit.ts).
 */

interface RateLimiterOptions {
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
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, WindowEntry>();

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Periodic cleanup to prevent unbounded memory growth
    setInterval(() => this.cleanup(), this.windowMs).unref();
  }

  /**
   * Returns true if the request from `key` is allowed, false if rate-limited.
   */
  allow(key: string): boolean {
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

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart >= this.windowMs * 2) {
        this.store.delete(key);
      }
    }
  }
}
