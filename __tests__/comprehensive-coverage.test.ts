import {
  safeJSONParse,
  safeJSONParseWithResult,
  safeLocalStorageParse,
  safeJSONParseArray,
  safeJSONParseObject,
  safeParseInt,
  safeParseFloat,
  safeToNumber,
  safeParsePagination,
} from '@/lib/safeParse';
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
} from '@/lib/rateLimit';

let warnMock: jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => warnMock(...args),
  },
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    }),
  },
}));

describe('Comprehensive Coverage (real behaviors)', () => {
  beforeEach(() => {
    if (!warnMock) {
      warnMock = jest.fn();
    }
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('safeParse utilities', () => {
    it('parses valid JSON and falls back for invalid input', () => {
      expect(safeJSONParse('{"a":1}', { a: 0 })).toEqual({ a: 1 });
      expect(safeJSONParse('{bad json', { a: 0 })).toEqual({ a: 0 });
      expect(safeJSONParse(null, { a: 0 })).toEqual({ a: 0 });
    });

    it('returns detailed parse result metadata', () => {
      const success = safeJSONParseWithResult<{ ok: boolean }>('{"ok":true}');
      expect(success.success).toBe(true);
      expect(success.data).toEqual({ ok: true });

      const failure = safeJSONParseWithResult<{ ok: boolean }>('oops');
      expect(failure.success).toBe(false);
      expect(failure.error).toBeTruthy();
    });

    it('logs warnings when explicitly enabled for malformed JSON', () => {
      const fallback = { ok: false };
      expect(safeJSONParse('{broken', fallback, true)).toEqual(fallback);
      expect(warnMock).toHaveBeenCalled();
    });

    it('parses localStorage values safely', () => {
      localStorage.setItem('good', '{"theme":"dark"}');
      localStorage.setItem('bad', '{broken');

      expect(safeLocalStorageParse('good', { theme: 'light' })).toEqual({ theme: 'dark' });
      expect(safeLocalStorageParse('bad', { theme: 'light' })).toEqual({ theme: 'light' });
      expect(safeLocalStorageParse('missing', { theme: 'light' })).toEqual({ theme: 'light' });
    });

    it('guards array/object parse shapes', () => {
      expect(safeJSONParseArray<number>('[1,2,3]')).toEqual([1, 2, 3]);
      expect(safeJSONParseArray<number>('{"x":1}', [9])).toEqual([9]);

      expect(safeJSONParseObject<{ x: number }>('{"x":1}', { x: 0 })).toEqual({ x: 1 });
      expect(safeJSONParseObject<{ x: number }>('[1,2]', { x: 0 })).toEqual({ x: 0 });
    });

    it('enforces numeric fallbacks and bounds', () => {
      expect(safeParseInt('42', 0)).toBe(42);
      expect(safeParseInt('nope', 7)).toBe(7);
      expect(safeParseInt('500', 0, { max: 100 })).toBe(100);
      expect(safeParseInt('-2', 0, { min: 0 })).toBe(0);

      expect(safeParseFloat('3.14', 0)).toBeCloseTo(3.14);
      expect(safeParseFloat('-1.2', 9, { allowNegative: false })).toBe(9);
      expect(safeParseFloat('200.5', 0, { max: 100 })).toBe(100);
    });

    it('converts values and pagination params safely', () => {
      expect(safeToNumber('5', 0)).toBe(5);
      expect(safeToNumber('', 12)).toBe(12);
      expect(safeToNumber('nan', 12)).toBe(12);

      expect(safeParsePagination('999', '-10', { limit: 20, maxLimit: 100 })).toEqual({
        limit: 100,
        offset: 0,
      });
      expect(safeParsePagination(undefined, undefined, { limit: 25 })).toEqual({
        limit: 25,
        offset: 0,
      });
    });
  });

  describe('rateLimit utilities', () => {
    it('allows requests up to limit then blocks with 429 payload', () => {
      const key = `suite-${Date.now()}-${Math.random()}`;

      const first = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });
      expect(first.success).toBe(true);
      expect(first.remaining).toBe(1);

      const second = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });
      expect(second.success).toBe(true);
      expect(second.remaining).toBe(0);

      const third = checkRateLimit(key, { maxRequests: 2, windowMs: 60_000 });
      expect(third.success).toBe(false);
      expect(third.retryAfter).toBeGreaterThan(0);
      expect(third.errorResponse?.status).toBe(429);
      expect(third.errorResponse?.body).toEqual(
        expect.objectContaining({ error: 'Too many requests' })
      );
    });

    it('extracts client identifiers from request headers', () => {
      const withForwarded = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
      });
      const withRealIp = new Request('https://example.com', {
        headers: { 'x-real-ip': '3.3.3.3' },
      });
      const withCf = new Request('https://example.com', {
        headers: { 'cf-connecting-ip': '4.4.4.4' },
      });
      const unknown = new Request('https://example.com');

      expect(getClientIdentifier(withForwarded)).toBe('1.1.1.1');
      expect(getClientIdentifier(withRealIp)).toBe('3.3.3.3');
      expect(getClientIdentifier(withCf)).toBe('4.4.4.4');
      expect(getClientIdentifier(unknown)).toBe('unknown');
    });

    it('builds response headers from rate limit state', () => {
      const blocked = checkRateLimit(`headers-${Date.now()}-${Math.random()}`, {
        maxRequests: 0,
        windowMs: 60_000,
      });
      const headers = getRateLimitHeaders(blocked);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBeTruthy();
      expect(headers['Retry-After']).toBeTruthy();
    });
  });
});
