"use strict";
/**
 * In-memory per-IP rate limiter for WebSocket connections and messages.
 *
 * Uses a fixed-window algorithm.  For production deployments with multiple
 * server replicas, replace this with a Redis-backed implementation using the
 * Upstash Ratelimit library (already used in lib/auth/rateLimit.ts).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(options) {
        this.store = new Map();
        this.maxRequests = options.maxRequests;
        this.windowMs = options.windowMs;
        // Periodic cleanup to prevent unbounded memory growth
        setInterval(() => this.cleanup(), this.windowMs).unref();
    }
    /**
     * Returns true if the request from `key` is allowed, false if rate-limited.
     */
    allow(key) {
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
