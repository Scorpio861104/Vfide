describe('lib/validateProduction strict production chain checks', () => {
  const originalEnv = { ...process.env };

  const baseStrictProductionEnv = {
    NODE_ENV: 'production',
    CI: 'false',
    NEXT_PUBLIC_FRONTEND_ONLY: 'false',
    FRONTEND_SELF_CONTAINED: 'false',
    NEXT_PUBLIC_CHAIN_ID: '84532',
    NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID: '84532',
    NEXT_PUBLIC_DEFAULT_CHAIN_ID: '84532',
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
    NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS: '0xcccccccccccccccccccccccccccccccccccccccc',
    NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS: '0xdddddddddddddddddddddddddddddddddddddddd',
    NEXT_PUBLIC_BURN_ROUTER_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS: '0xffffffffffffffffffffffffffffffffffffffff',
    NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS: '0x1010101010101010101010101010101010101010',
    NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS: '0x2020202020202020202020202020202020202020',
    NEXT_PUBLIC_FLASH_LOAN_ADDRESS: '0x3030303030303030303030303030303030303030',
    NEXT_PUBLIC_TERM_LOAN_ADDRESS: '0x4040404040404040404040404040404040404040',
    NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS: '0x5050505050505050505050505050505050505050',
    NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS: '0x6060606060606060606060606060606060606060',
    NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS: '0x7070707070707070707070707070707070707070',
    NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: '0x8080808080808080808080808080808080808080',
    NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS: '0x9090909090909090909090909090909090909090',
    NEXT_PUBLIC_PROOF_LEDGER_ADDRESS: '0xa0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0',
    NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS: '0xb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0',
    NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS: '0xc0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0',
    NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS: '0xd0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0',
    NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS: '0xe0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0',
    NEXT_PUBLIC_MERCHANT_PORTAL_VIEWER_ADDRESS: '0xf0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0',
    NEXT_PUBLIC_VFIDE_ACCESS_CONTROL_ADDRESS: '0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
    NEXT_PUBLIC_APP_URL: 'https://vfide.example',
    APP_ORIGIN: 'https://vfide.example',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vfide_dev',
    JWT_SECRET: 'test-test-test-test-test-test-test-test',
    UPSTASH_REDIS_REST_URL: 'https://redis.example',
    UPSTASH_REDIS_REST_TOKEN: 'token-example',
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
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token-example';

    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('fails strict production when Redis is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '❌ Redis is required in production - distributed rate limiting and token revocation cannot run safely without it'
    );
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

  it('fails strict production when faucet operator key is set on non-testnet deployments', async () => {
    process.env.NEXT_PUBLIC_IS_TESTNET = 'false';
    process.env.FAUCET_OPERATOR_PRIVATE_KEY = '0x' + '1'.repeat(64);

    const { validateProductionEnvironment } = await import('../../lib/validateProduction');
    const result = validateProductionEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '❌ FAUCET_OPERATOR_PRIVATE_KEY must not be set when NEXT_PUBLIC_IS_TESTNET=false in production'
    );
  });
});
