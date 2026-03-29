describe('lib/validateProduction strict production chain checks', () => {
  const originalEnv = { ...process.env };

  const baseStrictProductionEnv = {
    NODE_ENV: 'production',
    CI: 'true',
    NEXT_PUBLIC_FRONTEND_ONLY: 'false',
    FRONTEND_SELF_CONTAINED: 'false',
    NEXT_PUBLIC_CHAIN_ID: '84532',
    NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID: '84532',
    NEXT_PUBLIC_RPC_URL: 'https://sepolia.base.org',
    NEXT_PUBLIC_EXPLORER_URL: 'https://sepolia.basescan.org',
    NEXT_PUBLIC_IS_TESTNET: 'false',
    NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: '0x1111111111111111111111111111111111111111',
    NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS: '0x2222222222222222222222222222222222222222',
    NEXT_PUBLIC_VAULT_HUB_ADDRESS: '0x3333333333333333333333333333333333333333',
    NEXT_PUBLIC_VAULT_IMPLEMENTATION: 'cardbound',
    NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS: '0x4444444444444444444444444444444444444444',
    NEXT_PUBLIC_DAO_ADDRESS: '0x5555555555555555555555555555555555555555',
    NEXT_PUBLIC_SEER_ADDRESS: '0x6666666666666666666666666666666666666666',
    NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: '0x7777777777777777777777777777777777777777',
    NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: '0x8888888888888888888888888888888888888888',
    NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: '0x9999999999999999999999999999999999999999',
    NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    NEXT_PUBLIC_DEV_VAULT_ADDRESS: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    NEXT_PUBLIC_APP_URL: 'https://vfide.example',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vfide_dev',
    JWT_SECRET: 'test-test-test-test-test-test-test-test',
  } as const;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ...baseStrictProductionEnv,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('passes strict production when chain IDs are paired', async () => {
    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('fails strict production when runtime and deployment chain IDs mismatch', async () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID = '1';

    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('❌ NEXT_PUBLIC_CHAIN_ID (84532) does not match NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID (1)');
  });

  it('fails strict production when deployment chain ID is non-numeric', async () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID = 'base-sepolia';

    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('❌ NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID must be a positive integer, got "base-sepolia"');
  });
});
