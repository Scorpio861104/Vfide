"use strict";
/**
 * WebSocket per-key rate limiter.
 *
 * Uses Upstash Redis fixed windows when configured to enforce limits across
 * replicas. Falls back to in-memory windows for local/dev unless explicitly
 * overridden.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(options) {
        this.store = new Map();
        this.name = options.name;
        this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || null;
        this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || null;
        this.useRedis = Boolean(this.redisUrl && this.redisToken);
        if (process.env.NODE_ENV === 'production' &&
            !this.useRedis &&
            process.env.WS_ALLOW_INMEMORY_RATELIMIT !== 'true') {
            throw new Error('WebSocket rate limiter requires Upstash Redis in production. ' +
                'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or set WS_ALLOW_INMEMORY_RATELIMIT=true only as a temporary override.');
        }
        this.maxRequests = options.maxRequests;
        this.windowMs = options.windowMs;
        // Periodic cleanup to prevent unbounded memory growth
        setInterval(() => this.cleanup(), this.windowMs).unref();
    }
    /**
     * Returns true if the request from `key` is allowed, false if rate-limited.
     */
    async allow(key) {
        if (this.useRedis) {
            return this.allowRedis(key);
        }
        return this.allowMemory(key);
    }
    allowMemory(key) {
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
    async allowRedis(key) {
        const now = Date.now();
        const windowIndex = Math.floor(now / this.windowMs);
        const redisKey = `ws:rl:${this.name}:${key}:${windowIndex}`;
        const incrUrl = `${this.redisUrl.replace(/\/$/, '')}/incr/${encodeURIComponent(redisKey)}`;
        const incrResponse = await fetch(incrUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.redisToken}`,
            },
        });
        if (!incrResponse.ok) {
            throw new Error(`Upstash INCR failed: HTTP ${incrResponse.status}`);
        }
        const incrData = (await incrResponse.json());
        const count = Number(incrData.result ?? 0);
        if (count === 1) {
            const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000) + 5);
            const expireUrl = `${this.redisUrl.replace(/\/$/, '')}/expire/${encodeURIComponent(redisKey)}/${ttlSeconds}`;
            const expireResponse = await fetch(expireUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.redisToken}`,
                },
            });
            if (!expireResponse.ok) {
                throw new Error(`Upstash EXPIRE failed: HTTP ${expireResponse.status}`);
            }
        }
        return count <= this.maxRequests;
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now - entry.windowStart >= this.windowMs * 2) {
                this.store.delete(key);
            }
        }
    }
}
exports.RateLimiter = RateLimiter;
