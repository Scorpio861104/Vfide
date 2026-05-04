import { NextRequest } from 'next/server';

/** Test that rate limiting fails-closed when Redis is configured but unavailable in production */
describe('Rate Limit Fail-Closed Behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 503 when Redis is configured but fails in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn(() => {
        throw new Error('redis init failed');
      }),
    }));
    jest.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class MockRatelimit {
        static slidingWindow() {
          return {};
        }
      },
    }));

    const { rateLimit } = await import('@/lib/auth/rateLimit');

    const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
      headers: {
        'user-agent': 'test-agent',
      },
    });

    const result = await rateLimit(request, 'api');

    expect(result.success).toBe(false);
    expect(result.response?.status).toBe(503);
  });

  it('should use memory fallback in non-production when Redis unavailable', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { rateLimit } = await import('@/lib/auth/rateLimit');

    const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
      headers: {
        'user-agent': 'test-agent',
      },
    });

    const result = await rateLimit(request, 'api');

    // When Redis is not configured in non-production, should succeed with memory fallback
    expect(result.success).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it('should allow requests within rate limit using memory fallback', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { rateLimit, RATE_LIMITS } = await import('@/lib/auth/rateLimit');

    const request = new NextRequest(new URL('http://localhost:3000/api/auth'), {
      headers: {
        'user-agent': 'test-agent-auth',
      },
    });

    // 'auth' limit is 10 requests per minute
    const authLimit = RATE_LIMITS.auth;
    expect(authLimit.requests).toBe(10);

    // First request should succeed
    const result1 = await rateLimit(request, 'auth');
    expect(result1.success).toBe(true);
  });

  it('should reject requests exceeding memory rate limit in non-production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { rateLimit } = await import('@/lib/auth/rateLimit');

    const request = new NextRequest(new URL('http://localhost:3000/api/auth'), {
      headers: {
        'user-agent': 'test-agent-limit',
      },
    });

    // 'auth' limit is 10 requests per minute
    // Make 11 requests from the same IP/UA
    for (let i = 0; i < 10; i++) {
      const result = await rateLimit(request, 'auth');
      expect(result.success).toBe(true);
    }

    // 11th request should fail
    const result = await rateLimit(request, 'auth');
    expect(result.success).toBe(false);
    expect(result.response?.status).toBe(429);
  });
});
