describe('lib/env feature and validation behavior', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('supports extended feature flags through isFeatureEnabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SANCTUM = 'true';
    process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE = 'false';

    const envModule = await import('@/lib/env');

    expect(envModule.isFeatureEnabled('SANCTUM')).toBe(true);
    expect(envModule.isFeatureEnabled('GOVERNANCE')).toBe(false);
  });

  it('parses chat and governance flags from environment', async () => {
    process.env.NEXT_PUBLIC_ENABLE_CHAT = 'true';
    process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE = 'true';
    process.env.NEXT_PUBLIC_ENABLE_SW = 'true';
    process.env.NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS = 'true';
    process.env.SESSION_KEY_MAX_DURATION_SECONDS = '7200';

    const envModule = await import('@/lib/env');
    const env = envModule.getEnv();

    expect(env.NEXT_PUBLIC_ENABLE_CHAT).toBe(true);
    expect(env.NEXT_PUBLIC_ENABLE_GOVERNANCE).toBe(true);
    expect(env.NEXT_PUBLIC_ENABLE_SW).toBe(true);
    expect(env.NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS).toBe(true);
    expect(env.SESSION_KEY_MAX_DURATION_SECONDS).toBe(7200);
    expect(envModule.isFeatureEnabled('SW')).toBe(true);
    expect(envModule.isFeatureEnabled('PERSISTENT_SESSION_KEYS')).toBe(true);
  });

  it('fails fast in production for invalid environment values', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_CHAIN_ID = 'invalid';

    const envModule = await import('@/lib/env');

    expect(() => envModule.getEnv()).toThrow('Environment validation failed in production');
  });
});