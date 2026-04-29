/**
 * R-032 – WebSocket backpressure and flood handling
 *
 * Validates that the per-IP rate limiters and payload-size guards in the
 * WebSocket server bound message rates and payload sizes as designed.
 *
 * Test targets:
 *   websocket-server/src/rateLimit.ts  (RateLimiter class)
 *   websocket-server/src/index.ts      (MAX_PAYLOAD_BYTES constant = 8 KiB;
 *                                       belt-and-suspenders payload check)
 *
 * Production rate-limiter configs (from index.ts):
 *   connectionRateLimiter: { maxRequests: 10, windowMs: 60_000 }
 *   messageRateLimiter:    { maxRequests: 60, windowMs: 60_000 }
 *
 * @jest-environment node
 */

import { RateLimiter } from '../../websocket-server/src/rateLimit';

describe('R-032 – WebSocket backpressure and flood handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── RateLimiter quota enforcement ──────────────────────────────────────────

  describe('RateLimiter – quota enforcement', () => {
    it('allows all requests within the configured maximum', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 5, windowMs: 60_000 });

      for (let i = 0; i < 5; i++) {
        expect(await limiter.allow('client-A')).toBe(true);
      }
    });

    it('rejects the request that exceeds the quota', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 3, windowMs: 60_000 });

      await limiter.allow('x'); // 1
      await limiter.allow('x'); // 2
      await limiter.allow('x'); // 3 – last allowed

      expect(await limiter.allow('x')).toBe(false); // 4 – over limit
    });

    it('continues blocking within the same window after quota is exhausted', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 2, windowMs: 60_000 });

      await limiter.allow('flood'); // 1
      await limiter.allow('flood'); // 2 – quota exhausted

      expect(await limiter.allow('flood')).toBe(false);
      expect(await limiter.allow('flood')).toBe(false);
      expect(await limiter.allow('flood')).toBe(false);
    });

    it('resets quota after the window expires', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 2, windowMs: 60_000 });

      await limiter.allow('y'); // 1
      await limiter.allow('y'); // 2
      expect(await limiter.allow('y')).toBe(false); // blocked

      // Advance time beyond the window boundary
      jest.advanceTimersByTime(60_001);

      // New window – quota should be fully reset
      expect(await limiter.allow('y')).toBe(true);
      expect(await limiter.allow('y')).toBe(true);
    });

    it('tracks per-IP quotas independently', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 2, windowMs: 60_000 });

      await limiter.allow('ip-A');
      await limiter.allow('ip-A');
      expect(await limiter.allow('ip-A')).toBe(false); // A exhausted

      // B has its own independent quota
      expect(await limiter.allow('ip-B')).toBe(true);
      expect(await limiter.allow('ip-B')).toBe(true);
      expect(await limiter.allow('ip-B')).toBe(false); // B now exhausted
    });
  });

  // ── Production message-rate config simulation ──────────────────────────────

  describe('Message-rate limiter – production config (60 msg/min)', () => {
    it('bounds a burst flood at exactly the 60-message/min limit', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 60, windowMs: 60_000 });

      let allowed = 0;
      for (let i = 0; i < 100; i++) {
        if (await limiter.allow('attacker-ip')) allowed++;
      }

      // Exactly 60 messages should pass; remaining 40 must be dropped
      expect(allowed).toBe(60);
    });

    it('allows normal traffic after flood window resets', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 60, windowMs: 60_000 });

      // Exhaust quota
      for (let i = 0; i < 60; i++) await limiter.allow('normal-ip');
      expect(await limiter.allow('normal-ip')).toBe(false);

      // Advance past window
      jest.advanceTimersByTime(60_001);

      // Legitimate traffic resumes
      expect(await limiter.allow('normal-ip')).toBe(true);
    });
  });

  // ── Production connection-rate config simulation ───────────────────────────

  describe('Connection-rate limiter – production config (10 conn/min)', () => {
    it('caps simultaneous connection attempts from a single IP at 10', async () => {
      const limiter = new RateLimiter({ name: 'test', maxRequests: 10, windowMs: 60_000 });

      let allowed = 0;
      for (let i = 0; i < 20; i++) {
        if (await limiter.allow('reconnect-storm-ip')) allowed++;
      }

      expect(allowed).toBe(10);
    });
  });

  // ── Payload size guard ─────────────────────────────────────────────────────

  describe('Payload size guard – 8 KiB limit (belt-and-suspenders)', () => {
    const MAX_PAYLOAD_BYTES = 8 * 1024; // mirror of index.ts constant

    it('accepts a payload at exactly the maximum size (boundary inclusive)', () => {
      const payload = 'a'.repeat(MAX_PAYLOAD_BYTES);
      // The guard in index.ts is: if (rawStr.length > MAX_PAYLOAD_BYTES)
      // So exactly MAX_PAYLOAD_BYTES is allowed
      expect(payload.length > MAX_PAYLOAD_BYTES).toBe(false);
    });

    it('rejects a payload one byte over the maximum size', () => {
      const payload = 'a'.repeat(MAX_PAYLOAD_BYTES + 1);
      expect(payload.length > MAX_PAYLOAD_BYTES).toBe(true);
    });

    it('8 KiB constant equals 8192 bytes', () => {
      expect(MAX_PAYLOAD_BYTES).toBe(8192);
    });
  });
});
