describe('siweChallenge', () => {
  const address = '0x1234567890123456789012345678901234567890';
  const baseInput = {
    address,
    domain: 'vfide.io',
    chainId: 8453,
    ip: '203.0.113.10',
    userAgent: 'VFIDE-Test-Agent/1.0',
  };

  beforeEach(() => {
    jest.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('accepts a fresh challenge with a matching request fingerprint', async () => {
    const siweChallenge = await import('@/lib/security/siweChallenge');
    const challenge = await siweChallenge.createSiweChallenge(baseInput);

    await expect(siweChallenge.consumeAndValidateSiweChallenge({
      ...baseInput,
      message: challenge.message,
    })).resolves.toEqual({ ok: true });
  });

  it('rejects challenge replay after the first successful consume', async () => {
    const siweChallenge = await import('@/lib/security/siweChallenge');
    const challenge = await siweChallenge.createSiweChallenge(baseInput);

    await siweChallenge.consumeAndValidateSiweChallenge({
      ...baseInput,
      message: challenge.message,
    });

    await expect(siweChallenge.consumeAndValidateSiweChallenge({
      ...baseInput,
      message: challenge.message,
    })).resolves.toEqual({ ok: false, error: 'Challenge not found. Request a new challenge.' });
  });

  it('rejects a challenge when the request IP changes', async () => {
    const siweChallenge = await import('@/lib/security/siweChallenge');
    const challenge = await siweChallenge.createSiweChallenge(baseInput);

    await expect(siweChallenge.consumeAndValidateSiweChallenge({
      ...baseInput,
      ip: '198.51.100.77',
      message: challenge.message,
    })).resolves.toEqual({ ok: false, error: 'Challenge IP mismatch' });
  });

  it('rejects a challenge when the user agent changes', async () => {
    const siweChallenge = await import('@/lib/security/siweChallenge');
    const challenge = await siweChallenge.createSiweChallenge(baseInput);

    await expect(siweChallenge.consumeAndValidateSiweChallenge({
      ...baseInput,
      userAgent: 'Different-Agent/2.0',
      message: challenge.message,
    })).resolves.toEqual({ ok: false, error: 'Challenge user agent mismatch' });
  });
});